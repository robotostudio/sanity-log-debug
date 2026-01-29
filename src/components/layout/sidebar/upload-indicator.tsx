"use client";

import { Loader2, CheckCircle2, XCircle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpload } from "@/components/sources/upload-provider";
import { useSidebar } from "./sidebar-provider";

export function UploadIndicator() {
  const { isUploading, uploadProgress } = useUpload();
  const { isCollapsed } = useSidebar();

  if (uploadProgress.status === "idle") {
    return null;
  }

  return (
    <div className="border-t border-zinc-800 p-2">
      <div
        className={cn(
          "flex items-center gap-3 rounded-md bg-zinc-900 px-3 py-2",
          isCollapsed && "justify-center px-2"
        )}
      >
        <StatusIcon status={uploadProgress.status} />

        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-300">
              {uploadProgress.fileName ?? "Uploading..."}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-zinc-800">
                <div
                  className="h-1 rounded-full bg-zinc-400 transition-all duration-200"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-zinc-500">
                {uploadProgress.percentage}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "uploading":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />;
    case "complete":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />;
    case "error":
      return <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
    default:
      return <Upload className="h-4 w-4 shrink-0 text-zinc-500" />;
  }
}
