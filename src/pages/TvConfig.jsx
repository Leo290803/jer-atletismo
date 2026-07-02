import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const PADRAO = {
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

export default function TvConfig() {
  const [config, setConfig] = useState(PADRAO);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => { void carregarConfig(); }, []);

  async function carregarConfig() {
    setMensagem("Carregando configuracoes da TV...");
    const { data, error } = await supabase.from("tv_config").select("*").eq("chave", "principal").maybeSingle();
    if (error) { setMensagem("Erro ao carregar: " + error.message); return; }
    if (data?.valor) setConfig({ ...PADRAO, ...data.valor });
    setMensagem("");
  }

  function alterar(campo, valor) {
    setConfig((old) => ({ ...old, [campo]: valor }));
  }

  async function salvar() {
    setMensagem("Salvando configuracoes...");
    const payload = {
      chave: "principal",
      valor: {
        ...config,
        tempoAtualizacao: Number(config.tempoAtualizacao) || 8000,
        limiteResultados: Number(config.limiteResultados) || 24,
        limiteMedalhas: Number(config.limiteMedalhas) || 6,
        limiteSeries: Number(config.limiteSeries) || 4,
        atletasPorSerie: Number(config.atletasPorSerie) || 8,
        limiteUltimasMedalhas: Number(config.limiteUltimasMedalhas) || 5,
      },
      atualizado_em: new Date().toISOString(),
    };
    const { error } = await supabase.from("tv_config").upsert(payload, { onConflict: "chave" });
    if (error) { setMensagem("Erro ao salvar: " + error.message); return; }
    setMensagem("Configuracoes da TV salvas com sucesso. A TV atualiza sozinha em alguns segundos.");
  }

  return (
    <div className="tv-config-page">
      <style>{css}</style>
      <header className="page-head">
        <div><p>TV Entrada</p><h1>Controle da TV</h1><span>Escolha o que aparece na tela. A TV continua sem botoes e sem configuracao visivel.</span></div>
        <a href="/tv" target="_blank" rel="noreferrer">Abrir TV</a>
      </header>

      <section className="config-grid">
        <div className="card wide">
          <h2>Textos principais</h2>
          <Campo label="Titulo" value={config.titulo} onChange={(v) => alterar("titulo", v)} />
          <Campo label="Subtitulo" value={config.subtitulo} onChange={(v) => alterar("subtitulo", v)} />
          <Campo label="Rodape" value={config.rodape} onChange={(v) => alterar("rodape", v)} />
          <Campo label="Link do QR Code" value={config.linkQrCode} onChange={(v) => alterar("linkQrCode", v)} />
        </div>

        <div className="card">
          <h2>Mostrar na TV</h2>
          <div className="checks">
            <CampoCheck label="Logos no topo" checked={config.mostrarLogos} onChange={(v) => alterar("mostrarLogos", v)} />
            <CampoCheck label="Relogio" checked={config.mostrarRelogio} onChange={(v) => alterar("mostrarRelogio", v)} />
            <CampoCheck label="Resultados por serie" checked={config.mostrarResultados} onChange={(v) => alterar("mostrarResultados", v)} />
            <CampoCheck label="Quadro de medalhas" checked={config.mostrarMedalhas} onChange={(v) => alterar("mostrarMedalhas", v)} />
            <CampoCheck label="Ultimas medalhas" checked={config.mostrarUltimasMedalhas} onChange={(v) => alterar("mostrarUltimasMedalhas", v)} />
            <CampoCheck label="Avisos" checked={config.mostrarAvisos} onChange={(v) => alterar("mostrarAvisos", v)} />
            <CampoCheck label="Rodape" checked={config.mostrarRodape} onChange={(v) => alterar("mostrarRodape", v)} />
            <CampoCheck label="QR Code no rodape" checked={config.mostrarQrCode} onChange={(v) => alterar("mostrarQrCode", v)} />
          </div>
        </div>

        <div className="card">
          <h2>Avisos da TV</h2>
          <Campo label="Aviso 1" value={config.aviso1} onChange={(v) => alterar("aviso1", v)} />
          <Campo label="Aviso 2" value={config.aviso2} onChange={(v) => alterar("aviso2", v)} />
          <Campo label="Aviso 3" value={config.aviso3} onChange={(v) => alterar("aviso3", v)} />
        </div>

        <div className="card">
          <h2>Filtros da TV</h2>
          <div className="checks top-checks">
            <CampoCheck label="Mostrar somente hoje" checked={config.somenteHoje} onChange={(v) => alterar("somenteHoje", v)} />
            <CampoCheck label="Mostrar somente finais" checked={config.somenteFinais} onChange={(v) => alterar("somenteFinais", v)} />
          </div>
          <CampoSelect label="Categoria" value={config.filtroCategoria} onChange={(v) => alterar("filtroCategoria", v)} options={[['', 'Todas'], ['12 a 14 anos', '12 a 14 anos'], ['15 a 17 anos', '15 a 17 anos']]} />
          <CampoSelect label="Naipe" value={config.filtroNaipe} onChange={(v) => alterar("filtroNaipe", v)} options={[['', 'Todos'], ['Feminino', 'Feminino'], ['Masculino', 'Masculino'], ['Misto', 'Misto']]} />
        </div>

        <div className="card">
          <h2>Visual</h2>
          <CampoSelect label="Tema" value={config.tema} onChange={(v) => alterar("tema", v)} options={[["escuro", "Escuro"], ["claro", "Claro"]]} />
          <CampoSelect label="Tamanho da letra" value={config.tamanhoFonte} onChange={(v) => alterar("tamanhoFonte", v)} options={[["normal", "Normal"], ["grande", "Grande"]]} />
          <CampoSelect label="Formato" value={config.layout} onChange={(v) => alterar("layout", v)} options={[["resultados_medalhas", "Resultados + medalhas"], ["resultados", "Mais espaco para resultados"]]} />
        </div>

        <div className="card">
          <h2>Quantidade</h2>
          <CampoNumero label="Atualizar a cada milissegundos" value={config.tempoAtualizacao} onChange={(v) => alterar("tempoAtualizacao", v)} />
          <CampoNumero label="Resultados buscados" value={config.limiteResultados} onChange={(v) => alterar("limiteResultados", v)} />
          <CampoNumero label="Series na tela" value={config.limiteSeries} onChange={(v) => alterar("limiteSeries", v)} />
          <CampoNumero label="Atletas por serie" value={config.atletasPorSerie} onChange={(v) => alterar("atletasPorSerie", v)} />
          <CampoNumero label="Escolas no quadro" value={config.limiteMedalhas} onChange={(v) => alterar("limiteMedalhas", v)} />
          <CampoNumero label="Ultimas medalhas" value={config.limiteUltimasMedalhas} onChange={(v) => alterar("limiteUltimasMedalhas", v)} />
        </div>
      </section>

      <div className="actions"><button onClick={salvar}>Salvar configuracoes</button><button className="secondary" onClick={carregarConfig}>Recarregar</button></div>
      {mensagem && <div className="message">{mensagem}</div>}
    </div>
  );
}

