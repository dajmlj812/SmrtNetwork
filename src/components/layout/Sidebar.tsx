"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import {
  Globe,
  LayoutDashboard,
  Monitor,
  Laptop,
  Network,
  Bell,
  Settings,
  MessageSquare,
  Layers,
  Wifi,
  Shield,
  Menu,
  X,
  GitCompare,
} from "lucide-react";
import { NetworkSelector } from "@/components/layout/NetworkSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const nav: { href: Route; label: string; icon: React.ElementType }[] = [
  { href: "/overview" as Route, label: "Overview", icon: Globe },
  { href: "/compare" as Route, label: "Compare", icon: GitCompare },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat" as Route, label: "Ask AI", icon: MessageSquare },
  { href: "/devices", label: "Devices", icon: Monitor },
  { href: "/clients" as Route, label: "Clients", icon: Laptop },
  { href: "/network", label: "Traffic", icon: Network },
  { href: "/switches" as Route, label: "Switches", icon: Layers },
  { href: "/wireless" as Route, label: "Wireless", icon: Wifi },
  { href: "/vpn" as Route, label: "VPN", icon: Shield },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings" as Route, label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden rounded-lg p-1.5 bg-[var(--card)] border border-[var(--border)] text-white/60 hover:text-white transition-colors"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Backdrop overlay on mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Desktop: always visible, static
          "md:relative md:translate-x-0 md:flex md:w-56",
          // Mobile: fixed overlay, slides in/out
          "fixed inset-y-0 left-0 z-50 w-56",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "border-r border-[var(--border)] flex flex-col p-4 gap-1",
          "bg-[var(--background)]"
        )}
      >
        {/* Logo */}
        <div className="text-lg font-bold mb-4 px-2">SmrtNetwork</div>

        {/* Network selector */}
        <NetworkSelector />

        <div className="border-t border-[var(--border)] my-2" />

        {/* Nav links — scrollable flex area */}
        <div className="flex flex-col flex-1 overflow-y-auto gap-1">
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
        </div>

        {/* Footer: theme toggle + version */}
        <div className="border-t border-[var(--border)] mt-2 pt-3 flex items-center justify-between px-1">
          <ThemeToggle />
          <span className="text-xs text-white/20">SmrtNetwork v0.1</span>
        </div>
      </aside>
    </>
  );
}
