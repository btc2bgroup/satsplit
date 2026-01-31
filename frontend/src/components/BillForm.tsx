import { type FormEvent, useState } from "react";
import type { BillCreate } from "../api";

interface Props {
  onSubmit: (data: BillCreate, donationSats: number | null) => Promise<void>;
}

export default function BillForm({ onSubmit }: Props) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [numPeople, setNumPeople] = useState("");
  const [lightningAddress, setLightningAddress] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [donateEnabled, setDonateEnabled] = useState(false);
  const [donationSats, setDonationSats] = useState(210);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit(
        {
          amount: parseFloat(amount),
          currency,
          num_people: parseInt(numPeople),
          lightning_address: lightningAddress,
          description: description || undefined,
        },
        donateEnabled ? donationSats : null,
      );
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f7931a] transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="amount" className="block text-sm text-gray-600 mb-1">Amount</label>
          <input
            id="amount"
            type="number"
            step={currency === "SATS" ? "1" : "0.01"}
            min={currency === "SATS" ? "1" : "0.01"}
            required
            placeholder={currency === "SATS" ? "10000" : "100.00"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="w-28">
          <label htmlFor="currency" className="block text-sm text-gray-600 mb-1">Currency</label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputClass}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
            <option value="CNY">CNY</option>
            <option value="AUD">AUD</option>
            <option value="CAD">CAD</option>
            <option value="CHF">CHF</option>
            <option value="HKD">HKD</option>
            <option value="SGD">SGD</option>
            <option value="SEK">SEK</option>
            <option value="NOK">NOK</option>
            <option value="KRW">KRW</option>
            <option value="INR">INR</option>
            <option value="BRL">BRL</option>
            <option value="SATS">SATS</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="num_people" className="block text-sm text-gray-600 mb-1">Number of people</label>
        <input
          id="num_people"
          type="number"
          min="2"
          required
          placeholder="4"
          value={numPeople}
          onChange={(e) => setNumPeople(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="lightning_address" className="block text-sm text-gray-600 mb-1">Your Lightning Address</label>
        <input
          id="lightning_address"
          type="text"
          required
          placeholder="you@getalby.com"
          value={lightningAddress}
          onChange={(e) => setLightningAddress(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm text-gray-600 mb-1">Description (optional)</label>
        <input
          id="description"
          type="text"
          placeholder="Dinner at Mario's"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={donateEnabled}
            onChange={(e) => setDonateEnabled(e.target.checked)}
            className="w-4 h-4 accent-[#f7931a]"
          />
          <span className="text-sm text-gray-700">I want to support this project</span>
        </label>
        {donateEnabled && (
          <div className="flex gap-3 pl-7">
            {[21, 210, 2100].map((sats) => (
              <label key={sats} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="donation"
                  checked={donationSats === sats}
                  onChange={() => setDonationSats(sats)}
                  className="accent-[#f7931a]"
                />
                <span className="text-sm text-gray-700">{sats} sats</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#f7931a] hover:bg-[#e8851a] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
      >
        {loading ? "Creating..." : "Split the Bill"}
      </button>
    </form>
  );
}
