import { getGoogleSheetRange } from "./src/services/googleAuth.js";
import * as dotenv from "dotenv";
dotenv.config();

const spreadsheetId = "1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg";

async function run() {
  console.log("Fetching real spreadsheet data for programs...");
  try {
    const programRows = await getGoogleSheetRange(spreadsheetId, "'03_PROGRAMS'!A1:Z10");
    console.log("--- 03_PROGRAMS HEADERS ---");
    console.log(programRows[0]);
    console.log("--- 03_PROGRAMS SAMPLE ROW ---");
    console.log(programRows[1]);
  } catch (err: any) {
    console.error("Error reading programs sheet:", err.message);
  }

  try {
    const studentRows = await getGoogleSheetRange(spreadsheetId, "'07_STUDENTS'!A1:Z10");
    console.log("\n--- 07_STUDENTS HEADERS ---");
    console.log(studentRows[0]);
    console.log("--- 07_STUDENTS SAMPLE ROW ---");
    console.log(studentRows[1]);
  } catch (err: any) {
    console.error("Error reading students sheet:", err.message);
  }
}

run().catch(console.error);
