"use client";

import { type ReactNode, useCallback, useMemo, useState } from "react";
import { FileManagerContext } from "./context";
import type { FileManagerActions, FileManagerState } from "./types";
import { useFileOperations } from "./use-file-operations";

interface FileManagerProviderProps {
  children: ReactNode;
  selectedFile: string | null;
  onSelectFile: (key: string | null) => void;
}

export function FileManagerProvider({
  children,
  selectedFile,
  onSelectFile,
}: FileManagerProviderProps) {
  const [isDragOver, setDragOver] = useState(false);

  const { files, isLoading, isUploading, uploadFile, deleteFile } =
    useFileOperations({
      selectedFile,
      onFileSelect: onSelectFile,
    });

  const state: FileManagerState = useMemo(
    () => ({
      files,
      selectedFile,
      isLoading,
      isUploading,
      isDragOver,
    }),
    [files, selectedFile, isLoading, isUploading, isDragOver],
  );

  const selectFile = useCallback(
    (key: string | null) => {
      onSelectFile(key);
    },
    [onSelectFile],
  );

  const actions: FileManagerActions = useMemo(
    () => ({
      selectFile,
      uploadFile,
      deleteFile,
      setDragOver,
    }),
    [selectFile, uploadFile, deleteFile],
  );

  const contextValue = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <FileManagerContext value={contextValue}>{children}</FileManagerContext>
  );
}
