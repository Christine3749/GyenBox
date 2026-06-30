use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn info(scope: &str, message: &str, fields: &[(&str, String)]) {
    write("INFO", scope, message, fields);
}

pub fn error(scope: &str, message: &str, fields: &[(&str, String)]) {
    write("ERROR", scope, message, fields);
}

fn write(level: &str, scope: &str, message: &str, fields: &[(&str, String)]) {
    let Some(dir) = log_dir() else { return };
    if fs::create_dir_all(&dir).is_err() {
        return;
    }
    let path = dir.join("gyenbox-sync.log");
    rotate_if_needed(&path);
    let mut line = format!(
        "{} {} [{}] {}",
        unix_millis(),
        level,
        scope,
        sanitize(message)
    );
    for (key, value) in fields {
        line.push(' ');
        line.push_str(key);
        line.push('=');
        line.push_str(&quote(value));
    }
    line.push('\n');

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = file.write_all(line.as_bytes());
    }
}

fn log_dir() -> Option<PathBuf> {
    if let Ok(value) = std::env::var("GYENBOX_LOG_DIR") {
        if !value.trim().is_empty() {
            return Some(PathBuf::from(value));
        }
    }
    std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|path| path.join("GyenBox").join("logs"))
}

fn rotate_if_needed(path: &PathBuf) {
    let Ok(metadata) = fs::metadata(path) else { return };
    if metadata.len() < 2 * 1024 * 1024 {
        return;
    }
    let rotated = path.with_extension("log.1");
    let _ = fs::remove_file(&rotated);
    let _ = fs::rename(path, rotated);
}

fn unix_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn quote(value: &str) -> String {
    format!("\"{}\"", sanitize(value))
}

fn sanitize(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\r', "\\r")
        .replace('\n', "\\n")
}