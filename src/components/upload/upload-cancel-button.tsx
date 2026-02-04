"use client";

import { X, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUploadState, useUploadActions } from "./upload-context";

// ============================================================================
// Compound Component: Upload.CancelButton
// ============================================================================

interface UploadCancelButtonProps {
  className?: string;
  variant?: "icon" | "ghost" | "button";
  size?: "sm" | "default";
}

export function UploadCancelButton({
  className,
  variant = "ghost",
  size = "sm",
}: UploadCancelButtonProps) {
  const { status } = useUploadState();
  const { cancel } = useUploadActions();

  if (status !== "uploading") {
    return null;
  }

  if (variant === "icon") {
    return (
      <button
        onClick={cancel}
        className={cn(
          "rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300",
          className
        )}
        title="Cancel upload"
      >
        <X className={cn("h-3 w-3", size === "default" && "h-4 w-4")} />
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={cancel}
      className={cn("text-zinc-400 hover:text-zinc-100", className)}
    >
      <Pause className={cn("h-4 w-4", size === "default" && "h-5 w-5")} />
    </Button>
  );
}
