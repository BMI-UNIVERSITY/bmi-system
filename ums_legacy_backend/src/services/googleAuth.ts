import { google } from "googleapis";
import { JWT } from "google-auth-library";
import { logger } from "../utils/logger.js";
import * as fs from "fs";
import * as path from "path";

let cachedAuth: JWT | null = null;

/**
 * Resolves the Google API authentication client.
 * Supports:
 * 1. GOOGLE_SERVICE_ACCOUNT_KEY env variable containing the full JSON payload
 * 2. GOOGLE_APPLICATION_CREDENTIALS env variable pointing to a credentials file path
 * 3. A fallback local file backend/google-credentials.json
 */
export function getGoogleAuth(): JWT {
  if (cachedAuth) {
    return cachedAuth;
  }

  let clientEmail: string | undefined;
  let privateKey: string | undefined;

  // 1. Check full JSON env variable
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      clientEmail = parsed.client_email;
      privateKey = parsed.private_key;
      logger.info("Authenticated Google Sheets API via GOOGLE_SERVICE_ACCOUNT_KEY env variable.");
    } catch (error) {
      logger.error({ err: error }, "Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON env variable");
    }
  }

  // 2. Check individual credentials env variables
  if (!clientEmail || !privateKey) {
    clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (clientEmail && privateKey) {
      logger.info("Authenticated Google Sheets API via client email/private key env variables.");
    }
  }

  // 3. Check credentials file path env variable
  if (!clientEmail || !privateKey) {
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credsPath && fs.existsSync(credsPath)) {
      try {
        const fileContent = fs.readFileSync(credsPath, "utf8");
        const parsed = JSON.parse(fileContent);
        clientEmail = parsed.client_email;
        privateKey = parsed.private_key;
        logger.info(`Authenticated Google Sheets API via credentials file path: ${credsPath}`);
      } catch (error) {
        logger.error({ err: error }, `Failed to read credentials from file path ${credsPath}`);
      }
    }
  }

  // 4. Check fallback local file
  if (!clientEmail || !privateKey) {
    const localPath = path.join(process.cwd(), "google-credentials.json");
    if (fs.existsSync(localPath)) {
      try {
        const fileContent = fs.readFileSync(localPath, "utf8");
        const parsed = JSON.parse(fileContent);
        clientEmail = parsed.client_email;
        privateKey = parsed.private_key;
        logger.info(`Authenticated Google Sheets API via local file: google-credentials.json`);
      } catch (error) {
        logger.error({ err: error }, `Failed to read local google-credentials.json`);
      }
    }
  }

  if (!clientEmail || !privateKey) {
    logger.warn(
      "Google Sheets Service Account credentials are not configured. " +
      "Webhook sync will operate in MOCK/DRY-RUN mode only."
    );
    // Return dummy token that will throw on actual request but allow initialization
    return new JWT({
      email: "mock@google-auth-fallback.iam.gserviceaccount.com",
      key: "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  cachedAuth = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return cachedAuth;
}

/**
 * Fetches values from a specific sheet range in Google Sheets.
 */
export async function getGoogleSheetRange(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const auth = getGoogleAuth();
  
  // If we are in dry run / unconfigured mode, return mock data for testing
  if (auth.email === "mock@google-auth-fallback.iam.gserviceaccount.com") {
    logger.info(`[Mock Mode] Fetching range "${range}" from Spreadsheet "${spreadsheetId}"`);
    return getMockSheetValues(range);
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values || [];
  } catch (error) {
    logger.error(
      { err: error },
      `Google Sheets API fetch error on range "${range}"`,
    );
    throw new Error(
      `Google Sheets API Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Returns mock data mirroring our spreadsheet format to support offline testing and local integration tests.
 */
function getMockSheetValues(range: string): string[][] {
  const cleanRange = range.split("!")[0].replace(/['"]/g, "");
  
  if (cleanRange.includes("FACULTIES")) {
    return [
      ["faculty_code", "name"],
      ["FAC_MOCK_1", "Mock Faculty of Divinity"],
    ];
  }
  if (cleanRange.includes("DEPARTMENTS")) {
    return [
      ["dept_code", "name", "faculty_code"],
      ["DEPT_MOCK_1", "Mock Department of Ministry", "FAC_MOCK_1"],
    ];
  }
  if (cleanRange.includes("PROGRAMS")) {
    return [
      ["program_code", "name", "degree_level", "dept_code", "total_credits"],
      ["PROG_MOCK_1", "Diploma in Christian Ministry and Theology", "Diploma", "DEPT_MOCK_1", "120"],
    ];
  }
  if (cleanRange.includes("COURSES")) {
    return [
      ["course_code", "title", "credits", "is_elective"],
      ["ENG 101", "Basic English Grammar", "3", "false"],
      ["CRS_MOCK_1", "Mock Pastoral Ethics", "3", "false"],
    ];
  }
  if (cleanRange.includes("PROG_COURSES")) {
    return [
      ["program_code", "course_code", "is_required", "sequence_order"],
      ["PROG_MOCK_1", "ENG 101", "true", "1"],
      ["PROG_MOCK_1", "CRS_MOCK_1", "true", "1"],
    ];
  }
  if (cleanRange.includes("STAFF")) {
    return [
      ["staff_number", "first_name", "last_name", "email", "phone", "title", "role", "dept_code"],
      ["STF_MOCK_1", "John", "Doe", "john.doe@bmi.edu", "0711111111", "Rev.", "staff", "DEPT_MOCK_1"],
    ];
  }
  if (cleanRange.includes("STUDENTS")) {
    return [
      ["student_number", "first_name", "last_name", "email", "phone", "gender", "program_code", "admission_date", "status"],
      ["STUD_MOCK_1", "Alice", "Smith", "alice@student.bmi.edu", "0722222222", "Female", "PROG_MOCK_1", "2026-01-10", "Active"],
    ];
  }
  if (cleanRange.includes("ENROLLMENTS")) {
    return [
      ["student_number", "course_code", "academic_year", "semester"],
      ["STUD_MOCK_1", "ENG 101", "2025/2026", "Semester 1"],
    ];
  }
  if (cleanRange.includes("GRADES")) {
    return [
      ["student_number", "course_code", "academic_year", "semester", "percentage"],
      ["STUD_MOCK_1", "ENG 101", "2025/2026", "Semester 1", "85"],
    ];
  }

  return [];
}

/**
 * Updates values in a specific sheet range in Google Sheets.
 */
export async function updateGoogleSheetRange(
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const auth = getGoogleAuth();
  
  if (auth.email === "mock@google-auth-fallback.iam.gserviceaccount.com") {
    logger.info(
      { values },
      `[Mock Mode] Updating range "${range}" in Spreadsheet "${spreadsheetId}"`,
    );
    return;
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    });
  } catch (error) {
    logger.error(
      { err: error },
      `Google Sheets API update error on range "${range}"`,
    );
    throw new Error(
      `Google Sheets API Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Appends values to a specific sheet in Google Sheets.
 */
export async function appendGoogleSheetRow(
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const auth = getGoogleAuth();
  
  if (auth.email === "mock@google-auth-fallback.iam.gserviceaccount.com") {
    logger.info(
      { values },
      `[Mock Mode] Appending to range "${range}" in Spreadsheet "${spreadsheetId}"`,
    );
    return;
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values,
      },
    });
  } catch (error) {
    logger.error(
      { err: error },
      `Google Sheets API append error on range "${range}"`,
    );
    throw new Error(
      `Google Sheets API Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}






