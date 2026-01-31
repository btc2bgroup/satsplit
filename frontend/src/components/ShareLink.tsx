import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function ShareLink({ shortCode }: { shortCode: string }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const url = window.location.origin + "/bill/" + shortCode;

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
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
        <button
          onClick={() => setShowQR(true)}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg transition whitespace-nowrap"
        >
          Show QR
        </button>
      </div>

      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowQR(false)}>
          <div className="relative bg-white rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
            <div className="p-4">
              <QRCodeSVG value={url} size={200} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
