import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  ClipboardList,
  FileText,
  Trophy,
  Settings,
  Monitor,
  Medal,
  Tv2,
  Radio,
  Users,
  BookOpen,
  LogOut,
} from "lucide-react";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Importacao = lazy(() => import("./pages/Importacao"));
const Provas = lazy(() => import("./pages/Provas"));
const Sumulas = lazy(() => import("./pages/Sumulas"));
const Resultados = lazy(() => import("./pages/Resultados"));
const Boletins = lazy(() => import("./pages/Boletins"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const NumeracaoBalizamento = lazy(() => import("./pages/NumeracaoBalizamento"));
const GestaoInscricoes = lazy(() => import("./pages/GestaoInscricoes"));
const HistoricoAlteracoes = lazy(() => import("./pages/HistoricoAlteracoes"));
const Publico = lazy(() => import("./pages/Publico"));
const MedalhasPublico = lazy(() => import("./pages/MedalhasPublico"));
const Telao = lazy(() => import("./pages/Telao"));
const Tv = lazy(() => import("./pages/Tv"));
const TvConfig = lazy(() => import("./pages/TvConfig"));
const PistaAoVivo = lazy(() => import("./pages/PistaAoVivo"));
const TelaoPista = lazy(() => import("./pages/TelaoPista"));
const ArbitroSumula = lazy(() => import("./pages/ArbitroSumula"));
const Login = lazy(() => import("./pages/Login"));

import "./styles/theme.css";
import "./App.css";

function MenuItem({ to, icon: Icon, children, target }) {
  return (
    <NavLink
      to={to}
      target={target}
      className={({ isActive }) => (isActive ? "active" : "")}
    >
      <Icon size={20} />
      <span>{children}</span>
    </NavLink>
  );
}

function AdminLayout() {
  const { signOut } = useAuth();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box">
            <Trophy size={30} />
          </div>

          <div>
            <h1>JER Atletismo</h1>
            <p>Sistema Oficial</p>
          </div>
        </div>

        <nav>
          <MenuItem to="/" icon={LayoutDashboard}>
            Dashboard
          </MenuItem>

          <MenuItem to="/importacao" icon={Upload}>
            Importação
          </MenuItem>

          <MenuItem to="/provas" icon={ClipboardList}>
            Provas
          </MenuItem>

          <MenuItem to="/secretaria-tecnica" icon={Users}>
            Secretaria Técnica
          </MenuItem>

          <MenuItem to="/historico-alteracoes" icon={BookOpen}>
            Histórico
          </MenuItem>

          <MenuItem to="/sumulas" icon={FileText}>
            Súmulas
          </MenuItem>

          <MenuItem to="/resultados" icon={Trophy}>
            Resultados
          </MenuItem>

          <MenuItem to="/numeracao-balizamento" icon={ClipboardList}>
            Numeração e Balizamento
          </MenuItem>

          <MenuItem to="/pista-ao-vivo" icon={Radio}>
            Pista ao Vivo
          </MenuItem>

          <MenuItem to="/boletins" icon={FileText}>
            Boletins
          </MenuItem>

          <MenuItem to="/configuracoes" icon={Settings}>
            Configurações
          </MenuItem>

          <div className="menu-divider" />

          <MenuItem to="/publico" icon={Monitor} target="_blank">
            Página Pública
          </MenuItem>

          <MenuItem to="/publico/medalhas" icon={Medal} target="_blank">
            Medalhas Público
          </MenuItem>

          <MenuItem to="/publico/telao" icon={Tv2} target="_blank">
            Telão Público
          </MenuItem>

          <MenuItem to="/publico/telao-pista" icon={Tv2} target="_blank">
            Telão Pista
          </MenuItem>

          <MenuItem to="/tv" icon={Tv2} target="_blank">
            TV Entrada
          </MenuItem>

          <MenuItem to="/tv-config" icon={Settings}>
            Config TV Entrada
          </MenuItem>

          <button
            type="button"
            onClick={() => void signOut()}
            style={{
              width: "100%",
              marginTop: 12,
              border: "none",
              borderRadius: 10,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 700,
              cursor: "pointer",
              background: "#ef4444",
              color: "#fff",
            }}
          >
            <LogOut size={20} />
            Sair
          </button>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>Gestão Oficial do Atletismo</h2>
            <p>Jogos Escolares de Roraima • Súmulas, Resultados e Boletins</p>
          </div>

          <div className="topbar-badge">
            <span></span>
            Online
          </div>
        </header>

        <section className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/importacao" element={<Importacao />} />
            <Route path="/provas" element={<Provas />} />
            <Route path="/sumulas" element={<Sumulas />} />
            <Route path="/resultados" element={<Resultados />} />
            <Route path="/secretaria-tecnica" element={<GestaoInscricoes />} />
            <Route path="/historico-alteracoes" element={<HistoricoAlteracoes />} />
            <Route path="/numeracao-balizamento" element={<NumeracaoBalizamento />} />
            <Route path="/pista-ao-vivo" element={<PistaAoVivo />} />
            <Route path="/boletins" element={<Boletins />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/tv-config" element={<TvConfig />} />
          </Routes>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 24 }}>Carregando página...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/tv" element={<Tv />} />
            <Route path="/publico" element={<Publico />} />
            <Route path="/publico/medalhas" element={<MedalhasPublico />} />
            <Route path="/publico/telao" element={<Telao />} />
            <Route path="/arbitro/sumula" element={<ArbitroSumula />} />
            <Route path="/arbitro/sumula/:token" element={<ArbitroSumula />} />
            <Route path="/publico/telao-pista" element={<TelaoPista />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
