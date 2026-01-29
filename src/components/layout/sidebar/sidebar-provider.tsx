"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SidebarContextValue } from "./types";

const STORAGE_KEY = "sidebar-collapsed";

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const context = use(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: ReactNode;
  defaultCollapsed?: boolean;
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsCollapsed(stored === "true");
      }
    } catch (error) {
      console.warn("Failed to read sidebar state from localStorage:", error);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, String(isCollapsed));
      } catch (error) {
        console.error(
          `Failed to write ${STORAGE_KEY}=${isCollapsed} to localStorage:`,
          error,
        );
      }
    }
  }, [isCollapsed, isHydrated]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
  }, []);

  const value = useMemo(
    () => ({
      isCollapsed,
      toggleCollapsed,
      setCollapsed,
    }),
    [isCollapsed, toggleCollapsed, setCollapsed],
  );

  return <SidebarContext value={value}>{children}</SidebarContext>;
}
