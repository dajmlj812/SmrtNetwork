"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface Props {
  onSearch: (query: string) => void;
}

export function DeviceSearch({ onSearch }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search by MAC address or IP (e.g. aa:bb:cc:dd:ee:ff or 10.0.0.1)"
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-overlay border text-sm placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover text-sm transition-colors"
      >
        Search
      </button>
    </form>
  );
}
