// BMI UMS - AI Routes (Local LLM via Ollama)
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  generateAIResponse,
  chatCompletions,
  checkOllamaHealth,
} from "../services/ollama.js";
import { getUser } from "../middleware/auth.js";
import type { AppEnv } from "../types/hono.js";
import { logger } from "../utils/logger.js";
import { errorMessage } from '../utils/helpers.js';
import { ApiResponseSchema, ErrorResponseSchema } from "../openapi/common.js";

const aiRouter = new OpenAPIHono<AppEnv>();

// Validation schemas
const chatSchema = z.object({
  prompt: z.string().min(1).max(10000).openapi({ example: "What is the mission of BMI University?" }),
  context: z.string().max(500).optional().openapi({ example: "Student registry" }),
  stream: z.boolean().default(false).openapi({ example: false }),
}).openapi("ChatRequest");

const openAIChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().max(10000),
      }),
    )
    .min(1)
    .max(50), // cap message history
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().max(4096).optional(),
}).openapi("OpenAIChatRequest");

// Metadata extraction schema with strict size limits
const metadataSchema = z.object({
  fileName: z.string().min(1).max(255).openapi({ example: "diploma.pdf" }),
  fileType: z.string().min(1).max(50).openapi({ example: "application/pdf" }),
  base64Data: z.string().max(500_000).openapi({ example: "..." }), // ~375KB decoded
}).openapi("MetadataExtractionRequest");

/**
 * Strip prompt injection attempts from user input
 */
function sanitizePrompt(input: string): string {
  return input
    .replace(
      /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
      "[filtered]",
    )
    .replace(/system\s*prompt/gi, "[filtered]")
    .replace(/you\s+are\s+now/gi, "[filtered]")
    .replace(/act\s+as\s+(a\s+)?(?!BMI)/gi, "[filtered]")
    .trim();
}

// Route definitions
const chatRoute = createRoute({
  method: "post",
  path: "/chat",
  tags: ["AI"],
  summary: "AI Chat",
  description: "Send a prompt to the local LLM",
  request: {
    body: {
      content: { "application/json": { schema: chatSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.object({ response: z.string() })) } },
      description: "AI response",
    },
    503: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "AI service unavailable",
    },
  },
});

const completionsRoute = createRoute({
  method: "post",
  path: "/completions",
  tags: ["AI"],
  summary: "AI Completions",
  description: "OpenAI-compatible chat completions endpoint",
  request: {
    body: {
      content: { "application/json": { schema: openAIChatSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "AI completions response",
    },
    503: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "AI service unavailable",
    },
  },
});

const chatCompletionsRoute = createRoute({
  method: "post",
  path: "/chat/completions",
  tags: ["AI"],
  summary: "AI Chat Completions",
  description: "OpenAI-compatible chat completions alias",
  request: {
    body: {
      content: { "application/json": { schema: openAIChatSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "AI completions response",
    },
    503: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "AI service unavailable",
    },
  },
});

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["AI"],
  summary: "AI Service Health",
  description: "Check if Ollama and models are available",
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "AI service is healthy",
    },
    503: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "AI service is unhealthy",
    },
  },
});

const extractMetadataRoute = createRoute({
  method: "post",
  path: "/extract-metadata",
  tags: ["AI"],
  summary: "Extract Metadata",
  description: "Extract academic metadata from documents using AI",
  request: {
    body: {
      content: { "application/json": { schema: metadataSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ApiResponseSchema(z.any()) } },
      description: "Extracted metadata",
    },
    500: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Extraction failed",
    },
  },
});

// Implement routes
aiRouter.openapi(chatRoute, async (c) => {
  try {
    const { prompt, context } = c.req.valid("json");
    const user = getUser(c);

    const safePrompt = sanitizePrompt(prompt);
    logger.info({
      user: user?.email,
      promptLength: safePrompt.length,
    }, "AI chat request");

    const response = await generateAIResponse(safePrompt, context);

    return c.json({
      success: true,
      data: { response },
    }, 200);
  } catch (error) {
    logger.error(`AI chat error: ${errorMessage(error)}`);
    return c.json(
      { success: false, error: "AI service temporarily unavailable" },
      503,
    );
  }
});

aiRouter.openapi(completionsRoute, async (c) => {
  try {
    const body = c.req.valid("json");
    const response = await chatCompletions(body.messages, {
      temperature: body.temperature,
      max_tokens: body.max_tokens,
    });
    return c.json({
      success: true,
      data: response,
    }, 200);
  } catch (error) {
    logger.error(`AI completions error: ${errorMessage(error)}`);
    return c.json(
      { success: false, error: "AI service temporarily unavailable" },
      503,
    );
  }
});

aiRouter.openapi(chatCompletionsRoute, async (c) => {
  try {
    const body = c.req.valid("json");
    const response = await chatCompletions(body.messages, {
      temperature: body.temperature,
      max_tokens: body.max_tokens,
    });
    return c.json({
      success: true,
      data: response,
    }, 200);
  } catch (error) {
    logger.error(`AI completions error: ${errorMessage(error)}`);
    return c.json(
      { success: false, error: "AI service temporarily unavailable" },
      503,
    );
  }
});

aiRouter.openapi(healthRoute, async (c) => {
  const health = await checkOllamaHealth();
  const success = health.running && health.modelAvailable;
  return c.json(
    {
      success,
      data: health,
    },
    success ? 200 : 503,
  );
});

aiRouter.openapi(extractMetadataRoute, async (c) => {
  try {
    const { fileName, fileType } = c.req.valid("json");

    const prompt = `Analyze this document and extract metadata.
File: ${sanitizePrompt(fileName)}
Type: ${sanitizePrompt(fileType)}

Provide a JSON response with:
- title: Document title
- author: Author name (if available)
- year: Publication year (if available)
- category: One of [Theology, ICT, Business, Education, General]
- description: Brief 20-word description

Return ONLY valid JSON, no markdown.`;

    const response = await generateAIResponse(prompt);

    let metadata;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      metadata = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (error) { metadata = {
        title: fileName,
        author: "Unknown",
        year: new Date().getFullYear().toString(),
        category: "General",
        description: "Document uploaded to BMI University system",
      };
    }

    return c.json({
      success: true,
      data: metadata,
    }, 200);
  } catch (error) {
    logger.error(`Metadata extraction error: ${errorMessage(error)}`);
    return c.json(
      { success: false, error: "Failed to extract metadata"  },
      500,
    );
  }
});

export default aiRouter;






