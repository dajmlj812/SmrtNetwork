"use client";

import { ComparePanel } from "@/components/compare/ComparePanel";

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground-strong">Network Comparison</h1>
      <ComparePanel />
    </div>
  );
}
