use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

use crate::config::CoreConfig;
use crate::events::CoreEvent;

#[derive(Debug)]
pub struct SyncIndex {
    events_path: PathBuf,
}

impl SyncIndex {
    pub fn open(config: &CoreConfig) -> std::io::Result<Self> {
        let events_path = config.state_folder.join("core-events.jsonl");
        OpenOptions::new()
            .create(true)
            .append(true)
            .open(&events_path)?;
        Ok(Self { events_path })
    }

    pub fn record(&self, event: &CoreEvent) -> std::io::Result<()> {
        let mut file = OpenOptions::new().append(true).open(&self.events_path)?;
        writeln!(file, "{}", event.to_json())
    }
}
