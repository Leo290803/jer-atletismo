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
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Importacao from "./pages/Importacao";
import Provas from "./pages/Provas";
import Sumulas from "./pages/Sumulas";
import Resultados from "./pages/Resultados";
import Boletins from "./pages/Boletins";
import Configuracoes from "./pages/Configuracoes";
import Publico from "./pages/Publico";
import MedalhasPublico from "./pages/MedalhasPublico";
import Telao from "./pages/Telao";
import Tv from "./pages/Tv";
import TvConfig from "./pages/TvConfig";
import PistaAoVivo from "./pages/PistaAoVivo";
import TelaoPista from "./pages/TelaoPista";

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

          <MenuItem to="/sumulas" icon={FileText}>
            Súmulas
          </MenuItem>

          <MenuItem to="/resultados" icon={Trophy}>
            Resultados
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
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>Sistema de Atletismo</h2>
            <p>Jogos Escolares de Roraima 2026</p>
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
    <BrowserRouter>
      <Routes>
        {/* PÚBLICO SEM MENU ADMIN */}
        <Route path="/tv" element={<Tv />} />
        <Route path="/publico" element={<Publico />} />
        <Route path="/publico/medalhas" element={<MedalhasPublico />} />
        <Route path="/publico/telao" element={<Telao />} />
        <Route path="/publico/telao-pista" element={<TelaoPista />} />

        {/* ADMIN COM MENU */}
        <Route path="/*" element={<AdminLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
