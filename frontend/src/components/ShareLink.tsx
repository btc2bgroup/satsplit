import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function ShareLink({ shortCode }: { shortCode: string }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.origin + "/bill/" + shortCode;

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
        <input
          readOnly
          value={url}
          className="flex-1 bg-transparent text-gray-700 text-sm font-mono truncate outline-none"
        />
        <button
          onClick={handleCopy}
          className="bg-[#f7931a] hover:bg-[#e8851a] text-white text-sm px-4 py-2 rounded-lg transition whitespace-nowrap"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
      <div className="flex justify-center">
        <div className="bg-white p-4 rounded-xl">
          <QRCodeSVG value={url} size={200} />
        </div>
      </div>
    </div>
  );
}
