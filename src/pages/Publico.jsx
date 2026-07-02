import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const SELECT_RESULTADOS = [
  "*",
  "provas (nome, categoria, naipe, fase)",
  "inscricoes (atletas (numero, nome, municipio, escolas (nome)))",
].join(",");

export default function Publico() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [naipe, setNaipe] = useState("");
  const [resultados, setResultados] = useState([]);
  const [mensagem, setMensagem] = useState("");

  const carregarResultados = useCallback(async () => {
    setMensagem("Carregando resultados publicados...");
    const { data, error } = await supabase
      .from("resultados")
      .select(SELECT_RESULTADOS)
      .eq("publicado", true)
      .gte("data_resultado", dataInicio)
      .lte("data_resultado", dataFim)
      .order("data_resultado", { ascending: false })
      .order("colocacao", { ascending: true });

    if (error) {
      setMensagem("Erro ao carregar resultados: " + error.message);
      return;
    }

    const lista = data || [];
    const idsSeries = [...new Set(lista.map((r) => r.serie_id).filter(Boolean))];
    const mapaSeries = {};

    if (idsSeries.length > 0) {
      const { data: seriesData, error: erroSeries } = await supabase
        .from("series")
        .select("id, numero_serie")
        .in("id", idsSeries);

      if (erroSeries) {
        setMensagem("Erro ao carregar series: " + erroSeries.message);
        return;
      }

      (seriesData || []).forEach((s) => {
        mapaSeries[s.id] = s.numero_serie;
      });
    }

    setResultados(
      lista
        .filter((r) => r.tempo || r.melhor_marca || r.resultado_final || r.colocacao)
        .map((r) => ({ ...r, numero_serie_publico: mapaSeries[r.serie_id] || null }))
    );
    setMensagem("");
  }, [dataInicio, dataFim]);

  useEffect(() => {
    void carregarResultados();
  }, [carregarResultados]);

  function resultadoFinal(r) {
    return r.tempo || r.melhor_marca || r.resultado_final || r.marca || "-";
  }

  function formatarData(data) {
    if (!data) return "";
    const [ano, mes, dia] = String(data).split("-");
    return dia + "/" + mes + "/" + ano;
  }

  function seloColocacao(pos) {
    const n = Number(pos);
    if (n === 1) return "ouro";
    if (n === 2) return "prata";
    if (n === 3) return "bronze";
    return "normal";
  }

  const opcoesCategoria = useMemo(() => [...new Set(resultados.map((r) => r.provas?.categoria).filter(Boolean))].sort(), [resultados]);
  const opcoesNaipe = useMemo(() => [...new Set(resultados.map((r) => r.provas?.naipe).filter(Boolean))].sort(), [resultados]);

  const filtrados = resultados.filter((r) => {
    const atleta = r.inscricoes?.atletas;
    const texto = [
      r.provas?.nome, r.provas?.categoria, r.provas?.naipe, r.provas?.fase,
      r.numero_serie_publico, atleta?.nome, atleta?.escolas?.nome, atleta?.municipio,
    ].filter(Boolean).join(" ").toLowerCase();

    return texto.includes(busca.toLowerCase()) && (!categoria || r.provas?.categoria === categoria) && (!naipe || r.provas?.naipe === naipe);
  });

  function agruparResultados(lista) {
    const grupos = {};
    lista.forEach((r) => {
      const chave = [r.provas?.nome || "SEM PROVA", r.provas?.categoria || "", r.provas?.naipe || "", r.provas?.fase || "QUALIFICACAO"].join("|");
      if (!grupos[chave]) {
        grupos[chave] = {
          prova: r.provas?.nome || "SEM PROVA",
          categoria: r.provas?.categoria || "",
          naipe: r.provas?.naipe || "",
          fase: r.provas?.fase || "QUALIFICACAO",
          data: r.data_resultado,
          series: {},
        };
      }
      const numeroSerie = r.numero_serie_publico || "GERAL";
      grupos[chave].series[numeroSerie] ||= [];
      grupos[chave].series[numeroSerie].push(r);
    });
    return Object.values(grupos);
  }

  const grupos = agruparResultados(filtrados);
  const totalFinais = grupos.filter((g) => String(g.fase).includes("FINAL")).length;

  return (
    <div className="public-page">
      <style>{css}</style>
      <header className="public-hero">
        <div className="hero-logos">
          <img src="/logo-jer.png" alt="Jogos Escolares de Roraima" />
          <img src="/logo-idjuv.png" alt="IDJUV" />
        </div>
        <div>
          <p className="eyebrow">Resultados oficiais</p>
          <h1>JER 2026 - Atletismo</h1>
          <p className="hero-copy">Consulte resultados publicados por data, prova, atleta, escola ou municipio.</p>
        </div>
      </header>

      <section className="stats-grid">
        <div><span>{grupos.length}</span><strong>Provas</strong></div>
        <div><span>{filtrados.length}</span><strong>Resultados</strong></div>
        <div><span>{totalFinais}</span><strong>Finais</strong></div>
      </section>

      <section className="filter-card">
        <div className="filter-grid">
          <label>Data inicial<input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></label>
          <label>Data final<input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></label>
          <label>Categoria<select value={categoria} onChange={(e) => setCategoria(e.target.value)}><option value="">Todas</option>{opcoesCategoria.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}</select></label>
          <label>Naipe<select value={naipe} onChange={(e) => setNaipe(e.target.value)}><option value="">Todos</option>{opcoesNaipe.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}</select></label>
          <label className="search-field">Pesquisar<input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Prova, serie, atleta, escola ou municipio" /></label>
          <button type="button" onClick={carregarResultados}>Atualizar</button>
        </div>
        {mensagem && <p className="message">{mensagem}</p>}
      </section>

      <main className="results-list">
        {grupos.length === 0 ? (
          <section className="empty-state">Nenhum resultado publicado encontrado para os filtros selecionados.</section>
        ) : (
          grupos.map((grupo, index) => (
            <article key={index} className="event-card">
              <header className="event-header">
                <div>
                  <span>{formatarData(grupo.data)}</span>
                  <h2>{grupo.prova}</h2>
                  <p>{grupo.categoria} | {grupo.naipe} | {grupo.fase}</p>
                </div>
              </header>
              {Object.entries(grupo.series)
                .sort(([a], [b]) => {
                  if (a === "GERAL") return 1;
                  if (b === "GERAL") return -1;
                  return Number(a) - Number(b);
                })
                .map(([numeroSerie, itens]) => (
                  <section key={numeroSerie} className="serie-block">
                    <h3>{numeroSerie === "GERAL" ? "Classificacao geral" : "Serie " + numeroSerie}</h3>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Col.</th><th>No</th><th>Atleta</th><th>Escola</th><th>Municipio</th><th>Resultado</th><th>Q</th></tr></thead>
                        <tbody>
                          {itens.sort((a, b) => Number(a.colocacao || 9999) - Number(b.colocacao || 9999)).map((r) => {
                            const atleta = r.inscricoes?.atletas;
                            return (
                              <tr key={r.id}>
                                <td><span className={"place " + seloColocacao(r.colocacao)}>{r.colocacao ? r.colocacao + "o" : "-"}</span></td>
                                <td>{atleta?.numero || "-"}</td>
                                <td>{atleta?.nome || "-"}</td>
                                <td>{atleta?.escolas?.nome || "-"}</td>
                                <td>{atleta?.municipio || "-"}</td>
                                <td><strong>{resultadoFinal(r)}</strong></td>
                                <td>{r.qualificacao || ""}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
            </article>
          ))
        )}
      </main>
    </div>
  );
}

const css = [
  ".public-page { min-height: 100vh; background: #f1f5f9; color: #0f172a; padding: 22px; font-family: Inter, Arial, sans-serif; }",
  ".public-hero { max-width: 1180px; margin: 0 auto 18px; padding: 24px; border-radius: 18px; background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 58%, #dcfce7 100%); border: 1px solid #dbeafe; display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center; box-shadow: 0 14px 34px rgba(15, 23, 42, .08); }",
  ".hero-logos { display: flex; gap: 18px; align-items: center; }",
  ".hero-logos img { width: 118px; height: 82px; object-fit: contain; }",
  ".eyebrow { margin: 0 0 6px; color: #047857; font-weight: 900; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; }",
  ".public-hero h1 { margin: 0; font-size: 34px; color: #003b73; line-height: 1.1; }",
  ".hero-copy { margin: 8px 0 0; color: #475569; font-weight: 600; }",
  ".stats-grid { max-width: 1180px; margin: 0 auto 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }",
  ".stats-grid div { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; display: flex; align-items: baseline; justify-content: space-between; }",
  ".stats-grid span { font-size: 30px; font-weight: 900; color: #0f766e; }",
  ".stats-grid strong { color: #475569; }",
  ".filter-card, .event-card, .empty-state { max-width: 1180px; margin: 0 auto 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 10px 28px rgba(15, 23, 42, .06); }",
  ".filter-grid { display: grid; grid-template-columns: 150px 150px 170px 140px 1fr auto; gap: 12px; align-items: end; }",
  "label { display: grid; gap: 6px; font-weight: 800; color: #334155; font-size: 13px; }",
  "input, select { min-height: 42px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 12px; font: inherit; background: white; color: #0f172a; }",
  "button { min-height: 42px; border: 0; border-radius: 10px; padding: 0 16px; background: #0f766e; color: #ffffff; font-weight: 900; cursor: pointer; }",
  ".message { margin: 12px 0 0; color: #0369a1; font-weight: 700; }",
  ".empty-state { color: #475569; font-weight: 700; }",
  ".event-header { background: #003b73; color: white; border-radius: 12px; padding: 16px; margin-bottom: 14px; }",
  ".event-header span { display: inline-block; font-weight: 900; color: #bbf7d0; margin-bottom: 5px; }",
  ".event-header h2 { margin: 0; font-size: 22px; }",
  ".event-header p { margin: 6px 0 0; color: #dbeafe; font-weight: 700; }",
  ".serie-block { margin-top: 14px; }",
  ".serie-block h3 { margin: 0 0 8px; color: #0f766e; font-size: 17px; }",
  ".table-wrap { overflow-x: auto; border: 1px solid #dbe3ee; border-radius: 12px; }",
  "table { width: 100%; border-collapse: collapse; min-width: 780px; }",
  "th { background: #e5edf7; color: #0f172a; text-align: left; font-size: 12px; text-transform: uppercase; }",
  "th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }",
  "td { font-size: 14px; color: #0f172a; }",
  "tbody tr:nth-child(even) { background: #f8fafc; }",
  ".place { display: inline-flex; min-width: 34px; height: 26px; border-radius: 999px; align-items: center; justify-content: center; background: #e2e8f0; font-weight: 900; }",
  ".place.ouro { background: #facc15; color: #422006; }",
  ".place.prata { background: #cbd5e1; color: #0f172a; }",
  ".place.bronze { background: #fdba74; color: #431407; }",
  "@media (max-width: 900px) { .public-hero { grid-template-columns: 1fr; text-align: center; } .hero-logos { justify-content: center; } .filter-grid { grid-template-columns: 1fr 1fr; } .search-field { grid-column: 1 / -1; } button { grid-column: 1 / -1; } }",
  "@media (max-width: 640px) { .public-page { padding: 14px; } .stats-grid { grid-template-columns: 1fr; } .filter-grid { grid-template-columns: 1fr; } .public-hero h1 { font-size: 27px; } .hero-logos img { width: 96px; height: 68px; } }",
].join("\n");