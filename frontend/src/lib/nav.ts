import type { LucideIcon } from "lucide-react";
import { Compass, FileText, Gauge, LayoutGrid, Search } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const HOME_ITEM: NavItem = { to: "/", label: "Project Overview", icon: Compass, end: true };

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/traces", label: "Trace Viewer", icon: Search },
  { to: "/metrics", label: "Metrics", icon: Gauge },
  { to: "/logs", label: "Logs", icon: FileText },
];
