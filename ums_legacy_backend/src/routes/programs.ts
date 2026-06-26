import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getPocketBase } from '../services/pocketbase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { errorMessage } from '../utils/helpers.js';
import type { ApiResponse } from '../types/index.js';

const programsRouter = new Hono();

programsRouter.use('*', authMiddleware);

const programCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  abbreviation: z.string().optional(),
  degree_type: z.string().optional(),
  level: z.enum(['certificate', 'diploma', 'bachelor', 'master', 'doctorate']),
  faculty_id: z.string().min(1),
  department_id: z.string().min(1),
  duration_years: z.number().positive(),
  total_credit_hours: z.number().positive(),
  total_semesters: z.number().positive(),
  mode_of_study: z.enum(['full_time', 'part_time', 'distance', 'hybrid']).optional(),
  accreditation_body: z.string().optional(),
  entry_requirements: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional().default(true),
});

// GET /api/v1/programs
programsRouter.get('/', async (c) => {
  try {
    const pb = getPocketBase();
    const level = c.req.query('level');
    const departmentId = c.req.query('department_id');
    const isActive = c.req.query('is_active');

    const filters: string[] = [];
    if (level) filters.push(`level = "${level}"`);
    if (departmentId) filters.push(`department_id = "${departmentId}"`);
    if (isActive) filters.push(`is_active = ${isActive === 'true'}`);

    const filterString = filters.length > 0 ? filters.join(' && ') : '';

    const programs = await pb.collection('programs').getFullList({
      sort: 'name',
      ...(filterString ? { filter: filterString } : {}),
      expand: 'faculty_id,department_id',
    });

    return c.json<ApiResponse<any[]>>({
      success: true,
      data: programs,
    });
  } catch (error) {
    logger.error(`List programs error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch programs',
      },
    }, 500);
  }
});

// GET /api/v1/programs/:id
programsRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const pb = getPocketBase();

    // Fetch program details
    const program = await pb.collection('programs').getOne(id, {
      expand: 'faculty_id,department_id',
    });

    // Fetch courses linked to this program
    // courses collection has relation program_ids (relation[]) or department_id
    const courses = await pb.collection('courses').getFullList({
      filter: `program_ids ~ "${id}" || department_id = "${program.department_id}"`,
      sort: 'code',
    });

    return c.json<ApiResponse<any>>({
      success: true,
      data: {
        ...program,
        courses,
      },
    });
  } catch (error) {
    logger.error(`Get program details error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Program not found',
      },
    }, 404);
  }
});

// POST /api/v1/programs (Admin only)
programsRouter.post('/', requireRole('admin'), zValidator('json', programCreateSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const pb = getPocketBase();
    const program = await pb.collection('programs').create(data);

    return c.json<ApiResponse<any>>({
      success: true,
      data: program,
    }, 201);
  } catch (error) {
    logger.error(`Create program error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create program',
      },
    }, 500);
  }
});

// PATCH /api/v1/programs/:id (Admin only)
programsRouter.patch('/:id', requireRole('admin'), zValidator('json', programCreateSchema.partial()), async (c) => {
  try {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const pb = getPocketBase();
    const program = await pb.collection('programs').update(id, data);

    return c.json<ApiResponse<any>>({
      success: true,
      data: program,
    });
  } catch (error) {
    logger.error(`Update program error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update program',
      },
    }, 500);
  }
});

export default programsRouter;






