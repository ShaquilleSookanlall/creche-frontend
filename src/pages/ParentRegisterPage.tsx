import React, { useMemo, useState, FormEvent } from "react";
import http from "../api/http";

// Matches AdminCreateParentRequest on the backend
type AdminCreateParentRequest = {
  firstName: string;
  lastName: string;
  idNumber?: string;
  cellNumber?: string;
  email: string;
  address?: string;
  password: string; // admin-set initial password
};

type ParentResponse = {
  id: number;
  firstName: string;
  lastName: string;
  idNumber?: string;
  cellNumber?: string;
  email: string;
  address?: string;
  children: any[];
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
  const [created, setCreated] = useState<ParentResponse | null>(null);

  // Per-field errors (client or server)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const formInvalid =
    Object.keys(requiredMissing).length > 0 || !isEmailValid;

  // Generic change handler
  const onChange =
    (key: keyof AdminCreateParentRequest) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      // Clear per-field error as user types
      setFieldErrors((fe) => {
        const next = { ...fe };
        delete next[key as string];
        return next;
      });
    };

  // Normalize email as the user types: strip spaces and lowercase
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    // Client-side guard first
    if (formInvalid) {
      // Merge the computed required errors so they show up under fields
      setFieldErrors((fe) => ({ ...requiredMissing, ...fe, ...(isEmailValid ? {} : { email: "Enter a valid email" }) }));
      setError("Please fix the highlighted fields.");
      return;
    }

    setBusy(true);
    setError(null);
    setCreated(null);
    setFieldErrors({});

    // Normalize before sending to backend
    const payload: AdminCreateParentRequest = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      idNumber: form.idNumber?.trim() || "",
      cellNumber: form.cellNumber?.trim() || "",
      email: form.email.trim().toLowerCase(),
      address: form.address?.trim() || "",
      password: form.password, // required
    };

    try {
      const res = await http.post<ParentResponse>("/api/admin/parents", payload);
      setCreated(res.data);
      setForm((f) => ({ ...f, password: "" })); // clear password field for safety
    } catch (err: any) {
      const data: ApiErrorBody | undefined = err?.response?.data;
      const msg =
        data?.message ||
        data?.error ||
        err?.message ||
        "Failed to create parent";

      // If backend returned fieldErrors map, surface them under inputs
      if (data?.fieldErrors && typeof data.fieldErrors === "object") {
        setFieldErrors(data.fieldErrors);
        // If email-related server error, mirror under email too
        if (data.fieldErrors.email) {
          setFieldErrors((fe) => ({ ...fe, email: data.fieldErrors!.email! }));
        }
      } else {
        // If the message mentions email/password etc., try to pin to that field
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
    <div style={{ padding: 24, maxWidth: 640 }}>
      <h2>Create Parent (Admin)</h2>
      <p style={{ margin: "8px 0 16px" }}>
        This creates a <strong>Parent profile</strong> and a <strong>PARENT</strong> login
        with the password you set here.
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>First name *</label>
            <input
              required
              value={form.firstName}
              onChange={onChange("firstName")}
              placeholder="e.g. Thandi"
              style={inputStyle}
              autoComplete="off"
            />
            {fieldErrors.firstName && (
              <FieldError text={fieldErrors.firstName} />
            )}
          </div>
          <div>
            <label>Last name *</label>
            <input
              required
              value={form.lastName}
              onChange={onChange("lastName")}
              placeholder="e.g. Mokoena"
              style={inputStyle}
              autoComplete="off"
            />
            {fieldErrors.lastName && (
              <FieldError text={fieldErrors.lastName} />
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>ID number</label>
            <input
              value={form.idNumber}
              onChange={onChange("idNumber")}
              placeholder="Optional"
              style={inputStyle}
              autoComplete="off"
            />
            {fieldErrors.idNumber && <FieldError text={fieldErrors.idNumber} />}
          </div>
          <div>
            <label>Cell number</label>
            <input
              value={form.cellNumber}
              onChange={onChange("cellNumber")}
              placeholder="Optional"
              style={inputStyle}
              autoComplete="off"
            />
            {fieldErrors.cellNumber && (
              <FieldError text={fieldErrors.cellNumber} />
            )}
          </div>
        </div>

        <div>
          <label>Email *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={(e) => setEmail(e.target.value.trim())} // final trim on blur
            placeholder="parent@email.com"
            style={inputStyle}
            autoComplete="off"
            inputMode="email"
          />
          {fieldErrors.email && <FieldError text={fieldErrors.email} />}
        </div>

        <div>
          <label>Address</label>
          <textarea
            value={form.address}
            onChange={onChange("address")}
            placeholder="Optional"
            style={{ ...inputStyle, minHeight: 72 }}
          />
          {fieldErrors.address && <FieldError text={fieldErrors.address} />}
        </div>

        <div>
          <label>Initial Password (set by admin) *</label>
          <input
            required
            type="password"
            value={form.password}
            onChange={onChange("password")}
            placeholder="Choose a strong password"
            style={inputStyle}
            autoComplete="new-password"
          />
          {fieldErrors.password && <FieldError text={fieldErrors.password} />}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" disabled={busy || formInvalid} style={buttonStyle}>
            {busy ? "Creating…" : "Create Parent"}
          </button>
          {error && <span style={{ color: "crimson" }}>{error}</span>}
        </div>
      </form>

      {created && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Parent created</h3>
          <p>
            <strong>ID:</strong> {created.id}
            <br />
            <strong>Name:</strong> {created.firstName} {created.lastName}
            <br />
            <strong>Email:</strong> {created.email}
          </p>
          <p style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
            You can now create a child profile and link it to this parent.
          </p>
        </div>
      )}
    </div>
  );
}

function FieldError({ text }: { text: string }) {
  return (
    <div style={{ color: "crimson", fontSize: 12, marginTop: 4 }}>
      {text}
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
