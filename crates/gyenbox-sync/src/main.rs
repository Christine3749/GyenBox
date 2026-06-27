mod cloud_files;
mod config;
mod db;
mod events;
mod hasher;
mod queue;
mod scanner;
mod types;
mod watcher;

use std::process::ExitCode;

use config::CoreConfig;
use db::SyncIndex;
use events::{CoreEvent, EventKind};
use queue::SyncQueue;

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("gyenbox-sync failed: {error}");
            ExitCode::from(1)
        }
    }
}

fn run() -> std::io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if let Some(command) = args.get(1).map(String::as_str) {
        match command {
            "cloud-register" => {
                let root = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing sync root path")
                })?;
                let version = args.get(3).map(String::as_str).unwrap_or("0.1.0");
                cloud_files::register_sync_root(std::path::Path::new(root), version)?;
                return Ok(());
            }
            "cloud-mark" => {
                let root = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing sync root path")
                })?;
                let relative_path = args.get(3).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing relative path")
                })?;
                let status = args.get(4).map(String::as_str).unwrap_or("uploaded");
                cloud_files::mark_path(std::path::Path::new(root), relative_path, status)?;
                return Ok(());
            }
            "cloud-mark-root" => {
                let root = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing sync root path")
                })?;
                let status = args.get(3).map(String::as_str).unwrap_or("uploaded");
                cloud_files::mark_root(std::path::Path::new(root), status)?;
                return Ok(());
            }
            _ => {}
        }
    }

    let config = CoreConfig::from_env();
    config.ensure()?;

    let index = SyncIndex::open(&config)?;
    let mut queue = SyncQueue::new();
    CoreEvent::new(EventKind::Ready, "", "GyenBox Sync Core is ready.").emit();

    let count = watcher::run_once(&config, &index, &mut queue)?;
    CoreEvent::new(
        EventKind::ScanDone,
        "",
        &format!("Scanned {count} item(s)."),
    )
    .emit();

    if std::env::args().any(|arg| arg == "--watch") {
        watcher::run_loop(config, index, queue)?;
    }

    Ok(())
}
