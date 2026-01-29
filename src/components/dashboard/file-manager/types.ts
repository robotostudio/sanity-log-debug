export interface R2File {
  key: string;
  size: number;
  lastModified: string;
}

export interface FileManagerState {
  files: R2File[];
  selectedFile: string | null;
  isLoading: boolean;
  isUploading: boolean;
  isDragOver: boolean;
}

export interface FileManagerActions {
  selectFile: (key: string | null) => void;
  uploadFile: (file: File) => Promise<void>;
  deleteFile: (key: string) => Promise<void>;
  setDragOver: (isDragOver: boolean) => void;
}

export interface FileManagerContextValue {
  state: FileManagerState;
  actions: FileManagerActions;
}
