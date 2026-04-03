/**
 * Production SPA server for Expo web builds.
 *
 * Serves the output of `npx expo export` (dist/) as a single-page application:
 * - Static assets served from dist/ with correct MIME types
 * - expo-platform manifests served for Expo Go native clients
 * - All unmatched routes fall back to dist/index.html (client-side routing)
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "dist");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

/**
 * Serve a static file if it exists; otherwise fall back to dist/index.html
 * so that Expo Router client-side navigation works on deep links and refreshes.
 */
function serveStaticOrSpa(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "content-type": contentType });
    res.end(content);
    return;
  }

  // SPA fallback: serve index.html for all client-side routes
  const indexPath = path.join(STATIC_ROOT, "index.html");
  if (!fs.existsSync(indexPath)) {
    res.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
    res.end(
      "App not built yet. Run: pnpm --filter @workspace/bara run build\n",
    );
    return;
  }
  const content = fs.readFileSync(indexPath);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(content);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  // Serve Expo manifests for native clients (Expo Go / EAS)
  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
    }
  }

  // Serve static files or fall back to index.html for SPA routing
  serveStaticOrSpa(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Bära web server running on port ${port}`);
  console.log(`Serving from: ${STATIC_ROOT}`);
});
