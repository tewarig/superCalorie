import { API_VERSION } from "@/lib/openapi";

/**
 * GET /api-docs — a browsable API reference.
 *
 * Served as plain HTML rather than a React page because Scalar replaces the
 * element it mounts into, which fights with hydration. There is nothing to
 * hydrate here anyway.
 */
export async function GET() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>superCalorie API v${API_VERSION}</title>
    <style>
      body { margin: 0; background: #FAF5EC; }
    </style>
  </head>
  <body>
    <script id="api-reference" data-url="/api/openapi.json"></script>
    <script>
      var configuration = {
        theme: 'default',
        hideDownloadButton: false,
        metaData: { title: 'superCalorie API' },
      };
      document.getElementById('api-reference').dataset.configuration =
        JSON.stringify(configuration);
    </script>
    <!--
      Pinned and integrity-checked. An unpinned @latest cannot carry an SRI
      hash, which would leave this page executing whatever the CDN served —
      and it renders against a URL that requires a session.
      To upgrade: bump the version, then
        curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A
    -->
    <script
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.63.0/dist/browser/standalone.js"
      integrity="sha384-PlviHlK3uCjxgh67enSuQJvyxdVZbaKHnN/6op5juN6/V2IPKFGbZ91TH/FZtSkU"
      crossorigin="anonymous"
    ></script>
    <noscript>
      <p style="font-family: system-ui; padding: 2rem;">
        This reference needs JavaScript. The specification itself is at
        <a href="/api/openapi.json">/api/openapi.json</a>.
      </p>
    </noscript>
  </body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
