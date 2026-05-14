"use client";

import { useState, useEffect } from "react";
import { APP_VERSION, GITHUB_REPO } from "@/lib/version";

interface UpdateInfo {
  available: boolean;
  version: string;
  url: string;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
}

/**
 * Parse a semver string like "1.2.3" into an array of numbers [1, 2, 3].
 * Returns null if the string cannot be parsed.
 */
function parseSemver(ver: string): number[] | null {
  const parts = ver.replace(/^v/, "").split(".");
  const nums = parts.map(Number);
  if (nums.some(isNaN)) return null;
  return nums;
}

/**
 * Returns true if semver a is strictly greater than semver b.
 * Compares element-by-element at the first differing position.
 */
function isNewerVersion(a: string, b: string): boolean {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return false;
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return true;
    if (na < nb) return false;
  }
  return false;
}

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only check once per browser session
    const sessionKey = "smrt-update-checked";
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");

    async function checkForUpdate() {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
          { headers: { Accept: "application/vnd.github+json" } }
        );
        if (!res.ok) return;
        const release = (await res.json()) as GitHubRelease;
        const tagVersion = release.tag_name.replace(/^v/, "");

        if (isNewerVersion(tagVersion, APP_VERSION)) {
          // Check if this version was already dismissed
          const dismissKey = `smrt-update-dismissed-${tagVersion}`;
          if (localStorage.getItem(dismissKey)) return;

          setUpdate({ available: true, version: tagVersion, url: release.html_url });
        }
      } catch {
        // Never throw — silently ignore network errors
      }
    }

    void checkForUpdate();
  }, []);

  function dismiss() {
    if (!update) return;
    localStorage.setItem(`smrt-update-dismissed-${update.version}`, "1");
    setDismissed(true);
  }

  if (!update?.available || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-amber-500/20 border-b border-amber-400/30 text-sm text-amber-200">
      <span>
        <span className="font-semibold">SmrtNetwork {update.version}</span>
        {" "}is available —{" "}
        <a
          href={update.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-amber-100 transition-colors"
        >
          Download
        </a>
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss update banner"
        className="text-amber-300 hover:text-amber-100 transition-colors px-1 leading-none text-base"
      >
        ×
      </button>
    </div>
  );
}
