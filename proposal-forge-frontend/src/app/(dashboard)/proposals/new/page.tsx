"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProposalForm } from "@/components/Proposal/ProposalForm";
import { Button } from "@/components/ui/button";

export default function NewProposalPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50/80 to-background dark:from-slate-950/80 dark:to-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 rounded-xl text-muted-foreground hover:text-foreground -ml-2 shrink-0"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Create New Proposal
          </h1>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-card shadow-card overflow-hidden p-6 md:p-10 lg:p-12 min-h-[calc(100vh-12rem)] flex flex-col">
          <ProposalForm />
        </div>
      </div>
    </main>
  );
}
