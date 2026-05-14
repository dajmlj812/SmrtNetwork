"use client";

import { ClientTable } from "@/components/clients/ClientTable";

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Client Devices</h1>
      <ClientTable />
    </div>
  );
}
