"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PollerStatusResponse {
  enabled: boolean;
  threshold: number;
  cooldownMinutes: number;
  smtpConfigured: boolean;
}

export function PollerStatus() {
  const { data, isLoading } = useQuery<PollerStatusResponse>({
    queryKey: ["poller-status"],
    queryFn: async () => {
      const res = await fetch("/api/poller/status");
      if (!res.ok) throw new Error("Failed to load poller status");
      return res.json() as Promise<PollerStatusResponse>;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (isLoading || !data) return null;

  let dotColor: string;
  let message: React.ReactNode;

  if (data.enabled && data.smtpConfigured) {
    dotColor = "bg-accent";
    message = (
      <>
        Monitoring active — alerts below{" "}
        <span className="font-semibold text-foreground-strong">{data.threshold}%</span> health
      </>
    );
  } else if (data.enabled && !data.smtpConfigured) {
    dotColor = "bg-yellow-500";
    message = (
      <>
        Monitoring active —{" "}
        <Link href="/settings" className="text-accent underline underline-offset-2 hover:text-accent-hover transition-colors">
          configure SMTP in Settings
        </Link>{" "}
        to receive alerts
      </>
    );
  } else {
    dotColor = "bg-faint";
    message = (
      <>
        Monitoring disabled —{" "}
        <Link href="/settings" className="text-accent underline underline-offset-2 hover:text-accent-hover transition-colors">
          enable in Settings
        </Link>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted mt-1">
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColor)} />
      <span>{message}</span>
    </div>
  );
}
