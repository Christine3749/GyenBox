#[cfg(windows)]
mod imp {
    use std::ffi::c_void;
    use std::io;
    use std::mem::size_of;
    use std::os::windows::ffi::OsStrExt;
    use std::path::{Path, PathBuf};
    use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, HANDLE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::Storage::CloudFilters::{
        CF_CONVERT_FLAG_ALWAYS_FULL, CF_CONVERT_FLAG_MARK_IN_SYNC, CF_IN_SYNC_STATE_IN_SYNC,
        CF_IN_SYNC_STATE_NOT_IN_SYNC, CF_PIN_STATE, CF_PIN_STATE_EXCLUDED, CF_PIN_STATE_INHERIT,
        CF_PIN_STATE_PINNED, CF_PIN_STATE_UNPINNED, CF_PIN_STATE_UNSPECIFIED,
        CF_PLACEHOLDER_BASIC_INFO, CF_PLACEHOLDER_INFO_BASIC, CF_PLACEHOLDER_STATE,
        CF_PLACEHOLDER_STATE_IN_SYNC, CF_PLACEHOLDER_STATE_INVALID,
        CF_PLACEHOLDER_STATE_PLACEHOLDER, CF_PLACEHOLDER_STATE_SYNC_ROOT, CF_REVERT_FLAG_NONE,
        CF_SET_IN_SYNC_FLAG_NONE, CF_SET_PIN_FLAG_NONE, CfConvertToPlaceholder,
        CfGetPlaceholderInfo, CfGetPlaceholderStateFromAttributeTag, CfRevertPlaceholder,
        CfSetInSyncState, CfSetPinState, CfUnregisterSyncRoot,
    };
    use windows_sys::Win32::Storage::FileSystem::{
        CreateFileW, FILE_ATTRIBUTE_PINNED, FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS,
        FILE_ATTRIBUTE_RECALL_ON_OPEN, FILE_ATTRIBUTE_UNPINNED, FILE_FLAG_BACKUP_SEMANTICS,
        FILE_FLAG_OPEN_REPARSE_POINT, FILE_READ_ATTRIBUTES, FILE_SHARE_DELETE, FILE_SHARE_READ,
        FILE_SHARE_WRITE, FILE_WRITE_ATTRIBUTES, FILE_WRITE_DATA, FindClose, FindFirstFileW,
        OPEN_EXISTING, SetFileAttributesW, WIN32_FIND_DATAW,
    };
    use windows_sys::Win32::UI::Shell::SHChangeNotify;

    const SHCNE_ATTRIBUTES: i32 = 0x0000_0800;
    const SHCNE_UPDATEITEM: i32 = 0x0000_2000;
    const SHCNE_UPDATEDIR: i32 = 0x0000_1000;
    const SHCNF_PATHW: u32 = 0x0005;
    const SHCNF_FLUSH: u32 = 0x1000;

    #[derive(Clone, Debug)]
    struct CloudFileInfo {
        attributes: u32,
        reparse_tag: u32,
        placeholder_state: CF_PLACEHOLDER_STATE,
        pin_state: Option<CF_PIN_STATE>,
        basic_in_sync: Option<bool>,
    }

    impl CloudFileInfo {
        fn is_placeholder(&self) -> bool {
            has_placeholder_state(self.placeholder_state, CF_PLACEHOLDER_STATE_PLACEHOLDER)
        }

        fn is_sync_root(&self) -> bool {
            has_placeholder_state(self.placeholder_state, CF_PLACEHOLDER_STATE_SYNC_ROOT)
        }

        fn is_cloud_backed(&self) -> bool {
            self.is_placeholder() || self.is_sync_root()
        }

        fn is_in_sync(&self) -> bool {
            self.basic_in_sync.unwrap_or_else(|| {
                has_placeholder_state(self.placeholder_state, CF_PLACEHOLDER_STATE_IN_SYNC)
            })
        }

        fn is_pinned(&self) -> bool {
            self.pin_state == Some(CF_PIN_STATE_PINNED)
                || (self.attributes & FILE_ATTRIBUTE_PINNED) != 0
        }
    }

