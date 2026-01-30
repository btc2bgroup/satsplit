import { type FormEvent, useState } from "react";
import type { BillCreate } from "../api";

interface Props {
  onSubmit: (data: BillCreate) => Promise<void>;
}

export default function BillForm({ onSubmit }: Props) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [numPeople, setNumPeople] = useState("");
  const [lightningAddress, setLightningAddress] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit({
        amount: parseFloat(amount),
        currency,
        num_people: parseInt(numPeople),
        lightning_address: lightningAddress,
        description: description || undefined,
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#f7931a] transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="amount" className="block text-sm text-slate-400 mb-1">Amount</label>
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
          <label htmlFor="currency" className="block text-sm text-slate-400 mb-1">Currency</label>
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
        <label htmlFor="num_people" className="block text-sm text-slate-400 mb-1">Number of people</label>
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
        <label htmlFor="lightning_address" className="block text-sm text-slate-400 mb-1">Your Lightning Address</label>
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
        <label htmlFor="description" className="block text-sm text-slate-400 mb-1">Description (optional)</label>
        <input
          id="description"
          type="text"
          placeholder="Dinner at Mario's"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

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
