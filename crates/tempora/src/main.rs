//! tempora — Mac-style three-finger drag for Windows precision touchpads.
//!
//! Pipeline: register Raw Input for the touchpad HID (UsagePage 0x0D / Usage
//! 0x05) -> a message-only window receives `WM_INPUT` -> parse contacts with the
//! `HidP_*` API -> a drag state machine synthesizes left button down / move / up
//! through `SendInput`. Every frame is timestamped with QPC so the time we add
//! on top of the hardware's ~1-8 ms report interval stays observable (and tiny).
//!
//! Hard truth: end-to-end latency is bounded by the touchpad's HID report rate,
//! not by this code. "Nanosecond" lives in the timestamps and our own overhead,
//! not in the physical response.
#![cfg(windows)]

use std::collections::HashMap;
use std::ffi::c_void;
use std::ptr::{null, null_mut};

use windows_sys::Win32::Devices::HumanInterfaceDevice::{
    HidP_GetCaps, HidP_GetUsageValue, HidP_GetUsages, HidP_GetValueCaps, HidP_Input, HIDP_CAPS,
    HIDP_VALUE_CAPS,
};
use windows_sys::Win32::Foundation::{HANDLE, HWND, LPARAM, LRESULT, WPARAM};
use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
use windows_sys::Win32::System::Performance::{
    QueryPerformanceCounter, QueryPerformanceFrequency,
};
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_MOUSE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP,
    MOUSEEVENTF_MOVE, MOUSEINPUT,
};
use windows_sys::Win32::UI::Input::{
    GetRawInputData, GetRawInputDeviceInfoW, RegisterRawInputDevices, HRAWINPUT, RAWINPUT,
    RAWINPUTDEVICE, RAWINPUTHEADER, RID_INPUT, RIDEV_INPUTSINK, RIDI_PREPARSEDDATA,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DispatchMessageW, GetMessageW, GetWindowLongPtrW,
    RegisterClassW, SetWindowLongPtrW, TranslateMessage, GWLP_USERDATA, MSG, WM_INPUT, WNDCLASSW,
};

// HID usage pages / usages we care about.
const PAGE_GENERIC_DESKTOP: u16 = 0x01;
const USAGE_X: u16 = 0x30;
const USAGE_Y: u16 = 0x31;
const PAGE_DIGITIZER: u16 = 0x0D;
const USAGE_TIP_SWITCH: u16 = 0x42;

const HIDP_STATUS_SUCCESS: i32 = 0x0011_0000;
const RIM_TYPEHID: u32 = 2;
const HWND_MESSAGE: HWND = -3isize as HWND;

/// How many screen pixels one touchpad logical unit of centroid travel maps to.
/// Touchpad logical ranges differ per device, so this is a blunt gain knob —
/// tune it (or override via TEMPORA_SENSITIVITY) until dragging feels right.
const DEFAULT_SENSITIVITY: f32 = 1.0;
/// Ignore centroid jitter below this many logical units between frames.
const MOVE_THRESHOLD: f32 = 1.0;

/// One touchpad contact (finger) in a single HID report.
#[derive(Clone, Copy)]
struct Contact {
    x: f32,
    y: f32,
    tip_down: bool,
}

/// Monotonic nanosecond clock backed by QueryPerformanceCounter.
struct Clock {
    freq: i64,
}

impl Clock {
    fn new() -> Self {
        let mut freq = 0i64;
        unsafe { QueryPerformanceFrequency(&mut freq) };
        Self { freq: freq.max(1) }
    }

    fn now_ns(&self) -> u64 {
        let mut counter = 0i64;
        unsafe { QueryPerformanceCounter(&mut counter) };
        ((counter as i128 * 1_000_000_000i128) / self.freq as i128) as u64
    }
}

/// Mac-style three-finger drag: 3 fingers down == left button held.
struct DragState {
    dragging: bool,
    last_centroid: Option<(f32, f32)>,
    sensitivity: f32,
}

impl DragState {
    fn new(sensitivity: f32) -> Self {
        Self {
            dragging: false,
            last_centroid: None,
            sensitivity,
        }
    }

    /// Feed one parsed HID frame. Returns true if it produced mouse output.
    fn on_frame(&mut self, contacts: &[Contact]) -> bool {
        let down: Vec<&Contact> = contacts.iter().filter(|c| c.tip_down).collect();
        let three = down.len() == 3;
        let centroid = centroid(&down);

        match (three, self.dragging) {
            (true, false) => {
                inject_left(true);
                self.dragging = true;
                self.last_centroid = centroid;
                true
            }
            (true, true) => {
                if let (Some((px, py)), Some((cx, cy))) = (self.last_centroid, centroid) {
                    let (dx, dy) = (cx - px, cy - py);
                    if dx.abs() + dy.abs() >= MOVE_THRESHOLD {
                        inject_move(
                            (dx * self.sensitivity) as i32,
                            (dy * self.sensitivity) as i32,
                        );
                        self.last_centroid = centroid;
                        return true;
                    }
                }
                false
            }
            (false, true) => {
                inject_left(false);
                self.dragging = false;
                self.last_centroid = None;
                true
            }
            (false, false) => false,
        }
    }
}