    pub fn register_sync_root(root: &Path, version: &str) -> io::Result<()> {
        let root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
        crate::diag_log::info(
            "cloud-files",
            "register sync root start",
            &[
                ("root", root.display().to_string()),
                ("version", version.to_string()),
            ],
        );
        // Register through the WinRT StorageProviderSyncRootManager so Explorer
        // recognizes GyenBox as a sync provider (status column + overlay). That
        // registration also performs the underlying cloud-filter setup, so we must
        // NOT additionally call the Win32 CfRegisterSyncRoot (it would conflict and
        // strip the shell display info). The provider connects separately via
        // CfConnectSyncRoot.
        ensure_shell_sync_root(&root, version)?;
        notify_directory_changed(&root);
        crate::diag_log::info(
            "cloud-files",
            "register sync root ok",
            &[
                ("root", root.display().to_string()),
                ("version", version.to_string()),
            ],
        );
        Ok(())
    }

    pub fn unregister_sync_root(root: &Path) -> io::Result<()> {
        let root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
        crate::diag_log::info(
            "cloud-files",
            "unregister sync root start",
            &[("root", root.display().to_string())],
        );
        // Best-effort cleanup used before pinning the real filesystem folder to
        // Quick Access. Windows treats a StorageProvider sync root as a shell
        // namespace object, and that object's "Pin to Quick access" verb is a no-op
        // on some builds. Temporarily unregistering lets Explorer see the real
        // folder before we register the branded sidebar entry again.
        let _ = crate::shell_sync_root::unregister(&root);
        let _ = unregister_legacy_sync_root(&root);
        revert_placeholder_if_needed(&root)?;
        notify_directory_changed(&root);
        crate::diag_log::info(
            "cloud-files",
            "unregister sync root ok",
            &[("root", root.display().to_string())],
        );
        Ok(())
    }

    fn ensure_shell_sync_root(root: &Path, version: &str) -> io::Result<()> {
        match crate::shell_sync_root::register(root, version) {
            Ok(()) => Ok(()),
            Err(error) if crate::shell_sync_root::is_access_denied_cloud_file(&error) => {
                // Migration path for roots registered by pre-0.1.19 builds: remove
                // both the WinRT shell identity (if present) and the legacy Win32
                // Cloud Files root, then retry with the single WinRT registration.
                let _ = crate::shell_sync_root::unregister(root);
                let _ = unregister_legacy_sync_root(root);
                crate::shell_sync_root::register(root, version)
            }
            Err(error) => Err(error),
        }
    }
    fn unregister_legacy_sync_root(root: &Path) -> io::Result<()> {
        let root_w = wide_path(root);
        let hr = unsafe { CfUnregisterSyncRoot(root_w.as_ptr()) };
        hresult(hr, "CfUnregisterSyncRoot")
    }

