import { getPocketBase } from "./pocketbase.js";
import { CONFIG } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from "../utils/helpers.js";

const sanitize = (v: string): string =>
  v.replace(/["'\\]/g, "").substring(0, 100);

function calculateGrade(percentage: number) {
  let gradeLetter = "F";
  let gpa = 0.0;
  if (percentage >= 90) {
    gradeLetter = "A";
    gpa = 4.0;
  } else if (percentage >= 80) {
    gradeLetter = "B";
    gpa = 3.0;
  } else if (percentage >= 70) {
    gradeLetter = "C";
    gpa = 2.0;
  } else if (percentage >= 60) {
    gradeLetter = "D";
    gpa = 1.0;
  }
  return { grade_letter: gradeLetter, gpa };
}

export async function importRelationalData(data: any) {
  const pb = getPocketBase();

  // Load study centers map
  const studyCenterMap = new Map<string, string>();
  try {
    const centersList = await pb.collection("study_centers").getFullList();
    centersList.forEach(c => {
      studyCenterMap.set(c.name.toLowerCase().trim(), c.id);
    });
  } catch (error) {
    logger.warn(`Failed to load study centers for import mapping: ${errorMessage(error)}`);
  }

  // We will build maps of Codes -> PB IDs
  const maps = {
    faculties: new Map<string, string>(),
    departments: new Map<string, string>(),
    programs: new Map<string, string>(),
    courses: new Map<string, string>(),
    staff: new Map<string, string>(),
    students: new Map<string, string>(),
    enrollments: new Map<string, string>(),
  };

  // Pre-populate maps from existing data to allow partial imports
  try {
    const [facs, depts, progs, crs, stf, stds] = await Promise.all([
      pb.collection("faculties").getFullList({ fields: "id,faculty_code,name" }),
      pb.collection("departments").getFullList({ fields: "id,dept_code,name" }),
      pb.collection("programs").getFullList({ fields: "id,program_code,name" }),
      pb.collection("courses").getFullList({ fields: "id,code,title" }),
      pb.collection("staff").getFullList({ fields: "id,staff_number,full_name" }),
      pb.collection("students").getFullList({ fields: "id,student_number,full_name,student_code,admission_no" }),
    ]);

    const normalize = (s: string) => String(s || "").toLowerCase().trim();

    facs.forEach(f => {
      maps.faculties.set(normalize(f.faculty_code), f.id);
      maps.faculties.set(normalize(f.name), f.id);
    });
    depts.forEach(d => {
      maps.departments.set(normalize(d.dept_code), d.id);
      maps.departments.set(normalize(d.name), d.id);
    });
    progs.forEach(p => {
      maps.programs.set(normalize(p.program_code), p.id);
      maps.programs.set(normalize(p.name), p.id);
    });
    crs.forEach(c => {
      maps.courses.set(normalize(c.code), c.id);
      maps.courses.set(normalize(c.title), c.id);
    });
    stf.forEach(s => {
      maps.staff.set(normalize(s.staff_number), s.id);
      maps.staff.set(normalize(s.full_name), s.id);
    });
    stds.forEach(s => {
      maps.students.set(normalize(s.student_number), s.id);
      maps.students.set(normalize(s.student_code), s.id);
      maps.students.set(normalize(s.full_name), s.id);
      if (s.admission_no) maps.students.set(normalize(s.admission_no), s.id);
    });
    
    logger.info(`Pre-populated maps: ${facs.length} faculties, ${depts.length} depts, ${progs.length} programs, ${crs.length} courses, ${stf.length} staff, ${stds.length} students`);
  } catch (error) {
    logger.warn(`Failed to pre-populate maps for import: ${errorMessage(error)}`);
  }

  const programNames = new Map<string, string>();

  /**
   * Normalizes row keys from "Human Readable" to "code_friendly"
   * e.g., "Student Code" -> "student_code", "Reg No" -> "reg_no"
   */
  function normalizeRow(row: any) {
    const normalized: any = {};
    for (const key in row) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, "_");
      normalized[normalizedKey] = row[key];
      
      // Smart mappings for common aliases found in Google Sheets
      if (normalizedKey === "student_code" || normalizedKey === "student_number" || normalizedKey === "id" || normalizedKey === "admission_no") {
        normalized.student_code = row[key];
        normalized.student_number = row[key];
        normalized.admission_no = row[key];
      }
      if (normalizedKey === "staff_number" || normalizedKey === "staff_id") {
        normalized.staff_number = row[key];
        normalized.staff_id = row[key];
      }
      if (normalizedKey === "reg_no" || normalizedKey === "registration_number") {
        normalized.reg_no = row[key];
      }
      if (normalizedKey === "course_code" || normalizedKey === "code" || normalizedKey === "course") {
        normalized.course_code = row[key];
        normalized.code = row[key];
      }
      if (normalizedKey === "programme" || normalizedKey === "program" || normalizedKey === "program_code") {
        normalized.program_code = row[key];
        normalized.programme = row[key];
      }
      if (normalizedKey === "department" || normalizedKey === "dept_code" || normalizedKey === "dept") {
        normalized.dept_code = row[key];
        normalized.department = row[key];
      }
      if (normalizedKey === "faculty" || normalizedKey === "faculty_code") {
        normalized.faculty_code = row[key];
        normalized.faculty = row[key];
      }
      if (normalizedKey === "campus" || normalizedKey === "study_center") {
        normalized.study_center = row[key];
        normalized.campus = row[key];
      }
      if (normalizedKey === "percentage" || normalizedKey === "total_score" || normalizedKey === "score" || normalizedKey === "marks") {
        normalized.percentage = row[key];
        normalized.total_score = row[key];
      }
      if (normalizedKey === "ca_score" || normalizedKey === "cat_score" || normalizedKey === "coursework") {
        normalized.ca_score = row[key];
      }
      if (normalizedKey === "academic_year" || normalizedKey === "year") {
        normalized.academic_year = row[key];
      }
    }
    return normalized;
  }

  const results = {
    faculties: 0,
    departments: 0,
    programs: 0,
    courses: 0,
    program_courses: 0,
    staff: 0,
    students: 0,
    enrollments: 0,
    grades: 0,
  };

  // Helper to ensure database schema matches the incoming data (Auto-create missing fields)
  async function ensureSchema(collectionName: string, row: any) {
    // Stop runtime schema mutation in production.
    // All schema changes must be done via migrations.
    if (CONFIG.NODE_ENV === "production") return;

    try {
      const collection = await pb.collections.getOne(collectionName);
      const existingFields = new Set(collection.schema.map((f: any) => f.name));
      let changed = false;

      for (const key in row) {
        // Skip keys that start with underscore or are already in schema
        if (key.startsWith("_") || existingFields.has(key)) continue;

        // Auto-create missing field
        const val = row[key];
        let type = "text";
        let options: any = {};

        if (typeof val === "number") {
          type = "number";
        } else if (typeof val === "boolean") {
          type = "bool";
        } else if (val instanceof Date) {
          type = "date";
        }

        collection.schema.push({
          name: key,
          type: type,
          required: false,
          presentable: false,
          unique: false,
          options: options
        });
        changed = true;
        logger.info(`Auto-creating missing field "${key}" in collection "${collectionName}"`);
      }

      if (changed) {
        await pb.collections.update(collection.id, collection);
      }
    } catch (error) {
      logger.error(
        { err: error },
        `Failed to sync schema for collection ${collectionName}`,
      );
    }
  }

  // Helper to find or create
  async function findOrCreate(
    collection: string,
    filterField: string,
    filterValue: string,
    createData: any,
    mapKey?: keyof typeof maps,
    mapCode?: string,
  ) {
    if (!filterValue) return null;
    
    // Auto-migrate schema before performing operation
    await ensureSchema(collection, createData);

    try {
      const safeValue = sanitize(String(filterValue));
      const existing = await pb
        .collection(collection)
        .getFirstListItem(`${filterField}="${safeValue}"`);
      
      // Update existing record with new data
      const updated = await pb.collection(collection).update(existing.id, createData);
      
      if (mapKey && mapCode) {
        const normCode = String(mapCode).toLowerCase().trim();
        maps[mapKey].set(normCode, updated.id);
        // Also map by name if available
        if (updated.name) maps[mapKey].set(normalize(updated.name), updated.id);
        if (updated.full_name) maps[mapKey].set(normalize(updated.full_name), updated.id);
        if (updated.title) maps[mapKey].set(normalize(updated.title), updated.id);
      }
      results[collection as keyof typeof results]++;
      return updated;
    } catch (error) {
      // Not found, create
      try {
        const created = await pb.collection(collection).create(createData);
        if (mapKey && mapCode) {
          const normCode = String(mapCode).toLowerCase().trim();
          maps[mapKey].set(normCode, created.id);
          if (created.name) maps[mapKey].set(normalize(created.name), created.id);
          if (created.full_name) maps[mapKey].set(normalize(created.full_name), created.id);
          if (created.title) maps[mapKey].set(normalize(created.title), created.id);
        }
        results[collection as keyof typeof results]++;
        return created;
      } catch (createErr) {
        logger.error(
          { err: createErr, data: createData },
          `Failed to create ${collection}`,
        );
        return null;
      }
    }
  }

  logger.info("Starting relational import service processing");

  const normalize = (s: string) => String(s || "").toLowerCase().trim();

  // 1. Faculties
  for (const rawRow of data.faculties || []) {
    const row = normalizeRow(rawRow);
    await findOrCreate(
      "faculties",
      "faculty_code",
      row.faculty_code,
      row,
      "faculties",
      row.faculty_code,
    );
  }

  // 2. Departments
  for (const rawRow of data.departments || []) {
    const row = normalizeRow(rawRow);
    const facId = maps.faculties.get(normalize(row.faculty_code));
    if (facId) {
      await findOrCreate(
        "departments",
        "dept_code",
        row.dept_code,
        { ...row, faculty_code: facId },
        "departments",
        row.dept_code,
      );
    } else {
      logger.warn(`Skipping department ${row.dept_code}: Faculty ${row.faculty_code} not found`);
    }
  }

  // 3. Programs
  for (const rawRow of data.programs || []) {
    const row = normalizeRow(rawRow);
    const deptId = maps.departments.get(normalize(row.dept_code));
    if (deptId) {
      const record = await findOrCreate(
        "programs",
        "program_code",
        row.program_code,
        { ...row, dept_code: deptId },
        "programs",
        row.program_code,
      );
      if (record) {
        programNames.set(record.id, row.name);
      }
    } else {
      logger.warn(`Skipping program ${row.program_code}: Department ${row.dept_code} not found`);
    }
  }

  // 4. Courses
  for (const rawRow of data.courses || []) {
    const row = normalizeRow(rawRow);
    await findOrCreate(
      "courses",
      "code",
      row.code,
      {
        ...row,
        credit_hours: Number(row.credits || row.credit_hours || 3)
      },
      "courses",
      row.code,
    );
  }

  // 5. Program Courses
  for (const rawRow of data.program_courses || []) {
    const row = normalizeRow(rawRow);
    const progId = maps.programs.get(normalize(row.program_code));
    const crsId = maps.courses.get(normalize(row.course_code || row.code));
    if (progId && crsId) {
      const createData = { ...row, program_code: progId, course_code: crsId };
      await ensureSchema("program_courses", createData);
      try {
        const ex = await pb
          .collection("program_courses")
          .getFirstListItem(
            `program_code="${progId}" && course_code="${crsId}"`,
          );
        await pb.collection("program_courses").update(ex.id, createData);
        results.program_courses++;
      } catch (error) {
        try {
          await pb
            .collection("program_courses")
            .create(createData);
          results.program_courses++;
        } catch (error) {
          /* ignore */
        }
      }
    } else {
      if (!progId) logger.warn(`Skipping program_course: Program ${row.program_code} not found`);
      if (!crsId) logger.warn(`Skipping program_course: Course ${row.course_code} not found`);
    }
  }

  // 6. Staff
  for (const rawRow of data.staff || []) {
    const row = normalizeRow(rawRow);
    const deptId = maps.departments.get(normalize(row.dept_code || row.department));
    if (deptId) {
      await findOrCreate(
        "staff",
        "staff_number",
        row.staff_number,
        { ...row, dept_code: deptId },
        "staff",
        row.staff_number,
      );
    } else {
      logger.warn(`Skipping staff ${row.staff_number}: Department ${row.dept_code || row.department} not found`);
    }
  }

  // 7. Students
  for (const rawRow of data.students || []) {
    const row = normalizeRow(rawRow);
    const progId = maps.programs.get(normalize(row.program_code || row.programme));
    if (progId) {
      let statusVal = "Active";
      if (row.status) {
        const capitalized = row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase();
        if (["Active", "Inactive", "Graduated", "Suspended"].includes(capitalized)) {
          statusVal = capitalized;
        }
      }
      
      let studyCenterId = "";
      if (row.study_center || row.campus) {
        const key = String(row.study_center || row.campus).toLowerCase().trim();
        const normKey =
          key === "main" || key === "nairobi" ? "nairobi (main)" : key;
        studyCenterId = studyCenterMap.get(normKey) || "";
      }

      const programName = programNames.get(progId) || row.programme || "";

      await findOrCreate(
        "students",
        "student_number",
        row.student_number,
        {
          ...row,
          program_code: progId,
          programme: programName,
          student_code: row.student_code || row.student_number,
          admission_no: row.admission_no || row.student_number,
          full_name: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim(),
          status: statusVal,
          study_center_id: studyCenterId || undefined
        },
        "students",
        row.student_number,
      );
    } else {
      logger.warn(`Skipping student ${row.student_number || row.student_code}: Program ${row.program_code || row.programme} not found`);
    }
  }

  // 8. Enrollments
  for (const rawRow of data.enrollments || []) {
    const row = normalizeRow(rawRow);
    const studentId = maps.students.get(normalize(row.student_number || row.student_code));
    const courseId = maps.courses.get(normalize(row.course_code || row.code));
    if (studentId && courseId) {
      const createData = {
        ...row,
        student_number: studentId,
        course_code: courseId,
      };
      await ensureSchema("enrollments", createData);
      try {
        const ex = await pb
          .collection("enrollments")
          .getFirstListItem(
            `student_number="${studentId}" && course_code="${courseId}" && academic_year="${row.academic_year}" && semester="${row.semester}"`,
          );
        await pb.collection("enrollments").update(ex.id, createData);
        maps.enrollments.set(
          normalize(`${row.student_number || row.student_code}_${row.course_code || row.code}`),
          ex.id,
        );
        results.enrollments++;
      } catch (error) {
        try {
          const enrollmentData = {
            ...createData,
            academic_year: row.academic_year || "2025/2026",
            semester: row.semester || "Semester 1"
          };
          const created = await pb
            .collection("enrollments")
            .create(enrollmentData);
          maps.enrollments.set(
            normalize(`${row.student_number || row.student_code}_${row.course_code || row.code}`),
            created.id,
          );
          results.enrollments++;
        } catch (createErr) {
          logger.error(
            { err: createErr, studentId, courseId },
            "Failed to create enrollment",
          );
        }
      }
    } else {
      if (!studentId) logger.warn(`Skipping enrollment: Student ${row.student_number || row.student_code} not found`);
      if (!courseId) logger.warn(`Skipping enrollment: Course ${row.course_code || row.code} not found`);
    }
  }

  // 9. Grades
  for (const rawRow of data.grades || []) {
    const row = normalizeRow(rawRow);
    const syncKey = normalize(`${row.student_number || row.student_code}_${row.course_code || row.code}`);
    let enrollmentId = maps.enrollments.get(syncKey);
    
    // Lazy fetch enrollment if not in map
    if (!enrollmentId) {
      const studentId = maps.students.get(normalize(row.student_number || row.student_code || row.admission_no));
      const courseId = maps.courses.get(normalize(row.course_code || row.code || row.title));
      
      if (studentId && courseId) {
        try {
          const ex = await pb.collection("enrollments").getFirstListItem(
            `student_number="${studentId}" && course_code="${courseId}"`
          );
          enrollmentId = ex.id;
          maps.enrollments.set(syncKey, enrollmentId);
        } catch (error) { 
          // Not found, auto-create enrollment if possible
          try {
            const enrollmentData = {
              student_number: studentId,
              course_code: courseId,
              academic_year: row.academic_year || "2025/2026",
              semester: row.semester || "Semester 1"
            };
            await ensureSchema("enrollments", enrollmentData);
            const created = await pb.collection("enrollments").create(enrollmentData);
            enrollmentId = created.id;
            maps.enrollments.set(syncKey, enrollmentId);
            results.enrollments++;
            logger.info(`Auto-created enrollment for grade import: Student ID ${studentId}, Course ID ${courseId}`);
          } catch (createErr) {
            logger.error(
              { err: createErr, studentId, courseId },
              "Failed to auto-create enrollment for grade import",
            );
          }
        }
      } else {
        logger.warn(`Could not find student or course for grade record: student=${row.student_number || row.student_code}, course=${row.course_code || row.code}. Skipping grade.`);
      }
    }

    if (enrollmentId) {
      const { grade_letter, gpa } = calculateGrade(Number(row.percentage || row.total_score || row.score));
      const gradeData = {
        enrollment_id: enrollmentId,
        percentage: Number(row.percentage || row.total_score || row.score),
        grade_letter,
        gpa
      };
      await ensureSchema("grades", gradeData);
      try {
        const ex = await pb
          .collection("grades")
          .getFirstListItem(`enrollment_id="${enrollmentId}"`);
        await pb.collection("grades").update(ex.id, gradeData);
        results.grades++;
      } catch (error) {
        try {
          await pb.collection("grades").create(gradeData);
          results.grades++;
        } catch (createErr) {
          logger.error(
            { err: createErr },
            `Failed to create grade for enrollment ${enrollmentId}`,
          );
        }
      }
    } else {
      logger.warn(`Skipping grade: Enrollment not found for Student ${row.student_number} and Course ${row.course_code}`);
    }
  }

  logger.info({ results }, "Relational import processing completed successfully");
  return results;
}






