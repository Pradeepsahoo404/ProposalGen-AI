export type ExtractedModule = { module_name: string; description: string };

export type AiEnhancedModule = {
  original_module_name: string;
  enhanced_name: string;
  improvements: string[];
  why_better: string;
  accepted?: boolean;
};

export type RoadmapPhase = {
  phase: string;
  description: string;
  duration_weeks: number;
};

export type PricingBreakdownItem = { item: string; cost_usd: number };

export type PricingOption = {
  option_name: string;
  total_price_usd: number;
  breakdown: PricingBreakdownItem[];
  discount_percent?: number;
};

export type ProposalEditorFormData = {
  client_summary: string;
  summary_comment: string;
  extracted_modules: ExtractedModule[];
  ai_enhanced_modules: (AiEnhancedModule & { accepted: boolean })[];
  modules_comment: string;
  phased_roadmap: RoadmapPhase[];
  roadmap_comment: string;
  pricing_options: PricingOption[];
  pricing_comment: string;
  final_proposal_text: string;
};

export function generatedToEditorFormData(data: {
  client_summary: string;
  extracted_modules: ExtractedModule[];
  ai_enhanced_modules: AiEnhancedModule[];
  phased_roadmap: RoadmapPhase[];
  pricing_options: { option_name: string; total_price_usd: number; breakdown: PricingBreakdownItem[] }[];
  final_proposal_text: string;
}): ProposalEditorFormData {
  return {
    client_summary: data.client_summary ?? "",
    summary_comment: "",
    extracted_modules: Array.isArray(data.extracted_modules) ? data.extracted_modules : [],
    ai_enhanced_modules: (Array.isArray(data.ai_enhanced_modules) ? data.ai_enhanced_modules : []).map((m) => ({
      ...m,
      accepted: true,
    })),
    modules_comment: "",
    phased_roadmap: Array.isArray(data.phased_roadmap) ? data.phased_roadmap : [],
    roadmap_comment: "",
    pricing_options: (Array.isArray(data.pricing_options) ? data.pricing_options : []).map((o) => ({
      ...o,
      discount_percent: 0,
    })),
    pricing_comment: "",
    final_proposal_text: data.final_proposal_text ?? "",
  };
}

const defaultFormData: ProposalEditorFormData = {
  client_summary: "",
  summary_comment: "",
  extracted_modules: [],
  ai_enhanced_modules: [],
  modules_comment: "",
  phased_roadmap: [],
  roadmap_comment: "",
  pricing_options: [],
  pricing_comment: "",
  final_proposal_text: "",
};

/** Normalize API proposal content (or partial) into ProposalEditorFormData */
export function contentToEditorFormData(content: unknown): ProposalEditorFormData {
  if (!content || typeof content !== "object") return { ...defaultFormData };
  const c = content as Record<string, unknown>;
  return {
    client_summary: typeof c.client_summary === "string" ? c.client_summary : "",
    summary_comment: typeof c.summary_comment === "string" ? c.summary_comment : "",
    extracted_modules: Array.isArray(c.extracted_modules) ? (c.extracted_modules as ExtractedModule[]) : [],
    ai_enhanced_modules: Array.isArray(c.ai_enhanced_modules)
      ? (c.ai_enhanced_modules as (AiEnhancedModule & { accepted?: boolean })[]).map((m) => ({
          ...m,
          accepted: m.accepted !== false,
        }))
      : [],
    modules_comment: typeof c.modules_comment === "string" ? c.modules_comment : "",
    phased_roadmap: Array.isArray(c.phased_roadmap) ? (c.phased_roadmap as RoadmapPhase[]) : [],
    roadmap_comment: typeof c.roadmap_comment === "string" ? c.roadmap_comment : "",
    pricing_options: Array.isArray(c.pricing_options) ? (c.pricing_options as PricingOption[]) : [],
    pricing_comment: typeof c.pricing_comment === "string" ? c.pricing_comment : "",
    final_proposal_text: typeof c.final_proposal_text === "string" ? c.final_proposal_text : "",
  };
}
