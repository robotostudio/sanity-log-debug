"use client";

import { cn } from "@/lib/utils";

export type DatePreset = "24h" | "7d" | "30d" | "custom" | null;

interface DatePresetsProps {
  activePreset: DatePreset;
  onPresetSelect: (preset: DatePreset) => void;
}

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

export function DatePresets({
  activePreset,
  onPresetSelect,
}: DatePresetsProps) {
  return (
    <div className="flex items-center gap-1">
      {PRESETS.map(({ label, value }) => (
        <button
          type="button"
          key={value}
          onClick={() => onPresetSelect(activePreset === value ? null : value)}
          className={cn(
            "h-7 px-3 rounded-full text-xs font-medium transition-colors",
            "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950",
            activePreset === value
              ? "border-zinc-600 bg-zinc-800 text-zinc-100"
              : "border-zinc-800 bg-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-300",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
