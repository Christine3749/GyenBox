import { copyFile, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(__dirname, "..");
const repoRoot = join(desktopRoot, "..", "..");
const packageJson = JSON.parse(await readFile(join(desktopRoot, "package.json"), "utf8"));
const version = packageJson.version;

const innerInstaller = resolve(desktopRoot, "release", `GyenBox-Setup-${version}-x64.exe`);
const outputInstaller = resolve(desktopRoot, "release", `GyenBox-Installer-${version}-x64.exe`);
const bootstrapperExe = resolve(repoRoot, "target", "release", "gyenbox-bootstrapper.exe");

await stat(innerInstaller).catch(() => {
  throw new Error(`Inner installer does not exist: ${innerInstaller}. Run pack:win first.`);
});

const result = spawnSync(
  "cargo",
  [
    "build",
    "--release",
    "-p",
    "gyenbox-bootstrapper",
    "--features",
    "embed-installer",
    "--manifest-path",
    join(repoRoot, "Cargo.toml"),
  ],
  {
    cwd: repoRoot,
    env: { ...process.env, GYENBOX_INNER_INSTALLER: innerInstaller },
    stdio: "inherit",
  },
);

if (result.status !== 0) {
  throw new Error(`cargo build gyenbox-bootstrapper failed with exit code ${result.status}`);
}

await copyFile(bootstrapperExe, outputInstaller);
console.log(`[build-bootstrapper] wrote ${outputInstaller}`);
