// Cloudflare Worker - kiszolgalja a Klanhaboru bookmarklet scripteket a GitHub repobol.
// A "/" az auto_confirm.js-t adja; barmely <fajl>.js is elerheto (pl. /farmgod.js).
// Mivel a repobol proxyzunk, eleg a GitHubra pusholni - nem kell ujradeploy.

const REPO = "zkaskoo/klanhaboru-scripts";
const BRANCH = "main";
const DEFAULT_FILE = "auto_confirm.js";
const EDGE_TTL = 60; // mp - ennyit cache-el a CF edge, hogy a frissites gyorsan menjen

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight (ha valaki fetch-csel hivja)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "*",
        },
      });
    }

    let path = url.pathname.replace(/^\/+/, "");
    if (path === "" || path === "auto_confirm") path = DEFAULT_FILE;
    if (!path.endsWith(".js")) path += ".js";

    // Csak biztonsagos fajlnevek (nincs konyvtar-traversal)
    if (!/^[A-Za-z0-9._-]+\.js$/.test(path)) {
      return new Response("// 400 - ervenytelen fajlnev", {
        status: 400,
        headers: jsHeaders(),
      });
    }

    const raw = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;
    const upstream = await fetch(raw, {
      cf: { cacheTtl: EDGE_TTL, cacheEverything: true },
    });

    if (!upstream.ok) {
      return new Response(`// ${upstream.status} - nem talalhato: ${path}`, {
        status: upstream.status,
        headers: jsHeaders(0),
      });
    }

    const body = await upstream.text();
    return new Response(body, { headers: jsHeaders() });
  },
};

function jsHeaders(maxAge = EDGE_TTL) {
  return {
    "content-type": "application/javascript; charset=utf-8",
    "cache-control": `public, max-age=${maxAge}`,
    "access-control-allow-origin": "*",
  };
}
