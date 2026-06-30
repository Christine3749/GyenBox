#![cfg_attr(all(windows, feature = "embed-installer"), windows_subsystem = "windows")]

#[cfg(all(windows, feature = "embed-installer"))]
mod app {
    use std::env;
    use std::ffi::OsStr;
    use std::fs;
    use std::io::Write;
    use std::mem::{size_of, zeroed};
    use std::os::windows::ffi::OsStrExt;
    use std::os::windows::process::CommandExt;
    use std::path::{Path, PathBuf};
    use std::process::Command;
    use std::ptr::null_mut;
    use std::sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex, OnceLock};
    use std::thread;
    use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

    use core::ffi::c_void;

    use windows_sys::Win32::Foundation::{HWND, LPARAM, LRESULT, RECT, WPARAM};
    use windows_sys::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE};
    use windows_sys::Win32::UI::HiDpi::{
        AdjustWindowRectExForDpi, GetDpiForSystem, SetProcessDpiAwarenessContext,
        DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2,
    };
    use windows_sys::Win32::Graphics::Gdi::{
        BeginPaint, BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, CreateFontW,
        CreatePen, CreateSolidBrush, DeleteDC, DeleteObject, DrawTextW, EndPaint,
        FillRect, InvalidateRect, RoundRect, SelectObject, SetBkMode,
        SetTextColor, UpdateWindow, HBRUSH, HDC, PAINTSTRUCT, DT_CENTER, DT_NOCLIP,
        DT_SINGLELINE, DT_VCENTER, DT_WORDBREAK, PS_SOLID, SRCCOPY, TRANSPARENT,
    };
    use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DefWindowProcW, DestroyWindow, DispatchMessageW, DrawIconEx,
        GetMessageW, GetWindowRect, LoadCursorW, LoadImageW, PostMessageW, RegisterClassW, SendMessageW,
        SystemParametersInfoW, KillTimer, SetTimer, ShowWindow, TranslateMessage, CS_HREDRAW, CS_VREDRAW,
        CW_USEDEFAULT, DI_NORMAL, HICON, ICON_BIG, ICON_SMALL, IDC_ARROW, IMAGE_ICON,
        LR_LOADFROMFILE, MSG, SPI_GETWORKAREA, SW_SHOW, WM_CLOSE, WM_DESTROY,
        WM_ENTERSIZEMOVE, WM_EXITSIZEMOVE, WM_LBUTTONDOWN, WM_PAINT, WM_SETICON, WM_TIMER,
        WNDCLASSW, WS_CAPTION, WS_MINIMIZEBOX,
        WS_OVERLAPPED, WS_SYSMENU,
    };

    const INNER_INSTALLER: &[u8] = include_bytes!(env!("GYENBOX_INNER_INSTALLER"));
    const APP_ICON: &[u8] = include_bytes!("../../../apps/desktop/build/icon.ico");
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    const TIMER_PROGRESS: usize = 1;
    const WM_BOOTSTRAP_DONE: u32 = 0x8000 + 1;
    const WM_BOOTSTRAP_FAILED: u32 = 0x8000 + 2;
    const HANDOFF_PROGRESS: f32 = 55.0;

    static STATE: OnceLock<Arc<Mutex<BootstrapState>>> = OnceLock::new();
    // Per-monitor DPI scale (1.0 = 96 DPI). Set once at startup so the GDI shell
    // renders at the same physical size and crispness as the Electron window,
    // otherwise the handoff jumps from a blurry/smaller frame to a crisp one.
    static SCALE: OnceLock<f32> = OnceLock::new();
    static ICON_PATH: OnceLock<PathBuf> = OnceLock::new();
    static LOGO_ICON: OnceLock<isize> = OnceLock::new();
    static WINDOW_MOVING: AtomicBool = AtomicBool::new(false);

    fn scale() -> f32 {
        *SCALE.get().unwrap_or(&1.0)
    }

    fn sc(value: i32) -> i32 {
        (value as f32 * scale()).round() as i32
    }

    fn scale_rect(rect: RECT) -> RECT {
        RECT {
            left: sc(rect.left),
            top: sc(rect.top),
            right: sc(rect.right),
            bottom: sc(rect.bottom),
        }
    }

    #[derive(Clone, Copy, PartialEq, Eq)]
    enum Language {
        En,
        Zh,
    }

    impl Language {
        fn code(self) -> &'static str {
            match self {
                Self::En => "en",
                Self::Zh => "zh",
            }
        }
    }

    #[derive(Clone)]
    struct BootstrapState {
        progress: f32,
        target: f32,
        title: String,
        lead: String,
        status: String,
        failed: Option<String>,
        done: bool,
        dirty: bool,
        lang: Language,
    }

    impl BootstrapState {
        fn new() -> Self {
            Self {
                progress: 0.0,
                target: 0.0,
                title: "Preparing your GyenBox space".to_string(),
                lead: "Gather what matters into your own protected folder.".to_string(),
                status: "Opening the protected installer...".to_string(),
                failed: None,
                done: false,
                dirty: true,
                lang: Language::Zh,
            }
        }
    }

    pub fn run() {
        unsafe {
            // Must run before any window is created so the shell is crisp on
            // high-DPI displays and hands off seamlessly to the DPI-aware Electron
            // window instead of jumping from blurry to sharp.
            SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);

            log_bootstrap("start", &[("version", env!("CARGO_PKG_VERSION").to_string())]);
            let state = Arc::new(Mutex::new(BootstrapState::new()));
            let _ = STATE.set(state.clone());
            write_setup_language(Language::Zh);
            if let Ok(path) = write_app_icon() {
                let _ = ICON_PATH.set(path);
            }

            let dpi = GetDpiForSystem();
            let scale = (dpi as f32 / 96.0).max(1.0);
            let _ = SCALE.set(scale);

            let class_name = wide("GyenBoxBootstrapperWindow");
            let title = wide("GyenBox Setup");
            let hinstance = GetModuleHandleW(null_mut());
            let wc = WNDCLASSW {
                style: CS_HREDRAW | CS_VREDRAW,
                lpfnWndProc: Some(wnd_proc),
                hInstance: hinstance,
                hCursor: LoadCursorW(null_mut(), IDC_ARROW),
                lpszClassName: class_name.as_ptr(),
                ..zeroed()
            };
            RegisterClassW(&wc);

            // Size the *client* area to 1000x640 logical px scaled to this DPI, so
            // it matches the Electron Setup window (1000x640 DIPs) physically.
            let style = WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX;
            let client_w = (1000.0 * scale).round() as i32;
            let client_h = (640.0 * scale).round() as i32;
            let mut frame = RECT { left: 0, top: 0, right: client_w, bottom: client_h };
            AdjustWindowRectExForDpi(&mut frame, style, 0, 0, dpi);
            let win_w = frame.right - frame.left;
            let win_h = frame.bottom - frame.top;

            // Center on the work area (excludes the taskbar) so it lands exactly
            // where Electron's work-area-centered window will appear.
            let mut work_area: RECT = zeroed();
            let (x, y) = if SystemParametersInfoW(
                SPI_GETWORKAREA,
                0,
                &mut work_area as *mut RECT as *mut c_void,
                0,
            ) != 0
            {
                (
                    work_area.left + ((work_area.right - work_area.left) - win_w) / 2,
                    work_area.top + ((work_area.bottom - work_area.top) - win_h) / 2,
                )
            } else {
                (CW_USEDEFAULT, CW_USEDEFAULT)
            };

            let hwnd = CreateWindowExW(
                0,
                class_name.as_ptr(),
                title.as_ptr(),
                style,
                x,
                y,
                win_w,
                win_h,
                null_mut(),
                null_mut(),
                hinstance,
                null_mut(),
            );

            if hwnd.is_null() {
                log_bootstrap("window create failed", &[]);
                return;
            }
            log_bootstrap("window created", &[("x", x.to_string()), ("y", y.to_string()), ("width", win_w.to_string()), ("height", win_h.to_string())]);

            apply_window_chrome(hwnd);
            SetTimer(hwnd, TIMER_PROGRESS, 33, None);
            ShowWindow(hwnd, SW_SHOW);
            UpdateWindow(hwnd);

            let hwnd_value = hwnd as isize;
            thread::spawn(move || run_installer(hwnd_value, state));

            let mut msg: MSG = zeroed();
            while GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        }
    }

    fn run_installer(hwnd_value: isize, state: Arc<Mutex<BootstrapState>>) {
        let dir = bootstrap_dir();
        log_bootstrap("installer thread start", &[("bootstrap_dir", dir.display().to_string())]);
        let ready_flag = dir.join("electron-ready");
        let show_flag = dir.join("electron-show");
        let visible_flag = dir.join("electron-visible");

        let result = (|| -> Result<(), String> {
            set_state(&state, 4.0, "Installing GyenBox", "The app is installed separately from your sync folder.", "Preparing installer payload...");
            let _ = fs::remove_file(&ready_flag); // drop any stale handoff flag
            let _ = fs::remove_file(&show_flag);
            let _ = fs::remove_file(&visible_flag);
            write_setup_language(current_language());
            let inner = write_inner_installer(&dir)?;
            log_bootstrap("inner installer written", &[("path", inner.display().to_string()), ("bytes", INNER_INSTALLER.len().to_string())]);

            set_state(&state, HANDOFF_PROGRESS, "Installing GyenBox", "The app is installed separately from your sync folder.", "Copying the desktop app files...");
            let status = Command::new(&inner)
                .arg("/S")
                .creation_flags(CREATE_NO_WINDOW)
                .status()
                .map_err(|error| format!("Could not start the original installer: {error}"))?;

            log_bootstrap("inner installer exited", &[("status", format!("{status}"))]);
            if !status.success() {
                return Err(format!("Original installer exited with {status}."));
            }

            smooth_progress_to(&state, HANDOFF_PROGRESS, "Choose your GyenBox folder", "The setup window will continue from the same position.", "Preparing your space...");
            launch_installed_app(&dir)?;
            log_bootstrap("electron launch requested", &[("bootstrap_dir", dir.display().to_string())]);

            // Keep this window covering the screen until the Electron setup page
            // has rendered offscreen, then explicitly allow it to show. Electron
            // shows inactive and writes `electron-visible`; closing this shell then
            // reveals the already-created window instead of making Windows pop a
            // freshly focused window over the user.
            set_state(&state, HANDOFF_PROGRESS, "Choose your GyenBox folder", "The setup window will continue from the same position.", "Waiting for the setup window...");
            let ready_seen = wait_for_flag(&ready_flag, Duration::from_secs(20));
            log_bootstrap("electron ready wait finished", &[("seen", ready_seen.to_string()), ("flag", ready_flag.display().to_string())]);
            // Tell Electron exactly where this shell currently sits (in DIPs), so it
            // appears at the same spot even if the user dragged the window, instead
            // of teleporting back to the work-area center at the handoff.
            write_shell_bounds(hwnd_value, &dir.join("shell-bounds"));
            let _ = fs::write(&show_flag, format!("{:?}", Instant::now()));
            let visible_seen = wait_for_flag(&visible_flag, Duration::from_secs(5));
            log_bootstrap("electron visible wait finished", &[("seen", visible_seen.to_string()), ("flag", visible_flag.display().to_string())]);

            set_state(&state, HANDOFF_PROGRESS, "Choose your GyenBox folder", "The setup window will continue from the same position.", "Opening GyenBox...");
            {
                let mut guard = state.lock().map_err(|_| "State lock poisoned.".to_string())?;
                guard.done = true;
                guard.dirty = true;
            }
            let _ = fs::remove_file(&inner); // tidy the ~100MB payload from %TEMP%
            Ok(())
        })();

        match result {
            Ok(()) => unsafe {
                log_bootstrap("bootstrap ok", &[]);
                PostMessageW(hwnd_value as HWND, WM_BOOTSTRAP_DONE, 0, 0);
                // Electron is already painted on top; close almost immediately so
                // the swap is invisible while the visible progress remains at 55%.
                thread::sleep(Duration::from_millis(60));
                PostMessageW(hwnd_value as HWND, WM_CLOSE, 0, 0);
            },
            Err(message) => {
                log_bootstrap("bootstrap failed", &[("error", message.clone())]);
                if let Ok(mut guard) = state.lock() {
                    guard.failed = Some(message);
                    guard.title = "Setup needs attention".to_string();
                    guard.lead = "The original installer did not finish cleanly.".to_string();
                    guard.status = "Close this window and try again.".to_string();
                    guard.target = guard.progress.max(12.0);
                    guard.dirty = true;
                }
                unsafe { PostMessageW(hwnd_value as HWND, WM_BOOTSTRAP_FAILED, 0, 0) };
            }
        }
    }

    fn write_inner_installer(dir: &Path) -> Result<PathBuf, String> {
        fs::create_dir_all(dir).map_err(|error| format!("Could not create temp directory: {error}"))?;
        let path = dir.join("GyenBox-Setup-inner.exe");
        fs::write(&path, INNER_INSTALLER).map_err(|error| format!("Could not write inner installer: {error}"))?;
        Ok(path)
    }

    fn write_app_icon() -> Result<PathBuf, String> {
        let dir = env::temp_dir().join("GyenBoxBootstrapper");
        fs::create_dir_all(&dir).map_err(|error| format!("Could not create temp directory: {error}"))?;
        let path = dir.join("gyenbox.ico");
        fs::write(&path, APP_ICON).map_err(|error| format!("Could not write icon: {error}"))?;
        Ok(path)
    }

    fn apply_window_chrome(hwnd: HWND) {
        unsafe {
            let dark: i32 = 1;
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_USE_IMMERSIVE_DARK_MODE as u32,
                &dark as *const i32 as *const c_void,
                size_of::<i32>() as u32,
            );

            if let Some(icon) = load_icon(32) {
                SendMessageW(hwnd, WM_SETICON, ICON_BIG as WPARAM, icon as LPARAM);
            }
            if let Some(icon) = load_icon(16) {
                SendMessageW(hwnd, WM_SETICON, ICON_SMALL as WPARAM, icon as LPARAM);
            }
        }
    }

    fn load_icon(size: i32) -> Option<HICON> {
        let path = ICON_PATH.get()?;
        let wide_path = wide(&path.to_string_lossy());
        let handle = unsafe {
            LoadImageW(
                null_mut(),
                wide_path.as_ptr(),
                IMAGE_ICON,
                sc(size),
                sc(size),
                LR_LOADFROMFILE,
            )
        };
        if handle.is_null() { None } else { Some(handle as HICON) }
    }

    fn draw_app_icon(hdc: HDC, left: i32, top: i32, size: i32) {
        let icon = *LOGO_ICON.get_or_init(|| load_icon(size).map(|icon| icon as isize).unwrap_or_default());
        if icon == 0 {
            return;
        }
        unsafe {
            DrawIconEx(hdc, sc(left), sc(top), icon as HICON, sc(size), sc(size), 0, null_mut(), DI_NORMAL);
        }
    }

    fn bootstrap_dir() -> PathBuf {
        env::temp_dir().join("GyenBoxBootstrapper")
    }

    fn write_setup_language(language: Language) {
        let dir = bootstrap_dir();
        if fs::create_dir_all(&dir).is_ok() {
            let _ = fs::write(dir.join("setup-lang"), language.code());
        }
    }

    fn current_language() -> Language {
        STATE
            .get()
            .and_then(|state| state.lock().ok().map(|guard| guard.lang))
            .unwrap_or(Language::Zh)
    }

    fn log_bootstrap(message: &str, fields: &[(&str, String)]) {
        let Some(base) = env::var_os("LOCALAPPDATA") else { return };
        let dir = Path::new(&base).join("GyenBox").join("logs");
        if fs::create_dir_all(&dir).is_err() {
            return;
        }
        let path = dir.join("bootstrapper.log");
        if fs::metadata(&path).map(|m| m.len() >= 2 * 1024 * 1024).unwrap_or(false) {
            let rotated = dir.join("bootstrapper.log.1");
            let _ = fs::remove_file(&rotated);
            let _ = fs::rename(&path, rotated);
        }
        let mut line = format!("{} INFO [bootstrapper] {}", unix_millis(), sanitize_log(message));
        for (key, value) in fields {
            line.push(' ');
            line.push_str(key);
            line.push_str("=\"");
            line.push_str(&sanitize_log(value));
            line.push('"');
        }
        line.push('\n');
        if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(path) {
            let _ = file.write_all(line.as_bytes());
        }
    }

    fn unix_millis() -> u128 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default()
    }

    fn sanitize_log(value: &str) -> String {
        value
            .replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('\r', "\\r")
            .replace('\n', "\\n")
    }
    fn tr<'a>(language: Language, en: &'a str) -> &'a str {
        if language == Language::En {
            return en;
        }
        match en {
            "Preparing your GyenBox space" => "正在准备你的 GyenBox 空间",
            "Gather what matters into your own protected folder." => "把重要之物，收进属于你的受保护文件夹。",
            "Opening the protected installer..." => "正在打开受保护的安装器...",
            "local first sync" => "本地优先同步",
            "Install app" => "安装应用",
            "App files are installed separately." => "程序固定安装，文件夹稍后选择。",
            "Choose folder" => "选择文件夹",
            "Sync space stays separate from install path." => "同步空间与安装路径分离。",
            "Connect Windows" => "接入 Windows",
            "Explorer sidebar, badges, background sync." => "侧边栏入口、状态标记、后台同步。",
            "Confirm finish" => "完成确认",
            "Open the folder when you are ready." => "由你决定何时打开文件夹。",
            "Installing GyenBox" => "正在安装 GyenBox",
            "The app is installed separately from your sync folder." => "应用会固定安装到系统应用目录。同步文件夹稍后单独选择。",
            "Choose your GyenBox folder" => "选择 GyenBox 文件夹",
            "The setup window will continue from the same position." => "设置窗口会在同一位置继续。",
            "Install path and sync folder stay separate." => "安装路径和同步文件夹会保持分离。",
            "Installing GyenBox..." => "正在安装 GyenBox...",
            "Installing the app files in the background." => "正在后台安装应用文件。",
            "Preparing installer payload..." => "正在准备安装包...",
            "Copying the desktop app files..." => "正在复制桌面应用文件...",
            "Preparing your space..." => "正在准备你的空间...",
            "GyenBox Setup is opening in the same position." => "GyenBox 设置窗口会在同一位置接管。",
            "GyenBox Setup is ready to continue from here." => "GyenBox 设置已准备好从这里继续。",
            "Waiting for the setup window..." => "正在等待设置窗口...",
            "Opening GyenBox..." => "正在打开 GyenBox...",
            "Setup needs attention" => "设置需要处理",
            "The original installer did not finish cleanly." => "内部安装程序没有正常完成。",
            "Close this window and try again." => "关闭此窗口后重试。",
            "GYEN · PROTECTED SPACE" => "GYEN · 受保护的空间",
            "Gather Your Essential Nexus" => "汇聚你的核心空间",
            "Local folder" => "本地文件夹",
            "Your files stay on your device." => "文件先安放在你的设备上。",
            "Explorer sidebar" => "侧边栏入口",
            "Pin GyenBox for instant access." => "把 GyenBox 放到顺手的位置。",
            "Sync badges" => "同步标记",
            "See sync status at a glance." => "一眼看清每个文件的状态。",
            "Gyen is a sanctuary beyond the noise: a protected boundary for the work, memories, and promises you keep close." => "Gyen 是尘世之外的避难所：为珍贵的文件、记忆和承诺，划出一圈安静而受保护的边界。",
            "You can open your folder when setup is ready." => "准备完成后，你可以打开 GyenBox 文件夹。",
            "Why GyenBox?" => "为什么是 GyenBox?",
            _ => en,
        }
    }

    fn wait_for_flag(flag: &Path, timeout: Duration) -> bool {
        let start = Instant::now();
        while start.elapsed() < timeout {
            if flag.exists() {
                return true;
            }
            thread::sleep(Duration::from_millis(50));
        }
        false
    }

    // Record this shell's current top-left in DIPs so the Electron window can land
    // exactly where the shell is, even after the user drags it.
    fn write_shell_bounds(hwnd_value: isize, path: &Path) {
        unsafe {
            let mut rect: RECT = zeroed();
            if GetWindowRect(hwnd_value as HWND, &mut rect) != 0 {
                let s = scale().max(0.1);
                let x = (rect.left as f32 / s).round() as i32;
                let y = (rect.top as f32 / s).round() as i32;
                let _ = fs::write(path, format!("{x},{y}"));
            }
        }
    }

    fn launch_installed_app(handoff_dir: &Path) -> Result<(), String> {
        let local = env::var_os("LOCALAPPDATA").ok_or("LOCALAPPDATA is not set.".to_string())?;
        let candidates = [
            Path::new(&local).join("Programs").join("@gyenboxdesktop").join("GyenBox.exe"),
            Path::new(&local).join("Programs").join("GyenBox").join("GyenBox.exe"),
        ];

        for candidate in candidates {
            if candidate.exists() {
                // Tell GyenBox where to drop the `electron-ready` handoff flag so
                // this shell knows exactly when the Electron window is visible.
                log_bootstrap("launching installed app", &[("path", candidate.display().to_string())]);
                Command::new(&candidate)
                    .arg(format!("--initial-progress={}", HANDOFF_PROGRESS.round() as i32))
                    .arg(format!("--bootstrap-dir={}", handoff_dir.display()))
                    .arg(format!("--setup-lang={}", current_language().code()))
                    .env("GYENBOX_BOOTSTRAP_DIR", handoff_dir)
                    .env("GYENBOX_INITIAL_PROGRESS", format!("{}", HANDOFF_PROGRESS.round() as i32))
                    .env("GYENBOX_SETUP_LANG", current_language().code())
                    .spawn()
                    .map_err(|error| format!("Could not launch {}: {error}", candidate.display()))?;
                return Ok(());
            }
        }

        Err("Installed GyenBox.exe was not found.".to_string())
    }

    fn set_state(state: &Arc<Mutex<BootstrapState>>, target: f32, title: &str, lead: &str, status: &str) {
        if let Ok(mut guard) = state.lock() {
            guard.target = target;
            guard.title = title.to_string();
            guard.lead = lead.to_string();
            guard.status = status.to_string();
            guard.dirty = true;
        }
    }

    fn snap_state(state: &Arc<Mutex<BootstrapState>>, progress: f32, title: &str, lead: &str, status: &str) {
        if let Ok(mut guard) = state.lock() {
            guard.progress = progress;
            guard.target = progress;
            guard.title = title.to_string();
            guard.lead = lead.to_string();
            guard.status = status.to_string();
            guard.dirty = true;
        }
    }

    fn smooth_progress_to(state: &Arc<Mutex<BootstrapState>>, progress: f32, title: &str, lead: &str, status: &str) {
        let start_progress = if let Ok(mut guard) = state.lock() {
            guard.target = progress;
            guard.title = title.to_string();
            guard.lead = lead.to_string();
            guard.status = status.to_string();
            guard.dirty = true;
            guard.progress
        } else {
            return;
        };

        let distance = (progress - start_progress).max(0.0);
        if distance > 0.5 {
            let duration_ms = ((distance * 70.0).round() as u64).clamp(900, 3600);
            let started = Instant::now();
            let duration = Duration::from_millis(duration_ms);
            while started.elapsed() < duration {
                let t = (started.elapsed().as_secs_f32() / duration.as_secs_f32()).clamp(0.0, 1.0);
                let eased = t * t * (3.0 - 2.0 * t);
                if let Ok(mut guard) = state.lock() {
                    guard.progress = start_progress + distance * eased;
                    guard.target = progress;
                    guard.dirty = true;
                }
                thread::sleep(Duration::from_millis(33));
            }
        }

        snap_state(state, progress, title, lead, status);
    }

    unsafe extern "system" fn wnd_proc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        match msg {
            WM_TIMER => {
                if wparam == TIMER_PROGRESS && !WINDOW_MOVING.load(Ordering::Relaxed) && tick_progress() {
                    unsafe { InvalidateRect(hwnd, null_mut(), 0) };
                }
                0
            }
            WM_ENTERSIZEMOVE => {
                WINDOW_MOVING.store(true, Ordering::Relaxed);
                unsafe { KillTimer(hwnd, TIMER_PROGRESS) };
                0
            }
            WM_EXITSIZEMOVE => {
                WINDOW_MOVING.store(false, Ordering::Relaxed);
                unsafe { SetTimer(hwnd, TIMER_PROGRESS, 33, None) };
                unsafe { InvalidateRect(hwnd, null_mut(), 0) };
                0
            }
            WM_LBUTTONDOWN => {
                if handle_language_click(lparam) {
                    unsafe { InvalidateRect(hwnd, null_mut(), 0) };
                }
                0
            }
            WM_PAINT => {
                unsafe { paint(hwnd) };
                0
            }
            WM_BOOTSTRAP_DONE => {
                unsafe { InvalidateRect(hwnd, null_mut(), 0) };
                0
            }
            WM_BOOTSTRAP_FAILED => {
                unsafe { InvalidateRect(hwnd, null_mut(), 0) };
                0
            }
            WM_CLOSE => {
                unsafe { DestroyWindow(hwnd) };
                0
            }
            WM_DESTROY => {
                unsafe { windows_sys::Win32::UI::WindowsAndMessaging::PostQuitMessage(0) };
                0
            }
            _ => unsafe { DefWindowProcW(hwnd, msg, wparam, lparam) },
        }
    }

    fn handle_language_click(lparam: LPARAM) -> bool {
        let raw = lparam as i32;
        let x = ((raw as i16) as f32 / scale()).round() as i32;
        let y = (((raw >> 16) as i16) as f32 / scale()).round() as i32;
        if !(870..=954).contains(&x) || !(34..=66).contains(&y) {
            return false;
        }

        let next = if (874..=912).contains(&x) {
            Language::En
        } else if (914..=950).contains(&x) {
            Language::Zh
        } else {
            return false;
        };

        let Some(state) = STATE.get() else { return false; };
        let Ok(mut guard) = state.lock() else { return false; };
        if guard.lang == next {
            return false;
        }
        guard.lang = next;
        guard.dirty = true;
        drop(guard);
        write_setup_language(next);
        true
    }

    fn tick_progress() -> bool {
        let Some(state) = STATE.get() else { return false; };
        let Ok(mut guard) = state.lock() else { return false; };
        let mut changed = guard.dirty;
        guard.dirty = false;
        if guard.progress >= guard.target {
            return changed;
        }
        let before = guard.progress;
        let remaining = guard.target - guard.progress;
        let step = if guard.target >= HANDOFF_PROGRESS && guard.progress < HANDOFF_PROGRESS {
            (remaining * 0.006).max(0.035)
        } else {
            (remaining * 0.045).max(0.12)
        };
        guard.progress += step;
        if guard.progress > guard.target {
            guard.progress = guard.target;
        }
        changed |= (guard.progress - before).abs() > f32::EPSILON;
        changed
    }

    unsafe fn paint(hwnd: HWND) {
        let mut ps: PAINTSTRUCT = unsafe { zeroed() };
        let hdc = unsafe { BeginPaint(hwnd, &mut ps) };
        let width = sc(1000);
        let height = sc(640);

        let mem_dc = unsafe { CreateCompatibleDC(hdc) };
        if mem_dc.is_null() {
            draw_scene(hdc);
            unsafe { EndPaint(hwnd, &ps) };
            return;
        }

        let bitmap = unsafe { CreateCompatibleBitmap(hdc, width, height) };
        if bitmap.is_null() {
            unsafe { DeleteDC(mem_dc) };
            draw_scene(hdc);
            unsafe { EndPaint(hwnd, &ps) };
            return;
        }

        let old_bitmap = unsafe { SelectObject(mem_dc, bitmap) };
        draw_scene(mem_dc);
        unsafe {
            BitBlt(hdc, 0, 0, width, height, mem_dc, 0, 0, SRCCOPY);
            SelectObject(mem_dc, old_bitmap);
            DeleteObject(bitmap);
            DeleteDC(mem_dc);
            EndPaint(hwnd, &ps);
        }
    }

    fn draw_scene(hdc: HDC) {
        fill(hdc, RECT { left: 0, top: 0, right: 1000, bottom: 640 }, rgb(255, 255, 255));
        draw_rail(hdc);
        draw_main_panel(hdc);
    }

    fn draw_rail(hdc: HDC) {
        let lang = current_language();
        fill(hdc, RECT { left: 0, top: 0, right: 216, bottom: 640 }, rgb(250, 250, 248));
        fill(hdc, RECT { left: 215, top: 0, right: 216, bottom: 640 }, rgb(229, 229, 226));

        draw_app_icon(hdc, 28, 44, 42);
        draw_text(hdc, "GyenBox", RECT { left: 82, top: 42, right: 190, bottom: 66 }, rgb(17, 17, 17), 20, 720, DT_SINGLELINE | DT_VCENTER);
        draw_text(hdc, tr(lang, "local first sync"), RECT { left: 82, top: 68, right: 190, bottom: 88 }, rgb(112, 112, 112), 12, 520, DT_SINGLELINE | DT_VCENTER);

        setup_stage(hdc, 158, "01", tr(lang, "Install app"), tr(lang, "App files are installed separately."), "active");
        setup_stage(hdc, 228, "02", tr(lang, "Choose folder"), tr(lang, "Sync space stays separate from install path."), "pending");
        setup_stage(hdc, 298, "03", tr(lang, "Connect Windows"), tr(lang, "Explorer sidebar, badges, background sync."), "pending");
        setup_stage(hdc, 368, "04", tr(lang, "Confirm finish"), tr(lang, "Open the folder when you are ready."), "pending");
    }

    fn setup_stage(hdc: HDC, top: i32, number: &str, title: &str, lead: &str, state: &str) {
        let active = state == "active";
        let done = state == "done";
        let text_color = if active { rgb(17, 17, 17) } else if done { rgb(60, 60, 60) } else { rgb(168, 168, 168) };
        let number_fill = if active { rgb(17, 17, 17) } else { rgb(250, 250, 248) };
        let number_outline = if active { rgb(17, 17, 17) } else { rgb(213, 213, 208) };
        let number_color = if active { rgb(255, 255, 255) } else if done { rgb(22, 132, 91) } else { text_color };

        rounded_fill_outline(hdc, RECT { left: 28, top, right: 56, bottom: top + 28 }, number_fill, number_outline, 14);
        draw_text(hdc, number, RECT { left: 28, top, right: 56, bottom: top + 28 }, number_color, 11, 600, DT_SINGLELINE | DT_VCENTER | DT_CENTER);
        draw_text(hdc, title, RECT { left: 68, top: top + 1, right: 190, bottom: top + 23 }, text_color, 13, 650, DT_SINGLELINE | DT_VCENTER);
        draw_text(hdc, lead, RECT { left: 68, top: top + 25, right: 190, bottom: top + 58 }, text_color, 11, 500, DT_WORDBREAK);
    }

    fn draw_main_panel(hdc: HDC) {
        let snapshot = STATE.get().and_then(|state| state.lock().ok().map(|guard| guard.clone())).unwrap_or_else(BootstrapState::new);
        let lang = snapshot.lang;
        let title_size = if lang == Language::Zh { 34 } else { 40 };

        draw_language_toggle(hdc);
        draw_text(hdc, "GYENBOX / SETUP", RECT { left: 272, top: 44, right: 580, bottom: 62 }, rgb(112, 112, 112), 12, 500, DT_SINGLELINE | DT_VCENTER);
        draw_text(hdc, tr(lang, &snapshot.title), RECT { left: 272, top: 116, right: 916, bottom: 166 }, rgb(17, 17, 17), title_size, 720, DT_SINGLELINE | DT_VCENTER);
        draw_text(hdc, tr(lang, &snapshot.lead), RECT { left: 272, top: 180, right: 832, bottom: 236 }, rgb(112, 112, 112), 17, 480, DT_WORDBREAK);

        draw_progress_block(hdc, &snapshot);
        draw_footer(hdc);
    }

    fn draw_progress_block(hdc: HDC, snapshot: &BootstrapState) {
        let lang = snapshot.lang;
        let track = RECT { left: 272, top: 362, right: 912, bottom: 367 };
        draw_text(hdc, "INSTALLING", RECT { left: 272, top: 334, right: 440, bottom: 350 }, rgb(112, 112, 112), 12, 500, DT_SINGLELINE | DT_VCENTER);
        draw_text(hdc, &format!("{}%", snapshot.progress.round() as i32), RECT { left: 846, top: 334, right: 912, bottom: 350 }, rgb(52, 52, 52), 12, 650, DT_SINGLELINE | DT_VCENTER | DT_CENTER);
        rounded_fill_outline(hdc, track, rgb(232, 232, 228), rgb(232, 232, 228), 3);
        let width = ((track.right - track.left) as f32 * (snapshot.progress / 100.0)).round() as i32;
        rounded_fill_outline(hdc, RECT { left: track.left, top: track.top, right: track.left + width, bottom: track.bottom }, rgb(23, 105, 224), rgb(23, 105, 224), 3);

        let status_color = if snapshot.failed.is_some() { rgb(159, 43, 52) } else if snapshot.done { rgb(22, 132, 91) } else { rgb(23, 105, 224) };
        rounded_fill_outline(hdc, RECT { left: 267, top: 389, right: 285, bottom: 407 }, rgb(234, 242, 255), rgb(234, 242, 255), 9);
        rounded_fill_outline(hdc, RECT { left: 272, top: 394, right: 280, bottom: 402 }, status_color, status_color, 4);
        let status = snapshot.failed.as_deref().unwrap_or(&snapshot.status);
        draw_text(hdc, tr(lang, status), RECT { left: 298, top: 386, right: 820, bottom: 410 }, if snapshot.failed.is_some() { rgb(159, 43, 52) } else { rgb(69, 69, 69) }, 14, 560, DT_SINGLELINE | DT_VCENTER);
    }

    fn draw_language_toggle(hdc: HDC) {
        let lang = current_language();
        let outer = RECT { left: 870, top: 34, right: 954, bottom: 66 };
        let en_rect = RECT { left: 874, top: 38, right: 912, bottom: 64 };
        let zh_rect = RECT { left: 914, top: 38, right: 950, bottom: 64 };
        rounded_fill_outline(hdc, outer, rgb(255, 255, 255), rgb(229, 229, 226), 6);
        rounded_fill_outline(hdc, if lang == Language::En { en_rect } else { zh_rect }, rgb(17, 17, 17), rgb(17, 17, 17), 4);
        draw_text(hdc, "EN", en_rect, if lang == Language::En { rgb(255, 255, 255) } else { rgb(112, 112, 112) }, 12, 650, DT_SINGLELINE | DT_VCENTER | DT_CENTER);
        draw_text(hdc, "中文", zh_rect, if lang == Language::Zh { rgb(255, 255, 255) } else { rgb(112, 112, 112) }, 12, 650, DT_SINGLELINE | DT_VCENTER | DT_CENTER);
    }

    fn draw_footer(hdc: HDC) {
        let lang = current_language();
        fill(hdc, RECT { left: 216, top: 562, right: 1000, bottom: 563 }, rgb(229, 229, 226));
        draw_text(hdc, tr(lang, "Install path and sync folder stay separate."), RECT { left: 272, top: 586, right: 720, bottom: 612 }, rgb(112, 112, 112), 12, 520, DT_SINGLELINE | DT_VCENTER);
        draw_text(hdc, tr(lang, "Why GyenBox?"), RECT { left: 830, top: 586, right: 946, bottom: 612 }, rgb(17, 17, 17), 12, 650, DT_SINGLELINE | DT_VCENTER | DT_CENTER);
    }
    fn rounded_fill_outline(hdc: HDC, rect: RECT, fill_color: u32, outline_color: u32, radius: i32) {
        if rect.right <= rect.left || rect.bottom <= rect.top {
            return;
        }
        let rect = scale_rect(rect);
        let radius = sc(radius).max(1);
        unsafe {
            let brush = CreateSolidBrush(fill_color);
            let pen = CreatePen(PS_SOLID, 1, outline_color);
            let old_brush = SelectObject(hdc, brush);
            let old_pen = SelectObject(hdc, pen);
            RoundRect(hdc, rect.left, rect.top, rect.right, rect.bottom, radius * 2, radius * 2);
            SelectObject(hdc, old_pen);
            SelectObject(hdc, old_brush);
            DeleteObject(pen);
            DeleteObject(brush);
        }
    }
    fn fill(hdc: HDC, rect: RECT, color: u32) {
        let rect = scale_rect(rect);
        unsafe {
            let brush: HBRUSH = CreateSolidBrush(color);
            FillRect(hdc, &rect, brush);
            DeleteObject(brush);
        }
    }

    fn draw_text(hdc: HDC, text: &str, rect: RECT, color: u32, size: i32, weight: i32, flags: u32) {
        let mut rect = scale_rect(rect);
        let family = if has_cjk(text) { wide("Microsoft YaHei UI") } else { wide("Segoe UI Variable Text") };
        let font = unsafe {
            CreateFontW(
                -sc(size),
                0,
                0,
                0,
                weight,
                0,
                0,
                0,
                0,
                0,
                0,
                5,
                0,
                family.as_ptr(),
            )
        };
        let wide_text = wide(text);
        unsafe {
            let old = SelectObject(hdc, font);
            SetBkMode(hdc, TRANSPARENT as i32);
            SetTextColor(hdc, color);
            DrawTextW(hdc, wide_text.as_ptr(), (wide_text.len() - 1) as i32, &mut rect, flags | DT_NOCLIP);
            SelectObject(hdc, old);
            DeleteObject(font);
        }
    }

    fn has_cjk(text: &str) -> bool {
        text.chars().any(|ch| matches!(ch as u32, 0x3400..=0x9fff | 0xf900..=0xfaff))
    }

    fn rgb(r: u8, g: u8, b: u8) -> u32 {
        (r as u32) | ((g as u32) << 8) | ((b as u32) << 16)
    }

    fn wide(value: &str) -> Vec<u16> {
        OsStr::new(value).encode_wide().chain(Some(0)).collect()
    }
}

#[cfg(all(windows, feature = "embed-installer"))]
fn main() {
    app::run();
}

#[cfg(not(all(windows, feature = "embed-installer")))]
fn main() {
    println!("gyenbox-bootstrapper requires Windows and the embed-installer feature.");
}
