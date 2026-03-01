/**
 * Proposal template definitions. Used by TemplateSelector and ProposalPreview.
 * Future: can be loaded from DB or user settings.
 */

export type ProposalTemplateId =
  | "modern-blue"
  | "corporate-minimal"
  | "bold-tech"
  | "elegant-serif"
  | "warm-professional"
  | "slate-executive";

/** Header layout: default (logo left, date right) | centered | minimal (single line) | bold (thick accent line) */
export type HeaderLayout = "default" | "centered" | "minimal" | "bold";
/** Section style: default | cards (each section in a card) | bordered (left border) | minimal (no box) */
export type SectionStyle = "default" | "cards" | "bordered" | "minimal";
/** Pricing table style: default | compact | outline (borders only) | filled (accent header) */
export type PricingStyle = "default" | "compact" | "outline" | "filled";
/** Roadmap style: default (cards + progress) | list (simple list) | compact (tight cards) */
export type RoadmapStyle = "default" | "list" | "compact";
/** Content spacing */
export type ContentSpacing = "default" | "compact" | "spacious";

export type ProposalTemplateTheme = {
  wrapperClass: string;
  headerClass: string;
  mainClass: string;
  headingClass: string;
  accentColor: string;
  bodyClass: string;
  footerClass: string;
  fontFamily?: string;
  /** Full design: header layout */
  headerLayout?: HeaderLayout;
  /** Full design: how sections (summary, modules, roadmap, pricing) are wrapped */
  sectionStyle?: SectionStyle;
  /** Full design: pricing table look */
  pricingStyle?: PricingStyle;
  /** Full design: roadmap block look */
  roadmapStyle?: RoadmapStyle;
  /** Full design: content spacing */
  contentSpacing?: ContentSpacing;
};

export type ProposalTemplate = {
  id: ProposalTemplateId;
  name: string;
  /** Optional image URL (e.g. Unsplash); if missing, premium CSS mockup is shown */
  thumbnailUrl?: string | null;
  /** Optional tag e.g. "Best for Tech", "Corporate", "Creative" */
  tag?: string | null;
  theme: ProposalTemplateTheme;
};

