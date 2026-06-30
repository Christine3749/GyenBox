#[cfg(windows)]
mod imp {
    use std::collections::hash_map::DefaultHasher;
    use std::env;
    use std::hash::{Hash, Hasher};
    use std::io;
    use std::path::Path;

    use windows::Storage::Provider::{
        StorageProviderHardlinkPolicy, StorageProviderHydrationPolicy, StorageProviderInSyncPolicy,
        StorageProviderPopulationPolicy, StorageProviderProtectionMode,
        StorageProviderSyncRootInfo, StorageProviderSyncRootManager,
    };
    use windows::Storage::StorageFolder;
    use windows::Win32::System::Com::{COINIT_MULTITHREADED, CoInitializeEx};
    use windows::core::{GUID, HSTRING};
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, LocalFree};
    use windows_sys::Win32::Security::Authorization::ConvertSidToStringSidW;
    use windows_sys::Win32::Security::{GetTokenInformation, TOKEN_QUERY, TOKEN_USER, TokenUser};
    use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};
    use windows_sys::core::PWSTR;

    const PROVIDER_ID: GUID = GUID::from_u128(0x73c23e94_424b_4e87_9a31_53b0477dd80a);

    pub fn register(root: &Path, version: &str) -> io::Result<()> {
        register_inner(root, version).map_err(to_io_error)
    }

    pub fn is_access_denied_cloud_file(error: &io::Error) -> bool {
        let message = error.to_string();
        message.contains("0x8007018B") || message.contains("Access to the cloud file is denied")
    }

    pub fn init_com() {
        // WinRT (StorageProviderSyncRootManager + IAsyncOperation::get) requires an
        // initialized COM apartment. Use MTA so blocking on `.get()` never deadlocks
        // (STA would need a message pump). Idempotent; ignore the HRESULT, including
        // RPC_E_CHANGED_MODE if this thread was already initialized.
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
    }

    pub fn unregister(root: &Path) -> io::Result<()> {
        unregister_inner(root).map_err(to_io_error)
    }

    fn unregister_inner(root: &Path) -> windows::core::Result<()> {
        let root_string = sync_root_path(root);
        let id = sync_root_id(&root_string);
        StorageProviderSyncRootManager::Unregister(&HSTRING::from(id))
    }

    pub fn unregister_id(id: &str) -> io::Result<()> {
        StorageProviderSyncRootManager::Unregister(&HSTRING::from(id)).map_err(to_io_error)
    }
    pub fn cleanup_duplicate_roots(current_root: &Path) -> io::Result<()> {
        let current = normalize_for_compare(&sync_root_path(current_root));
        let roots = StorageProviderSyncRootManager::GetCurrentSyncRoots().map_err(to_io_error)?;
        let size = roots.Size().map_err(to_io_error)?;

        for index in 0..size {
            let Ok(info) = roots.GetAt(index) else { continue };
            let Ok(id) = info.Id() else { continue };
            let id_string = id.to_string();
            if !id_string.starts_with("GyenBox!") {
                continue;
            }

            let root_path = info
                .Path()
                .ok()
                .and_then(|folder| folder.Path().ok())
                .map(|value| value.to_string())
                .unwrap_or_default();
            if normalize_for_compare(&root_path) != current {
                let _ = StorageProviderSyncRootManager::Unregister(&id);
            }
        }

        Ok(())
    }
    pub fn list_roots() -> io::Result<String> {
        let roots = StorageProviderSyncRootManager::GetCurrentSyncRoots().map_err(to_io_error)?;
        let size = roots.Size().map_err(to_io_error)?;
        let mut lines = Vec::new();
        for index in 0..size {
            let Ok(info) = roots.GetAt(index) else { continue };
            let id = info.Id().map(|value| value.to_string()).unwrap_or_default();
            let path = info
                .Path()
                .ok()
                .and_then(|folder| folder.Path().ok())
                .map(|value| value.to_string())
                .unwrap_or_default();
            let name = info.DisplayNameResource().map(|value| value.to_string()).unwrap_or_default();
            lines.push(format!("{id}\t{name}\t{path}"));
        }
        Ok(lines.join("\n"))
    }

    fn register_inner(root: &Path, version: &str) -> windows::core::Result<()> {
        let root_string = sync_root_path(root);
        let id = sync_root_id(&root_string);

        // Idempotent: if this sync root id is already registered, do nothing.
        // register_sync_root runs twice per launch (startup registerCloudSyncRoot
        // + the resident provider's connect), and StorageProviderSyncRootManager
        // ::Register mints a fresh shell namespace entry every call — without this
        // guard, duplicate "GyenBox" items pile up in Explorer's nav pane on each
        // launch.
        if StorageProviderSyncRootManager::GetSyncRootInformationForId(&HSTRING::from(&id)).is_ok()
        {
            return Ok(());
        }

        let folder = StorageFolder::GetFolderFromPathAsync(&HSTRING::from(&root_string))?.get()?;
        let info = StorageProviderSyncRootInfo::new()?;

        info.SetId(&HSTRING::from(&id))?;
        info.SetProviderId(PROVIDER_ID)?;
        info.SetPath(&folder)?;
        info.SetDisplayNameResource(&HSTRING::from("GyenBox"))?;
        info.SetIconResource(&HSTRING::from(icon_resource()))?;
        info.SetVersion(&HSTRING::from(version))?;
        info.SetShowSiblingsAsGroup(false)?;
        info.SetHardlinkPolicy(StorageProviderHardlinkPolicy::None)?;
        info.SetHydrationPolicy(StorageProviderHydrationPolicy::AlwaysFull)?;
        info.SetPopulationPolicy(StorageProviderPopulationPolicy::AlwaysFull)?;
        info.SetInSyncPolicy(StorageProviderInSyncPolicy::Default)?;
        info.SetProtectionMode(StorageProviderProtectionMode::Unknown)?;
        info.SetAllowPinning(true)?;

        StorageProviderSyncRootManager::Register(&info)
    }

    fn normalize_for_compare(path: &str) -> String {
        strip_verbatim_prefix(path)
            .replace('/', "\\")
            .trim_end_matches('\\')
            .to_lowercase()
    }
    fn sync_root_path(root: &Path) -> String {
        let path = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
        strip_verbatim_prefix(&path.display().to_string())
    }

    fn strip_verbatim_prefix(path: &str) -> String {
        if let Some(rest) = path.strip_prefix("\\\\?\\UNC\\") {
            format!("\\\\{}", rest)
        } else if let Some(rest) = path.strip_prefix("\\\\?\\") {
            rest.to_string()
        } else {
            path.to_string()
        }
    }
    fn sync_root_id(root: &str) -> String {
        let mut hasher = DefaultHasher::new();
        root.to_lowercase().hash(&mut hasher);
        format!(
            "GyenBox!{}!root-{:016x}",
            current_user_sid(),
            hasher.finish()
        )
    }

    fn current_user_sid() -> String {
        current_user_sid_inner().unwrap_or_else(|| "unknown-user".to_string())
    }

    fn current_user_sid_inner() -> Option<String> {
        unsafe {
            let mut token: HANDLE = std::ptr::null_mut();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
                return None;
            }

            let sid = read_token_user_sid(token);
            let _ = CloseHandle(token);
            sid
        }
    }

    unsafe fn read_token_user_sid(token: HANDLE) -> Option<String> {
        let mut required = 0u32;
        let _ = unsafe {
            GetTokenInformation(token, TokenUser, std::ptr::null_mut(), 0, &mut required)
        };
        if required == 0 {
            return None;
        }

        let mut buffer = vec![0u8; required as usize];
        if unsafe {
            GetTokenInformation(
                token,
                TokenUser,
                buffer.as_mut_ptr().cast(),
                required,
                &mut required,
            )
        } == 0
        {
            return None;
        }

        let token_user = unsafe { &*(buffer.as_ptr().cast::<TOKEN_USER>()) };
        unsafe { sid_to_string(token_user.User.Sid) }
    }

    unsafe fn sid_to_string(sid: *mut std::ffi::c_void) -> Option<String> {
        let mut sid_string: PWSTR = std::ptr::null_mut();
        if unsafe { ConvertSidToStringSidW(sid, &mut sid_string) } == 0 || sid_string.is_null() {
            return None;
        }

        let mut len = 0usize;
        while unsafe { *sid_string.add(len) } != 0 {
            len += 1;
        }
        let result =
            String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(sid_string, len) });
        let _ = unsafe { LocalFree(sid_string.cast()) };
        Some(result)
    }

    fn icon_resource() -> String {
        let path = env::var("GYENBOX_SHELL_ICON")
            .ok()
            .filter(|value| !value.trim().is_empty())
            .or_else(installed_app_icon_from_helper)
            .or_else(dev_icon_from_workspace)
            .or_else(|| {
                env::current_exe()
                    .ok()
                    .map(|path| path.display().to_string())
            })
            .unwrap_or_else(|| "GyenBox".to_string());
        format!("{},0", path)
    }

    fn installed_app_icon_from_helper() -> Option<String> {
        let helper_path = env::current_exe().ok()?;
        if !helper_path
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| name.eq_ignore_ascii_case("gyenbox-sync.exe"))
            .unwrap_or(false)
        {
            return None;
        }

        for ancestor in helper_path.ancestors() {
            let app_exe = ancestor.join("GyenBox.exe");
            if app_exe.is_file() {
                return Some(app_exe.display().to_string());
            }
        }
        None
    }

    fn dev_icon_from_workspace() -> Option<String> {
        let helper_path = env::current_exe().ok()?;
        for ancestor in helper_path.ancestors() {
            let icon = ancestor.join("apps").join("desktop").join("build").join("icon.ico");
            if icon.is_file() {
                return Some(icon.display().to_string());
            }
        }
        None
    }

    fn to_io_error(error: windows::core::Error) -> io::Error {
        io::Error::new(io::ErrorKind::Other, format!("{error:?}"))
    }
}

#[cfg(not(windows))]
mod imp {
    use std::io;
    use std::path::Path;

    pub fn register(_root: &Path, _version: &str) -> io::Result<()> {
        Ok(())
    }

    pub fn unregister(_root: &Path) -> io::Result<()> {
        Ok(())
    }

    pub fn unregister_id(_id: &str) -> io::Result<()> {
        Ok(())
    }
    pub fn cleanup_duplicate_roots(_current_root: &Path) -> io::Result<()> {
        Ok(())
    }
    pub fn list_roots() -> io::Result<String> {
        Ok(String::new())
    }

    pub fn init_com() {}

    pub fn is_access_denied_cloud_file(_error: &io::Error) -> bool {
        false
    }
}

pub use imp::{cleanup_duplicate_roots, init_com, is_access_denied_cloud_file, list_roots, register, unregister, unregister_id};

