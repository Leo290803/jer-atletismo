import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type TelaoData = {
  titulo: string;
  subtitulo: string;
  status: string;
  atletaAtual?: string;
  resultadoLancado?: string;
  classificacaoParcial?: string;
  serie?: string;
  ultimaAtualizacao?: string;
  podio?: Array<{ colocacao?: number; atleta?: string; resultado?: string }>;
  resultados?: Array<{
    serie?: number | string;
    raia?: number | string;
    numero?: number | string;
    atleta?: string;
    escola?: string;
    resultado?: string;
    classificacao?: number | string;
    status?: string;
  }>;
};

const DADOS_INICIAIS: TelaoData = {
  titulo: "AGUARDANDO",
  subtitulo: "",
  status: "aguardando",
  atletaAtual: "",
  resultadoLancado: "",
  classificacaoParcial: "",
  serie: "",
  ultimaAtualizacao: "",
  podio: [],
  resultados: [],
};

function normalizarDadosTelao(registro: any): TelaoData {
  const dados = registro?.dados && typeof registro.dados === "object" ? registro.dados : {};

  return {
    titulo: dados.titulo || registro?.titulo || "AGUARDANDO",
    subtitulo: dados.subtitulo || registro?.subtitulo || "",
    status: dados.status || registro?.status || "aguardando",
    atletaAtual: dados.atleta_atual || "",
    resultadoLancado: dados.resultado_lancado || "",
    classificacaoParcial: dados.classificacao_parcial || "",
    serie: dados.serie || "",
    ultimaAtualizacao: dados.ultima_atualizacao || registro?.atualizado_em || "",
    podio: Array.isArray(dados.podio) ? dados.podio : [],
    resultados: Array.isArray(dados.resultados) ? dados.resultados : [],
  };
}

function formatarDataHora(data: string) {
  if (!data) return "";
  const dt = new Date(data);
  if (Number.isNaN(dt.getTime())) return String(data);
  return dt.toLocaleString("pt-BR");
}

export default function TelaoPista() {
  const [dados, setDados] = useState<TelaoData>(DADOS_INICIAIS);
  const podio = dados.podio || [];
  const resultadosLista = dados.resultados || [];
  const ultimaAtualizacao = dados.ultimaAtualizacao || "";

  const carregar = async () => {
    const { data } = await supabase
      .from("telao_pista_controle")
      .select("*")
      .eq("publicado", true)
      .order("atualizado_em", { ascending: false })
      .limit(30);

    if (Array.isArray(data) && data.length > 0) {
      const normalizados = data.map(normalizarDadosTelao);
      const melhor =
        normalizados.find(
          (item) =>
            (item.resultados || []).length > 0 ||
            !!item.atletaAtual ||
            !!item.resultadoLancado ||
            !!item.classificacaoParcial
        ) || normalizados[0];

      setDados(melhor);
    }
  };

  useEffect(() => {
    carregar();

    const interval = setInterval(() => {
      carregar();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 40,
      }}
    >
      <h2
        style={{
          fontSize: 30,
          marginBottom: 20,
          color: "#facc15",
        }}
      >
        JER ATLETISMO
      </h2>

      <h1
        style={{
          fontSize: 70,
          marginBottom: 20,
        }}
      >
        {dados?.titulo || "AGUARDANDO"}
      </h1>

      <h3
        style={{
          fontSize: 40,
          marginBottom: 30,
        }}
      >
        {dados?.subtitulo || ""}
      </h3>

      <div
        style={{
          fontSize: 28,
          background: "#2563eb",
          padding: "12px 24px",
          borderRadius: 10,
        }}
      >
        {dados.status?.replaceAll("_", " ").toUpperCase()}
      </div>

      {(dados.atletaAtual || dados.resultadoLancado || dados.classificacaoParcial) && (
        <div
          style={{
            marginTop: 28,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 12,
            padding: "16px 22px",
            minWidth: 520,
          }}
        >
          {dados.serie && (
            <div style={{ fontSize: 20, marginBottom: 10, color: "#93c5fd" }}>
              Série: {dados.serie}
            </div>
          )}
          <div style={{ fontSize: 24, marginBottom: 6 }}>
            <strong>Atleta:</strong> {dados.atletaAtual || "-"}
          </div>
          <div style={{ fontSize: 24, marginBottom: 6 }}>
            <strong>Resultado:</strong> {dados.resultadoLancado || "-"}
          </div>
          <div style={{ fontSize: 24 }}>
            <strong>Classificação Parcial:</strong> {dados.classificacaoParcial || "-"}
          </div>
          {ultimaAtualizacao && (
            <div style={{ marginTop: 12, fontSize: 16, color: "#cbd5e1" }}>
              Atualizado em: {formatarDataHora(ultimaAtualizacao)}
            </div>
          )}
        </div>
      )}

      {podio.length > 0 && (
        <div
          style={{
            marginTop: 20,
            width: "100%",
            maxWidth: 700,
            background: "rgba(250,204,21,0.12)",
            border: "1px solid rgba(250,204,21,0.5)",
            borderRadius: 12,
            padding: "14px 18px",
          }}
        >
          <div style={{ fontSize: 22, color: "#fde68a", marginBottom: 10 }}>Pódio parcial/final</div>
          {podio.map((p, idx) => (
            <div key={`${p.atleta || "podio"}-${idx}`} style={{ fontSize: 20, marginBottom: 6 }}>
              {p.colocacao || idx + 1}º - {p.atleta || "-"} ({p.resultado || "-"})
            </div>
          ))}
        </div>
      )}

      {resultadosLista.length > 0 && (
        <div
          style={{
            marginTop: 22,
            width: "100%",
            maxWidth: 1180,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              fontSize: 22,
              fontWeight: 700,
              textAlign: "left",
              background: "rgba(37,99,235,0.25)",
              color: "#bfdbfe",
            }}
          >
            Resultados por série
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 22 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.12)" }}>
                  <th style={{ padding: 10 }}>Série</th>
                  <th style={{ padding: 10 }}>Raia</th>
                  <th style={{ padding: 10 }}>Nº</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Atleta</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Escola</th>
                  <th style={{ padding: 10 }}>Resultado</th>
                  <th style={{ padding: 10 }}>Class.</th>
                  <th style={{ padding: 10 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {resultadosLista.map((r, idx) => (
                  <tr
                    key={`${r.atleta || "atleta"}-${idx}`}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <td style={{ padding: 10 }}>{r.serie || "-"}</td>
                    <td style={{ padding: 10 }}>{r.raia || "-"}</td>
                    <td style={{ padding: 10 }}>{r.numero || "-"}</td>
                    <td style={{ padding: 10, textAlign: "left" }}>{r.atleta || "-"}</td>
                    <td style={{ padding: 10, textAlign: "left" }}>{r.escola || "-"}</td>
                    <td style={{ padding: 10 }}>{r.resultado || "-"}</td>
                    <td style={{ padding: 10 }}>{r.classificacao || "-"}</td>
                    <td style={{ padding: 10 }}>{String(r.status || "OK").toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}