"use client";

import { useState } from "react";
import { DeviceSearch } from "@/components/devices/DeviceSearch";
import { DeviceDetail } from "@/components/devices/DeviceDetail";
import { DeviceList } from "@/components/devices/DeviceList";
import { useNetwork } from "@/lib/context/NetworkContext";

export default function DevicesPage() {
  const { selectedNetwork } = useNetwork();
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Device Lookup</h1>
      {!selectedNetwork && (
        <p className="text-sm text-yellow-400/80 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-4 py-2">
          Select a network from the sidebar to enable device search.
        </p>
      )}
      <DeviceList />
      <DeviceSearch onSearch={setQuery} />
      {query && <DeviceDetail query={query} />}
    </div>
  );
}
