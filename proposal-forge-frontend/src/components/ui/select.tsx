"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SelectOption = { value: string; label: string };

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: "sm" | "default" | "lg";
  wrapperClassName?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

const sizeClasses = {
  sm: "h-8 pl-3 pr-8 text-xs min-w-[100px]",
  default: "h-10 pl-4 pr-10 text-sm min-w-[120px]",
  lg: "h-11 pl-4 pr-10 text-base min-w-[140px]",
};

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      onValueChange,
      options,
      placeholder = "Select…",
      size = "default",
      wrapperClassName,
      className,
      disabled,
      "aria-label": ariaLabel,
    },
    ref
  ) => {
    const selected = options.find((o) => o.value === value);
    const displayLabel = selected?.label ?? placeholder;
    const [open, setOpen] = React.useState(false);

    return (
      <div className={cn("relative inline-block min-w-0", wrapperClassName ?? "w-full")}>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              ref={ref}
              type="button"
              disabled={disabled}
              aria-label={ariaLabel}
              aria-haspopup="listbox"
              aria-expanded={open}
              className={cn(
                "w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-medium text-slate-900 dark:text-slate-100 text-left",
                "cursor-pointer transition-colors",
                "hover:border-slate-300 dark:hover:border-slate-600",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200",
                sizeClasses[size],
                className
              )}
            >
              <span className="truncate">{displayLabel}</span>
              <ChevronDown
                className={cn(
                  "ml-1 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400 transition-transform",
                  open && "rotate-180"
                )}
                aria-hidden
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-[10rem] rounded-xl border border-slate-200 dark:border-slate-700 bg-popover p-1.5 shadow-lg"
            sideOffset={6}
          >
            {options.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  "focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-slate-900 dark:focus:text-slate-100",
                  "data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800",
                  opt.value === value && "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                )}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
);
Select.displayName = "Select";
