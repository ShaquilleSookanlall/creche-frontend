import React, { useEffect, useState } from "react";
import http from "../api/http";

type UserRow = {
  id: number;
  fullName: string;
  email: string;
  role: "ADMIN" | "USER" | "PARENT";
};

const ROLES: Array<UserRow["role"]> = ["ADMIN", "USER", "PARENT"];

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  const load = async () => {
    setErr(null);
    try {
      // Backend clears passwordHash; safe to show
      const res = await http.get<UserRow[]>("/api/admin/users");
      setRows(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load users");
    }
  };

  useEffect(() => { load(); }, []);

  const updateRole = async (id: number, role: UserRow["role"]) => {
    setSaving(id);
    setErr(null);
    try {
      await http.patch(`/api/admin/users/${id}/role`, { role });
      // quick refresh
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to update role");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>User Accounts</h2>
      <p style={{ marginTop: 0, opacity: 0.75 }}>
        Change a user’s role to <strong>PARENT</strong> to grant parent features.
        (Note: the Parent <em>profile</em> is separate from the login; create it on
        <strong> Admin → Register Parent</strong> if needed.)
      </p>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Role</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(u => (
            <tr key={u.id}>
              <td style={td}>{u.fullName}</td>
              <td style={td}>{u.email}</td>
              <td style={td}>
                <select
                  value={u.role}
                  onChange={e => updateRole(u.id, e.target.value as UserRow["role"])}
                  disabled={saving === u.id}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td style={td}>
                {saving === u.id && <span style={{ opacity: 0.7 }}>Saving…</span>}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td style={td} colSpan={4}>No users</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: 8, borderBottom: "1px solid #e5e5e5" };
const td: React.CSSProperties = { padding: 8, borderBottom: "1px solid #f4f4f4" };
