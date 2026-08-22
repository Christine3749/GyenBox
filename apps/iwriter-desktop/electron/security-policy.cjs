const { URL } = require('node:url');

const PRODUCTION_URL = 'https://iwriter.gyenbox.com/';

function normalizedOrigin(value) {
  try { return new URL(value).origin; } catch { return ''; }
}

function createSecurityPolicy(appUrl = PRODUCTION_URL) {
  const trustedOrigin = normalizedOrigin(appUrl);
  if (!trustedOrigin || !/^https?:\/\//.test(trustedOrigin)) {
    throw new Error('IWRITER_DESKTOP_URL must be an HTTP(S) URL.');
  }

  return {
    appUrl,
    trustedOrigin,
    isTrustedUrl(value) {
      return normalizedOrigin(value) === trustedOrigin;
    },
    isExternalUrl(value) {
      try {
        const url = new URL(value);
        return (url.protocol === 'https:' || url.protocol === 'http:') &&
          url.origin !== trustedOrigin;
      } catch { return false; }
    },
    assertTrustedSender(event) {
      const senderUrl = event?.senderFrame?.url || event?.sender?.getURL?.() || '';
      if (normalizedOrigin(senderUrl) !== trustedOrigin) {
        throw new Error('Blocked IPC from an untrusted iWriter origin.');
      }
    },
  };
}

module.exports = { PRODUCTION_URL, createSecurityPolicy, normalizedOrigin };
