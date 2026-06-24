use std::collections::VecDeque;

use crate::types::FileRecord;

#[derive(Debug, Default)]
pub struct SyncQueue {
    files: VecDeque<FileRecord>,
}

impl SyncQueue {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn push(&mut self, file: FileRecord) {
        self.files.push_back(file);
    }

    pub fn len(&self) -> usize {
        self.files.len()
    }
}
