"use client";

import React, { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";

const ReactMarkdown = dynamic(
  () => import("react-markdown").then((mod) => mod.default),
  { ssr: false }
);
import { FileQuestion } from "lucide-react";
import { api } from "@/lib/api";
import type { ProposalEditorFormData } from "@/types/proposal-editor";
import { RoadmapTimeline } from "@/components/Proposal/RoadmapTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getTemplateTheme, DEFAULT_TEMPLATE_ID } from "@/lib/proposal-templates";
import type { ProposalTemplateTheme } from "@/lib/proposal-templates";

/** Strong guard: true when all major proposal fields are empty (no content to show). */
export function isProposalDataEmpty(data: ProposalEditorFormData | null | undefined): boolean {
  if (!data) return true;
  const summary = (data.client_summary ?? "").trim();
  const modules = data.ai_enhanced_modules ?? [];
  const roadmap = data.phased_roadmap ?? [];
  const pricing = data.pricing_options ?? [];
  const finalText = (data.final_proposal_text ?? "").trim();
  return (
    summary === "" &&
    modules.length === 0 &&
    roadmap.length === 0 &&
    pricing.length === 0 &&
    finalText === ""
  );
}

export type PreviewBranding = {
  logoUrl?: string | null;
  companyName?: string | null;
  termsTemplate?: string | null;
};

type ProposalPreviewProps = {
  data: ProposalEditorFormData | null | undefined;
  originalData?: ProposalEditorFormData | null;
  /** When true, use document layout (header, footer, container). When false, minimal wrapper for compare mode. */
  documentLayout?: boolean;
  /** Optional branding override (e.g. from parent). If not set, fetched from /api/auth/me */
  branding?: PreviewBranding | null;
  /** Selected template id for styling (header, layout, colors, fonts). Default: modern-blue */
  selectedTemplateId?: string | null;
  className?: string;
};

function EmptyPreviewPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 p-10 md:p-12 text-center transition-opacity duration-150",
        className
      )}
    >
      <FileQuestion className="h-14 w-14 text-muted-foreground/60 mb-4" />
      <p className="text-muted-foreground font-semibold text-lg">No content to preview yet</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs">Add a summary, modules, roadmap, or pricing in the editor to see the live preview.</p>
    </div>
  );
}

