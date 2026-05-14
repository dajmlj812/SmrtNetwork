import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { NetworkProvider } from "@/lib/context/NetworkContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { UpdateBanner } from "@/components/layout/UpdateBanner";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { readConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "SmrtNetwork",
  description: "Meraki network intelligence powered by Claude AI",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const isPublic =
    pathname.startsWith("/login") || pathname.startsWith("/api/auth");

  if (!isPublic) {
    const cfg = readConfig();
    if (cfg.appPasswordHash) {
      const session = (await cookies()).get("smrt-session")?.value;
      const expected = createHash("sha256")
        .update(cfg.appPasswordHash + "smrt-session-v1")
        .digest("hex");
      if (session !== expected) redirect("/login");
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            <NetworkProvider>
              <GlobalSearch />
              <div className="flex flex-col h-screen bg-background text-foreground">
                <UpdateBanner />
                <div className="flex flex-1 overflow-hidden">
                  <Sidebar />
                  <main className="flex-1 overflow-auto p-6 pt-12 md:pt-6">{children}</main>
                </div>
              </div>
            </NetworkProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
