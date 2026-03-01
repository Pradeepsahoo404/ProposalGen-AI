"use client";

import { useRef, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  PROPOSAL_TEMPLATES,
  getTemplateById,
  type ProposalTemplateId,
  type ProposalTemplate,
} from "@/lib/proposal-templates";

export type ApiTemplate = {
  _id: string;
  id: string;
  name: string;
  sampleText?: string;
  cssClass?: string;
  styleOverrides?: Record<string, unknown>;
  tag?: string;
};

type TemplateSelectorProps = {
  selectedId: ProposalTemplateId | string;
  onSelect: (id: ProposalTemplateId) => void;
  className?: string;
  /** When true, template cannot be changed (e.g. proposal not draft). Show message when provided. */
  disabled?: boolean;
  disabledMessage?: string;
};

type TemplateCardItem = {
  id: string;
  name: string;
  sampleText?: string;
  tag?: string;
  theme?: ProposalTemplate["theme"];
  styleOverrides?: Record<string, unknown>;
};

/** Small square card: gradient bg + sample text in template style, name below. Premium shadow & hover. */
function TemplateCard({
  template,
  isSelected,
  onSelect,
  animationDelay = 0,
  className,
  disabled = false,
  title,
}: {
  template: TemplateCardItem;
  isSelected: boolean;
  onSelect: () => void;
  animationDelay?: number;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const localTemplate = getTemplateById(template.id);
  const primaryColor = (template.styleOverrides?.primaryColor as string) ?? localTemplate?.theme?.accentColor ?? "#3b82f6";
  const fontFamily = (template.styleOverrides?.fontFamily as string) ?? "sans-serif";
  const darkBg = template.styleOverrides?.darkBg === true;
  const sampleText = template.sampleText ?? "Heading Text";

  const bgGradient = darkBg
    ? "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)"
    : `linear-gradient(145deg, ${primaryColor}12 0%, ${primaryColor}08 50%, #fff 100%)`;
  const textColor = darkBg ? "#e2e8f0" : "#334155";

  return (
    <button
      type="button"
      data-selected={isSelected ? "true" : undefined}
      onClick={onSelect}
      disabled={disabled}
      title={title}
      className={cn(
        "relative w-[120px] h-[120px] max-w-[120px] flex-shrink-0 rounded-xl overflow-hidden text-left",
        "shadow-md transition-all duration-200 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        !disabled && "hover:shadow-xl hover:scale-[1.02] hover:border-blue-500/50",
        isSelected
          ? "border-2 border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]"
          : "border border-slate-200/80 dark:border-slate-600/50",
        className
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-pressed={isSelected}
      aria-label={`Select ${template.name} template`}
    >
      {/* Selected checkmark badge — top-right */}
      {isSelected && (
        <div
          className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900"
          aria-hidden
        >
          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
        </div>
      )}
      <div className="w-full h-full flex flex-col">
        <div
          className="flex-1 min-h-0 flex flex-col items-center justify-center px-1.5 py-2 rounded-t-xl transition-colors duration-150"
          style={{ background: bgGradient }}
        >
          <span
            className="text-[10px] font-bold text-center leading-tight truncate max-w-full tracking-tight"
            style={{ color: primaryColor, fontFamily }}
          >
            {sampleText}
          </span>
          {darkBg && (
            <span className="text-[8px] mt-0.5 font-medium opacity-80 tracking-tight" style={{ color: textColor }}>
              {template.name}
            </span>
          )}
        </div>
        <div className="flex-shrink-0 px-1.5 py-1 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-600/50 rounded-b-xl flex items-center justify-between gap-1">
          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate tracking-tight">
            {template.name}
          </span>
        </div>
      </div>
    </button>
  );
}

export function TemplateSelector({
  selectedId,
  onSelect,
  className,
  disabled = false,
  disabledMessage = "Cannot change template after sending",
}: TemplateSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const { data: apiTemplates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await api.get<ApiTemplate[] | { data?: ApiTemplate[] }>("/api/templates");
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object" && Array.isArray((raw as { data?: ApiTemplate[] }).data))
        return (raw as { data: ApiTemplate[] }).data;
      return [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const templates: TemplateCardItem[] =
    Array.isArray(apiTemplates) && apiTemplates.length > 0
      ? apiTemplates.map((t) => ({
          id: t.id,
          name: t.name,
          sampleText: t.sampleText,
          tag: t.tag,
          styleOverrides: t.styleOverrides,
          theme: getTemplateById(t.id)?.theme,
        }))
      : PROPOSAL_TEMPLATES.map((t) => ({
          id: t.id,
          name: t.name,
          sampleText: "Heading Text",
          tag: t.tag ?? undefined,
          theme: t.theme,
          styleOverrides: { primaryColor: t.theme.accentColor, fontFamily: "sans-serif" },
        }));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = scrollRef.current;
    if (!el) return;
    const selectedEl = el.querySelector("[data-selected='true']");
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedId, mounted]);

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex-shrink-0 bg-background/98 dark:bg-background/98 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-700/80",
        className
      )}
    >
      <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200 px-4 pt-3 pb-3">
        Select Proposal Template
      </h3>
      {isLoading && !Array.isArray(apiTemplates) ? (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground min-h-[140px]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading templates…</span>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className={cn(
            "flex flex-nowrap overflow-x-auto gap-4 pb-5 px-4 min-h-[140px] snap-x snap-mandatory",
            "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600",
            "animate-in fade-in duration-300"
          )}
        >
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center shrink-0">
              No templates available. Run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npm run seed:templates</code> in the backend.
            </p>
          ) : (
            templates.map((template, i) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedId === template.id}
                onSelect={() => onSelect(template.id as ProposalTemplateId)}
                animationDelay={i * 40}
                className="snap-center flex-shrink-0"
                disabled={disabled}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export { getTemplateById, PROPOSAL_TEMPLATES };
export type { ProposalTemplateId, ProposalTemplate };
