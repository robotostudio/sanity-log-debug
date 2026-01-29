"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { Upload, Trash2, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

interface R2File {
  key: string;
  size: number;
  lastModified: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

interface FileManagerProps {
  selectedFile: string | null;
  onSelectFile: (key: string | null) => void;
}

export function FileManager({ selectedFile, onSelectFile }: FileManagerProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data, isLoading } = useSWR<{ files: R2File[] }>(
    "/api/files",
    fetcher,
  );

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith(".ndjson")) {
      alert("Please upload an .ndjson file");
      return;
    }

    setUploading(true);

    try {
      // Get presigned URL
      const presignRes = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URL");

      const { url, key } = await presignRes.json();

      // Upload directly to R2
      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/x-ndjson" },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload file");

      // Refresh file list and select new file
      await mutate("/api/files");
      onSelectFile(key);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [onSelectFile]);

  const handleDelete = async (key: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      await mutate("/api/files");

      if (selectedFile === key) {
        onSelectFile(null);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Delete failed. Please try again.");
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const files = data?.files ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          {selectedFile
            ? selectedFile.split("/").pop()?.substring(0, 20) + "..."
            : "Select Log File"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Log Files</DialogTitle>
        </DialogHeader>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
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
            disabled={uploading}
          />
          <Button asChild variant="secondary" size="sm" disabled={uploading}>
            <label htmlFor="file-upload" className="cursor-pointer">
              {uploading ? "Uploading..." : "Browse Files"}
            </label>
          </Button>
        </div>

        {/* File List */}
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading files...
            </p>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No files uploaded yet
            </p>
          ) : (
            files.map((file) => (
              <div
                key={file.key}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                  selectedFile === file.key ? "bg-accent border-primary" : ""
                }`}
                onClick={() => {
                  onSelectFile(file.key);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {selectedFile === file.key && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.key.split("/").pop()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)} &middot;{" "}
                      {formatDistanceToNow(new Date(file.lastModified), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.key);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
