import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, type BillOut, type JoinResponse } from "../api";
import BillSummary from "../components/BillSummary";
import JoinForm from "../components/JoinForm";
import InvoiceDisplay from "../components/InvoiceDisplay";
import ShareLink from "../components/ShareLink";
import ParticipantList from "../components/ParticipantList";

export default function ViewBill() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bill, setBill] = useState<BillOut | null>(null);
  const [joinData, setJoinData] = useState<JoinResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDonationBanner, setShowDonationBanner] = useState(false);
  const isCreator = (() => {
    const stored = JSON.parse(localStorage.getItem("created_bills") || "[]");
    return stored.includes(shortCode);
  })();

  useEffect(() => {
    if (searchParams.get("donated") === "1") {
      setShowDonationBanner(true);
      searchParams.delete("donated");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!shortCode) return;
    api
      .getBill(shortCode)
      .then(setBill)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [shortCode]);

  async function handleJoin(name: string) {
    const data = await api.joinBill(shortCode!, name);
    setJoinData(data);
  }

  if (loading) {
    return <p className="text-center text-gray-500">Loading...</p>;
  }

  if (error || !bill) {
    return <p className="text-center text-red-600">{error || "Bill not found"}</p>;
  }

  return (
    <div className="space-y-6">
      {showDonationBanner && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-green-800 text-sm font-medium">Thanks for the donation!</span>
          <button
            onClick={() => setShowDonationBanner(false)}
            className="text-green-600 hover:text-green-800 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}
      <BillSummary bill={bill} shareUrl={isCreator ? `${window.location.origin}/bill/${shortCode}` : undefined} />

      {isCreator && <ShareLink shortCode={shortCode!} />}

      {isCreator && bill.participants.length > 0 && (
        <ParticipantList
          shortCode={shortCode!}
          participants={bill.participants}
          onStatusChanged={() => {
            api.getBill(shortCode!).then(setBill);
          }}
        />
      )}

      {joinData ? (
        <InvoiceDisplay
          bolt11={joinData.bolt11_invoice}
          fiatAmount={joinData.participant.share_amount_fiat}
          currency={bill.currency}
          msats={joinData.participant.share_amount_msats}
        />
      ) : (
        !isCreator && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <JoinForm onJoin={handleJoin} />
          </div>
        )
      )}
    </div>
  );
}
