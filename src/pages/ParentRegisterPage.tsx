// src/pages/ParentRegisterPage.tsx
import React, { useMemo, useState, FormEvent } from "react";
import http from "../api/http";

// Matches what the UI collects (superset of what /api/admin/users needs)
type AdminCreateParentRequest = {
  firstName: string;
  lastName: string;
  idNumber?: string;
  cellNumber?: string;
  email: string;
  address?: string;
  password: string; // admin-set initial password
};

type UserCreated = {
  id: number;
  fullName: string;
  email: string;
  role: string; // should be PARENT
};

type ApiErrorBody = {
  status?: number;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ParentRegisterPage() {
  const [form, setForm] = useState<AdminCreateParentRequest>({
    firstName: "",
    lastName: "",
    idNumber: "",
    cellNumber: "",
    email: "",
    address: "",
    password: "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [created, setCreated] = useState<UserCreated | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);

  // computed client-side validity
  const isEmailValid = useMemo(() => emailRegex.test(form.email), [form.email]);
  const requiredMissing = useMemo(() => {
    const missing: Record<string, string> = {};
    if (!form.firstName.trim()) missing.firstName = "First name is required";
    if (!form.lastName.trim()) missing.lastName = "Last name is required";
    if (!form.email.trim()) missing.email = "Email is required";
    if (!form.password) missing.password = "Password is required";
    return missing;
  }, [form]);

  const formInvalid = Object.keys(requiredMissing).length > 0 || !isEmailValid;

  // Generic change handler
  const onChange =
    (key: keyof AdminCreateParentRequest) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setFieldErrors((fe) => {
        const next = { ...fe };
        delete next[key as string];
        return next;
      });
    };

  // Normalize email: strip spaces + lowercase
  const setEmail = (raw: string) => {
    const cleaned = raw.replace(/\s+/g, "").toLowerCase();
    setForm((f) => ({ ...f, email: cleaned }));
    setFieldErrors((fe) => {
      const next = { ...fe };
      if (!emailRegex.test(cleaned)) next.email = "Enter a valid email";
      else delete next.email;
      return next;
    });
  };

  const passwordStrength = useMemo(() => {
    const pass = form.password || "";
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^\w\s]/.test(pass)) score++;
    if (score <= 2) return "Weak";
    if (score === 3) return "Okay";
    if (score === 4) return "Good";
    return "Strong";
  }, [form.password]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (formInvalid) {
      setFieldErrors((fe) => ({
        ...requiredMissing,
        ...fe,
        ...(isEmailValid ? {} : { email: "Enter a valid email" }),
      }));
      setError("Please fix the highlighted fields.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    setCreated(null);
    setFieldErrors({});

    // Create PARENT user via /api/admin/users (your kept endpoint)
    const payload = {
      fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.replace(/\s+/g, " "),
      email: form.email.trim().toLowerCase(),
      password: form.password, // backend hashes it
      role: "PARENT" as const,
    };

    try {
      const res = await http.post<UserCreated>("/api/admin/users", payload);
      setCreated(res.data);
      setNotice(
        "Parent login created with role PARENT. Note: ID number, cell, and address are not stored by this endpoint."
      );
      setForm((f) => ({ ...f, password: "" })); // clear password for safety
    } catch (err: any) {
      const data: ApiErrorBody | undefined = err?.response?.data;
      const msg =
        data?.message ||
        data?.error ||
        err?.message ||
        "Failed to create parent";

      // Surface fieldErrors from server if present
      if (data?.fieldErrors && typeof data.fieldErrors === "object") {
        setFieldErrors(data.fieldErrors);
        if (data.fieldErrors.email) {
          setFieldErrors((fe) => ({ ...fe, email: data.fieldErrors!.email! }));
        }
      } else {
        if (/email/i.test(msg)) {
          setFieldErrors((fe) => ({ ...fe, email: msg }));
        } else if (/password/i.test(msg)) {
          setFieldErrors((fe) => ({ ...fe, password: msg }));
        }
      }

      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Create Parent (Admin)</h2>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>
          This creates a <strong>PARENT login</strong> using the Users service. Extra profile fields
          (ID number, cell, address) can be captured later if/when a profile endpoint is available.
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

      <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
        {/* Card: Basic identity */}
        <section style={card()}>
          <h3 style={cardTitle()}>Identity</h3>
          <div style={row(2)}>
            <Field label="First name *" htmlFor="firstName" error={fieldErrors.firstName}>
              <input
                id="firstName"
                required
                value={form.firstName}
                onChange={onChange("firstName")}
                placeholder="e.g. Thandi"
                style={inputStyle}
                autoComplete="off"
              />
            </Field>
            <Field label="Last name *" htmlFor="lastName" error={fieldErrors.lastName}>
              <input
                id="lastName"
                required
                value={form.lastName}
                onChange={onChange("lastName")}
                placeholder="e.g. Mokoena"
                style={inputStyle}
                autoComplete="off"
              />
            </Field>
          </div>

          <div style={row(2)}>
            <Field label="Email *" htmlFor="email" error={fieldErrors.email}>
              <input
                id="email"
                required
                type="email"
                value={form.email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(e.target.value.trim())}
                placeholder="parent@email.com"
                style={inputStyle}
                autoComplete="off"
                inputMode="email"
              />
            </Field>

            <Field
              label={
                <>
                  Initial Password (set by admin) *{" "}
                  <span style={{ fontWeight: 400, color: "#64748b" }}>— {passwordStrength}</span>
                </>
              }
              htmlFor="password"
              error={fieldErrors.password}
            >
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  required
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={onChange("password")}
                  placeholder="Choose a strong password"
                  style={{ ...inputStyle, paddingRight: 72 }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  style={eyeButton()}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
          </div>
        </section>

        {/* Card: Optional details (not persisted by /api/admin/users) */}
        <section style={card()}>
          <h3 style={cardTitle()}>Optional details (not stored by this endpoint)</h3>
          <div style={row(2)}>
            <Field label="ID number" htmlFor="idNumber" error={fieldErrors.idNumber}>
              <input
                id="idNumber"
                value={form.idNumber}
                onChange={onChange("idNumber")}
                placeholder="Optional"
                style={inputStyle}
                autoComplete="off"
              />
            </Field>
            <Field label="Cell number" htmlFor="cellNumber" error={fieldErrors.cellNumber}>
              <input
                id="cellNumber"
                value={form.cellNumber}
                onChange={onChange("cellNumber")}
                placeholder="Optional"
                style={inputStyle}
                autoComplete="off"
                inputMode="tel"
              />
            </Field>
          </div>

          <Field label="Address" htmlFor="address" error={fieldErrors.address}>
            <textarea
              id="address"
              value={form.address || ""}
              onChange={onChange("address")}
              placeholder="Optional"
              style={{ ...inputStyle, minHeight: 72 }}
            />
          </Field>

          <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
            To persist these fields, add/enable a dedicated endpoint (e.g. <code>POST /api/admin/parent-profiles</code>)
            or extend your Users service and database schema.
          </p>
        </section>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" disabled={busy || formInvalid} style={buttonStyle(busy || formInvalid)} aria-busy={busy}>
            {busy ? "Creating…" : "Create Parent"}
          </button>
          {formInvalid && (
            <span style={{ color: "#b91c1c", fontSize: 13 }}>Fill the required fields and fix validation errors.</span>
          )}
        </div>
      </form>

      {/* Result card */}
      {created && (
        <div style={successCard()}>
          <h3 style={{ marginTop: 0 }}>Parent created</h3>
          <p style={{ margin: "6px 0" }}>
            <strong>ID:</strong> {created.id}
            <br />
            <strong>Name:</strong> {created.fullName}
            <br />
            <strong>Email:</strong> {created.email}
            <br />
            <strong>Role:</strong> {created.role}
          </p>
          <p style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
            You can now create a child profile and link it to this parent.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- small presentational helpers ---------- */

function Field(props: {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const { label, htmlFor, error, children } = props;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 13, color: "#111827" }}>
        {label}
      </label>
      {children}
      {error && <span style={{ fontSize: 12, color: "#b91c1c" }}>{error}</span>}
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

function eyeButton(): React.CSSProperties {
  return {
    position: "absolute",
    right: 6,
    top: 6,
    height: 28,
    padding: "0 8px",
    borderRadius: 8,
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "white",
    cursor: "pointer",
    fontSize: 12,
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

function row(cols: 1 | 2): React.CSSProperties {
  const map = { 1: "1fr", 2: "1fr 1fr" } as const;
  return {
    display: "grid",
    gridTemplateColumns: map[cols],
    gap: 12,
  };
}
