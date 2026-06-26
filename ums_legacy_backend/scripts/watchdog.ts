// BMI UMS - API Watchdog & Auto-Recovery
// Monitors API health and restarts if unresponsive

import { spawn, ChildProcess } from 'child_process';

const HEALTH_URL = 'http://127.0.0.1:3001/health';
const CHECK_INTERVAL_MS = 10000; // 10 seconds
const MAX_FAILURES = 3;
const RESTART_DELAY_MS = 2000;

let failureCount = 0;
let apiProcess: ChildProcess | null = null;

function startAPI() {
  console.log('[Watchdog] Starting API process...');
  apiProcess = spawn('npm', ['run', 'dev-real'], {
    shell: true,
    stdio: 'inherit',
    cwd: process.cwd()
  });

  apiProcess.on('exit', (code) => {
    console.log(`[Watchdog] API process exited with code ${code}`);
    if (code !== 0) {
      console.log('[Watchdog] Restarting in 2 seconds...');
      setTimeout(startAPI, RESTART_DELAY_MS);
    }
  });
}

async function checkHealth() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      if (failureCount > 0) {
        console.log('[Watchdog] API recovered.');
      }
      failureCount = 0;
    } else {
      throw new Error(`Health check returned ${res.status}`);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    failureCount++;
    console.warn(`[Watchdog] Health check failed (${failureCount}/${MAX_FAILURES}): ${err.message || err}`);
    
    if (failureCount >= MAX_FAILURES) {
      console.error('[Watchdog] API unresponsive. Force restarting...');
      killAPI();
      failureCount = 0;
    }
  }
}

function killAPI() {
  if (apiProcess) {
    console.log('[Watchdog] Killing unresponsive API process...');
    // In Windows, we might need taskkill to be sure
    if (process.platform === 'win32') {
      spawn('taskkill', ['/F', '/T', '/PID', apiProcess.pid!.toString()], { shell: true });
    } else {
      apiProcess.kill('SIGKILL');
    }
    apiProcess = null;
  }
}

// Handle watchdog shutdown
process.on('SIGINT', () => {
  console.log('[Watchdog] Shutting down...');
  killAPI();
  process.exit(0);
});

console.log('[Watchdog] Initializing stability monitor...');
startAPI();
setInterval(checkHealth, CHECK_INTERVAL_MS);
