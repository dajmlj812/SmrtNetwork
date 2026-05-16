"use client";

import { useState } from "react";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { AlertsSummary } from "@/components/dashboard/AlertsSummary";
import { StatCards } from "@/components/dashboard/StatCards";
import { ReportButton } from "@/components/dashboard/ReportButton";
import { SnapshotChart } from "@/components/dashboard/SnapshotChart";
import { ClientTrendChart } from "@/components/dashboard/ClientTrendChart";
import { BandwidthTrendChart } from "@/components/dashboard/BandwidthTrendChart";
import { PollerStatus } from "@/components/dashboard/PollerStatus";
import { EventFeed } from "@/components/dashboard/EventFeed";
import { cn } from "@/lib/utils";

type TrendTab = "health" | "clients" | "bandwidth";

const TABS: { id: TrendTab; label: string }[] = [
  { id: "health", label: "Health" },
  { id: "clients", label: "Clients" },
  { id: "bandwidth", label: "Bandwidth" },
];

export default function DashboardPage() {
  const [trend, setTrend] = useState<TrendTab>("health");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground-strong">
            Network Dashboard
          </h1>
          <PollerStatus />
        </div>
        <ReportButton />
      </div>

      {/* Row 1 — the verdict, glanceable */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <HealthScoreCard />
        </div>
        <AlertsSummary />
      </div>

      {/* Row 2 — counts */}
      <StatCards />

      {/* Row 3 — trends, tabbed */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-foreground-strong">Trends</h2>
          <div className="inline-flex p-1 rounded-lg bg-overlay border">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTrend(t.id)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  trend === t.id
                    ? "bg-accent text-accent-fg shadow-sm"
                    : "text-foreground-muted hover:text-foreground-strong"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div hidden={trend !== "health"}>
          <SnapshotChart />
        </div>
        <div hidden={trend !== "clients"}>
          <ClientTrendChart />
        </div>
        <div hidden={trend !== "bandwidth"}>
          <BandwidthTrendChart />
        </div>
      </div>

      {/* Row 4 — live event feed */}
      <EventFeed />
    </div>
  );
}
