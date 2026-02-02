import type { ComponentType, SVGProps } from "react";

export type IconComponent = ComponentType<
  SVGProps<SVGSVGElement> & { className?: string }
>;

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: IconComponent;
}

export interface SidebarContextValue {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}
