import { getGoogleAuth } from "../src/services/googleAuth.js";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config({ path: `${process.cwd()}/.env` });

const PB_URL = (process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090").trim();
const ADMIN_EMAIL = (process.env.POCKETBASE_ADMIN_EMAIL ?? "admin@bmi.edu").trim();
const ADMIN_PASSWORD = (process.env.POCKETBASE_ADMIN_PASSWORD ?? "").trim();
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || "1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg";

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   BMI UMS — Sync PocketBase to Google Sheets             ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // ── Authenticate Google Sheets ─────────────────────────────────────────────
  console.log("🔐  Authenticating Google Sheets API...");
  const auth = getGoogleAuth();
  if (auth.email === "mock@google-auth-fallback.iam.gserviceaccount.com") {
    throw new Error("Google Sheets Service Account credentials are not configured! Cannot write to sheet.");
  }
  const sheets = google.sheets({ version: "v4", auth });
  console.log("✅  Google Sheets authenticated");

  // ── Authenticate PocketBase ────────────────────────────────────────────────
  console.log("🔐  Authenticating with PocketBase...");
  const authResp = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!authResp.ok) {
    const txt = await authResp.text();
    throw new Error(`PocketBase authentication failed (${authResp.status}): ${txt}`);
  }
  const authData = await authResp.json() as any;
  const token: string = authData.token;
  console.log("✅  PocketBase authenticated\n");

  // Helper to fetch all records from a collection
  async function fetchAll(collection: string, options: { expand?: string; filter?: string } = {}): Promise<any[]> {
    let page = 1;
    let results: any[] = [];
    const expandQuery = options.expand ? `&expand=${options.expand}` : "";
    const filterQuery = options.filter ? `&filter=${encodeURIComponent(options.filter)}` : "";

    while (true) {
      const url = `${PB_URL}/api/collections/${collection}/records?perPage=200&page=${page}${expandQuery}${filterQuery}`;
      const res = await fetch(url, { headers: { Authorization: token } });
      if (!res.ok) {
        throw new Error(`Failed to fetch from ${collection} (page ${page}): ${res.statusText}`);
      }
      const data = await res.json() as any;
      if (!data.items || data.items.length === 0) break;
      results.push(...data.items);
      if (data.items.length < 200) break;
      page++;
    }
    return results;
  }

  // Helper to clear and write a sheet
  async function writeToSheet(tabName: string, headers: string[], rows: string[][]) {
    process.stdout.write(`   Updating tab "${tabName}" with ${rows.length} rows... `);
    const range = `'${tabName}'!A1:Z15000`;
    
    // Clear old data first
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });

    // Write new data
    const values = [headers, ...rows];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tabName}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
    console.log("SUCCESS");
  }

  // 1. Sync Faculties
  console.log("🏛️  Processing faculties...");
  const faculties = await fetchAll("faculties");
  const facultyRows = faculties.map(f => [f.faculty_code || "", f.name || ""]);
  await writeToSheet("01_FACULTIES", ["faculty_code", "name"], facultyRows);

  // 2. Sync Departments
  console.log("\n🏫  Processing departments...");
  const departments = await fetchAll("departments", { expand: "faculty_code" });
  const departmentRows = departments.map(d => [
    d.dept_code || "",
    d.name || "",
    d.expand?.faculty_code?.faculty_code || ""
  ]);
  await writeToSheet("02_DEPARTMENTS", ["dept_code", "name", "faculty_code"], departmentRows);

  // 3. Sync Programs
  console.log("\n📜  Processing programs...");
  const programs = await fetchAll("programs", { expand: "dept_code" });
  const programRows = programs.map(p => [
    p.program_code || "",
    p.name || "",
    p.degree_level || "",
    p.expand?.dept_code?.dept_code || "",
    String(p.total_credits ?? "")
  ]);
  await writeToSheet("03_PROGRAMS", ["program_code", "name", "degree_level", "dept_code", "total_credits"], programRows);

  // 4. Sync Courses
  console.log("\n📖  Processing courses...");
  const courses = await fetchAll("courses");
  const courseRows = courses.map(c => [
    c.code || c.course_code || "",
    c.title || "",
    String(c.credits ?? c.credit_hours ?? ""),
    String(c.is_elective ?? false).toUpperCase()
  ]);
  await writeToSheet("04_COURSES", ["course_code", "title", "credits", "is_elective"], courseRows);

  // 5. Sync Program Courses
  console.log("\n🔗  Processing program courses...");
  const programCourses = await fetchAll("program_courses", { expand: "program_code,course_code" });
  const pcRows = programCourses.map(pc => [
    pc.expand?.program_code?.program_code || "",
    pc.expand?.course_code?.code || pc.expand?.course_code?.course_code || "",
    String(pc.is_required ?? true).toUpperCase(),
    String(pc.sequence_order ?? "")
  ]);
  await writeToSheet("05_PROG_COURSES", ["program_code", "course_code", "is_required", "sequence_order"], pcRows);

  // 6. Sync Students
  console.log("\n👩‍🎓  Processing students...");
  const students = await fetchAll("students", { expand: "program_code,study_center_id" });
  const studentRows = students.map(s => [
    s.student_code || s.student_number || "",
    s.first_name || "",
    s.last_name || "",
    s.email || "",
    s.phone || "",
    s.gender || "Male",
    s.expand?.program_code?.program_code || "",
    s.admission_date ? s.admission_date.substring(0, 10) : "",
    s.status || "Active",
    s.expand?.study_center_id?.name || ""
  ]);
  await writeToSheet("07_STUDENTS", [
    "student_number", "first_name", "last_name", "email", "phone",
    "gender", "program_code", "admission_date", "status", "campus"
  ], studentRows);

  // 7. Sync Enrollments
  console.log("\n📝  Processing enrollments...");
  const enrollments = await fetchAll("enrollments", { expand: "student_number,course_code" });
  const enrollmentRows = enrollments.map(e => [
    e.expand?.student_number?.student_code || e.expand?.student_number?.student_number || "",
    e.expand?.course_code?.code || e.expand?.course_code?.course_code || "",
    e.academic_year || "",
    e.semester || ""
  ]);
  await writeToSheet("08_ENROLLMENTS", ["student_number", "course_code", "academic_year", "semester"], enrollmentRows);

  // 8. Sync Grades
  console.log("\n📊  Processing grades...");
  const grades = await fetchAll("grades", { expand: "student_id,course_id,enrollment_id" });
  const gradeRows = grades.map(g => {
    const studentCode = g.expand?.student_id?.student_code || g.expand?.student_id?.student_number || "";
    const courseCode = g.expand?.course_id?.code || g.expand?.course_id?.course_code || "";
    
    // Fallback semester string derived from semester_number
    let semStr = g.expand?.enrollment_id?.semester || `SEMESTER ${g.semester_number || 1}`;
    
    return [
      studentCode,
      courseCode,
      g.academic_year || g.expand?.enrollment_id?.academic_year || "",
      semStr,
      String(g.total_score ?? g.percentage ?? 0)
    ];
  });
  await writeToSheet("09_GRADES", ["student_number", "course_code", "academic_year", "semester", "percentage"], gradeRows);

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   ✅  All V2 data successfully synced to Google Sheet!  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
}

main().catch(e => {
  console.error("\n❌ Fatal error in Google Sheets Sync:", e?.message ?? e);
  process.exit(1);
});
