"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Search,
  Cpu,
  LogOut,
  Share2,
  Signal,
  Thermometer,
  Camera,
} from "lucide-react";
import { NetworkSelector } from "@/components/layout/NetworkSelector";
import { OrgSelector } from "@/components/layout/OrgSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { APP_VERSION } from "@/lib/version";

type NavItem = { href: Route; label: string; icon: React.ElementType };
type NavSection = { label: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    label: "Monitor",
    items: [
      { href: "/overview" as Route, label: "Overview", icon: Globe },
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/topology" as Route, label: "Topology", icon: Share2 },
      { href: "/alerts", label: "Alerts", icon: Bell },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/devices", label: "Devices", icon: Monitor },
      { href: "/clients" as Route, label: "Clients", icon: Laptop },
      { href: "/firmware" as Route, label: "Firmware", icon: Cpu },
      { href: "/network", label: "Traffic", icon: Network },
    ],
  },
  {
    label: "By product",
    items: [
      { href: "/switches" as Route, label: "Switches", icon: Layers },
      { href: "/wireless" as Route, label: "Wireless", icon: Wifi },
      { href: "/vpn" as Route, label: "VPN", icon: Shield },
      { href: "/cellular" as Route, label: "Cellular", icon: Signal },
      { href: "/sensors" as Route, label: "Sensors", icon: Thermometer },
      { href: "/cameras" as Route, label: "Cameras", icon: Camera },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/chat" as Route, label: "Ask AI", icon: MessageSquare },
      { href: "/compare" as Route, label: "Compare", icon: GitCompare },
      { href: "/settings" as Route, label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function openSearch() {
    window.dispatchEvent(new CustomEvent("smrt:open-search"));
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden rounded-lg p-1.5 bg-card border text-muted hover:text-foreground-strong transition-colors"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "md:relative md:translate-x-0 md:flex md:w-56",
          "fixed inset-y-0 left-0 z-50 w-56",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "border-r flex flex-col p-4 gap-1",
          "bg-background"
        )}
      >
        {/* Brand logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 mb-4 px-1 group">
          <Image
            src="/logo-mark.png"
            alt="BuildITSmrt logo"
            width={32}
            height={32}
            className="rounded-md shrink-0"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-foreground-strong group-hover:text-accent transition-colors">
              SmrtNetwork
            </span>
            <span className="text-[10px] text-muted">BuildITSmrt, LLC.</span>
          </div>
        </Link>

        {/* Org selector */}
        <OrgSelector />

        {/* Network selector */}
        <NetworkSelector />

        <div className="border-t my-2" />

        {/* Search trigger */}
        <button
          onClick={openSearch}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1",
            "text-muted hover:text-foreground-strong hover:bg-overlay-strong",
            "border hover:border-strong transition-colors"
          )}
        >
          <Search size={14} className="shrink-0" />
          <span className="flex-1 text-left truncate">Search…</span>
          <kbd className="text-[10px] text-faint font-mono leading-none">
            Ctrl+K
          </kbd>
        </button>

        {/* Nav sections */}
        <nav className="flex flex-col flex-1 overflow-y-auto gap-3 mt-2">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-0.5">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
                {section.label}
              </p>
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-accent-soft text-accent font-medium"
                        : "text-foreground-muted hover:text-foreground-strong hover:bg-overlay-strong"
                    )}
                  >
                    <Icon size={16} className={active ? "text-accent" : undefined} />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t mt-2 pt-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="p-1.5 rounded-lg text-muted hover:text-foreground-strong hover:bg-overlay-strong transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
          <span className="text-[10px] text-faint">v{APP_VERSION}</span>
        </div>
      </aside>
    </>
  );
}
