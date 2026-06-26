import { getPocketBase } from "./pocketbase.js";
import { logger } from "../utils/logger.js";
import { getGoogleSheetRange, updateGoogleSheetRange, appendGoogleSheetRow } from "./googleAuth.js";
import { errorMessage } from "../utils/helpers.js";

interface SyncJob {
  id: string;
  name: string;
  run: () => Promise<void>;
}

class SheetsSyncQueue {
  private queue: SyncJob[] = [];
  private isProcessing = false;
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || "1Y0oxI5QUpncZ9m5T48czz4F-vi04vTEWSZVz-PW_mzg";
  }

  /**
   * Enqueues a generic async function to be run sequentially.
   */
  public enqueue(name: string, run: () => Promise<void>) {
    const job: SyncJob = {
      id: Math.random().toString(36).substring(7),
      name,
      run,
    };
    this.queue.push(job);
    logger.info(`[SheetsSyncQueue] Enqueued job: ${name} (ID: ${job.id})`);
    this.processNext();
  }

  private async processNext() {
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift()!;

    try {
      logger.info(`[SheetsSyncQueue] Starting job: ${job.name} (ID: ${job.id})`);
      await job.run();
      logger.info(`[SheetsSyncQueue] Completed job: ${job.name} (ID: ${job.id})`);
    } catch (error) {
      logger.error(`[SheetsSyncQueue] Error in job ${job.name} (ID: ${job.id}): ${errorMessage(error)}`);
    } finally {
      this.isProcessing = false;
      this.processNext();
    }
  }

  /**
   * Enqueues a student synchronization task.
   */
  public enqueueStudentSync(action: 'create' | 'update' | 'delete', studentId: string) {
    this.enqueue(`student_${action}_${studentId}`, async () => {
      const pb = getPocketBase();

      let student: any;
      try {
        student = await pb.collection("students").getOne(studentId, {
          expand: "program_code,study_center_id",
        });
      } catch (error) {
        if (action === 'delete') {
          logger.warn(`[SheetsSyncQueue] Student ${studentId} not found in DB for delete, skipping sync.`);
          return;
        }
        throw error;
      }

      const studentCode = student.student_code || student.student_number || "";
      const regNo = student.reg_no || "";
      const fullName = student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim();
      const gender = student.gender || "Male";
      const dob = student.date_of_birth ? student.date_of_birth.substring(0, 10) : "";
      const nationality = student.nationality || "Kenyan";
      const phone = student.phone || "";
      const email = student.email || "";
      const admissionNo = student.admission_no || studentCode;
      const admissionDate = student.admission_date ? student.admission_date.substring(0, 10) : "";
      const programme = student.programme || student.expand?.program_code?.name || "";
      const status = student.status || "Active";
      const campus = student.expand?.study_center_id?.name || student.expand?.campus?.name || "";

      const tabName = "07_STUDENTS";
      const range = `'${tabName}'!A1:M5000`;
      const rows = await getGoogleSheetRange(this.spreadsheetId, range);

      let foundRowIndex = -1;
      if (rows && rows.length > 0) {
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] === studentCode || rows[i][8] === admissionNo) {
            foundRowIndex = i + 1; // 1-indexed
            break;
          }
        }
      }

      const rowValues = [
        studentCode,
        regNo,
        fullName,
        gender,
        dob,
        nationality,
        phone,
        email,
        admissionNo,
        admissionDate,
        programme,
        status,
        campus
      ];

      if (action === 'delete') {
        if (foundRowIndex !== -1) {
          const updateRange = `'${tabName}'!L${foundRowIndex}`;
          await updateGoogleSheetRange(this.spreadsheetId, updateRange, [["Inactive"]]);
          logger.info(`[SheetsSyncQueue] Marked student ${studentCode} as Inactive in sheet at row ${foundRowIndex}`);
        }
      } else if (foundRowIndex !== -1) {
        const updateRange = `'${tabName}'!A${foundRowIndex}:M${foundRowIndex}`;
        await updateGoogleSheetRange(this.spreadsheetId, updateRange, [rowValues]);
        logger.info(`[SheetsSyncQueue] Updated student ${studentCode} in sheet at row ${foundRowIndex}`);
      } else {
        await appendGoogleSheetRow(this.spreadsheetId, `'${tabName}'!A:M`, [rowValues]);
        logger.info(`[SheetsSyncQueue] Appended student ${studentCode} to sheet`);
      }
    });
  }

  /**
   * Enqueues a grade synchronization task.
   */
  public enqueueGradeSync(gradeId: string) {
    this.enqueue(`grade_sync_${gradeId}`, async () => {
      const pb = getPocketBase();
      
      let grade: any;
      try {
        // Try both collections as the system seems to use both
        try {
          grade = await pb.collection("grades").getOne(gradeId, {
            expand: "enrollment_id.student_number,enrollment_id.course_code,student_id,course_id",
          });
        } catch (error) {
          grade = await pb.collection("academic_records").getOne(gradeId, {
            expand: "student,course",
          });
        }
      } catch (error) {
        logger.warn(`[SheetsSyncQueue] Grade record ${gradeId} not found, skipping sync.`);
        return;
      }

      const student = grade.expand?.student_id || grade.expand?.student || grade.expand?.enrollment_id?.expand?.student_number;
      const course = grade.expand?.course_id || grade.expand?.course || grade.expand?.enrollment_id?.expand?.course_code;
      
      const studentCode = student?.student_code || student?.student_number;
      const courseCode = course?.code || course?.course_code;
      const totalScore = grade.total_score ?? grade.percentage ?? 0;
      const caScore = grade.ca_score ?? grade.cat_1_score ?? 0;
      const examScore = grade.exam_score ?? 0;
      const letterGrade = grade.letter_grade || grade.grade_letter || grade.grade || "";
      const gradePoints = grade.grade_points ?? grade.gpa ?? 0;
      const remarks = grade.remarks || (totalScore >= 50 ? "Pass" : "Fail");
      const academicYear = grade.academic_year || grade.expand?.enrollment_id?.academic_year || "2024/2025";

      if (!studentCode || !courseCode) {
        logger.warn(`[SheetsSyncQueue] Missing metadata for grade ${gradeId}, skipping sync. Student: ${studentCode}, Course: ${courseCode}`);
        return;
      }

      const tabName = "09_GRADES";
      const range = `'${tabName}'!A1:I5000`;
      const rows = await getGoogleSheetRange(this.spreadsheetId, range);

      let foundRowIndex = -1;
      if (rows && rows.length > 0) {
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (r[0] === studentCode && r[1] === courseCode) {
            foundRowIndex = i + 1; // 1-indexed
            break;
          }
        }
      }

      const rowValues = [
        studentCode,
        courseCode,
        String(totalScore),
        String(caScore),
        String(examScore),
        letterGrade,
        String(gradePoints),
        remarks,
        academicYear
      ];

      if (foundRowIndex !== -1) {
        const updateRange = `'${tabName}'!A${foundRowIndex}:I${foundRowIndex}`;
        await updateGoogleSheetRange(this.spreadsheetId, updateRange, [rowValues]);
        logger.info(`[SheetsSyncQueue] Updated grade for ${studentCode} - ${courseCode} in sheet at row ${foundRowIndex}`);
      } else {
        await appendGoogleSheetRow(this.spreadsheetId, `'${tabName}'!A:I`, [rowValues]);
        logger.info(`[SheetsSyncQueue] Appended grade for ${studentCode} - ${courseCode} to sheet`);
      }
    });
  }

  /**
   * Enqueues a staff synchronization task.
   */
  public enqueueStaffSync(action: 'create' | 'update' | 'delete', staffId: string) {
    this.enqueue(`staff_${action}_${staffId}`, async () => {
      const pb = getPocketBase();
      let staff: any;
      try {
        staff = await pb.collection("staff").getOne(staffId);
      } catch (error) {
        if (action === 'delete') return;
        throw error;
      }

      const tabName = "06_STAFF";
      const range = `'${tabName}'!A1:F5000`;
      const rows = await getGoogleSheetRange(this.spreadsheetId, range);

      let foundRowIndex = -1;
      if (rows && rows.length > 0) {
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] === staff.staff_number) {
            foundRowIndex = i + 1;
            break;
          }
        }
      }

      const rowValues = [
        staff.staff_number || "",
        staff.full_name || staff.name || "",
        staff.role || "",
        staff.department || "",
        staff.email || "",
        staff.status || "Full-time"
      ];

      if (action === 'delete') {
        if (foundRowIndex !== -1) {
          await updateGoogleSheetRange(this.spreadsheetId, `'${tabName}'!F${foundRowIndex}`, [["Inactive"]]);
        }
      } else if (foundRowIndex !== -1) {
        await updateGoogleSheetRange(this.spreadsheetId, `'${tabName}'!A${foundRowIndex}:F${foundRowIndex}`, [rowValues]);
      } else {
        await appendGoogleSheetRow(this.spreadsheetId, `'${tabName}'!A:F`, [rowValues]);
      }
    });
  }

  /**
   * Enqueues a course synchronization task.
   */
  public enqueueCourseSync(action: 'create' | 'update' | 'delete', courseId: string) {
    this.enqueue(`course_${action}_${courseId}`, async () => {
      const pb = getPocketBase();
      let course: any;
      try {
        course = await pb.collection("courses").getOne(courseId);
      } catch (error) {
        if (action === 'delete') return;
        throw error;
      }

      const tabName = "04_COURSES";
      const range = `'${tabName}'!A1:D5000`;
      const rows = await getGoogleSheetRange(this.spreadsheetId, range);

      let foundRowIndex = -1;
      if (rows && rows.length > 0) {
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] === course.code || rows[i][0] === course.course_code) {
            foundRowIndex = i + 1;
            break;
          }
        }
      }

      const rowValues = [
        course.code || course.course_code || "",
        course.title || course.name || "",
        String(course.credit_hours || course.credits || 0),
        course.category || ""
      ];

      if (action === 'delete') {
        if (foundRowIndex !== -1) {
          await updateGoogleSheetRange(this.spreadsheetId, `'${tabName}'!D${foundRowIndex}`, [["Inactive"]]);
        }
      } else if (foundRowIndex !== -1) {
        await updateGoogleSheetRange(this.spreadsheetId, `'${tabName}'!A${foundRowIndex}:D${foundRowIndex}`, [rowValues]);
      } else {
        await appendGoogleSheetRow(this.spreadsheetId, `'${tabName}'!A:D`, [rowValues]);
      }
    });
  }

  /**
   * Enqueues a study center/campus synchronization task.
   */
  public enqueueCampusSync(action: 'create' | 'update' | 'delete', campusId: string) {
    this.enqueue(`campus_${action}_${campusId}`, async () => {
      const pb = getPocketBase();
      let campus: any;
      try {
        // Try both collection names
        try {
          campus = await pb.collection("study_centers").getOne(campusId);
        } catch (error) {
          campus = await pb.collection("campuses").getOne(campusId);
        }
      } catch (error) {
        if (action === 'delete') return;
        throw error;
      }

      const tabName = "01_CAMPUSES";
      const range = `'${tabName}'!A1:C5000`;
      const rows = await getGoogleSheetRange(this.spreadsheetId, range);

      let foundRowIndex = -1;
      if (rows && rows.length > 0) {
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] === campus.name) {
            foundRowIndex = i + 1;
            break;
          }
        }
      }

      const rowValues = [
        campus.name || "",
        campus.location || "",
        campus.status || "Active"
      ];

      if (action === 'delete') {
        if (foundRowIndex !== -1) {
          await updateGoogleSheetRange(this.spreadsheetId, `'${tabName}'!C${foundRowIndex}`, [["Inactive"]]);
        }
      } else if (foundRowIndex !== -1) {
        await updateGoogleSheetRange(this.spreadsheetId, `'${tabName}'!A${foundRowIndex}:C${foundRowIndex}`, [rowValues]);
      } else {
        await appendGoogleSheetRow(this.spreadsheetId, `'${tabName}'!A:C`, [rowValues]);
      }
    });
  }
}

export const sheetsSyncQueue = new SheetsSyncQueue();