    fn revert_placeholder_if_needed(root: &Path) -> io::Result<()> {
        let handle = open_for_cloud_filters(root, true)?;
        let result = (|| {
            let info = read_cloud_file_info(handle, root)?;
            if !info.is_cloud_backed() {
                crate::diag_log::info(
                    "cloud-files",
                    "revert placeholder skipped",
                    &[
                        ("root", root.display().to_string()),
                        (
                            "placeholder_state",
                            format!("0x{:08X}", info.placeholder_state),
                        ),
                        ("reparse_tag", format!("0x{:08X}", info.reparse_tag)),
                    ],
                );
                return Ok(());
            }

            crate::diag_log::info(
                "cloud-files",
                "revert placeholder start",
                &[
                    ("root", root.display().to_string()),
                    (
                        "placeholder_state",
                        format!("0x{:08X}", info.placeholder_state),
                    ),
                    ("reparse_tag", format!("0x{:08X}", info.reparse_tag)),
                    ("pin_state", format!("{:?}", info.pin_state)),
                ],
            );
            let hr =
                unsafe { CfRevertPlaceholder(handle, CF_REVERT_FLAG_NONE, std::ptr::null_mut()) };
            let result = hresult(hr, "CfRevertPlaceholder");
            match &result {
                Ok(()) => crate::diag_log::info(
                    "cloud-files",
                    "revert placeholder ok",
                    &[("root", root.display().to_string())],
                ),
                Err(error) => crate::diag_log::error(
                    "cloud-files",
                    "revert placeholder failed",
                    &[
                        ("root", root.display().to_string()),
                        ("error", error.to_string()),
                    ],
                ),
            }
            result
        })();
        unsafe {
            CloseHandle(handle);
        }
        result
    }
    pub fn mark_path(root: &Path, relative_path: &str, status: &str) -> io::Result<()> {
        let path = normalize_child(root, relative_path);
        let is_dir = path.is_dir();
        let handle = open_for_cloud_filters(&path, true)?;
        let result = (|| {
            let info = read_cloud_file_info(handle, &path)?;
            if status == "uploaded" {
                if !info.is_cloud_backed() {
                    // AlwaysFull sync roots keep folders as ordinary local
                    // directories. They can inherit Cloud Files pin attributes,
                    // which Explorer renders as a permanent blue syncing state.
                    // Clear those stale folder-only attributes once the folder is
                    // synced; files are converted by the connected provider path.
                    if is_dir {
                        clear_cloud_pin_attributes(&path, info.attributes)?;
                    }
                    return Ok(());
                }
                set_pin_state(handle, CF_PIN_STATE_PINNED)?;
                set_in_sync_state(handle, status)
            } else if info.is_cloud_backed() {
                set_in_sync_state(handle, status)
            } else {
                Ok(())
            }
        })();
        unsafe {
            CloseHandle(handle);
        }
        if result.is_ok() {
            notify_path_changed(&path, is_dir);
            if let Some(parent) = path.parent() {
                notify_directory_changed(parent);
            }
        }
        result
    }

    pub fn diagnose_path(
        root: &Path,
        relative_path: Option<&str>,
        expected_status: Option<&str>,
    ) -> io::Result<String> {
        let relative_path = relative_path.unwrap_or_default();
        let path = if relative_path.is_empty() {
            root.canonicalize().unwrap_or_else(|_| root.to_path_buf())
        } else {
            normalize_child(root, relative_path)
        };

        let exists = path.exists();
        let is_dir = path.is_dir();
        let expected_status = expected_status.filter(|value| !value.is_empty());

        let handle = match open_for_cloud_filters(&path, false) {
            Ok(handle) => handle,
            Err(error) => {
                return Ok(format_diagnosis_json(
                    &path,
                    relative_path,
                    expected_status,
                    exists,
                    is_dir,
                    None,
                    Some(&error.to_string()),
                ));
            }
        };

        let result = read_cloud_file_info(handle, &path);
        unsafe {
            CloseHandle(handle);
        }

        match result {
            Ok(info) => Ok(format_diagnosis_json(
                &path,
                relative_path,
                expected_status,
                exists,
                is_dir,
                Some(&info),
                None,
            )),
            Err(error) => Ok(format_diagnosis_json(
                &path,
                relative_path,
                expected_status,
                exists,
                is_dir,
                None,
                Some(&error.to_string()),
            )),
        }
    }

    pub fn mark_root(root: &Path, status: &str) -> io::Result<()> {
        let root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
        let handle = open_for_cloud_filters(&root, true)?;
        let result = (|| {
            let info = read_cloud_file_info(handle, &root).ok();
            if status == "uploaded" && !info.as_ref().map(CloudFileInfo::is_pinned).unwrap_or(false)
            {
                set_pin_state(handle, CF_PIN_STATE_PINNED)?;
            }

            let desired_in_sync = status == "uploaded";
            if info
                .as_ref()
                .map(|info| info.is_in_sync() == desired_in_sync)
                .unwrap_or(false)
            {
                return Ok(());
            }

            set_in_sync_state(handle, status)
        })();
        unsafe {
            CloseHandle(handle);
        }
        if result.is_ok() {
            notify_directory_changed(&root);
            if let Some(parent) = root.parent() {
                notify_directory_changed(parent);
            }
        }
        result
    }

