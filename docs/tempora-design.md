# tempora — 设计方案与代码标准

> Mac 式「三指拖拽」在 Windows 精密触控板上的原生实现。
> 本文是自包含规格:目标、架构、`windows-sys` 踩坑、HID 细节、状态机、代码规范、完整源码、路线图。拿着它可以从零重写。

---

## 1. 目标 / 非目标

### 1.1 要做的
复刻 macOS 辅助功能里的「三指拖移(Three-finger drag)」:它**不是手势,是鼠标左键的替身**。

- 三指落到触控板 = 按住鼠标左键
- 三指移动 = 拖动(移窗口 / 选文字 / 拖文件)
- 三指抬起 = 松开左键

### 1.2 关于「纳秒级」的事实(必须先对齐)
**端到端响应做不到纳秒级,这是硬件物理上限,与代码无关。**

- 触控板是 HID 设备,报告率一般 ~125Hz(约 8ms 一帧),好的精密触控板可到 1ms。手指动作必须等下一帧 HID 报告才到达,这段延迟谁都绕不开。
- 代码能且应当做到的:
  1. **时间戳用纳秒**(`QueryPerformanceCounter`,亚微秒精度)。
  2. **热路径零锁、基本零分配**,把我们自己加在那 1–8ms 之上的开销压到**微秒级**且可观测。
  3. (进阶,本版不做)用最近两帧质心速度做**外推/预测**,抵消一部分帧间隔。

> 一句话:目标是「硬件帧一到,微秒内合成鼠标动作 + 全程纳秒时间戳可观测」。

### 1.3 非目标(本版不做)
- 双指捏合缩放、其它多指手势。
- GUI 设置界面 / 托盘。
- 开机自启、与 Electron 主进程的生命周期托管。
- 跨平台(仅 Windows 精密触控板)。

---

## 2. 架构总览

```
触控板 HID 设备 (UsagePage 0x0D / Usage 0x05 = TouchPad)
        │  RegisterRawInputDevices(RIDEV_INPUTSINK)
        ▼
message-only 窗口 (HWND_MESSAGE，无 UI)  ──► WM_INPUT
        │  GetRawInputData(RID_INPUT)
        ▼
RAWINPUT (dwType == RIM_TYPEHID)
        │  每个 device 的 preparsed 描述符缓存一次
        ▼
parse_contacts()  ── HidP_* 描述符驱动解析 ──►  Vec<Contact{ x, y, tip_down }>
        │
        ▼
DragState::on_frame()  ── 三指↔拖拽状态机 (质心相对位移)
        │
        ▼
SendInput()  ──►  MOUSEEVENTF_LEFTDOWN / _MOVE / _LEFTUP
```

### 2.1 为什么是独立进程,而不是塞进现有 COM DLL
现有 `crates/gyenbox-shell` 是被 explorer.exe 加载的图标叠加 **COM DLL**,**没有窗口、没有消息循环**。三指拖拽必须有一个常驻、能收 `WM_INPUT` 的进程。所以:

- **新建独立 bin crate `crates/tempora`**(本方案)。HID 解析 + `SendInput` 在 Rust 里最顺手,职责单一,崩了不拖累同步。
- 不折进 Electron 主进程:Node 没有原生 HID 解析,要么写 N-API,要么 spawn Rust 子进程——绕回独立 bin。后续工程化时由 Electron 主进程 `spawn` 并托管 tempora 生命周期即可。

---

## 3. 关键技术决策 & `windows-sys` 0.61 踩坑

> 这些是已经用 `cargo build` 验证过的事实,Codex 不必再踩一遍。

| 事项 | 结论 |
|---|---|
| crate | `windows-sys = "0.61.2"`,edition 2024,Rust 1.91 |
| `PHIDP_PREPARSED_DATA` 类型 | **是 `isize`,不是指针**。所有 `HidP_*` 的 preparsed 参数传 `isize`(把缓存 buffer 的 `as_mut_ptr() as isize`)。 |
| `WNDCLASSW` / `RegisterClassW` | 被 gate 在 **`Win32_Graphics_Gdi`** feature 后面,必须开启,否则 import 失败。 |
| `HIDP_VALUE_CAPS` 的 Usage 字段 | 在匿名联合里:`cap.Anonymous.NotRange.Usage`(假设非 Range;X/Y 通常是 NotRange)。 |
| `HWND_MESSAGE` | 未直接导出,自定义 `const HWND_MESSAGE: HWND = -3isize as HWND;` |
| `WM_INPUT` 处理 | 处理完仍要调 `DefWindowProcW`,让系统做清理。 |
| Raw Input 取数据 | 先 `GetRawInputData(.., null, &mut size, ..)` 拿 size,再取;`GetRawInputDeviceInfoW(RIDI_PREPARSEDDATA)` 同理。两者失败返回 `u32::MAX`。 |
| HID 报告布局 | **不要手撸字节偏移**。用 `HidP_GetCaps` → `HidP_GetValueCaps` → `HidP_GetUsageValue`/`HidP_GetUsages` 描述符驱动解析,才能跨设备通用。 |
| `HIDP_STATUS_SUCCESS` | `0x0011_0000`(常量需手写,windows-sys 未必导出友好名)。 |

