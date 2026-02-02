"use client";

import { cn } from "@/lib/utils";
import {
  LogoIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
} from "@/components/icons";
import { SidebarNav } from "./sidebar-nav";
import { useSidebar } from "./sidebar-provider";
import { UploadIndicator } from "./upload-indicator";

export function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "group/sidebar flex h-full flex-col bg-zinc-950 transition-[width] duration-200",
      )}
      style={{ width: isCollapsed ? "64px" : "247px" }}
    >
      {/* Header: Logo + Toggle */}
      <div className="flex h-14 items-center justify-between px-4">
        {isCollapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="group/logo relative flex items-center justify-center w-full"
            aria-label="Expand sidebar"
          >
            <LogoIcon className="h-[18px] w-[20.25px] text-[#fafafa] transition-opacity group-hover/logo:opacity-0" />
            <SidebarOpenIcon className="absolute h-5 w-5 text-[#d4d4d8] opacity-0 transition-opacity group-hover/logo:opacity-100" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-[7.2px]">
              <LogoIcon className="h-[18px] w-[20.25px] text-[#fafafa]" />
              <span className="font-medium text-[21.6px] leading-[28.8px] tracking-[-0.54px] text-[#fafafa]">
                Sanity Logs
              </span>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex items-center justify-center text-[#d4d4d8] transition-colors hover:text-zinc-200"
              aria-label="Collapse sidebar"
            >
              <SidebarCloseIcon className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <SidebarNav />

      {/* Upload indicator */}
      <UploadIndicator />

      {/* Spacer */}
      <div className="flex-1" />
    </aside>
  );
}

export { navItems } from "./nav-config";
export { SidebarProvider, useSidebar } from "./sidebar-provider";
export type { NavItem, SidebarContextValue } from "./types";
