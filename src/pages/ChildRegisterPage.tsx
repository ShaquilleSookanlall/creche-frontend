// src/pages/ChildRegisterPage.tsx
import React, { useEffect, useMemo, useState, FormEvent } from "react";
import http from "../api/http";

type ParentSummary = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  cellNumber: string | null;
};

type ChildRegistrationRequest = {
  firstName: string;
  lastName: string;
  dateOfBirth?: string; // yyyy-mm-dd
  gender?: string;
  classGroup?: string;
  allergies?: string;
  medicalNotes?: string;
};

type ChildResponse = {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  classGroup?: string | null;
  allergies?: string | null;
  medicalNotes?: string | null;
};

export default function ChildRegisterPage() {
  // form state
  const [form, setForm] = useState<ChildRegistrationRequest>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    classGroup: "",
    allergies: "",
    medicalNotes: "",
  });

  // parent selection
  const [parents, setParents] = useState<ParentSummary[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>(""); // keep as string for <select>

  // ui state
  const [busy, setBusy] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ChildResponse | null>(null);

  // load parents for dropdown
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingParents(true);
      try {
        const res = await http.get<ParentSummary[]>("/api/admin/parents");
        if (alive) setParents(res.data || []);
      } catch (err: any) {
        // non-blocking error
        console.warn("Failed to load parents", err?.response?.data || err?.message);
      } finally {
        if (alive) setLoadingParents(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onText =
    (key: keyof ChildRegistrationRequest) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);

    try {
      // 1) Create child only
      const res = await http.post<ChildResponse>("/api/admin/children", form);
      const child = res.data;

      // 2) If a parent is selected, link
      if (selectedParentId) {
        const parentId = Number(selectedParentId);
        await http.patch(`/api/admin/children/${child.id}/parent/${parentId}`);
      }

      setCreated({
        ...child,
        // if you linked, reflect linkage in UI note (no need to refetch)
      });

      // Reset form but keep the selected parent
      setForm({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        classGroup: "",
        allergies: "",
        medicalNotes: "",
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create child";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const parentOptions = useMemo(
    () =>
      parents.map((p) => ({
        value: String(p.id),
        label: `${p.lastName}, ${p.firstName}${p.email ? ` — ${p.email}` : ""}`,
      })),
    [parents]
  );

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <h2>Create Child (Admin)</h2>
      <p style={{ margin: "8px 0 16px" }}>
        This creates a child profile independently. You can optionally link the child to a
        <strong> Parent</strong> now or later. Only parents (role = PARENT) can have children linked.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>First name *</label>
            <input
              required
              value={form.firstName}
              onChange={onText("firstName")}
              placeholder="e.g. Naledi"
              style={inputStyle}
            />
          </div>
          <div>
            <label>Last name *</label>
            <input
              required
              value={form.lastName}
              onChange={onText("lastName")}
              placeholder="e.g. Dlamini"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label>Date of Birth</label>
            <input
              type="date"
              value={form.dateOfBirth || ""}
              onChange={onText("dateOfBirth")}
              style={inputStyle}
            />
          </div>
          <div>
            <label>Gender</label>
            <input
              value={form.gender || ""}
              onChange={onText("gender")}
              placeholder="e.g. Female"
              style={inputStyle}
            />
          </div>
          <div>
            <label>Class Group</label>
            <input
              value={form.classGroup || ""}
              onChange={onText("classGroup")}
              placeholder="e.g. Busy Bees"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label>Allergies</label>
          <input
            value={form.allergies || ""}
            onChange={onText("allergies")}
            placeholder="e.g. Nuts, dairy"
            style={inputStyle}
          />
        </div>

        <div>
          <label>Medical Notes</label>
          <textarea
            value={form.medicalNotes || ""}
            onChange={onText("medicalNotes")}
            placeholder="e.g. Asthma — uses inhaler"
            style={{ ...inputStyle, minHeight: 72 }}
          />
        </div>

        <div>
          <label>Link to Parent (optional)</label>
          <select
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            style={{ ...inputStyle, height: 40 }}
            disabled={loadingParents}
          >
            <option value="">-- No parent (link later) --</option>
            {parentOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {loadingParents && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              Loading parents…
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" disabled={busy} style={buttonStyle}>
            {busy ? "Creating…" : "Create Child"}
          </button>
          {error && <span style={{ color: "crimson" }}>{error}</span>}
        </div>
      </form>

      {created && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Child created</h3>
          <p>
            <strong>ID:</strong> {created.id}
            <br />
            <strong>Name:</strong> {created.firstName} {created.lastName}
            {created.dateOfBirth && (
              <>
                <br />
                <strong>DOB:</strong> {created.dateOfBirth}
              </>
            )}
          </p>
          {selectedParentId ? (
            <p style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
              Linked to parent ID {selectedParentId}.
            </p>
          ) : (
            <p style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
              Not linked to any parent. You can link later from the Admin panel.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #ccc",
  borderRadius: 8,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #222",
  background: "#222",
  color: "white",
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  border: "1px solid #e5e5e5",
  borderRadius: 12,
  background: "#fafafa",
};
