"use client";

import { cn } from "@/lib/utils";

type StudioValue = "all" | "true" | "false";

interface StudioToggleProps {
  value: StudioValue;
  onChange: (value: StudioValue) => void;
}

export function StudioToggle({ value, onChange }: StudioToggleProps) {
  return (
    <div className="ml-2 flex items-center gap-0.5 border-l border-zinc-800 pl-2">
      <span className="mr-1.5 text-xs text-zinc-500">Origin:</span>
      <div className="flex items-center rounded-[8px] border border-zinc-800 p-0.5">
        {(["all", "true", "false"] as const).map((opt) => (
          <button
            type="button"
            key={opt}
            className={cn(
              "h-6 rounded-[6px] px-2.5 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950",
              value === opt
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-300",
            )}
            onClick={() => onChange(opt)}
          >
            {opt === "all" ? "All" : opt === "true" ? "Studio" : "External"}
          </button>
        ))}
      </div>
    </div>
  );
}
