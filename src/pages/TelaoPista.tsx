import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type TelaoData = {
  tipo: string;
  titulo: string;
  subtitulo: string;
  status: string;
  statusTelao?: string;
  categoria?: string;
  naipe?: string;
  fase?: string;
  atletaAtual?: string;
  resultadoLancado?: string;
  classificacaoParcial?: string;
  serie?: string;
  ultimaAtualizacao?: string;
  podio?: Array<{ colocacao?: number; atleta?: string; resultado?: string }>;
  atletas?: Array<{
    serie?: string;
    raia?: number | string;
    ordem?: number | string;
    nome?: string;
    escola?: string;
    municipio?: string;
  }>;
  resultados?: Array<{
    colocacao?: number | string | null;
    serie?: number | string;
    raia?: number | string;
    numero?: number | string | null;
    atleta?: string;
    nome?: string;
    escola?: string;
    municipio?: string;
    resultado?: string;
    classificacao?: number | string;
    situacao?: string;
    status?: string;
  }>;
};

const DADOS_INICIAIS: TelaoData = {
  tipo: "aguardando_prova",
  titulo: "AGUARDANDO",
  subtitulo: "",
  status: "AGUARDANDO PROVA NA PISTA",
  statusTelao: "aguardando_prova",
  categoria: "",
  naipe: "",
  fase: "",
  atletaAtual: "",
  resultadoLancado: "",
  classificacaoParcial: "",
  serie: "",
  ultimaAtualizacao: "",
  podio: [],
  atletas: [],
  resultados: [],
};

function textoSeguro(valor: any, fallback = ""): string {
  if (valor === null || valor === undefined || valor === "") return fallback;

  if (typeof valor === "object") {
    if (valor.numero_serie !== undefined && valor.numero_serie !== null) {
      return `SÉRIE ${valor.numero_serie}`;
    }

    if (valor.nome !== undefined && valor.nome !== null) {
      return String(valor.nome);
    }

    if (valor.valor !== undefined && valor.valor !== null) {
      return String(valor.valor);
    }

    return fallback;
  }

  return String(valor);
}

