"use client";

import { DatabaseIconSm } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Upload } from "@/components/upload";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { EmptyState } from "./empty-state";
import { SourceList, SourceListSkeleton } from "./source-list";
import { useSources } from "./use-sources";

export function SourcesPage() {
  const { sources, isLoading, deleteSource } = useSources();
  const { maxSources, fileCount, isLoading: profileLoading } = useUserProfile();

  const isEmpty = !isLoading && sources.length === 0;
  const atLimit = fileCount >= maxSources;

  const uploadButton = (
    <div className="flex items-center gap-3">
      {!profileLoading && (
        <span className="text-sm text-zinc-500">
          {fileCount}/{maxSources} sources
        </span>
      )}
      <Upload.Trigger disabled={atLimit}>
        <Button
          variant="surface"
          className="rounded-lg px-3 py-2 text-base leading-5"
          disabled={atLimit}
        >
          <DatabaseIconSm className="h-4 w-4" />
          Upload sources
        </Button>
      </Upload.Trigger>
    </div>
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
        <EmptyState />
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
