import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function InvoiceDisplay({ bolt11 }: { bolt11: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(bolt11);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col items-center space-y-4">
      <h3 className="text-lg font-semibold">Pay Your Share</h3>
      <div className="bg-white p-4 rounded-xl">
        <QRCodeSVG value={bolt11} size={240} />
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={handleCopy}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 py-2 rounded-lg transition text-sm"
        >
          {copied ? "Copied!" : "Copy Invoice"}
        </button>
        <a
          href={"lightning:" + bolt11}
          className="flex-1 bg-[#f7931a] hover:bg-[#e8851a] text-white py-2 rounded-lg transition text-sm text-center"
        >
          Open Wallet
        </a>
      </div>
      <p className="text-xs text-slate-500 break-all font-mono">{bolt11}</p>
    </div>
  );
}
