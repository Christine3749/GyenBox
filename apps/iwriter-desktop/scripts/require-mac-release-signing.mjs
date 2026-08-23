import { execFileSync } from 'node:child_process';

if (process.platform !== 'darwin') {
  throw new Error('Mac releases must be built and verified on macOS.');
}

const identities = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], {
  encoding: 'utf8',
});

if (!identities.includes('Developer ID Application:')) {
  throw new Error(
    'Missing Developer ID Application certificate. Apple Development certificates are for local testing and must not be used for public DMGs.',
  );
}

const hasAppleIdCredentials = [
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID',
].every((name) => Boolean(process.env[name]));

const hasApiKeyCredentials = [
  'APPLE_API_KEY',
  'APPLE_API_KEY_ID',
  'APPLE_API_ISSUER',
  'APPLE_TEAM_ID',
].every((name) => Boolean(process.env[name]));

const hasKeychainProfile = Boolean(process.env.APPLE_KEYCHAIN_PROFILE);

if (!hasAppleIdCredentials && !hasApiKeyCredentials && !hasKeychainProfile) {
  throw new Error(
    'Missing Apple notarization credentials. Configure an Apple ID set, App Store Connect API key set, or APPLE_KEYCHAIN_PROFILE before building a public DMG.',
  );
}

console.info('[iWriter] Developer ID and notarization prerequisites are available');
