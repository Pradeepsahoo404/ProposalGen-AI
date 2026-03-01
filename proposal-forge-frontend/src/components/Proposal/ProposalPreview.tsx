"use client";

import { useMemo, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";
import { FileQuestion } from "lucide-react";
import { api } from "@/lib/api";
import type { ProposalEditorFormData } from "@/types/proposal-editor";
import { RoadmapTimeline } from "@/components/Proposal/RoadmapTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  className,
}: ProposalPreviewProps) {
  const compareMode = !!originalData;

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
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-0 min-h-0", className)}>
        <div className="flex flex-col min-w-0 border-0 md:border-r border-border md:pr-6">
          <div className="shrink-0 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/90 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
              Original AI
            </span>
          </div>
          <div className="flex-1 min-h-[240px] md:min-h-0 overflow-auto transition-opacity duration-150">
            {originalEmpty ? (
              <EmptyPreviewPlaceholder className="min-h-[200px]" />
            ) : (
              <div className="opacity-95">
                <PreviewDocument
                  data={originalData!}
                  branding={branding}
                  documentLayout={false}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 md:p-6 bg-slate-50/80 dark:bg-slate-900/40"
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col min-w-0 md:pl-6">
          <div className="shrink-0 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2563eb] bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 px-3 py-1.5 rounded-lg border border-[#3b82f6]/20">
              Current Edited
            </span>
          </div>
          <div className="flex-1 min-h-[240px] md:min-h-0 overflow-auto transition-opacity duration-150">
            {currentEmpty ? (
              <EmptyPreviewPlaceholder className="min-h-[200px]" />
            ) : (
              <div className="opacity-100">
                <PreviewDocument
                  data={data!}
                  branding={branding}
                  documentLayout={false}
                  className="rounded-xl border-2 border-[#3b82f6]/30 p-5 md:p-6 bg-white dark:bg-slate-900/60 shadow-sm"
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
  meLoading,
  className,
}: {
  data: ProposalEditorFormData;
  branding: PreviewBranding | null;
  documentLayout: boolean;
  meLoading?: boolean;
  className?: string;
}) {
  const [headerStuck, setHeaderStuck] = useState(false);

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
      <PreviewContent data={data} />
    </div>
  );

  if (!documentLayout) {
    return <div className={cn("proposal-preview-inner", className)}>{content}</div>;
  }

  return (
    <div
      data-preview-container
      className={cn(
        "bg-white dark:bg-card shadow-xl border border-border rounded-2xl overflow-hidden max-w-4xl mx-auto print:shadow-none print:border",
        className
      )}
    >
      <header
        className={cn(
          "p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-card transition-all duration-200 print:break-inside-avoid",
          headerStuck && "sticky top-0 z-10 shadow-md"
        )}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            {meLoading ? (
              <Skeleton className="h-16 w-24 rounded-lg" />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 w-auto max-w-[180px] object-contain object-left"
              />
            ) : (
              <div className="h-16 w-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-500">
                Logo
              </div>
            )}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {companyName}
            </h2>
          </div>
          <time className="text-sm text-muted-foreground shrink-0">{dateStr}</time>
        </div>
      </header>

      <main className="p-6 md:p-8 lg:p-10 prose prose-slate dark:prose-invert prose-lg max-w-none print:p-6 prose-headings:font-semibold prose-h2:text-[#3b82f6] prose-h2:border-[#3b82f6]/30">
        {content}
      </main>

      {terms && (
        <footer className="px-8 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 print:break-inside-avoid">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{terms}</p>
        </footer>
      )}
    </div>
  );
}

function PreviewContent({ data }: { data: ProposalEditorFormData }) {
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
    return (
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-[#3b82f6] border-b border-[#3b82f6]/30 pb-2 mb-4">
            Client Summary
          </h2>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
            {data.client_summary || "No summary provided."}
          </p>
        </section>

        {acceptedModules.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-[#3b82f6] border-b border-[#3b82f6]/30 pb-2 mb-4">
              Proposed Modules
            </h2>
            <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
              {acceptedModules.map((m, i) => (
                <li key={i}>
                  <strong>{m.enhanced_name}</strong> – {m.why_better || ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(data.phased_roadmap?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-[#3b82f6] border-b border-[#3b82f6]/30 pb-2 mb-4">
              Phased Roadmap
            </h2>
            <RoadmapTimeline phases={data.phased_roadmap!} />
          </section>
        )}

        {totalByOption.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-[#3b82f6] border-b border-[#3b82f6]/30 pb-2 mb-4">
              Pricing Options
            </h2>
            <div className="space-y-6">
              {totalByOption.map((opt, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md"
                >
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-semibold text-slate-900 dark:text-slate-100">
                    {opt.name}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <th className="text-left p-3 font-medium text-slate-700 dark:text-slate-300">
                            Item
                          </th>
                          <th className="text-right p-3 font-medium text-slate-700 dark:text-slate-300">
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
                            <td className="p-3">{row.item}</td>
                            <td className="p-3 text-right font-medium">
                              ${(row.cost_usd ?? 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#3b82f6] bg-[#3b82f6]/10 font-bold">
                          <td className="p-3">Total</td>
                          <td className="p-3 text-right">${Math.round(opt.total).toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 border-b-2 border-[#3b82f6] pb-2 mb-4">
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-xl font-semibold text-[#3b82f6] mt-8 mb-2 border-l-4 border-[#3b82f6] pl-3">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-2">
        {children}
      </h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="leading-relaxed text-slate-700 dark:text-slate-300 mb-3">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside space-y-1 mb-4 text-slate-700 dark:text-slate-300 [&>li]:marker:text-[#3b82f6]">
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside space-y-1 mb-4 text-slate-700 dark:text-slate-300 [&>li]:marker:font-semibold [&>li]:marker:text-[#3b82f6]">
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

  return (
    <ReactMarkdown components={markdownComponents}>{markdown}</ReactMarkdown>
  );
}
