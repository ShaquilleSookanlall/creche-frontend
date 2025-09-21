// src/pages/AdminViewingsPage.tsx
import React, { useEffect, useState } from "react";
import http from "../api/http";

type AdminSummary = {
  id: number;
  day: string;                 // e.g. "2025-09-26"
  startTime: string;           // "12:30"
  endTime: string;             // "13:00"
  status: "PENDING" | "ACK" | "CANCELLED";
  userId?: number;             // optional – if your admin API returns it
  userName?: string;           // optional – nice-to-have
  userEmail?: string;          // <- map from bookedByUserEmail on the server
};

export default function AdminViewingsPage() {
  const [rows, setRows] = useState<AdminSummary[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setErr(null);
    try {
      // Expect your backend /api/admin/viewings to return only PENDING items,
      // with fields { id, day, startTime, endTime, status, userId?, userName?, userEmail? }.
      const res = await http.get<AdminSummary[]>("/api/admin/viewings");
      setRows(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load viewings");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // simple polling “alert”
    return () => clearInterval(t);
  }, []);

  const ack = async (id: number) => {
    try {
      await http.patch(`/api/admin/viewings/${id}/ack`);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to acknowledge");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Viewing Requests (Pending)</h2>
        <button onClick={load} disabled={busy}>{busy ? "Refreshing…" : "Refresh"}</button>
      </div>

      {err && <div style={{ color: "crimson", marginTop: 12 }}>{err}</div>}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr>
            <th style={th}>Date</th>
            <th style={th}>Time</th>
            <th style={th}>User</th>
            <th style={th}>Email</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 12, opacity: 0.7 }}>
                No pending requests
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={td}>{r.day}</td>
              <td style={td}>{r.startTime}–{r.endTime}</td>
              <td style={td}>{r.userName || r.userEmail || (r.userId ? `User #${r.userId}` : "-")}</td>
              <td style={td}>{r.userEmail || "-"}</td>
              <td style={td}>
                {r.status === "PENDING" && (
                  <button onClick={() => ack(r.id)}>Acknowledge</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 8,
  borderBottom: "1px solid #e5e5e5",
};
const td: React.CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #f1f1f1",
};
