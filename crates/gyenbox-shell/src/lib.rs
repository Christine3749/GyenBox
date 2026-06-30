#![cfg(windows)]

use std::ffi::c_void;
use std::os::windows::ffi::OsStrExt;
use std::ptr::null_mut;
use std::sync::atomic::{AtomicU32, Ordering};

use windows_sys::Win32::Foundation::{ERROR_SUCCESS, S_FALSE, S_OK};
use windows_sys::Win32::System::Registry::{
    RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_CURRENT_USER, KEY_READ,
    REG_EXPAND_SZ, REG_SZ,
};
use windows_sys::core::GUID;

const E_NOINTERFACE: i32 = 0x8000_4002u32 as i32;
const E_POINTER: i32 = 0x8000_4003u32 as i32;
const E_OUTOFMEMORY: i32 = 0x8007_000Eu32 as i32;
const CLASS_E_NOAGGREGATION: i32 = 0x8004_0110u32 as i32;
const CLASS_E_CLASSNOTAVAILABLE: i32 = 0x8004_0111u32 as i32;

const IID_IUNKNOWN: GUID = GUID {
    data1: 0x0000_0000,
    data2: 0x0000,
    data3: 0x0000,
    data4: [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46],
};
const IID_ICLASS_FACTORY: GUID = GUID {
    data1: 0x0000_0001,
    data2: 0x0000,
    data3: 0x0000,
    data4: [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46],
};
const IID_ISHELL_ICON_OVERLAY_IDENTIFIER: GUID = GUID {
    data1: 0x0C6C_4200,
    data2: 0xC589,
    data3: 0x11D0,
    data4: [0x99, 0x9A, 0x00, 0xC0, 0x4F, 0xD6, 0x55, 0xE1],
};

// Stable COM class id for the GyenBox synced-root overlay.
const CLSID_GYENBOX_SYNCED_OVERLAY: GUID = GUID {
    data1: 0xE6E2_2C74,
    data2: 0x2E0A,
    data3: 0x4F91,
    data4: [0x96, 0x65, 0x9F, 0xC3, 0x90, 0x2D, 0xD5, 0x93],
};

const SHELL_SETTINGS_KEY: &str = r"Software\GyenBox\Shell";
const ISIOI_ICONFILE: u32 = 0x0000_0001;
const ISIOI_ICONINDEX: u32 = 0x0000_0002;

static OBJECT_COUNT: AtomicU32 = AtomicU32::new(0);
static SERVER_LOCKS: AtomicU32 = AtomicU32::new(0);

#[repr(C)]
struct OverlayObject {
    vtable: *const OverlayVtable,
    refs: AtomicU32,
}

#[repr(C)]
struct OverlayVtable {
    query_interface: unsafe extern "system" fn(
        this: *mut c_void,
        riid: *const GUID,
        object: *mut *mut c_void,
    ) -> i32,
    add_ref: unsafe extern "system" fn(this: *mut c_void) -> u32,
    release: unsafe extern "system" fn(this: *mut c_void) -> u32,
    is_member_of:
        unsafe extern "system" fn(this: *mut c_void, path: *const u16, attributes: u32) -> i32,
    get_overlay_info: unsafe extern "system" fn(
        this: *mut c_void,
        icon_file: *mut u16,
        max_chars: i32,
        index: *mut i32,
        flags: *mut u32,
    ) -> i32,
    get_priority: unsafe extern "system" fn(this: *mut c_void, priority: *mut i32) -> i32,
}

#[repr(C)]
struct ClassFactory {
    vtable: *const ClassFactoryVtable,
    refs: AtomicU32,
}

#[repr(C)]
struct ClassFactoryVtable {
    query_interface: unsafe extern "system" fn(
        this: *mut c_void,
        riid: *const GUID,
        object: *mut *mut c_void,
    ) -> i32,
    add_ref: unsafe extern "system" fn(this: *mut c_void) -> u32,
    release: unsafe extern "system" fn(this: *mut c_void) -> u32,
    create_instance: unsafe extern "system" fn(
        this: *mut c_void,
        outer: *mut c_void,
        riid: *const GUID,
        object: *mut *mut c_void,
    ) -> i32,
    lock_server: unsafe extern "system" fn(this: *mut c_void, lock: i32) -> i32,
}

static OVERLAY_VTABLE: OverlayVtable = OverlayVtable {
    query_interface: overlay_query_interface,
    add_ref: overlay_add_ref,
    release: overlay_release,
    is_member_of: overlay_is_member_of,
    get_overlay_info: overlay_get_overlay_info,
    get_priority: overlay_get_priority,
};

static CLASS_FACTORY_VTABLE: ClassFactoryVtable = ClassFactoryVtable {
    query_interface: factory_query_interface,
    add_ref: factory_add_ref,
    release: factory_release,
    create_instance: factory_create_instance,
    lock_server: factory_lock_server,
};

