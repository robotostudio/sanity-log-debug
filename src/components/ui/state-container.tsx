import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StateContainerProps {
  /** "inline" for inside cards (no border), "card" for standalone bordered container */
  variant?: "inline" | "card";
  /** Icon element to display */
  icon: ReactNode;
  /** Background class for the icon circle. Defaults to neutral bg-zinc-800/50 */
  iconBg?: string;
  /** Title text */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Optional action element (button/link) below description */
  action?: ReactNode;
  className?: string;
}

export function StateContainer({
  variant = "inline",
  icon,
  iconBg = "bg-zinc-800/50",
  title,
  description,
  action,
  className,
}: StateContainerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "inline" && "py-12",
        variant === "card" &&
          "rounded-lg border border-zinc-800 bg-transparent py-16",
        className,
      )}
    >
      <div className={cn("rounded-full p-3", iconBg)}>{icon}</div>
      <h3 className="mt-4 text-sm font-medium text-zinc-200">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-zinc-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
