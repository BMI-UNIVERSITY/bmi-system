import http from "http";

const payload = JSON.stringify({
  spreadsheetId: "1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg",
  sheets: [
    "01_FACULTIES",
    "02_DEPARTMENTS",
    "03_PROGRAMS",
    "04_COURSES",
    "05_PROG_COURSES",
    "06_STAFF",
    "07_STUDENTS",
    "08_ENROLLMENTS",
    "09_GRADES"
  ]
});

const options = {
  hostname: "127.0.0.1",
  port: 3001,
  path: "/api/v1/import/sheets-webhook",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "X-BMI-Webhook-Token": "YOUR_SHARED_HMAC_SECRET_OR_API_KEY"
  }
};

console.log("Sending POST request to trigger REAL Sheets Webhook Sync...");

const req = http.request(options, (res) => {
  let data = "";
  
  console.log(`Response Status Code: ${res.statusCode}`);
  
  res.on("data", (chunk) => {
    data += chunk;
  });
  
  res.on("end", () => {
    console.log("Response Body:");
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      if (parsed.success) {
        console.log("\n✓ Real Webhook sync passed successfully!");
        process.exit(0);
      } else {
        console.error("\n✗ Real Webhook sync failed!");
        process.exit(1);
      }
    } catch (e) {
      console.log(data);
      console.error("\n✗ Webhook returned invalid JSON!");
      process.exit(1);
    }
  });
});

req.on("error", (e) => {
  console.error(`Request Error: ${e.message}`);
  process.exit(1);
});

req.write(payload);
req.end();
