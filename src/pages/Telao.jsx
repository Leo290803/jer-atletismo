import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const SELECT_TELAO = [
  "id", "colocacao", "tempo", "melhor_marca", "resultado_final", "data_resultado", "publicado",
  "provas (nome, categoria, naipe, fase)",
  "inscricoes (atletas (nome, municipio, escolas (nome)))",
].join(",");

export default function Telao() {
  const [resultados, setResultados] = useState([]);
  const [medalhas, setMedalhas] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [hora, setHora] = useState("");

  const gerarMedalhas = useCallback((lista) => {
    const mapa = {};
    lista.forEach((r) => {
      const fase = r.provas?.fase || "";
      if (!["FINAL", "FINAL POR TEMPO"].includes(fase)) return;
      if (![1, 2, 3].includes(Number(r.colocacao))) return;
      const escola = r.inscricoes?.atletas?.escolas?.nome || "SEM ESCOLA";
      mapa[escola] ||= { escola, ouro: 0, prata: 0, bronze: 0, total: 0 };
      if (Number(r.colocacao) === 1) mapa[escola].ouro += 1;
      if (Number(r.colocacao) === 2) mapa[escola].prata += 1;
      if (Number(r.colocacao) === 3) mapa[escola].bronze += 1;
      mapa[escola].total += 1;
    });
    setMedalhas(Object.values(mapa).sort((a, b) => b.ouro - a.ouro || b.prata - a.prata || b.bronze - a.bronze || a.escola.localeCompare(b.escola)).slice(0, 6));
  }, []);

  const carregarDados = useCallback(async () => {
    setMensagem("Atualizando");
    const { data, error } = await supabase
      .from("resultados")
      .select(SELECT_TELAO)
      .eq("publicado", true)
      .order("data_resultado", { ascending: false })
      .order("id", { ascending: false })
      .limit(60);
    if (error) { setMensagem("Erro ao carregar telao: " + error.message); return; }
    const lista = data || [];
    setResultados(lista.filter((r) => r.tempo || r.melhor_marca || r.resultado_final || r.colocacao).slice(0, 9));
    gerarMedalhas(lista);
    setMensagem("");
  }, [gerarMedalhas]);

  useEffect(() => {
    const atualizarHora = () => setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    const id = window.setTimeout(() => {
      void carregarDados();
    }, 0);
    atualizarHora();
    const dados = window.setInterval(() => void carregarDados(), 15000);
    const relogio = window.setInterval(atualizarHora, 1000);
    return () => {
      window.clearTimeout(id);
      window.clearInterval(dados);
      window.clearInterval(relogio);
    };
  }, [carregarDados]);

  function resultadoFinal(r) { return r.tempo || r.melhor_marca || r.resultado_final || "-"; }
  function classePosicao(pos) { const n = Number(pos); if (n === 1) return "ouro"; if (n === 2) return "prata"; if (n === 3) return "bronze"; return "normal"; }

  return (
    <div className="screen-page">
      <style>{css}</style>
      <header className="screen-header">
        <div className="brand">
          <img src="/logo-jer.png" alt="Jogos Escolares" />
          <img src="/logo-idjuv.png" alt="IDJUV" />
          <div><span>Telão oficial</span><h1>JER 2026 - Atletismo</h1></div>
        </div>
        <div className="status"><strong>{hora}</strong><small>{mensagem || "Atualizacao automatica"}</small></div>
      </header>

      <main className="screen-grid">
        <section className="results-panel">
          <div className="panel-title"><h2>Ultimos resultados</h2><span>Publicados</span></div>
          {resultados.length === 0 ? <div className="empty">Aguardando resultados publicados</div> : resultados.map((r) => {
            const atleta = r.inscricoes?.atletas;
            return (
              <article key={r.id} className="result-row">
                <div className={"position " + classePosicao(r.colocacao)}>{r.colocacao ? r.colocacao + "o" : "-"}</div>
                <div className="result-info">
                  <h3>{atleta?.nome || "Atleta"}</h3>
                  <p>{r.provas?.nome} | {r.provas?.categoria} | {r.provas?.naipe} | {r.provas?.fase || "QUALIFICACAO"}</p>
                  <small>{atleta?.escolas?.nome || "Sem escola"} - {atleta?.municipio || "-"}</small>
                </div>
                <strong className="mark">{resultadoFinal(r)}</strong>
              </article>
            );
          })}
        </section>

        <aside className="side-panel">
          <section className="medals-panel">
            <div className="panel-title small"><h2>Medalhas</h2><span>Top 6</span></div>
            {medalhas.length === 0 ? <div className="empty small-empty">Aguardando finais</div> : medalhas.map((m, index) => (
              <div key={m.escola} className="medal-row">
                <span className="rank">{index + 1}o</span>
                <strong>{m.escola}</strong>
                <div><span className="gold">O {m.ouro}</span><span className="silver">P {m.prata}</span><span className="bronze">B {m.bronze}</span></div>
              </div>
            ))}
          </section>
          <section className="links-panel">
            <h2>Acesso publico</h2>
            <div>/publico</div><div>/publico/medalhas</div>
          </section>
        </aside>
      </main>
    </div>
  );
}