export const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: "modern-blue",
    name: "Modern Blue",
    thumbnailUrl: null,
    tag: "Popular",
    theme: {
      wrapperClass: "bg-white dark:bg-card border-slate-200 dark:border-slate-700",
      headerClass: "bg-white dark:bg-card border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100",
      mainClass: "prose-slate dark:prose-invert",
      headingClass: "text-[#3b82f6] border-[#3b82f6]/30 font-semibold",
      accentColor: "#3b82f6",
      bodyClass: "text-slate-700 dark:text-slate-300",
      footerClass: "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400",
      headerLayout: "default",
      sectionStyle: "default",
      pricingStyle: "default",
      roadmapStyle: "default",
      contentSpacing: "default",
    },
  },
  {
    id: "corporate-minimal",
    name: "Corporate Minimal",
    thumbnailUrl: null,
    tag: "Corporate",
    theme: {
      wrapperClass: "bg-white dark:bg-card border-slate-300 dark:border-slate-600",
      headerClass: "bg-white dark:bg-card border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-serif",
      mainClass: "prose-slate dark:prose-invert prose-headings:font-serif",
      headingClass: "text-slate-800 dark:text-slate-200 border-slate-400 dark:border-slate-500 font-serif",
      accentColor: "#475569",
      bodyClass: "text-slate-600 dark:text-slate-400",
      footerClass: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-500",
      headerLayout: "centered",
      sectionStyle: "minimal",
      pricingStyle: "outline",
      roadmapStyle: "list",
      contentSpacing: "spacious",
    },
  },
  {
    id: "bold-tech",
    name: "Bold Tech",
    thumbnailUrl: null,
    tag: "Best for Tech",
    theme: {
      wrapperClass: "bg-slate-900 dark:bg-slate-950 border-slate-700 dark:border-slate-800",
      headerClass: "bg-slate-900 dark:bg-slate-950 border-slate-700 dark:border-slate-800 text-white font-mono",
      mainClass: "prose-invert prose-slate-300",
      headingClass: "text-emerald-400 border-emerald-500/50 font-mono font-semibold",
      accentColor: "#34d399",
      bodyClass: "text-slate-300 dark:text-slate-400 font-mono text-sm",
      footerClass: "border-slate-700 dark:border-slate-800 bg-slate-800/50 dark:bg-slate-900/50 text-slate-400 font-mono text-xs",
      headerLayout: "bold",
      sectionStyle: "cards",
      pricingStyle: "filled",
      roadmapStyle: "compact",
      contentSpacing: "compact",
    },
  },
  {
    id: "elegant-serif",
    name: "Elegant Serif",
    thumbnailUrl: null,
    theme: {
      wrapperClass: "bg-amber-50/80 dark:bg-slate-900/80 border-amber-200 dark:border-slate-700",
      headerClass: "bg-amber-50/80 dark:bg-slate-900/80 border-amber-200 dark:border-slate-700 text-stone-800 dark:text-stone-200 font-serif",
      mainClass: "prose-stone dark:prose-invert prose-headings:font-serif",
      headingClass: "text-stone-800 dark:text-stone-200 border-amber-700/40 font-serif",
      accentColor: "#b45309",
      bodyClass: "text-stone-700 dark:text-stone-300 font-serif",
      footerClass: "border-amber-200 dark:border-slate-700 bg-amber-50/50 dark:bg-slate-900/50 text-stone-600 dark:text-stone-400 font-serif text-sm",
      headerLayout: "minimal",
      sectionStyle: "bordered",
      pricingStyle: "default",
      roadmapStyle: "default",
      contentSpacing: "spacious",
    },
  },
  {
    id: "warm-professional",
    name: "Warm Professional",
    thumbnailUrl: null,
    tag: "Consulting",
    theme: {
      wrapperClass: "bg-white dark:bg-card border-rose-200 dark:border-slate-700",
      headerClass: "bg-white dark:bg-card border-rose-200 dark:border-slate-700 text-slate-900 dark:text-slate-100",
      mainClass: "prose-slate dark:prose-invert",
      headingClass: "text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800/50 font-semibold",
      accentColor: "#e11d48",
      bodyClass: "text-slate-700 dark:text-slate-300",
      footerClass: "border-rose-100 dark:border-slate-700 bg-rose-50/30 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400",
      headerLayout: "default",
      sectionStyle: "cards",
      pricingStyle: "filled",
      roadmapStyle: "default",
      contentSpacing: "default",
    },
  },
  {
    id: "slate-executive",
    name: "Slate Executive",
    thumbnailUrl: null,
    tag: "Executive",
    theme: {
      wrapperClass: "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600",
      headerClass: "bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100",
      mainClass: "prose-slate dark:prose-invert",
      headingClass: "text-slate-800 dark:text-slate-100 border-slate-500 dark:border-slate-500 font-semibold uppercase tracking-wide text-sm",
      accentColor: "#0f172a",
      bodyClass: "text-slate-600 dark:text-slate-400",
      footerClass: "border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-500 text-sm",
      headerLayout: "bold",
      sectionStyle: "bordered",
      pricingStyle: "compact",
      roadmapStyle: "list",
      contentSpacing: "compact",
    },
  },
];

export const DEFAULT_TEMPLATE_ID: ProposalTemplateId = "modern-blue";

export function getTemplateById(id: string | undefined | null): ProposalTemplate | undefined {
  if (!id) return undefined;
  return PROPOSAL_TEMPLATES.find((t) => t.id === id) ?? undefined;
}

export function getTemplateTheme(id: string | undefined | null): ProposalTemplateTheme | null {
  const t = getTemplateById(id);
  return t?.theme ?? null;
}
