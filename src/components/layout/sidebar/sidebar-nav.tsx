"use client";

import { navItems } from "./nav-config";
import { SidebarNavItem } from "./sidebar-nav-item";

export function SidebarNav() {
  return (
    <nav className="flex-1 space-y-1 p-2">
      {navItems.map((item) => (
        <SidebarNavItem key={item.id} item={item} />
      ))}
    </nav>
  );
}
