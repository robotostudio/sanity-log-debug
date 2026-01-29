"use client";

import { useState } from "react";
import {
  DropZone,
  FileList,
  FileManagerDialog,
  FileManagerDialogContent,
  FileManagerTrigger,
} from "./components";
import { FileManagerProvider } from "./provider";

// ============================================================================
// Compound Component Export
// ============================================================================

export const FileManager = {
  Provider: FileManagerProvider,
  Dialog: FileManagerDialog,
  DialogContent: FileManagerDialogContent,
  Trigger: FileManagerTrigger,
  DropZone,
  FileList,
};

// ============================================================================
// Pre-composed Default Variant
// ============================================================================

interface FileManagerDefaultProps {
  selectedFile: string | null;
  onSelectFile: (key: string | null) => void;
}

export function FileManagerDefault({
  selectedFile,
  onSelectFile,
}: FileManagerDefaultProps) {
  const [open, setOpen] = useState(false);

  return (
    <FileManager.Provider
      selectedFile={selectedFile}
      onSelectFile={onSelectFile}
    >
      <FileManager.Dialog open={open} onOpenChange={setOpen}>
        <FileManager.Trigger />
        <FileManager.DialogContent>
          <FileManager.DropZone />
          <FileManager.FileList onFileClick={() => setOpen(false)} />
        </FileManager.DialogContent>
      </FileManager.Dialog>
    </FileManager.Provider>
  );
}

// ============================================================================
// Re-exports
// ============================================================================

export { useFileManager } from "./context";
export type {
  FileManagerActions,
  FileManagerContextValue,
  FileManagerState,
  R2File,
} from "./types";
