"use client";

import { useCallback, useRef } from "react";
import { DatabaseIconSm } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "./empty-state";
import { SourceList } from "./source-list";
import type { Source } from "./types";

const MOCK_SOURCES: Source[] = [
  {
    key: "uploads/k5jaomch-dcflm8sj",
    size: 207_093_760,
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    processingStatus: "processing",
    recordCount: 116121,
  },
  {
    key: "uploads/k5jaomch-dcflm8sj-2",
    size: 207_093_760,
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    processingStatus: "ready",
    recordCount: 116121,
  },
  {
    key: "uploads/k5jaomch-dcflm8sj-3",
    size: 207_093_760,
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    processingStatus: "ready",
    recordCount: 116121,
  },
  {
    key: "uploads/k5jaomch-dcflm8sj-4",
    size: 207_093_760,
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    processingStatus: "ready",
    recordCount: 116121,
  },
];

export function SourcesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // TODO: wire up upload
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [],
  );

  // Toggle this to see empty state vs populated state
  const sources = MOCK_SOURCES;
  const isEmpty = sources.length === 0;

  const uploadButton = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ndjson"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={triggerUpload}
        className="inline-flex items-center gap-2 rounded-[8px] bg-[#f4f4f5] px-[12px] py-[8px] text-[15px] font-medium leading-[20px] text-[#09090b] transition-colors hover:bg-zinc-200"
      >
        <DatabaseIconSm className="h-[16px] w-[16px]" />
        Upload sources
      </button>
    </>
  );

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
      <SourceList sources={sources} />
    </div>
  );
}
