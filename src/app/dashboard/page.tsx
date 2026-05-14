"use client";

import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { AlertsSummary } from "@/components/dashboard/AlertsSummary";
import { NetworkInsight } from "@/components/dashboard/NetworkInsight";
import { StatCards } from "@/components/dashboard/StatCards";
import { ReportButton } from "@/components/dashboard/ReportButton";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Network Dashboard</h1>
        <ReportButton />
      </div>
      <StatCards />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HealthScoreCard />
        <AlertsSummary />
      </div>
      <NetworkInsight />
    </div>
  );
}
