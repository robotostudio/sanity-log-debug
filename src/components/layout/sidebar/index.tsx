"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";
import { useSidebar } from "./sidebar-provider";
import { UploadIndicator } from "./upload-indicator";

function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6", className)}
      aria-hidden="true"
    >
      <rect
        width="32"
        height="32"
        rx="2"
        fill="currentColor"
        className="text-zinc-100"
      />
      <rect x="8" y="9" width="8" height="14" rx="1" fill="#18181B" />
      <rect x="18" y="9" width="6" height="8" rx="1" fill="#18181B" />
    </svg>
  );
}

export function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "group/sidebar flex h-full flex-col border-r border-zinc-800 bg-zinc-950 transition-[width] duration-200",
      )}
      style={{ width: isCollapsed ? "64px" : "240px" }}
    >
      {/* Header: Logo */}
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        <Logo />
        {!isCollapsed && (
          <span className="ml-3 font-semibold text-zinc-100 truncate">
            Sanity Logs
          </span>
        )}
      </div>

      {/* Navigation */}
      <SidebarNav />

      {/* Upload indicator */}
      <UploadIndicator />

      {/* Footer: Collapse toggle */}
      <div className="border-t border-zinc-800 p-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200",
            isCollapsed && "justify-center px-2",
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export { navItems } from "./nav-config";
export { SidebarProvider, useSidebar } from "./sidebar-provider";
export type { NavItem, SidebarContextValue } from "./types";
