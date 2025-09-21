// src/pages/ParentChildRequestPage.tsx
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import http from "../api/http";

/** Matches the backend DTOs we added */
type ChildRequestCreate = {
  firstName: string;
  lastName: string;
  dateOfBirth?: string; // yyyy-mm-dd
  gender?: string;
  classGroup?: string;
  allergies?: string;
  medicalNotes?: string;
};

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

export default function ParentChildRequestPage() {
  const [form, setForm] = useState<ChildRequestCreate>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    classGroup: "",
    allergies: "",
    medicalNotes: "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [requests, setRequests] = useState<ChildRequestResponse[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const requiredMissing = useMemo(() => {
    const m: Record<string, string> = {};
    if (!form.firstName.trim()) m.firstName = "First name is required";
    if (!form.lastName.trim()) m.lastName = "Last name is required";
    return m;
  }, [form]);

  const formInvalid = Object.keys(requiredMissing).length > 0;

  const onText =
    (key: keyof ChildRequestCreate) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  async function loadMyRequests() {
    setLoadingList(true);
    try {
      const res = await http.get<ChildRequestResponse[]>("/api/parent/child-requests");
      setRequests(res.data || []);
    } catch (e: any) {
      console.warn("Failed to fetch requests", e?.response?.data || e?.message);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadMyRequests();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (formInvalid) {
      setError("Please fill in the required fields.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await http.post<number>("/api/parent/child-requests", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        classGroup: form.classGroup || undefined,
        allergies: form.allergies || undefined,
        medicalNotes: form.medicalNotes || undefined,
      });
      setSuccess("Your request was submitted and is awaiting admin approval.");
      setForm({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        classGroup: "",
        allergies: "",
        medicalNotes: "",
      });
      loadMyRequests();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to submit request";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Request to Add Your Child</h2>
      <p style={{ marginTop: 6, color: "#475569" }}>
        Submit your child’s details for <strong>admin approval</strong>. You’ll see the status below.
      </p>

      {error && <div style={alert("error")}>{error}</div>}
      {success && <div style={alert("success")}>{success}</div>}

      <form onSubmit={submit} style={card()}>
        <h3 style={{ marginTop: 0 }}>Child details</h3>

        <div style={grid(2)}>
          <Field label="First name *">
            <input
              required
              value={form.firstName}
              onChange={onText("firstName")}
              placeholder="e.g. Naledi"
              style={input}
            />
          </Field>
          <Field label="Last name *">
            <input
              required
              value={form.lastName}
              onChange={onText("lastName")}
              placeholder="e.g. Dlamini"
              style={input}
            />
          </Field>
        </div>

        <div style={grid(3)}>
          <Field label="Date of Birth">
            <input
              type="date"
              value={form.dateOfBirth || ""}
              onChange={onText("dateOfBirth")}
              style={input}
            />
          </Field>
          <Field label="Gender">
            <input
              value={form.gender || ""}
              onChange={onText("gender")}
              placeholder="e.g. Female"
              style={input}
            />
          </Field>
          <Field label="Class Group">
            <input
              value={form.classGroup || ""}
              onChange={onText("classGroup")}
              placeholder="e.g. Busy Bees"
              style={input}
            />
          </Field>
        </div>

        <Field label="Allergies">
          <input
            value={form.allergies || ""}
            onChange={onText("allergies")}
            placeholder="e.g. Nuts, dairy"
            style={input}
          />
        </Field>

        <Field label="Medical Notes">
          <textarea
            value={form.medicalNotes || ""}
            onChange={onText("medicalNotes")}
            placeholder="e.g. Asthma — uses inhaler"
            style={{ ...input, minHeight: 80 }}
          />
        </Field>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" disabled={busy || formInvalid} style={button(busy || formInvalid)}>
            {busy ? "Submitting…" : "Submit Request"}
          </button>
          {formInvalid && <span style={{ color: "#b91c1c", fontSize: 13 }}>First & last name are required.</span>}
        </div>
      </form>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ margin: "0 0 8px" }}>Your requests</h3>
        {loadingList ? (
          <div style={{ fontSize: 14, color: "#475569" }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div style={{ fontSize: 14, color: "#475569" }}>No requests yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {requests.map((r) => (
              <div key={r.id} style={reqCard()}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {r.lastName}, {r.firstName}
                    </div>
                    <div style={{ fontSize: 13, color: "#475569" }}>
                      {r.dateOfBirth ? `DOB: ${r.dateOfBirth}` : "DOB: —"} ·{" "}
                      {r.classGroup ? `Class: ${r.classGroup}` : "Class: —"}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.decisionReason && (
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <strong>Admin note:</strong> {r.decisionReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---- small UI helpers ---- */

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 13, color: "#111827" }}>{label}</label>
      {children}
    </div>
  );
}

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

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  outline: "none",
  background: "white",
};

function grid(cols: 1 | 2 | 3): React.CSSProperties {
  const map = { 1: "1fr", 2: "1fr 1fr", 3: "1fr 1fr 1fr" } as const;
  return { display: "grid", gridTemplateColumns: map[cols], gap: 12 };
}

function button(disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid #111827",
    background: disabled ? "#6b7280" : "#111827",
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
  };
}

function card(): React.CSSProperties {
  return {
    marginTop: 12,
    padding: 16,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "linear-gradient(180deg, #ffffff, #fafafa)",
  };
}
function reqCard(): React.CSSProperties {
  return {
    padding: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
  };
}
function alert(kind: "success" | "error"): React.CSSProperties {
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
