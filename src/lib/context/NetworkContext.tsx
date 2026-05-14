"use client";

import { createContext, useContext, useState } from "react";
import type { Network } from "@/lib/meraki/types";

interface NetworkContextValue {
  orgId: string;
  selectedNetwork: Network | null;
  setSelectedNetwork: (network: Network | null) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

// Single org — extend to a selector if multi-org support is needed later
const ORG_ID = "757480";

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

  return (
    <NetworkContext.Provider value={{ orgId: ORG_ID, selectedNetwork, setSelectedNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used inside NetworkProvider");
  return ctx;
}
