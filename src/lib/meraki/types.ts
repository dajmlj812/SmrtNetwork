export interface Organization {
  id: string;
  name: string;
  url: string;
}

export interface Network {
  id: string;
  organizationId: string;
  name: string;
  productTypes: string[];
  timeZone: string;
  tags: string[];
}

export interface Device {
  serial: string;
  name: string;
  model: string;
  mac: string;
  lanIp?: string;
  wan1Ip?: string;
  wan2Ip?: string;
  networkId: string;
  firmware: string;
  productType?: string;
  status?: "online" | "offline" | "alerting" | "dormant";
  lat?: number;
  lng?: number;
}

export interface Client {
  id: string;
  mac: string;
  ip?: string;
  ip6?: string;
  description?: string;
  firstSeen: string;
  lastSeen: string;
  manufacturer?: string;
  os?: string;
  recentDeviceName?: string;
  recentDeviceMac?: string;
  ssid?: string;
  vlan?: string;
  usage: {
    sent: number;
    recv: number;
  };
}

export interface LossAndLatency {
  startTs: string;
  endTs: string;
  lossPercent: number;
  latencyMs: number;
  goodput: number;
  jitter: number;
}

export interface AlertEntry {
  type: string;
  enabled: boolean;
  alertDestinations?: {
    emails: string[];
    allAdmins: boolean;
    snmp: boolean;
    httpServerIds: string[];
  };
  filters?: Record<string, unknown>;
}

export interface AlertSettings {
  defaultDestinations: {
    emails: string[];
    allAdmins: boolean;
    snmp: boolean;
    httpServerIds: string[];
  };
  alerts: AlertEntry[];
}

export interface NetworkHealth {
  networkId: string;
  overall: "good" | "fair" | "poor";
  performanceScore: number;
}

export interface SwitchPort {
  portId: string;
  name: string;
  enabled: boolean;
  type: string;
  vlan: number;
  voiceVlan?: number;
  poeEnabled: boolean;
  linkNegotiation: string;
  rstp?: boolean;
  stpGuard?: string;
  accessPolicyType?: string;
  tags?: string[];
}

export interface SwitchPortStatus {
  portId: string;
  enabled: boolean;
  status: "Connected" | "Disconnected" | string;
  isUplink: boolean;
  speed?: string;
  duplex?: string;
  usageInKb?: { total: number; sent: number; recv: number };
  clientCount?: number;
  powerUsageInWh?: number;
  cdp?: { deviceId: string; portId: string; address: string; managementAddress: string };
  lldp?: { systemName: string; portId: string; managementAddress: string };
}

export interface Ssid {
  number: number;
  name: string;
  enabled: boolean;
  authMode: string;
  encryptionMode?: string;
  wpaEncryptionMode?: string;
  splashPage?: string;
  visible?: boolean;
}

export interface ChannelUtilization {
  serial: string;
  model: string;
  tags: string[];
  wifi0?: { utilization80211?: number; utilizationNon80211?: number; utilizationTotal?: number }[];
  wifi1?: { utilization80211?: number; utilizationNon80211?: number; utilizationTotal?: number }[];
}

export interface WirelessConnectionStats {
  assoc: number;
  auth: number;
  dhcp: number;
  dns: number;
  success: number;
}

export interface VpnPeer {
  networkId: string;
  networkName: string;
  reachability: "reachable" | "unreachable" | string;
}

export interface MerakiEvent {
  occurredAt: string;
  networkId: string;
  type: string;
  description: string;
  clientId?: string;
  clientDescription?: string;
  deviceSerial?: string;
  deviceName?: string;
  ssidNumber?: number;
  eventData?: Record<string, unknown>;
}

export interface VpnStatus {
  networkId: string;
  networkName: string;
  deviceSerial: string;
  deviceModel: string;
  deviceStatus: string;
  vpnMode: string;
  exportedSubnets?: { name: string; subnet: string }[];
  upstreamGateway?: { networkId: string; networkName: string; ip: string };
  merakiVpnPeers?: VpnPeer[];
  thirdPartyVpnPeers?: { name: string; publicIp: string; reachability: string }[];
}
