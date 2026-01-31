import { useNavigate } from "react-router-dom";
import { api, type BillCreate } from "../api";
import BillForm from "../components/BillForm";

export default function CreateBill() {
  const navigate = useNavigate();

  async function handleCreate(data: BillCreate) {
    const bill = await api.createBill(data);
    const stored = JSON.parse(localStorage.getItem("created_bills") || "[]");
    stored.push(bill.short_code);
    localStorage.setItem("created_bills", JSON.stringify(stored));
    navigate(`/bill/${bill.short_code}`);
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Split a Bill</h1>
        <p className="text-gray-500">Pay your share with Lightning</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <BillForm onSubmit={handleCreate} />
      </div>
    </div>
  );
}
