import { app } from "../src/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generate() {
  console.log("Generating OpenAPI specification...");
  
  // The app.doc() call in index.ts registers the endpoint, 
  // but we can access the spec directly if we use the same config.
  // Actually, we can just trigger a request to the app or use the internal doc generator.
  
  const spec = app.getOpenAPIDocument({
    openapi: "3.1.0",
    info: {
      title: "BMI University Management System API",
      version: "1.0.0",
      description: "REST API for the BMI University Management System.",
    },
    servers: [
      { url: "http://localhost:3001", description: "Local development" },
    ],
  });

  const outputPath = path.resolve(__dirname, "../../openapi.json");
  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));
  
  console.log(`✓ OpenAPI spec saved to ${outputPath}`);
  process.exit(0);
}

generate().catch((err) => {
  console.error("Failed to generate OpenAPI spec:", err);
  process.exit(1);
});
