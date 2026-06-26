// BMI UMS - Stability Validation Test
// Pings the API health endpoint multiple times to ensure stability

const HEALTH_URL = 'http://127.0.0.1:3001/health';
const TOTAL_CHECKS = 5;
const DELAY_MS = 2000;

async function runTest() {
  console.log(`[Validation] Starting stability test on ${HEALTH_URL}...`);
  
  for (let i = 1; i <= TOTAL_CHECKS; i++) {
    try {
      const start = Date.now();
      const res = await fetch(HEALTH_URL);
      const duration = Date.now() - start;
      
      if (res.ok) {
        const data = await res.json();
        console.log(`[Check ${i}/${TOTAL_CHECKS}] SUCCESS - Response time: ${duration}ms - Status: ${data.services.api}`);
      } else {
        console.error(`[Check ${i}/${TOTAL_CHECKS}] FAILED - HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.error(`[Check ${i}/${TOTAL_CHECKS}] ERROR - ${err.message || err}`);
    }
    
    if (i < TOTAL_CHECKS) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log('[Validation] Stability test complete.');
}

runTest();
