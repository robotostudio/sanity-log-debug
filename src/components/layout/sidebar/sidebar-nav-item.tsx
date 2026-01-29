"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-provider";
import type { NavItem } from "./types";

interface SidebarNavItemProps {
  item: NavItem;
}

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const Icon = item.icon;
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
        isCollapsed && "justify-center px-2",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          isActive
            ? "text-zinc-100"
            : "text-zinc-500 group-hover:text-zinc-300",
        )}
      />

      {!isCollapsed && <span className="truncate">{item.label}</span>}

      {/* Tooltip on hover when collapsed */}
      {isCollapsed && (
        <div
          className={cn(
            "absolute left-full ml-2 rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100 opacity-0 transition-opacity",
            "pointer-events-none group-hover:opacity-100",
            "whitespace-nowrap z-50",
          )}
        >
          {item.label}
        </div>
      )}

      {/* Active indicator */}
      {isActive && (
        <div className="absolute inset-y-1 left-0 w-0.5 bg-zinc-100" />
      )}
    </Link>
  );
}
