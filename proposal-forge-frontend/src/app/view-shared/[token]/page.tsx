"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProposalPreview } from "@/components/Proposal/ProposalPreview";
import type { ProposalEditorFormData } from "@/types/proposal-editor";
import { Skeleton } from "@/components/ui/skeleton";

export default function ViewSharedPage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";

  type ViewSharedResponse = {
    title: string;
    content?: ProposalEditorFormData;
    views?: number;
    sharedAt?: string;
    templateId?: string;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["view-shared", token],
    queryFn: async () => {
      const res = await api.get<ViewSharedResponse>(`/api/view-shared/${token}`);
      return res.data;
    },
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-background dark:from-slate-950 dark:to-background">
        <p className="text-muted-foreground font-medium">Invalid link</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-50 to-background dark:from-slate-950 dark:to-background p-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full max-w-2xl rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-background dark:from-slate-950 dark:to-background p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Link expired or not found</h1>
          <p className="text-muted-foreground mt-1">This proposal link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  const content = data.content as (ProposalEditorFormData & { selectedTemplateId?: string }) | undefined;
  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-background dark:from-slate-950 dark:to-background p-6">
        <p className="text-muted-foreground font-medium">No content to display</p>
      </div>
    );
  }

  const selectedTemplateId =
    (typeof data.templateId === "string" ? data.templateId : undefined) ??
    (typeof content.selectedTemplateId === "string" ? content.selectedTemplateId : undefined);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50/80 to-background dark:from-slate-950/80 dark:to-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
            {data.title || "Proposal"}
          </h1>
          {typeof data.views === "number" && (
            <span className="text-sm text-muted-foreground">
              Viewed {data.views} time{data.views !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <ProposalPreview
          data={content}
          documentLayout={true}
          selectedTemplateId={selectedTemplateId ?? "modern-blue"}
        />
      </div>
    </div>
  );
}