#[unsafe(no_mangle)]
pub unsafe extern "system" fn DllGetClassObject(
    class_id: *const GUID,
    riid: *const GUID,
    object: *mut *mut c_void,
) -> i32 {
    if object.is_null() {
        return E_POINTER;
    }
    unsafe {
        *object = null_mut();
    }
    if !guid_eq(class_id, &CLSID_GYENBOX_SYNCED_OVERLAY) {
        return CLASS_E_CLASSNOTAVAILABLE;
    }

    let factory = Box::into_raw(Box::new(ClassFactory {
        vtable: &CLASS_FACTORY_VTABLE,
        refs: AtomicU32::new(1),
    }));
    OBJECT_COUNT.fetch_add(1, Ordering::SeqCst);

    let result = unsafe { factory_query_interface(factory.cast(), riid, object) };
    unsafe {
        factory_release(factory.cast());
    }
    result
}

#[unsafe(no_mangle)]
pub extern "system" fn DllCanUnloadNow() -> i32 {
    if OBJECT_COUNT.load(Ordering::SeqCst) == 0 && SERVER_LOCKS.load(Ordering::SeqCst) == 0 {
        S_OK
    } else {
        S_FALSE
    }
}

unsafe extern "system" fn overlay_query_interface(
    this: *mut c_void,
    riid: *const GUID,
    object: *mut *mut c_void,
) -> i32 {
    if object.is_null() {
        return E_POINTER;
    }
    unsafe {
        *object = null_mut();
    }

    if guid_eq(riid, &IID_IUNKNOWN) || guid_eq(riid, &IID_ISHELL_ICON_OVERLAY_IDENTIFIER) {
        unsafe {
            overlay_add_ref(this);
            *object = this;
        }
        S_OK
    } else {
        E_NOINTERFACE
    }
}

unsafe extern "system" fn overlay_add_ref(this: *mut c_void) -> u32 {
    let overlay = unsafe { &*(this.cast::<OverlayObject>()) };
    overlay.refs.fetch_add(1, Ordering::SeqCst) + 1
}

unsafe extern "system" fn overlay_release(this: *mut c_void) -> u32 {
    let overlay = unsafe { &*(this.cast::<OverlayObject>()) };
    let remaining = overlay.refs.fetch_sub(1, Ordering::SeqCst) - 1;
    if remaining == 0 {
        OBJECT_COUNT.fetch_sub(1, Ordering::SeqCst);
        unsafe {
            drop(Box::from_raw(this.cast::<OverlayObject>()));
        }
    }
    remaining
}

unsafe extern "system" fn overlay_is_member_of(
    _this: *mut c_void,
    path: *const u16,
    _attributes: u32,
) -> i32 {
    let Some(candidate) = wide_ptr_to_string(path) else {
        return S_FALSE;
    };
    let Some(sync_root) = read_shell_string("SyncRoot") else {
        return S_FALSE;
    };
    let state = read_shell_string("RootState").unwrap_or_else(|| "dirty".to_string());

    if state.eq_ignore_ascii_case("synced") && same_shell_path(&candidate, &sync_root) {
        S_OK
    } else {
        S_FALSE
    }
}

unsafe extern "system" fn overlay_get_overlay_info(
    _this: *mut c_void,
    icon_file: *mut u16,
    max_chars: i32,
    index: *mut i32,
    flags: *mut u32,
) -> i32 {
    if icon_file.is_null() || index.is_null() || flags.is_null() || max_chars <= 0 {
        return E_POINTER;
    }
    let Some(icon_path) = read_shell_string("OverlaySyncedIcon") else {
        return S_FALSE;
    };
    if icon_path.is_empty() {
        return S_FALSE;
    }

    let wide = wide_string(&icon_path);
    let capacity = max_chars as usize;
    let copy_len = wide.len().min(capacity.saturating_sub(1));
    unsafe {
        std::ptr::copy_nonoverlapping(wide.as_ptr(), icon_file, copy_len);
        *icon_file.add(copy_len) = 0;
        *index = 0;
        *flags = ISIOI_ICONFILE | ISIOI_ICONINDEX;
    }
    S_OK
}

unsafe extern "system" fn overlay_get_priority(_this: *mut c_void, priority: *mut i32) -> i32 {
    if priority.is_null() {
        return E_POINTER;
    }
    unsafe {
        *priority = 0;
    }
    S_OK
}

unsafe extern "system" fn factory_query_interface(
    this: *mut c_void,
    riid: *const GUID,
    object: *mut *mut c_void,
) -> i32 {
    if object.is_null() {
        return E_POINTER;
    }
    unsafe {
        *object = null_mut();
    }

    if guid_eq(riid, &IID_IUNKNOWN) || guid_eq(riid, &IID_ICLASS_FACTORY) {
        unsafe {
            factory_add_ref(this);
            *object = this;
        }
        S_OK
    } else {
        E_NOINTERFACE
    }
}

unsafe extern "system" fn factory_add_ref(this: *mut c_void) -> u32 {
    let factory = unsafe { &*(this.cast::<ClassFactory>()) };
    factory.refs.fetch_add(1, Ordering::SeqCst) + 1
}

