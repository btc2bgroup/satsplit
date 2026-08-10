import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useVerifyPolling } from "../hooks/useVerifyPolling";

interface InvoiceDisplayProps {
  bolt11: string;
  fiatAmount: number;
  currency: string;
  msats: number;
  /** Supply both to auto-confirm settlement via LUD-21 while the payer waits. */
  shortCode?: string;
  participantId?: string;
  verifiable?: boolean;
}

export default function InvoiceDisplay({
  bolt11,
  fiatAmount,
  currency,
  msats,
  shortCode,
  participantId,
  verifiable = false,
}: InvoiceDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const sats = Math.round(msats / 1000);

  const pollIds = useMemo(
    () => (verifiable && participantId && !paid ? [participantId] : []),
    [verifiable, participantId, paid],
  );
  useVerifyPolling(shortCode, pollIds, () => setPaid(true));

  function handleCopy() {
    navigator.clipboard.writeText(bolt11);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (paid) {
    return (
      <div className="bg-white border border-green-200 rounded-xl p-6 flex flex-col items-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-3xl">
          ✓
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Payment received</h3>
        <p className="text-2xl font-bold">
          {fiatAmount.toFixed(2)} {currency}
        </p>
        <p className="text-sm text-gray-500">{sats.toLocaleString()} sats — you're all settled.</p>
      </div>
    );
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
      {verifiable && participantId && (
        <p className="text-xs text-gray-400">Waiting for payment — this updates automatically.</p>
      )}
    </div>
  );
}
