import {
  AdminNavIcon,
  AnalyticsNavIcon,
  PipelineNavIcon,
  SourcesNavIcon,
} from "@/components/icons";
import type { NavItem } from "./types";

export const navItems: NavItem[] = [
  {
    id: "analytics",
    label: "Analytics",
    href: "/analytics",
    icon: AnalyticsNavIcon,
  },
  {
    id: "sources",
    label: "Sources",
    href: "/sources",
    icon: SourcesNavIcon,
  },
  {
    id: "pipeline",
    label: "Pipeline",
    href: "/pipeline",
    icon: PipelineNavIcon,
  },
];

export const adminNavItems: NavItem[] = [
  {
    id: "admin",
    label: "Admin",
    href: "/admin",
    icon: AdminNavIcon,
  },
];
