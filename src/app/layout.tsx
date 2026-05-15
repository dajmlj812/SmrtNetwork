import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { NetworkProvider } from "@/lib/context/NetworkContext";
import { RoleProvider, type Role } from "@/lib/context/RoleContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { UpdateBanner } from "@/components/layout/UpdateBanner";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { readConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "SmrtNetwork | BuildITSmrt",
  description: "Cisco Meraki network intelligence powered by Claude AI — BuildITSmrt, LLC.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.png",
  },
};

function expectedHash(signingKey: string, suffix: string): string {
  return createHash("sha256").update(signingKey + suffix).digest("hex");
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const isPublic =
    pathname.startsWith("/login") || pathname.startsWith("/api/auth");

  let role: Role = "none";

  if (!isPublic) {
    const cfg = readConfig();
    if (cfg.appPasswordHash) {
      const session = (await cookies()).get("smrt-session")?.value ?? "";
      const adminKey = cfg.appPasswordHash;

      if (session.startsWith("admin:")) {
        const hash = session.slice(6);
        if (hash === expectedHash(adminKey, "smrt-session-admin-v1")) {
          role = "admin";
        } else {
          redirect("/login");
        }
      } else if (session.startsWith("readonly:")) {
        const hash = session.slice(9);
        if (hash === expectedHash(adminKey, "smrt-session-readonly-v1")) {
          role = "readonly";
        } else {
          redirect("/login");
        }
      } else if (session === "open:admin") {
        role = "admin";
      } else {
        // Backward compat: old session format without role prefix
        const oldExpected = expectedHash(adminKey, "smrt-session-v1");
        if (session === oldExpected) {
          role = "admin";
        } else {
          redirect("/login");
        }
      }
    } else {
      role = "admin"; // No password set
    }
  }

  const themeCookie = (await cookies()).get("smrt-theme")?.value;
  const defaultTheme = themeCookie === "light" || themeCookie === "dark" ? themeCookie : "dark";

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem={false}>
          <QueryProvider>
            <NetworkProvider>
              <RoleProvider role={role}>
                <GlobalSearch />
                <KeyboardShortcutsModal />
                <div className="flex flex-col h-screen bg-background text-foreground">
                  <UpdateBanner />
                  <div className="flex flex-1 overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 overflow-auto p-6 pt-12 md:pt-6">{children}</main>
                  </div>
                </div>
              </RoleProvider>
            </NetworkProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
