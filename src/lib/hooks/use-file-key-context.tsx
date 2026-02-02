"use client";

import { createContext, type ReactNode, use } from "react";

const FileKeyContext = createContext<string | undefined>(undefined);

interface FileKeyProviderProps {
  fileKey: string;
  children: ReactNode;
}

/**
 * Provides a fileKey override for useDashboardData.
 * Used when the file selection is determined by the parent (e.g., source detail page)
 * rather than URL search params.
 */
export function FileKeyProvider({ fileKey, children }: FileKeyProviderProps) {
  return <FileKeyContext value={fileKey}>{children}</FileKeyContext>;
}

/**
 * Gets the fileKey from context if available.
 * Used internally by useDashboardData.
 */
export function useFileKeyContext(): string | undefined {
  return use(FileKeyContext);
}
