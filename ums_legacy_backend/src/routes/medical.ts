/**
 * BMI UMS - Medical Routes
 * API-backed CRUD for health center (previously localStorage-only).
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getPocketBase } from '../services/pocketbase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { errorMessage } from '../utils/helpers.js';
import type { ApiResponse } from '../types/index.js';

const medicalRouter = new Hono();
medicalRouter.use('*', authMiddleware);

const medicalVisitSchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  condition: z.string().min(1),
  bloodType: z.string().optional(),
  date: z.string(),
  attendingStaff: z.string().optional(),
  status: z.enum(['Normal', 'Urgent', 'Follow-up']).default('Normal'),
  vitals: z.object({
    temp: z.string().optional(),
    bp: z.string().optional(),
    pulse: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

// GET /api/v1/medical — List all medical visits
medicalRouter.get('/', async (c) => {
  try {
    const pb = getPocketBase();
    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('perPage') || '50');
    const records = await pb.collection('medical_visits').getList(page, perPage, { sort: '-date' });
    return c.json<ApiResponse<any>>({ success: true, data: records.items, meta: { page, perPage, total: records.totalItems } });
  } catch (error) {
    logger.error(`List medical visits error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch medical visits' }, 500);
  }
});

// POST /api/v1/medical — Create a medical visit
medicalRouter.post('/', requireRole('admin', 'staff', 'faculty'), zValidator('json', medicalVisitSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const pb = getPocketBase();
    const record = await pb.collection('medical_visits').create(data);
    return c.json<ApiResponse<any>>({ success: true, data: record }, 201);
  } catch (error) {
    logger.error(`Create medical visit error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to create medical visit' }, 500);
  }
});

// PATCH /api/v1/medical/:id — Update a medical visit
medicalRouter.patch('/:id', requireRole('admin', 'staff'), zValidator('json', medicalVisitSchema.partial()), async (c) => {
  try {
    const id = c.req.param('id')!;
    const data = c.req.valid('json');
    const pb = getPocketBase();
    const record = await pb.collection('medical_visits').update(id, data);
    return c.json<ApiResponse<any>>({ success: true, data: record });
  } catch (error) {
    logger.error(`Update medical visit error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to update medical visit' }, 500);
  }
});

// DELETE /api/v1/medical/:id — Delete a medical visit
medicalRouter.delete('/:id', requireRole('admin', 'staff'), async (c) => {
  try {
    const id = c.req.param('id')!;
    const pb = getPocketBase();
    await pb.collection('medical_visits').delete(id);
    return c.json<ApiResponse<any>>({ success: true, data: null });
  } catch (error) {
    logger.error(`Delete medical visit error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to delete medical visit' }, 500);
  }
});

export default medicalRouter;