    pub fn pin_path(path: &Path, state: &str) -> io::Result<()> {
        let path = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
        let is_dir = path.is_dir();
        let pin_state = match state {
            "pinned" | "offline" | "available-offline" => CF_PIN_STATE_PINNED,
            "unpinned" | "online-only" => CF_PIN_STATE_UNPINNED,
            value => {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    format!("unsupported pin state: {value}"),
                ));
            }
        };

        let handle = open_for_cloud_filters(&path, true)?;
        let result = (|| {
            let info = read_cloud_file_info(handle, &path)?;
            if !info.is_cloud_backed() {
                return Err(io::Error::new(
                    io::ErrorKind::Other,
                    format!("{} is not a GyenBox cloud placeholder yet", path.display()),
                ));
            }
            set_pin_state(handle, pin_state)
        })();
        unsafe {
            CloseHandle(handle);
        }
        if result.is_ok() {
            notify_path_changed(&path, is_dir);
            if let Some(parent) = path.parent() {
                notify_directory_changed(parent);
            }
        }
        result
    }

    fn set_in_sync_state(handle: HANDLE, status: &str) -> io::Result<()> {
        let state = if status == "uploaded" {
            CF_IN_SYNC_STATE_IN_SYNC
        } else {
            CF_IN_SYNC_STATE_NOT_IN_SYNC
        };
        let hr = unsafe {
            CfSetInSyncState(
                handle,
                state,
                CF_SET_IN_SYNC_FLAG_NONE,
                std::ptr::null_mut(),
            )
        };
        hresult(hr, "CfSetInSyncState")
    }

    fn set_pin_state(handle: HANDLE, pin_state: CF_PIN_STATE) -> io::Result<()> {
        let hr = unsafe {
            CfSetPinState(
                handle,
                pin_state,
                CF_SET_PIN_FLAG_NONE,
                std::ptr::null_mut(),
            )
        };
        hresult(hr, "CfSetPinState")
    }

    fn clear_cloud_pin_attributes(path: &Path, attributes: u32) -> io::Result<()> {
        let cleared = attributes & !(FILE_ATTRIBUTE_PINNED | FILE_ATTRIBUTE_UNPINNED);
        if cleared == attributes {
            return Ok(());
        }
        let path_w = wide_path(path);
        let ok = unsafe { SetFileAttributesW(path_w.as_ptr(), cleared) };
        if ok == 0 {
            let code = unsafe { GetLastError() };
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!(
                    "SetFileAttributesW failed for {}: Win32 {code}",
                    path.display()
                ),
            ));
        }
        Ok(())
    }

    #[allow(dead_code)]
    fn convert_to_cloud_file(handle: HANDLE, relative_path: &str) -> io::Result<()> {
        let identity = wide_str(relative_path);
        let flags = CF_CONVERT_FLAG_MARK_IN_SYNC | CF_CONVERT_FLAG_ALWAYS_FULL;
        let hr = unsafe {
            CfConvertToPlaceholder(
                handle,
                identity.as_ptr().cast::<c_void>(),
                byte_len(&identity),
                flags,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
            )
        };
        hresult(hr, "CfConvertToPlaceholder")
    }

    fn read_cloud_file_info(handle: HANDLE, path: &Path) -> io::Result<CloudFileInfo> {
        let (attributes, reparse_tag) = read_attribute_tag_from_find_data(path)?;
        let mut placeholder_state =
            unsafe { CfGetPlaceholderStateFromAttributeTag(attributes, reparse_tag) };
        let basic_info = read_placeholder_basic_info(handle).ok();
        let (pin_state, basic_in_sync) = basic_info.unwrap_or((None, None));

        if pin_state.is_some()
            && !has_placeholder_state(placeholder_state, CF_PLACEHOLDER_STATE_PLACEHOLDER)
        {
            placeholder_state |= CF_PLACEHOLDER_STATE_PLACEHOLDER;
            if basic_in_sync == Some(true) {
                placeholder_state |= CF_PLACEHOLDER_STATE_IN_SYNC;
            }
        }

        Ok(CloudFileInfo {
            attributes,
            reparse_tag,
            placeholder_state,
            pin_state,
            basic_in_sync,
        })
    }

    fn read_attribute_tag_from_find_data(path: &Path) -> io::Result<(u32, u32)> {
        let path_w = wide_path(path);
        let mut find_data = WIN32_FIND_DATAW::default();
        let handle = unsafe { FindFirstFileW(path_w.as_ptr(), &mut find_data) };
        if handle == INVALID_HANDLE_VALUE {
            let code = unsafe { GetLastError() };
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!("FindFirstFileW failed for {}: Win32 {code}", path.display()),
            ));
        }
        unsafe {
            FindClose(handle);
        }
        Ok((find_data.dwFileAttributes, find_data.dwReserved0))
    }
    fn read_placeholder_basic_info(
        handle: HANDLE,
    ) -> io::Result<(Option<CF_PIN_STATE>, Option<bool>)> {
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
        hresult(hr, "CfGetPlaceholderInfo")?;
        let info = unsafe { &*(buffer.as_ptr().cast::<CF_PLACEHOLDER_BASIC_INFO>()) };
        Ok((
            Some(info.PinState),
            Some(info.InSyncState == CF_IN_SYNC_STATE_IN_SYNC),
        ))
    }

    fn open_for_cloud_filters(path: &Path, write_attributes: bool) -> io::Result<HANDLE> {
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
                std::ptr::null(),
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
                std::ptr::null_mut(),
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

    fn notify_path_changed(path: &Path, is_dir: bool) {
        if is_dir {
            notify_directory_changed(path);
        } else {
            notify_shell(SHCNE_ATTRIBUTES, path);
            notify_shell(SHCNE_UPDATEITEM, path);
        }
    }

    fn notify_directory_changed(path: &Path) {
        notify_shell(SHCNE_ATTRIBUTES, path);
        notify_shell(SHCNE_UPDATEDIR, path);
        notify_shell(SHCNE_UPDATEITEM, path);
    }

    fn notify_shell(event: i32, path: &Path) {
        let path_w = wide_path(path);
        unsafe {
            SHChangeNotify(
                event,
                SHCNF_PATHW | SHCNF_FLUSH,
                path_w.as_ptr().cast::<c_void>(),
                std::ptr::null(),
            );
        }
    }

    fn normalize_child(root: &Path, relative_path: &str) -> PathBuf {
        let relative = relative_path.replace('/', "\\");
        root.join(relative)
    }

    fn format_diagnosis_json(
        path: &Path,
        relative_path: &str,
        expected_status: Option<&str>,
        exists: bool,
        is_dir: bool,
        info: Option<&CloudFileInfo>,
        error: Option<&str>,
    ) -> String {
        let consistent =
            expected_status.and_then(|status| info.map(|info| is_consistent(status, info, is_dir)));
        let attributes = info.map(|info| info.attributes).unwrap_or(0);
        let reparse_tag = info.map(|info| info.reparse_tag).unwrap_or(0);
        let placeholder_state = info
            .map(|info| info.placeholder_state)
            .unwrap_or(CF_PLACEHOLDER_STATE_INVALID);
        let is_placeholder = info.map(CloudFileInfo::is_placeholder).unwrap_or(false);
        let is_sync_root = info.map(CloudFileInfo::is_sync_root).unwrap_or(false);
        let cloud_in_sync = info.map(CloudFileInfo::is_in_sync).unwrap_or(false);
        let is_pinned = info.map(CloudFileInfo::is_pinned).unwrap_or(false);
        let pin_state = info
            .map(pin_state_label)
            .unwrap_or_else(|| "unknown".to_string());
        let hydration_state = info
            .map(hydration_state_label)
            .unwrap_or_else(|| "unknown".to_string());

        format!(
            "{{\"path\":\"{}\",\"relative_path\":\"{}\",\"expected_status\":{},\"exists\":{},\"is_directory\":{},\"is_placeholder\":{},\"is_sync_root\":{},\"cloud_in_sync\":{},\"is_pinned\":{},\"pin_state\":\"{}\",\"hydration_state\":\"{}\",\"file_attributes\":\"0x{:08X}\",\"reparse_tag\":\"0x{:08X}\",\"placeholder_state\":\"0x{:08X}\",\"consistent\":{},\"error\":{}}}",
            json_escape(&path.display().to_string()),
            json_escape(relative_path),
            json_option(expected_status),
            json_bool(exists),
            json_bool(is_dir),
            json_bool(is_placeholder),
            json_bool(is_sync_root),
            json_bool(cloud_in_sync),
            json_bool(is_pinned),
            json_escape(&pin_state),
            json_escape(&hydration_state),
            attributes,
            reparse_tag,
            placeholder_state,
            json_option_bool(consistent),
            json_option(error),
        )
    }

    fn is_consistent(expected_status: &str, info: &CloudFileInfo, is_directory: bool) -> bool {
        if expected_status == "uploaded" {
            if is_directory && !info.is_cloud_backed() {
                return !info.is_pinned();
            }
            info.is_in_sync() && info.is_cloud_backed() && (info.is_sync_root() || info.is_pinned())
        } else {
            !info.is_in_sync()
        }
    }

    fn has_placeholder_state(state: CF_PLACEHOLDER_STATE, flag: CF_PLACEHOLDER_STATE) -> bool {
        state != CF_PLACEHOLDER_STATE_INVALID && (state & flag) != 0
    }

    fn pin_state_label(info: &CloudFileInfo) -> String {
        match info.pin_state {
            Some(CF_PIN_STATE_PINNED) => "pinned".to_string(),
            Some(CF_PIN_STATE_UNPINNED) => "unpinned".to_string(),
            Some(CF_PIN_STATE_EXCLUDED) => "excluded".to_string(),
            Some(CF_PIN_STATE_INHERIT) => "inherit".to_string(),
            Some(CF_PIN_STATE_UNSPECIFIED) => "unspecified".to_string(),
            Some(value) => format!("unknown:{value}"),
            None if (info.attributes & FILE_ATTRIBUTE_PINNED) != 0 => "pinned".to_string(),
            None if (info.attributes & FILE_ATTRIBUTE_UNPINNED) != 0 => "unpinned".to_string(),
            None => "unknown".to_string(),
        }
    }

    fn hydration_state_label(info: &CloudFileInfo) -> String {
        if (info.attributes & FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS) != 0 {
            "recall_on_data_access".to_string()
        } else if (info.attributes & FILE_ATTRIBUTE_RECALL_ON_OPEN) != 0 {
            "recall_on_open".to_string()
        } else {
            "full".to_string()
        }
    }

    fn json_option(value: Option<&str>) -> String {
        value
            .map(|value| format!("\"{}\"", json_escape(value)))
            .unwrap_or_else(|| "null".to_string())
    }

    fn json_option_bool(value: Option<bool>) -> &'static str {
        match value {
            Some(true) => "true",
            Some(false) => "false",
            None => "null",
        }
    }

    fn json_bool(value: bool) -> &'static str {
        if value { "true" } else { "false" }
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
pub use imp::{
    diagnose_path, mark_path, mark_root, pin_path, register_sync_root, unregister_sync_root,
};

