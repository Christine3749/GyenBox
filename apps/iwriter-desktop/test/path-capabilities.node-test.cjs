const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PathCapabilities } = require('../electron/path-capabilities.cjs');

test('allows selected directories but blocks sibling paths', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iwriter-capability-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const selected = path.join(root, 'selected');
  const sibling = path.join(root, 'sibling');
  fs.mkdirSync(selected);
  fs.mkdirSync(sibling);
  fs.writeFileSync(path.join(selected, 'draft.md'), 'draft');
  fs.writeFileSync(path.join(sibling, 'secret.md'), 'secret');
  const capabilities = new PathCapabilities(path.join(root, 'grants.json'));
  capabilities.grantDirectories([selected]);
  assert.equal(capabilities.requireAllowed(path.join(selected, 'draft.md')), fs.realpathSync(path.join(selected, 'draft.md')));
  assert.throws(() => capabilities.requireAllowed(path.join(sibling, 'secret.md')), /not authorized/);
});

test('persists explicit file grants without granting the parent folder', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iwriter-file-capability-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const selected = path.join(root, 'selected.md');
  const other = path.join(root, 'other.md');
  fs.writeFileSync(selected, 'selected');
  fs.writeFileSync(other, 'other');
  const state = path.join(root, 'grants.json');
  const capabilities = new PathCapabilities(state);
  capabilities.grantFiles([selected]);
  const restored = new PathCapabilities(state);
  assert.equal(restored.requireAllowed(selected), fs.realpathSync(selected));
  assert.throws(() => restored.requireAllowed(other), /not authorized/);
});
