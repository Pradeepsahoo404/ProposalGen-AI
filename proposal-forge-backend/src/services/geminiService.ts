import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";
import type { GeneratedProposal } from "./openaiService";

const JSON_SCHEMA_DESC = `
Respond with a single valid JSON object (no markdown, no code fence) with exactly these keys:
- client_summary (string): brief summary of client needs
- extracted_modules (array of { module_name: string, description: string })
- ai_enhanced_modules (array of { original_module_name: string, enhanced_name: string, improvements: string[], why_better: string })
- phased_roadmap (array of { phase: string, description: string, duration_weeks: number })
- pricing_options (array of { option_name: string, total_price_usd: number, breakdown: array of { item: string, cost_usd: number } })
- final_proposal_text (string): full proposal in Markdown
`;

const SYSTEM_PROMPT = `You are an expert pre-sales consultant for software development. Analyze client requirements, extract modules, suggest AI-enhanced versions, create a realistic phased roadmap and pricing, and output a full Markdown proposal. ${JSON_SCHEMA_DESC}`;

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence) return fence[1].trim();
  return trimmed;
}

export async function generateProposalWithGemini(inputText: string): Promise<GeneratedProposal> {
  if (!config.geminiApiKey) {
    throw new Error("geminiApiKey is not configured");
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  // If GEMINI_MODEL is set, use only that; else try multiple IDs (v1beta availability varies)
  const modelIds = config.geminiModel
    ? [config.geminiModel]
    : ["gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-pro"];
  const prompt = `${SYSTEM_PROMPT}\n\nClient raw input:\n\n${inputText}\n\nRespond with only the JSON object, no other text.`;

  let text: string | null = null;
  let lastErr: unknown = null;

  for (const modelId of modelIds) {
    try {
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent(prompt);
      const response = result.response;
      text = response.text();
      if (text) break;
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      const is404 = status === 404;
      const is429 = status === 429; // quota/rate limit – try next model (each model has its own quota)
      if (is404 || is429) continue;
      throw err;
    }
  }

  if (!text) {
    throw lastErr || new Error("No content in Gemini response");
  }

  const raw = extractJson(text);
  const parsed = JSON.parse(raw) as GeneratedProposal;

  if (!parsed.client_summary || !Array.isArray(parsed.extracted_modules)) {
    throw new Error("Gemini response missing required proposal fields");
  }

  parsed.ai_enhanced_modules = Array.isArray(parsed.ai_enhanced_modules) ? parsed.ai_enhanced_modules : [];
  parsed.phased_roadmap = Array.isArray(parsed.phased_roadmap) ? parsed.phased_roadmap : [];
  parsed.pricing_options = Array.isArray(parsed.pricing_options) ? parsed.pricing_options : [];
  parsed.final_proposal_text = typeof parsed.final_proposal_text === "string" ? parsed.final_proposal_text : "";

  return parsed;
}
