import type { NextConfig } from "next";

/** Hardened security headers applied to every response.
 *  - Strict-Transport-Security is harmless on HTTP (browsers ignore it
 *    unless the response came over HTTPS), so we set it unconditionally.
 *  - CSP intentionally omitted — Next.js inline scripts need nonce wiring
 *    that's a larger refactor; we'll add it in report-only mode separately.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  output: "standalone",
  // Suppress the "X-Powered-By: Next.js" header — no need to advertise framework.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
