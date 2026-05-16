"use client";

import { AlertsList } from "@/components/alerts/AlertsList";
import { AlertLog } from "@/components/alerts/AlertLog";
import { AlertIntentCreator } from "@/components/alerts/AlertIntentCreator";

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground-strong">Alerts &amp; Recommendations</h1>
      <AlertIntentCreator />
      <AlertsList />
      <AlertLog />
    </div>
  );
}
