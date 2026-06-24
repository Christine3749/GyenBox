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
