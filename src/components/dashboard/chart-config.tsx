import { SEVERITY_COLORS } from "@/lib/constants";

// ============================================================================
// Shared Recharts Configuration
// ============================================================================

export const AXIS_TICK_STYLE = { fontSize: 10, fill: "#71717a" } as const;

export const AXIS_STROKE = "#3f3f46";

export const GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: "rgba(39, 39, 42, 0.5)",
  vertical: false,
} as const;

export const ANIMATION_DEFAULTS = {
  isAnimationActive: true,
  animationDuration: 400,
  animationEasing: "ease-out" as const,
};

// ============================================================================
// Tooltip Components
// ============================================================================

export function ChartTooltipWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/80 p-3 text-xs shadow-xl backdrop-blur-md">
      {children}
    </div>
  );
}

export function TooltipDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

// ============================================================================
// SVG Gradient Definitions for Area Charts
// ============================================================================

export function AreaGradientDefs() {
  return (
    <defs>
      <linearGradient id="gradient-info" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SEVERITY_COLORS.INFO} stopOpacity={0.6} />
        <stop
          offset="100%"
          stopColor={SEVERITY_COLORS.INFO}
          stopOpacity={0.1}
        />
      </linearGradient>
      <linearGradient id="gradient-warn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SEVERITY_COLORS.WARN} stopOpacity={0.6} />
        <stop
          offset="100%"
          stopColor={SEVERITY_COLORS.WARN}
          stopOpacity={0.1}
        />
      </linearGradient>
      <linearGradient id="gradient-error" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SEVERITY_COLORS.ERROR} stopOpacity={0.6} />
        <stop
          offset="100%"
          stopColor={SEVERITY_COLORS.ERROR}
          stopOpacity={0.1}
        />
      </linearGradient>
    </defs>
  );
}
