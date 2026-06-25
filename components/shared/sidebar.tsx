"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Trophy,
  ShoppingCart,
  Package,
  BookOpen,
  BarChart3,
  Users,
  Beer,
  Banknote,
  Tag,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "CAJERO", "MESERO", "BARTENDER"],
  },
  {
    label: "Mesas",
    href: "/mesas",
    icon: UtensilsCrossed,
    roles: ["ADMIN", "CAJERO", "MESERO", "BARTENDER"],
  },
  {
    label: "Boliranas",
    href: "/boliranas",
    icon: Trophy,
    roles: ["ADMIN", "CAJERO", "MESERO", "BARTENDER"],
  },
  {
    label: "POS / Ventas",
    href: "/pos",
    icon: ShoppingCart,
    badge: "POS",
    roles: ["ADMIN", "CAJERO"],
  },
  {
    label: "Inventario",
    href: "/inventario",
    icon: Package,
    roles: ["ADMIN"],
  },
  {
    label: "Promociones",
    href: "/promociones",
    icon: Tag,
    roles: ["ADMIN"],
  },
  {
    label: "Contabilidad",
    href: "/contabilidad",
    icon: BookOpen,
    roles: ["ADMIN"],
  },
  {
    label: "Proveedores",
    href: "/proveedores",
    icon: Truck,
    roles: ["ADMIN"],
  },
  {
    label: "Nómina",
    href: "/nomina",
    icon: Banknote,
    roles: ["ADMIN"],
  },
  {
    label: "Reportes",
    href: "/reportes",
    icon: BarChart3,
    roles: ["ADMIN"],
  },
  {
    label: "Usuarios",
    href: "/usuarios",
    icon: Users,
    roles: ["ADMIN"],
  },
];

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter((item) => !role || item.roles.includes(role));

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center h-16 px-4 border-b border-sidebar-border", collapsed ? "justify-center" : "gap-3")}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary flex-shrink-0">
          <Beer className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg text-sidebar-foreground">NovaStock</span>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse button */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="ml-2 text-xs">Colapsar</span>}
        </Button>
      </div>
    </aside>
  );
}
