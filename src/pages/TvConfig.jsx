import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const PADRAO = {
  titulo: "JER 2026 • ATLETISMO",
  subtitulo: "CENTRAL OFICIAL DE INFORMAÇÕES",
  aviso1: "Câmara de chamada aberta 15 minutos antes da prova",
  aviso2: "Acompanhe os resultados oficiais pelo QR Code",
  aviso3: "Delegações: procurem a Secretaria Geral em caso de dúvidas",
  rodape:
    "Resultados oficiais disponíveis em: /publico • Quadro de medalhas: /publico/medalhas",
  tempoAtualizacao: 8000,
  limiteResultados: 8,
  limiteMedalhas: 8,
};

export default function TvConfig() {
  const [config, setConfig] = useState(PADRAO);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarConfig();
  }, []);

  async function carregarConfig() {
    setMensagem("Carregando configurações da TV...");

    const { data, error } = await supabase
      .from("tv_config")
      .select("*")
      .eq("chave", "principal")
      .maybeSingle();

    if (error) {
      setMensagem("Erro ao carregar: " + error.message);
      return;
    }

    if (data?.valor) {
      setConfig({
        ...PADRAO,
        ...data.valor,
      });
    }

    setMensagem("");
  }

  function alterar(campo, valor) {
    setConfig((old) => ({
      ...old,
      [campo]: valor,
    }));
  }

  async function salvar() {
    setMensagem("Salvando configurações...");

    const payload = {
      chave: "principal",
      valor: {
        ...config,
        tempoAtualizacao: Number(config.tempoAtualizacao) || 8000,
        limiteResultados: Number(config.limiteResultados) || 8,
        limiteMedalhas: Number(config.limiteMedalhas) || 8,
      },
      atualizado_em: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("tv_config")
      .upsert(payload, { onConflict: "chave" });

    if (error) {
      setMensagem("Erro ao salvar: " + error.message);
      return;
    }

    setMensagem("Configurações da TV salvas com sucesso.");
  }

  return (
    <div>
      <h1>Configuração da TV</h1>

      <p className="muted">
        Edite aqui as informações que aparecem na TV da entrada.
      </p>

      <div className="card" style={card}>
        <h2>Textos principais</h2>

        <Campo
          label="Título"
          value={config.titulo}
          onChange={(v) => alterar("titulo", v)}
        />

        <Campo
          label="Subtítulo"
          value={config.subtitulo}
          onChange={(v) => alterar("subtitulo", v)}
        />

        <Campo
          label="Rodapé"
          value={config.rodape}
          onChange={(v) => alterar("rodape", v)}
        />
      </div>

      <div className="card" style={card}>
        <h2>Avisos da TV</h2>

        <Campo
          label="Aviso 1"
          value={config.aviso1}
          onChange={(v) => alterar("aviso1", v)}
        />

        <Campo
          label="Aviso 2"
          value={config.aviso2}
          onChange={(v) => alterar("aviso2", v)}
        />

        <Campo
          label="Aviso 3"
          value={config.aviso3}
          onChange={(v) => alterar("aviso3", v)}
        />
      </div>

      <div className="card" style={card}>
        <h2>Quantidade e atualização</h2>

        <div style={grid}>
          <CampoNumero
            label="Atualização automática em milissegundos"
            value={config.tempoAtualizacao}
            onChange={(v) => alterar("tempoAtualizacao", v)}
          />

          <CampoNumero
            label="Quantidade de últimos resultados"
            value={config.limiteResultados}
            onChange={(v) => alterar("limiteResultados", v)}
          />

          <CampoNumero
            label="Quantidade de escolas no quadro"
            value={config.limiteMedalhas}
            onChange={(v) => alterar("limiteMedalhas", v)}
          />
        </div>
      </div>

      <button onClick={salvar} style={botaoSalvar}>
        Salvar Configurações da TV
      </button>

      {mensagem && (
        <div className="card" style={{ marginTop: 20 }}>
          {mensagem}
        </div>
      )}
    </div>
  );
}

function Campo({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>

      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </div>
  );
}

function CampoNumero({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>

      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </div>
  );
}

const card = {
  marginBottom: 20,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontWeight: "bold",
};

const input = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #334155",
};

const botaoSalvar = {
  padding: "14px 22px",
  borderRadius: 12,
  border: "none",
  background: "#22c55e",
  color: "#020617",
  fontWeight: "bold",
  cursor: "pointer",
};