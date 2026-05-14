import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { NetworkProvider } from "@/lib/context/NetworkContext";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "SmrtNetwork",
  description: "Meraki network intelligence powered by Claude AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            <NetworkProvider>
              <div className="flex h-screen bg-background text-foreground">
                <Sidebar />
                <main className="flex-1 overflow-auto p-6 pt-12 md:pt-6">{children}</main>
              </div>
            </NetworkProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
