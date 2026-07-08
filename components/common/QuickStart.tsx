"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface QuickStartProps {
  className?: string;
}

export default function QuickStart({ className = "" }: QuickStartProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const go = () => {
    try {
      if (!url.trim()) {
        setError("Enter a website URL");
        return;
      }
      new URL(url);
      setError(null);
      router.push(`/scraper?url=${encodeURIComponent(url)}`);
    } catch (e) {
      setError("Please enter a valid URL (https://example.com)");
    }
  };

  const trySample = () =>
    router.push(`/scraper?url=${encodeURIComponent("https://semrush.com")}`);

  return (
    <div
      className={`p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 ${className}`}
    >
      <label className="text-sm text-gray-300">Quick Start</label>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={go}
          className="px-4 py-3 rounded-xl bg-brand-main hover:bg-brand-main/80 text-white"
        >
          Go
        </button>
        <button
          onClick={trySample}
          className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white"
        >
          Try sample
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
