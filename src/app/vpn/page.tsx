"use client";

import { VpnTable } from "@/components/vpn/VpnTable";

export default function VpnPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">VPN Status</h1>
      <VpnTable />
    </div>
  );
}
