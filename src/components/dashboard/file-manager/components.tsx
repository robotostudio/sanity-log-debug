"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, FileText, Trash2, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFileManager } from "./context";
import type { R2File } from "./types";
import { formatBytes, getFileName, truncateFileName } from "./utils";

// ============================================================================
// Trigger Button
// ============================================================================

export function FileManagerTrigger() {
  const { state } = useFileManager();
  const displayName = state.selectedFile
    ? truncateFileName(state.selectedFile)
    : "Select Log File";

  return (
    <DialogTrigger asChild>
      <Button variant="outline" size="sm">
        <FileText className="mr-2 h-4 w-4" />
        {displayName}
      </Button>
    </DialogTrigger>
  );
}

// ============================================================================
// Drop Zone
// ============================================================================

export function DropZone() {
  const { state, actions } = useFileManager();

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      actions.setDragOver(true);
    },
    [actions],
  );

  const handleDragLeave = useCallback(() => {
    actions.setDragOver(false);
  }, [actions]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      actions.setDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        try {
          await actions.uploadFile(file);
        } catch (error) {
          alert(error instanceof Error ? error.message : "Upload failed");
        }
      }
    },
    [actions],
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          await actions.uploadFile(file);
        } catch (error) {
          alert(error instanceof Error ? error.message : "Upload failed");
        }
      }
    },
    [actions],
  );

  const dropZoneClassName = state.isDragOver
    ? "border-primary bg-primary/5"
    : "border-muted-foreground/25";

  return (
    <section
      aria-label="File drop zone"
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dropZoneClassName}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground mb-2">
        Drag & drop an .ndjson file here
      </p>
      <input
        type="file"
        accept=".ndjson"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
        disabled={state.isUploading}
      />
      <Button
        asChild
        variant="secondary"
        size="sm"
        disabled={state.isUploading}
      >
        <label htmlFor="file-upload" className="cursor-pointer">
          {state.isUploading ? "Uploading..." : "Browse Files"}
        </label>
      </Button>
    </section>
  );
}

// ============================================================================
// File List
// ============================================================================

interface FileListProps {
  onFileClick?: () => void;
}

export function FileList({ onFileClick }: FileListProps) {
  const { state } = useFileManager();

  if (state.isLoading) {
    return <FileListMessage>Loading files...</FileListMessage>;
  }

  if (state.files.length === 0) {
    return <FileListMessage>No files uploaded yet</FileListMessage>;
  }

  return (
    <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
      {state.files.map((file) => (
        <FileListItem key={file.key} file={file} onSelect={onFileClick} />
      ))}
    </div>
  );
}

function FileListMessage({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-muted-foreground text-center py-4">
        {children}
      </p>
    </div>
  );
}

// ============================================================================
// File List Item
// ============================================================================

interface FileListItemProps {
  file: R2File;
  onSelect?: () => void;
}

function FileListItem({ file, onSelect }: FileListItemProps) {
  const { state, actions } = useFileManager();
  const isSelected = state.selectedFile === file.key;

  const handleClick = useCallback(() => {
    actions.selectFile(file.key);
    onSelect?.();
  }, [actions, file.key, onSelect]);

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("Are you sure you want to delete this file?")) return;

      try {
        await actions.deleteFile(file.key);
      } catch {
        alert("Delete failed. Please try again.");
      }
    },
    [actions, file.key],
  );

  const itemClassName = isSelected ? "bg-accent border-primary" : "";

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors w-full text-left ${itemClassName}`}
      onClick={handleClick}
    >
      <FileItemContent file={file} isSelected={isSelected} />
      <DeleteButton onClick={handleDelete} />
    </button>
  );
}

function FileItemContent({
  file,
  isSelected,
}: {
  file: R2File;
  isSelected: boolean;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{getFileName(file.key)}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(file.size)} &middot;{" "}
          {formatDistanceToNow(new Date(file.lastModified), {
            addSuffix: true,
          })}
        </p>
      </div>
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="flex-shrink-0 h-8 w-8 text-destructive hover:text-destructive"
      onClick={onClick}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

// ============================================================================
// Dialog Components
// ============================================================================

interface FileManagerDialogProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FileManagerDialog({
  children,
  open,
  onOpenChange,
}: FileManagerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
}

export function FileManagerDialogContent({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Manage Log Files</DialogTitle>
      </DialogHeader>
      {children}
    </DialogContent>
  );
}
