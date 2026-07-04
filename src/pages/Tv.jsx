import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const CONFIG_PADRAO = {
  titulo: "JER 2026 - ATLETISMO",
  subtitulo: "CENTRAL OFICIAL DE RESULTADOS",
  aviso1: "Resultados atualizados automaticamente",
  aviso2: "Acompanhe tambem pelo celular na pagina publica",
  aviso3: "Quadro de medalhas atualizado apos finais publicadas",
  rodape: "Resultados oficiais: /publico | Medalhas: /publico/medalhas",
  tempoAtualizacao: 8000,
  limiteResultados: 24,
  limiteMedalhas: 6,
  limiteSeries: 4,
  atletasPorSerie: 8,
  limiteUltimasMedalhas: 5,
  mostrarResultados: true,
  mostrarMedalhas: true,
  mostrarUltimasMedalhas: true,
  mostrarAvisos: true,
  mostrarRelogio: true,
  mostrarRodape: true,
  mostrarLogos: true,
  mostrarQrCode: true,
  linkQrCode: "https://jer-atletismo.vercel.app/publico",
  somenteHoje: false,
  somenteFinais: false,
  filtroCategoria: "",
  filtroNaipe: "",
  tema: "escuro",
  tamanhoFonte: "normal",
  layout: "resultados_medalhas",
};

const SELECT_RESULTADOS = [
  "id",
  "colocacao",
  "tempo",
  "melhor_marca",
  "resultado_final",
  "data_resultado",
  "serie_id",
  "publicado",
  "provas (nome, categoria, naipe, fase)",
  "inscricoes (atletas (numero, nome, municipio, escolas (nome)))",
].join(",");

const SELECT_MEDALHAS = [
  "id",
  "colocacao",
  "data_resultado",
  "publicado",
  "tempo",
  "melhor_marca",
  "resultado_final",
  "provas (nome, categoria, naipe, fase)",
  "inscricoes (atletas (nome, escolas (nome)))",
].join(",");

