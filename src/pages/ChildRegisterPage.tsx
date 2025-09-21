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

const MAX_NOTES = 400;
const MAX_ALLERGIES = 160;

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
  const [parentQuery, setParentQuery] = useState("");

  // ui state
  const [busy, setBusy] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [created, setCreated] = useState<ChildResponse | null>(null);

  // derived state
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const minDateISO = "2005-01-01"; // sane lower bound

  // simple validation (front-end guardrails)
  const isValid = useMemo(() => {
    if (!form.firstName.trim() || !form.lastName.trim()) return false;
    if (form.dateOfBirth && (form.dateOfBirth < minDateISO || form.dateOfBirth > todayISO)) return false;
    if ((form.allergies || "").length > MAX_ALLERGIES) return false;
    if ((form.medicalNotes || "").length > MAX_NOTES) return false;
    return true;
  }, [form, todayISO]);

  // load parents for dropdown
  const fetchParents = async () => {
    setLoadingParents(true);
    try {
      const res = await http.get<ParentSummary[]>("/api/admin/parents");
      setParents(res.data || []);
      if (!res.data || res.data.length === 0) {
        setNotice("No parents found yet. You can still create the child and link later.");
      }
    } catch (err: any) {
      console.warn("Failed to load parents", err?.response?.data || err?.message);
      setNotice("Could not load parents. You can create a child and link later.");
    } finally {
      setLoadingParents(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await fetchParents();
    })();
    return () => {
      alive = false; // (kept for symmetry in case you re-add async that checks alive)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setNotice(null);
    setCreated(null);

    try {
      // 1) Create child only
      const res = await http.post<ChildResponse>("/api/admin/children", {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      const child = res.data;

      // 2) If a parent is selected, link
      if (selectedParentId) {
        const parentId = Number(selectedParentId);
        await http.patch(`/api/admin/children/${child.id}/parent/${parentId}`);
      }

      setCreated(child);

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

      setNotice(selectedParentId ? "Child created and linked to parent." : "Child created. You can link a parent later.");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        setError(
          "Child admin endpoints are not available on the backend. Ask your backend team to enable POST /api/admin/children and PATCH /api/admin/children/{childId}/parent/{parentId}."
        );
      } else {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to create child";
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  // Filtered parent options
  const filteredParents = useMemo(() => {
    const q = parentQuery.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) => {
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.cellNumber || "").toLowerCase().includes(q)
      );
    });
  }, [parents, parentQuery]);

  const parentOptions = useMemo(
    () =>
      filteredParents.map((p) => ({
        value: String(p.id),
        label: `${p.lastName}, ${p.firstName}${p.email ? ` — ${p.email}` : ""}`,
      })),
    [filteredParents]
  );

  return (
    <div style={{ padding: 24, maxWidth: 880, margin: "0 auto" }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Create Child (Admin)</h2>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>
          Create a child profile independently. Optionally link to a <strong>Parent</strong> now or later.
          Only users with role <code>PARENT</code> can be linked.
        </p>
      </header>

      {/* Alerts */}
      {error && (
        <div role="alert" style={alertStyle("error")}>
          {error}
        </div>
      )}
      {notice && !error && (
        <div role="status" style={alertStyle("info")}>
          {notice}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
        {/* Card: Child details */}
        <section style={card()}>
          <h3 style={cardTitle()}>Child Details</h3>

          <div style={row(2)}>
            <Field
              label="First name *"
              htmlFor="firstName"
              error={!form.firstName.trim() ? "Required" : undefined}
            >
              <input
                id="firstName"
                required
                value={form.firstName}
                onChange={onText("firstName")}
                placeholder="e.g. Naledi"
                style={inputStyle}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Last name *"
              htmlFor="lastName"
              error={!form.lastName.trim() ? "Required" : undefined}
            >
              <input
                id="lastName"
                required
                value={form.lastName}
                onChange={onText("lastName")}
                placeholder="e.g. Dlamini"
                style={inputStyle}
                autoComplete="off"
              />
            </Field>
          </div>

          <div style={row(3)}>
            <Field label="Date of Birth" htmlFor="dob" hint="Must be a valid past date">
              <input
                id="dob"
                type="date"
                value={form.dateOfBirth || ""}
                onChange={onText("dateOfBirth")}
                style={inputStyle}
                min={minDateISO}
                max={todayISO}
              />
            </Field>

            <Field label="Gender" htmlFor="gender">
              <select
                id="gender"
                value={form.gender || ""}
                onChange={onText("gender") as any}
                style={{ ...inputStyle, height: 40 }}
              >
                <option value="">— Select —</option>
                <option>Female</option>
                <option>Male</option>
                <option>Non-binary</option>
                <option>Prefer not to say</option>
              </select>
            </Field>

            <Field label="Class Group" htmlFor="classGroup" hint="e.g. Busy Bees, Little Lions">
              <input
                id="classGroup"
                value={form.classGroup || ""}
                onChange={onText("classGroup")}
                placeholder="e.g. Busy Bees"
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={row(1)}>
            <Field
              label="Allergies"
              htmlFor="allergies"
              hint={`${(form.allergies || "").length}/${MAX_ALLERGIES}`}
              error={(form.allergies || "").length > MAX_ALLERGIES ? "Too long" : undefined}
            >
              <input
                id="allergies"
                value={form.allergies || ""}
                onChange={onText("allergies")}
                placeholder="e.g. Nuts, dairy"
                style={inputStyle}
                maxLength={MAX_ALLERGIES + 1}
              />
            </Field>
          </div>

          <div style={row(1)}>
            <Field
              label="Medical Notes"
              htmlFor="medicalNotes"
              hint={`${(form.medicalNotes || "").length}/${MAX_NOTES}`}
              error={(form.medicalNotes || "").length > MAX_NOTES ? "Too long" : undefined}
            >
              <textarea
                id="medicalNotes"
                value={form.medicalNotes || ""}
                onChange={onText("medicalNotes")}
                placeholder="e.g. Asthma — uses inhaler"
                style={{ ...inputStyle, minHeight: 96, lineHeight: 1.4 }}
                maxLength={MAX_NOTES + 1}
              />
            </Field>
          </div>
        </section>

        {/* Card: Link to parent */}
        <section style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 style={cardTitle()}>Link to Parent (optional)</h3>
            <button
              type="button"
              onClick={fetchParents}
              disabled={loadingParents}
              style={smallButton(loadingParents)}
              aria-busy={loadingParents}
            >
              {loadingParents ? "Refreshing…" : "Refresh list"}
            </button>
          </div>

          <div style={row(2)}>
            <Field label="Search parents" htmlFor="parentQuery" hint="Filter by name, email or cell">
              <input
                id="parentQuery"
                value={parentQuery}
                onChange={(e) => setParentQuery(e.target.value)}
                placeholder="Start typing to filter…"
                style={inputStyle}
                autoComplete="off"
              />
            </Field>

            <Field label="Select parent" htmlFor="parentSelect">
              <select
                id="parentSelect"
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
            </Field>
          </div>

          {loadingParents && (
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Loading parents…</p>
          )}
        </section>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="submit"
            disabled={busy || !isValid}
            style={buttonStyle(busy || !isValid)}
            aria-busy={busy}
          >
            {busy ? "Creating…" : "Create Child"}
          </button>
          {!isValid && (
            <span style={{ color: "#b91c1c", fontSize: 13 }}>
              Fill the required fields and fix validation errors.
            </span>
          )}
        </div>
      </form>

      {/* Result card */}
      {created && (
        <div style={successCard()}>
          <h3 style={{ marginTop: 0 }}>Child created</h3>
          <p style={{ margin: "6px 0" }}>
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
            <p style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
              Linked to parent ID <strong>{selectedParentId}</strong>.
            </p>
          ) : (
            <p style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
              Not linked to any parent. You can link later from the Admin panel.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- small presentational helpers (no external libs) ---------- */

function Field(props: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const { label, htmlFor, hint, error, children } = props;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 13, color: "#111827" }}>
        {label}
      </label>
      {children}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "#6b7280" }}>{hint}</span>
        {error && <span style={{ fontSize: 12, color: "#b91c1c" }}>{error}</span>}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  outline: "none",
  background: "white",
  transition: "box-shadow .15s ease",
};

function buttonStyle(disabled?: boolean): React.CSSProperties {
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

function smallButton(disabled?: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #0f172a",
    background: disabled ? "#cbd5e1" : "#0f172a",
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13,
  };
}

function card(): React.CSSProperties {
  return {
    padding: 16,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "linear-gradient(180deg, #ffffff, #fafafa)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };
}

function successCard(): React.CSSProperties {
  return {
    marginTop: 16,
    padding: 16,
    border: "1px solid #bbf7d0",
    borderRadius: 14,
    background: "#f0fdf4",
  };
}

function cardTitle(): React.CSSProperties {
  return { margin: "0 0 10px", fontSize: 18 };
}

function row(cols: 1 | 2 | 3): React.CSSProperties {
  const map = { 1: "1fr", 2: "1fr 1fr", 3: "1fr 1fr 1fr" } as const;
  return {
    display: "grid",
    gridTemplateColumns: map[cols],
    gap: 12,
  };
}

function alertStyle(kind: "info" | "error"): React.CSSProperties {
  const isError = kind === "error";
  return {
    margin: "0 0 12px",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${isError ? "#fecaca" : "#bfdbfe"}`,
    background: isError ? "#fef2f2" : "#eff6ff",
    color: isError ? "#991b1b" : "#1e3a8a",
    fontSize: 14,
  };
}
