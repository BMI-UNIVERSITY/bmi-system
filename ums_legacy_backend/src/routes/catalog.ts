/**
 * Read-only academic catalog (faculties, departments, programs).
 */
import { Hono } from 'hono';
import { getPocketBase } from '../services/pocketbase.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { errorMessage } from '../utils/helpers.js';

const catalogRouter = new Hono();
catalogRouter.use('*', authMiddleware);

catalogRouter.get('/faculties', async (c) => {
  try {
    const pb = getPocketBase();
    const rows = await pb.collection('faculties').getFullList({ sort: 'name' });
    return c.json({ success: true, data: rows });
  } catch (error) {
    logger.error(`catalog faculties: ${errorMessage(error)}`);
    return c.json({ success: false, error: 'Failed to load faculties' }, 500);
  }
});

catalogRouter.get('/departments', async (c) => {
  try {
    const pb = getPocketBase();
    const facultyId = c.req.query('facultyId');
    const filter = facultyId ? `faculty_code = "${facultyId.replace(/["'\\]/g, '')}"` : '';
    const rows = await pb.collection('departments').getFullList({
      sort: 'name',
      ...(filter ? { filter } : {}),
    });
    return c.json({ success: true, data: rows });
  } catch (error) {
    logger.error(`catalog departments: ${errorMessage(error)}`);
    return c.json({ success: false, error: 'Failed to load departments' }, 500);
  }
});

catalogRouter.get('/programs', async (c) => {
  try {
    const pb = getPocketBase();
    const deptId = c.req.query('deptId');
    const filter = deptId ? `dept_code = "${deptId.replace(/["'\\]/g, '')}"` : '';
    const rows = await pb.collection('programs').getFullList({
      sort: 'name',
      ...(filter ? { filter } : {}),
    });
    return c.json({ success: true, data: rows });
  } catch (error) {
    // Collection may not exist yet — return empty data instead of 500
    if ((error as any)?.status === 404) {
      return c.json({ success: true, data: [] });
    }
    logger.error(`catalog programs: ${errorMessage(error)}`);
    return c.json({ success: false, error: 'Failed to load programs' }, 500);
  }
});

catalogRouter.get('/terms', async (c) => {
  try {
    const pb = getPocketBase();
    const rows = await pb.collection('academic_terms').getFullList({ sort: '-start_date' });
    return c.json({ success: true, data: rows });
  } catch (error) {
    if ((error as any)?.status === 404) {
      return c.json({ success: true, data: [] });
    }
    logger.error(`catalog terms: ${errorMessage(error)}`);
    return c.json({ success: false, error: 'Failed to load academic terms' }, 500);
  }
});

catalogRouter.get('/program-courses', async (c) => {
  try {
    const pb = getPocketBase();
    const programId = c.req.query('programId');
    if (!programId) {
      return c.json({ success: false, error: 'programId is required' }, 400);
    }
    const safe = programId.replace(/["'\\]/g, '');
    const rows = await pb.collection('program_courses').getFullList({
      filter: `program_code = "${safe}"`,
      expand: 'course_code',
    });
    return c.json({ success: true, data: rows });
  } catch (error) {
    logger.error(`catalog program-courses: ${errorMessage(error)}`);
    return c.json({ success: false, error: 'Failed to load program courses' }, 500);
  }
});

export default catalogRouter;






