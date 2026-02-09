"use client";

import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { navItems, adminNavItems } from "./nav-config";
import { SidebarNavItem } from "./sidebar-nav-item";

export function SidebarNav() {
  const { isAdmin } = useUserProfile();

  const items = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <nav className="mt-6 space-y-1 px-4">
      {items.map((item) => (
        <SidebarNavItem key={item.id} item={item} />
      ))}
    </nav>
  );
}
