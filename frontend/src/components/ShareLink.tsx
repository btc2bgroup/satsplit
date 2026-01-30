import { useState } from "react";

export default function ShareLink({ shortCode }: { shortCode: string }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.origin + "/bill/" + shortCode;

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
      <input
        readOnly
        value={url}
        className="flex-1 bg-transparent text-slate-300 text-sm font-mono truncate outline-none"
      />
      <button
        onClick={handleCopy}
        className="bg-[#f7931a] hover:bg-[#e8851a] text-white text-sm px-4 py-2 rounded-lg transition whitespace-nowrap"
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
