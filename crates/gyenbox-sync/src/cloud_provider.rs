#[cfg(windows)]
mod imp {
    use std::ffi::c_void;
    use std::io::{self, BufRead};
    use std::mem::size_of;
    use std::os::windows::ffi::{OsStrExt, OsStringExt};
    use std::path::{Path, PathBuf};
    use std::ptr;
    use std::thread;
    use std::time::Duration;

    use windows_sys::Win32::Foundation::{
        CloseHandle, GetLastError, HANDLE, INVALID_HANDLE_VALUE, STATUS_CLOUD_FILE_UNSUCCESSFUL,
        STATUS_SUCCESS,
    };
    use windows_sys::Win32::Storage::CloudFilters::{
        CF_CALLBACK_INFO, CF_CALLBACK_PARAMETERS, CF_CALLBACK_REGISTRATION,
        CF_CALLBACK_TYPE_CANCEL_FETCH_DATA, CF_CALLBACK_TYPE_FETCH_DATA, CF_CALLBACK_TYPE_NONE,
        CF_CALLBACK_TYPE_NOTIFY_DELETE, CF_CALLBACK_TYPE_NOTIFY_RENAME,
        CF_CONNECT_FLAG_REQUIRE_FULL_FILE_PATH, CF_CONNECTION_KEY, CF_CONVERT_FLAG_ALWAYS_FULL,
        CF_CONVERT_FLAG_FORCE_CONVERT_TO_CLOUD_FILE, CF_CONVERT_FLAG_MARK_IN_SYNC,
        CF_OPERATION_ACK_DELETE_FLAG_NONE, CF_OPERATION_ACK_RENAME_FLAG_NONE, CF_OPERATION_INFO,
        CF_OPERATION_PARAMETERS, CF_OPERATION_TRANSFER_DATA_FLAG_NONE,
        CF_OPERATION_TYPE_ACK_DELETE, CF_OPERATION_TYPE_ACK_RENAME,
        CF_OPERATION_TYPE_TRANSFER_DATA, CF_PLACEHOLDER_BASIC_INFO, CF_PLACEHOLDER_INFO_BASIC,
        CF_PLACEHOLDER_STATE, CF_PLACEHOLDER_STATE_INVALID, CF_PLACEHOLDER_STATE_PLACEHOLDER,
        CF_PLACEHOLDER_STATE_SYNC_ROOT, CfConnectSyncRoot, CfConvertToPlaceholder,
        CfDisconnectSyncRoot, CfExecute, CfGetPlaceholderInfo, CfGetPlaceholderStateFromFileInfo,
    };
    use windows_sys::Win32::Storage::FileSystem::{
        CreateFileW, FILE_ATTRIBUTE_TAG_INFO, FILE_FLAG_BACKUP_SEMANTICS,
        FILE_FLAG_OPEN_REPARSE_POINT, FILE_READ_ATTRIBUTES, FILE_SHARE_DELETE, FILE_SHARE_READ,
        FILE_SHARE_WRITE, FILE_WRITE_ATTRIBUTES, FILE_WRITE_DATA, FileAttributeTagInfo,
        GetFileInformationByHandleEx, OPEN_EXISTING,
    };

    pub fn run_provider_spike(
        root: &Path,
        relative_path: Option<&str>,
        duration_seconds: u64,
    ) -> io::Result<()> {
        let root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
        let _connection = connect_registered_root(&root)?;
        println!(
            "{{\"event\":\"provider_connected\",\"root\":\"{}\",\"duration_seconds\":{}}}",
            json_escape(&root.display().to_string()),
            duration_seconds,
        );

        if let Some(relative_path) = relative_path.filter(|value| !value.is_empty()) {
            mark_path_with_connected_provider(&root, relative_path, "uploaded")?;
            let report =
                crate::cloud_files::diagnose_path(&root, Some(relative_path), Some("uploaded"))?;
            println!("{report}");
        }

        if duration_seconds > 0 {
            println!(
                "{{\"event\":\"provider_waiting\",\"message\":\"Keep this process running while checking Explorer. Press Ctrl+C to stop.\"}}"
            );
            thread::sleep(Duration::from_secs(duration_seconds));
        }

        println!("{{\"event\":\"provider_disconnected\"}}");
        Ok(())
    }

