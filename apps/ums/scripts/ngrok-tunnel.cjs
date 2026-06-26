#!/usr/bin/env node
/**
 * BMI UMS — Ngrok Tunnel Auto-Start
 *
 * This script ensures a 100% efficient and professional Ngrok tunnel setup
 * for the verification portal. It relies on a static Ngrok domain to provide
 * a permanent URL for your QR codes.
 *
 * Requirements:
 *   - ngrok must be installed and in your PATH
 *   - NGROK_DOMAIN must be set in your root .env file
 *   - Backend and PocketBase should already be running
 */

"use strict";

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
const LOGS = path.join(ROOT, "logs");
const NGROK_EXE = "ngrok";
const NGROK_LOG = path.join(LOGS, "ngrok.log");
const NGROK_PID_FILE = path.join(LOGS, "ngrok.pid");
const PX_PID_FILE = path.join(LOGS, "proxy.pid");
const PROXY_SCRIPT = path.join(__dirname, "local-proxy.cjs");
const FRONTEND_ENV = path.join(ROOT, ".env");
const BACKEND_ENV = path.join(ROOT, "backend", ".env");
const PROXY_PORT = 4000;
const TUNNEL_PORT = 4000;

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg) {
  console.log(`  ${msg}`);
}
function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function warn(msg) {
  console.log(`  ⚠ ${msg}`);
}
function step(msg) {
  console.log(`\n▶ ${msg}`);
}
function die(msg) {
  console.error(`\n✗ FATAL: ${msg}`);
  process.exit(1);
}

function getPidByPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const lines = out.split("\n").filter(l => l.includes("LISTENING"));
    if (lines.length > 0) {
      const parts = lines[0].trim().split(/\s+/);
      return parseInt(parts[parts.length - 1], 10);
    }
  } catch (error) { }
  return 0;
}

function getPidByName(name) {
  try {
    const out = execSync(`tasklist /FI "IMAGENAME eq ${name}.exe" /FO CSV /NH`, { encoding: "utf8" });
    const m = out.match(/"[^"]+","(\d+)"/);
    if (m) return parseInt(m[1], 10);
  } catch (error) { }
  return 0;
}

function killPid(pid) {
  if (!pid) return;
  try {
    execSync(`taskkill /F /PID ${pid} 2>nul`, { stdio: "ignore" });
  } catch (error) {}
}