fn centroid(contacts: &[&Contact]) -> Option<(f32, f32)> {
    if contacts.is_empty() {
        return None;
    }
    let n = contacts.len() as f32;
    let (sx, sy) = contacts
        .iter()
        .fold((0.0f32, 0.0f32), |(ax, ay), c| (ax + c.x, ay + c.y));
    Some((sx / n, sy / n))
}

/// Shared per-window state, stashed behind GWLP_USERDATA.
struct State {
    drag: DragState,
    clock: Clock,
    /// Preparsed HID descriptor per device handle (parsing is descriptor-driven,
    /// so we fetch it once and reuse it for every report).
    preparsed: HashMap<isize, Vec<u8>>,
    trace: bool,
}

fn main() {
    let sensitivity = std::env::var("TEMPORA_SENSITIVITY")
        .ok()
        .and_then(|v| v.parse::<f32>().ok())
        .unwrap_or(DEFAULT_SENSITIVITY);
    let trace = std::env::var("TEMPORA_TRACE").is_ok();

    let state = Box::new(State {
        drag: DragState::new(sensitivity),
        clock: Clock::new(),
        preparsed: HashMap::new(),
        trace,
    });

    unsafe {
        let hinstance = GetModuleHandleW(null());
        let class_name = wide("TemporaTouchWindow");

        let wc = WNDCLASSW {
            style: 0,
            lpfnWndProc: Some(wndproc),
            cbClsExtra: 0,
            cbWndExtra: 0,
            hInstance: hinstance,
            hIcon: null_mut(),
            hCursor: null_mut(),
            hbrBackground: null_mut(),
            lpszMenuName: null(),
            lpszClassName: class_name.as_ptr(),
        };
        RegisterClassW(&wc);

        let hwnd = CreateWindowExW(
            0,
            class_name.as_ptr(),
            wide("tempora").as_ptr(),
            0,
            0,
            0,
            0,
            0,
            HWND_MESSAGE,
            null_mut(),
            hinstance,
            null(),
        );
        if hwnd.is_null() {
            eprintln!("tempora: failed to create message window");
            return;
        }

        // Hand the window a raw pointer to our heap state.
        SetWindowLongPtrW(hwnd, GWLP_USERDATA, Box::into_raw(state) as isize);

        let rid = RAWINPUTDEVICE {
            usUsagePage: PAGE_DIGITIZER,
            usUsage: 0x05, // touchpad
            dwFlags: RIDEV_INPUTSINK,
            hwndTarget: hwnd,
        };
        if RegisterRawInputDevices(&rid, 1, size_of::<RAWINPUTDEVICE>() as u32) == 0 {
            eprintln!("tempora: RegisterRawInputDevices failed");
            return;
        }

        eprintln!(
            "tempora: running (sensitivity={sensitivity}). \
             Set Settings > Touchpad > Three-finger gestures to \"Nothing\" first."
        );

        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
}

unsafe extern "system" fn wndproc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    if msg == WM_INPUT {
        let state = unsafe { GetWindowLongPtrW(hwnd, GWLP_USERDATA) } as *mut State;
        if !state.is_null() {
            handle_raw_input(unsafe { &mut *state }, lparam);
        }
    }
    // WM_INPUT still needs DefWindowProc so the system can clean up.
    unsafe { DefWindowProcW(hwnd, msg, wparam, lparam) }
}

fn handle_raw_input(state: &mut State, lparam: LPARAM) {
    let t0 = state.clock.now_ns();
    let handle = lparam as HRAWINPUT;

    unsafe {
        // Size, then fetch.
        let mut size = 0u32;
        GetRawInputData(
            handle,
            RID_INPUT,
            null_mut(),
            &mut size,
            size_of::<RAWINPUTHEADER>() as u32,
        );
        if size == 0 {
            return;
        }
        let mut buf = vec![0u8; size as usize];
        let got = GetRawInputData(
            handle,
            RID_INPUT,
            buf.as_mut_ptr() as *mut c_void,
            &mut size,
            size_of::<RAWINPUTHEADER>() as u32,
        );
        if got == u32::MAX || got == 0 {
            return;
        }

        let raw = &*(buf.as_ptr() as *const RAWINPUT);
        if raw.header.dwType != RIM_TYPEHID {
            return;
        }

        let device = raw.header.hDevice as isize;
        let preparsed: isize = match preparsed_for(state, raw.header.hDevice) {
            Some(p) => p,
            None => return,
        };

        let hid = &raw.data.hid;
        let report_size = hid.dwSizeHid as usize;
        let report_count = hid.dwCount as usize;
        if report_size == 0 || report_count == 0 {
            return;
        }
        let base = hid.bRawData.as_ptr();

        let mut produced = false;
        for i in 0..report_count {
            let report = base.add(i * report_size) as *mut u8;
            let contacts = parse_contacts(preparsed, report, report_size as u32);
            if !contacts.is_empty() {
                produced |= state.drag.on_frame(&contacts);
            }
        }

        if state.trace {
            let t1 = state.clock.now_ns();
            eprintln!(
                "tempora: dev={device} reports={report_count} overhead={}ns produced={produced}",
                t1 - t0
            );
        }
    }
}

