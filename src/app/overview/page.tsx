"use client";

import { NetworkGrid } from "@/components/overview/NetworkGrid";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground-strong">Organization Overview</h1>
        <p className="text-sm text-muted mt-1">
          All networks — click a card to navigate to its dashboard.
        </p>
      </div>
      <NetworkGrid />
    </div>
  );
}
