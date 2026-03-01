"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SortableItemProps = {
  id: string;
  children: ReactNode;
  className?: string;
  /** Optional: attach drag listeners to a handle only; if false, whole card is draggable */
  useHandle?: boolean;
};

export function SortableItem({ id, children, className, useHandle = true }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    transition: {
      duration: 200,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl transition-shadow duration-200",
        isDragging && "opacity-90 scale-[1.02] shadow-xl z-50 ring-2 ring-[#3b82f6] ring-offset-2 bg-card",
        className
      )}
    >
      {useHandle ? (
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="mt-1 p-1 rounded cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      ) : (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          {children}
        </div>
      )}
    </div>
  );
}
