import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseDir = path.join(packageDir, 'release');
const intermediateDirs = ['mac', 'mac-arm64', 'win-unpacked', 'win-arm64-unpacked'];
const lsregister = '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister';

for (const name of intermediateDirs) {
  const directory = path.join(releaseDir, name);
  const appBundle = path.join(directory, 'iWriter.app');

  // electron-builder's unpacked macOS apps are intermediate artifacts. If they
  // remain on disk, LaunchServices exposes them as duplicate Launchpad clients.
  if (process.platform === 'darwin' && existsSync(appBundle)) {
    try {
      execFileSync(lsregister, ['-u', appBundle], { stdio: 'ignore' });
    } catch {
      // The bundle can be unregistered already; removal is still safe.
    }
  }

  if (existsSync(directory)) await rm(directory, { recursive: true, force: true });
}

console.info('[iWriter] removed unpacked build intermediates');
