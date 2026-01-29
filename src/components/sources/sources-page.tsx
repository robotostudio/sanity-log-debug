"use client";

import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SourceList } from "./source-list";
import { UploadZone } from "./upload-zone";
import { useSources } from "./use-sources";

export function SourcesPage() {
  const {
    sources,
    isLoading,
    error,
    isUploading,
    uploadProgress,
    uploadFile,
    deleteSource,
  } = useSources();

  // Show error state when data fails to load
  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Sources"
          description="Upload and manage your data sources"
        />

        <div className="flex flex-col items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-zinc-100">
            Error Loading Sources
          </h3>
          <p className="mt-2 text-sm text-zinc-400 max-w-md">
            {error.message ??
              "An unexpected error occurred while loading the data sources."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sources"
        description="Upload and manage your data sources"
      />

      <UploadZone
        onUpload={uploadFile}
        isUploading={isUploading}
        progress={uploadProgress}
      />

      <div>
        <h2 className="mb-4 text-lg font-medium text-zinc-100">Data Sources</h2>
        <SourceList
          sources={sources}
          isLoading={isLoading}
          onDelete={deleteSource}
        />
      </div>
    </div>
  );
}
