import { logger } from "../utils/logger.js";

/**
 * Maps "Friendly" sheet headers to database course titles/codes.
 * This handles common abbreviations and typos in the user's friendly format.
 */
const COURSE_ALIAS_MAP: Record<string, string> = {
  "HOMILETICS": "Homiletics",
  "BIBLICAL HERMENEUTICS": "Biblical Hermeneutics",
  "CHURCH ADMIN": "Church Administration",
  "PNEUMATOLOGY": "Pneumatology",
  "EVANGELISM": "Evangelism",
  "ESCHATOLOGY": "Eschatology",
  "PRINCIPLE OF SUCCESS": "Principles of Success",
  "PRINCIPLES OF SUCCESS": "Principles of Success",
  "ANGELOLOGY": "Angelology",
  "HAMARTIOLOGY": "Anthropology & Hamartiology",
  "NEW TESTAMENT SURVEY": "New Testament Survey",
  "OLD TESTAMENT SURVEY": "Old Testament Survey",
  "CHRISTOLOGY": "Christology",
  "CHURCH GROWTH": "Church Growth",
  "BIBLIOLOGY": "Bibliology",
  "THEOLOGY PROPER": "Theology Proper",
  "SOTERIOLOGY": "Soteriology",
  "CHRISTIAN FAMILY": "Christian Family",
  "CHURCH PLANTING": "Church Planting",
  "CHURCH HISTORY": "Church History",
  "PRAISE AND WORSHIP": "Praise and Worship",
  "SPIRITUAL WARFARE": "Spiritual Warfare",
  "FOUNDATION OF SUCCESSFUL MINISTRY": "Foundation of Successful Ministry",
  "SPIRITUAL FORMATION": "Spiritual Formation",
  "KINGDOM PRINCIPLES": "Understanding God's Kingdom Principles",
  "UNDERSTANDING GODS": "Understanding God's Kingdom Principles",
  "ECCLESIOLOGY": "Ecclesiology",
  "PASTORAL COUNSELLING&ETHICS": "Pastoral Counselling & Ethics",
  "BIBLICAL GREEK": "Biblical Greek",
  "CHRISTIAN APOLOGETICS": "Christian Apologetics",
  "BIBLICAL HEBREW": "Biblical Hebrew",
  "WORLD RELIGION": "Major World Religions",
  "SPIRITUAL REALM": "Spiritual Realm",
  "BASIC ENGLISH GRAMMAR": "Basic English Grammar",
  "ACADEMIC WRITING": "Academic Writing",
};

/**
 * Detects if a sheet is in the "Wide" friendly format.
 */
export function isWideFormatSheet(headers: string[]): boolean {
  if (!headers || headers.length === 0) return false;
  const normalizedHeaders = headers.map(h => String(h || "").toUpperCase().trim());
  
  // Rule 1: Explicit check for key columns
  const hasAdmission = normalizedHeaders.some(h => h.includes("ADMISSION NO"));
  const hasCourse = normalizedHeaders.some(h => COURSE_ALIAS_MAP[h] || h.includes("HOMILETICS") || h.includes("HERMENEUTICS"));
  
  if (hasAdmission && hasCourse) return true;

  // Rule 2: Heuristic - many columns (more than 15) and contains "NAME"
  if (normalizedHeaders.length > 15 && normalizedHeaders.some(h => h.includes("NAME"))) {
    return true;
  }

  return false;
}

/**
 * Transforms a "Wide" format sheet into the standard relational import payload.
 */
export function transformWideSheet(rows: any[]): any {
  if (!rows || rows.length === 0) return { students: [], grades: [] };

  // Use the first row to find headers and normalize them
  const rawHeaders = Object.keys(rows[0]);
  const headerMap: Record<string, string> = {}; // Normalized -> Original
  
  rawHeaders.forEach(h => {
    headerMap[h.toUpperCase().trim()] = h;
  });

  const normalizedHeaders = Object.keys(headerMap);
  const courseColumns: string[] = [];
  const nonCourseColumns: string[] = [];

  // Identify which columns are courses
  for (const norm of normalizedHeaders) {
    if (COURSE_ALIAS_MAP[norm]) {
      courseColumns.push(headerMap[norm]);
    } else {
      nonCourseColumns.push(headerMap[norm]);
    }
  }

  logger.info(`Detected wide format sheet with ${courseColumns.length} course columns.`);
  if (courseColumns.length === 0) {
    logger.warn(
      { rawHeaders },
      "Wide format detected but no course columns identified from headers",
    );
  }

  const grades: any[] = [];
  const students: any[] = [];

  for (const row of rows) {
    try {
      // Find admission number using multiple possible header variations
      const admissionKey = rawHeaders.find(h => h.toUpperCase().trim().includes("ADMISSION NO"));
      const admissionNo = admissionKey ? String(row[admissionKey] || "").trim() : null;
      
      if (!admissionNo) continue;

      // Map student data with flexible headers
      const studentNameKey = rawHeaders.find(h => h.toUpperCase().trim().includes("NAME"));
      const studyCenterKey = rawHeaders.find(h => h.toUpperCase().trim().includes("CENTRE") || h.toUpperCase().trim().includes("LOCATION"));
      const phoneKey = rawHeaders.find(h => h.toUpperCase().trim().includes("PHONE"));
      const emailKey = rawHeaders.find(h => h.toUpperCase().trim().includes("E-MAIL") || h.toUpperCase().trim().includes("EMAIL"));
      const genderKey = rawHeaders.find(h => h.toUpperCase().trim().includes("GENDER"));
      const programmeKey = rawHeaders.find(h => h.toUpperCase().trim().includes("PATH") || h.toUpperCase().trim().includes("PROG"));

      students.push({
        student_number: admissionNo,
        full_name: studentNameKey ? row[studentNameKey] : "",
        study_center: studyCenterKey ? row[studyCenterKey] : "",
        phone: phoneKey ? row[phoneKey] : "",
        email: emailKey ? row[emailKey] : "",
        gender: genderKey ? row[genderKey] : "",
        programme: programmeKey ? row[programmeKey] : "Diploma in Theology & Christian Ministry",
        status: "Active"
      });

      // Create grade records for each course column
      for (const col of courseColumns) {
        const val = String(row[col] || "").trim();
        // Skip empty, NL (No Level), or NR (No Result)
        if (!val || ["NL", "NR", "N/A", "PENDING", "N/R"].includes(val.toUpperCase())) continue;

        // Parse score (handle cases like "81  A-", "75  B+", or just "80")
        const scoreMatch = val.match(/^(\d+)/);
        if (scoreMatch) {
          const score = parseInt(scoreMatch[1]);
          const courseTitle = COURSE_ALIAS_MAP[col.toUpperCase().trim()];
          
          if (courseTitle) {
            grades.push({
              student_code: admissionNo,
              student_number: admissionNo,
              course_code: courseTitle, 
              total_score: score,
              percentage: score,
              academic_year: "2025/2026", 
              semester: "Semester 1"
            });
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Error transforming row in wide sheet");
    }
  }

  return {
    students,
    grades
  };
}






