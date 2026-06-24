use std::fs::File;
use std::io::{Read, Result};
use std::path::Path;

pub fn hash_file(path: &Path) -> Result<String> {
    let mut file = File::open(path)?;
    let mut buffer = [0_u8; 16 * 1024];
    let mut hash = 0xcbf29ce484222325_u64;

    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        for byte in &buffer[..read] {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x100000001b3);
        }
    }

    Ok(format!("{hash:016x}"))
}