    pub fn run_provider(root: &Path) -> io::Result<()> {
        let root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
        let _connection = connect_registered_root(&root)?;
        println!(
            "{{\"event\":\"provider_connected\",\"root\":\"{}\"}}",
            json_escape(&root.display().to_string()),
        );

        let stdin = io::stdin();
        for line in stdin.lock().lines() {
            match line {
                Ok(line) => handle_provider_command(&root, &line),
                Err(error) => {
                    eprintln!("gyenbox-sync provider warning: stdin read failed: {error}");
                    break;
                }
            }
        }
        println!("{{\"event\":\"provider_disconnected\"}}");
        Ok(())
    }

    pub fn mark_path_connected(root: &Path, relative_path: &str, status: &str) -> io::Result<()> {
        let root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
        mark_path_with_connected_provider(&root, relative_path, status)
    }

    fn connect_registered_root(root: &Path) -> io::Result<ProviderConnection> {
        crate::cloud_files::register_sync_root(root, env!("CARGO_PKG_VERSION"))?;
        ProviderConnection::connect(root)
    }

    struct ProviderConnection {
        key: CF_CONNECTION_KEY,
        _callbacks: Box<[CF_CALLBACK_REGISTRATION]>,
    }

    impl ProviderConnection {
        fn connect(root: &Path) -> io::Result<Self> {
            let callbacks = vec![
                CF_CALLBACK_REGISTRATION {
                    Type: CF_CALLBACK_TYPE_FETCH_DATA,
                    Callback: Some(fetch_data_callback),
                },
                CF_CALLBACK_REGISTRATION {
                    Type: CF_CALLBACK_TYPE_CANCEL_FETCH_DATA,
                    Callback: Some(cancel_fetch_data_callback),
                },
                CF_CALLBACK_REGISTRATION {
                    Type: CF_CALLBACK_TYPE_NOTIFY_DELETE,
                    Callback: Some(delete_callback),
                },
                CF_CALLBACK_REGISTRATION {
                    Type: CF_CALLBACK_TYPE_NOTIFY_RENAME,
                    Callback: Some(rename_callback),
                },
                CF_CALLBACK_REGISTRATION {
                    Type: CF_CALLBACK_TYPE_NONE,
                    Callback: None,
                },
            ]
            .into_boxed_slice();

            let mut key: CF_CONNECTION_KEY = 0;
            let root_w = wide_path(root);
            let hr = unsafe {
                CfConnectSyncRoot(
                    root_w.as_ptr(),
                    callbacks.as_ptr(),
                    ptr::null(),
                    CF_CONNECT_FLAG_REQUIRE_FULL_FILE_PATH,
                    &mut key,
                )
            };
            hresult(hr, "CfConnectSyncRoot")?;
            Ok(Self {
                key,
                _callbacks: callbacks,
            })
        }
    }

    impl Drop for ProviderConnection {
        fn drop(&mut self) {
            let hr = unsafe { CfDisconnectSyncRoot(self.key) };
            if hr < 0 {
                eprintln!(
                    "gyenbox-sync provider warning: CfDisconnectSyncRoot failed with HRESULT 0x{:08X}",
                    hr as u32
                );
            }
        }
    }

    fn mark_path_with_connected_provider(
        root: &Path,
        relative_path: &str,
        status: &str,
    ) -> io::Result<()> {
        let path = if relative_path.is_empty() {
            root.to_path_buf()
        } else {
            normalize_child(root, relative_path)
        };
        if status == "uploaded"
            && !relative_path.is_empty()
            && (path.is_file() || path.is_dir())
        {
            let handle = open_for_cloud_filters(&path, true)?;
            let needs_conversion = !is_cloud_backed(handle)?;
            unsafe {
                CloseHandle(handle);
            }

            if needs_conversion {
                let handle = open_for_cloud_conversion(&path)?;
                let result = convert_to_cloud_file(handle, Some(relative_path), path.is_dir());
                unsafe {
                    CloseHandle(handle);
                }
                result?;
            }
        }

        if relative_path.is_empty() {
            crate::cloud_files::mark_root(root, status)
        } else {
            crate::cloud_files::mark_path(root, relative_path, status)
        }
    }

