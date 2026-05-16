"use client";

import { WirelessDashboard } from "@/components/wireless/WirelessDashboard";

export default function WirelessPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground-strong">Wireless Health</h1>
      <WirelessDashboard />
    </div>
  );
}
