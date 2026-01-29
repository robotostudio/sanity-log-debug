"use client";

import { PageHeader } from "@/components/layout/page-header";
import { UploadZone } from "./upload-zone";
import { SourceList } from "./source-list";
import { useSources } from "./use-sources";

export function SourcesPage() {
  const {
    sources,
    isLoading,
    isUploading,
    uploadProgress,
    uploadFile,
    deleteSource,
  } = useSources();

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
