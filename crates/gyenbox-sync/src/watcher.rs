use std::thread;
use std::time::Duration;

use crate::config::CoreConfig;
use crate::db::SyncIndex;
use crate::events::{CoreEvent, EventKind};
use crate::queue::SyncQueue;
use crate::scanner;

pub fn run_once(
    config: &CoreConfig,
    index: &SyncIndex,
    queue: &mut SyncQueue,
) -> std::io::Result<usize> {
    let records = scanner::scan(config)?;
    let count = records.len();

    for record in records {
        let message = format!(
            "{} bytes, modified {}, hash {}",
            record.size, record.modified_ms, record.hash
        );
        let seen = CoreEvent::new(EventKind::FileSeen, record.relative_path.clone(), message);
        index.record(&seen)?;
        seen.emit();

        queue.push(record.clone());
        let queued = CoreEvent::new(
            EventKind::Queued,
            record.relative_path,
            "Queued for upload.",
        );
        index.record(&queued)?;
        queued.emit();
    }

    Ok(count)
}

pub fn run_loop(config: CoreConfig, index: SyncIndex, mut queue: SyncQueue) -> std::io::Result<()> {
    loop {
        let count = run_once(&config, &index, &mut queue)?;
        CoreEvent::new(
            EventKind::ScanDone,
            "",
            &format!(
                "Queue contains {} item(s) after scanning {count} item(s).",
                queue.len()
            ),
        )
        .emit();
        thread::sleep(Duration::from_secs(5));
    }
}
