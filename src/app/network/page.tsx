"use client";

import { BandwidthSummary } from "@/components/network/BandwidthSummary";
import { TrafficChart } from "@/components/network/TrafficChart";
import { TopTalkers } from "@/components/network/TopTalkers";
import { UplinkChart } from "@/components/network/UplinkChart";

export default function NetworkPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Traffic & Flow</h1>
      <BandwidthSummary />
      <TrafficChart />
      <TopTalkers />
      <UplinkChart />
    </div>
  );
}
