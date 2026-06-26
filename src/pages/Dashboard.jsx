import { useEffect, useState } from "react";
import {
  Users,
  ClipboardList,
  School,
  Activity,
  Trophy,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [dados, setDados] = useState({
    atletas: 0,
    provas: 0,
    escolas: 0,
    andamento: 0,
    resultados: 0,
  });

  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarDashboard();
  }, []);

  async function carregarDashboard() {
    try {
      setCarregando(true);
      setMensagem("");

      const [
        atletasRes,
        provasRes,
        escolasRes,
        andamentoRes,
        resultadosRes,
      ] = await Promise.all([
        supabase.from("atletas").select("*", { count: "exact", head: true }),

        supabase.from("provas").select("*", { count: "exact", head: true }),

        supabase.from("escolas").select("*", { count: "exact", head: true }),

        supabase
          .from("provas")
          .select("*", { count: "exact", head: true })
          .eq("status", "em_andamento"),

        supabase
          .from("resultados")
          .select("*", { count: "exact", head: true }),
      ]);

      setDados({
        atletas: atletasRes.count || 0,
        provas: provasRes.count || 0,
        escolas: escolasRes.count || 0,
        andamento: andamentoRes.count || 0,
        resultados: resultadosRes.count || 0,
      });
    } catch (err) {
      setMensagem(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <div className="page-title">
        <h1>Dashboard Institucional</h1>
        <p>
          Resumo operacional da competição de atletismo dos Jogos Escolares de
          Roraima.
        </p>
      </div>

      <div className="toolbar">
        <button onClick={carregarDashboard}>
          <RefreshCw size={18} />
          {carregando ? "Atualizando..." : "Atualizar dados"}
        </button>

        <span className="badge badge-success">Sistema Online</span>

        {dados.andamento > 0 && (
          <span className="live-badge">
            {dados.andamento} prova(s) em andamento
          </span>
        )}
      </div>

      {mensagem && <div className="alert-error">{mensagem}</div>}

      <div className="dashboard-grid">
        <StatCard
          titulo="Total de Atletas"
          valor={dados.atletas}
          descricao="Atletas cadastrados na base"
          icon={Users}
        />

        <StatCard
          titulo="Total de Provas"
          valor={dados.provas}
          descricao="Provas configuradas"
          icon={ClipboardList}
        />

        <StatCard
          titulo="Total de Escolas"
          valor={dados.escolas}
          descricao="Instituições participantes"
          icon={School}
        />

        <StatCard
          titulo="Em Andamento"
          valor={dados.andamento}
          descricao="Provas em execução"
          icon={Activity}
        />

        <StatCard
          titulo="Resultados"
          valor={dados.resultados}
          descricao="Resultados lançados"
          icon={Trophy}
        />
      </div>

      <div className="dashboard-panels">
        <div className="page-card">
          <h2>Status da Competição</h2>
          <p className="muted">
            Acompanhe o andamento geral das provas, súmulas e resultados
            publicados.
          </p>

          <div className="status-list">
            <div>
              <strong>Base de atletas</strong>
              <span className="badge badge-success">Carregada</span>
            </div>

            <div>
              <strong>Súmulas</strong>
              <span className="badge badge-info">Disponíveis</span>
            </div>

            <div>
              <strong>Boletins</strong>
              <span className="badge badge-warning">Em atualização</span>
            </div>
          </div>
        </div>

        <div className="page-card">
          <h2>Acesso Rápido</h2>
          <p className="muted">
            Use o menu lateral para importar atletas, gerar súmulas, lançar
            resultados e publicar boletins.
          </p>

          <div className="quick-actions">
            <a href="/sumulas">Gerar Súmulas</a>
            <a href="/resultados">Lançar Resultados</a>
            <a href="/boletins">Gerar Boletins</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ titulo, valor, descricao, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div>
          <h3>{titulo}</h3>
          <strong>{valor}</strong>
        </div>

        <div className="stat-icon">
          <Icon size={26} />
        </div>
      </div>

      <span>{descricao}</span>
    </div>
  );
}
