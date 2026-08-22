const test = require('node:test');
const assert = require('node:assert/strict');
const { createSecurityPolicy } = require('../electron/security-policy.cjs');

test('trusts only the configured iWriter origin', () => {
  const policy = createSecurityPolicy('https://iwriter.gyenbox.com/iwriter');
  assert.equal(policy.isTrustedUrl('https://iwriter.gyenbox.com/library?id=1'), true);
  assert.equal(policy.isTrustedUrl('https://gyenbox.com/iwriter'), false);
  assert.equal(policy.isTrustedUrl('https://iwriter.gyenbox.com.evil.test/'), false);
});

test('only HTTP(S) links can leave the app', () => {
  const policy = createSecurityPolicy('https://iwriter.gyenbox.com/');
  assert.equal(policy.isExternalUrl('https://example.com/help'), true);
  assert.equal(policy.isExternalUrl('file:///etc/passwd'), false);
  assert.equal(policy.isExternalUrl('javascript:alert(1)'), false);
  assert.equal(policy.isExternalUrl('https://iwriter.gyenbox.com/help'), false);
});

test('rejects IPC from a different origin', () => {
  const policy = createSecurityPolicy('https://iwriter.gyenbox.com/');
  assert.doesNotThrow(() => policy.assertTrustedSender({ senderFrame: { url: 'https://iwriter.gyenbox.com/' } }));
  assert.throws(
    () => policy.assertTrustedSender({ senderFrame: { url: 'https://attacker.test/' } }),
    /Blocked IPC/,
  );
});
