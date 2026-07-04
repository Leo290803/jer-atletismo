import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const SELECT_MEDALHAS = [
  "colocacao",
  "publicado",
  "provas (fase)",
  "inscricoes (atletas (municipio, escolas (nome)))",
].join(",");

export default function MedalhasPublico() {
  const [linhasEscola, setLinhasEscola] = useState([]);
  const [linhasMunicipio, setLinhasMunicipio] = useState([]);
  const [modo, setModo] = useState("escola");
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState("");

  function montarRanking(lista, tipo) {
    const mapa = {};
    lista.forEach((r) => {
      const fase = r.provas?.fase || "";
      if (!["FINAL", "FINAL POR TEMPO"].includes(fase)) return;

      const atleta = r.inscricoes?.atletas;
      const escola = atleta?.escolas?.nome || "SEM ESCOLA";
      const municipio = atleta?.municipio || "SEM MUNICIPIO";
      const nome = tipo === "municipio" ? municipio : escola;
      const detalhe = tipo === "municipio" ? "Municipio" : municipio;

      if (!mapa[nome]) {
        mapa[nome] = { nome, detalhe, ouro: 0, prata: 0, bronze: 0, total: 0 };
      }

      if (Number(r.colocacao) === 1) mapa[nome].ouro += 1;
      if (Number(r.colocacao) === 2) mapa[nome].prata += 1;
      if (Number(r.colocacao) === 3) mapa[nome].bronze += 1;
      mapa[nome].total += 1;
    });

    return Object.values(mapa).sort((a, b) => {
      if (b.ouro !== a.ouro) return b.ouro - a.ouro;
      if (b.prata !== a.prata) return b.prata - a.prata;
      if (b.bronze !== a.bronze) return b.bronze - a.bronze;
      return a.nome.localeCompare(b.nome);
    });
  }

  const carregarMedalhas = useCallback(async () => {
    setMensagem("Carregando quadro de medalhas...");
    const { data, error } = await supabase
      .from("resultados")
      .select(SELECT_MEDALHAS)
      .eq("publicado", true)
      .in("colocacao", [1, 2, 3]);

    if (error) {
      setMensagem("Erro ao carregar medalhas: " + error.message);
      return;
    }

    setLinhasEscola(montarRanking(data || [], "escola"));
    setLinhasMunicipio(montarRanking(data || [], "municipio"));
    setMensagem("");
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void carregarMedalhas();
    }, 0);

    return () => window.clearTimeout(id);
  }, [carregarMedalhas]);

  const linhasAtivas = modo === "municipio" ? linhasMunicipio : linhasEscola;
  const linhas = linhasAtivas.filter((linha) => (linha.nome + " " + linha.detalhe).toLowerCase().includes(busca.toLowerCase()));
  const totais = useMemo(() => linhasAtivas.reduce((acc, linha) => ({
    ouro: acc.ouro + linha.ouro,
    prata: acc.prata + linha.prata,
    bronze: acc.bronze + linha.bronze,
    total: acc.total + linha.total,
  }), { ouro: 0, prata: 0, bronze: 0, total: 0 }), [linhasAtivas]);

  return (
    <div className="medal-page">
      <style>{css}</style>
      <header className="medal-hero">
        <div className="hero-logos">
          <img src="/logo-jer.png" alt="Jogos Escolares de Roraima" />
          <img src="/logo-idjuv.png" alt="IDJUV" />
        </div>
        <div>
          <p className="eyebrow">Quadro oficial</p>
          <h1>Medalhas - Atletismo</h1>
          <p>Ranking atualizado com resultados finais publicados.</p>
        </div>
      </header>

      <section className="summary-grid">
        <div className="gold"><span>{totais.ouro}</span><strong>Ouro</strong></div>
        <div className="silver"><span>{totais.prata}</span><strong>Prata</strong></div>
        <div className="bronze"><span>{totais.bronze}</span><strong>Bronze</strong></div>
        <div><span>{totais.total}</span><strong>Total</strong></div>
      </section>

      <section className="toolbar">
        <div className="segmented">
          <button type="button" className={modo === "escola" ? "active" : ""} onClick={() => setModo("escola")}>Por escola</button>
          <button type="button" className={modo === "municipio" ? "active" : ""} onClick={() => setModo("municipio")}>Por municipio</button>
        </div>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar escola ou municipio" />
        <button type="button" className="refresh" onClick={carregarMedalhas}>Atualizar</button>
      </section>

      {mensagem && <p className="message">{mensagem}</p>}

      <main className="ranking-card">
        {linhas.length === 0 ? (
          <div className="empty">Nenhuma medalha publicada ate o momento.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Pos.</th><th>{modo === "municipio" ? "Municipio" : "Escola"}</th><th>Detalhe</th><th>Ouro</th><th>Prata</th><th>Bronze</th><th>Total</th></tr></thead>
              <tbody>
                {linhas.map((linha, index) => (
                  <tr key={linha.nome}>
                    <td><span className="rank">{index + 1}o</span></td>
                    <td><strong>{linha.nome}</strong></td>
                    <td>{linha.detalhe}</td>
                    <td><span className="medal gold">{linha.ouro}</span></td>
                    <td><span className="medal silver">{linha.prata}</span></td>
                    <td><span className="medal bronze">{linha.bronze}</span></td>
                    <td><strong>{linha.total}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

const css = [
  ".medal-page { min-height: 100vh; background: #f1f5f9; color: #0f172a; padding: 22px; font-family: Inter, Arial, sans-serif; }",
  ".medal-hero { max-width: 1180px; margin: 0 auto 18px; padding: 24px; border-radius: 18px; background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 56%, #ecfdf5 100%); border: 1px solid #dbeafe; display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center; box-shadow: 0 14px 34px rgba(15, 23, 42, .08); }",
  ".hero-logos { display: flex; gap: 18px; align-items: center; }",
  ".hero-logos img { width: 118px; height: 82px; object-fit: contain; }",
  ".eyebrow { margin: 0 0 6px; color: #047857; font-weight: 900; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; }",
  ".medal-hero h1 { margin: 0; font-size: 34px; color: #003b73; line-height: 1.1; }",
  ".medal-hero p:last-child { margin: 8px 0 0; color: #475569; font-weight: 600; }",
  ".summary-grid { max-width: 1180px; margin: 0 auto 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }",
  ".summary-grid div { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; display: flex; align-items: baseline; justify-content: space-between; }",
  ".summary-grid span { font-size: 32px; font-weight: 900; color: #0f766e; }",
  ".summary-grid strong { color: #475569; }",
  ".summary-grid .gold span { color: #b45309; } .summary-grid .silver span { color: #64748b; } .summary-grid .bronze span { color: #c2410c; }",
  ".toolbar, .ranking-card, .message { max-width: 1180px; margin: 0 auto 16px; }",
  ".toolbar { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; box-shadow: 0 10px 28px rgba(15, 23, 42, .06); }",
  ".segmented { display: inline-flex; padding: 4px; border-radius: 12px; background: #e2e8f0; gap: 4px; }",
  "button { min-height: 40px; border: 0; border-radius: 10px; padding: 0 14px; background: transparent; color: #334155; font-weight: 900; cursor: pointer; }",
  "button.active, .refresh { background: #0f766e; color: white; }",
  "input { min-height: 42px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 12px; font: inherit; }",
  ".message { color: #0369a1; font-weight: 800; }",
  ".ranking-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 10px 28px rgba(15, 23, 42, .06); }",
  ".table-wrap { overflow-x: auto; border: 1px solid #dbe3ee; border-radius: 12px; }",
  "table { width: 100%; border-collapse: collapse; min-width: 760px; }",
  "th { background: #e5edf7; color: #0f172a; text-align: left; font-size: 12px; text-transform: uppercase; }",
  "th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; }",
  "tbody tr:nth-child(even) { background: #f8fafc; }",
  ".rank { display: inline-flex; min-width: 36px; height: 28px; border-radius: 999px; align-items: center; justify-content: center; background: #003b73; color: white; font-weight: 900; }",
  ".medal { display: inline-flex; min-width: 34px; height: 28px; border-radius: 999px; align-items: center; justify-content: center; font-weight: 900; }",
  ".medal.gold { background: #facc15; color: #422006; } .medal.silver { background: #cbd5e1; color: #0f172a; } .medal.bronze { background: #fdba74; color: #431407; }",
  ".empty { color: #475569; font-weight: 800; padding: 20px; }",
  "@media (max-width: 900px) { .medal-hero { grid-template-columns: 1fr; text-align: center; } .hero-logos { justify-content: center; } .summary-grid { grid-template-columns: repeat(2, 1fr); } .toolbar { grid-template-columns: 1fr; } }",
  "@media (max-width: 640px) { .medal-page { padding: 14px; } .summary-grid { grid-template-columns: 1fr; } .medal-hero h1 { font-size: 27px; } .hero-logos img { width: 96px; height: 68px; } }",
].join("\n");