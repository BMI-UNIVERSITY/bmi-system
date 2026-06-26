/**
 * BMI UMS - Inventory Routes
 * API-backed CRUD for inventory tracking (previously localStorage-only).
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getPocketBase } from '../services/pocketbase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { errorMessage } from '../utils/helpers.js';
import type { ApiResponse } from '../types/index.js';

const inventoryRouter = new Hono();
inventoryRouter.use('*', authMiddleware);

const inventorySchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  quantity: z.number().int().min(0),
  condition: z.enum(['New', 'Good', 'Fair', 'Poor']).default('New'),
  location: z.string().min(1),
  lastUpdated: z.string().optional(),
});

// GET /api/v1/inventory
inventoryRouter.get('/', async (c) => {
  try {
    const pb = getPocketBase();
    const records = await pb.collection('inventory_items').getFullList({ sort: '-created' });
    return c.json<ApiResponse<any>>({ success: true, data: records });
  } catch (error) {
    logger.error(`List inventory error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch inventory' }, 500);
  }
});

// POST /api/v1/inventory
inventoryRouter.post('/', requireRole('admin', 'staff'), zValidator('json', inventorySchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const pb = getPocketBase();
    const record = await pb.collection('inventory_items').create({
      ...data,
      lastUpdated: new Date().toISOString(),
    });
    return c.json<ApiResponse<any>>({ success: true, data: record }, 201);
  } catch (error) {
    logger.error(`Create inventory item error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to create inventory item' }, 500);
  }
});

// PATCH /api/v1/inventory/:id
inventoryRouter.patch('/:id', requireRole('admin', 'staff'), zValidator('json', inventorySchema.partial()), async (c) => {
  try {
    const id = c.req.param('id')!;
    const data = c.req.valid('json');
    const pb = getPocketBase();
    const record = await pb.collection('inventory_items').update(id, {
      ...data,
      lastUpdated: new Date().toISOString(),
    });
    return c.json<ApiResponse<any>>({ success: true, data: record });
  } catch (error) {
    logger.error(`Update inventory item error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to update inventory item' }, 500);
  }
});

// DELETE /api/v1/inventory/:id
inventoryRouter.delete('/:id', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id')!;
    const pb = getPocketBase();
    await pb.collection('inventory_items').delete(id);
    return c.json<ApiResponse<null>>({ success: true, data: null });
  } catch (error) {
    logger.error(`Delete inventory item error: ${errorMessage(error)}`);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to delete inventory item' }, 500);
  }
});

export default inventoryRouter;






