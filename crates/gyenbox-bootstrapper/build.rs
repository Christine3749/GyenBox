use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

fn main() {
    println!("cargo:rerun-if-env-changed=GYENBOX_INNER_INSTALLER");
    if let Ok(path) = env::var("GYENBOX_INNER_INSTALLER") {
        println!("cargo:rerun-if-changed={path}");
    }

    if env::var_os("CARGO_CFG_WINDOWS").is_some() {
        embed_windows_icon();
    }
}

fn embed_windows_icon() {
    let Some(manifest_dir) = env::var_os("CARGO_MANIFEST_DIR").map(PathBuf::from) else {
        return;
    };
    let icon_path = manifest_dir.join("../../apps/desktop/build/icon.ico");
    println!("cargo:rerun-if-changed={}", icon_path.display());

    if !icon_path.exists() {
        println!(
            "cargo:warning=Bootstrapper icon was not found: {}",
            icon_path.display()
        );
        return;
    }

    let Some(out_dir) = env::var_os("OUT_DIR").map(PathBuf::from) else {
        return;
    };
    let rc_path = out_dir.join("gyenbox-bootstrapper.rc");
    let res_path = out_dir.join("gyenbox-bootstrapper.res");
    let icon_path = fs::canonicalize(&icon_path).unwrap_or(icon_path);
    let rc_source = format!("1 ICON \"{}\"\n", escape_rc_path(&icon_path));

    if let Err(error) = fs::write(&rc_path, rc_source) {
        println!("cargo:warning=Could not write bootstrapper icon resource: {error}");
        return;
    }

    let Some(rc_exe) = find_rc_exe() else {
        println!("cargo:warning=Could not find rc.exe; bootstrapper file icon will be generic");
        return;
    };

    match Command::new(&rc_exe)
        .arg("/nologo")
        .arg(format!("/fo{}", res_path.display()))
        .arg(&rc_path)
        .output()
    {
        Ok(output) if output.status.success() => {
            println!(
                "cargo:rustc-link-arg-bin=gyenbox-bootstrapper={}",
                res_path.display()
            );
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            println!("cargo:warning=rc.exe failed to compile bootstrapper icon: {stderr}");
        }
        Err(error) => {
            println!("cargo:warning=Could not run rc.exe for bootstrapper icon: {error}");
        }
    }
}

fn find_rc_exe() -> Option<PathBuf> {
    if let Ok(output) = Command::new("where.exe").arg("rc.exe").output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(path) = stdout.lines().map(str::trim).find(|line| !line.is_empty()) {
                return Some(PathBuf::from(path));
            }
        }
    }

    let mut candidates = Vec::new();
    if let Some(sdk_dir) = env::var_os("WindowsSdkDir").map(PathBuf::from) {
        if let Some(version) = env::var_os("WindowsSDKVersion") {
            candidates.push(sdk_dir.join("bin").join(version).join("x64").join("rc.exe"));
        }
        candidates.push(sdk_dir.join("bin").join("x64").join("rc.exe"));
    }

    for base in ["ProgramFiles(x86)", "ProgramFiles"] {
        if let Some(program_files) = env::var_os(base).map(PathBuf::from) {
            candidates.extend(find_windows_kit_rc(
                &program_files.join("Windows Kits").join("10").join("bin"),
            ));
            candidates.push(
                program_files
                    .join("Windows Kits")
                    .join("8.1")
                    .join("bin")
                    .join("x64")
                    .join("rc.exe"),
            );
        }
    }

    candidates.into_iter().find(|path| path.is_file())
}

fn find_windows_kit_rc(bin_dir: &Path) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(bin_dir) else {
        return Vec::new();
    };

    let mut candidates: Vec<PathBuf> = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path().join("x64").join("rc.exe"))
        .filter(|path| path.is_file())
        .collect();
    candidates.sort();
    candidates.reverse();
    candidates
}

fn escape_rc_path(path: &Path) -> String {
    path.display()
        .to_string()
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
}
