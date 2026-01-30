import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type BillOut, type JoinResponse } from "../api";
import { usePollStatus } from "../hooks/usePollStatus";
import BillSummary from "../components/BillSummary";
import JoinForm from "../components/JoinForm";
import InvoiceDisplay from "../components/InvoiceDisplay";
import ProgressBar from "../components/ProgressBar";
import ShareLink from "../components/ShareLink";
import ParticipantList from "../components/ParticipantList";

export default function ViewBill() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [bill, setBill] = useState<BillOut | null>(null);
  const [joinData, setJoinData] = useState<JoinResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const status = usePollStatus(shortCode);

  const isCreator = (() => {
    const stored = JSON.parse(localStorage.getItem("created_bills") || "[]");
    return stored.includes(shortCode);
  })();

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
    return <p className="text-center text-slate-400">Loading...</p>;
  }

  if (error || !bill) {
    return <p className="text-center text-red-400">{error || "Bill not found"}</p>;
  }

  return (
    <div className="space-y-6">
      <BillSummary bill={bill} />

      {status && <ProgressBar status={status} />}

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
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
            <JoinForm onJoin={handleJoin} />
          </div>
        )
      )}
    </div>
  );
}
