// src/App.tsx
import React, { FormEvent, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import ParentRegisterPage from "./pages/ParentRegisterPage";
import ChildRegisterPage from "./pages/ChildRegisterPage";
import UserScheduleViewing from "./pages/UserScheduleViewing";
import AdminViewingsPage from "./pages/AdminViewingsPage";
import AdminUsersPage from "./pages/AdminUsersPage"; // ⬅️ NEW
import { AuthProvider, useAuth } from "./context/AuthContext";

// -------------------- Route Guards --------------------

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Checking login…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Checking login…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}

// USER-only guard (regular accounts)
function RequireUser({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Checking login…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "USER") return <Navigate to="/" replace />;
  return children;
}

// -------------------- Inline Pages (minimal) --------------------

function LoginPage() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email, password);
      nav("/");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Invalid credentials");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h2>Login</h2>
      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          <div>Email</div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          <div>Password</div>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <button disabled={busy} type="submit">{busy ? "Signing in…" : "Login"}</button>
      </form>
      <div style={{ marginTop: 12 }}>
        New here? <Link to="/register">Create an account</Link>
      </div>
    </div>
  );
}

function RegisterPage() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await register(fullName, email, password);
      nav("/");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h2>Create Account</h2>
      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          <div>Full name</div>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label>
          <div>Email</div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          <div>Password</div>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <button disabled={busy} type="submit">{busy ? "Creating…" : "Register"}</button>
      </form>
      <div style={{ marginTop: 12 }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
}

// -------------------- Nav --------------------

function NavBar() {
  const { user, logout } = useAuth();
  return (
    <nav style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid #ddd" }}>
      <Link to="/">Home</Link>

      {!user && (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}

      {user && (
        <>
          <Link to="/me">My Account</Link>

          {/* USER-only link (regular users) */}
          {user.role === "USER" && <Link to="/user/viewings">Schedule Viewing</Link>}

          {/* Admin-only links */}
          {user.role === "ADMIN" && (
            <>
              <Link to="/admin/users">Users</Link> {/* ⬅️ NEW */}
              <Link to="/admin/register/parent">Register Parent</Link>
              <Link to="/admin/register/child">Register Child</Link>
              <Link to="/admin/parents">Parents</Link>
              <Link to="/admin/children">Children</Link>
              <Link to="/admin/viewings">Viewings</Link>
            </>
          )}
          <button onClick={logout} style={{ marginLeft: "auto" }}>Logout</button>
        </>
      )}
    </nav>
  );
}

// -------------------- Pages (simple stubs) --------------------

function Home() {
  return <div style={{ padding: 24 }}>Welcome to the Creche portal.</div>;
}

function MePage() {
  const { user } = useAuth();
  return (
    <div style={{ padding: 24 }}>
      <h2>My Account</h2>
      {user ? (
        <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 6 }}>
{JSON.stringify(user, null, 2)}
        </pre>
      ) : (
        <div>Not logged in.</div>
      )}
    </div>
  );
}

function ParentsListPage() {
  return <div style={{ padding: 24 }}>TODO: list parents (call /api/admin/parents)</div>;
}

function ChildrenListPage() {
  return <div style={{ padding: 24 }}>TODO: list children (call /api/admin/children)</div>;
}

// -------------------- App Root --------------------

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* User-protected */}
          <Route path="/me" element={<RequireAuth><MePage /></RequireAuth>} />

          {/* USER-only booking route */}
          <Route
            path="/user/viewings"
            element={
              <RequireUser>
                <UserScheduleViewing />
              </RequireUser>
            }
          />

          {/* Redirect any old parent link to the new user page */}
          <Route path="/parent/viewings" element={<Navigate to="/user/viewings" replace />} />

          {/* Admin-protected */}
          <Route
            path="/admin/users"
            element={<RequireAdmin><AdminUsersPage /></RequireAdmin>}
          />
          <Route
            path="/admin/register/parent"
            element={<RequireAdmin><ParentRegisterPage /></RequireAdmin>}
          />
          <Route
            path="/admin/register/child"
            element={<RequireAdmin><ChildRegisterPage /></RequireAdmin>}
          />
          <Route
            path="/admin/parents"
            element={<RequireAdmin><ParentsListPage /></RequireAdmin>}
          />
          <Route
            path="/admin/children"
            element={<RequireAdmin><ChildrenListPage /></RequireAdmin>}
          />
          <Route
            path="/admin/viewings"
            element={<RequireAdmin><AdminViewingsPage /></RequireAdmin>}
          />

          {/* Fallback */}
          <Route path="*" element={<div style={{ padding: 24 }}>Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
