"use client";

import { useCallback, useRef } from "react";
import { DatabaseIconSm } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { SourceList, SourceListSkeleton } from "./source-list";
import { useSources } from "./use-sources";

export function SourcesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sources, isLoading, uploadFile, deleteSource } = useSources();

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await uploadFile(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadFile],
  );

  const isEmpty = !isLoading && sources.length === 0;

  const uploadButton = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ndjson"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        variant="surface"
        onClick={triggerUpload}
        className="rounded-lg px-3 py-2 text-base leading-5"
      >
        <DatabaseIconSm className="h-4 w-4" />
        Upload sources
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-8">
        <PageHeader title="Sources">{uploadButton}</PageHeader>
        <SourceListSkeleton />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Sources">{uploadButton}</PageHeader>
        <EmptyState onUpload={triggerUpload} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHeader title="Sources">{uploadButton}</PageHeader>
      <SourceList sources={sources} onDelete={deleteSource} />
    </div>
  );
}
