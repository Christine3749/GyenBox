#[derive(Clone, Debug)]
pub enum EventKind {
    Ready,
    FileSeen,
    Queued,
    ScanDone,
}

#[derive(Clone, Debug)]
pub struct CoreEvent {
    pub kind: EventKind,
    pub path: String,
    pub message: String,
}

impl CoreEvent {
    pub fn new(kind: EventKind, path: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            kind,
            path: path.into(),
            message: message.into(),
        }
    }

    pub fn emit(&self) {
        println!("{}", self.to_json());
    }

    pub fn to_json(&self) -> String {
        format!(
            "{{\"type\":\"{}\",\"path\":\"{}\",\"message\":\"{}\"}}",
            self.kind.as_str(),
            escape_json(&self.path),
            escape_json(&self.message),
        )
    }
}

impl EventKind {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Ready => "ready",
            Self::FileSeen => "file_seen",
            Self::Queued => "queued",
            Self::ScanDone => "scan_done",
        }
    }
}

fn escape_json(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}
