"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FileUploader } from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { ModuleEditor } from "@/components/Proposal/ModuleEditor";
import { api } from "@/lib/api";

export type GeneratedProposalData = {
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

export function ProposalForm() {
  const [text, setText] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedProposalData | null>(null);

  const hasInput = !!text.trim() || !!uploadedUrl;
  const clientInput =
    text.trim() ||
    (uploadedUrl
      ? "Client uploaded a document. Generate a professional software development proposal structure with typical modules, phased roadmap, and pricing options."
      : "");

  const handleGenerate = async () => {
    if (!clientInput || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await api.post<GeneratedProposalData>("/api/proposals/generate-proposal", {
        clientInput,
      });
      setGeneratedData(res.data);
      toast.success("Proposal generated!", {
        style: { borderLeft: "4px solid #22c55e" },
      });
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (err as { response: { data: { error: string } } }).response.data.error
          : "Generation failed";
      toast.error(msg, {
        style: { borderLeft: "4px solid #ef4444" },
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (generatedData) {
    return (
      <div className="animate-in fade-in duration-300">
        <ModuleEditor generatedData={generatedData} onBack={() => setGeneratedData(null)} />
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 md:items-stretch min-h-[420px]">
      {/* Loading overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-slate-800 dark:text-slate-200 animate-pulse">
            AI is crafting your proposal...
          </p>
          <p className="text-sm text-muted-foreground">
            Analyzing requirements... Generating proposal
          </p>
        </div>
      )}

      {/* Left: dropzone only (upload lives here) */}
      <div className="space-y-4 min-h-[360px] flex flex-col">
        <div className="flex-1 min-h-[320px]">
          <FileUploader
            onSuccess={(url) => setUploadedUrl(url)}
            onClear={() => setUploadedUrl(null)}
            disabled={isGenerating}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Upload a client document (PDF, DOCX, TXT) or paste requirements in the box on the right. Text extraction will be available in a later update.
        </p>
      </div>

      {/* Right: text input only (paste here, no upload icon) */}
      <div className="space-y-2 min-h-[360px] flex flex-col">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Paste requirements here
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste client requirements or a raw idea here..."
          className="min-h-[320px] w-full flex-1 resize-y rounded-xl border border-slate-200 dark:border-slate-700 bg-background px-4 py-3 font-mono text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
          rows={16}
          disabled={isGenerating}
        />
      </div>

      {/* Generate: full width on mobile, right-aligned on desktop */}
      <div className="md:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-3">
        {isGenerating && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Generating... Estimated 10–20s
          </p>
        )}
        <Button
          size="lg"
          className="h-12 w-full md:w-auto min-w-[220px] gap-2 rounded-xl shadow-md hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          onClick={handleGenerate}
          disabled={!hasInput || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate Proposal
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
