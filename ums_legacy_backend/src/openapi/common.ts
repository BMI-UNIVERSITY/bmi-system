import { z } from "@hono/zod-openapi";

export const ApiResponseSchema = (dataSchema: any) =>
  z.object({
    success: z.boolean().openapi({ example: true }),
    data: dataSchema.optional(),
    error: z.string().optional().openapi({ example: "Error message" }),
    message: z.string().optional().openapi({ example: "Success message" }),
    meta: z
      .object({
        page: z.number().openapi({ example: 1 }),
        perPage: z.number().openapi({ example: 50 }),
        total: z.number().openapi({ example: 100 }),
      })
      .optional(),
  });

export const ErrorResponseSchema = z.object({
  success: z.boolean().openapi({ example: false }),
  error: z.string().openapi({ example: "Internal Server Error" }),
  message: z.string().optional(),
});






