"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import {
  Globe,
  LayoutDashboard,
  Monitor,
  Network,
  Bell,
  Settings,
  MessageSquare,
  Layers,
  Wifi,
  Shield,
} from "lucide-react";
import { NetworkSelector } from "@/components/layout/NetworkSelector";

const nav: { href: Route; label: string; icon: React.ElementType }[] = [
  { href: "/overview" as Route, label: "Overview", icon: Globe },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat" as Route, label: "Ask AI", icon: MessageSquare },
  { href: "/devices", label: "Devices", icon: Monitor },
  { href: "/network", label: "Traffic", icon: Network },
  { href: "/switches" as Route, label: "Switches", icon: Layers },
  { href: "/wireless" as Route, label: "Wireless", icon: Wifi },
  { href: "/vpn" as Route, label: "VPN", icon: Shield },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings" as Route, label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative w-56 border-r border-white/10 flex flex-col p-4 gap-1">
      <div className="text-lg font-bold mb-4 px-2">SmrtNetwork</div>
      <NetworkSelector />
      <div className="border-t border-white/10 my-2" />
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === href
              ? "bg-white/10 text-white"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
        >
          <Icon size={16} />
          {label}
        </Link>
      ))}
    </aside>
  );
}
