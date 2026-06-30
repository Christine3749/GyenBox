use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use crate::config::CoreConfig;
use crate::hasher::hash_file;
use crate::types::FileRecord;

pub fn scan(config: &CoreConfig) -> std::io::Result<Vec<FileRecord>> {
    let mut records = Vec::new();
    visit(&config.sync_folder, &config.sync_folder, &mut records)?;
    Ok(records)
}

fn visit(root: &Path, current: &Path, records: &mut Vec<FileRecord>) -> std::io::Result<()> {
    for entry in fs::read_dir(current)? {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with(".gyenbox") || name.eq_ignore_ascii_case("desktop.ini") {
            continue;
        }

        let meta = entry.metadata()?;
        if meta.is_dir() {
            visit(root, &path, records)?;
        } else if meta.is_file() {
            records.push(record_for(root, path, meta)?);
        }
    }
    Ok(())
}

fn record_for(root: &Path, path: PathBuf, meta: fs::Metadata) -> std::io::Result<FileRecord> {
    let relative_path = path
        .strip_prefix(root)
        .unwrap_or(&path)
        .to_string_lossy()
        .replace('\\', "/");
    let modified_ms = meta
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_millis() as u64)
        .unwrap_or_default();

    Ok(FileRecord {
        relative_path,
        size: meta.len(),
        modified_ms,
        hash: hash_file(&path)?,
    })
}
