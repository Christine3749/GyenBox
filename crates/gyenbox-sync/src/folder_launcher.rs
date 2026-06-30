#![windows_subsystem = "windows"]

use std::{env, path::PathBuf, process::Command};

use windows_sys::Win32::{
    Foundation::{CloseHandle, INVALID_HANDLE_VALUE},
    System::{
        Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
            TH32CS_SNAPPROCESS,
        },
        Threading::GetCurrentProcessId,
    },
};

const APP_EXE_NAME: &str = "GyenBox.exe";

fn main() {
    let target = env::args_os()
        .nth(1)
        .map(PathBuf::from)
        .or_else(default_sync_folder)
        .unwrap_or_else(|| PathBuf::from("."));

    if !is_gyenbox_running() {
        if let Some(app_exe) = installed_app_exe() {
            if Command::new(app_exe).spawn().is_ok() {
                return;
            }
        }
    }

    let _ = std::fs::create_dir_all(&target);
    let _ = Command::new("explorer.exe").arg(target).spawn();
}

fn installed_app_exe() -> Option<PathBuf> {
    let current = env::current_exe().ok()?;
    // Installed layout: <install>\resources\bin\gyenbox-folder-launcher.exe
    let install_dir = current.parent()?.parent()?.parent()?;
    let app_exe = install_dir.join(APP_EXE_NAME);
    app_exe.exists().then_some(app_exe)
}

fn is_gyenbox_running() -> bool {
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return false;
        }

        let current_pid = GetCurrentProcessId();
        let mut entry = std::mem::zeroed::<PROCESSENTRY32W>();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        let mut found = Process32FirstW(snapshot, &mut entry) != 0;
        while found {
            if entry.th32ProcessID != current_pid && process_name(&entry) == APP_EXE_NAME {
                CloseHandle(snapshot);
                return true;
            }
            found = Process32NextW(snapshot, &mut entry) != 0;
        }

        CloseHandle(snapshot);
        false
    }
}

fn process_name(entry: &PROCESSENTRY32W) -> String {
    let len = entry
        .szExeFile
        .iter()
        .position(|value| *value == 0)
        .unwrap_or(entry.szExeFile.len());
    String::from_utf16_lossy(&entry.szExeFile[..len])
}

fn default_sync_folder() -> Option<PathBuf> {
    env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .map(|profile| profile.join("Desktop").join("GyenBox"))
}