### 3.1 所需 `windows-sys` features
```toml
"Win32_Foundation",
"Win32_UI_Input",                    # RAWINPUT / RegisterRawInputDevices / GetRawInputData
"Win32_UI_Input_KeyboardAndMouse",   # SendInput / MOUSEEVENTF_* / INPUT / MOUSEINPUT
"Win32_UI_WindowsAndMessaging",      # 消息循环 + 窗口 + GWLP_USERDATA
"Win32_Graphics_Gdi",                # WNDCLASSW / RegisterClassW 的 gate
"Win32_Devices_HumanInterfaceDevice",# HidP_*
"Win32_System_LibraryLoader",        # GetModuleHandleW
"Win32_System_Performance",          # QueryPerformanceCounter/Frequency
```

---

## 4. HID 解析规格

精密触控板每帧 HID 报告里,**每根手指是一个 link collection**。解析步骤:

1. `HidP_GetCaps` → `HIDP_CAPS`(拿 `NumberInputValueCaps`)。
2. `HidP_GetValueCaps(HidP_Input, ...)` → value caps 数组。
3. 扫 value caps:凡是 `UsagePage == 0x01`(Generic Desktop)且 `Usage == 0x30`(X)的,其 `LinkCollection` 就代表一根手指,去重收集。
4. 对每个 link collection:
   - `HidP_GetUsageValue(.., 0x01, lc, 0x30/0x31, ..)` 读 X / Y。
   - `HidP_GetUsages(.., 0x0D, lc, ..)` 读该 collection 当前「on」的 digitizer usage,列表里含 `0x42`(Tip Switch)即这根手指**触下**。
5. 产出 `Vec<Contact { x, y, tip_down }>`。

涉及的 usage 常量:

| 名称 | 值 |
|---|---|
| Generic Desktop page | `0x01` |
| X / Y | `0x30` / `0x31` |
| Digitizer page | `0x0D` |
| TouchPad (top-level usage) | `0x05` |
| Tip Switch | `0x42` |
| Contact Count(可选交叉校验) | `0x54` |
| Contact Identifier(可选) | `0x51` |

---

## 5. 拖拽状态机规格

输入:每帧 `&[Contact]`。计算 `down = tip_down 的数量`,`centroid = down 接触点的质心`。

| `down==3` | 当前在拖? | 动作 |
|---|---|---|
| 是 | 否 | `SendInput(LEFTDOWN)`;`dragging=true`;记 `last_centroid` |
| 是 | 是 | `Δ = centroid - last_centroid`;若 `|Δx|+|Δy| ≥ MOVE_THRESHOLD` → `SendInput(MOVE, Δ*sensitivity)`;更新 `last_centroid` |
| 否 | 是 | `SendInput(LEFTUP)`;`dragging=false`;清 `last_centroid` |
| 否 | 否 | 无 |

参数:
- `MOVE_THRESHOLD`(默认 `1.0` 逻辑单位):去抖,避免三指刚落时误移。
- `sensitivity`(默认 `1.0`,环境变量 `TEMPORA_SENSITIVITY` 覆盖):逻辑单位→像素增益。**这是盲调常量**,见路线图。

---

## 6. 代码标准 / 约定

写本 crate(及 Codex 重写时)遵守:

