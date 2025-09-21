import React, { useState, FormEvent } from "react";
import http from "../api/http";

function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function UserScheduleViewing() {
  const [day, setDay] = useState<string>("");
  const [time, setTime] = useState<string>("12:00");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(false);
    try {
      await http.post("/api/user/viewings", {
        day,              // <-- backend expects 'day' (YYYY-MM-DD)
        startTime: time,  // <-- HH:mm
      });
      setOk(true);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Booking failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <h2>Book a School Viewing</h2>
      <p>30-minute sessions between 12:00 and 14:00, Monday–Friday.</p>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label>
          <div>Date</div>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            min={todayISO()}
            required
          />
        </label>

        <label>
          <div>Start time</div>
          <select value={time} onChange={(e) => setTime(e.target.value)}>
            <option>12:00</option>
            <option>12:30</option>
            <option>13:00</option>
            <option>13:30</option>
          </select>
        </label>

        <button disabled={busy} type="submit">
          {busy ? "Booking…" : "Book"}
        </button>

        {err && <div style={{ color: "crimson" }}>{err}</div>}
        {ok && <div style={{ color: "green" }}>Booked! We’ll email a confirmation.</div>}
      </form>
    </div>
  );
}
