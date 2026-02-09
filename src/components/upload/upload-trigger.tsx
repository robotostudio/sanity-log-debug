"use client";

import { type ReactNode, useCallback, useRef } from "react";
import { useUploadActions, useUploadMeta } from "./upload-context";

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
  const { upload } = useUploadActions();
  const { acceptedTypes, isUploading } = useUploadMeta();
  const isDisabled = disabled || isUploading;

  const handleClick = useCallback(() => {
    if (isDisabled) return;
    inputRef.current?.click();
  }, [isDisabled]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      await upload(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [upload],
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isDisabled}
      />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper for compound trigger — child Button handles a11y */}
      <div onClick={handleClick} className={className}>
        {children}
      </div>
    </>
  );
}
