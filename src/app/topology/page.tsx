import { TopologyMap } from "@/components/topology/TopologyMap";

export const metadata = { title: "Topology | SmrtNetwork" };

export default function TopologyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground-strong">Network Topology</h1>
        <p className="text-sm text-muted mt-1">
          Visual device map — hover a node for details. Color indicates live status.
        </p>
      </div>
      <TopologyMap />
    </div>
  );
}
