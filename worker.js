/**
 * CarScreen Hub - Cloudflare Worker Proxy (v2)
 *
 * Proxies YouTube Data API v3 and Google Maps requests
 * so the car browser only sees traffic to your worker domain.
 *
 * SETUP:
 * 1. https://dash.cloudflare.com → Workers & Pages → Create
 * 2. Paste this code → Deploy
 * 3. Copy worker URL into CarScreen Hub ⚙ Settings
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ALLOWED_HOSTS = new Set([
  'www.googleapis.com',
  'maps.googleapis.com',
  'maps.google.com',
  'i.ytimg.com',
  'yt3.ggpht.com',
  'i9.ytimg.com',
  'lh3.googleusercontent.com',
]);

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/proxy') {
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) return json({ error: 'Missing url param' }, 400);

        const target = new URL(targetUrl);
        if (!ALLOWED_HOSTS.has(target.hostname)) {
          return json({ error: `Domain not allowed: ${target.hostname}` }, 403);
        }

        const resp = await fetch(targetUrl, {
          headers: { 'User-Agent': 'CarScreenHub/1.0', 'Accept': '*/*' },
          cf: { cacheTtl: 300 }
        });

        const body = await resp.arrayBuffer();
        return new Response(body, {
          status: resp.status,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': resp.headers.get('content-type') || 'application/octet-stream',
            'Cache-Control': 'public, max-age=300',
          }
        });
      }

      return new Response('CarScreen Hub Proxy v2\n\nUsage: /proxy?url=<encoded_url>', {
        headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS }
      });

    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
