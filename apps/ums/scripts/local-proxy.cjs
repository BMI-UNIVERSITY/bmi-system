#!/usr/bin/env node
/**
 * BMI UMS — Local Dev Proxy  (CommonJS, no external deps)
 *
 * Listens on PORT (default 4000) and:
 *   /api/*  →  forward to http://localhost:3001  (Hono backend)
 *   /*      →  serve static files from dist/
 *
 * This lets a single Cloudflare Tunnel URL expose both the
 * frontend SPA and the backend API, exactly like Caddy does in production.
 *
 * Usage:  node scripts/local-proxy.cjs
 */

const http  = require("http");
const https = require("https");
const fs    = require("fs");
const path  = require("path");
const url   = require("url");

const PORT     = parseInt(process.env.PROXY_PORT  || "4000", 10);
const API_HOST = process.env.API_HOST || "127.0.0.1";
const API_PORT = parseInt(process.env.API_PORT    || "3001", 10);
const DIST_DIR = path.join(__dirname, "..", "dist");

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff2":"font/woff2",
  ".woff": "font/woff",
  ".ttf":  "font/ttf",
  ".webp": "image/webp",
  ".txt":  "text/plain",
};

// ── API proxy ─────────────────────────────────────────────────────────────────
function proxyToApi(req, res) {
  const options = {
    hostname: API_HOST,
    port:     API_PORT,
    path:     req.url,
    method:   req.method,
    headers:  {
      ...req.headers,
      host: `${API_HOST}:${API_PORT}`,
      // Forward real client IP through the tunnel chain
      "x-forwarded-for": req.headers["x-forwarded-for"] ||
                          req.socket.remoteAddress,
      "x-forwarded-proto": "https",
    },
  };

  const proxy = http.request(options, (apiRes) => {
    res.writeHead(apiRes.statusCode, apiRes.headers);
    apiRes.pipe(res, { end: true });
  });

  proxy.on("error", (error) => {
    console.error("[proxy] API unreachable:", error.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Backend API unreachable" }));
  });

  req.pipe(proxy, { end: true });
}

// ── Static file server ────────────────────────────────────────────────────────
function serveStatic(req, res) {
  const parsed  = url.parse(req.url);
  let   filePath = path.join(DIST_DIR, parsed.pathname);

  // Sanitise path traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403); res.end(); return;
  }

  // Directory → index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  // File doesn't exist → SPA fallback (index.html)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, "index.html");
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";

  // Long-cache for hashed assets, no-cache for HTML
  const isHashed = /\.[a-f0-9]{8,}\.[a-z]+$/.test(filePath);
  const cc = isHashed
    ? "public, max-age=31536000, immutable"
    : "no-cache, no-store, must-revalidate";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(500); res.end("Server error"); return;
    }
    res.writeHead(200, {
      "Content-Type":  mime,
      "Cache-Control": cc,
      // Security headers
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options":        "DENY",
      "Referrer-Policy":        "strict-origin-when-cross-origin",
    });
    res.end(data);
  });
}

// ── Server ────────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // Route: /api/* → backend, everything else → static
  if (req.url.startsWith("/api/")) {
    proxyToApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   BMI UMS Local Proxy — ready                    ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Local:    http://localhost:${PORT}                  ║`);
  console.log(`║  API fwd:  http://${API_HOST}:${API_PORT}/api/*          ║`);
  console.log(`║  Static:   ${DIST_DIR.slice(-30)}  ║`);
  console.log("╚══════════════════════════════════════════════════╝");
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Set PROXY_PORT= to use another.`);
  } else {
    console.error("Server error:", error);
  }
  process.exit(1);
});






