"use client";

import { type ReactNode, useCallback, useId, useRef } from "react";
import { useUploadActions, useUploadMeta } from "./upload-context";

// ============================================================================
// Compound Component: Upload.Trigger
// ============================================================================

interface UploadTriggerProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function UploadTrigger({
  children,
  className,
  disabled,
}: UploadTriggerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const { upload } = useUploadActions();
  const { acceptedTypes, isUploading } = useUploadMeta();
  const isDisabled = disabled || isUploading;

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      await upload(file);
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [upload]
  );

  return (
    <label htmlFor={isDisabled ? undefined : inputId} className={className}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isDisabled}
      />
      {children}
    </label>
  );
}
