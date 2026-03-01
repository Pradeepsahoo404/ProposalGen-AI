"use client";

import type { RoadmapPhase } from "@/types/proposal-editor";
import { cn } from "@/lib/utils";

const MAX_WEEKS = 52;

type RoadmapVariant = "default" | "list" | "compact";

type RoadmapTimelineProps = {
  phases: RoadmapPhase[];
  className?: string;
  variant?: RoadmapVariant;
  accentColor?: string;
};

export function RoadmapTimeline({ phases, className, variant = "default", accentColor = "#3b82f6" }: RoadmapTimelineProps) {
  if (!phases?.length) {
    return (
      <p className="text-sm text-muted-foreground italic">No phases defined.</p>
    );
  }

  if (variant === "list") {
    return (
      <ul className={cn("space-y-2 list-none", className)}>
        {phases.map((phase, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-200 dark:border-slate-700 last:border-0">
            <span className="font-medium text-slate-900 dark:text-slate-100">{phase.phase || `Phase ${i + 1}`}</span>
            <span className="text-sm shrink-0" style={{ color: accentColor }}>{phase.duration_weeks ?? 0} weeks</span>
          </li>
        ))}
      </ul>
    );
  }

  const isCompact = variant === "compact";
  return (
    <div className={cn(isCompact ? "space-y-2" : "space-y-4", className)}>
      {phases.map((phase, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border border-slate-200 dark:border-slate-700 transition-shadow",
            isCompact ? "p-2.5 bg-slate-50/30 dark:bg-slate-900/20" : "bg-slate-50/50 dark:bg-slate-900/30 p-4 hover:shadow-md"
          )}
        >
          <div className={cn("flex items-center justify-between gap-2", isCompact && "mb-1")}>
            <h4 className={cn("font-semibold text-slate-900 dark:text-slate-100", isCompact && "text-sm")}>
              {phase.phase || `Phase ${i + 1}`}
            </h4>
            <span className={cn("font-medium shrink-0", isCompact ? "text-xs" : "text-sm")} style={{ color: accentColor }}>
              {phase.duration_weeks ?? 0} weeks
            </span>
          </div>
          {phase.description && (
            <p className={cn("text-slate-600 dark:text-slate-400", isCompact ? "text-xs mb-1.5" : "text-sm mb-3")}>
              {phase.description}
            </p>
          )}
          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, ((phase.duration_weeks ?? 0) / MAX_WEEKS) * 100)}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
