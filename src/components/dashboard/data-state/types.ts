import type { Aggregations } from "@/lib/types";

export type DataStatus = "empty" | "loading" | "success" | "error";

export interface DashboardState {
  status: DataStatus;
  selectedFile: string | null;
  data: Aggregations | null;
  error: string | null;
  isFiltering: boolean;
}

export interface DashboardActions {
  selectFile: (key: string | null) => void;
}

export interface DashboardContextValue {
  state: DashboardState;
  actions: DashboardActions;
}