unsafe extern "system" fn factory_release(this: *mut c_void) -> u32 {
    let factory = unsafe { &*(this.cast::<ClassFactory>()) };
    let remaining = factory.refs.fetch_sub(1, Ordering::SeqCst) - 1;
    if remaining == 0 {
        OBJECT_COUNT.fetch_sub(1, Ordering::SeqCst);
        unsafe {
            drop(Box::from_raw(this.cast::<ClassFactory>()));
        }
    }
    remaining
}

unsafe extern "system" fn factory_create_instance(
    _this: *mut c_void,
    outer: *mut c_void,
    riid: *const GUID,
    object: *mut *mut c_void,
) -> i32 {
    if object.is_null() {
        return E_POINTER;
    }
    unsafe {
        *object = null_mut();
    }
    if !outer.is_null() {
        return CLASS_E_NOAGGREGATION;
    }

    let overlay = Box::into_raw(Box::new(OverlayObject {
        vtable: &OVERLAY_VTABLE,
        refs: AtomicU32::new(1),
    }));
    OBJECT_COUNT.fetch_add(1, Ordering::SeqCst);

    let result = unsafe { overlay_query_interface(overlay.cast(), riid, object) };
    unsafe {
        overlay_release(overlay.cast());
    }
    if result == S_OK {
        S_OK
    } else if result == E_NOINTERFACE {
        E_NOINTERFACE
    } else {
        E_OUTOFMEMORY
    }
}

unsafe extern "system" fn factory_lock_server(_this: *mut c_void, lock: i32) -> i32 {
    if lock != 0 {
        SERVER_LOCKS.fetch_add(1, Ordering::SeqCst);
    } else {
        SERVER_LOCKS
            .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |value| {
                Some(value.saturating_sub(1))
            })
            .ok();
    }
    S_OK
}

fn read_shell_string(value_name: &str) -> Option<String> {
    let key_path = wide_string(SHELL_SETTINGS_KEY);
    let mut key: HKEY = null_mut();
    let open_result = unsafe {
        RegOpenKeyExW(
            HKEY_CURRENT_USER,
            key_path.as_ptr(),
            0,
            KEY_READ,
            &mut key,
        )
    };
    if open_result != ERROR_SUCCESS {
        return None;
    }

    let result = read_reg_string(key, value_name);
    unsafe {
        RegCloseKey(key);
    }
    result
}

fn read_reg_string(key: HKEY, value_name: &str) -> Option<String> {
    let value_name_wide = wide_string(value_name);
    let mut value_type = 0;
    let mut byte_len = 0u32;
    let query_len = unsafe {
        RegQueryValueExW(
            key,
            value_name_wide.as_ptr(),
            std::ptr::null(),
            &mut value_type,
            std::ptr::null_mut(),
            &mut byte_len,
        )
    };
    if query_len != ERROR_SUCCESS || byte_len < 2 {
        return None;
    }
    if value_type != REG_SZ && value_type != REG_EXPAND_SZ {
        return None;
    }

    let mut bytes = vec![0u8; byte_len as usize];
    let query_value = unsafe {
        RegQueryValueExW(
            key,
            value_name_wide.as_ptr(),
            std::ptr::null(),
            &mut value_type,
            bytes.as_mut_ptr(),
            &mut byte_len,
        )
    };
    if query_value != ERROR_SUCCESS {
        return None;
    }

    let utf16_len = (byte_len as usize) / 2;
    let utf16 = unsafe { std::slice::from_raw_parts(bytes.as_ptr().cast::<u16>(), utf16_len) };
    let trimmed_len = utf16.iter().position(|value| *value == 0).unwrap_or(utf16.len());
    Some(String::from_utf16_lossy(&utf16[..trimmed_len]))
}

fn same_shell_path(left: &str, right: &str) -> bool {
    normalize_shell_path(left) == normalize_shell_path(right)
}

fn normalize_shell_path(path: &str) -> String {
    let stripped = path
        .strip_prefix(r"\\?\UNC\")
        .map(|rest| format!(r"\\{rest}"))
        .or_else(|| path.strip_prefix(r"\\?\").map(str::to_string))
        .unwrap_or_else(|| path.to_string());
    stripped.trim_end_matches(['\\', '/']).to_lowercase()
}

fn wide_ptr_to_string(ptr: *const u16) -> Option<String> {
    if ptr.is_null() {
        return None;
    }
    let mut len = 0usize;
    unsafe {
        while *ptr.add(len) != 0 {
            len += 1;
        }
        Some(String::from_utf16_lossy(std::slice::from_raw_parts(ptr, len)))
    }
}

fn wide_string(value: &str) -> Vec<u16> {
    std::ffi::OsStr::new(value)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

fn guid_eq(left: *const GUID, right: &GUID) -> bool {
    if left.is_null() {
        return false;
    }
    let left = unsafe { &*left };
    left.data1 == right.data1
        && left.data2 == right.data2
        && left.data3 == right.data3
        && left.data4 == right.data4
}