    fn handle_provider_command(root: &Path, line: &str) {
        let mut parts = line.splitn(4, '\t');
        let command = parts.next().unwrap_or_default();
        if command != "MARK" {
            println!("{{\"event\":\"command_ignored\",\"message\":\"unknown provider command\"}}");
            return;
        }

        let id = parts.next().unwrap_or_default();
        let status = parts.next().unwrap_or("uploaded");
        let relative_path = parts.next().unwrap_or_default();
        if id.is_empty() {
            println!(
                "{{\"event\":\"mark_failed\",\"id\":\"{}\",\"message\":\"missing mark command id\"}}",
                json_escape(id),
            );
            return;
        }

        match mark_path_with_connected_provider(root, relative_path, status) {
            Ok(()) => println!(
                "{{\"event\":\"mark_applied\",\"id\":\"{}\",\"relative_path\":\"{}\",\"status\":\"{}\"}}",
                json_escape(id),
                json_escape(relative_path),
                json_escape(status),
            ),
            Err(error) => println!(
                "{{\"event\":\"mark_failed\",\"id\":\"{}\",\"relative_path\":\"{}\",\"message\":\"{}\"}}",
                json_escape(id),
                json_escape(relative_path),
                json_escape(&error.to_string()),
            ),
        }
    }
    unsafe extern "system" fn fetch_data_callback(
        callback_info: *const CF_CALLBACK_INFO,
        callback_parameters: *const CF_CALLBACK_PARAMETERS,
    ) {
        let (path, offset, length) = unsafe {
            let path = callback_path(callback_info).unwrap_or_else(|| "<unknown>".to_string());
            let fetch = (*callback_parameters).Anonymous.FetchData;
            (path, fetch.RequiredFileOffset, fetch.RequiredLength)
        };
        eprintln!(
            "gyenbox-sync provider: FETCH_DATA path={} offset={} length={} (no remote hydration yet)",
            path, offset, length
        );
        unsafe {
            complete_transfer_data(callback_info, STATUS_CLOUD_FILE_UNSUCCESSFUL, offset, 0);
        }
    }

    unsafe extern "system" fn cancel_fetch_data_callback(
        callback_info: *const CF_CALLBACK_INFO,
        callback_parameters: *const CF_CALLBACK_PARAMETERS,
    ) {
        let (path, offset, length) = unsafe {
            let path = callback_path(callback_info).unwrap_or_else(|| "<unknown>".to_string());
            let cancel = (*callback_parameters).Anonymous.Cancel;
            let fetch = cancel.Anonymous.FetchData;
            (path, fetch.FileOffset, fetch.Length)
        };
        eprintln!(
            "gyenbox-sync provider: CANCEL_FETCH_DATA path={} offset={} length={}",
            path, offset, length
        );
    }

    unsafe extern "system" fn delete_callback(
        callback_info: *const CF_CALLBACK_INFO,
        callback_parameters: *const CF_CALLBACK_PARAMETERS,
    ) {
        let (path, flags) = unsafe {
            let path = callback_path(callback_info).unwrap_or_else(|| "<unknown>".to_string());
            let delete = (*callback_parameters).Anonymous.Delete;
            (path, delete.Flags)
        };
        eprintln!(
            "gyenbox-sync provider: NOTIFY_DELETE path={} flags=0x{:X}",
            path, flags
        );
        unsafe {
            ack_delete(callback_info, STATUS_SUCCESS);
        }
    }

