"use client";

import { createContext, use } from "react";
import type { DashboardContextValue } from "./types";

export const DashboardContext = createContext<DashboardContextValue | null>(
  null,
);

export function useDashboard(): DashboardContextValue {
  const context = use(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
