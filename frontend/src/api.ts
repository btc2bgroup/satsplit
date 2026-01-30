export interface BillCreate {
  amount: number;
  currency: string;
  num_people: number;
  lightning_address: string;
  description?: string;
}

export interface ParticipantOut {
  id: string;
  name: string;
  share_amount_msats: number;
  share_amount_fiat: number;
  status: string;
  bolt11_invoice: string | null;
  payment_hash: string | null;
  created_at: string;
}

export interface BillOut {
  id: string;
  short_code: string;
  amount: number;
  currency: string;
  num_people: number;
  lightning_address: string;
  description: string | null;
  created_at: string;
  participants: ParticipantOut[];
}

export interface BillStatus {
  short_code: string;
  num_people: number;
  joined: number;
  paid: number;
}

export interface JoinResponse {
  participant: ParticipantOut;
  bolt11_invoice: string;
}

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  createBill: (data: BillCreate) =>
    request<BillOut>("/bills", { method: "POST", body: JSON.stringify(data) }),

  getBill: (code: string) => request<BillOut>(`/bills/${code}`),

  getStatus: (code: string) => request<BillStatus>(`/bills/${code}/status`),

  joinBill: (code: string, name: string) =>
    request<JoinResponse>(`/bills/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  updateParticipantStatus: (code: string, participantId: string, status: string) =>
    request<ParticipantOut>(`/bills/${code}/participants/${participantId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
