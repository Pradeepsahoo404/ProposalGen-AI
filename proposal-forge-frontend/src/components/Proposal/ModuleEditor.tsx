"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import {
  ArrowLeft,
  FileText,
  GripVertical,
  Plus,
  Trash2,
  Save,
  Undo2,
  Redo2,
  FileJson,
  Sparkles,
  Maximize2,
  Copy,
  Printer,
  Download,
  Loader2,
  Share,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProposalPreview } from "@/components/Proposal/ProposalPreview";
import { TemplateSelector } from "@/components/Proposal/TemplateSelector";
import { ShareProposalDialog } from "@/components/Proposal/ShareProposalDialog";
import { DEFAULT_TEMPLATE_ID } from "@/lib/proposal-templates";
import type { ProposalTemplateId } from "@/lib/proposal-templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { GeneratedProposalData } from "./ProposalForm";
import {
  type AiEnhancedModule,
  type PricingBreakdownItem,
  type PricingOption,
  type ProposalEditorFormData,
  generatedToEditorFormData,
} from "@/types/proposal-editor";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { SortableItem } from "@/components/Proposal/SortableItem";

const STORAGE_KEY = "proposal-forge-draft";
const UNDO_LIMIT = 30;

function getDefaultProposalFormData(): ProposalEditorFormData {
  return {
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
}

type ModuleEditorProps = {
  generatedData?: GeneratedProposalData | null;
  proposalId?: string | null;
  initialFormData?: ProposalEditorFormData | null;
  /** Template id saved with proposal; loaded from content.selectedTemplateId when editing */
  initialSelectedTemplateId?: string | null;
  proposalTitle?: string;
  proposalStatus?: string;
  onBack?: () => void;
};

function useUndoRedo<T>(initial: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initial);
  const [future, setFuture] = useState<T[]>([]);

  const set = useCallback(
    (next: T) => {
      setPast((p) => [...p.slice(-(UNDO_LIMIT - 1)), present]);
      setPresent(next);
      setFuture([]);
    },
    [present]
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setPresent(prev);
    setFuture((f) => [present, ...f]);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPresent(next);
    setPast((p) => [...p, present]);
  }, [future, present]);

  const reset = useCallback((value: T) => {
    setPast([]);
    setPresent(value);
    setFuture([]);
  }, []);

  return { state: present, set, undo, redo, reset, canUndo: past.length > 0, canRedo: future.length > 0 };
}

