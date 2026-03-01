import { config } from "../config";
import type { GeneratedProposal } from "./openaiService";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

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

export async function generateProposalWithPerplexity(inputText: string): Promise<GeneratedProposal> {
  if (!config.perplexityApiKey) {
    throw new Error("perplexityApiKey is not configured");
  }

  const body = {
    model: "sonar",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Client raw input:\n\n${inputText}\n\nRespond with only the JSON object, no other text.` },
    ],
    max_tokens: 4096,
    temperature: 0.3,
  };

  const res = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.perplexityApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Perplexity API ${res.status}: ${errBody || res.statusText}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in Perplexity response");
  }

  const raw = extractJson(content);
  const parsed = JSON.parse(raw) as GeneratedProposal;

  if (!parsed.client_summary || !Array.isArray(parsed.extracted_modules)) {
    throw new Error("Perplexity response missing required proposal fields");
  }

  parsed.ai_enhanced_modules = Array.isArray(parsed.ai_enhanced_modules) ? parsed.ai_enhanced_modules : [];
  parsed.phased_roadmap = Array.isArray(parsed.phased_roadmap) ? parsed.phased_roadmap : [];
  parsed.pricing_options = Array.isArray(parsed.pricing_options) ? parsed.pricing_options : [];
  parsed.final_proposal_text = typeof parsed.final_proposal_text === "string" ? parsed.final_proposal_text : "";

  return parsed;
}
