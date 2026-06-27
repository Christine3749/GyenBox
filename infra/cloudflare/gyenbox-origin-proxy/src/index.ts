type Env = {
  GYENBOX_ORIGIN: string;
};

const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incomingUrl = new URL(request.url);
    const originUrl = new URL(env.GYENBOX_ORIGIN);
    originUrl.pathname = incomingUrl.pathname;
    originUrl.search = incomingUrl.search;

    const requestHeaders = new Headers(request.headers);
    for (const header of HOP_BY_HOP_HEADERS) requestHeaders.delete(header);
    requestHeaders.set("x-forwarded-host", incomingUrl.host);
    requestHeaders.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));
    requestHeaders.set("x-gyenbox-origin-proxy", "cloudflare-taiwan");

    try {
      const originResponse = await fetch(originUrl.toString(), {
        method: request.method,
        headers: requestHeaders,
        body: hasRequestBody(request.method) ? request.body : undefined,
        redirect: "manual",
      });

      const responseHeaders = new Headers(originResponse.headers);
      for (const header of HOP_BY_HOP_HEADERS) responseHeaders.delete(header);
      rewriteLocationHeader(responseHeaders, originUrl.origin, incomingUrl.origin);
      responseHeaders.set("x-gyenbox-origin", "gcp-asia-east1");

      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "gyenbox_origin_proxy_error",
          origin: env.GYENBOX_ORIGIN,
          path: incomingUrl.pathname,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return new Response("GyenBox Taiwan origin is temporarily unavailable.", {
        status: 502,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
  },
};

function hasRequestBody(method: string) {
  return method !== "GET" && method !== "HEAD";
}

function rewriteLocationHeader(headers: Headers, origin: string, publicOrigin: string) {
  const location = headers.get("location");
  if (!location) return;
  headers.set("location", location.replace(origin, publicOrigin));
}
