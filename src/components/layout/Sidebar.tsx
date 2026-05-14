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
} from "lucide-react";
import { NetworkSelector } from "@/components/layout/NetworkSelector";
import { OrgSelector } from "@/components/layout/OrgSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { APP_VERSION } from "@/lib/version";

const nav: { href: Route; label: string; icon: React.ElementType }[] = [
  { href: "/overview" as Route, label: "Overview", icon: Globe },
  { href: "/compare" as Route, label: "Compare", icon: GitCompare },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat" as Route, label: "Ask AI", icon: MessageSquare },
  { href: "/devices", label: "Devices", icon: Monitor },
  { href: "/firmware" as Route, label: "Firmware", icon: Cpu },
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
        className="fixed top-3 left-3 z-50 md:hidden rounded-lg p-1.5 bg-[var(--card)] border border-[var(--border)] text-white/60 hover:text-white transition-colors"
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
          "border-r border-[var(--border)] flex flex-col p-4 gap-1",
          "bg-[var(--background)]"
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
            <span className="text-sm font-bold text-[var(--foreground)] group-hover:text-[#30ba67] transition-colors">
              SmrtNetwork
            </span>
            <span className="text-[10px] text-[var(--muted)]">BuildITSmrt, LLC.</span>
          </div>
        </Link>

        {/* Org selector */}
        <OrgSelector />

        {/* Network selector */}
        <NetworkSelector />

        <div className="border-t border-[var(--border)] my-2" />

        {/* Search trigger */}
        <button
          onClick={openSearch}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1",
            "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]",
            "border border-[var(--border)] hover:border-[#1e9c4a]/40 transition-colors"
          )}
        >
          <Search size={14} className="shrink-0" />
          <span className="flex-1 text-left truncate">Search…</span>
          <kbd className="text-[10px] text-[var(--muted)] font-mono leading-none">
            Ctrl+K
          </kbd>
        </button>

        {/* Nav links */}
        <div className="flex flex-col flex-1 overflow-y-auto gap-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-[#1e9c4a]/15 text-[#30ba67] font-medium"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]"
                )}
              >
                <Icon
                  size={16}
                  className={active ? "text-[#1e9c4a]" : undefined}
                />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] mt-2 pt-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
          <span className="text-[10px] text-[var(--muted)]">v{APP_VERSION}</span>
        </div>
      </aside>
    </>
  );
}
