#![windows_subsystem = "windows"]

use std::{env, path::PathBuf, process::Command};

fn main() {
    let target = env::args_os()
        .nth(1)
        .map(PathBuf::from)
        .or_else(default_sync_folder)
        .unwrap_or_else(|| PathBuf::from("."));

    let _ = std::fs::create_dir_all(&target);
    let _ = Command::new("explorer.exe").arg(target).spawn();
}

fn default_sync_folder() -> Option<PathBuf> {
    env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .map(|profile| profile.join("Desktop").join("GyenBox"))
}