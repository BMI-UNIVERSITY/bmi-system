// BMI UMS - Ollama (Local LLM) Service
import { CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { fetchWithTimeout } from '../utils/helpers.js';

const OLLAMA_API_URL = CONFIG.OLLAMA_URL;

/**
 * Generate AI response using local Ollama LLM
 * Replaces Google Gemini - 100% offline, zero data leaves server
 */
export async function generateAIResponse(
  prompt: string,
  context?: string
): Promise<string> {
  const systemPrompt = `You are the BMI University AI Assistant, a high-level institutional advisor for the BMI University Management System.

BMI University is a prestigious institution known for its specialized faculties:
1. School of Theology (Dean: Dr. Samuel Kiptoo)
2. Department of ICT (Lead: Prof. Alice Mwangi)
3. School of Business (Lead: Dr. Jane Okumu)
4. Education Department (Lead: Prof. Peter Kamau)

Institutional Data Context:
- Total Students: ~3,600
- Total Staff: ~150
- Motto: "Excellence in Faith and Knowledge"
- Location: Main campus with Bethlehem Hall and Eden Residence.

Formatting Rules:
- NEVER use Markdown stars (like ** or *).
- NEVER use HTML tags (like <b>, <i>, <br>).
- Use ONLY plain text.
- Put titles, subtitles, and headers on their own lines.
- End headers with a colon (:) to allow the system to identify and bold them visually.

Standard Signature Block (Use Exactly):
In Excellence,
Office of the Registrar
BMI University
"Excellence in Faith and Knowledge"

Your role is to help administrators with data analysis, drafting official communications, summarizing financial reports, and providing academic insights.
Always be professional, concise, and helpful. Use institutional terminology where appropriate.

Current User Context: ${context || 'General Administrator'}`;

  try {
    logger.info({ model: CONFIG.OLLAMA_MODEL }, "Sending request to Ollama");
    
    const response = await fetchWithTimeout(`${OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.OLLAMA_MODEL,
        prompt: `${systemPrompt}\n\nUser Query: ${prompt}`,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.95,
          num_predict: 1024,
        },
      }),
    }, 15000); // 15s timeout for generation

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { response: string };
    
    logger.info(
      {
        promptLength: prompt.length,
        responseLength: data.response.length,
      },
      "Ollama response received",
    );
    
    return data.response.trim();
  } catch (error) {
    logger.error({ err: error }, "Ollama API error");
    
    return `I apologize, but the local AI service is temporarily unavailable. 
Please ensure Ollama is running with the ${CONFIG.OLLAMA_MODEL} model.
You can start it with: ollama run ${CONFIG.OLLAMA_MODEL}

If the issue persists, contact the ICT department.`;
  }
}

/**
 * OpenAI-compatible chat completions API
 * Drop-in replacement for OpenAI/Gemini APIs
 */
export async function chatCompletions(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  } = {}
): Promise<{
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}> {
  const { temperature = 0.7, max_tokens = 1024 } = options;
  
  try {
    const response = await fetchWithTimeout(`${OLLAMA_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.OLLAMA_MODEL,
        messages,
        temperature,
        max_tokens,
      }),
    }, 15000);

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    return await response.json() as {
      id: string;
      object: string;
      created: number;
      model: string;
      choices: Array<{
        index: number;
        message: { role: string; content: string };
        finish_reason: string;
      }>;
    };
  } catch (error) {
    logger.error({ err: error }, "Ollama chat completions error");
    throw error;
  }
}

/**
 * Check if Ollama is running and model is available
 */
export async function checkOllamaHealth(): Promise<{
  running: boolean;
  modelAvailable: boolean;
  error?: string;
}> {
  try {
    // Check if Ollama is running
    const response = await fetchWithTimeout(`${OLLAMA_API_URL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, 3000); // 3s timeout for health check

    if (!response.ok) {
      return {
        running: false,
        modelAvailable: false,
        error: `Ollama not responding: ${response.status}`,
      };
    }

    const data = await response.json() as { models: Array<{ name: string }> };
    const modelNames = data.models.map(m => m.name);
    const modelAvailable = modelNames.some(name => 
      name.includes(CONFIG.OLLAMA_MODEL)
    );

    return {
      running: true,
      modelAvailable,
      error: modelAvailable ? undefined : `Model '${CONFIG.OLLAMA_MODEL}' not found. Run: ollama pull ${CONFIG.OLLAMA_MODEL}`,
    };
  } catch (error) {
    return {
      running: false,
      modelAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}






