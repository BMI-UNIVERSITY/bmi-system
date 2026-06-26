/**
 * BMI UMS - Visitors Routes
 * API-backed CRUD for visitor management (previously localStorage-only).
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getPocketBase } from '../services/pocketbase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { errorMessage } from '../utils/helpers.js';
import type { ApiResponse } from '../types/index.js';

const visitorRouter = new Hono();
visitorRouter.use('*', authMiddleware);

const visitorSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  host: z.string().min(1),
  checkIn: z.string(),
  checkOut: z.string().optional(),
  status: z.enum(['Active', 'Checked Out']).default('Active'),
});

// GET /api/v1/visitors
visitorRouter.get('/', async (c) => {
  try {
    const pb = getPocketBase();
    const records = await pb.collection('visitors').getList(1, 100, { sort: '-created' });
    return c.json<ApiResponse<any>>({ success: true, data: records.items });
  } catch (error) {
    logger.error(`List visitors error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch visitors' }, 500);
  }
});

// POST /api/v1/visitors
visitorRouter.post('/', requireRole('admin', 'staff'), zValidator('json', visitorSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const pb = getPocketBase();
    const record = await pb.collection('visitors').create(data);
    return c.json<ApiResponse<any>>({ success: true, data: record }, 201);
  } catch (error) {
    logger.error(`Create visitor error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to create visitor' }, 500);
  }
});

// PATCH /api/v1/visitors/:id — Check out a visitor
visitorRouter.patch('/:id', requireRole('admin', 'staff'), zValidator('json', visitorSchema.partial()), async (c) => {
  try {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const pb = getPocketBase();
    const record = await pb.collection('visitors').update(id, data);
    return c.json<ApiResponse<any>>({ success: true, data: record });
  } catch (error) {
    logger.error(`Update visitor error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to update visitor' }, 500);
  }
});

// DELETE /api/v1/visitors/:id
visitorRouter.delete('/:id', requireRole('admin', 'staff'), async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json<ApiResponse<never>>({ success: false, error: 'ID parameter is required' }, 400);
    }
    const pb = getPocketBase();
    await pb.collection('visitors').delete(id);
    return c.json<ApiResponse<null>>({ success: true, data: null });
  } catch (error) {
    logger.error(`Delete visitor error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to delete visitor' }, 500);
  }
});

export default visitorRouter;