    unsafe extern "system" fn rename_callback(
        callback_info: *const CF_CALLBACK_INFO,
        callback_parameters: *const CF_CALLBACK_PARAMETERS,
    ) {
        let (source, target, flags) = unsafe {
            let source = callback_path(callback_info).unwrap_or_else(|| "<unknown>".to_string());
            let rename = (*callback_parameters).Anonymous.Rename;
            let target =
                pcwstr_to_string(rename.TargetPath).unwrap_or_else(|| "<unknown>".to_string());
            (source, target, rename.Flags)
        };
        eprintln!(
            "gyenbox-sync provider: NOTIFY_RENAME source={} target={} flags=0x{:X}",
            source, target, flags
        );
        unsafe {
            ack_rename(callback_info, STATUS_SUCCESS);
        }
    }

    unsafe fn complete_transfer_data(
        callback_info: *const CF_CALLBACK_INFO,
        status: i32,
        offset: i64,
        length: i64,
    ) {
        let Some(info) = (unsafe { callback_info.as_ref() }) else {
            return;
        };
        let op_info = CF_OPERATION_INFO {
            StructSize: size_of::<CF_OPERATION_INFO>() as u32,
            Type: CF_OPERATION_TYPE_TRANSFER_DATA,
            ConnectionKey: info.ConnectionKey,
            TransferKey: info.TransferKey,
            CorrelationVector: ptr::null(),
            SyncStatus: ptr::null(),
            RequestKey: info.RequestKey,
        };
        let mut params = CF_OPERATION_PARAMETERS::default();
        params.ParamSize = size_of::<CF_OPERATION_PARAMETERS>() as u32;
        params.Anonymous.TransferData =
            windows_sys::Win32::Storage::CloudFilters::CF_OPERATION_PARAMETERS_0_0 {
                Flags: CF_OPERATION_TRANSFER_DATA_FLAG_NONE,
                CompletionStatus: status,
                Buffer: ptr::null(),
                Offset: offset,
                Length: length,
            };
        let hr = unsafe { CfExecute(&op_info, &mut params) };
        if hr < 0 {
            eprintln!(
                "gyenbox-sync provider warning: CfExecute TRANSFER_DATA failed with HRESULT 0x{:08X}",
                hr as u32
            );
        }
    }

    unsafe fn ack_delete(callback_info: *const CF_CALLBACK_INFO, status: i32) {
        let Some(info) = (unsafe { callback_info.as_ref() }) else {
            return;
        };
        let op_info = CF_OPERATION_INFO {
            StructSize: size_of::<CF_OPERATION_INFO>() as u32,
            Type: CF_OPERATION_TYPE_ACK_DELETE,
            ConnectionKey: info.ConnectionKey,
            TransferKey: info.TransferKey,
            CorrelationVector: ptr::null(),
            SyncStatus: ptr::null(),
            RequestKey: info.RequestKey,
        };
        let mut params = CF_OPERATION_PARAMETERS::default();
        params.ParamSize = size_of::<CF_OPERATION_PARAMETERS>() as u32;
        params.Anonymous.AckDelete =
            windows_sys::Win32::Storage::CloudFilters::CF_OPERATION_PARAMETERS_0_7 {
                Flags: CF_OPERATION_ACK_DELETE_FLAG_NONE,
                CompletionStatus: status,
            };
        let hr = unsafe { CfExecute(&op_info, &mut params) };
        if hr < 0 {
            eprintln!(
                "gyenbox-sync provider warning: CfExecute ACK_DELETE failed with HRESULT 0x{:08X}",
                hr as u32
            );
        }
    }

