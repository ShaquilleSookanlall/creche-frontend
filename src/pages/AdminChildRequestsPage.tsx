// src/pages/AdminChildRequestsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import http from "../api/http";

type ChildRequestResponse = {
  id: number;
  parentUserId: number;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  classGroup?: string | null;
  allergies?: string | null;
  medicalNotes?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  decidedAt?: string | null;
  decidedByAdmin?: number | null;
  decisionReason?: string | null;
};

type AdminDecisionRequest = { reason?: string };

export default function AdminChildRequestsPage() {
  const [requests, setRequests] = useState<ChildRequestResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const [reasonById, setReasonById] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const filtered = useMemo(
    () => requests.filter((r) => r.status === filter),
    [requests, filter]
  );

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // The backend listPending() returns PENDING; if you extend service to accept status, change here.
      const res = await http.get<ChildRequestResponse[]>("/api/admin/child-requests");
      setRequests(res.data || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: number, action: "approve" | "reject") {
    setBusyId(id);
    setErr(null);
    try {
      const body: AdminDecisionRequest = { reason: reasonById[id] || undefined };
      await http.patch<void>(`/api/admin/child-requests/${id}/${action}`, body);
      // Optimistic refresh
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || `Failed to ${action} request`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Child Requests (Admin)</h2>
      <p style={{ marginTop: 6, color: "#475569" }}>
        Review requests submitted by parents. Approving creates the child and links to the parent automatically.
      </p>

      {err && <div style={alert("error")}>{err}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}>
        <FilterButton label="Pending" active={filter === "PENDING"} onClick={() => setFilter("PENDING")} />
        <FilterButton label="Approved" active={filter === "APPROVED"} onClick={() => setFilter("APPROVED")} />
        <FilterButton label="Rejected" active={filter === "REJECTED"} onClick={() => setFilter("REJECTED")} />
        <button onClick={load} style={{ ...smallBtn, marginLeft: "auto" }}>Refresh</button>
      </div>

      {loading ? (
        <div style={{ fontSize: 14, color: "#475569" }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ fontSize: 14, color: "#475569" }}>No {filter.toLowerCase()} requests.</div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} style={card()}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>
                      {r.lastName}, {r.firstName}
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div style={{ fontSize: 13, color: "#475569" }}>
                    {r.dateOfBirth ? `DOB: ${r.dateOfBirth}` : "DOB: —"} ·{" "}
                    {r.gender ? `Gender: ${r.gender}` : "Gender: —"} ·{" "}
                    {r.classGroup ? `Class: ${r.classGroup}` : "Class: —"}
                  </div>
                  {(r.allergies || r.medicalNotes) && (
                    <div style={{ fontSize: 13 }}>
                      {r.allergies && <>Allergies: {r.allergies} · </>}
                      {r.medicalNotes && <>Notes: {r.medicalNotes}</>}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#64748b" }}>Parent user id: {r.parentUserId}</div>
                </div>

                {r.status === "PENDING" ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 13, color: "#111827" }}>
                      Decision note (optional)
                    </label>
                    <textarea
                      value={reasonById[r.id] || ""}
                      onChange={(e) =>
                        setReasonById((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      placeholder="e.g. All documents verified"
                      style={{ ...input, minHeight: 70 }}
                    />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => decide(r.id, "approve")}
                        disabled={busyId === r.id}
                        style={approveBtn(busyId === r.id)}
                      >
                        {busyId === r.id ? "Approving…" : "Approve"}
                      </button>
                      <button
                        onClick={() => decide(r.id, "reject")}
                        disabled={busyId === r.id}
                        style={rejectBtn(busyId === r.id)}
                      >
                        {busyId === r.id ? "Rejecting…" : "Reject"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 13 }}>
                    <strong>Decision:</strong> {r.status}
                    {r.decisionReason ? <> — {r.decisionReason}</> : null}
                    {r.decidedAt ? <> · <em>{r.decidedAt}</em></> : null}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---- UI helpers ---- */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, React.CSSProperties> = {
    PENDING: { background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412" },
    APPROVED: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" },
    REJECTED: { background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" },
  };
  const style = map[status] || map.PENDING;
  return (
    <span style={{ ...style, padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
      {status}
    </span>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={active ? smallBtnActive : smallBtn}>
      {label}
    </button>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  outline: "none",
  background: "white",
};

function card(): React.CSSProperties {
  return {
    padding: 16,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "linear-gradient(180deg, #ffffff, #fafafa)",
  };
}

const smallBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
};
const smallBtnActive: React.CSSProperties = {
  ...smallBtn,
  borderColor: "#111827",
  background: "#111827",
  color: "white",
  fontWeight: 600,
};

function approveBtn(disabled?: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid #16a34a",
    background: disabled ? "#86efac" : "#16a34a",
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
  };
}
function rejectBtn(disabled?: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid #b91c1c",
    background: disabled ? "#fecaca" : "#b91c1c",
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
  };
}

function alert(kind: "error" | "success"): React.CSSProperties {
  const isErr = kind === "error";
  return {
    margin: "12px 0",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${isErr ? "#fecaca" : "#bbf7d0"}`,
    background: isErr ? "#fef2f2" : "#f0fdf4",
    color: isErr ? "#991b1b" : "#166534",
  };
}
