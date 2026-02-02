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

  // Special-case root href to avoid marking it active for all paths
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-2 rounded-[8px] px-3 py-2 text-base font-medium transition-colors",
        isActive
          ? "bg-zinc-900 text-zinc-50"
          : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50",
        isCollapsed && "justify-center px-2",
      )}
      aria-label={isCollapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          isActive ? "text-zinc-50" : "text-zinc-400 group-hover:text-zinc-50",
        )}
      />

      {!isCollapsed && <span className="truncate">{item.label}</span>}

      {/* Tooltip on hover when collapsed */}
      {isCollapsed && (
        <div
          className={cn(
            "absolute left-full ml-2 rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100",
            "pointer-events-none opacity-0 translate-x-1 scale-95",
            "transition-all duration-75 ease-out will-change-[opacity,transform]",
            "group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100",
            "whitespace-nowrap z-50",
          )}
        >
          {item.label}
        </div>
      )}
    </Link>
  );
}
