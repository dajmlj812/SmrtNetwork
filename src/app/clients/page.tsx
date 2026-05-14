"use client";

import { useState } from "react";
import { ClientTable } from "@/components/clients/ClientTable";
import { ClientDetailPanel } from "@/components/clients/ClientDetailPanel";
import type { Client } from "@/lib/meraki/types";

export default function ClientsPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Client Devices</h1>
      <ClientTable
        selectedClient={selectedClient}
        onSelected={setSelectedClient}
      />
      <ClientDetailPanel
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  );
}
