import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const PAGE_SIZE = 20;

function formatarJson(valor) {
  if (!valor) return "-";

  if (typeof valor === "string") return valor;

  try {
    return JSON.stringify(valor);
  } catch {
    return "-";
  }
}

export default function HistoricoAlteracoes() {
  const [registros, setRegistros] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [filtros, setFiltros] = useState({
    usuario: "",
    acao: "",
    atleta: "",
  });

  const carregarHistorico = async () => {
    setLoading(true);
    setMensagem("");

    const start = pageIndex * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from("historico_alteracoes")
      .select(
        `
        id,
        usuario,
        acao,
        motivo,
        atleta,
        antes,
        depois,
        created_at
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      setMensagem("Erro ao carregar histórico: " + error.message);
      setLoading(false);
      return;
    }

    setRegistros(data || []);
    setTotalRows(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    const id = setTimeout(() => {
      void carregarHistorico();
    }, 0);

    return () => clearTimeout(id);
  }, [pageIndex]);

  const registrosFiltrados = useMemo(() => {
    return registros.filter((registro) => {
      if (
        filtros.usuario &&
        !String(registro.usuario || "")
          .toLowerCase()
          .includes(filtros.usuario.toLowerCase())
      ) {
        return false;
      }

      if (
        filtros.acao &&
        !String(registro.acao || "")
          .toLowerCase()
          .includes(filtros.acao.toLowerCase())
      ) {
        return false;
      }

      if (
        filtros.atleta &&
        !String(registro.atleta || "")
          .toLowerCase()
          .includes(filtros.atleta.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [registros, filtros]);

  return (
    <div>
      <h1>Histórico de Alterações</h1>

      <p className="muted">
        Registro de ações técnicas e ajustes feitos pela secretaria em atletas e inscrições.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="filter-grid">
          <input
            value={filtros.usuario}
            onChange={(e) =>
              setFiltros((current) => ({ ...current, usuario: e.target.value }))
            }
            placeholder="Usuário"
          />

          <input
            value={filtros.acao}
            onChange={(e) =>
              setFiltros((current) => ({ ...current, acao: e.target.value }))
            }
            placeholder="Ação"
          />

          <input
            value={filtros.atleta}
            onChange={(e) =>
              setFiltros((current) => ({ ...current, atleta: e.target.value }))
            }
            placeholder="Atleta"
          />
        </div>
      </div>

      {mensagem && <div className="alert-warning">{mensagem}</div>}

      <div className="card">
        {loading ? (
          <p>Carregando histórico...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Atleta</th>
                  <th>Motivo</th>
                  <th>Antes</th>
                  <th>Depois</th>
                </tr>
              </thead>

              <tbody>
                {registrosFiltrados.map((registro) => (
                  <tr key={registro.id}>
                    <td>
                      {registro.created_at
                        ? new Date(registro.created_at).toLocaleString("pt-BR")
                        : "-"}
                    </td>
                    <td>{registro.usuario || "-"}</td>
                    <td>{registro.acao || "-"}</td>
                    <td>{registro.atleta || "-"}</td>
                    <td>{registro.motivo || "-"}</td>
                    <td>{formatarJson(registro.antes)}</td>
                    <td>{formatarJson(registro.depois)}</td>
                  </tr>
                ))}

                {registrosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="7" align="center">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div
          className="action-row"
          style={{ marginTop: 16, justifyContent: "space-between" }}
        >
          <span>
            Página {pageIndex + 1} de{" "}
            {Math.max(1, Math.ceil(totalRows / PAGE_SIZE))}
          </span>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="secondary-button"
              disabled={pageIndex <= 0}
              onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
            >
              Anterior
            </button>

            <button
              className="secondary-button"
              disabled={(pageIndex + 1) * PAGE_SIZE >= totalRows}
              onClick={() => setPageIndex((prev) => prev + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}