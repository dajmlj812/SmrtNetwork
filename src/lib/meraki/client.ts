import type {
  Organization,
  Network,
  Device,
  Client,
  LossAndLatency,
  AlertSettings,
  SwitchPort,
  SwitchPortStatus,
  Ssid,
  ChannelUtilization,
  WirelessConnectionStats,
  VpnStatus,
} from "./types";
import { getMerakiApiKey, getMerakiBaseUrl } from "@/lib/config";

async function merakiFetch<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const url = new URL(`${getMerakiBaseUrl()}${path}`);
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
  }

  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      "X-Cisco-Meraki-API-Key": getMerakiApiKey(),
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? 1);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return merakiFetch<T>(path, options);
  }

  if (!res.ok) {
    throw new Error(`Meraki API error ${res.status} on ${path}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

export const meraki = {
  organizations: {
    list: () => merakiFetch<Organization[]>("/organizations"),
  },

  networks: {
    list: (orgId: string) =>
      merakiFetch<Network[]>(`/organizations/${orgId}/networks`),
  },

  devices: {
    list: (networkId: string) =>
      merakiFetch<Device[]>(`/networks/${networkId}/devices`),

    getStatuses: (orgId: string) =>
      merakiFetch<Device[]>(`/organizations/${orgId}/devices/statuses`),

    lossAndLatency: (serial: string, params: Record<string, string>) =>
      merakiFetch<LossAndLatency[]>(`/devices/${serial}/lossAndLatencyHistory`, {
        params,
      }),
  },

  clients: {
    listByNetwork: (networkId: string, timespan = 86400) =>
      merakiFetch<Client[]>(`/networks/${networkId}/clients`, {
        params: { timespan: String(timespan) },
      }),

    listByDevice: (serial: string, timespan = 86400) =>
      merakiFetch<Client[]>(`/devices/${serial}/clients`, {
        params: { timespan: String(timespan) },
      }),

    getByMac: (networkId: string, mac: string) =>
      merakiFetch<Client>(`/networks/${networkId}/clients/${mac}`),
  },

  alerts: {
    getSettings: (networkId: string) =>
      merakiFetch<AlertSettings>(`/networks/${networkId}/alerts/settings`),
  },

  switchPorts: {
    list: (serial: string) =>
      merakiFetch<SwitchPort[]>(`/devices/${serial}/switch/ports`),
    statuses: (serial: string) =>
      merakiFetch<SwitchPortStatus[]>(`/devices/${serial}/switch/ports/statuses`),
  },

  wireless: {
    ssids: (networkId: string) =>
      merakiFetch<Ssid[]>(`/networks/${networkId}/wireless/ssids`),
    channelUtilization: (networkId: string, params: Record<string, string>) =>
      merakiFetch<ChannelUtilization[]>(
        `/networks/${networkId}/wireless/channelUtilization`,
        { params }
      ),
    connectionStats: (networkId: string, params: Record<string, string>) =>
      merakiFetch<WirelessConnectionStats>(
        `/networks/${networkId}/wireless/clients/connectionStats`,
        { params }
      ),
  },

  vpn: {
    statuses: (orgId: string) =>
      merakiFetch<VpnStatus[]>(`/organizations/${orgId}/appliance/vpn/statuses`),
  },
};