/// Fetch and cache the preparsed HID descriptor for a device. Returns a pointer
/// into the cached buffer (valid as long as `state.preparsed` keeps the entry).
fn preparsed_for(state: &mut State, device: HANDLE) -> Option<isize> {
    let key = device as isize;
    if !state.preparsed.contains_key(&key) {
        unsafe {
            let mut size = 0u32;
            GetRawInputDeviceInfoW(device, RIDI_PREPARSEDDATA, null_mut(), &mut size);
            if size == 0 {
                return None;
            }
            let mut buf = vec![0u8; size as usize];
            let got =
                GetRawInputDeviceInfoW(device, RIDI_PREPARSEDDATA, buf.as_mut_ptr() as *mut c_void, &mut size);
            if got == u32::MAX {
                return None;
            }
            state.preparsed.insert(key, buf);
        }
    }
    state.preparsed.get_mut(&key).map(|b| b.as_mut_ptr() as isize)
}

/// Parse one HID report into contacts using the descriptor-driven HidP API.
/// We locate each finger by the link collection that owns an X value, then read
/// X/Y and whether the tip switch is on for that collection.
fn parse_contacts(preparsed: isize, report: *mut u8, report_len: u32) -> Vec<Contact> {
    unsafe {
        let mut caps: HIDP_CAPS = std::mem::zeroed();
        if HidP_GetCaps(preparsed, &mut caps) != HIDP_STATUS_SUCCESS {
            return Vec::new();
        }

        let mut count = caps.NumberInputValueCaps;
        if count == 0 {
            return Vec::new();
        }
        let mut value_caps: Vec<HIDP_VALUE_CAPS> = vec![std::mem::zeroed(); count as usize];
        if HidP_GetValueCaps(HidP_Input, value_caps.as_mut_ptr(), &mut count, preparsed)
            != HIDP_STATUS_SUCCESS
        {
            return Vec::new();
        }

        // Link collections that expose an X axis == one per finger.
        let mut collections: Vec<u16> = Vec::new();
        for cap in &value_caps[..count as usize] {
            if cap.UsagePage == PAGE_GENERIC_DESKTOP {
                let usage = cap.Anonymous.NotRange.Usage;
                if usage == USAGE_X && !collections.contains(&cap.LinkCollection) {
                    collections.push(cap.LinkCollection);
                }
            }
        }

        let mut contacts = Vec::with_capacity(collections.len());
        for &lc in &collections {
            let mut x = 0u32;
            let mut y = 0u32;
            HidP_GetUsageValue(
                HidP_Input,
                PAGE_GENERIC_DESKTOP,
                lc,
                USAGE_X,
                &mut x,
                preparsed,
                report,
                report_len,
            );
            HidP_GetUsageValue(
                HidP_Input,
                PAGE_GENERIC_DESKTOP,
                lc,
                USAGE_Y,
                &mut y,
                preparsed,
                report,
                report_len,
            );

            // Tip switch lives on the digitizer page for this collection.
            let mut usages = [0u16; 16];
            let mut usages_len = usages.len() as u32;
            let st = HidP_GetUsages(
                HidP_Input,
                PAGE_DIGITIZER,
                lc,
                usages.as_mut_ptr(),
                &mut usages_len,
                preparsed,
                report,
                report_len,
            );
            let tip_down = st == HIDP_STATUS_SUCCESS
                && usages[..usages_len as usize].contains(&USAGE_TIP_SWITCH);

            contacts.push(Contact {
                x: x as f32,
                y: y as f32,
                tip_down,
            });
        }
        contacts
    }
}

fn inject_left(down: bool) {
    let flags = if down {
        MOUSEEVENTF_LEFTDOWN
    } else {
        MOUSEEVENTF_LEFTUP
    };
    send_mouse(0, 0, flags);
}

fn inject_move(dx: i32, dy: i32) {
    send_mouse(dx, dy, MOUSEEVENTF_MOVE);
}

fn send_mouse(dx: i32, dy: i32, flags: u32) {
    let mut input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx,
                dy,
                mouseData: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    unsafe {
        SendInput(1, &mut input, size_of::<INPUT>() as i32);
    }
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}
