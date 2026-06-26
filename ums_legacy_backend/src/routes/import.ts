import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { importRelationalData } from "../services/importService.js";

const importRouter = new Hono();

importRouter.post("/v2", authMiddleware, requireRole("admin", "registrar"), async (c) => {
  try {
    const rawBody = await c.req.json();
    // Use a newer Zod schema that matches the incoming dynamic body for v2
    const v2ImportSchema = z.record(z.string(), z.array(z.record(z.string(), z.any())));
    const parseResult = v2ImportSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return c.json(
        {
          success: false,
          error: "Invalid request format",
          details: parseResult.error.issues,
        },
        400,
      );
    }
    const data = parseResult.data;
    logger.info("Starting V2 Relational Import via endpoint");
    
    const results = await importRelationalData(data);
    
    return c.json({ success: true, results });
  } catch (error) {
    logger.error(`V2 import failed: ${errorMessage(error)}`);
    return c.json({ success: false, error: "Import processing failed" }, 500);
  }
});

export default importRouter;






