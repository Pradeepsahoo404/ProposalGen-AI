import OpenAI from "openai";
import { config } from "../config";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

const SALES_PROPOSAL_SCHEMA = {
  type: "object" as const,
  properties: {
    client_summary: { type: "string", description: "Brief summary of client needs" },
    extracted_modules: {
      type: "array",
      description: "Modules extracted from client input",
      items: {
        type: "object",
        properties: {
          module_name: { type: "string" },
          description: { type: "string" },
        },
        required: ["module_name", "description"],
        additionalProperties: false,
      },
    },
    ai_enhanced_modules: {
      type: "array",
      description: "AI-improved module suggestions",
      items: {
        type: "object",
        properties: {
          original_module_name: { type: "string" },
          enhanced_name: { type: "string" },
          improvements: { type: "array", items: { type: "string" } },
          why_better: { type: "string" },
        },
        required: ["original_module_name", "enhanced_name", "improvements", "why_better"],
        additionalProperties: false,
      },
    },
    phased_roadmap: {
      type: "array",
      description: "Implementation phases",
      items: {
        type: "object",
        properties: {
          phase: { type: "string" },
          description: { type: "string" },
          duration_weeks: { type: "number" },
        },
        required: ["phase", "description", "duration_weeks"],
        additionalProperties: false,
      },
    },
    pricing_options: {
      type: "array",
      description: "Pricing tiers",
      items: {
        type: "object",
        properties: {
          option_name: { type: "string" },
          total_price_usd: { type: "number" },
          breakdown: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                cost_usd: { type: "number" },
              },
              required: ["item", "cost_usd"],
              additionalProperties: false,
            },
          },
        },
        required: ["option_name", "total_price_usd", "breakdown"],
        additionalProperties: false,
      },
    },
    final_proposal_text: {
      type: "string",
      description: "Full proposal in Markdown",
    },
  },
  required: [
    "client_summary",
    "extracted_modules",
    "ai_enhanced_modules",
    "phased_roadmap",
    "pricing_options",
    "final_proposal_text",
  ],
  additionalProperties: false,
};

export type GeneratedProposal = {
  client_summary: string;
  extracted_modules: Array<{ module_name: string; description: string }>;
  ai_enhanced_modules: Array<{
    original_module_name: string;
    enhanced_name: string;
    improvements: string[];
    why_better: string;
  }>;
  phased_roadmap: Array<{
    phase: string;
    description: string;
    duration_weeks: number;
  }>;
  pricing_options: Array<{
    option_name: string;
    total_price_usd: number;
    breakdown: Array<{ item: string; cost_usd: number }>;
  }>;
  final_proposal_text: string;
};

const SYSTEM_PROMPT = `You are an expert pre-sales consultant for software development. Analyze client requirements, extract modules, suggest AI-enhanced versions, create a realistic phased roadmap and pricing, and output a full Markdown proposal. Always respond with valid JSON matching the required schema.`;

export async function generateProposal(inputText: string): Promise<GeneratedProposal> {
  if (!config.openaiApiKey) {
    throw new Error("openaiApiKey is not configured");
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Client raw input:\n\n${inputText}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "SalesProposal",
        strict: true,
        schema: SALES_PROPOSAL_SCHEMA,
      },
    },
    temperature: 0.3,
    max_tokens: 4000,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  const parsed = JSON.parse(content) as GeneratedProposal;
  return parsed;
}