#[cfg(not(windows))]
pub fn register_sync_root(_root: &std::path::Path, _version: &str) -> std::io::Result<()> {
    Ok(())
}

#[cfg(not(windows))]
pub fn unregister_sync_root(_root: &std::path::Path) -> std::io::Result<()> {
    Ok(())
}

#[cfg(not(windows))]
pub fn mark_path(
    _root: &std::path::Path,
    _relative_path: &str,
    _status: &str,
) -> std::io::Result<()> {
    Ok(())
}

#[cfg(not(windows))]
pub fn mark_root(_root: &std::path::Path, _status: &str) -> std::io::Result<()> {
    Ok(())
}

#[cfg(not(windows))]
pub fn pin_path(_path: &std::path::Path, _state: &str) -> std::io::Result<()> {
    Ok(())
}

#[cfg(not(windows))]
pub fn diagnose_path(
    root: &std::path::Path,
    relative_path: Option<&str>,
    expected_status: Option<&str>,
) -> std::io::Result<String> {
    let relative_path = relative_path.unwrap_or_default().replace('"', "\\\"");
    let expected_status = expected_status
        .map(|value| format!("\"{}\"", value.replace('"', "\\\"")))
        .unwrap_or_else(|| "null".to_string());
    Ok(format!(
        "{{\"path\":\"{}\",\"relative_path\":\"{}\",\"expected_status\":{},\"supported\":false,\"consistent\":null,\"error\":\"Cloud Files is only available on Windows.\"}}",
        root.display(),
        relative_path,
        expected_status,
    ))
}
