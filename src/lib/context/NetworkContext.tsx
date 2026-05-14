"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Network, Organization } from "@/lib/meraki/types";

interface NetworkContextValue {
  /** @deprecated use selectedOrg?.id instead */
  orgId: string;
  organizations: Organization[];
  selectedOrg: Organization | null;
  setSelectedOrg: (org: Organization) => void;
  networks: Network[];
  selectedNetwork: Network | null;
  setSelectedNetwork: (network: Network | null) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrgState] = useState<Organization | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

  // Fetch orgs on mount; pick the persisted activeOrgId (or first)
  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        // Fetch both in parallel: org list + persisted activeOrgId from settings
        const [orgsRes, settingsRes] = await Promise.all([
          fetch("/api/meraki/organizations"),
          fetch("/api/settings"),
        ]);

        if (!orgsRes.ok) return;
        const orgs = (await orgsRes.json()) as Organization[];
        if (cancelled || orgs.length === 0) return;

        let activeOrgId = "757480";
        if (settingsRes.ok) {
          const settings = (await settingsRes.json()) as { activeOrgId?: string };
          if (settings.activeOrgId) activeOrgId = settings.activeOrgId;
        }

        const initial =
          orgs.find((o) => o.id === activeOrgId) ?? orgs[0];

        setOrganizations(orgs);
        setSelectedOrgState(initial ?? null);
      } catch {
        // silently ignore — app still works with no org selected
      }
    }

    void loadOrgs();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch networks whenever selectedOrg changes
  useEffect(() => {
    if (!selectedOrg) {
      setNetworks([]);
      return;
    }

    let cancelled = false;

    async function loadNetworks() {
      if (!selectedOrg) return;
      try {
        const res = await fetch(`/api/meraki/networks?orgId=${selectedOrg.id}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Network[];
        if (!cancelled) setNetworks(data);
      } catch {
        // silently ignore
      }
    }

    void loadNetworks();
    return () => {
      cancelled = true;
    };
  }, [selectedOrg]);

  const setSelectedOrg = useCallback((org: Organization) => {
    setSelectedOrgState(org);
    setSelectedNetwork(null);

    // Persist to config (fire-and-forget)
    void fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeOrgId: org.id }),
    });
  }, []);

  const orgId = selectedOrg?.id ?? "757480";

  return (
    <NetworkContext.Provider
      value={{
        orgId,
        organizations,
        selectedOrg,
        setSelectedOrg,
        networks,
        selectedNetwork,
        setSelectedNetwork,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used inside NetworkProvider");
  return ctx;
}
