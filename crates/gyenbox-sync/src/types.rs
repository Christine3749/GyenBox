#[derive(Clone, Debug)]
pub struct FileRecord {
    pub relative_path: String,
    pub size: u64,
    pub modified_ms: u64,
    pub hash: String,
}
