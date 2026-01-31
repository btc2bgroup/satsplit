import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface InvoiceDisplayProps {
  bolt11: string;
  fiatAmount: number;
  currency: string;
  msats: number;
}

export default function InvoiceDisplay({ bolt11, fiatAmount, currency, msats }: InvoiceDisplayProps) {
  const [copied, setCopied] = useState(false);
  const sats = Math.round(msats / 1000);

  function handleCopy() {
    navigator.clipboard.writeText(bolt11);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center space-y-4">
      <h3 className="text-lg font-semibold">Pay Your Share</h3>
      <p className="text-2xl font-bold">{fiatAmount.toFixed(2)} {currency}</p>
      <p className="text-sm text-gray-500">{sats.toLocaleString()} sats</p>
      <div className="bg-white p-4 rounded-xl">
        <QRCodeSVG value={bolt11} size={240} />
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={handleCopy}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition text-sm"
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
      <p className="text-xs text-gray-500 break-all font-mono">{bolt11}</p>
    </div>
  );
}
