import { readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const releaseDir = join(__dirname, "..", "release");
const staleInstallerPattern = /^GyenBox-(Setup|Installer)-.*-x64\.exe(\.blockmap)?$/;

let removed = 0;

try {
  const entries = await readdir(releaseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !staleInstallerPattern.test(entry.name)) continue;
    await rm(join(releaseDir, entry.name), { force: true });
    removed += 1;
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log(`[clean-release] removed ${removed} stale installer artifact${removed === 1 ? "" : "s"}.`);