function normalizarDadosTelao(registro: any): TelaoData {
  const dados = registro?.dados && typeof registro.dados === "object" ? registro.dados : {};

  const atletas = Array.isArray(dados.atletas)
    ? dados.atletas.map((a: any, idx: number) => ({
        serie: textoSeguro(a?.serie, ""),
        raia: textoSeguro(a?.raia, "-"),
        ordem: textoSeguro(a?.ordem, String(idx + 1)),
        nome: textoSeguro(a?.nome, "-"),
        escola: textoSeguro(a?.escola, "-"),
        municipio: textoSeguro(a?.municipio, "-"),
      }))
    : [];

  const resultados = Array.isArray(dados.resultados)
    ? dados.resultados.map((r: any) => ({
        colocacao: r?.colocacao ?? r?.classificacao ?? null,
        serie: textoSeguro(r?.serie, "-"),
        raia: textoSeguro(r?.raia, "-"),
        numero: textoSeguro(r?.numero, "-"),
        atleta: textoSeguro(r?.atleta, "-"),
        nome: textoSeguro(r?.nome, "-"),
        escola: textoSeguro(r?.escola, "-"),
        municipio: textoSeguro(r?.municipio, "-"),
        resultado: textoSeguro(r?.resultado, "-"),
        classificacao: r?.classificacao ?? null,
        situacao: textoSeguro(r?.situacao, textoSeguro(r?.status, "OK")),
        status: textoSeguro(r?.status, "OK"),
      }))
    : [];

  return {
    tipo: textoSeguro(dados.tipo, "aguardando_prova"),
    titulo: textoSeguro(dados.titulo, textoSeguro(registro?.titulo, "AGUARDANDO")),
    subtitulo: textoSeguro(dados.subtitulo, textoSeguro(registro?.subtitulo, "")),
    status: textoSeguro(dados.status, textoSeguro(registro?.status, "AGUARDANDO PROVA NA PISTA")),
    statusTelao: textoSeguro(dados.status_telao, "aguardando_prova"),
    categoria: textoSeguro(dados.categoria, ""),
    naipe: textoSeguro(dados.naipe, ""),
    fase: textoSeguro(dados.fase, ""),
    atletaAtual: textoSeguro(dados.atleta_atual, ""),
    resultadoLancado: textoSeguro(dados.resultado_lancado, ""),
    classificacaoParcial: textoSeguro(dados.classificacao_parcial, ""),
    serie: textoSeguro(dados.serie, ""),
    ultimaAtualizacao: textoSeguro(dados.ultima_atualizacao, textoSeguro(registro?.atualizado_em, "")),
    podio: Array.isArray(dados.podio) ? dados.podio : [],
    atletas,
    resultados,
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
  const atletasLista = dados.atletas || [];
  const resultadosLista = dados.resultados || [];
  const resultadosOficiais = resultadosLista.map((item) => ({
    colocacao: item.colocacao ?? item.classificacao ?? null,
    serie: item.serie || "-",
    raia: item.raia || "-",
    nome: item.nome || item.atleta || "-",
    escola: item.escola || "-",
    municipio: item.municipio || "-",
    resultado: item.resultado || "-",
    situacao: item.situacao || item.status || "OK",
  }));
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
            item.tipo === "resultado_oficial" ||
            item.tipo === "prova_na_pista" ||
            (item.atletas || []).length > 0 ||
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
        {dados.tipo === "prova_na_pista"
          ? "PROVA NA PISTA"
          : dados.tipo === "resultado_oficial"
            ? "RESULTADO OFICIAL"
            : "AGUARDANDO PROVA NA PISTA"}
      </h1>

      <h3
        style={{
          fontSize: 40,
          marginBottom: 30,
        }}
      >
        {dados.titulo || ""}
      </h3>

      <div style={{ fontSize: 26, marginBottom: 12, color: "#bfdbfe" }}>
        {dados.categoria || ""} {dados.naipe ? `- ${dados.naipe}` : ""}
      </div>

      <div style={{ fontSize: 24, marginBottom: 22, color: "#cbd5e1" }}>
        {dados.serie || ""} {dados.fase ? `- ${dados.fase}` : ""}
      </div>

      <div
        style={{
          fontSize: 28,
          background: "#2563eb",
          padding: "12px 24px",
          borderRadius: 10,
        }}
      >
        {String(dados.status || "AGUARDANDO PROVA NA PISTA").toUpperCase()}
      </div>

      {dados.tipo === "prova_na_pista" && atletasLista.length > 0 && (
        <div
          style={{
            marginTop: 28,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 12,
            padding: "16px 22px",
            width: "100%",
            maxWidth: 1180,
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 22 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.12)" }}>
                  <th style={{ padding: 10 }}>Série</th>
                  <th style={{ padding: 10 }}>Raia</th>
                  <th style={{ padding: 10 }}>Ordem</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Atleta</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Escola</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Município</th>
                </tr>
              </thead>
              <tbody>
                {atletasLista.map((a, idx) => (
                  <tr key={`${a.nome || "atleta"}-${idx}`} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={{ padding: 10 }}>{a.serie || dados.serie || "-"}</td>
                    <td style={{ padding: 10 }}>{a.raia || "-"}</td>
                    <td style={{ padding: 10 }}>{a.ordem || idx + 1}</td>
                    <td style={{ padding: 10, textAlign: "left" }}>{a.nome || "-"}</td>
                    <td style={{ padding: 10, textAlign: "left" }}>{a.escola || "-"}</td>
                    <td style={{ padding: 10, textAlign: "left" }}>{a.municipio || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dados.tipo === "resultado_oficial" && resultadosOficiais.length > 0 && (
        <div
          style={{
            marginTop: 20,
            width: "100%",
            maxWidth: 1180,
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.45)",
            borderRadius: 12,
            padding: "14px 18px",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 22 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.12)" }}>
                  <th style={{ padding: 10 }}>Class.</th>
                  <th style={{ padding: 10 }}>Série</th>
                  <th style={{ padding: 10 }}>Raia</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Atleta</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Escola</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Município</th>
                  <th style={{ padding: 10 }}>Resultado</th>
                  <th style={{ padding: 10 }}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {resultadosOficiais.map((r, idx) => (
                  <tr
                    key={`${r.nome || "atleta"}-${idx}`}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <td style={{ padding: 10 }}>{r.colocacao ? `${r.colocacao}º` : "-"}</td>
                    <td style={{ padding: 10 }}>{r.serie || "-"}</td>
                    <td style={{ padding: 10 }}>{r.raia || "-"}</td>
                    <td style={{ padding: 10, textAlign: "left" }}>{r.nome || "-"}</td>
                    <td style={{ padding: 10, textAlign: "left" }}>{r.escola || "-"}</td>
                    <td style={{ padding: 10, textAlign: "left" }}>{r.municipio || "-"}</td>
                    <td style={{ padding: 10 }}>{r.resultado || "-"}</td>
                    <td style={{ padding: 10 }}>{String(r.situacao || "OK").toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {podio.length > 0 && dados.tipo === "resultado_oficial" && (
        <div
          style={{
            marginTop: 20,
            width: "100%",
            maxWidth: 900,
            background: "rgba(250,204,21,0.12)",
            border: "1px solid rgba(250,204,21,0.5)",
            borderRadius: 12,
            padding: "14px 18px",
          }}
        >
          <div style={{ fontSize: 22, color: "#fde68a", marginBottom: 10 }}>Pódio</div>
          {podio.map((p, idx) => (
            <div key={`${p.atleta || "podio"}-${idx}`} style={{ fontSize: 20, marginBottom: 6 }}>
              {p.colocacao || idx + 1}º - {p.atleta || "-"} ({p.resultado || "-"})
            </div>
          ))}
        </div>
      )}

      {ultimaAtualizacao && (
        <div style={{ marginTop: 14, fontSize: 16, color: "#cbd5e1" }}>
          Atualizado em: {formatarDataHora(ultimaAtualizacao)}
        </div>
      )}
    </div>
  );
}