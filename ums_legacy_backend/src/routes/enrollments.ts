import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getPocketBase } from '../services/pocketbase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { errorMessage } from '../utils/helpers.js';
import type { ApiResponse } from '../types/index.js';

const enrollmentsRouter = new Hono();

enrollmentsRouter.use('*', authMiddleware);

const enrollCreateSchema = z.object({
  student_id: z.string().min(1),
  course_id: z.string().min(1),
  program_id: z.string().min(1),
  term_id: z.string().min(1),
  academic_year: z.string().optional(),
  semester_number: z.number().optional(),
  enrollment_date: z.string().optional().default(() => new Date().toISOString()),
  status: z.enum(['enrolled', 'dropped', 'completed', 'failed', 'incomplete', 'auditing']).optional().default('enrolled'),
});

// GET /api/v1/enrollments
enrollmentsRouter.get('/', async (c) => {
  try {
    const pb = getPocketBase();
    const studentId = c.req.query('student_id');
    const courseId = c.req.query('course_id');
    const termId = c.req.query('term_id');

    const filters: string[] = [];
    if (studentId) filters.push(`student_id = "${studentId}"`);
    if (courseId) filters.push(`course_id = "${courseId}"`);
    if (termId) filters.push(`term_id = "${termId}"`);

    const filterString = filters.length > 0 ? filters.join(' && ') : '';

    const enrollments = await pb.collection('enrollments').getFullList({
      sort: '-enrollment_date',
      ...(filterString ? { filter: filterString } : {}),
      expand: 'student_id,course_id,program_id,term_id',
    });

    return c.json<ApiResponse<any[]>>({
      success: true,
      data: enrollments,
    });
  } catch (error) {
    logger.error(`List enrollments error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch enrollments',
      },
    }, 500);
  }
});

// POST /api/v1/enrollments
enrollmentsRouter.post('/', requireRole('admin', 'registrar', 'staff'), zValidator('json', enrollCreateSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const pb = getPocketBase();
    
    // Check if duplicate enrollment exists
    const duplicate = await pb.collection('enrollments').getList(1, 1, {
      filter: `student_id = "${data.student_id}" && course_id = "${data.course_id}" && term_id = "${data.term_id}" && status = "enrolled"`,
    });

    if (duplicate.totalItems > 0) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'DUPLICATE_ENROLLMENT',
          message: 'Student is already enrolled in this course for the selected term',
        },
      }, 400);
    }

    const enrollment = await pb.collection('enrollments').create(data);

    return c.json<ApiResponse<any>>({
      success: true,
      data: enrollment,
    }, 201);
  } catch (error) {
    logger.error(`Create enrollment error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to enroll student',
      },
    }, 500);
  }
});

// PATCH /api/v1/enrollments/:id/drop
enrollmentsRouter.patch('/:id/drop', requireRole('admin', 'registrar', 'staff'), async (c) => {
  try {
    const id = c.req.param('id')!;
    const pb = getPocketBase();
    
    const enrollment = await pb.collection('enrollments').update(id, {
      status: 'dropped',
    });

    return c.json<ApiResponse<any>>({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    logger.error(`Drop enrollment error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({
      success: false,
      error: {
        code: 'DROP_ERROR',
        message: 'Failed to drop enrollment',
      },
    }, 500);
  }
});

export default enrollmentsRouter;






