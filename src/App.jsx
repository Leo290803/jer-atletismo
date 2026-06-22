import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  ClipboardList,
  FileText,
  Trophy,
  Settings,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Importacao from "./pages/Importacao";
import Provas from "./pages/Provas";
import Sumulas from "./pages/Sumulas";
import Resultados from "./pages/Resultados";
import Boletins from "./pages/Boletins";
import Configuracoes from "./pages/Configuracoes";
import Series from "./pages/Series";
import Publico from "./pages/Publico";
import MedalhasPublico from "./pages/MedalhasPublico";
import Telao from "./pages/Telao";
import Tv from "./pages/Tv";
import TvConfig from "./pages/TvConfig";

import "./App.css";

function AdminLayout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <h1>JER Atletismo</h1>

        <nav>
          <Link to="/">
            <LayoutDashboard size={20} /> DasDDhboard
          </Link>

          <Link to="/importacao">
            <Upload size={20} /> Importação
          </Link>

          <Link to="/provas">
            <ClipboardList size={20} /> Provas
          </Link>

          <Link to="/sumulas">
            <FileText size={20} /> Súmulas
          </Link>

          <Link to="/resultados">
            <Trophy size={20} /> Resultados
          </Link>

          <Link to="/boletins">
            <FileText size={20} /> Boletins
          </Link>

          <Link to="/configuracoes">
            <Settings size={20} /> Configurações
          </Link>

          <Link to="/publico" target="_blank">
            <Trophy size={20} /> Página Pública
          </Link>

          <Link to="/publico/medalhas" target="_blank">
            <Trophy size={20} /> Medalhas Público
          </Link>

          <Link to="/publico/telao" target="_blank">
            <Trophy size={20} /> Telão Público
          </Link>

          <Link to="/tv" target="_blank">
            <Trophy size={20} /> TV Entrada
          </Link>

          <Link to="/tv-config">
            <Settings size={20} /> Config TV Entrada
          </Link>
        </nav>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/importacao" element={<Importacao />} />
          <Route path="/provas" element={<Provas />} />
          <Route path="/sumulas" element={<Sumulas />} />
          <Route path="/resultados" element={<Resultados />} />
          <Route path="/boletins" element={<Boletins />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/tv-config" element={<TvConfig />} />
        </Routes>
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

        {/* ADMIN COM MENU */}
        <Route path="/*" element={<AdminLayout />} />
      </Routes>
    </BrowserRouter>
  );
}