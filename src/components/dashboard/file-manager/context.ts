import { createContext, use } from "react";
import type { FileManagerContextValue } from "./types";

export const FileManagerContext = createContext<FileManagerContextValue | null>(
  null,
);

export function useFileManager(): FileManagerContextValue {
  const context = use(FileManagerContext);
  if (!context) {
    throw new Error("useFileManager must be used within a FileManagerProvider");
  }
  return context;
}