    unsafe fn ack_rename(callback_info: *const CF_CALLBACK_INFO, status: i32) {
        let Some(info) = (unsafe { callback_info.as_ref() }) else {
            return;
        };
        let op_info = CF_OPERATION_INFO {
            StructSize: size_of::<CF_OPERATION_INFO>() as u32,
            Type: CF_OPERATION_TYPE_ACK_RENAME,
            ConnectionKey: info.ConnectionKey,
            TransferKey: info.TransferKey,
            CorrelationVector: ptr::null(),
            SyncStatus: ptr::null(),
            RequestKey: info.RequestKey,
        };
        let mut params = CF_OPERATION_PARAMETERS::default();
        params.ParamSize = size_of::<CF_OPERATION_PARAMETERS>() as u32;
        params.Anonymous.AckRename =
            windows_sys::Win32::Storage::CloudFilters::CF_OPERATION_PARAMETERS_0_6 {
                Flags: CF_OPERATION_ACK_RENAME_FLAG_NONE,
                CompletionStatus: status,
            };
        let hr = unsafe { CfExecute(&op_info, &mut params) };
        if hr < 0 {
            eprintln!(
                "gyenbox-sync provider warning: CfExecute ACK_RENAME failed with HRESULT 0x{:08X}",
                hr as u32
            );
        }
    }

    unsafe fn callback_path(callback_info: *const CF_CALLBACK_INFO) -> Option<String> {
        let info = unsafe { callback_info.as_ref()? };
        unsafe { pcwstr_to_string(info.NormalizedPath) }
    }

    unsafe fn pcwstr_to_string(value: *const u16) -> Option<String> {
        if value.is_null() {
            return None;
        }
        let mut len = 0usize;
        while unsafe { *value.add(len) } != 0 {
            len += 1;
        }
        let slice = unsafe { std::slice::from_raw_parts(value, len) };
        Some(
            std::ffi::OsString::from_wide(slice)
                .to_string_lossy()
                .into_owned(),
        )
    }

    fn convert_to_cloud_file(
        handle: HANDLE,
        relative_path: Option<&str>,
        is_directory: bool,
    ) -> io::Result<()> {
        let identity = relative_path.map(wide_str);
        let (identity_ptr, identity_len) = identity
            .as_ref()
            .map(|value| (value.as_ptr().cast::<c_void>(), byte_len(value)))
            .unwrap_or((ptr::null(), 0));
        let mut flags = CF_CONVERT_FLAG_MARK_IN_SYNC | CF_CONVERT_FLAG_FORCE_CONVERT_TO_CLOUD_FILE;
        if !is_directory {
            flags |= CF_CONVERT_FLAG_ALWAYS_FULL;
        }
        let hr = unsafe {
            CfConvertToPlaceholder(
                handle,
                identity_ptr,
                identity_len,
                flags,
                ptr::null_mut(),
                ptr::null_mut(),
            )
        };
        hresult(hr, "CfConvertToPlaceholder")
    }

