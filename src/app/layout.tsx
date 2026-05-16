import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
import { QueryProvider } from "@/components/providers/QueryProvider";
import { NetworkProvider } from "@/lib/context/NetworkContext";
import { RoleProvider, type Role } from "@/lib/context/RoleContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { UpdateBanner } from "@/components/layout/UpdateBanner";
import { InactivityTimeoutWatcher } from "@/components/layout/InactivityTimeoutWatcher";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { getInactivityTimeoutMinutes } from "@/lib/config";

export const metadata: Metadata = {
  title: "SmrtNetwork | BuildITSmrt",
  description: "Cisco Meraki network intelligence powered by Claude AI — BuildITSmrt, LLC.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.png",
  },
};

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
    const session = (await cookies()).get("smrt-session")?.value;
    const verified = verifySession(session);
    if (verified === null) {
      redirect("/login");
    }
    // Idle expiry: if the cookie's signed activity timestamp is older than
    // the configured window, treat the session as expired. The proxy
    // middleware already does this for API requests and clears the cookie,
    // so by the time we get here for a page render, expired cookies are
    // usually already gone — this is the defense-in-depth check.
    const inactivityMinutes = getInactivityTimeoutMinutes();
    if (
      inactivityMinutes > 0 &&
      verified.lastActivityAt !== null &&
      Date.now() - verified.lastActivityAt > inactivityMinutes * 60 * 1000
    ) {
      redirect("/login");
    }
    // "none" means open mode (no password set) — treat as admin for page rendering.
    role = verified.role === "none" ? "admin" : verified.role;
  }

  const themeCookie = (await cookies()).get("smrt-theme")?.value;
  const defaultTheme = themeCookie === "light" || themeCookie === "dark" ? themeCookie : "dark";

  // Only enforce inactivity timeout against authenticated sessions — public
  // routes (login) have no session to expire.
  const inactivityTimeoutMinutes = isPublic ? 0 : getInactivityTimeoutMinutes();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem={false}>
          {isPublic ? (
            // Public routes (login, auth endpoints) render full-bleed without the app shell —
            // no sidebar, no global search, no network context (none of those are usable
            // until the user is signed in).
            <div className="min-h-screen bg-background text-foreground">{children}</div>
          ) : (
            <QueryProvider>
              <NetworkProvider>
                <RoleProvider role={role}>
                  <InactivityTimeoutWatcher timeoutMinutes={inactivityTimeoutMinutes} />
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
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