const css = [
  ".screen-page { min-height: 100vh; background: #07111f; color: white; padding: 24px; font-family: Inter, Arial, sans-serif; overflow: hidden; }",
  ".screen-header { height: 116px; display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 20px; }",
  ".brand { display: flex; align-items: center; gap: 18px; min-width: 0; }",
  ".brand img { width: 112px; height: 80px; object-fit: contain; background: white; border-radius: 12px; padding: 7px; }",
  ".brand span { color: #86efac; text-transform: uppercase; font-weight: 900; letter-spacing: .08em; }",
  ".brand h1 { margin: 4px 0 0; font-size: 38px; line-height: 1; color: #ffffff; }",
  ".status { min-width: 210px; background: #0f766e; color: white; border-radius: 18px; padding: 14px 18px; text-align: right; }",
  ".status strong { display: block; font-size: 36px; line-height: 1; } .status small { display: block; margin-top: 6px; font-weight: 800; color: #d1fae5; }",
  ".screen-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(360px, 1fr); gap: 20px; height: calc(100vh - 136px); }",
  ".results-panel, .medals-panel, .links-panel { background: #0f172a; border: 1px solid #1e3a5f; border-radius: 22px; padding: 20px; overflow: hidden; }",
  ".results-panel { min-height: 0; } .side-panel { display: grid; grid-template-rows: 1fr auto; gap: 20px; min-height: 0; }",
  ".panel-title { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; } .panel-title h2 { margin: 0; color: #86efac; font-size: 30px; } .panel-title span { color: #93c5fd; font-weight: 900; }",
  ".panel-title.small h2 { font-size: 25px; }",
  ".result-row { display: grid; grid-template-columns: 64px minmax(0, 1fr) 150px; gap: 14px; align-items: center; background: #07111f; border: 1px solid #243b5a; border-radius: 17px; padding: 12px; margin-bottom: 10px; }",
  ".position { width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center; background: #334155; font-size: 20px; font-weight: 900; }",
  ".position.ouro { background: #facc15; color: #422006; } .position.prata { background: #cbd5e1; color: #0f172a; } .position.bronze { background: #fdba74; color: #431407; }",
  ".result-info { min-width: 0; } .result-info h3 { margin: 0; font-size: 22px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .result-info p { margin: 6px 0 0; color: #bfdbfe; font-weight: 800; } .result-info small { display: block; margin-top: 4px; color: #cbd5e1; }",
  ".mark { color: #86efac; font-size: 30px; text-align: right; }",
  ".medal-row { background: #07111f; border: 1px solid #243b5a; border-radius: 16px; padding: 12px; margin-bottom: 10px; display: grid; grid-template-columns: 44px 1fr; gap: 10px; }",
  ".rank { width: 38px; height: 38px; border-radius: 12px; background: #0f766e; display: grid; place-items: center; font-weight: 900; } .medal-row strong { min-width: 0; } .medal-row div { grid-column: 2; display: flex; gap: 8px; font-weight: 900; }",
  ".gold { color: #fde68a; } .silver { color: #e2e8f0; } .bronze { color: #fed7aa; }",
  ".links-panel h2 { margin: 0 0 12px; color: #86efac; } .links-panel div { background: #07111f; border: 1px solid #243b5a; border-radius: 12px; padding: 12px; margin-top: 8px; font-weight: 900; color: #bfdbfe; }",
  ".empty { background: #07111f; border: 1px solid #243b5a; border-radius: 16px; padding: 24px; color: #cbd5e1; font-size: 22px; font-weight: 800; } .small-empty { font-size: 18px; }",
  "@media (max-width: 1000px) { .screen-page { overflow: auto; } .screen-header { height: auto; align-items: flex-start; } .screen-grid { height: auto; grid-template-columns: 1fr; } .side-panel { grid-template-rows: auto; } .brand h1 { font-size: 30px; } }",
].join("\n");