import { useNavigate } from "react-router-dom";
import { api, type BillCreate } from "../api";
import BillForm from "../components/BillForm";

export default function CreateBill() {
  const navigate = useNavigate();

  async function handleCreate(data: BillCreate, donationSats: number | null) {
    const bill = await api.createBill(data);
    const stored = JSON.parse(localStorage.getItem("created_bills") || "[]");
    stored.push(bill.short_code);
    localStorage.setItem("created_bills", JSON.stringify(stored));

    if (donationSats) {
      const { checkout_url } = await api.createDonation(bill.short_code, donationSats);
      window.location.href = checkout_url;
    } else {
      navigate(`/bill/${bill.short_code}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Split a Bill</h1>
        <p className="text-gray-500">
          Split any bill and settle instantly over the Bitcoin Lightning Network.
        </p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <BillForm onSubmit={handleCreate} />
      </div>
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">How it works</h2>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2">
            <span className="font-medium text-gray-900">1.</span>
            Enter the total amount, currency, and number of people.
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-gray-900">2.</span>
            Share the link with everyone splitting the bill.
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-gray-900">3.</span>
            Each person pays their share in sats via a Lightning invoice.
          </li>
        </ol>
      </section>
    </div>
  );
}
