use std::env;
use std::fs;
use std::path::PathBuf;

#[derive(Clone, Debug)]
pub struct CoreConfig {
    pub sync_folder: PathBuf,
    pub state_folder: PathBuf,
}

impl CoreConfig {
    pub fn from_env() -> Self {
        let sync_folder = env::var_os("GYENBOX_SYNC_FOLDER")
            .map(PathBuf::from)
            .unwrap_or_else(default_sync_folder);
        let state_folder = sync_folder.join(".gyenbox");
        Self {
            sync_folder,
            state_folder,
        }
    }

    pub fn ensure(&self) -> std::io::Result<()> {
        fs::create_dir_all(&self.sync_folder)?;
        fs::create_dir_all(&self.state_folder)
    }
}

fn default_sync_folder() -> PathBuf {
    env::var_os("USERPROFILE")
        .or_else(|| env::var_os("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
        .join("GyenBox")
}
