/// <reference path="./worker-configuration.d.ts" />

const LEXICON_ID = "gy-ime-english-mixed";
const LEXICON_VERSION = "2026.08.12.1";
const LEXICON_FORMAT = "gy-ime-english-v1";
const MANIFEST_PATH = "/api/ciku/ime/manifest";
const LEXICON_PATH = `/api/ciku/ime/lexicon/${LEXICON_VERSION}`;

// Public, non-personal English words for the mixed candidate surface. Personal
// entries never travel through this endpoint. The input method verifies this
// exact immutable snapshot before it becomes readable by its offline Host.
const ENGLISH_MIXED_WORDS = [
  "about", "account", "action", "active", "address", "agent", "alert", "answer",
  "api", "app", "application", "archive", "article", "async", "auto", "backup",
  "blue", "browser", "build", "button", "buyer001", "candidate", "change", "chat",
  "chatgpt", "check", "chrome", "click", "cloud", "cloudflare", "code", "commit",
  "config", "connect", "contact", "content", "context", "copy", "create", "data",
  "debug", "delete", "design", "desktop", "device", "dictionary", "document", "download",
  "email", "english", "error", "export", "file", "folder", "github", "google", "green",
  "hello", "help", "host", "image", "import", "input", "install", "keyboard", "language",
  "lexicon", "like", "link", "login", "look", "message", "mixed", "model", "network",
  "note", "offline", "openai", "page", "password", "phone", "platform", "project", "prompt",
  "release", "report", "safe", "search", "select", "service", "settings", "share", "sync",
  "system", "terminal", "test", "theme", "update", "user", "version", "web", "website",
  "windows", "word", "work", "worker",
] as const;

const lexiconBody = `${[...ENGLISH_MIXED_WORDS].sort().join("\n")}\n`;
const textEncoder = new TextEncoder();

function hexSha256(value: Uint8Array): Promise<string> {
  return crypto.subtle.digest("SHA-256", value).then((digest) =>
    [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase(),
  );
}

function immutableTextResponse(request: Request, body: string, sha256: string): Response {
  const headers = new Headers({
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": "text/plain; charset=utf-8",
    ETag: `\"sha256-${sha256}\"`,
    "X-Content-Type-Options": "nosniff",
  });
  return new Response(request.method === "HEAD" ? null : body, { headers });
}

function manifestResponse(request: Request, sha256: string, bytes: number): Response {
  const body = JSON.stringify({
    schemaVersion: 1,
    id: LEXICON_ID,
    format: LEXICON_FORMAT,
    version: LEXICON_VERSION,
    entryCount: ENGLISH_MIXED_WORDS.length,
    bytes,
    sha256,
    downloadUrl: LEXICON_PATH,
  });
  return new Response(request.method === "HEAD" ? null : body, {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === MANIFEST_PATH || url.pathname === LEXICON_PATH) {
      const bytes = textEncoder.encode(lexiconBody);
      const sha256 = await hexSha256(bytes);
      if (url.pathname === MANIFEST_PATH) return manifestResponse(request, sha256, bytes.byteLength);
      return immutableTextResponse(request, lexiconBody, sha256);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