export function ProposalPreview({
  data,
  originalData,
  documentLayout = true,
  branding: brandingProp,
  selectedTemplateId = DEFAULT_TEMPLATE_ID,
  className,
}: ProposalPreviewProps) {
  const compareMode = !!originalData;
  const theme = getTemplateTheme(selectedTemplateId ?? DEFAULT_TEMPLATE_ID);

  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get<{ user: { settings?: { logoUrl?: string; companyName?: string; termsTemplate?: string } } }>("/api/auth/me");
      return res.data;
    },
    enabled: documentLayout && !brandingProp,
    staleTime: 60_000,
  });

  const branding: PreviewBranding | null = brandingProp ?? (meData?.user?.settings as PreviewBranding) ?? null;

  const currentEmpty = isProposalDataEmpty(data);
  const originalEmpty = originalData ? isProposalDataEmpty(originalData) : true;

  if (compareMode) {
    const originalTheme = getTemplateTheme(DEFAULT_TEMPLATE_ID);
    const editedTheme = getTemplateTheme(selectedTemplateId ?? DEFAULT_TEMPLATE_ID);
    const innerClass = "rounded-xl border border-slate-200 dark:border-slate-700 p-5 md:p-6 bg-slate-50/80 dark:bg-slate-900/40";
    const editedInnerClass = "rounded-xl border-2 border-[#3b82f6]/30 p-5 md:p-6 bg-white dark:bg-slate-900/60 shadow-sm";
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-0 min-h-0", className)}>
        <div className="flex flex-col min-w-0 border-0 md:border-r border-border md:pr-6">
          <div className="shrink-0 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/90 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
              Original (Default template)
            </span>
          </div>
          <div className="flex-1 min-h-[240px] md:min-h-0 overflow-auto transition-opacity duration-150">
            {originalEmpty ? (
              <EmptyPreviewPlaceholder className="min-h-[200px]" />
            ) : (
              <div className={cn("opacity-95", originalTheme?.wrapperClass)}>
                <PreviewDocument
                  data={originalData!}
                  branding={branding}
                  documentLayout={false}
                  theme={originalTheme}
                  className={innerClass}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col min-w-0 md:pl-6">
          <div className="shrink-0 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2563eb] bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 px-3 py-1.5 rounded-lg border border-[#3b82f6]/20">
              Edited (Selected template)
            </span>
          </div>
          <div className="flex-1 min-h-[240px] md:min-h-0 overflow-auto transition-opacity duration-150">
            {currentEmpty ? (
              <EmptyPreviewPlaceholder className="min-h-[200px]" />
            ) : (
              <div className={cn("opacity-100", editedTheme?.wrapperClass)}>
                <PreviewDocument
                  data={data!}
                  branding={branding}
                  documentLayout={false}
                  theme={editedTheme}
                  className={editedInnerClass}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data || currentEmpty) {
    return <EmptyPreviewPlaceholder className={className} />;
  }

  return (
    <div className={cn("transition-opacity duration-150", className)}>
      <PreviewDocument
        data={data}
        branding={branding}
        documentLayout={documentLayout}
        theme={theme}
        meLoading={meLoading}
        className={undefined}
      />
    </div>
  );
}

function PreviewDocument({
  data,
  branding,
  documentLayout,
  theme,
  meLoading,
  className,
}: {
  data: ProposalEditorFormData;
  branding: PreviewBranding | null;
  documentLayout: boolean;
  theme: ProposalTemplateTheme | null;
  meLoading?: boolean;
  className?: string;
}) {
  const [headerStuck, setHeaderStuck] = useState(false);
  const t = theme ?? getTemplateTheme(DEFAULT_TEMPLATE_ID);

  useEffect(() => {
    if (!documentLayout) return;
    const container = document.querySelector("[data-preview-container]");
    if (!container) return;
    const observer = new IntersectionObserver(
      ([e]) => setHeaderStuck(!e.isIntersecting),
      { threshold: 1, rootMargin: "-60px 0px 0px 0px" }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [documentLayout]);

  const companyName = branding?.companyName ?? "Your Company";
  const terms = branding?.termsTemplate ?? null;
  const logoUrl = branding?.logoUrl ?? null;
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const content = (
    <div className="transition-opacity duration-200">
      <PreviewContent data={data} theme={t} />
    </div>
  );

  if (!documentLayout) {
    return <div className={cn("proposal-preview-inner", t?.wrapperClass, className)}>{content}</div>;
  }

  return (
    <div
      data-preview-container
      className={cn(
        "shadow-xl border rounded-2xl overflow-hidden max-w-4xl mx-auto print:shadow-none print:border bg-white dark:bg-card",
        t?.wrapperClass,
        className
      )}
    >
      <header
        className={cn(
          "border-b transition-all duration-200 print:break-inside-avoid",
          t?.headerClass,
          headerStuck && "sticky top-0 z-10 shadow-md",
          t?.headerLayout === "bold" && "pb-4 border-b-4",
          t?.headerLayout === "minimal" && "py-4 px-6",
          t?.headerLayout !== "minimal" && t?.headerLayout !== "centered" && "p-6",
          t?.headerLayout === "centered" && "py-8 px-6 text-center"
        )}
        style={t?.accentColor && t?.headerLayout === "bold" ? { borderBottomColor: t.accentColor } : undefined}
      >
        {t?.headerLayout === "centered" ? (
          <div className="flex flex-col items-center gap-2">
            {meLoading ? (
              <Skeleton className="h-14 w-20 rounded-lg" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-14 w-auto max-w-[160px] object-contain" />
            ) : (
              <div className="h-14 w-20 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-500">
                Logo
              </div>
            )}
            <h2 className={cn("text-2xl font-bold", t?.headerClass)}>{companyName}</h2>
            <time className="text-sm text-muted-foreground">{dateStr}</time>
          </div>
        ) : t?.headerLayout === "minimal" ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {meLoading ? (
              <Skeleton className="h-10 w-16 rounded" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 w-auto max-w-[120px] object-contain" />
            ) : (
              <div className="h-10 w-16 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-semibold text-slate-500">
                Logo
              </div>
            )}
            <h2 className={cn("text-lg font-semibold truncate", t?.headerClass)}>{companyName}</h2>
            <time className="text-xs text-muted-foreground shrink-0">{dateStr}</time>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              {meLoading ? (
                <Skeleton className="h-16 w-24 rounded-lg" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-16 w-auto max-w-[180px] object-contain object-left" />
              ) : (
                <div className="h-16 w-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-500">
                  Logo
                </div>
              )}
              <h2 className={cn("text-2xl font-bold truncate", t?.headerClass)}>{companyName}</h2>
            </div>
            <time className="text-sm text-muted-foreground shrink-0">{dateStr}</time>
          </div>
        )}
      </header>

      <main
        className={cn(
          "p-6 md:p-8 lg:p-10 prose prose-lg max-w-none print:p-6 prose-headings:font-semibold",
          t?.mainClass,
          "prose-slate dark:prose-invert"
        )}
      >
        {content}
      </main>

      {terms && (
        <footer className={cn("px-8 py-4 border-t print:break-inside-avoid", t?.footerClass)}>
          <p className="text-xs whitespace-pre-wrap">{terms}</p>
        </footer>
      )}
    </div>
  );
}

function SectionWrapper({
  theme,
  children,
  className,
}: {
  theme: ProposalTemplateTheme | null;
  children: React.ReactNode;
  className?: string;
}) {
  const style = theme?.sectionStyle ?? "default";
  if (style === "cards") {
    return (
      <div className={cn("rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-5 shadow-sm", className)}>
        {children}
      </div>
    );
  }
  if (style === "bordered") {
    return (
      <div
        className={cn("pl-5 border-l-4", className)}
        style={{ borderColor: theme?.accentColor ?? "#3b82f6" }}
      >
        {children}
      </div>
    );
  }
  return <div className={className}>{children}</div>;
}

function PreviewContent({
  data,
  theme,
}: {
  data: ProposalEditorFormData;
  theme: ProposalTemplateTheme | null;
}) {
  const t = theme ?? getTemplateTheme(DEFAULT_TEMPLATE_ID);
  const accentColor = t?.accentColor ?? "#3b82f6";
  const headingClass = t?.headingClass ?? "text-[#3b82f6] border-[#3b82f6]/30 font-semibold";
  const bodyClass = t?.bodyClass ?? "text-slate-700 dark:text-slate-300";
  const pricingStyle = t?.pricingStyle ?? "default";
  const roadmapStyle = t?.roadmapStyle ?? "default";
  const contentSpacing = t?.contentSpacing ?? "default";
  const spaceY = contentSpacing === "compact" ? "space-y-4" : contentSpacing === "spacious" ? "space-y-12" : "space-y-8";

  const acceptedModules = (data.ai_enhanced_modules ?? []).filter((m) => m.accepted);
  const totalByOption = useMemo(() => {
    return (data.pricing_options ?? []).map((opt) => {
      const sum = (opt.breakdown ?? []).reduce((a, b) => a + (b.cost_usd ?? 0), 0);
      const discount = opt.discount_percent ?? 0;
      return {
        name: opt.option_name,
        total: sum * (1 - discount / 100),
        breakdown: opt.breakdown ?? [],
      };
    });
  }, [data.pricing_options, data]);

  const hasStructuredData =
    (data.phased_roadmap?.length ?? 0) > 0 || (data.pricing_options?.length ?? 0) > 0;
  const useStructuredView = !data.final_proposal_text?.trim() && hasStructuredData;

  if (useStructuredView) {
    const pricingCompact = pricingStyle === "compact";
    const pricingFilled = pricingStyle === "filled";
    const pricingOutline = pricingStyle === "outline";
    return (
      <div className={spaceY}>
        <SectionWrapper theme={t}>
          <section>
            <h2 className={cn("text-xl border-b pb-2 mb-4", headingClass)}>
              Client Summary
            </h2>
            <p className={cn("leading-relaxed", bodyClass)}>
              {data.client_summary || "No summary provided."}
            </p>
          </section>
        </SectionWrapper>

        {acceptedModules.length > 0 && (
          <SectionWrapper theme={t}>
            <section>
              <h2 className={cn("text-xl border-b pb-2 mb-4", headingClass)}>
                Proposed Modules
              </h2>
              <ul className={cn("list-disc list-inside space-y-1", bodyClass)}>
                {acceptedModules.map((m, i) => (
                  <li key={i}>
                    <strong>{m.enhanced_name}</strong> – {m.why_better || ""}
                  </li>
                ))}
              </ul>
            </section>
          </SectionWrapper>
        )}

        {(data.phased_roadmap?.length ?? 0) > 0 && (
          <SectionWrapper theme={t}>
            <section>
              <h2 className={cn("text-xl border-b pb-2 mb-4", headingClass)}>
                Phased Roadmap
              </h2>
              <RoadmapTimeline phases={data.phased_roadmap!} variant={roadmapStyle} accentColor={accentColor} />
            </section>
          </SectionWrapper>
        )}

        {totalByOption.length > 0 && (
          <SectionWrapper theme={t}>
            <section>
              <h2 className={cn("text-xl border-b pb-2 mb-4", headingClass)}>
                Pricing Options
              </h2>
              <div className={cn("space-y-6", pricingCompact && "space-y-4")}>
                {totalByOption.map((opt, i) => (
                  <div
                    key={i}
                    className={cn(
                      "overflow-hidden",
                      !pricingOutline && "rounded-xl border border-slate-200 dark:border-slate-700 shadow-md",
                      pricingOutline && "rounded-lg border border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div
                      className={cn(
                        "font-semibold",
                        pricingCompact ? "px-3 py-1.5 text-sm" : "px-4 py-2",
                        pricingFilled ? "text-white" : "text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800"
                      )}
                      style={pricingFilled ? { backgroundColor: accentColor } : undefined}
                    >
                      {opt.name}
                    </div>
                    <div className="overflow-x-auto">
                      <table className={cn("w-full", pricingCompact ? "text-xs" : "text-sm")}>
                        <thead>
                          <tr
                            className={cn(
                              pricingFilled ? "text-white/90" : "bg-slate-50 dark:bg-slate-800/50",
                              pricingOutline && "border-b border-slate-200 dark:border-slate-700"
                            )}
                            style={pricingFilled ? { backgroundColor: `${accentColor}cc` } : undefined}
                          >
                            <th className={cn("text-left font-medium text-slate-700 dark:text-slate-300", pricingCompact ? "p-2" : "p-3")}>
                              Item
                            </th>
                            <th className={cn("text-right font-medium text-slate-700 dark:text-slate-300", pricingCompact ? "p-2" : "p-3")}>
                              Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {opt.breakdown.map((row, j) => (
                            <tr
                              key={j}
                              className="border-t border-slate-200 dark:border-slate-700 hover:bg-muted/50 even:bg-slate-50/50 dark:even:bg-slate-900/30"
                            >
                              <td className={pricingCompact ? "p-2" : "p-3"}>{row.item}</td>
                              <td className={cn("text-right font-medium", pricingCompact ? "p-2" : "p-3")}>
                                ${(row.cost_usd ?? 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr
                            className="border-t-2 font-bold"
                            style={{
                              borderColor: accentColor,
                              backgroundColor: `${accentColor}18`,
                            }}
                          >
                            <td className={pricingCompact ? "p-2" : "p-3"}>Total</td>
                            <td className={cn("text-right", pricingCompact ? "p-2" : "p-3")}>${Math.round(opt.total).toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </SectionWrapper>
        )}

        {!hasStructuredData && (
          <p className="text-muted-foreground italic">Add content in the editor to see the preview.</p>
        )}
      </div>
    );
  }

  const builtSummary = [
    "## Client Summary",
    data.client_summary || "_No summary._",
    "",
    "## Proposed Modules",
    ...acceptedModules.map((m) => `- **${m.enhanced_name}** – ${m.why_better || ""}`),
    "",
    "## Phased Roadmap",
    ...(data.phased_roadmap ?? []).map(
      (p) => `- **${p.phase}** (${p.duration_weeks} weeks) – ${p.description || ""}`
    ),
    "",
    "## Pricing Options",
    ...totalByOption.map(
      (o) =>
        `### ${o.name}\n${(o.breakdown ?? [])
          .map((b) => `- ${b.item}: $${b.cost_usd?.toLocaleString() ?? 0}`)
          .join("\n")}\n**Total: $${Math.round(o.total).toLocaleString()}**`
    ),
  ].join("\n\n");

  const markdown = data.final_proposal_text?.trim() || builtSummary;

  const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1
        className={cn("text-2xl font-bold border-b-2 pb-2 mb-4", headingClass)}
        style={{ borderColor: accentColor }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2
        className={cn("text-xl font-semibold mt-8 mb-2 border-l-4 pl-3", headingClass)}
        style={{ borderColor: accentColor }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className={cn("text-lg font-semibold mt-6 mb-2", bodyClass)}>{children}</h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className={cn("leading-relaxed mb-3", bodyClass)}>{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul
        className={cn("list-disc list-inside space-y-1 mb-4", bodyClass)}
        style={{ listStyleColor: accentColor } as React.CSSProperties}
      >
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol
        className={cn("list-decimal list-inside space-y-1 mb-4 [&>li]:marker:font-semibold", bodyClass)}
        style={{ listStyleColor: accentColor } as React.CSSProperties}
      >
        {children}
      </ol>
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-md">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-slate-100 dark:bg-slate-800">{children}</thead>
    ),
    tbody: ({ children }: { children?: React.ReactNode }) => (
      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{children}</tbody>
    ),
    tr: ({ children }: { children?: React.ReactNode }) => (
      <tr className="hover:bg-muted/50 even:bg-slate-50/50 dark:even:bg-slate-900/30 transition-colors">
        {children}
      </tr>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
        {children}
      </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="p-3 text-slate-700 dark:text-slate-300">{children}</td>
    ),
    img: ({ src, alt }: { src?: string; alt?: string }) => (
      <img
        src={src}
        alt={alt ?? ""}
        className="max-w-full h-auto rounded-lg border border-slate-200 dark:border-slate-700 cursor-zoom-in"
      />
    ),
  };

  if (typeof markdown !== "string") return null;

  return (
    <ReactMarkdown components={markdownComponents}>{markdown}</ReactMarkdown>
  );
}
