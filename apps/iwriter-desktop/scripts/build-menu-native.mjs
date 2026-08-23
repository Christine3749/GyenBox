import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') process.exit(0);

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(packageDir, 'electron/native/menu-style.mm');
const outputDir = path.join(packageDir, 'electron/native');
const nodeRoot = path.resolve(path.dirname(process.execPath), '..');
const includeDir = path.join(nodeRoot, 'include/node');
const clang = execFileSync('xcrun', ['--find', 'clang++'], { encoding: 'utf8' }).trim();
const lipo = execFileSync('xcrun', ['--find', 'lipo'], { encoding: 'utf8' }).trim();
const sdk = execFileSync('xcrun', ['--show-sdk-path'], { encoding: 'utf8' }).trim();

mkdirSync(outputDir, { recursive: true });
const slices = ['arm64', 'x86_64'].map(arch => {
  const target = path.join(outputDir, `menu-style.${arch}.node`);
  execFileSync(clang, [
    '-arch', arch,
    '-std=c++17',
    '-fobjc-arc',
    '-bundle',
    '-undefined', 'dynamic_lookup',
    '-isysroot', sdk,
    '-I', includeDir,
    '-framework', 'AppKit',
    source,
    '-o', target,
  ], { stdio: 'inherit' });
  return target;
});

execFileSync(lipo, ['-create', ...slices, '-output', path.join(outputDir, 'menu-style.node')], { stdio: 'inherit' });
