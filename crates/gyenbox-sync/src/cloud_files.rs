#[cfg(windows)]
mod imp {
    use std::ffi::c_void;
    use std::io;
    use std::mem::size_of;
    use std::os::windows::ffi::OsStrExt;
    use std::path::{Path, PathBuf};
    use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, HANDLE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::Storage::CloudFilters::{
        CF_CONVERT_FLAG_FORCE_CONVERT_TO_CLOUD_FILE, CF_CONVERT_FLAG_MARK_IN_SYNC,
        CF_HARDLINK_POLICY_NONE, CF_HYDRATION_POLICY, CF_HYDRATION_POLICY_FULL,
        CF_HYDRATION_POLICY_MODIFIER_NONE, CF_IN_SYNC_STATE_IN_SYNC, CF_IN_SYNC_STATE_NOT_IN_SYNC,
        CF_INSYNC_POLICY_TRACK_ALL, CF_PLACEHOLDER_MANAGEMENT_POLICY_DEFAULT, CF_POPULATION_POLICY,
        CF_POPULATION_POLICY_ALWAYS_FULL, CF_POPULATION_POLICY_MODIFIER_NONE,
        CF_REGISTER_FLAG_MARK_IN_SYNC_ON_ROOT, CF_REGISTER_FLAG_UPDATE, CF_SET_IN_SYNC_FLAG_NONE,
        CF_SYNC_POLICIES, CF_SYNC_REGISTRATION, CfConvertToPlaceholder, CfRegisterSyncRoot,
        CfSetInSyncState,
    };
    use windows_sys::Win32::Storage::FileSystem::{
        CreateFileW, FILE_FLAG_BACKUP_SEMANTICS, FILE_READ_ATTRIBUTES, FILE_SHARE_DELETE,
        FILE_SHARE_READ, FILE_SHARE_WRITE, FILE_WRITE_ATTRIBUTES, OPEN_EXISTING,
    };
    use windows_sys::core::GUID;

    const PROVIDER_ID: GUID = GUID {
        data1: 0x73c23e94,
        data2: 0x424b,
        data3: 0x4e87,
        data4: [0x9a, 0x31, 0x53, 0xb0, 0x47, 0x7d, 0xd8, 0x0a],
    };

    pub fn register_sync_root(root: &Path, version: &str) -> io::Result<()> {
        let root = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());
        let root_w = wide_path(&root);
        let provider_name = wide_str("GyenBox");
        let provider_version = wide_str(version);
        let identity = format!("gyenbox:{}", root.display());
        let identity_w = wide_str(&identity);

        let registration = CF_SYNC_REGISTRATION {
            StructSize: size_of::<CF_SYNC_REGISTRATION>() as u32,
            ProviderName: provider_name.as_ptr(),
            ProviderVersion: provider_version.as_ptr(),
            SyncRootIdentity: identity_w.as_ptr().cast::<c_void>(),
            SyncRootIdentityLength: byte_len(&identity_w),
            FileIdentity: std::ptr::null(),
            FileIdentityLength: 0,
            ProviderId: PROVIDER_ID,
        };

        let policies = CF_SYNC_POLICIES {
            StructSize: size_of::<CF_SYNC_POLICIES>() as u32,
            Hydration: CF_HYDRATION_POLICY {
                Primary: CF_HYDRATION_POLICY_FULL,
                Modifier: CF_HYDRATION_POLICY_MODIFIER_NONE,
            },
            Population: CF_POPULATION_POLICY {
                Primary: CF_POPULATION_POLICY_ALWAYS_FULL,
                Modifier: CF_POPULATION_POLICY_MODIFIER_NONE,
            },
            InSync: CF_INSYNC_POLICY_TRACK_ALL,
            HardLink: CF_HARDLINK_POLICY_NONE,
            PlaceholderManagement: CF_PLACEHOLDER_MANAGEMENT_POLICY_DEFAULT,
        };

        let hr = unsafe {
            CfRegisterSyncRoot(
                root_w.as_ptr(),
                &registration,
                &policies,
                CF_REGISTER_FLAG_UPDATE | CF_REGISTER_FLAG_MARK_IN_SYNC_ON_ROOT,
            )
        };
        hresult(hr, "CfRegisterSyncRoot")
    }

    pub fn mark_path(root: &Path, relative_path: &str, status: &str) -> io::Result<()> {
        let path = normalize_child(root, relative_path);
        let handle = open_for_cloud_filters(&path)?;
        let result = (|| {
            let _ = convert_to_cloud_file(handle, relative_path, status == "uploaded");
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
        })();
        unsafe {
            CloseHandle(handle);
        }
        result
    }

    fn convert_to_cloud_file(
        handle: HANDLE,
        relative_path: &str,
        mark_in_sync: bool,
    ) -> io::Result<()> {
        let identity = wide_str(relative_path);
        let mut flags = CF_CONVERT_FLAG_FORCE_CONVERT_TO_CLOUD_FILE;
        if mark_in_sync {
            flags |= CF_CONVERT_FLAG_MARK_IN_SYNC;
        }
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

    fn open_for_cloud_filters(path: &Path) -> io::Result<HANDLE> {
        let path_w = wide_path(path);
        let handle = unsafe {
            CreateFileW(
                path_w.as_ptr(),
                FILE_READ_ATTRIBUTES | FILE_WRITE_ATTRIBUTES,
                FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                std::ptr::null(),
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS,
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

    fn normalize_child(root: &Path, relative_path: &str) -> PathBuf {
        let relative = relative_path.replace('/', "\\");
        root.join(relative)
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
pub use imp::{mark_path, register_sync_root};

#[cfg(not(windows))]
pub fn register_sync_root(_root: &std::path::Path, _version: &str) -> std::io::Result<()> {
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
