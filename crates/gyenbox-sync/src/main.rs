mod cloud_files;
mod diag_log;
mod cloud_provider;
mod config;
mod db;
mod events;
mod hasher;
mod queue;
mod scanner;
mod shell_sync_root;
mod types;
mod watcher;

use std::process::ExitCode;

use config::CoreConfig;
use db::SyncIndex;
use events::{CoreEvent, EventKind};
use queue::SyncQueue;

fn main() -> ExitCode {
    let args_for_log: Vec<String> = std::env::args().collect();
    diag_log::info("main", "start", &[("args", args_for_log.join(" "))]);
    match run() {
        Ok(()) => {
            diag_log::info("main", "success", &[("args", args_for_log.join(" "))]);
            ExitCode::SUCCESS
        }
        Err(error) => {
            diag_log::error(
                "main",
                "failed",
                &[
                    ("args", args_for_log.join(" ")),
                    ("error", error.to_string()),
                ],
            );
            eprintln!("gyenbox-sync failed: {error}");
            ExitCode::from(1)
        }
    }
}

fn run() -> std::io::Result<()> {
    // WinRT sync-root registration needs an initialized COM apartment; do it once
    // up front so every subcommand (register / provider / mark) is covered.
    shell_sync_root::init_com();
    let args: Vec<String> = std::env::args().collect();
    if let Some(command) = args.get(1).map(String::as_str) {
        match command {
            "cloud-register" => {
                let root = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing sync root path")
                })?;
                let root_path = std::path::Path::new(root);
                let version = args.get(3).map(String::as_str).unwrap_or("0.1.0");
                shell_sync_root::cleanup_duplicate_roots(root_path)?;
                cloud_files::register_sync_root(root_path, version)?;
                return Ok(());
            }
            "cloud-unregister" => {
                let root = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing sync root path")
                })?;
                cloud_files::unregister_sync_root(std::path::Path::new(root))?;
                return Ok(());
            }
            "cloud-unregister-id" => {
                let id = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing sync root id")
                })?;
                shell_sync_root::unregister_id(id)?;
                return Ok(());
            }            "cloud-cleanup-roots" => {
                let root = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing sync root path")
                })?;
                shell_sync_root::cleanup_duplicate_roots(std::path::Path::new(root))?;
                return Ok(());
            }            "cloud-list-roots" => {
                println!("{}", shell_sync_root::list_roots()?);
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
            "cloud-pin" => {
                let path = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing path")
                })?;
                let state = args.get(3).map(String::as_str).unwrap_or("pinned");
                cloud_files::pin_path(std::path::Path::new(path), state)?;
                return Ok(());
            }
            "cloud-mark-connected" => {
                let root = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing sync root path")
                })?;
                let relative_path = args.get(3).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing relative path")
                })?;
                let status = args.get(4).map(String::as_str).unwrap_or("uploaded");
                cloud_provider::mark_path_connected(
                    std::path::Path::new(root),
                    relative_path,
                    status,
                )?;
                return Ok(());
            }
            "cloud-provider-run" => {
                let root = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing sync root path")
                })?;
                cloud_provider::run_provider(std::path::Path::new(root))?;
                return Ok(());
            }
            "cloud-diagnose" => {
                let root = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing sync root path")
                })?;
                let relative_path = args.get(3).map(String::as_str);
                let expected_status = args.get(4).map(String::as_str);
                let report = cloud_files::diagnose_path(
                    std::path::Path::new(root),
                    relative_path,
                    expected_status,
                )?;
                println!("{report}");
                return Ok(());
            }
            "cloud-provider-spike" => {
                let root = args.get(2).ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::InvalidInput, "missing sync root path")
                })?;
                let relative_path = args.get(3).map(String::as_str);
                let duration_seconds = args
                    .get(4)
                    .map(|value| value.parse::<u64>())
                    .transpose()
                    .map_err(|error| {
                        std::io::Error::new(
                            std::io::ErrorKind::InvalidInput,
                            format!("invalid duration seconds: {error}"),
                        )
                    })?
                    .unwrap_or(60);
                cloud_provider::run_provider_spike(
                    std::path::Path::new(root),
                    relative_path,
                    duration_seconds,
                )?;
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
