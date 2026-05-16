import { FirmwareAudit } from "@/components/firmware/FirmwareAudit";

export default function FirmwarePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground-strong">Firmware Audit</h1>
      <p className="text-sm text-muted">
        Device firmware versions across all networks in the organization.
      </p>
      <FirmwareAudit />
    </div>
  );
}