function Campo({ label, value, onChange }) {
  return <label>{label}<input value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function CampoNumero({ label, value, onChange }) {
  return <label>{label}<input type="number" min="1" value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function CampoCheck({ label, checked, onChange }) {
  return <label className="check"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}

function CampoSelect({ label, value, onChange, options }) {
  return <label>{label}<select value={value || ""} onChange={(e) => onChange(e.target.value)}>{options.map(([valor, texto]) => <option key={valor || "todos"} value={valor}>{texto}</option>)}</select></label>;
}

const css = [
  ".tv-config-page { color: #0f172a; }",
  ".page-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 18px; }",
  ".page-head p { margin: 0 0 5px; color: #0f766e; font-weight: 900; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; } .page-head h1 { margin: 0; color: #003b73; } .page-head span { display: block; margin-top: 5px; color: #64748b; font-weight: 700; }",
  ".page-head a { text-decoration: none; background: #0f766e; color: white; padding: 12px 16px; border-radius: 10px; font-weight: 900; }",
  ".config-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(300px, .85fr); gap: 16px; align-items: start; }",
  ".card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 10px 28px rgba(15, 23, 42, .06); } .card.wide { grid-row: span 2; }",
  ".card h2 { margin: 0 0 14px; color: #003b73; font-size: 20px; }",
  "label { display: grid; gap: 6px; margin-bottom: 14px; font-weight: 800; color: #334155; } input, select { min-height: 42px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 12px; font: inherit; background: white; }",
  ".checks { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } .top-checks { margin-bottom: 12px; } .check { display: flex; align-items: center; gap: 9px; min-height: 42px; margin: 0; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 10px; background: #f8fafc; } .check input { min-height: auto; width: 18px; height: 18px; padding: 0; } .check span { font-size: 13px; }",
  ".actions { display: flex; gap: 10px; margin-top: 16px; } button { min-height: 44px; border: 0; border-radius: 10px; padding: 0 16px; background: #0f766e; color: white; font-weight: 900; cursor: pointer; } button.secondary { background: #e2e8f0; color: #0f172a; }",
  ".message { margin-top: 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; font-weight: 800; color: #0369a1; }",
  "@media (max-width: 900px) { .page-head { align-items: flex-start; flex-direction: column; } .config-grid { grid-template-columns: 1fr; } .card.wide { grid-row: auto; } .checks { grid-template-columns: 1fr; } }",
].join("\n");
