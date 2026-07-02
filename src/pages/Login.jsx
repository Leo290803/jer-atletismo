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
    <div style={styles.page}>
      <form onSubmit={handleLogin} style={styles.card}>
        <div style={styles.logoRow}>
          <img src="/logo-idjuv.png" alt="IDJUV" style={styles.logoIdjuv} />
          <span style={styles.divider} />
          <img src="/logo-jer.png" alt="Jogos Escolares de Roraima" style={styles.logoJer} />
        </div>

        <div style={styles.headingBox}>
          <span style={styles.badge}>Sistema Oficial</span>
          <h1 style={styles.title}>JER Atletismo</h1>
          <p style={styles.subtitle}>Acesso administrativo para sumulas, resultados e boletins</p>
        </div>

        <label style={styles.label}>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        <label style={styles.label}>Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.inputSenha}
        />

        <button type="submit" disabled={loading} style={{ ...styles.button, ...(loading ? styles.buttonLoading : {}) }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {message && <p style={styles.error}>{message}</p>}
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 46%, #ecfdf5 100%)",
    padding: 20,
  },
  card: {
    background: "rgba(255,255,255,0.96)",
    width: "100%",
    maxWidth: 460,
    borderRadius: 18,
    padding: 28,
    border: "1px solid #dbeafe",
    boxShadow: "0 20px 50px rgba(15,23,42,0.16)",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 22,
  },
  logoIdjuv: {
    height: 74,
    maxWidth: 145,
    objectFit: "contain",
  },
  logoJer: {
    height: 76,
    maxWidth: 155,
    objectFit: "contain",
  },
  divider: {
    width: 1,
    height: 54,
    background: "#cbd5e1",
    display: "block",
  },
  headingBox: {
    textAlign: "center",
    marginBottom: 24,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 12px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 10,
  },
  title: {
    margin: 0,
    color: "#003b73",
    fontSize: 28,
    lineHeight: 1.15,
    fontWeight: 900,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#475569",
    fontWeight: 600,
    lineHeight: 1.35,
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontWeight: 700,
    color: "#0f172a",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 13,
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    marginBottom: 14,
    outlineColor: "#0ea5e9",
    fontSize: 15,
  },
  inputSenha: {
    width: "100%",
    boxSizing: "border-box",
    padding: 13,
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    marginBottom: 16,
    outlineColor: "#0ea5e9",
    fontSize: 15,
  },
  button: {
    width: "100%",
    padding: 13,
    border: "none",
    borderRadius: 10,
    background: "#0f766e",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(15,118,110,0.24)",
    fontSize: 15,
  },
  buttonLoading: {
    background: "#94a3b8",
    cursor: "default",
    boxShadow: "none",
  },
  error: {
    margin: "12px 0 0",
    color: "#b91c1c",
    fontWeight: 700,
  },
};
