"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { ModuleEditor } from "@/components/Proposal/ModuleEditor";
import { contentToEditorFormData } from "@/types/proposal-editor";
import type { ProposalEditorFormData } from "@/types/proposal-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ProposalDoc = {
  _id: string;
  title: string;
  status: string;
  content?: unknown;
  clientName?: string;
  templateId?: string;
};

export default function ProposalEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const res = await api.get<ProposalDoc>(`/api/proposals/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invalid proposal ID</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50/80 to-background dark:from-slate-950/80 dark:to-background">
        <div className="mx-auto max-w-[1600px] w-full px-4 py-4 md:px-6 lg:px-8">
          <Skeleton className="h-10 w-64 mb-6 rounded-xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    toast.error("Proposal not found or failed to load");
    router.replace("/");
    return null;
  }

  const initialFormData: ProposalEditorFormData = contentToEditorFormData(data.content);
  const contentObj = data.content && typeof data.content === "object" ? (data.content as Record<string, unknown>) : {};
  const initialSelectedTemplateId =
    (typeof data.templateId === "string" ? data.templateId : undefined) ??
    (typeof contentObj.selectedTemplateId === "string" ? contentObj.selectedTemplateId : undefined);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50/80 to-background dark:from-slate-950/80 dark:to-background">
      <div className="mx-auto max-w-[1600px] w-full px-4 py-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2 shrink-0 rounded-xl"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
            {data.title}
          </h1>
        </div>
        <ModuleEditor
          proposalId={id}
          initialFormData={initialFormData}
          initialSelectedTemplateId={initialSelectedTemplateId}
          proposalTitle={data.title}
          proposalStatus={data.status}
        />
      </div>
    </main>
  );
}
