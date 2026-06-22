import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Configuracoes() {
  const [config, setConfig] = useState({
    evento_nome: "JOGOS ESCOLARES DE RORAIMA - JER 2026",
    local: "Roraima",
    quantidade_raias: 8,
    atletas_por_serie_campo: 15,
    finalistas_campo: 8,
    alturas_salto_altura: [
      "1.15",
      "1.20",
      "1.25",
      "1.30",
      "1.35",
      "1.40",
      "1.45",
      "1.50",
      "1.55",
      "1.60",
      "1.65",
      "1.70",
      "1.75",
      "1.80",
    ],
    texto_cabecalho: "SÚMULA OFICIAL DE ATLETISMO - JER 2026",
    mostrar_municipio: true,
    mostrar_assinaturas: true,
  });

  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  async function carregarConfiguracoes() {
    const { data, error } = await supabase
      .from("configuracoes")
      .select("*")
      .eq("chave", "atletismo_geral")
      .maybeSingle();

    if (error) {
      setMensagem("Erro ao carregar configurações: " + error.message);
      return;
    }

    if (data?.valor) {
      setConfig((old) => ({
        ...old,
        ...data.valor,
      }));
    }
  }

  function alterar(campo, valor) {
    setConfig((old) => ({
      ...old,
      [campo]: valor,
    }));
  }

  function alterarAlturas(valor) {
    const alturas = valor
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    alterar("alturas_salto_altura", alturas);
  }

  async function salvarConfiguracoes() {
    const { error } = await supabase.from("configuracoes").upsert(
      {
        chave: "atletismo_geral",
        valor: config,
        atualizado_em: new Date().toISOString(),
      },
      {
        onConflict: "chave",
      }
    );

    if (error) {
      setMensagem("Erro ao salvar: " + error.message);
      return;
    }

    setMensagem("Configurações salvas com sucesso.");
  }

  return (
    <div>
      <h1>Configurações</h1>

      <p className="muted">
        Ajuste as regras principais do sistema de atletismo.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Dados do Evento</h2>

        <label>Nome do evento</label>
        <input
          value={config.evento_nome}
          onChange={(e) => alterar("evento_nome", e.target.value)}
          style={input}
        />

        <label>Local</label>
        <input
          value={config.local}
          onChange={(e) => alterar("local", e.target.value)}
          style={input}
        />

        <label>Texto do cabeçalho da súmula</label>
        <input
          value={config.texto_cabecalho}
          onChange={(e) => alterar("texto_cabecalho", e.target.value)}
          style={input}
        />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Regras de Séries</h2>

        <label>Quantidade padrão de raias</label>
        <input
          type="number"
          value={config.quantidade_raias}
          onChange={(e) =>
            alterar("quantidade_raias", Number(e.target.value))
          }
          style={inputMenor}
        />

        <label>Atletas por série nas provas de campo</label>
        <input
          type="number"
          value={config.atletas_por_serie_campo}
          onChange={(e) =>
            alterar("atletas_por_serie_campo", Number(e.target.value))
          }
          style={inputMenor}
        />

        <label>Finalistas nas provas de campo</label>
        <input
          type="number"
          value={config.finalistas_campo}
          onChange={(e) =>
            alterar("finalistas_campo", Number(e.target.value))
          }
          style={inputMenor}
        />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Salto em Altura</h2>

        <p className="muted">
          Digite as alturas separadas por vírgula.
        </p>

        <textarea
          value={config.alturas_salto_altura.join(", ")}
          onChange={(e) => alterarAlturas(e.target.value)}
          rows={4}
          style={{
            ...input,
            resize: "vertical",
          }}
        />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Impressão da Súmula</h2>

        <label>
          <input
            type="checkbox"
            checked={config.mostrar_municipio}
            onChange={(e) => alterar("mostrar_municipio", e.target.checked)}
          />{" "}
          Mostrar município na súmula
        </label>

        <br />

        <label>
          <input
            type="checkbox"
            checked={config.mostrar_assinaturas}
            onChange={(e) => alterar("mostrar_assinaturas", e.target.checked)}
          />{" "}
          Mostrar campo de assinatura
        </label>
      </div>

      <button
        onClick={salvarConfiguracoes}
        style={{
          padding: "14px 22px",
          borderRadius: 10,
          border: "none",
          background: "#22c55e",
          color: "#020617",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Salvar Configurações
      </button>

      {mensagem && <p style={{ marginTop: 15 }}>{mensagem}</p>}
    </div>
  );
}

const input = {
  display: "block",
  width: "100%",
  padding: 12,
  marginTop: 8,
  marginBottom: 14,
  borderRadius: 10,
  border: "1px solid #334155",
};

const inputMenor = {
  display: "block",
  width: 180,
  padding: 12,
  marginTop: 8,
  marginBottom: 14,
  borderRadius: 10,
  border: "1px solid #334155",
};