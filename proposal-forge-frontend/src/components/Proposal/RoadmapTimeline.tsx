"use client";

import type { RoadmapPhase } from "@/types/proposal-editor";
import { cn } from "@/lib/utils";

const MAX_WEEKS = 52;

type RoadmapTimelineProps = {
  phases: RoadmapPhase[];
  className?: string;
};

export function RoadmapTimeline({ phases, className }: RoadmapTimelineProps) {
  if (!phases?.length) {
    return (
      <p className="text-sm text-muted-foreground italic">No phases defined.</p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {phases.map((phase, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              {phase.phase || `Phase ${i + 1}`}
            </h4>
            <span className="text-sm font-medium text-[#3b82f6] shrink-0">
              {phase.duration_weeks ?? 0} weeks
            </span>
          </div>
          {phase.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              {phase.description}
            </p>
          )}
          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#3b82f6] transition-all duration-500"
              style={{
                width: `${Math.min(100, ((phase.duration_weeks ?? 0) / MAX_WEEKS) * 100)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
