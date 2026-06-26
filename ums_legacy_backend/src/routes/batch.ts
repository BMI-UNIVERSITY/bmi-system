/**
 * Batch create endpoints (partial failure reporting).
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getPocketBase } from '../services/pocketbase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { generateAvatarColor } from '../utils/helpers.js';
import { randomBytes } from 'crypto';
import { calculateGradeResult } from '../utils/grading.js';
import { logger } from '../utils/logger.js';

const batchRouter = new Hono();
batchRouter.use('*', authMiddleware);

const studentBatchItem = z.object({
  student_number: z.string().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  gender: z.enum(['Male', 'Female']),
  program_code: z.string().min(1),
  admission_date: z.string(),
  status: z.enum(['Active', 'Applicant', 'On Leave', 'Graduated', 'Suspended']).default('Applicant'),
});
const batchStudentsSchema = z.object({ items: z.array(studentBatchItem).min(1).max(200) });

const transactionBatchItem = z.object({
  ref: z.string().min(1),
  name: z.string().min(1),
  desc: z.string(),
  amt: z.number().positive(),
  status: z.enum(['Paid', 'Pending', 'Failed']).default('Pending'),
  date: z.string(),
  studentId: z.string().optional(),
});
const batchTxSchema = z.object({ items: z.array(transactionBatchItem).min(1).max(200) });

const courseBatchItem = z.object({
  name: z.string().min(2),
  code: z.string().min(3),
  faculty: z.string().min(1),
  department: z.string().min(1),
  level: z.enum(['Undergraduate', 'Postgraduate', 'Diploma', 'Certificate']),
  credits: z.number().positive(),
  status: z.enum(['Published', 'Draft', 'Archived']).default('Published'),
  description: z.string().min(5),
  syllabus: z.string().min(5),
});
const batchCoursesSchema = z.object({ items: z.array(courseBatchItem).min(1).max(100) });

const gradeBatchItem = z.object({
  studentId: z.string().min(1),
  courseCode: z.string().min(1),
  academicYear: z.string().min(1),
  semester: z.enum(['Fall', 'Spring', 'Summer']),
  percentage: z.number().min(0).max(100),
});
const batchGradesSchema = z.object({ items: z.array(gradeBatchItem).min(1).max(200) });

batchRouter.post(
  '/students',
  requireRole('admin', 'registrar'),
  zValidator('json', batchStudentsSchema),
  async (c) => {
    const { items } = c.req.valid('json');
    const pb = getPocketBase();
    const created: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const it = { ...items[i] };
        if (!it.student_number) {
          it.student_number = `BMI-${new Date().getFullYear()}-${randomBytes(2).readUInt16BE(0) % 9000 + 1000}`;
        }
        const avatar_color = generateAvatarColor(`${it.first_name} ${it.last_name}`);
        const row = await pb.collection('students').create({
          ...it,
          avatar_color,
          photo_zoom: 1,
          photo_position: { x: 0, y: 0 },
        });
        created.push(row.id);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return c.json({
      success: errors.length === 0,
      data: { createdIds: created, successCount: created.length, failureCount: errors.length, errors },
    });
  }
);

batchRouter.post(
  '/finance/transactions',
  requireRole('admin', 'registrar', 'staff'),
  zValidator('json', batchTxSchema),
  async (c) => {
    const { items } = c.req.valid('json');
    const pb = getPocketBase();
    const created: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const it = items[i];
        const row = await pb.collection('transactions').create({
          ref: it.ref,
          name: it.name,
          desc: it.desc,
          amt: it.amt,
          status: it.status,
          date: it.date,
          ...(it.studentId ? { student_id: it.studentId } : {}),
        });
        created.push(row.id);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return c.json({
      success: errors.length === 0,
      data: { createdIds: created, successCount: created.length, failureCount: errors.length, errors },
    });
  }
);

batchRouter.post(
  '/courses',
  requireRole('admin', 'registrar', 'staff'),
  zValidator('json', batchCoursesSchema),
  async (c) => {
    const { items } = c.req.valid('json');
    const pb = getPocketBase();
    const created: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const it = items[i];
        const row = await pb.collection('courses').create({
          course_code: it.code,
          title: it.name,
          credits: it.credits,
          faculty: it.faculty,
          department: it.department,
          level: it.level,
          status: it.status,
          description: it.description,
          syllabus: it.syllabus,
          is_elective: false,
        });
        created.push(row.id);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return c.json({
      success: errors.length === 0,
      data: { createdIds: created, successCount: created.length, failureCount: errors.length, errors },
    });
  }
);

batchRouter.post(
  '/grades',
  requireRole('admin', 'registrar', 'faculty', 'staff'),
  zValidator('json', batchGradesSchema),
  async (c) => {
    const { items } = c.req.valid('json');
    const pb = getPocketBase();
    const created: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        let studentUuid: string;
        try {
          const s = await pb.collection('students').getFirstListItem(
            `student_number="${it.studentId.replace(/"/g, '')}" || id="${it.studentId.replace(/"/g, '')}"`
          );
          studentUuid = s.id;
        } catch (error) { throw new Error(`Student not found: ${it.studentId }`);
        }

        let courseUuid: string;
        try {
          const crs = await pb.collection('courses').getFirstListItem(`course_code="${it.courseCode.replace(/"/g, '')}"`);
          courseUuid = crs.id;
        } catch (error) { throw new Error(`Course not found: ${it.courseCode }`);
        }

        let enrollmentId: string;
        try {
          const en = await pb.collection('enrollments').getFirstListItem(
            `student_number="${studentUuid}" && course_code="${courseUuid}" && academic_year="${it.academicYear.replace(/"/g, '')}" && semester="${it.semester.replace(/"/g, '')}"`
          );
          enrollmentId = en.id;
        } catch (error) { const en = await pb.collection('enrollments').create({
            student_number: studentUuid,
            course_code: courseUuid,
            academic_year: it.academicYear,
            semester: it.semester,
          });
          enrollmentId = en.id;
        }

        const { letterGrade, gradePoints } = calculateGradeResult(it.percentage);
        const g = await pb.collection('grades').create({
          enrollment_id: enrollmentId,
          percentage: it.percentage,
          grade_letter: letterGrade,
          gpa: gradePoints,
        });
        created.push(g.id);
      } catch (error) {
        logger.warn({ err: error, index: i }, "batch grade row failed");
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return c.json({
      success: errors.length === 0,
      data: { createdIds: created, successCount: created.length, failureCount: errors.length, errors },
    });
  }
);

export default batchRouter;






