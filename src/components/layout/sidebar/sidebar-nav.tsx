"use client";

import { navItems } from "./nav-config";
import { SidebarNavItem } from "./sidebar-nav-item";

export function SidebarNav() {
  return (
    <nav className="mt-6 space-y-1 px-4">
      {navItems.map((item) => (
        <SidebarNavItem key={item.id} item={item} />
      ))}
    </nav>
  );
}
