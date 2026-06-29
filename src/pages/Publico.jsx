import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Publico() {
  const hoje = new Date().toISOString().slice(0, 10);

  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [mensagem, setMensagem] = useState("");

  const carregarResultados = useCallback(async () => {
    setMensagem("Carregando resultados...");

    const { data, error } = await supabase
      .from("resultados")
      .select(`
        *,
        provas (
          nome,
          categoria,
          naipe,
          fase
        ),
        inscricoes (
          atletas (
            numero,
            nome,
            municipio,
            escolas (
              nome
            )
          )
        )
      `)
      .eq("publicado", true)
      .gte("data_resultado", dataInicio)
      .lte("data_resultado", dataFim)
      .order("data_resultado", { ascending: false })
      .order("colocacao", { ascending: true });

    if (error) {
      setMensagem("Erro ao carregar: " + error.message);
      return;
    }

    const lista = data || [];

    const idsSeries = [
      ...new Set(lista.map((r) => r.serie_id).filter(Boolean)),
    ];

    let mapaSeries = {};

    if (idsSeries.length > 0) {
      const { data: seriesData, error: erroSeries } = await supabase
        .from("series")
        .select("id, numero_serie")
        .in("id", idsSeries);

      if (erroSeries) {
        setMensagem("Erro ao carregar séries: " + erroSeries.message);
        return;
      }

      (seriesData || []).forEach((s) => {
        mapaSeries[s.id] = s.numero_serie;
      });
    }

    const somenteComResultado = lista
      .filter((r) => {
        return r.tempo || r.melhor_marca || r.resultado_final || r.colocacao;
      })
      .map((r) => ({
        ...r,
        numero_serie_publico: mapaSeries[r.serie_id] || null,
      }));

    setResultados(somenteComResultado);
    setMensagem("");
  }, [dataInicio, dataFim]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregarResultados();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [carregarResultados]);

  function resultadoFinal(r) {
    return r.tempo || r.melhor_marca || r.resultado_final || r.marca || "-";
  }

  function formatarData(data) {
    if (!data) return "";
    const [ano, mes, dia] = String(data).split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function medalha(pos) {
    if (Number(pos) === 1) return "🥇";
    if (Number(pos) === 2) return "🥈";
    if (Number(pos) === 3) return "🥉";
    return "";
  }

  const filtrados = resultados.filter((r) => {
    const texto = `
      ${r.provas?.nome || ""}
      ${r.provas?.categoria || ""}
      ${r.provas?.naipe || ""}
      ${r.provas?.fase || ""}
      ${r.numero_serie_publico || ""}
      ${r.inscricoes?.atletas?.nome || ""}
      ${r.inscricoes?.atletas?.escolas?.nome || ""}
      ${r.inscricoes?.atletas?.municipio || ""}
    `.toLowerCase();

    return texto.includes(busca.toLowerCase());
  });

  function agruparResultados(lista) {
    const grupos = {};

    lista.forEach((r) => {
      const chaveProva = `
        ${r.provas?.nome || "SEM PROVA"}|
        ${r.provas?.categoria || ""}|
        ${r.provas?.naipe || ""}|
        ${r.provas?.fase || "QUALIFICAÇÃO"}
      `;

      if (!grupos[chaveProva]) {
        grupos[chaveProva] = {
          prova: r.provas?.nome || "SEM PROVA",
          categoria: r.provas?.categoria || "",
          naipe: r.provas?.naipe || "",
          fase: r.provas?.fase || "QUALIFICAÇÃO",
          data: r.data_resultado,
          series: {},
        };
      }

      const numeroSerie = r.numero_serie_publico || "GERAL";

      if (!grupos[chaveProva].series[numeroSerie]) {
        grupos[chaveProva].series[numeroSerie] = [];
      }

      grupos[chaveProva].series[numeroSerie].push(r);
    });

    return Object.values(grupos);
  }

  const grupos = agruparResultados(filtrados);

  return (
    <div style={pagina}>
      <header style={header}>
        <h1 style={{ margin: 0 }}>JER 2026 - Atletismo</h1>
        <p style={{ margin: "6px 0 0" }}>Resultados oficiais publicados</p>
      </header>

      <section style={card}>
        <h2>Consultar resultados</h2>

        <div style={filtros}>
          <div>
            <label>Data inicial</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label>Data final</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              style={input}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label>Pesquisar</label>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Prova, série, atleta, escola ou município..."
              style={{ ...input, width: "100%" }}
            />
          </div>

          <button onClick={carregarResultados} style={botao}>
            Buscar
          </button>
        </div>

        {mensagem && <p>{mensagem}</p>}
      </section>

      <section style={card}>
        <h2>Resultados</h2>

        {grupos.length === 0 ? (
          <p>Nenhum resultado publicado encontrado.</p>
        ) : (
          grupos.map((grupo, index) => (
            <div key={index} style={grupoCard}>
              <div style={cabecalhoProva}>
                <div>
                  <h2 style={{ margin: 0 }}>{grupo.prova}</h2>
                  <p style={{ margin: "6px 0 0", opacity: 0.85 }}>
                    {grupo.categoria} • {grupo.naipe} • {grupo.fase}
                  </p>
                </div>

                <strong>{formatarData(grupo.data)}</strong>
              </div>

              {Object.entries(grupo.series)
                .sort(([a], [b]) => {
                  if (a === "GERAL") return 1;
                  if (b === "GERAL") return -1;
                  return Number(a) - Number(b);
                })
                .map(([numeroSerie, itens]) => (
                  <div key={numeroSerie} style={serieCard}>
                    <h3 style={tituloSerie}>
                      {numeroSerie === "GERAL"
                        ? "Classificação Geral"
                        : `Série ${numeroSerie}`}
                    </h3>

                    <div style={{ overflowX: "auto" }}>
                      <table style={tabela}>
                        <thead>
                          <tr>
                            <th style={th}>Col.</th>
                            <th style={th}>Nº</th>
                            <th style={th}>Atleta</th>
                            <th style={th}>Escola</th>
                            <th style={th}>Município</th>
                            <th style={th}>Resultado</th>
                            <th style={th}>Q</th>
                          </tr>
                        </thead>

                        <tbody>
                          {itens
                            .sort((a, b) => {
                              const ca = Number(a.colocacao || 9999);
                              const cb = Number(b.colocacao || 9999);
                              return ca - cb;
                            })
                            .map((r) => {
                              const atleta = r.inscricoes?.atletas;

                              return (
                                <tr key={r.id}>
                                  <td style={td}>
                                    {medalha(r.colocacao)}{" "}
                                    {r.colocacao ? `${r.colocacao}º` : "-"}
                                  </td>
                                  <td style={td}>{atleta?.numero || "-"}</td>
                                  <td style={td}>{atleta?.nome}</td>
                                  <td style={td}>{atleta?.escolas?.nome}</td>
                                  <td style={td}>{atleta?.municipio}</td>
                                  <td style={tdResultado}>{resultadoFinal(r)}</td>
                                  <td style={tdQ}>{r.qualificacao || ""}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: 24,
  fontFamily: "Arial, sans-serif",
};

const header = {
  background: "#16a34a",
  padding: 24,
  borderRadius: 18,
  marginBottom: 20,
  textAlign: "center",
};

const card = {
  background: "#0f172a",
  padding: 20,
  borderRadius: 18,
  marginBottom: 20,
  border: "1px solid #1e293b",
};

const filtros = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "end",
};

const input = {
  display: "block",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #334155",
  marginTop: 6,
};

const botao = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 10,
  background: "#22c55e",
  color: "#020617",
  fontWeight: "bold",
  cursor: "pointer",
};

const grupoCard = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 18,
  padding: 18,
  marginBottom: 22,
};

const cabecalhoProva = {
  background: "#16a34a",
  color: "#020617",
  padding: 18,
  borderRadius: 14,
  marginBottom: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const serieCard = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 14,
  marginBottom: 16,
};

const tituloSerie = {
  margin: "0 0 12px",
  color: "#22c55e",
};

const tabela = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#020617",
};

const th = {
  border: "1px solid #334155",
  padding: 10,
  textAlign: "left",
  background: "#1e293b",
};

const td = {
  border: "1px solid #334155",
  padding: 10,
};

const tdResultado = {
  ...td,
  fontWeight: "bold",
  color: "#22c55e",
};

const tdQ = {
  ...td,
  fontWeight: "bold",
  textAlign: "center",
  color: "#22c55e",
};