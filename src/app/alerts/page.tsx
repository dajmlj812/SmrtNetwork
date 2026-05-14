"use client";

import { AlertsList } from "@/components/alerts/AlertsList";

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alerts & Recommendations</h1>
      <AlertsList />
    </div>
  );
}