function killPort(port) {
  try {
    const out = execSync(`netstat -ano 2>nul`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const pids = new Set();
    out.split("\n").forEach((line) => {
      if (line.includes(`:${port} `) || line.includes(`:${port}\t`)) {
        const m = line.trim().split(/\s+/);
        const pid = parseInt(m[m.length - 1], 10);
        if (pid > 0) pids.add(pid);
      }
    });
    pids.forEach((pid) => killPid(pid));
  } catch (error) {}
}

function killPidFile(file) {
  try {
    const pid = parseInt(fs.readFileSync(file, "utf8").trim(), 10);
    if (pid > 0) killPid(pid);
    fs.unlinkSync(file);
  } catch (error) {}
}

function startDetached(exe, args, { cwd = ROOT, stdout = null, stderr = null } = {}) {
  const outFd = stdout ? fs.openSync(stdout, "w") : "ignore";
  const errFd = stderr ? fs.openSync(stderr, "w") : "ignore";
  const child = spawn(exe, args, {
    cwd,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", outFd, errFd],
  });
  child.unref();
  return child.pid || 0;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setEnvVar(file, key, value) {
  if (!fs.existsSync(file)) {
    warn(`${path.basename(file)} not found — skipping`);
    return;
  }
  let text = fs.readFileSync(file, "utf8");
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) {
    text = text.replace(re, `${key}=${value}`);
  } else {
    text += `\n${key}=${value}\n`;
  }
  fs.writeFileSync(file, text, "utf8");
}

function isPortUp(port, path = "/health") {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path, timeout: 2000 },
      (res) => {
        resolve(res.statusCode < 500);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
     });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("========================================");
  console.log("  BMI UMS - PERSISTENT TUNNEL SETUP");
  console.log("========================================");

  const TUNNEL_URL_FILE = path.join(LOGS, "tunnel-url.txt");
  let ngrokDomain = process.env.NGROK_DOMAIN;
  if (!ngrokDomain) {
    try {
      const envText = fs.readFileSync(FRONTEND_ENV, "utf8");
      const m = envText.match(/^NGROK_DOMAIN=(.+)$/m);
      if (m && m[1].trim()) ngrokDomain = m[1].trim();
    } catch (error) { }
  }

  if (!ngrokDomain) {
    die("NGROK_DOMAIN is not set in your .env file.");
  }

  // 1. Check existing tunnel
  step("Checking existing tunnel...");
  const oldNgrokPid = getPidByName("ngrok");
  const oldProxyPid = getPidByPort(PROXY_PORT);

  // Check if tunnel is already working
  let existingUrl = null;
  if (fs.existsSync(TUNNEL_URL_FILE)) {
    existingUrl = fs.readFileSync(TUNNEL_URL_FILE, "utf8").trim();
  }

  if (oldNgrokPid && oldProxyPid && existingUrl) {
    try {
      log(`Testing existing tunnel at ${existingUrl}...`);
      // Using http.get instead of fetch as fetch might not be available in all node versions
      const isUp = await isPortUp(PROXY_PORT, "/");
      if (isUp) {
        ok("Tunnel is already running and stable. Skipping setup.");
        process.exit(0);
      }
    } catch (error) {
      warn("Existing tunnel found but not responding. Restarting...");
    }
  }

  // 2. Cleanup
  step("Performing clean startup...");
  killPid(oldNgrokPid);
  killPid(oldProxyPid);
  if (fs.existsSync(NGROK_LOG)) fs.unlinkSync(NGROK_LOG);

  // 3. Start ngrok
  step("Starting ngrok tunnel...");
  const ngrokPid = startDetached(NGROK_EXE, ["http", `--domain=${ngrokDomain}`, `127.0.0.1:${TUNNEL_PORT}`, "--log=stdout"], { cwd: ROOT, stdout: NGROK_LOG, stderr: NGROK_LOG });
  ok(`Ngrok started (PID: ${ngrokPid})`);

  // 4. Wait for URL
  step("Waiting for tunnel URL...");
  let tunnelUrl = "";
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    if (!fs.existsSync(NGROK_LOG)) continue;
    const logData = fs.readFileSync(NGROK_LOG, "utf8");
    const match = logData.match(/url=(https:\/\/[^\s]+)/);
    if (match) {
      tunnelUrl = match[1];
      break;
    }
  }

  if (!tunnelUrl) die("Failed to get ngrok URL. Check logs/ngrok.log");
  ok(`Tunnel active: ${tunnelUrl}`);

  // 5. Save URL
  fs.writeFileSync(TUNNEL_URL_FILE, tunnelUrl);
  
  // 6. Start Proxy
  step(`Starting local proxy on port ${PROXY_PORT}...`);
  const pxPid = startDetached(process.execPath, [PROXY_SCRIPT], { cwd: ROOT });
  ok(`Proxy started (PID: ${pxPid})`);

  // 7. Sync Env (Only if changed)
   step("Syncing environment variables...");
   const envChanged = setEnvVar(FRONTEND_ENV, "VITE_VERIFY_URL", tunnelUrl);
   const backendChanged = setEnvVar(BACKEND_ENV, "VERIFY_PORTAL_URL", tunnelUrl);
 
   const distExists = fs.existsSync(path.join(DIST_DIR, "index.html"));

   if (envChanged || backendChanged || !distExists) {
     if (!distExists) {
       warn("No production build found. Performing initial build...");
       execSync("npm run build", { cwd: ROOT, stdio: "inherit" });
       ok("Initial build complete.");
     } else {
       warn("Environment changed. Starting background frontend rebuild to update QR codes...");
       spawn("npm", ["run", "build"], { cwd: ROOT, stdio: "ignore", detached: true }).unref();
     }
   } else {
     ok("Environment already up to date and build exists.");
   }
 
   ok("Tunnel setup complete and persistent.");
 }

main().catch((error) => {
  console.error("\n✗ Unexpected error:", error.message);
  process.exit(1);
});