    fn is_cloud_backed(handle: HANDLE) -> io::Result<bool> {
        if has_placeholder_basic_info(handle) {
            return Ok(true);
        }

        let mut attribute_info = FILE_ATTRIBUTE_TAG_INFO::default();
        let ok = unsafe {
            GetFileInformationByHandleEx(
                handle,
                FileAttributeTagInfo,
                (&mut attribute_info as *mut FILE_ATTRIBUTE_TAG_INFO).cast::<c_void>(),
                size_of::<FILE_ATTRIBUTE_TAG_INFO>() as u32,
            )
        };
        if ok == 0 {
            let code = unsafe { GetLastError() };
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!("GetFileInformationByHandleEx failed: Win32 {code}"),
            ));
        }

        let state = unsafe {
            CfGetPlaceholderStateFromFileInfo(
                (&attribute_info as *const FILE_ATTRIBUTE_TAG_INFO).cast::<c_void>(),
                FileAttributeTagInfo,
            )
        };
        Ok(
            has_placeholder_state(state, CF_PLACEHOLDER_STATE_PLACEHOLDER)
                || has_placeholder_state(state, CF_PLACEHOLDER_STATE_SYNC_ROOT),
        )
    }

    fn has_placeholder_basic_info(handle: HANDLE) -> bool {
        let mut buffer = vec![0u8; size_of::<CF_PLACEHOLDER_BASIC_INFO>() + 4096];
        let mut returned = 0u32;
        let hr = unsafe {
            CfGetPlaceholderInfo(
                handle,
                CF_PLACEHOLDER_INFO_BASIC,
                buffer.as_mut_ptr().cast::<c_void>(),
                buffer.len() as u32,
                &mut returned,
            )
        };
        hr >= 0
    }
    fn open_for_cloud_filters(path: &Path, write_attributes: bool) -> io::Result<HANDLE> {
        open_with_flags(
            path,
            write_attributes,
            FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
        )
    }

    fn open_for_cloud_conversion(path: &Path) -> io::Result<HANDLE> {
        open_with_flags(path, true, FILE_FLAG_BACKUP_SEMANTICS)
    }

    fn open_with_flags(
        path: &Path,
        write_attributes: bool,
        flags_and_attributes: u32,
    ) -> io::Result<HANDLE> {
        let path_w = wide_path(path);
        let desired_access = if write_attributes {
            FILE_READ_ATTRIBUTES | FILE_WRITE_ATTRIBUTES | FILE_WRITE_DATA
        } else {
            FILE_READ_ATTRIBUTES
        };
        let handle = unsafe {
            CreateFileW(
                path_w.as_ptr(),
                desired_access,
                FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                ptr::null(),
                OPEN_EXISTING,
                flags_and_attributes,
                ptr::null_mut(),
            )
        };
        if handle == INVALID_HANDLE_VALUE {
            let code = unsafe { GetLastError() };
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!("CreateFileW failed for {}: Win32 {code}", path.display()),
            ));
        }
        Ok(handle)
    }

    fn normalize_child(root: &Path, relative_path: &str) -> PathBuf {
        let relative = relative_path.replace('/', "\\");
        root.join(relative)
    }

    fn has_placeholder_state(state: CF_PLACEHOLDER_STATE, flag: CF_PLACEHOLDER_STATE) -> bool {
        state != CF_PLACEHOLDER_STATE_INVALID && (state & flag) != 0
    }

    fn wide_path(path: &Path) -> Vec<u16> {
        path.as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }

    fn wide_str(value: &str) -> Vec<u16> {
        std::ffi::OsStr::new(value)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }

    fn byte_len(wide: &[u16]) -> u32 {
        wide.len().saturating_sub(1) as u32 * size_of::<u16>() as u32
    }

    fn json_escape(value: &str) -> String {
        let mut escaped = String::with_capacity(value.len());
        for ch in value.chars() {
            match ch {
                '"' => escaped.push_str("\\\""),
                '\\' => escaped.push_str("\\\\"),
                '\n' => escaped.push_str("\\n"),
                '\r' => escaped.push_str("\\r"),
                '\t' => escaped.push_str("\\t"),
                ch if ch.is_control() => escaped.push_str(&format!("\\u{:04X}", ch as u32)),
                ch => escaped.push(ch),
            }
        }
        escaped
    }

    fn hresult(hr: i32, context: &str) -> io::Result<()> {
        if hr >= 0 {
            Ok(())
        } else {
            Err(io::Error::new(
                io::ErrorKind::Other,
                format!("{context} failed with HRESULT 0x{:08X}", hr as u32),
            ))
        }
    }
}

#[cfg(windows)]
pub use imp::{mark_path_connected, run_provider, run_provider_spike};

#[cfg(not(windows))]
pub fn run_provider_spike(
    _root: &std::path::Path,
    _relative_path: Option<&str>,
    _duration_seconds: u64,
) -> std::io::Result<()> {
    unsupported()
}

#[cfg(not(windows))]
pub fn run_provider(_root: &std::path::Path) -> std::io::Result<()> {
    unsupported()
}

#[cfg(not(windows))]
pub fn mark_path_connected(
    _root: &std::path::Path,
    _relative_path: &str,
    _status: &str,
) -> std::io::Result<()> {
    unsupported()
}

#[cfg(not(windows))]
fn unsupported() -> std::io::Result<()> {
    Err(std::io::Error::new(
        std::io::ErrorKind::Unsupported,
        "Cloud Files provider is only available on Windows.",
    ))
}