export function ModuleEditor({
  generatedData,
  proposalId,
  initialFormData,
  initialSelectedTemplateId,
  proposalTitle: proposalTitleProp,
  proposalStatus = "draft",
  onBack,
}: ModuleEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const initial = initialFormData ?? (generatedData ? generatedToEditorFormData(generatedData) : undefined);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<ProposalTemplateId>(
    (initialSelectedTemplateId as ProposalTemplateId) ?? DEFAULT_TEMPLATE_ID
  );
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [lastServerSave, setLastServerSave] = useState<Date | null>(null);
  const [unsavedHighlight, setUnsavedHighlight] = useState(false);
  const [fullScreenPreviewOpen, setFullScreenPreviewOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [localStatus, setLocalStatus] = useState(proposalStatus);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);

  const initialValue =
    (initial !== undefined && initial !== null ? initial : getDefaultProposalFormData()) as ProposalEditorFormData;
  const undoRedo = useUndoRedo<ProposalEditorFormData>(initialValue);

  const form = useForm<ProposalEditorFormData>({
    defaultValues: undoRedo.state,
  });

  const { watch, setValue, getValues, formState: { isDirty } } = form;

  useEffect(() => {
    if (initial != null) undoRedo.reset(initial);
  }, []);

  useEffect(() => {
    setLocalStatus(proposalStatus);
  }, [proposalStatus]);

  useEffect(() => {
    if (initialSelectedTemplateId && initialSelectedTemplateId !== selectedTemplateId) {
      setSelectedTemplateId(initialSelectedTemplateId as ProposalTemplateId);
    }
  }, [initialSelectedTemplateId]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const subscription = watch(() => {
      setUnsavedHighlight(true);
      setPreviewVersion((v) => v + 1);
      const t = setTimeout(() => setUnsavedHighlight(false), 2000);
      return () => clearTimeout(t);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    const id = setInterval(() => {
      const values = getValues();
      if (JSON.stringify(undoRedo.state) !== JSON.stringify(values)) {
        undoRedo.set(values);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [getValues]);

  const handleUndo = () => {
    undoRedo.undo();
    form.reset(undoRedo.state);
  };

  const handleRedo = () => {
    undoRedo.redo();
    form.reset(undoRedo.state);
  };

  const syncFormToUndo = useCallback(() => {
    undoRedo.set(getValues());
  }, [getValues, undoRedo]);

  useEffect(() => {
    const id = setInterval(() => {
      const values = getValues();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        setLastAutoSave(new Date());
        if (!proposalId) toast.success("Auto-saved draft", { duration: 2000 });
      } catch {
        // ignore
      }
    }, 30000);
    return () => clearInterval(id);
  }, [getValues, proposalId]);

  const modulesFields = useFieldArray({ control: form.control, name: "ai_enhanced_modules" });
  const roadmapFields = useFieldArray({ control: form.control, name: "phased_roadmap" });
  const pricingFields = useFieldArray({ control: form.control, name: "pricing_options" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const a = String(active.id);
      const o = String(over.id);
      if (a.startsWith("mod-") && o.startsWith("mod-")) {
        const oldIndex = parseInt(a.replace("mod-", ""), 10);
        const newIndex = parseInt(o.replace("mod-", ""), 10);
        if (!Number.isNaN(oldIndex) && !Number.isNaN(newIndex)) modulesFields.move(oldIndex, newIndex);
      } else if (a.startsWith("road-") && o.startsWith("road-")) {
        const oldIndex = parseInt(a.replace("road-", ""), 10);
        const newIndex = parseInt(o.replace("road-", ""), 10);
        if (!Number.isNaN(oldIndex) && !Number.isNaN(newIndex)) roadmapFields.move(oldIndex, newIndex);
      } else if (a.startsWith("price-") && o.startsWith("price-")) {
        const oldIndex = parseInt(a.replace("price-", ""), 10);
        const newIndex = parseInt(o.replace("price-", ""), 10);
        if (!Number.isNaN(oldIndex) && !Number.isNaN(newIndex)) pricingFields.move(oldIndex, newIndex);
      }
      setPreviewVersion((v) => v + 1);
    },
    [modulesFields, roadmapFields, pricingFields]
  );

  const getProposalTitle = useCallback(() => {
    const d = getValues();
    return (d.client_summary?.trim().slice(0, 80) || proposalTitleProp || "Proposal").trim() || "Proposal";
  }, [getValues, proposalTitleProp]);

  const handleSaveDraft = useCallback(async () => {
    syncFormToUndo();
    const values = getValues();
    const title = getProposalTitle();
    const content = { ...(values as unknown as Record<string, unknown>), selectedTemplateId };
    const payload = { title, content, clientName: "" };
    setIsSaving(true);
    try {
      if (proposalId) {
        await api.put(`/api/proposals/${proposalId}`, payload);
        setLastServerSave(new Date());
        form.reset(values);
        toast.success("Saved successfully!", { style: { borderLeft: "4px solid #22c55e" }, duration: 3000 });
      } else {
        const res = await api.post<{ id: string }>("/api/proposals", payload);
        const newId = res.data?.id;
        if (newId) {
          setLastServerSave(new Date());
          form.reset(values);
          toast.success("Saved successfully!", { style: { borderLeft: "4px solid #22c55e" }, duration: 3000 });
          router.replace(`/proposals/${newId}`);
        } else {
          toast.error("Failed to save – try again", { style: { borderLeft: "4px solid #ef4444" } });
        }
      }
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (err as { response: { data: { error: string } } }).response.data.error
          : "Failed to save – try again";
      toast.error(msg, { style: { borderLeft: "4px solid #ef4444" } });
    } finally {
      setIsSaving(false);
    }
  }, [proposalId, getValues, getProposalTitle, form, router, syncFormToUndo]);

  const handleDelete = useCallback(async () => {
    if (!proposalId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/proposals/${proposalId}`);
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("Proposal deleted", { style: { borderLeft: "4px solid #22c55e" } });
      setDeleteDialogOpen(false);
      router.push("/");
    } catch {
      toast.error("Failed to delete – try again", { style: { borderLeft: "4px solid #ef4444" } });
    } finally {
      setIsDeleting(false);
    }
  }, [proposalId, router, queryClient]);

  const handleRegenerate = useCallback(async () => {
    const d = getValues();
    const clientInput =
      (d.client_summary && d.client_summary.trim()) ||
      (d.final_proposal_text && d.final_proposal_text.trim().slice(0, 2000)) ||
      "Generate a professional software development proposal with modules, phased roadmap, and pricing options.";
    setIsRegenerating(true);
    try {
      const res = await api.post<GeneratedProposalData>("/api/proposals/generate-proposal", { clientInput });
      const newData = generatedToEditorFormData(res.data);
      undoRedo.reset(newData);
      form.reset(newData);
      toast.success("Proposal regenerated", { style: { borderLeft: "4px solid #22c55e" } });
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (err as { response: { data: { error: string } } }).response.data.error
          : "Regeneration failed";
      toast.error(msg, { style: { borderLeft: "4px solid #ef4444" } });
    } finally {
      setIsRegenerating(false);
    }
  }, [getValues, form, undoRedo]);

  const handleStatusChange = useCallback(
    async (newStatus: "draft" | "sent" | "accepted") => {
      if (!proposalId || newStatus === localStatus) return;
      setIsUpdatingStatus(true);
      try {
        await api.put(`/api/proposals/${proposalId}`, { status: newStatus });
        setLocalStatus(newStatus);
        queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
        queryClient.invalidateQueries({ queryKey: ["proposals"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
        toast.success(`Marked as ${newStatus}`, { style: { borderLeft: "4px solid #22c55e" } });
      } catch {
        toast.error("Failed to update status", { style: { borderLeft: "4px solid #ef4444" } });
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [proposalId, localStatus, queryClient]
  );

  const handleDuplicate = useCallback(async () => {
    if (!proposalId) return;
    try {
      const res = await api.post<{ id: string }>(`/api/proposals/${proposalId}/duplicate`);
      const newId = res.data?.id;
      if (newId) {
        toast.success("Proposal duplicated", { style: { borderLeft: "4px solid #22c55e" } });
        router.push(`/proposals/${newId}`);
      } else {
        toast.error("Failed to duplicate – try again", { style: { borderLeft: "4px solid #ef4444" } });
      }
    } catch {
      toast.error("Failed to duplicate – try again", { style: { borderLeft: "4px solid #ef4444" } });
    }
  }, [proposalId, router]);

  const handleAcceptAll = useCallback(() => {
    const modules = getValues("ai_enhanced_modules") ?? [];
    modules.forEach((_: unknown, i: number) => form.setValue(`ai_enhanced_modules.${i}.accepted`, true));
    setPreviewVersion((v) => v + 1);
    toast.success("All modules marked as accepted", { style: { borderLeft: "4px solid #22c55e" }, duration: 2000 });
  }, [getValues, form]);

  useEffect(() => {
    if (!proposalId) return;
    const id = setInterval(() => {
      if (!form.formState.isDirty) return;
      const values = getValues();
      const title = getProposalTitle();
      api.put(`/api/proposals/${proposalId}`, { title, content: { ...values, selectedTemplateId } }).then(() => {
        setLastServerSave(new Date());
        form.reset(values);
        toast.success("Auto-saved", { duration: 2000 });
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [proposalId, getValues, getProposalTitle, form]);

  const handleExportJson = () => {
    const data = getValues();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proposal-draft.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON exported");
  };

  const buildMarkdown = useCallback(() => {
    const d = getValues() as ProposalEditorFormData;
    const accepted = (d.ai_enhanced_modules ?? []).filter((m: (AiEnhancedModule & { accepted: boolean })) => m.accepted);
    const pricing = (d.pricing_options ?? []).map((opt: PricingOption) => {
      const sum = (opt.breakdown ?? []).reduce((a: number, b: PricingBreakdownItem) => a + (b.cost_usd ?? 0), 0);
      const discount = opt.discount_percent ?? 0;
      return { name: opt.option_name, total: sum * (1 - discount / 100), breakdown: opt.breakdown ?? [] };
    });
    const parts = [
      "# Client Summary",
      d.client_summary || "_No summary._",
      "",
      "# Proposed Modules",
      ...accepted.map((m) => `- **${m.enhanced_name}** – ${m.why_better || ""}`),
      "",
      "# Phased Roadmap",
      ...(d.phased_roadmap ?? []).map(
        (p) => `- **${p.phase}** (${p.duration_weeks} weeks) – ${p.description || ""}`
      ),
      "",
      "# Pricing Options",
      ...pricing.map(
        (o) =>
          `## ${o.name}\n${(o.breakdown ?? []).map((b) => `- ${b.item}: $${b.cost_usd?.toLocaleString() ?? 0}`).join("\n")}\n\n**Total: $${Math.round(o.total).toLocaleString()}**`
      ),
    ];
    return d.final_proposal_text?.trim() || parts.join("\n\n");
  }, [getValues]);

  const handleCopyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      toast.success("Markdown copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [buildMarkdown]);

  const hasContent = useCallback(() => {
    const d = getValues();
    return !!(
      (d.client_summary ?? "").trim() ||
      (d.final_proposal_text ?? "").trim() ||
      (d.ai_enhanced_modules?.length ?? 0) > 0 ||
      (d.phased_roadmap?.length ?? 0) > 0 ||
      (d.pricing_options?.length ?? 0) > 0
    );
  }, [getValues]);

  const handleDownloadPdf = useCallback(async () => {
    if (isDownloading || !hasContent()) return;
    setIsDownloading(true);
    try {
      const proposalData = { ...getValues(), selectedTemplateId } as unknown as Record<string, unknown>;
      const res = await api.post("/api/proposals/download-proposal", proposalData, {
        responseType: "blob",
      });
      const blob = res.data as Blob;
      const contentType = res.headers["content-type"];
      if (contentType?.includes("application/json")) {
        const text = await blob.text();
        const json = JSON.parse(text) as { error?: string };
        toast.error(json.error || "Failed to generate PDF – try again", {
          style: { borderLeft: "4px solid #ef4444" },
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Proposal_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully!", {
        style: { borderLeft: "4px solid #22c55e" },
      });
    } catch (err: unknown) {
      let msg = "Failed to generate PDF – try again";
      if (err && typeof err === "object" && "response" in err) {
        const res = (err as { response?: { data?: Blob; status?: number } }).response;
        if (res?.data instanceof Blob) {
          try {
            const text = await res.data.text();
            const json = JSON.parse(text) as { error?: string };
            if (json.error) msg = json.error;
          } catch {
            // ignore
          }
        }
      }
      toast.error(msg, { style: { borderLeft: "4px solid #ef4444" } });
    } finally {
      setIsDownloading(false);
    }
  }, [getValues, hasContent, isDownloading]);

  const watchedValues = watch();
  const currentData = (watchedValues ?? getValues()) as ProposalEditorFormData;
  const previewData = getValues() as ProposalEditorFormData;
  const isViewOnly = false;

  const handleTemplateSelect = useCallback(
    (id: ProposalTemplateId) => {
      const prev = selectedTemplateId;
      setSelectedTemplateId(id);
      if (proposalId) {
        api
          .put(`/api/proposals/${proposalId}/template`, { templateId: id })
          .then(() => toast.success("Template applied", { style: { borderLeft: "4px solid #22c55e" } }))
          .catch(() => {
            setSelectedTemplateId(prev);
            toast.error("Could not update template", { style: { borderLeft: "4px solid #ef4444" } });
          });
      }
    },
    [proposalId, selectedTemplateId]
  );

  return (
    <div className={cn("space-y-0 pb-28 md:pb-24", unsavedHighlight && "animate-pulse")}>
      <div className="print:hidden sticky top-14 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-gradient-to-r from-card to-card/95 px-4 py-4 md:px-5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <FileText className="h-6 w-6 text-[#3b82f6] shrink-0" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
              Review & Customize Proposal
            </h1>
            <Badge
              variant="secondary"
              className={cn(
                "capitalize shrink-0",
                localStatus === "accepted" && "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
                localStatus === "sent" && "bg-[#3b82f6]/10 text-[#2563eb]",
                localStatus === "draft" && "bg-[#3b82f6]/10 text-[#3b82f6]"
              )}
            >
              {localStatus}
            </Badge>
            {proposalId && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg focus-visible:ring-2 focus-visible:ring-[#3b82f6]" disabled={isUpdatingStatus || localStatus === "sent"} onClick={() => handleStatusChange("sent")}>
                  Send
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg border-green-500/50 text-green-700 dark:text-green-400 hover:bg-green-500/10 focus-visible:ring-2 focus-visible:ring-green-500" disabled={isUpdatingStatus || localStatus === "accepted"} onClick={() => handleStatusChange("accepted")}>
                  Accept
                </Button>
              </div>
            )}
            {isDirty && (
              <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0">
                Unsaved
              </Badge>
            )}
            <div className="flex items-center gap-2 shrink-0">
                <Label htmlFor="compare-mode-toolbar" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
                  Compare (Original vs Edited)
                </Label>
                <Switch id="compare-mode-toolbar" checked={compareMode} onCheckedChange={setCompareMode} disabled={isViewOnly} className="focus-visible:ring-2 focus-visible:ring-[#3b82f6]" />
              </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border-r border-border pr-2">
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-lg" onClick={handleUndo} disabled={!undoRedo.canUndo || isViewOnly} type="button" title="Undo">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-lg" onClick={handleRedo} disabled={!undoRedo.canRedo || isViewOnly} type="button" title="Redo">
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-lg" onClick={handleExportJson} title="Export JSON">
              <FileJson className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-lg" onClick={handleCopyMarkdown} title="Copy Markdown">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-[#3b82f6]" onClick={() => setFullScreenPreviewOpen(true)}>
            <Maximize2 className="h-4 w-4" />
            <span className="hidden sm:inline">Full Screen</span>
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-[#3b82f6]" onClick={() => setShareDialogOpen(true)} disabled={!hasContent()}>
            <Share className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button size="sm" className="gap-1.5 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] focus-visible:ring-2 focus-visible:ring-[#3b82f6] shadow-md" onClick={handleDownloadPdf} disabled={isDownloading || !hasContent()} aria-label="Download PDF">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline">{isDownloading ? "Generating…" : "Download PDF"}</span>
          </Button>
        </div>
        {lastAutoSave && (
          <p className="w-full text-xs text-muted-foreground md:w-auto md:absolute md:bottom-2 md:left-1/2 md:-translate-x-1/2">
            Auto-saved at {lastAutoSave.toLocaleTimeString()}
          </p>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex flex-col md:flex-row md:gap-6 lg:gap-8 md:items-stretch">
        <div className={cn("min-w-0 md:w-[38%] lg:w-[36%] md:shrink-0 md:max-w-xl space-y-4 p-4 md:p-6 md:pr-4", isViewOnly && "opacity-70")}>
          <Accordion type="multiple" defaultValue={["summary", "modules", "roadmap", "pricing"]}>
            <AccordionItem value="summary">
              <AccordionTrigger>Client Summary</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <Label>Summary</Label>
                  <Textarea
                    {...form.register("client_summary")}
                    className="mt-1 min-h-[120px] rounded-xl border-slate-200 focus:ring-[#3b82f6]"
                    placeholder="Client needs and context..."
                    readOnly={isViewOnly}
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Comment / notes</Label>
                  <Textarea
                    {...form.register("summary_comment")}
                    className="mt-1 min-h-[60px] rounded-xl"
                    placeholder="Internal notes..."
                    readOnly={isViewOnly}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="modules">
              <AccordionTrigger>Extracted Modules & AI Enhancements</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <SortableContext items={modulesFields.fields.map((_, i) => `mod-${i}`)}>
                  {modulesFields.fields.map((field, i) => {
                    const mod = form.watch(`ai_enhanced_modules.${i}`);
                    const accepted = mod?.accepted ?? false;
                    return (
                      <SortableItem key={field.id} id={`mod-${i}`} disabled={isViewOnly}>
                        <Card
                          className={cn(
                            "overflow-hidden transition-all hover:shadow-lg",
                            accepted
                              ? "border-[#22c55e]/50 bg-emerald-50/30 dark:bg-emerald-950/20"
                              : "opacity-75 border-slate-200"
                          )}
                        >
                          <CardHeader className="py-3 flex flex-row items-start gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    "font-medium text-slate-900 dark:text-slate-100",
                                    !accepted && "line-through text-muted-foreground"
                                  )}
                                >
                                  {mod?.original_module_name} → {mod?.enhanced_name}
                                </p>
                                {accepted && (
                                  <Badge className="mt-1 bg-[#22c55e] text-white text-xs">
                                    Accepted
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Checkbox
                                  checked={accepted}
                                  onCheckedChange={(v) => {
                                    form.setValue(`ai_enhanced_modules.${i}.accepted`, !!v);
                                    setPreviewVersion((prev) => prev + 1);
                                  }}
                                  disabled={isViewOnly}
                                />
                                <span className="text-xs text-muted-foreground">Accept</span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-2">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {mod?.why_better}
                            </p>
                            {accepted && (
                              <div>
                                <Label className="text-xs">Enhanced name (editable)</Label>
                                <Input
                                  {...form.register(`ai_enhanced_modules.${i}.enhanced_name`)}
                                  className="mt-1 rounded-lg"
                                  readOnly={isViewOnly}
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </SortableItem>
                    );
                  })}
                </SortableContext>
                <div>
                  <Label className="text-muted-foreground">Section comment</Label>
                  <Textarea
                    {...form.register("modules_comment")}
                    className="mt-1 min-h-[60px] rounded-xl"
                    placeholder="Notes on modules..."
                    readOnly={isViewOnly}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="roadmap">
              <AccordionTrigger>Phased Roadmap</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <SortableContext items={roadmapFields.fields.map((_, i) => `road-${i}`)}>
                  {roadmapFields.fields.map((field, i) => (
                    <SortableItem key={field.id} id={`road-${i}`} disabled={isViewOnly}>
                      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              {...form.register(`phased_roadmap.${i}.phase`)}
                              placeholder="Phase name"
                              className="flex-1 rounded-lg"
                              readOnly={isViewOnly}
                            />
                            {!isViewOnly && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  roadmapFields.remove(i);
                                  setPreviewVersion((v) => v + 1);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <Textarea
                            {...form.register(`phased_roadmap.${i}.description`)}
                            placeholder="Description"
                            className="min-h-[80px] rounded-lg"
                            readOnly={isViewOnly}
                          />
                          <div>
                            <div className="flex justify-between text-sm">
                              <Label>Duration (weeks)</Label>
                              <span className="text-[#3b82f6] font-medium">
                                {form.watch(`phased_roadmap.${i}.duration_weeks`)} weeks
                              </span>
                            </div>
                            <Slider
                              value={[form.watch(`phased_roadmap.${i}.duration_weeks`) ?? 1]}
                              onValueChange={([v]) => {
                                form.setValue(`phased_roadmap.${i}.duration_weeks`, v ?? 1);
                                setPreviewVersion((x) => x + 1);
                              }}
                              min={1}
                              max={52}
                              step={1}
                              className="mt-2"
                              disabled={isViewOnly}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </SortableItem>
                  ))}
                </SortableContext>
                {!isViewOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      roadmapFields.append({ phase: "", description: "", duration_weeks: 4 });
                      setPreviewVersion((v) => v + 1);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add phase
                  </Button>
                )}
                <div>
                  <Label className="text-muted-foreground">Section comment</Label>
                  <Textarea
                    {...form.register("roadmap_comment")}
                    className="mt-1 min-h-[60px] rounded-xl"
                    placeholder="Notes on roadmap..."
                    readOnly={isViewOnly}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pricing">
              <AccordionTrigger>Pricing Options</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <SortableContext items={pricingFields.fields.map((_, i) => `price-${i}`)}>
                {pricingFields.fields.map((field, optIndex) => {
                  const total = form.watch(`pricing_options.${optIndex}.total_price_usd`) ?? 0;
                  const discount = form.watch(`pricing_options.${optIndex}.discount_percent`) ?? 0;
                  const finalTotal = total * (1 - discount / 100);
                  return (
                    <SortableItem key={field.id} id={`price-${optIndex}`} disabled={isViewOnly}>
                    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                      <CardHeader className="py-3 flex flex-row items-center gap-2">
                        <Input
                          {...form.register(`pricing_options.${optIndex}.option_name`)}
                          placeholder="Option name"
                          className="flex-1 rounded-lg"
                          readOnly={isViewOnly}
                        />
                        {!isViewOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              pricingFields.remove(optIndex);
                              setPreviewVersion((v) => v + 1);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Discount</span>
                          <span className="font-medium text-[#3b82f6]">{discount}%</span>
                        </div>
                        <Slider
                          value={[discount]}
                          onValueChange={([v]) => {
                            form.setValue(`pricing_options.${optIndex}.discount_percent`, v ?? 0);
                            setPreviewVersion((x) => x + 1);
                          }}
                          min={0}
                          max={50}
                          step={5}
                          disabled={isViewOnly}
                        />
                        <p className="text-sm">
                          Total: ${total.toLocaleString()} →{" "}
                          <strong className="text-[#3b82f6]">${Math.round(finalTotal).toLocaleString()}</strong>
                        </p>
                        <PricingBreakdownTable
                          name={`pricing_options.${optIndex}.breakdown`}
                          register={form.register}
                          removeRow={(idx) => {
                            const arr = form.getValues(`pricing_options.${optIndex}.breakdown`);
                            if (arr.length > 1) {
                              const next = arr.filter((_: unknown, i: number) => i !== idx);
                              form.setValue(`pricing_options.${optIndex}.breakdown`, next);
                              setPreviewVersion((v) => v + 1);
                            }
                          }}
                          appendRow={() => {
                            const arr = form.getValues(`pricing_options.${optIndex}.breakdown`) ?? [];
                            form.setValue(`pricing_options.${optIndex}.breakdown`, [
                              ...arr,
                              { item: "", cost_usd: 0 },
                            ]);
                            setPreviewVersion((v) => v + 1);
                          }}
                          rows={form.watch(`pricing_options.${optIndex}.breakdown`) ?? []}
                          readOnly={isViewOnly}
                        />
                      </CardContent>
                    </Card>
                    </SortableItem>
                  );
                })}
                </SortableContext>
                {!isViewOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      pricingFields.append({
                        option_name: "",
                        total_price_usd: 0,
                        breakdown: [{ item: "", cost_usd: 0 }],
                        discount_percent: 0,
                      });
                      setPreviewVersion((v) => v + 1);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add option
                  </Button>
                )}
                <div>
                  <Label className="text-muted-foreground">Section comment</Label>
                  <Textarea
                    {...form.register("pricing_comment")}
                    className="mt-1 min-h-[60px] rounded-xl"
                    placeholder="Notes on pricing..."
                    readOnly={isViewOnly}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="md:hidden flex justify-center py-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl border-[#3b82f6]/50 text-[#3b82f6]"
              onClick={() => document.getElementById("live-preview-section")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Maximize2 className="h-4 w-4" />
              Show Preview
            </Button>
          </div>
        </div>

        <div id="live-preview-section" className="min-w-0 flex-1 md:min-h-[80vh] md:sticky md:top-24 md:self-start flex flex-col px-4 pb-6 md:px-0 md:pb-0">
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-card shadow-lg min-h-[70vh] md:min-h-[80vh] flex flex-col transition-all duration-200 overflow-hidden">
            <div className="flex-shrink-0 overflow-visible min-h-[160px]">
              <TemplateSelector
                selectedId={selectedTemplateId}
                onSelect={handleTemplateSelect}
              />
            </div>
            <div className="border-b border-slate-200/80 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-900/40 px-5 py-3 shrink-0">
              <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">
                Live Preview
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-6 md:p-8 min-h-0 bg-white dark:bg-slate-950/30">
              <ProposalPreview
                key={previewVersion}
                data={previewData}
                originalData={compareMode ? initial : undefined}
                documentLayout={true}
                selectedTemplateId={selectedTemplateId}
              />
            </div>
          </div>
        </div>
      </div>
      </DndContext>

      <Dialog open={fullScreenPreviewOpen} onOpenChange={setFullScreenPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0 print:hidden">
          <DialogHeader className="print:hidden flex flex-row items-center justify-between gap-4 border-b px-6 py-4">
            <DialogTitle>Proposal Preview</DialogTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setFullScreenPreviewOpen(false);
                  setShareDialogOpen(true);
                }}
                disabled={!hasContent()}
              >
                <Share className="h-4 w-4" />
                Share
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  window.print();
                }}
                className="gap-1"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFullScreenPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6">
            <ProposalPreview
              key={previewVersion}
              data={previewData}
              originalData={compareMode ? initial : undefined}
              documentLayout={true}
              selectedTemplateId={selectedTemplateId}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ShareProposalDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        proposalId={proposalId}
        proposalData={
          hasContent()
            ? {
                title: (currentData?.client_summary?.slice(0, 60) || "Proposal").trim() || "Proposal",
                content: { ...(getValues() as unknown as Record<string, unknown>), selectedTemplateId },
              }
            : undefined
        }
        proposalTitle={(currentData?.client_summary?.slice(0, 60) || "Proposal").trim() || "Proposal"}
        onShareSuccess={() => {
          if (proposalId) {
            queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
            queryClient.invalidateQueries({ queryKey: ["proposals"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
          }
        }}
      />

      <div className="print:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-t from-background to-background/95 border-t border-border p-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl focus-visible:ring-2 focus-visible:ring-[#3b82f6]" onClick={handleRegenerate} disabled={isRegenerating || isViewOnly}>
            {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Regenerate AI
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl border-[#22c55e]/50 text-[#22c55e] hover:bg-[#22c55e]/10 focus-visible:ring-2 focus-visible:ring-green-500" onClick={handleAcceptAll} disabled={!(getValues("ai_enhanced_modules")?.length)}>
            <CheckCheck className="h-4 w-4" />
            Make as accepted
          </Button>
        </div>
        <div className="order-last w-full md:order-none md:w-auto flex justify-center">
          <Button size="lg" className="gap-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] shadow-md focus-visible:ring-2 focus-visible:ring-[#3b82f6] w-full md:w-auto min-w-[140px]" onClick={handleSaveDraft} disabled={isSaving || isViewOnly}>
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Save Draft
          </Button>
        </div>
        {proposalId ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 border-red-200 dark:border-red-900/50 focus-visible:ring-2 focus-visible:ring-red-500" onClick={() => setDeleteDialogOpen(true)} disabled={isDeleting}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button variant="secondary" size="sm" className="gap-2 rounded-xl focus-visible:ring-2 focus-visible:ring-[#3b82f6]" onClick={handleDuplicate}>
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
          </div>
        ) : (
          <div className="w-20 shrink-0" />
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-xl shadow-lg max-w-md min-w-[min(24rem,95vw)] border-red-200 dark:border-red-900/50 p-6 bg-white dark:bg-slate-900">
          <DialogHeader className="px-0 pt-0 pb-0 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <DialogTitle className="text-lg">Delete proposal?</DialogTitle>
                <DialogDescription className="text-left">
                  {((proposalTitleProp && proposalTitleProp.trim())
                  ? `"${proposalTitleProp.length > 55 ? proposalTitleProp.slice(0, 55) + "…" : proposalTitleProp}" will be permanently removed. `
                  : "This proposal will be permanently removed. ")}
                This cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 justify-end pt-6 pb-0 px-0 sm:gap-3">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} className="rounded-xl shrink-0">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 gap-2 shrink-0"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PricingBreakdownTable({
  name,
  register,
  removeRow,
  appendRow,
  rows,
  readOnly = false,
}: {
  name: `pricing_options.${number}.breakdown`;
  register: ReturnType<typeof useForm<ProposalEditorFormData>>["register"];
  removeRow: (index: number) => void;
  appendRow: () => void;
  rows: { item: string; cost_usd: number }[];
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>Breakdown</Label>
      <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800">
            <th className="text-left p-2">Item</th>
            <th className="text-left p-2">Cost ($)</th>
            {!readOnly && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((_, i) => (
            <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
              <td className="p-1">
                <Input
                  {...register(`${name}.${i}.item`)}
                  className="h-8 border-0 bg-transparent"
                  placeholder="Item"
                  readOnly={readOnly}
                />
              </td>
              <td className="p-1">
                <Input
                  type="number"
                  {...register(`${name}.${i}.cost_usd`, { valueAsNumber: true })}
                  className="h-8 border-0 bg-transparent w-24"
                  placeholder="0"
                  readOnly={readOnly}
                />
              </td>
              {!readOnly && (
                <td className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={appendRow}>
          <Plus className="h-3 w-3" />
          Add row
        </Button>
      )}
    </div>
  );
}
