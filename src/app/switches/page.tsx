"use client";

import { SwitchPortTable } from "@/components/switches/SwitchPortTable";

export default function SwitchesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Switch Ports</h1>
      <SwitchPortTable />
    </div>
  );
}