1. **Edition 2024 unsafe 规矩**:`unsafe extern "system" fn` 的函数体内调用 unsafe API 仍需显式 `unsafe { }` 块(`unsafe_op_in_unsafe_fn` 默认 warn)。不要靠函数签名的 unsafe 兜底。
2. **`#![cfg(windows)]`** 置顶,非 Windows 平台直接空编译,不污染 workspace 其它 crate 的跨平台构建。
3. **FFI 类型零猜测**:遇到签名不确定,先写后 `cargo check`,以编译器报的真实签名为准(尤其 `isize` vs 指针、匿名联合字段名)。不臆造。
4. **热路径(`WM_INPUT` → `SendInput`)**:零锁;除每设备一次的 preparsed 缓存外避免堆分配;不打印(除非 `TEMPORA_TRACE`)。
5. **每个非平凡函数 / 常量配一行「为什么」注释**,解释意图而非复述代码(参考现有源码注释密度)。
6. **状态机纯函数化**:`DragState::on_frame` 只读 `&[Contact]`、只发 `SendInput`、返回是否产生输出,便于将来单测。
7. **错误处理**:FFI 失败(返回 `u32::MAX` / 非 `HIDP_STATUS_SUCCESS` / size 0)一律早 return,不 panic,不阻塞消息循环。
8. **可观测性**:纳秒时间戳走 `QueryPerformanceCounter`;诊断输出走 `eprintln!` 且由 `TEMPORA_TRACE` 环境变量 gate。
9. **命名**:HID/Win32 常量用全大写贴原始名(`USAGE_TIP_SWITCH`、`RIM_TYPEHID`),便于对照 MSDN。

---

## 7. 完整源码

### 7.1 `crates/tempora/Cargo.toml`
```toml
[package]
name = "tempora"
version = "0.1.0"
edition = "2024"

[[bin]]
name = "tempora"
path = "src/main.rs"

[dependencies]
windows-sys = { version = "0.61.2", features = [
  "Win32_Foundation",
  "Win32_UI_Input",
  "Win32_UI_Input_KeyboardAndMouse",
  "Win32_UI_WindowsAndMessaging",
  "Win32_Graphics_Gdi",
  "Win32_Devices_HumanInterfaceDevice",
  "Win32_System_LibraryLoader",
  "Win32_System_Performance",
] }
```

并在 workspace 根 `Cargo.toml` 的 `members` 加入 `"crates/tempora"`。

### 7.2 `crates/tempora/src/main.rs`
```rust
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
```

---

## 8. 构建 / 运行 / 调试

```powershell
# 构建
cargo build -p tempora

# 运行前:关掉系统三指手势,否则一边拖一边切窗口
#   设置 → 蓝牙和设备 → 触摸板 → 三指手势 → 设为「无」

# 运行
cargo run -p tempora

# 调灵敏度(拖太慢调大)+ 打印每帧纳秒级开销
$env:TEMPORA_SENSITIVITY = "1.5"
$env:TEMPORA_TRACE = "1"
cargo run -p tempora
```

预期:三指放上 = 按住左键,移动 = 拖,抬起 = 松开。`TEMPORA_TRACE` 打印的是**我们自己**在每个 HID 帧上加的纳秒开销(硬件 1–8ms 帧间隔不在内)。

---

## 9. 已知限制 / 路线图

按「决定手感」优先级排:

1. **粘滞松手(高优先)**:当前 `<3` 指立刻 `LEFTUP`。Mac 有 ~100ms 宽容窗口,避免拖到一半手指微抬就断。难点:手指抬起后不再有 HID 帧,需要 `SetTimer` 计时器在静默后才真正 `LEFTUP`。
2. **灵敏度校准(高优先)**:`sensitivity` 现在是盲调常量。更准的做法是从 value caps 读 `PhysicalMax`/`LogicalMax` 归一化为「物理位移」,再乘屏幕 DPI,而不是手调。
3. **设备过滤**:目前对所有 touchpad usage 注册。多触控板 / 外接设备场景应按设备名或 VID/PID 过滤。
4. **接触点稳定性**:用 Contact Identifier(`0x51`)跟踪同一根手指,避免某些设备上接触点重排导致质心跳变;Contact Count(`0x54`)可做交叉校验。
5. **预测/外推(进阶)**:用最近两帧质心速度外推,抵消部分帧间隔,逼近「纳秒级手感」的心理预期。
6. **工程化**:托盘 + 开机自启;或由 Electron 主进程 `spawn` 并托管生命周期(随 GyenBox 桌面端启动/退出)。
7. **UIPI 权限**:`SendInput` 注入到更高完整性级别窗口(管理员窗口)会被拦。要全局可用需相应 manifest/权限。
8. **单元测试**:`DragState::on_frame` 已纯函数化,可针对「序列化 Contact 帧 → 期望 SendInput 调用」做表驱动测试(需把 `inject_*` 抽象成可注入的 trait/回调)。
