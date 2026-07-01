import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage("Falha no login: " + error.message);
      setLoading(false);
      return;
    }

    const target = location.state?.from?.pathname || "/";
    navigate(target, { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#e2e8f0", padding: 20 }}>
      <form
        onSubmit={handleLogin}
        style={{ background: "white", width: "100%", maxWidth: 420, borderRadius: 16, padding: 24, boxShadow: "0 15px 35px rgba(15,23,42,0.15)" }}
      >
        <h1 style={{ marginTop: 0 }}>Login Administrativo</h1>
        <p style={{ marginTop: 0, color: "#475569" }}>Acesso restrito às rotas internas.</p>

        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, marginBottom: 14 }}
        />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, marginBottom: 14 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 12, border: "none", borderRadius: 10, background: "#0f766e", color: "white", fontWeight: 700, cursor: "pointer" }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {message && <p style={{ marginTop: 12, color: "#b91c1c" }}>{message}</p>}
      </form>
    </div>
  );
}
