"use client";

import { cn } from "@/lib/utils";
import {
  ChevronDownIcon,
  CommandKeyIcon,
  LogoIcon,
  SearchIcon,
  SettingsIcon,
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

      {/* Search bar (visual placeholder) */}
      {!isCollapsed && (
        <div className="mt-6 px-4">
          <div className="flex items-center gap-2 rounded-[8px] border border-zinc-800 px-3 py-2">
            <SearchIcon className="h-[18px] w-[18px] text-zinc-500" />
            <span className="flex-1 text-[16px] leading-[24px] text-zinc-500">Search</span>
            <div className="flex items-center gap-1">
              <kbd className="flex h-[18px] w-[18px] items-center justify-center rounded-[2px] border border-zinc-800">
                <CommandKeyIcon className="h-[12px] w-[12px] text-zinc-300" />
              </kbd>
              <kbd className="flex h-[18px] w-[18px] items-center justify-center rounded-[2px] border border-zinc-800 text-[12px] leading-[18px] text-zinc-300">
                M
              </kbd>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <SidebarNav />

      {/* Upload indicator */}
      <UploadIndicator />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <div className="px-4 pb-1">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-base font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-50",
            isCollapsed && "justify-center px-2",
          )}
        >
          <SettingsIcon className="h-[18px] w-[18px] shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-zinc-800" />

      {/* User profile */}
      <div className="px-4 py-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-[8px] px-2 py-2 transition-colors hover:bg-zinc-900 cursor-pointer",
            isCollapsed && "justify-center px-2",
          )}
        >
          {/* Avatar placeholder */}
          <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-800" />
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-zinc-50">
                  User
                </p>
                <p className="truncate text-xs text-zinc-400">
                  user@example.com
                </p>
              </div>
              <ChevronDownIcon className="h-[18px] w-[18px] shrink-0 text-[#e4e4e7]" />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

export { navItems } from "./nav-config";
export { SidebarProvider, useSidebar } from "./sidebar-provider";
export type { NavItem, SidebarContextValue } from "./types";
