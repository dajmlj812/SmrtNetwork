"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const SHORTCUTS = [
  { key: "Ctrl+K", description: "Open global search" },
  { key: "?", description: "Show keyboard shortcuts" },
  { key: "Esc", description: "Close modals / search" },
  { key: "↑ / ↓", description: "Navigate search results" },
  { key: "Enter", description: "Select search result" },
];

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-white/40 hover:text-white/70 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-[var(--border)]">
            {SHORTCUTS.map((s) => (
              <tr key={s.key}>
                <td className="py-2.5 pr-4 w-28">
                  <kbd className="inline-block px-2 py-0.5 rounded bg-white/10 border border-white/20 text-xs font-mono text-white/70">
                    {s.key}
                  </kbd>
                </td>
                <td className="py-2.5 text-white/60">{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-white/30 mt-4">Press <kbd className="px-1 rounded bg-white/10 border border-white/20 font-mono">?</kbd> to toggle this panel.</p>
      </div>
    </div>
  );
}