export default function Tv() {
  const [resultados, setResultados] = useState([]);
  const [medalhas, setMedalhas] = useState([]);
  const [medalhasRecentes, setMedalhasRecentes] = useState([]);
  const [hora, setHora] = useState("");
  const [status, setStatus] = useState("Atualizacao automatica");
  const [config, setConfig] = useState(CONFIG_PADRAO);

  const atualizarHora = useCallback(() => {
    setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  }, []);

  const carregarConfig = useCallback(async () => {
    const { data, error } = await supabase.from("tv_config").select("valor").eq("chave", "principal").maybeSingle();
    if (!error && data?.valor) setConfig({ ...CONFIG_PADRAO, ...data.valor });
  }, []);

  const aplicarFiltros = useCallback((lista) => {
    const hoje = new Date().toISOString().slice(0, 10);
    return (lista || []).filter((r) => {
      const prova = r.provas || {};
      if (config.somenteHoje && r.data_resultado !== hoje) return false;
      if (config.somenteFinais && !String(prova.fase || "").includes("FINAL")) return false;
      if (config.filtroCategoria && prova.categoria !== config.filtroCategoria) return false;
      if (config.filtroNaipe && prova.naipe !== config.filtroNaipe) return false;
      return true;
    });
  }, [config.somenteHoje, config.somenteFinais, config.filtroCategoria, config.filtroNaipe]);

  const carregarResultados = useCallback(async () => {
    setStatus("Atualizando resultados");
    const limite = Number(config.limiteResultados) || 24;
    const { data, error } = await supabase
      .from("resultados")
      .select(SELECT_RESULTADOS)
      .eq("publicado", true)
      .order("data_resultado", { ascending: false })
      .order("id", { ascending: false })
      .limit(limite);

    if (error) {
      setStatus("Erro ao carregar resultados");
      return;
    }

    const lista = aplicarFiltros(data || []);
    const idsSeries = [...new Set(lista.map((r) => r.serie_id).filter(Boolean))];
    const mapaSeries = {};

    if (idsSeries.length > 0) {
      const { data: seriesData } = await supabase.from("series").select("id, numero_serie").in("id", idsSeries);
      (seriesData || []).forEach((serie) => {
        mapaSeries[serie.id] = serie.numero_serie;
      });
    }

    setResultados(lista.map((r) => ({ ...r, numero_serie_tv: mapaSeries[r.serie_id] || null })));
    setStatus("Atualizacao automatica");
  }, [config.limiteResultados, aplicarFiltros]);

  const carregarMedalhas = useCallback(async () => {
    const limite = Number(config.limiteMedalhas) || 6;
    const { data, error } = await supabase.from("resultados").select(SELECT_MEDALHAS).eq("publicado", true).in("colocacao", [1, 2, 3]);
    if (error) return;
    const mapa = {};
    const lista = aplicarFiltros(data || []);
    lista.forEach((r) => {
      const fase = r.provas?.fase || "";
      if (!["FINAL", "FINAL POR TEMPO"].includes(fase)) return;
      const escola = r.inscricoes?.atletas?.escolas?.nome || "SEM ESCOLA";
      mapa[escola] ||= { escola, ouro: 0, prata: 0, bronze: 0, total: 0 };
      if (Number(r.colocacao) === 1) mapa[escola].ouro += 1;
      if (Number(r.colocacao) === 2) mapa[escola].prata += 1;
      if (Number(r.colocacao) === 3) mapa[escola].bronze += 1;
      mapa[escola].total += 1;
    });
    setMedalhas(Object.values(mapa).sort((a, b) => b.ouro - a.ouro || b.prata - a.prata || b.bronze - a.bronze || a.escola.localeCompare(b.escola)).slice(0, limite));
    setMedalhasRecentes(lista
      .filter((r) => [1, 2, 3].includes(Number(r.colocacao)) && ["FINAL", "FINAL POR TEMPO"].includes(r.provas?.fase || ""))
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
      .slice(0, Number(config.limiteUltimasMedalhas) || 5));
  }, [config.limiteMedalhas, config.limiteUltimasMedalhas, aplicarFiltros]);

  const carregarTudo = useCallback(async () => {
    await carregarConfig();
    await carregarResultados();
    await carregarMedalhas();
  }, [carregarConfig, carregarResultados, carregarMedalhas]);

  useEffect(() => {
    const idCarga = window.setTimeout(() => {
      void carregarTudo();
    }, 0);
    const idHoraInicial = window.setTimeout(() => {
      atualizarHora();
    }, 0);
    const timerDados = window.setInterval(() => void carregarTudo(), Number(config.tempoAtualizacao) || 8000);
    const timerHora = window.setInterval(atualizarHora, 1000);
    return () => {
      window.clearTimeout(idCarga);
      window.clearTimeout(idHoraInicial);
      window.clearInterval(timerDados);
      window.clearInterval(timerHora);
    };
  }, [config.tempoAtualizacao, carregarTudo, atualizarHora]);

  function resultadoFinal(r) {
    return r.tempo || r.melhor_marca || r.resultado_final || "-";
  }

  function classePosicao(pos) {
    const n = Number(pos);
    if (n === 1) return "ouro";
    if (n === 2) return "prata";
    if (n === 3) return "bronze";
    return "normal";
  }

  const agruparPorSerie = useCallback((lista) => {
    const mapa = {};
    lista.forEach((r) => {
      const prova = r.provas || {};
      const serie = r.numero_serie_tv || "GERAL";
      const chave = [prova.nome || "SEM PROVA", prova.categoria || "", prova.naipe || "", prova.fase || "QUALIFICACAO", serie].join("|");
      mapa[chave] ||= {
        prova: prova.nome || "SEM PROVA",
        categoria: prova.categoria || "",
        naipe: prova.naipe || "",
        fase: prova.fase || "QUALIFICACAO",
        serie,
        data: r.data_resultado,
        resultados: [],
      };
      mapa[chave].resultados.push(r);
    });
    return Object.values(mapa).slice(0, Number(config.limiteSeries) || 4);
  }, [config.limiteSeries]);

  const grupos = useMemo(() => agruparPorSerie(resultados), [resultados, agruparPorSerie]);
  const totaisMedalhas = useMemo(() => medalhas.reduce((acc, item) => ({
    ouro: acc.ouro + item.ouro,
    prata: acc.prata + item.prata,
    bronze: acc.bronze + item.bronze,
    total: acc.total + item.total,
  }), { ouro: 0, prata: 0, bronze: 0, total: 0 }), [medalhas]);
  const avisos = [config.aviso1, config.aviso2, config.aviso3].filter(Boolean);
  const mostrarLateral = config.layout !== "resultados" && (config.mostrarMedalhas || config.mostrarUltimasMedalhas || config.mostrarAvisos);
  const classePagina = "entrance-tv tema-" + (config.tema || "escuro") + " fonte-" + (config.tamanhoFonte || "normal") + " layout-" + (config.layout || "resultados_medalhas");
  const linkQr = config.linkQrCode || "https://jer-atletismo.vercel.app/publico";
  const qrSrc = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=" + encodeURIComponent(linkQr);

  return (
    <div className={classePagina}>
      <style>{css}</style>
      <header className="tv-header">
        <div className="brand">
          {config.mostrarLogos && <img src="/logo-jer.png" alt="JER" />}
          {config.mostrarLogos && <img src="/logo-idjuv.png" alt="IDJUV" />}
          <div>
            <h1>{config.titulo}</h1>
            <p>{config.subtitulo}</p>
          </div>
        </div>
        {config.mostrarRelogio && <div className="clock"><strong>{hora}</strong><span>{status}</span></div>}
      </header>

      <main className={mostrarLateral ? "tv-grid" : "tv-grid full"}>
        {config.mostrarResultados && <section className="results-panel">
          <div className="panel-title"><h2>Resultados por serie</h2><span>{resultados.length} publicados</span></div>
          {grupos.length === 0 ? (
            <div className="empty">Aguardando resultados publicados</div>
          ) : (
            <div className="series-grid">
              {grupos.map((grupo) => (
                <article key={[grupo.prova, grupo.categoria, grupo.naipe, grupo.fase, grupo.serie].join("|")} className="serie-card">
                  <header>
                    <span>{grupo.serie === "GERAL" ? "Classificacao geral" : "Serie " + grupo.serie}</span>
                    <h3>{grupo.prova}</h3>
                    <p>{grupo.categoria} | {grupo.naipe} | {grupo.fase}</p>
                  </header>
                  <div className="serie-table">
                    {grupo.resultados
                      .sort((a, b) => Number(a.colocacao || 9999) - Number(b.colocacao || 9999))
                      .slice(0, Number(config.atletasPorSerie) || 8)
                      .map((r) => {
                        const atleta = r.inscricoes?.atletas;
                        return (
                          <div key={r.id} className="athlete-row">
                            <span className={"place " + classePosicao(r.colocacao)}>{r.colocacao ? r.colocacao + "o" : "-"}</span>
                            <div><strong>{atleta?.nome || "Atleta"}</strong><small>{atleta?.escolas?.nome || "Sem escola"}</small></div>
                            <b>{resultadoFinal(r)}</b>
                          </div>
                        );
                      })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>}

        {mostrarLateral && <aside className="side">
          {config.mostrarMedalhas && <section className="panel medals">
            <div className="panel-title small"><h2>Medalhas</h2><span>Top {medalhas.length}</span></div>
            <div className="medal-summary">
              <div><strong>{totaisMedalhas.ouro}</strong><span>Ouro</span></div>
              <div><strong>{totaisMedalhas.prata}</strong><span>Prata</span></div>
              <div><strong>{totaisMedalhas.bronze}</strong><span>Bronze</span></div>
              <div><strong>{totaisMedalhas.total}</strong><span>Total</span></div>
            </div>
            {medalhas.length === 0 ? (
              <div className="empty small-empty">Aguardando finais</div>
            ) : (
              medalhas.map((m, i) => (
                <div key={m.escola} className="medal-line">
                  <span>{i + 1}o</span>
                  <strong>{m.escola}</strong>
                  <small>O {m.ouro} | P {m.prata} | B {m.bronze} | Total {m.total}</small>
                </div>
              ))
            )}
            {config.mostrarUltimasMedalhas && medalhasRecentes.length > 0 && (
              <div className="recent-medals">
                <h3>Ultimas medalhas</h3>
                {medalhasRecentes.map((r) => {
                  const atleta = r.inscricoes?.atletas;
                  return (
                    <div key={r.id} className="recent-medal">
                      <span className={"place " + classePosicao(r.colocacao)}>{r.colocacao}o</span>
                      <div><strong>{atleta?.nome || "Atleta"}</strong><small>{r.provas?.nome} | {atleta?.escolas?.nome || "Sem escola"}</small></div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>}

          {!config.mostrarMedalhas && config.mostrarUltimasMedalhas && medalhasRecentes.length > 0 && <section className="panel recent-medals-only">
            <div className="panel-title small"><h2>Ultimas medalhas</h2><span>Ao vivo</span></div>
            {medalhasRecentes.map((r) => {
              const atleta = r.inscricoes?.atletas;
              return (
                <div key={r.id} className="recent-medal">
                  <span className={"place " + classePosicao(r.colocacao)}>{r.colocacao}o</span>
                  <div><strong>{atleta?.nome || "Atleta"}</strong><small>{r.provas?.nome} | {atleta?.escolas?.nome || "Sem escola"}</small></div>
                </div>
              );
            })}
          </section>}

          {config.mostrarAvisos && <section className="panel notices compact-notices">
            <div className="panel-title small"><h2>Avisos</h2><span>Info</span></div>
            {avisos.length === 0 ? <div className="empty small-empty">Sem avisos</div> : avisos.map((aviso, i) => <div key={i}>{aviso}</div>)}
          </section>}
        </aside>}
      </main>
      {config.mostrarRodape && <footer className={config.mostrarQrCode ? "with-qr" : ""}>
        <div>
          <strong>{config.rodape}</strong>
          {config.mostrarQrCode && <span>{linkQr}</span>}
        </div>
        {config.mostrarQrCode && <img src={qrSrc} alt="QR Code da pagina publica" />}
      </footer>}
    </div>
  );
}

const css = [
  ".entrance-tv { min-height: 100vh; background: #07111f; color: white; padding: 20px 22px; font-family: Inter, Arial, sans-serif; overflow: hidden; }",
  ".tv-header { height: 104px; display: flex; align-items: center; justify-content: space-between; gap: 22px; margin-bottom: 16px; }",
  ".brand { display: flex; align-items: center; gap: 14px; min-width: 0; }",
  ".brand img { width: 92px; height: 66px; object-fit: contain; background: white; border-radius: 12px; padding: 6px; }",
  ".brand h1 { margin: 0; font-size: 34px; line-height: 1; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".brand p { margin: 7px 0 0; color: #86efac; font-weight: 900; font-size: 15px; }",
  ".clock { background: #0f766e; border-radius: 18px; padding: 12px 18px; text-align: right; min-width: 150px; }",
  ".clock strong { display: block; font-size: 35px; line-height: 1; } .clock span { display: block; margin-top: 5px; color: #d1fae5; font-size: 11px; font-weight: 900; text-transform: uppercase; }",
  ".tv-grid { height: calc(100vh - 216px); display: grid; grid-template-columns: minmax(0, 2.1fr) minmax(350px, .9fr); gap: 16px; }",
  ".tv-grid.full { grid-template-columns: 1fr; } .layout-resultados .tv-grid { grid-template-columns: 1fr; }",
  ".results-panel, .panel { background: #0f172a; border: 1px solid #1e3a5f; border-radius: 20px; padding: 16px; overflow: hidden; }",
  ".tema-claro { background: #eef5fb; color: #0f172a; } .tema-claro .results-panel, .tema-claro .panel { background: #ffffff; border-color: #cbd5e1; color: #0f172a; } .tema-claro .serie-card, .tema-claro .athlete-row, .tema-claro .empty, .tema-claro .medal-summary div, .tema-claro .medal-line { background: #f8fafc; border-color: #cbd5e1; } .tema-claro .brand h1, .tema-claro .serie-card h3 { color: #003b73; } .tema-claro .brand p, .tema-claro .panel-title h2, .tema-claro .recent-medals h3 { color: #0f766e; } .tema-claro footer, .tema-claro .serie-card p, .tema-claro .athlete-row small, .tema-claro .recent-medal small { color: #334155; }",
  ".side { display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 16px; min-height: 0; }",
  ".panel-title { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }",
  ".panel-title h2 { margin: 0; color: #86efac; font-size: 27px; } .panel-title span { color: #bfdbfe; font-weight: 900; font-size: 13px; } .panel-title.small h2 { font-size: 22px; }",
  ".series-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; height: calc(100% - 48px); overflow: hidden; }",
  ".serie-card { min-height: 0; background: #07111f; border: 1px solid #243b5a; border-radius: 17px; padding: 12px; display: flex; flex-direction: column; }",
  ".serie-card header { border-bottom: 1px solid #243b5a; padding-bottom: 8px; margin-bottom: 8px; } .serie-card header span { display: inline-flex; background: #0f766e; color: white; border-radius: 999px; padding: 4px 9px; font-weight: 900; font-size: 12px; }",
  ".serie-card h3 { margin: 7px 0 3px; font-size: 20px; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .serie-card p { margin: 0; color: #bfdbfe; font-weight: 800; font-size: 13px; }",
  ".serie-table { display: grid; gap: 6px; min-height: 0; overflow: hidden; }",
  ".athlete-row { display: grid; grid-template-columns: 42px minmax(0, 1fr) 82px; align-items: center; gap: 8px; background: #0b1526; border: 1px solid #1f3655; border-radius: 12px; padding: 6px 8px; }",
  ".athlete-row strong { display: block; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .athlete-row small { display: block; margin-top: 2px; color: #cbd5e1; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .athlete-row b { color: #86efac; text-align: right; font-size: 17px; }",
  ".fonte-grande .brand h1 { font-size: 40px; } .fonte-grande .panel-title h2 { font-size: 31px; } .fonte-grande .serie-card h3 { font-size: 23px; } .fonte-grande .athlete-row strong { font-size: 16px; } .fonte-grande .athlete-row small { font-size: 12px; }",
  ".place { width: 35px; height: 31px; border-radius: 10px; display: grid; place-items: center; background: #334155; font-weight: 900; font-size: 13px; } .place.ouro { background: #facc15; color: #422006; } .place.prata { background: #cbd5e1; color: #0f172a; } .place.bronze { background: #fdba74; color: #431407; }",
  ".medal-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 10px; } .medal-summary div { background: #07111f; border: 1px solid #243b5a; border-radius: 12px; padding: 8px 6px; text-align: center; } .medal-summary strong { display: block; font-size: 20px; color: #86efac; } .medal-summary span { color: #bfdbfe; font-size: 11px; font-weight: 900; text-transform: uppercase; }",
  ".medal-line { background: #07111f; border: 1px solid #243b5a; border-radius: 14px; padding: 9px; margin-bottom: 7px; display: grid; grid-template-columns: 35px 1fr; gap: 9px; } .medal-line span { background: #0f766e; border-radius: 10px; display: grid; place-items: center; font-weight: 900; } .medal-line strong { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .medal-line small { grid-column: 2; color: #bfdbfe; font-weight: 900; }",
  ".recent-medals { margin-top: 10px; padding-top: 9px; border-top: 1px solid #243b5a; } .recent-medals h3 { margin: 0 0 8px; color: #86efac; font-size: 16px; } .recent-medal { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 8px; align-items: center; margin-bottom: 7px; } .recent-medal strong { display: block; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .recent-medal small { display: block; color: #bfdbfe; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".notices div { background: #0f766e; border-radius: 12px; padding: 11px 12px; margin-bottom: 8px; font-size: 15px; font-weight: 900; } .compact-notices div { padding: 9px 10px; font-size: 13px; }",
  ".empty { background: #07111f; border: 1px solid #243b5a; border-radius: 16px; padding: 22px; color: #cbd5e1; font-size: 21px; font-weight: 800; } .small-empty { font-size: 16px; }",
  "footer { min-height: 70px; display: flex; align-items: center; justify-content: center; gap: 18px; color: #bfdbfe; font-weight: 800; font-size: 13px; text-align: center; border-top: 1px solid #0f766e; margin-top: 12px; padding-top: 10px; } footer div { display: grid; gap: 5px; } footer strong { color: #dbeafe; } footer span { color: #86efac; font-size: 12px; } footer img { width: 66px; height: 66px; object-fit: contain; background: white; border-radius: 10px; padding: 5px; } footer:not(.with-qr) { min-height: 40px; } .tema-claro footer strong { color: #003b73; }",
  "@media (max-width: 1100px) { .entrance-tv { overflow: auto; } .tv-header { height: auto; align-items: flex-start; } .tv-grid { height: auto; grid-template-columns: 1fr; } .series-grid { height: auto; grid-template-columns: 1fr; } .brand h1 { font-size: 28px; white-space: normal; } }",
  "@media (max-width: 560px) { .entrance-tv { padding: 12px; } .tv-header { flex-direction: column; gap: 12px; margin-bottom: 12px; } .brand { width: 100%; gap: 8px; align-items: flex-start; } .brand img { width: 62px; height: 48px; border-radius: 9px; padding: 4px; } .brand h1 { font-size: 21px; line-height: 1.1; } .brand p { font-size: 12px; line-height: 1.2; } .clock { width: 100%; min-width: 0; text-align: center; border-radius: 12px; } .clock strong { font-size: 28px; } .results-panel, .panel { border-radius: 14px; padding: 12px; } .panel-title { align-items: flex-start; flex-direction: column; gap: 4px; } .panel-title h2 { font-size: 22px; } .serie-card h3 { font-size: 17px; white-space: normal; } .athlete-row { grid-template-columns: 36px minmax(0, 1fr) 64px; gap: 6px; padding: 6px; } .athlete-row b { font-size: 14px; } footer { flex-direction: column; gap: 8px; min-height: auto; } footer img { width: 76px; height: 76px; } }",
].join("\n");