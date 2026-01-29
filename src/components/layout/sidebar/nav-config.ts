import { BarChart3, Database, Workflow } from "lucide-react";
import type { NavItem } from "./types";

export const navItems: NavItem[] = [
  {
    id: "analytics",
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    id: "sources",
    label: "Sources",
    href: "/sources",
    icon: Database,
  },
  {
    id: "pipeline",
    label: "Pipeline",
    href: "/pipeline",
    icon: Workflow,
  },
];
