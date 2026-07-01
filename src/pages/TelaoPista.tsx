import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "../lib/supabase";
import { getNumeroAtleta } from "../utils/getNumeroAtleta";

type TelaoAtleta = {
  numero?: number | string | null;
  numero_competicao?: number | string | null;
  serie?: string;
  raia?: number | string;
  ordem?: number | string;
  nome?: string;
  escola?: string;
  municipio?: string;
};

type TelaoResultado = {
  colocacao?: number | string | null;
  serie?: number | string;
  raia?: number | string;
  numero?: number | string | null;
  numero_competicao?: number | string | null;
  atleta?: string;
  nome?: string;
  escola?: string;
  municipio?: string;
  resultado?: string;
  classificacao?: number | string;
  situacao?: string;
  status?: string;
};

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
  atletas?: TelaoAtleta[];
  resultados?: TelaoResultado[];
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

function ehObjeto(valor: unknown): valor is Record<string, any> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function textoSeguro(valor: any, fallback = ""): string {
  if (valor === null || valor === undefined || valor === "") return fallback;

  if (ehObjeto(valor)) {
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

function buscarCampo(obj: any, caminhos: string[], fallback = ""): string {
  if (!ehObjeto(obj)) return fallback;

  for (const caminho of caminhos) {
    const partes = caminho.split(".");
    let atual: any = obj;

    for (const parte of partes) {
      if (!ehObjeto(atual) && !Array.isArray(atual)) {
        atual = undefined;
        break;
      }

      if (Array.isArray(atual)) {
        const indice = Number(parte);
        atual = Number.isInteger(indice) ? atual[indice] : undefined;
      } else {
        atual = (atual as Record<string, any>)[parte];
      }
    }

    const texto = textoSeguro(atual, "");

    if (texto !== "") {
      return texto;
    }
  }

  return fallback;
}

function normalizarSerie(valor: any, fallback = ""): string {
  const texto = textoSeguro(valor, fallback).trim();

  if (!texto) return "";

  if (/s[eé]rie/i.test(texto)) {
    return texto.toUpperCase();
  }

  return `SÉRIE ${texto}`.toUpperCase();
}

function normalizarAtletas(dados: any): TelaoAtleta[] {
  const fonte =
    (Array.isArray(dados?.atletas) && dados.atletas) ||
    (Array.isArray(dados?.prova?.atletas) && dados.prova.atletas) ||
    (Array.isArray(dados?.serie?.atletas) && dados.serie.atletas) ||
    (Array.isArray(dados?.raias) && dados.raias) ||
    (Array.isArray(dados?.inscricoes) && dados.inscricoes) ||
    [];

  return fonte
    .map((a: any, idx: number) => {
      const serieBruta = buscarCampo(a, [
        "serie",
        "serie_nome",
        "numero_serie",
        "serie.numero_serie",
        "serie.nome",
      ]);

      const raiaBruta = buscarCampo(a, [
        "raia",
        "numero_raia",
        "n_raia",
        "pista",
        "balizamento",
      ]);

      const ordemBruta = buscarCampo(a, ["ordem", "posicao", "numero", "ordem_raia"]);
      const numeroCompeticaoBruto = buscarCampo(a, [
        "numero_competicao",
        "atleta.numero_competicao",
        "atletas.numero_competicao",
      ]);
      const numeroBruto = buscarCampo(a, [
        "numero",
        "atleta.numero",
        "atletas.numero",
      ]);

      const nomeBruto = buscarCampo(a, [
        "nome",
        "atleta",
        "atleta_nome",
        "nome_atleta",
        "participante",
        "competidor",
        "atleta.nome",
        "atletas.nome",
        "inscricao.atleta.nome",
      ]);

      const escolaBruta = buscarCampo(a, [
        "escola",
        "escola_nome",
        "nome_escola",
        "instituicao",
        "instituicao_nome",
        "escola.nome",
        "instituicao.nome",
        "atleta.escola",
        "atletas.escola",
      ]);

      const municipioBruto = buscarCampo(a, [
        "municipio",
        "municipio_nome",
        "cidade",
        "delegacao",
        "municipio.nome",
        "atleta.municipio",
        "atletas.municipio",
      ]);

      const temAlgumConteudo = [
        serieBruta,
        raiaBruta,
        ordemBruta,
        numeroCompeticaoBruto,
        numeroBruto,
        nomeBruto,
        escolaBruta,
        municipioBruto,
      ].some((valor) => valor && valor.trim() !== "" && valor.trim() !== "-");

      if (!temAlgumConteudo) return null;

      return {
        numero_competicao: numeroCompeticaoBruto || null,
        numero: getNumeroAtleta({
          numero_competicao: numeroCompeticaoBruto || null,
          numero: numeroBruto || null,
        }),
        serie: normalizarSerie(serieBruta, ""),
        raia: raiaBruta || "-",
        ordem: ordemBruta || String(idx + 1),
        nome: nomeBruto || "-",
        escola: escolaBruta || "-",
        municipio: municipioBruto || "-",
      };
    })
    .filter(Boolean) as TelaoAtleta[];
}

function normalizarResultados(dados: any): TelaoResultado[] {
  const fonte =
    (Array.isArray(dados?.resultados) && dados.resultados) ||
    (Array.isArray(dados?.classificacao) && dados.classificacao) ||
    [];

  return fonte
    .map((r: any, idx: number) => {
      const nomeBruto = buscarCampo(r, [
        "nome",
        "atleta",
        "atleta_nome",
        "nome_atleta",
        "participante",
        "competidor",
        "atleta.nome",
        "atletas.nome",
      ]);

      const escolaBruta = buscarCampo(r, [
        "escola",
        "escola_nome",
        "nome_escola",
        "instituicao",
        "instituicao_nome",
        "escola.nome",
        "instituicao.nome",
      ]);

      const municipioBruto = buscarCampo(r, [
        "municipio",
        "municipio_nome",
        "cidade",
        "delegacao",
        "municipio.nome",
      ]);

      const resultadoBruto = buscarCampo(r, [
        "resultado",
        "tempo",
        "marca",
        "melhor_marca",
        "resultado_final",
        "valor",
      ]);

      const raiaBruta = buscarCampo(r, ["raia", "numero_raia", "n_raia", "pista"]);
      const serieBruta = buscarCampo(r, ["serie", "serie_nome", "numero_serie"]);
      const situacaoBruta = buscarCampo(r, ["situacao", "status"], "OK");
      const numeroCompeticaoBruto = buscarCampo(r, [
        "numero_competicao",
        "atleta.numero_competicao",
        "atletas.numero_competicao",
      ]);
      const numeroBruto = buscarCampo(r, [
        "numero",
        "atleta.numero",
        "atletas.numero",
      ]);

      const temAlgumConteudo = [
        nomeBruto,
        escolaBruta,
        municipioBruto,
        resultadoBruto,
        raiaBruta,
        serieBruta,
      ].some((valor) => valor && valor.trim() !== "" && valor.trim() !== "-");

      if (!temAlgumConteudo) return null;

      return {
        colocacao: r?.colocacao ?? r?.classificacao ?? idx + 1,
        serie: normalizarSerie(serieBruta, ""),
        raia: raiaBruta || "-",
        numero_competicao: numeroCompeticaoBruto || null,
        numero: getNumeroAtleta({
          numero_competicao: numeroCompeticaoBruto || null,
          numero: numeroBruto || null,
        }),
        atleta: nomeBruto || "-",
        nome: nomeBruto || "-",
        escola: escolaBruta || "-",
        municipio: municipioBruto || "-",
        resultado: resultadoBruto || "-",
        classificacao: r?.classificacao ?? r?.colocacao ?? idx + 1,
        situacao: situacaoBruta || "OK",
        status: situacaoBruta || "OK",
      };
    })
    .filter(Boolean) as TelaoResultado[];
}

function normalizarDadosTelao(registro: any): TelaoData {
  const dados = registro?.dados && ehObjeto(registro.dados) ? registro.dados : {};

  const atletas = normalizarAtletas(dados);
  const resultados = normalizarResultados(dados);

  let tipo = textoSeguro(dados.tipo, textoSeguro(dados.status_telao, "aguardando_prova"));

  if ((!tipo || tipo === "aguardando_prova") && resultados.length > 0) {
    tipo = "resultado_oficial";
  }

  if ((!tipo || tipo === "aguardando_prova") && atletas.length > 0) {
    tipo = "prova_na_pista";
  }

  return {
    tipo,
    titulo: textoSeguro(dados.titulo, textoSeguro(registro?.titulo, "AGUARDANDO")),
    subtitulo: textoSeguro(dados.subtitulo, textoSeguro(registro?.subtitulo, "")),
    status: textoSeguro(
      dados.status,
      textoSeguro(registro?.status, "AGUARDANDO PROVA NA PISTA")
    ),
    statusTelao: textoSeguro(dados.status_telao, tipo),
    categoria: textoSeguro(dados.categoria, ""),
    naipe: textoSeguro(dados.naipe, ""),
    fase: textoSeguro(dados.fase, ""),
    atletaAtual: textoSeguro(dados.atleta_atual, ""),
    resultadoLancado: textoSeguro(dados.resultado_lancado, ""),
    classificacaoParcial: textoSeguro(dados.classificacao_parcial, ""),
    serie: normalizarSerie(dados.serie, ""),
    ultimaAtualizacao: textoSeguro(
      dados.ultima_atualizacao,
      textoSeguro(registro?.atualizado_em, "")
    ),
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

function tituloStatus(tipo: string) {
  if (tipo === "prova_na_pista") return "PROVA NA PISTA";
  if (tipo === "resultado_oficial") return "RESULTADO OFICIAL";
  return "AGUARDANDO PROVA NA PISTA";
}

const paginaStyle: CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, rgba(30,64,175,0.35) 0, rgba(0,0,0,1) 42%, rgba(0,0,0,1) 100%)",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  padding: "42px 36px",
  boxSizing: "border-box",
};

const tituloEventoStyle: CSSProperties = {
  fontSize: 30,
  margin: 0,
  marginBottom: 20,
  color: "#facc15",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const statusPrincipalStyle: CSSProperties = {
  fontSize: 72,
  lineHeight: 1,
  margin: 0,
  marginBottom: 22,
  fontWeight: 950,
  letterSpacing: "-0.04em",
  textTransform: "uppercase",
};

const tituloProvaStyle: CSSProperties = {
  fontSize: 42,
  lineHeight: 1.1,
  margin: 0,
  marginBottom: 24,
  fontWeight: 900,
  textTransform: "uppercase",
};

const infoStyle: CSSProperties = {
  fontSize: 26,
  marginBottom: 10,
  color: "#bfdbfe",
  fontWeight: 700,
};

const serieStyle: CSSProperties = {
  fontSize: 24,
  marginBottom: 22,
  color: "#e2e8f0",
  fontWeight: 700,
};

const chipStatusStyle: CSSProperties = {
  fontSize: 22,
  background: "rgba(37,99,235,0.88)",
  border: "1px solid rgba(147,197,253,0.45)",
  padding: "12px 24px",
  borderRadius: 999,
  color: "#fff",
  fontWeight: 900,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  boxShadow: "0 18px 50px rgba(37,99,235,0.28)",
};

const painelStyle: CSSProperties = {
  marginTop: 30,
  width: "100%",
  maxWidth: 1240,
  border: "1px solid rgba(255,255,255,0.20)",
  borderRadius: 22,
  background: "rgba(255,255,255,0.055)",
  boxShadow: "0 25px 80px rgba(0,0,0,0.50)",
  overflow: "hidden",
  backdropFilter: "blur(10px)",
};

const gridAtletasStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "95px 100px 100px 110px minmax(260px, 2fr) minmax(230px, 1.35fr) minmax(190px, 1fr)",
  alignItems: "stretch",
};

const gridResultadosStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "115px 95px 95px 100px minmax(260px, 2fr) minmax(220px, 1.25fr) minmax(180px, 1fr) 150px",
  alignItems: "stretch",
};

const cabecalhoCellStyle: CSSProperties = {
  padding: "14px 16px",
  background: "rgba(255,255,255,0.10)",
  color: "#fde047",
  fontSize: 13,
  lineHeight: 1.15,
  fontWeight: 950,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  borderBottom: "1px solid rgba(255,255,255,0.16)",
  textAlign: "left",
};

const cellStyle: CSSProperties = {
  padding: "16px",
  minHeight: 58,
  display: "flex",
  alignItems: "center",
  color: "#fff",
  fontSize: 21,
  fontWeight: 800,
  borderBottom: "1px solid rgba(255,255,255,0.10)",
  textAlign: "left",
  background: "transparent",
};

const cellDestaqueStyle: CSSProperties = {
  ...cellStyle,
  color: "#fde047",
  justifyContent: "center",
  textAlign: "center",
  fontSize: 25,
  fontWeight: 950,
};

const cellNomeStyle: CSSProperties = {
  ...cellStyle,
  fontSize: 24,
  fontWeight: 950,
  textTransform: "uppercase",
};

const cellSecundariaStyle: CSSProperties = {
  ...cellStyle,
  color: "rgba(255,255,255,0.82)",
  fontSize: 19,
  fontWeight: 750,
};

const vazioStyle: CSSProperties = {
  marginTop: 30,
  width: "100%",
  maxWidth: 1120,
  border: "1px solid rgba(255,255,255,0.20)",
  borderRadius: 22,
  background: "rgba(255,255,255,0.055)",
  padding: "42px 28px",
  color: "rgba(255,255,255,0.72)",
  fontSize: 28,
  fontWeight: 900,
  boxShadow: "0 25px 80px rgba(0,0,0,0.45)",
};

function ListaAtletas({
  atletas,
  seriePadrao,
}: {
  atletas: TelaoAtleta[];
  seriePadrao?: string;
}) {
  if (!atletas.length) {
    return <div style={vazioStyle}>Aguardando lista de atletas...</div>;
  }

  return (
    <div style={painelStyle}>
      <div style={gridAtletasStyle}>
        <div style={{ ...cabecalhoCellStyle, textAlign: "center" }}>Nº</div>
        <div style={{ ...cabecalhoCellStyle, textAlign: "center" }}>Série</div>
        <div style={{ ...cabecalhoCellStyle, textAlign: "center" }}>Raia</div>
        <div style={{ ...cabecalhoCellStyle, textAlign: "center" }}>Ordem</div>
        <div style={cabecalhoCellStyle}>Atleta</div>
        <div style={cabecalhoCellStyle}>Escola</div>
        <div style={cabecalhoCellStyle}>Município</div>

        {atletas.map((a, idx) => (
          <div
            key={`${a.nome || "atleta"}-${idx}`}
            style={{
              display: "contents",
            }}
          >
            <div style={cellDestaqueStyle}>{getNumeroAtleta(a)}</div>
            <div style={cellDestaqueStyle}>{a.serie || seriePadrao || "-"}</div>
            <div style={cellDestaqueStyle}>{a.raia || "-"}</div>
            <div style={cellDestaqueStyle}>{a.ordem || idx + 1}</div>
            <div style={cellNomeStyle}>{a.nome || "-"}</div>
            <div style={cellSecundariaStyle}>{a.escola || "-"}</div>
            <div style={cellSecundariaStyle}>{a.municipio || "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListaResultados({ resultados }: { resultados: TelaoResultado[] }) {
  if (!resultados.length) {
    return <div style={vazioStyle}>Aguardando resultado oficial...</div>;
  }

  return (
    <div
      style={{
        ...painelStyle,
        border: "1px solid rgba(16,185,129,0.45)",
        background: "rgba(16,185,129,0.10)",
      }}
    >
      <div style={gridResultadosStyle}>
        <div style={{ ...cabecalhoCellStyle, textAlign: "center" }}>Class.</div>
        <div style={{ ...cabecalhoCellStyle, textAlign: "center" }}>Nº</div>
        <div style={{ ...cabecalhoCellStyle, textAlign: "center" }}>Série</div>
        <div style={{ ...cabecalhoCellStyle, textAlign: "center" }}>Raia</div>
        <div style={cabecalhoCellStyle}>Atleta</div>
        <div style={cabecalhoCellStyle}>Escola</div>
        <div style={cabecalhoCellStyle}>Município</div>
        <div style={{ ...cabecalhoCellStyle, textAlign: "center" }}>Resultado</div>

{resultados.map((r, idx) => {
  const colocacao = r.colocacao ?? r.classificacao ?? null;
  const nome = r.nome || r.atleta || "-";

  return (
    <div key={`${nome}-${idx}`} style={{ display: "contents" }}>
      <div style={cellDestaqueStyle}>{colocacao ? `${colocacao}º` : "-"}</div>
      <div style={cellDestaqueStyle}>{getNumeroAtleta(r)}</div>
      <div style={cellDestaqueStyle}>{r.serie || "-"}</div>
      <div style={cellDestaqueStyle}>{r.raia || "-"}</div>
      <div style={cellNomeStyle}>{nome}</div>
      <div style={cellSecundariaStyle}>{r.escola || "-"}</div>
      <div style={cellSecundariaStyle}>{r.municipio || "-"}</div>
      <div style={cellDestaqueStyle}>{r.resultado || "-"}</div>
    </div>
  );
})}
      </div>
    </div>
  );
}

export default function TelaoPista() {
  const [dados, setDados] = useState<TelaoData>(DADOS_INICIAIS);

  const atletasLista = dados.atletas || [];
  const resultadosLista = dados.resultados || [];
  const podio = dados.podio || [];
  const ultimaAtualizacao = dados.ultimaAtualizacao || "";

  const carregar = async () => {
    const { data, error } = await supabase
      .from("telao_pista_controle")
      .select("*")
      .eq("publicado", true)
      .order("atualizado_em", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Erro ao carregar telão da pista:", error);
      return;
    }

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
    } else {
      setDados(DADOS_INICIAIS);
    }
  };

  useEffect(() => {
    carregar();

    const interval = setInterval(() => {
      carregar();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const categoriaNaipe = [dados.categoria, dados.naipe].filter(Boolean).join(" - ");
  const serieFase = [dados.serie, dados.fase].filter(Boolean).join(" - ");

  return (
    <div style={paginaStyle}>
      <h2 style={tituloEventoStyle}>JER ATLETISMO</h2>

      <h1 style={statusPrincipalStyle}>{tituloStatus(dados.tipo)}</h1>

      <h3 style={tituloProvaStyle}>{dados.titulo || "AGUARDANDO"}</h3>

      {categoriaNaipe && <div style={infoStyle}>{categoriaNaipe}</div>}

      {serieFase && <div style={serieStyle}>{serieFase}</div>}

      <div style={chipStatusStyle}>
        {String(dados.status || tituloStatus(dados.tipo)).toUpperCase()}
      </div>

      {dados.tipo === "prova_na_pista" && (
        <ListaAtletas atletas={atletasLista} seriePadrao={dados.serie} />
      )}

      {dados.tipo === "resultado_oficial" && <ListaResultados resultados={resultadosLista} />}

      {dados.tipo !== "prova_na_pista" &&
        dados.tipo !== "resultado_oficial" && (
          <div style={vazioStyle}>Aguardando prova na pista...</div>
        )}

      {podio.length > 0 && dados.tipo === "resultado_oficial" && (
        <div
          style={{
            marginTop: 24,
            width: "100%",
            maxWidth: 920,
            background: "rgba(250,204,21,0.12)",
            border: "1px solid rgba(250,204,21,0.50)",
            borderRadius: 22,
            padding: "18px 22px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.38)",
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: "#fde68a",
              marginBottom: 12,
              fontWeight: 950,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Pódio
          </div>

          {podio.map((p, idx) => (
            <div
              key={`${p.atleta || "podio"}-${idx}`}
              style={{
                fontSize: 23,
                marginBottom: 8,
                color: "#fff",
                fontWeight: 800,
              }}
            >
              {p.colocacao || idx + 1}º - {p.atleta || "-"} ({p.resultado || "-"})
            </div>
          ))}
        </div>
      )}

      {ultimaAtualizacao && (
        <div
          style={{
            marginTop: 18,
            fontSize: 16,
            color: "#cbd5e1",
            fontWeight: 600,
          }}
        >
          Atualizado em: {formatarDataHora(ultimaAtualizacao)}
        </div>
      )}
    </div>
  );
}