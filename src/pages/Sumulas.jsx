import { useEffect, useMemo, useState } from "react";
import EtapaLancamento from "./sumulas/components/EtapaLancamento";
import AcrescentarAtleta from "./sumulas/components/AcrescentarAtleta";
import EtapaProximaFase from "./sumulas/components/EtapaProximaFase";
import EtapaSelecaoProva from "./sumulas/components/EtapaSelecaoProva";
import SumulaManual from "./sumulas/components/SumulaManual";
import SumulaImpressao from "./sumulas/components/SumulaImpressao";
import {
  TabelaCampo,
  TabelaCombinadaFinal,
  TabelaCombinadaProva,
  TabelaPista,
  TabelaRevezamento,
} from "./sumulas/components/TabelasSumula";
import { useGerenciarInscritos } from "./sumulas/hooks/useGerenciarInscritos";
import { useProximaFase } from "./sumulas/hooks/useProximaFase";
import { useSeries } from "./sumulas/hooks/useSeries";
import { useSumulaDigital } from "./sumulas/hooks/useSumulaDigital";
import { useSumulas } from "./sumulas/hooks/useSumulas";
import { buscarCombinadaPorCategoriaNaipe, ehProvaCombinada } from "../data/provasCombinadas";
import { FASES_PROVA_PADRAO, normalizarFaseProva } from "../data/fasesProvas";
import { supabase } from "../lib/supabase";
import { formatarNascimento } from "./sumulas/utils/formatadores";
import { titularesDoRevezamento } from "./sumulas/utils/revezamento";
import { getNumeroAtleta } from "../utils/getNumeroAtleta";
import "./sumulas/styles/printSumulas.css";


const inputTabelaLancamento = {
  width: "100%",
  minWidth: 70,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "7px 8px",
  background: "#ffffff",
  color: "#0f172a",
  textAlign: "center",
  fontWeight: 700,
};

const inputMiniAlturaLancamento = {
  width: 28,
  minWidth: 28,
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  padding: "5px 4px",
  background: "#ffffff",
  color: "#0f172a",
  textAlign: "center",
  fontWeight: 700,
};

const STATUS_SUMULA_DIGITAL_ATIVA = new Set(["ABERTA", "EM_ANDAMENTO", "ENVIADA"]);

function textoBusca(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function provaEhCombinadaOficial(prova) {
  return prova?.tipo === "combinada" || ehProvaCombinada(prova?.nome);
}

function provaEhRevezamentoOficial(prova) {
  const nome = textoBusca(prova?.nome);

  return (
    prova?.tipo === "revezamento" ||
    prova?.subtipo === "revezamento" ||
    nome.includes("REVEZAMENTO") ||
    nome.includes("4X100") ||
    nome.includes("4 X 100") ||
    nome.includes("5X80") ||
    nome.includes("5 X 80") ||
    nome.includes("4X400") ||
    nome.includes("4 X 400")
  );
}

function provaEhSaltoAlturaOficial(prova) {
  const nome = textoBusca(prova?.nome);
  return prova?.subtipo === "salto_altura" || nome.includes("SALTO EM ALTURA");
}

function provaEhCampoTentativasOficial(prova) {
  if (!prova || provaEhCombinadaOficial(prova) || provaEhSaltoAlturaOficial(prova) || provaEhRevezamentoOficial(prova)) {
    return false;
  }

  const nome = textoBusca(prova.nome);

  return (
    prova.tipo === "campo" ||
    prova.subtipo === "campo_tentativas" ||
    nome.includes("ARREMESSO") ||
    nome.includes("LANCAMENTO") ||
    nome.includes("SALTO EM DISTANCIA") ||
    nome.includes("SALTO TRIPLO") ||
    nome.includes("DARDO") ||
    nome.includes("DISCO") ||
    nome.includes("MARTELO") ||
    nome.includes("PESO")
  );
}

function dataParaArquivo() {
  return new Date().toISOString().slice(0, 10);
}

function montarDatasCombinadaLote(provaId, dataPadrao) {
  const padrao = { dia1: dataPadrao || "", dia2: "" };

  try {
    const salvo = window.localStorage.getItem("sumula-combinada-datas-" + provaId);
    if (!salvo) return padrao;

    const datas = JSON.parse(salvo);
    return {
      dia1: datas.dia1 || dataPadrao || "",
      dia2: datas.dia2 || "",
    };
  } catch {
    return padrao;
  }
}

function aplicarResultadosNasSeries(seriesBase = [], resultadosSalvos = [], resultadosDigitais = []) {
  const mapaResultados = {};
  (resultadosSalvos || []).forEach((resultado) => {
    mapaResultados[resultado.inscricao_id] = resultado;
  });

  const mapaResultadosDigitais = {};
  (resultadosDigitais || []).forEach((resultado) => {
    mapaResultadosDigitais[resultado.atleta_id] = resultado;
  });

  return (seriesBase || []).map((serie) => ({
    ...serie,
    raias: (serie.raias || []).map((raia) => {
      const resultado = mapaResultados[raia.inscricoes?.id];
      const resultadoDigital = mapaResultadosDigitais[raia.inscricoes?.atleta_id];

      return {
        ...raia,
        tempo: resultado?.tempo || resultadoDigital?.tempo || "",
        colocacao: resultado?.colocacao || resultadoDigital?.classificacao || "",
        status: resultado?.status || resultadoDigital?.observacao || "OK",
        tentativa1: resultado?.tentativa1 || "",
        tentativa2: resultado?.tentativa2 || "",
        tentativa3: resultado?.tentativa3 || "",
        tentativa4: resultado?.tentativa4 || "",
        tentativa5: resultado?.tentativa5 || "",
        tentativa6: resultado?.tentativa6 || "",
        melhor_marca: resultado?.melhor_marca || resultadoDigital?.marca || "",
        classificacao_parcial: resultado?.classificacao_parcial || resultadoDigital?.classificacao || "",
        classificacao_parcial_final: resultado?.classificacao_parcial_final || "",
        finalista: resultado?.finalista || false,
        alturas: resultado?.alturas || [],
        resultado_final: resultado?.resultado_final || resultadoDigital?.resultado || "",
        publicado: resultado?.publicado || false,
        qualificacao: resultado?.qualificacao || "",
      };
    }),
  }));
}

function primeiroResultadoComData(resultados = []) {
  return (resultados || []).find((resultado) => resultado?.data_resultado)?.data_resultado || "";
}

function valorTexto(valor) {
  return valor === null || valor === undefined ? "" : valor;
}

function abreviarCategoria(categoria) {
  return String(categoria || "")
    .replace(/\s*anos?/gi, "")
    .replace(/\s+a\s+/gi, "-")
    .trim();
}

function abreviarNaipe(naipe) {
  const texto = textoBusca(naipe);
  if (texto.includes("FEM")) return "FEM";
  if (texto.includes("MASC")) return "MASC";
  if (texto.includes("MIST")) return "MISTO";
  return String(naipe || "").trim();
}

function abreviarFase(fase) {
  const texto = textoBusca(fase || "QUALIFICACAO");
  if (texto.includes("SEMI")) return "SEMI";
  if (texto.includes("FINAL")) return "FINAL";
  if (texto.includes("QUAL")) return "QUAL";
  return String(fase || "").trim();
}

function limparNomeAbaExcel(nome) {
  return String(nome || "Sumula")
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31) || "Sumula";
}

function nomeAbaExcelUnico(item, usados) {
  const base = limparNomeAbaExcel([
    item.prova?.nome || "Prova",
    abreviarCategoria(item.prova?.categoria),
    abreviarNaipe(item.prova?.naipe),
    abreviarFase(item.prova?.fase),
  ].filter(Boolean).join(" "));

  let nome = base;
  let contador = 2;

  while (usados.has(nome.toUpperCase())) {
    const sufixo = " " + contador;
    nome = limparNomeAbaExcel(base.slice(0, 31 - sufixo.length) + sufixo);
    contador += 1;
  }

  usados.add(nome.toUpperCase());
  return nome;
}

function dataParaTextoExcel(data) {
  if (!data) return "";
  const partes = String(data).split("-");
  if (partes.length !== 3) return data;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function textoCelulaExcel(valor) {
  return valorTexto(valor);
}

function atletaDaRaia(raia) {
  return raia?.inscricoes?.atletas || {};
}

function ordenarRaiasSumulaExcel(serie, usarRaia = false) {
  return [...(serie.raias || [])].sort((a, b) => {
    const valorA = usarRaia ? a.raia || a.ordem || 0 : a.ordem || a.raia || 0;
    const valorB = usarRaia ? b.raia || b.ordem || 0 : b.ordem || b.raia || 0;
    return valorA - valorB;
  });
}

function valorTentativaCombinadaExcel(raia, ordem) {
  return textoCelulaExcel(raia?.["tentativa" + ordem]);
}

function montarColunasSumulaExcel(item, opcoes) {
  const colunasBase = [
    { label: "No", width: 8, align: "center", value: (raia) => getNumeroAtleta(atletaDaRaia(raia)) },
    { label: "ATLETA", width: 28, align: "left", value: (raia) => atletaDaRaia(raia)?.nome || "" },
    { label: "ESCOLA", width: 30, align: "left", value: (raia) => atletaDaRaia(raia)?.escolas?.nome || "" },
    {
      label: "NASCIMENTO",
      width: 13,
      align: "center",
      value: (raia) => opcoes.formatarNascimento(atletaDaRaia(raia)?.data_nascimento),
    },
  ];

  if (item.ehCombinada && item.combinadaInfo?.subprovas?.length) {
    const subprovas = [...item.combinadaInfo.subprovas].sort((a, b) => (a?.ordem || 0) - (b?.ordem || 0));

    return [
      ...colunasBase,
      ...subprovas.map((subprova) => ({
        label: `${subprova.ordem}. ${subprova.nome}`,
        width: 14,
        align: "center",
        value: (raia) => valorTentativaCombinadaExcel(raia, subprova.ordem),
      })),
      { label: "TOTAL", width: 12, align: "center", value: (raia) => textoCelulaExcel(raia.resultado_final) },
      { label: "COLOCACAO", width: 12, align: "center", value: (raia) => textoCelulaExcel(raia.colocacao) },
      { label: "STATUS", width: 10, align: "center", value: (raia) => textoCelulaExcel(raia.status || "OK") },
    ];
  }

  if (item.ehSaltoAltura) {
    const alturas = (opcoes.config?.alturas_salto_altura || []).slice(0, 10);

    return [
      ...colunasBase,
      ...alturas.map((altura) => ({
        label: String(altura),
        width: 8,
        align: "center",
        value: (raia) => {
          const dados = Array.isArray(raia.alturas) ? raia.alturas : [];
          const registro = dados.find((itemAltura) => String(itemAltura?.altura) === String(altura));
          return textoCelulaExcel(registro?.valor);
        },
      })),
      { label: "RESULTADO", width: 12, align: "center", value: (raia) => textoCelulaExcel(raia.resultado_final) },
      { label: "COLOCACAO", width: 12, align: "center", value: (raia) => textoCelulaExcel(raia.colocacao) },
      { label: "Q", width: 6, align: "center", value: (raia) => textoCelulaExcel(raia.qualificacao) },
    ];
  }

  if (item.ehCampoTentativas) {
    return [
      ...colunasBase,
      { label: "1a", width: 8, align: "center", value: (raia) => textoCelulaExcel(raia.tentativa1) },
      { label: "2a", width: 8, align: "center", value: (raia) => textoCelulaExcel(raia.tentativa2) },
      { label: "3a", width: 8, align: "center", value: (raia) => textoCelulaExcel(raia.tentativa3) },
      { label: "PARCIAL", width: 10, align: "center", value: (raia) => opcoes.melhorDasTresPrimeiras(raia) },
      { label: "CLASS.", width: 9, align: "center", value: (raia) => textoCelulaExcel(raia.classificacao_parcial) },
      { label: "4a", width: 8, align: "center", value: (raia) => textoCelulaExcel(raia.tentativa4) },
      { label: "5a", width: 8, align: "center", value: (raia) => textoCelulaExcel(raia.tentativa5) },
      { label: "CLASS. PARC.", width: 12, align: "center", value: (raia) => textoCelulaExcel(raia.classificacao_parcial_final) },
      { label: "6a", width: 8, align: "center", value: (raia) => textoCelulaExcel(raia.tentativa6) },
      {
        label: "RESULTADO",
        width: 12,
        align: "center",
        value: (raia) => textoCelulaExcel(raia.resultado_final || raia.melhor_marca || opcoes.melhorDasTentativas(raia)),
      },
      { label: "COLOCACAO", width: 12, align: "center", value: (raia) => textoCelulaExcel(raia.colocacao) },
      { label: "Q", width: 6, align: "center", value: (raia) => textoCelulaExcel(raia.qualificacao) },
    ];
  }

  if (item.ehRevezamento) {
    return [
      { label: "RAIA", width: 8, align: "center", value: (raia) => textoCelulaExcel(raia.raia) },
      ...colunasBase,
      { label: "TEMPO", width: 12, align: "center", value: (raia) => textoCelulaExcel(raia.tempo) },
      { label: "COLOCACAO", width: 12, align: "center", value: (raia) => textoCelulaExcel(raia.colocacao) },
      { label: "Q", width: 6, align: "center", value: (raia) => textoCelulaExcel(raia.qualificacao) },
    ];
  }

  return [
    { label: "RAIA", width: 8, align: "center", value: (raia) => textoCelulaExcel(raia.raia) },
    ...colunasBase,
    { label: "TEMPO", width: 12, align: "center", value: (raia) => textoCelulaExcel(raia.tempo) },
    { label: "COLOCACAO", width: 12, align: "center", value: (raia) => textoCelulaExcel(raia.colocacao) },
    { label: "Q", width: 6, align: "center", value: (raia) => textoCelulaExcel(raia.qualificacao) },
  ];
}

function escaparXmlExcel(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function celulaExcelXml(valor = "", estilo = "CellCenter", opcoes = {}) {
  const atributos = [`ss:StyleID="${estilo}"`];
  if (opcoes.mergeAcross) atributos.push(`ss:MergeAcross="${opcoes.mergeAcross}"`);
  if (opcoes.index) atributos.push(`ss:Index="${opcoes.index}"`);

  return `<Cell ${atributos.join(" ")}><Data ss:Type="String">${escaparXmlExcel(valor)}</Data></Cell>`;
}

function linhaExcelXml(celulas = [], altura = null) {
  const atributoAltura = altura ? ` ss:Height="${altura}"` : "";
  return `<Row${atributoAltura}>${celulas.join("")}</Row>`;
}

function colunaExcelXml(coluna) {
  const largura = Math.max(34, Math.min(230, Number(coluna.width || 10) * 6.2));
  return `<Column ss:AutoFitWidth="0" ss:Width="${largura.toFixed(0)}"/>`;
}

function linhaValoresExcelXml(valores, colunas, estiloPadrao = "CellCenter") {
  return linhaExcelXml(
    colunas.map((coluna, indice) => {
      const estilo = estiloPadrao === "CellCenter" && coluna.align === "left" ? "CellText" : estiloPadrao;
      return celulaExcelXml(valores[indice] ?? "", estilo);
    }),
    28
  );
}

function estilosWorkbookExcelXml() {
  const bordas = `
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>`;

  return `
    <Styles>
      <Style ss:ID="Default" ss:Name="Normal">
        <Alignment ss:Vertical="Center"/>
        <Font ss:FontName="Calibri" ss:Size="11"/>
      </Style>
      <Style ss:ID="Title">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
        <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#003366"/>
        <Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/>
      </Style>
      <Style ss:ID="Meta">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
        <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#000000"/>
      </Style>
      <Style ss:ID="Section">
        <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
        ${bordas}
        <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#003366"/>
        <Interior ss:Color="#EAF2F8" ss:Pattern="Solid"/>
      </Style>
      <Style ss:ID="Header">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
        ${bordas}
        <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
        <Interior ss:Color="#0057A8" ss:Pattern="Solid"/>
      </Style>
      <Style ss:ID="CellCenter">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
        ${bordas}
        <Font ss:FontName="Calibri" ss:Size="9"/>
      </Style>
      <Style ss:ID="CellText">
        <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
        ${bordas}
        <Font ss:FontName="Calibri" ss:Size="9"/>
      </Style>
      <Style ss:ID="Signature">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
        <Font ss:FontName="Calibri" ss:Size="10"/>
      </Style>
    </Styles>`;
}

function criarWorksheetSumulaExcel(nomeAba, item, opcoes) {
  const colunas = montarColunasSumulaExcel(item, opcoes);
  const totalColunas = colunas.length;
  const linhas = [];

  const titulo = opcoes.config?.texto_cabecalho || "SUMULA OFICIAL DE ATLETISMO - JER 2026";
  linhas.push(linhaExcelXml([celulaExcelXml(titulo, "Title", { mergeAcross: totalColunas - 1 })], 26));

  const meta = [
    `Prova: ${item.prova?.nome || ""}`,
    `Categoria: ${item.prova?.categoria || ""}`,
    `Naipe: ${item.prova?.naipe || ""}`,
    `Fase: ${item.prova?.fase || "QUALIFICACAO"}`,
    `Data: ${dataParaTextoExcel(item.dataProva)}`,
  ].join(" | ");
  linhas.push(linhaExcelXml([celulaExcelXml(meta, "Meta", { mergeAcross: totalColunas - 1 })], 18));

  if (opcoes.config?.local_evento) {
    linhas.push(
      linhaExcelXml([celulaExcelXml(`Local: ${opcoes.config.local_evento}`, "Meta", { mergeAcross: totalColunas - 1 })], 18)
    );
  }

  linhas.push(linhaExcelXml([], 8));

  item.series.forEach((serie) => {
    const usarRaia = !item.ehCampoTentativas && !item.ehCombinada && !item.ehSaltoAltura;
    const raiasOrdenadas = ordenarRaiasSumulaExcel(serie, usarRaia);
    const tituloSerie = item.ehCampoTentativas
      ? `CLASSIFICACAO / QUALIFICACAO - SERIE ${serie.numero_serie || ""}`
      : item.ehCombinada
      ? `COMBINADAS - SERIE ${serie.numero_serie || ""}`
      : item.ehRevezamento
      ? `REVEZAMENTO - SERIE ${serie.numero_serie || ""}`
      : `SERIE ${serie.numero_serie || ""}`;

    linhas.push(linhaExcelXml([celulaExcelXml(tituloSerie, "Section", { mergeAcross: totalColunas - 1 })], 20));
    linhas.push(linhaExcelXml(colunas.map((coluna) => celulaExcelXml(coluna.label, "Header")), 24));

    raiasOrdenadas.forEach((raia) => {
      linhas.push(linhaValoresExcelXml(
        colunas.map((coluna) => coluna.value(raia, serie)),
        colunas
      ));
    });

    linhas.push(linhaExcelXml([], 12));

    if (opcoes.config?.mostrar_assinaturas !== false) {
      const metade = Math.max(1, Math.floor(totalColunas / 2));
      linhas.push(
        linhaExcelXml(
          [
            celulaExcelXml("____________________________", "Signature", { index: 1 }),
            celulaExcelXml("____________________________", "Signature", { index: metade + 1 }),
          ],
          22
        )
      );
      linhas.push(
        linhaExcelXml(
          [
            celulaExcelXml("Arbitro da Prova", "Signature", { index: 1 }),
            celulaExcelXml("Coordenacao de Atletismo", "Signature", { index: metade + 1 }),
          ],
          20
        )
      );
      linhas.push(linhaExcelXml([], 14));
    }
  });

  const orientacao = totalColunas > 10 ? "Landscape" : "Portrait";

  return `
    <Worksheet ss:Name="${escaparXmlExcel(nomeAba)}">
      <Table ss:DefaultRowHeight="18">
        ${colunas.map(colunaExcelXml).join("")}
        ${linhas.join("")}
      </Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <PageSetup>
          <Layout x:Orientation="${orientacao}"/>
          <PageMargins x:Bottom="0.25" x:Left="0.25" x:Right="0.25" x:Top="0.35"/>
        </PageSetup>
        <FitToPage/>
        <Print>
          <FitWidth>1</FitWidth>
          <FitHeight>0</FitHeight>
          <ValidPrinterInfo/>
        </Print>
      </WorksheetOptions>
    </Worksheet>`;
}

function criarWorksheetResumoExcel(nomeAba, resumo) {
  const colunas = [
    { label: "PROVA", width: 28, align: "left" },
    { label: "CATEGORIA", width: 14, align: "center" },
    { label: "NAIPE", width: 12, align: "center" },
    { label: "FASE", width: 16, align: "center" },
    { label: "TIPO", width: 12, align: "center" },
    { label: "DATA", width: 12, align: "center" },
    { label: "SERIES", width: 10, align: "center" },
    { label: "ATLETAS", width: 10, align: "center" },
  ];

  const linhas = [
    linhaExcelXml([celulaExcelXml("RESUMO DAS SUMULAS OFICIAIS", "Title", { mergeAcross: colunas.length - 1 })], 26),
    linhaExcelXml(colunas.map((coluna) => celulaExcelXml(coluna.label, "Header")), 24),
    ...resumo.map((item) =>
      linhaValoresExcelXml(
        [item.Prova, item.Categoria, item.Naipe, item.Fase, item.Tipo, dataParaTextoExcel(item.Data), item.Series, item.Atletas],
        colunas
      )
    ),
  ];

  return `
    <Worksheet ss:Name="${escaparXmlExcel(nomeAba)}">
      <Table ss:DefaultRowHeight="18">
        ${colunas.map(colunaExcelXml).join("")}
        ${linhas.join("")}
      </Table>
    </Worksheet>`;
}

function montarWorkbookExcelXml(planilhas) {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook
      xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:html="http://www.w3.org/TR/REC-html40">
      ${estilosWorkbookExcelXml()}
      ${planilhas.join("")}
    </Workbook>`;
}

function baixarWorkbookExcelXml(xml, nomeArquivo) {
  const blob = new Blob(["\ufeff" + xml], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function LancamentoOficialTela({
  series,
  provaAtual,
  dataProva,
  ehSaltoAltura,
  ehCampoTentativas,
  ehRevezamento,
  ehCombinada,
  combinadaInfo,
  config,
  datasCombinada,
  pegarValorAltura,
  mudarTentativaAltura,
  mudarCampo,
  calcularResultadoAltura,
  melhorDasTresPrimeiras,
  melhorDasTentativas,
  formatarNascimento,
  onRemoverAtleta,
  onEditarNumero,
}) {
  const subprovasCombinada = [...(combinadaInfo?.subprovas || [])].sort(
    (a, b) => (a?.ordem || 0) - (b?.ordem || 0)
  );

  if (!provaAtual) {
    return null;
  }

  if (!series.length) {
    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Lançamento de resultados</h3>
        <p style={{ color: "#64748b", fontWeight: 700, margin: 0 }}>
          Nenhuma série carregada. Selecione uma prova e clique em “Gerar Séries desta Prova” ou “Recarregar Séries”.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 20, overflowX: "auto" }}>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Lançamento de resultados da súmula oficial</h3>
          <p style={{ color: "#64748b", fontWeight: 700, margin: "4px 0 0" }}>
            Preencha aqui o resultado, colocação e status. Depois clique em “Salvar Rascunho” ou “Publicar no Boletim”.
          </p>
        </div>

        <span
          style={{
            background: "#dbeafe",
            borderRadius: 999,
            color: "#1e3a8a",
            fontWeight: 800,
            padding: "8px 12px",
            whiteSpace: "nowrap",
          }}
        >
          {series.length} série(s) • {series.reduce((total, serie) => total + (serie.raias?.length || 0), 0)} atleta(s)
        </span>
      </div>

      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 12,
          color: "#0f2744",
          fontWeight: 800,
          marginBottom: 14,
          padding: 12,
        }}
      >
        {provaAtual.nome} • {provaAtual.categoria} • {provaAtual.naipe} • {provaAtual.fase || "QUALIFICAÇÃO"} • {dataProva}
      </div>

      {series.map((serie) => {
        if (ehCombinada) {
          return (
            <div key={serie.id + "-combinada-lancamento"} style={{ display: "grid", gap: 16 }}>
              {subprovasCombinada.map((subprova) => (
                <div key={serie.id + "-subprova-lancamento-" + subprova.ordem}>
                  <h4 style={{ margin: "10px 0 8px", color: "#0f2744" }}>
                    {subprova.nome} {subprova.implemento ? "- " + subprova.implemento : ""} • Dia {subprova.dia} • {datasCombinada["dia" + subprova.dia] || "Data a definir"}
                  </h4>
                  <TabelaCombinadaProva
                    serie={serie}
                    subprova={subprova}
                    subprovas={subprovasCombinada}
                    dataSubprova={datasCombinada["dia" + subprova.dia]}
                    mudarCampo={mudarCampo}
                    inputTabela={inputTabelaLancamento}
                    formatarNascimento={formatarNascimento}
                  />
                </div>
              ))}

              <div>
                <h4 style={{ margin: "10px 0 8px", color: "#0f2744" }}>Resultado final da combinada</h4>
                <TabelaCombinadaFinal
                  serie={serie}
                  subprovas={subprovasCombinada}
                  mudarCampo={mudarCampo}
                  inputTabela={inputTabelaLancamento}
                  formatarNascimento={formatarNascimento}
                />
              </div>
            </div>
          );
        }

        return (
          <div key={serie.id} style={{ marginBottom: 18 }}>
            <h4
              style={{
                background: "#e2e8f0",
                borderRadius: "12px 12px 0 0",
                color: "#0f2744",
                margin: 0,
                padding: "10px 12px",
              }}
            >
              Série {serie.numero_serie}
            </h4>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: "0 0 12px 12px", overflowX: "auto" }}>
              {ehSaltoAltura && (
                <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse", minWidth: 980 }}>
                  <thead>
                    <tr>
                      <th rowSpan="2">Nº</th>
                      <th rowSpan="2">Atleta</th>
                      <th rowSpan="2">Escola</th>
                      <th rowSpan="2">Nascimento</th>
                      {(config.alturas_salto_altura || []).map((altura) => (
                        <th key={altura} colSpan="3">{altura}</th>
                      ))}
                      <th rowSpan="2">Resultado</th>
                      <th rowSpan="2">Colocação</th>
                      <th rowSpan="2">Q</th>
                      {onRemoverAtleta && <th rowSpan="2" className="nao-imprimir">Ações</th>}
                    </tr>
                    <tr>
                      {(config.alturas_salto_altura || []).flatMap((altura) => [
                        <th key={`${altura}-t1`}></th>,
                        <th key={`${altura}-t2`}></th>,
                        <th key={`${altura}-t3`}></th>,
                      ])}
                    </tr>
                  </thead>

                  <tbody>
                    {[...(serie.raias || [])]
                      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                      .map((r) => {
                        const atleta = r.inscricoes?.atletas;
                        return (
                          <tr key={r.id}>
                            <td>{atleta?.numero_competicao || atleta?.numero || ""}</td>
                            <td>{atleta?.nome || ""}</td>
                            <td>{atleta?.escolas?.nome || ""}</td>
                            <td>{formatarNascimento(atleta?.data_nascimento)}</td>
                            {(config.alturas_salto_altura || []).flatMap((altura) => {
                              const valor = String(pegarValorAltura(r, altura) || "")
                                .toUpperCase()
                                .padEnd(3, " ");

                              return [
                                <td key={`${r.id}-${altura}-1`}>
                                  <input
                                    value={valor[0].trim()}
                                    onChange={(e) => mudarTentativaAltura(serie.id, r.id, altura, 0, e.target.value)}
                                    style={inputMiniAlturaLancamento}
                                  />
                                </td>,
                                <td key={`${r.id}-${altura}-2`}>
                                  <input
                                    value={valor[1].trim()}
                                    onChange={(e) => mudarTentativaAltura(serie.id, r.id, altura, 1, e.target.value)}
                                    style={inputMiniAlturaLancamento}
                                  />
                                </td>,
                                <td key={`${r.id}-${altura}-3`}>
                                  <input
                                    value={valor[2].trim()}
                                    onChange={(e) => mudarTentativaAltura(serie.id, r.id, altura, 2, e.target.value)}
                                    style={inputMiniAlturaLancamento}
                                  />
                                </td>,
                              ];
                            })}
                            <td>
                              <input
                                value={r.resultado_final || calcularResultadoAltura(r)}
                                onChange={(e) => mudarCampo(serie.id, r.id, "resultado_final", e.target.value)}
                                style={inputTabelaLancamento}
                              />
                            </td>
                            <td>
                              <input
                                value={r.colocacao || ""}
                                onChange={(e) => mudarCampo(serie.id, r.id, "colocacao", e.target.value)}
                                style={inputTabelaLancamento}
                              />
                            </td>
                            <td style={{ fontWeight: "bold", textAlign: "center" }}>{r.qualificacao || ""}</td>
                            {onRemoverAtleta && (
                              <td className="nao-imprimir" style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => onRemoverAtleta({ raia: r, serie })}
                                  title="Remover atleta da série (desistência)"
                                  style={{
                                    background: "#ef4444",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    padding: "6px 10px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                  }}
                                >
                                  Remover
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}

              {ehCampoTentativas && !ehSaltoAltura && !ehRevezamento && (
                <TabelaCampo
                  serie={serie}
                  mudarCampo={mudarCampo}
                  melhorDasTresPrimeiras={melhorDasTresPrimeiras}
                  melhorDasTentativas={melhorDasTentativas}
                  inputTabela={inputTabelaLancamento}
                  formatarNascimento={formatarNascimento}
                  fase={provaAtual?.fase}
                  onRemover={onRemoverAtleta}
                  onEditarNumero={onEditarNumero}
                />
              )}

              {ehRevezamento && !ehSaltoAltura && (
                <TabelaRevezamento
                  serie={serie}
                  mudarCampo={mudarCampo}
                  inputTabela={inputTabelaLancamento}
                  titulares={titularesDoRevezamento(provaAtual)}
                />
              )}

              {!ehCampoTentativas && !ehSaltoAltura && !ehRevezamento && (
                <TabelaPista
                  serie={serie}
                  mudarCampo={mudarCampo}
                  inputTabela={inputTabelaLancamento}
                  formatarNascimento={formatarNascimento}
                  fase={provaAtual?.fase}
                  onRemover={onRemoverAtleta}
                  onEditarNumero={onEditarNumero}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Sumulas() {
  const [mensagem, setMensagem] = useState("");
  const [modoSumula, setModoSumula] = useState("oficial");

  const sumulas = useSumulas();
  const {
    config,
    provas,
    setProvas,
    provaSelecionada,
    setProvaSelecionada,
    carregarProvas,
  } = sumulas;

  const [buscaProva, setBuscaProva] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroNaipe, setFiltroNaipe] = useState("");
  const [filtroFase, setFiltroFase] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [datasCombinada, setDatasCombinada] = useState({ dia1: "", dia2: "" });
  const [sumulasParaImpressao, setSumulasParaImpressao] = useState([]);
  const [imprimindoTodasSumulas, setImprimindoTodasSumulas] = useState(false);
  const [carregandoAcoesLote, setCarregandoAcoesLote] = useState(false);
  const [faseEditadaPorProva, setFaseEditadaPorProva] = useState({});
  const [salvandoFaseId, setSalvandoFaseId] = useState("");

  const seriesState = useSeries({
    provaSelecionada,
    provas,
    config,
    setMensagem,
    carregarProvas,
  });

  const {
    series,
    dataProva,
    setDataProva,
    carregarSeries,
    gerarSeriesDaProva,
    reequilibrarSeries,
    salvarResultados,
    autoSalvarRascunho,
    salvandoResultados,
    classificarAutomaticamente,
    mudarCampo,
    mudarTentativaAltura,
    pegarValorAltura,
    calcularResultadoAltura,
    melhorDasTresPrimeiras,
    melhorDasTentativas,
    hasAlteracoesLocais,
  } = seriesState;

  const sumulaDigital = useSumulaDigital({
    provaSelecionada,
    setMensagem,
  });
  const { carregarSumulaDigital } = sumulaDigital;

  const inscritos = useGerenciarInscritos({
    provaSelecionada,
    provas,
    carregarSeries,
    setMensagem,
    config,
  });

  const proximaFase = useProximaFase({
    provaSelecionada,
    provas,
    series,
    setSeries: seriesState.setSeries,
    config,
    setMensagem,
    carregarProvas,
    melhorDasTentativas,
    calcularResultadoAltura,
  });

  useEffect(() => {
    if (!provaSelecionada) return;

    const intervalId = setInterval(() => {
      if (!hasAlteracoesLocais) {
        carregarSeries(provaSelecionada);
      }
      carregarSumulaDigital(provaSelecionada);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [provaSelecionada, carregarSeries, carregarSumulaDigital, hasAlteracoesLocais]);

  async function selecionarProva(id) {
    setProvaSelecionada(id);
    inscritos.setBuscaAtleta("");
    await carregarSeries(id);
    await carregarSumulaDigital(id);
  }

  function limparFiltros() {
    setBuscaProva("");
    setFiltroCategoria("");
    setFiltroNaipe("");
    setFiltroFase("");
    setFiltroTipo("");
  }

  function alterarFaseProva(provaId, valor) {
    setFaseEditadaPorProva((atual) => ({
      ...atual,
      [provaId]: valor,
    }));
  }

  async function salvarFaseProva(prova) {
    if (!prova?.id) return;

    const fase = normalizarFaseProva(faseEditadaPorProva[prova.id] ?? prova.fase);

    setSalvandoFaseId(prova.id);

    const { error } = await supabase
      .from("provas")
      .update({ fase })
      .eq("id", prova.id);

    setSalvandoFaseId("");

    if (error) {
      setMensagem("Erro ao salvar fase: " + error.message);
      return;
    }

    setProvas((atuais) =>
      atuais.map((item) => (item.id === prova.id ? { ...item, fase } : item))
    );
    setFaseEditadaPorProva((atual) => {
      const copia = { ...atual };
      delete copia[prova.id];
      return copia;
    });
    setMensagem(`Fase da prova atualizada para ${fase}.`);
  }

  function imprimir() {
    window.print();
  }

  async function carregarPacoteSumulasOficiais() {
    if (!provas.length) {
      return [];
    }

    setCarregandoAcoesLote(true);
    setMensagem("Carregando todas as sumulas oficiais...");

    try {
      const idsProvas = provas.map((prova) => prova.id).filter(Boolean);
      const pacote = [];

      const [seriesResp, resultadosResp, sumulasDigitaisResp] = await Promise.all([
        supabase
          .from("series")
          .select("id,prova_id,numero_serie,raias(id,raia,ordem,inscricoes(id,evento_id,atleta_id,atletas(id,numero,numero_competicao,nome,municipio,data_nascimento,escolas(nome))))")
          .in("prova_id", idsProvas)
          .order("numero_serie", { ascending: true }),
        supabase.from("resultados").select("*").in("prova_id", idsProvas),
        supabase
          .from("sumulas_digitais")
          .select("*")
          .in("prova_id", idsProvas)
          .order("criada_em", { ascending: false }),
      ]);

      if (seriesResp.error) {
        throw new Error("Erro ao carregar series: " + seriesResp.error.message);
      }

      if (resultadosResp.error) {
        throw new Error("Erro ao carregar resultados: " + resultadosResp.error.message);
      }

      if (sumulasDigitaisResp.error) {
        throw new Error("Erro ao carregar sumulas digitais: " + sumulasDigitaisResp.error.message);
      }

      const seriesPorProva = new Map();
      (seriesResp.data || []).forEach((serie) => {
        const chave = String(serie.prova_id);
        const lista = seriesPorProva.get(chave) || [];
        lista.push(serie);
        seriesPorProva.set(chave, lista);
      });

      const resultadosPorProva = new Map();
      (resultadosResp.data || []).forEach((resultado) => {
        const chave = String(resultado.prova_id);
        const lista = resultadosPorProva.get(chave) || [];
        lista.push(resultado);
        resultadosPorProva.set(chave, lista);
      });

      const sumulaDigitalAtivaPorProva = new Map();
      (sumulasDigitaisResp.data || []).forEach((sumula) => {
        const chave = String(sumula.prova_id);
        if (!STATUS_SUMULA_DIGITAL_ATIVA.has(sumula.status) || sumulaDigitalAtivaPorProva.has(chave)) {
          return;
        }

        sumulaDigitalAtivaPorProva.set(chave, sumula);
      });

      const idsSumulasAtivas = [...sumulaDigitalAtivaPorProva.values()].map((sumula) => sumula.id).filter(Boolean);
      const resultadosDigitaisPorSumula = new Map();

      if (idsSumulasAtivas.length) {
        const { data: resultadosDigitais, error: erroDigitais } = await supabase
          .from("sumula_resultados")
          .select("sumula_id,atleta_id,tempo,marca,resultado,observacao,classificacao")
          .in("sumula_id", idsSumulasAtivas);

        if (erroDigitais) {
          throw new Error("Erro ao carregar resultados digitais: " + erroDigitais.message);
        }

        (resultadosDigitais || []).forEach((resultado) => {
          const chave = String(resultado.sumula_id);
          const lista = resultadosDigitaisPorSumula.get(chave) || [];
          lista.push(resultado);
          resultadosDigitaisPorSumula.set(chave, lista);
        });
      }

      for (const prova of provas) {
        const chaveProva = String(prova.id);
        const seriesBase = seriesPorProva.get(chaveProva) || [];
        const resultadosSalvos = resultadosPorProva.get(chaveProva) || [];
        const sumulaDigitalAtiva = sumulaDigitalAtivaPorProva.get(chaveProva);
        const resultadosDigitais = sumulaDigitalAtiva?.id
          ? resultadosDigitaisPorSumula.get(String(sumulaDigitalAtiva.id)) || []
          : [];

        const seriesTratadas = aplicarResultadosNasSeries(
          seriesBase || [],
          resultadosSalvos || [],
          resultadosDigitais
        );

        const totalAtletas = seriesTratadas.reduce(
          (total, serie) => total + (serie.raias?.length || 0),
          0
        );

        if (!totalAtletas) continue;

        const dataDaProva = primeiroResultadoComData(resultadosSalvos) || dataProva;
        const ehCombinadaItem = provaEhCombinadaOficial(prova);

        pacote.push({
          prova,
          series: seriesTratadas,
          dataProva: dataDaProva,
          ehCombinada: ehCombinadaItem,
          ehSaltoAltura: provaEhSaltoAlturaOficial(prova),
          ehRevezamento: provaEhRevezamentoOficial(prova),
          ehCampoTentativas: provaEhCampoTentativasOficial(prova),
          combinadaInfo: ehCombinadaItem
            ? buscarCombinadaPorCategoriaNaipe(prova?.categoria, prova?.naipe)
            : null,
          datasCombinada: ehCombinadaItem
            ? montarDatasCombinadaLote(prova.id, dataDaProva)
            : { dia1: "", dia2: "" },
        });
      }

      return pacote;
    } finally {
      setCarregandoAcoesLote(false);
    }
  }

  async function imprimirTodasSumulasOficiais() {
    try {
      const pacote = await carregarPacoteSumulasOficiais();

      if (!pacote.length) {
        setMensagem("Nenhuma sumula com series foi encontrada para imprimir.");
        return;
      }

      setSumulasParaImpressao(pacote);
      setImprimindoTodasSumulas(true);
      setMensagem(`Pacote pronto: ${pacote.length} prova(s) carregada(s) para impressao.`);
    } catch (erro) {
      setMensagem(erro.message || "Erro ao carregar todas as sumulas.");
    }
  }

  async function exportarTodasSumulasExcel() {
    try {
      const pacote = await carregarPacoteSumulasOficiais();

      const resumo = pacote.map((item) => ({
        Prova: item.prova?.nome || "",
        Categoria: item.prova?.categoria || "",
        Naipe: item.prova?.naipe || "",
        Fase: item.prova?.fase || "QUALIFICACAO",
        Tipo: item.prova?.subtipo || item.prova?.tipo || "",
        Data: item.dataProva || "",
        Series: item.series.length,
        Atletas: item.series.reduce((total, serie) => total + (serie.raias?.length || 0), 0),
      }));

      const planilhas = [criarWorksheetResumoExcel("Resumo", resumo)];
      const nomesUsados = new Set(["RESUMO"]);
      let totalLinhas = 0;

      pacote.forEach((item) => {
        const totalAtletasDaProva = item.series.reduce((total, serie) => total + (serie.raias?.length || 0), 0);
        if (!totalAtletasDaProva) return;

        totalLinhas += totalAtletasDaProva;
        const nomeAba = nomeAbaExcelUnico(item, nomesUsados);

        planilhas.push(
          criarWorksheetSumulaExcel(nomeAba, item, {
            config,
            formatarNascimento,
            melhorDasTresPrimeiras,
            melhorDasTentativas,
          })
        );
      });

      if (!totalLinhas) {
        setMensagem("Nenhuma linha de sumula foi encontrada para exportar.");
        return;
      }

      baixarWorkbookExcelXml(
        montarWorkbookExcelXml(planilhas),
        `sumulas-oficiais-modelo-${dataParaArquivo()}.xls`
      );

      setMensagem(
        `Excel gerado em formato de sumula, com ${totalLinhas} atleta(s) em ${planilhas.length - 1} aba(s) de prova.`
      );
    } catch (erro) {
      setMensagem(erro.message || "Erro ao exportar sumulas para Excel.");
    }
  }

  useEffect(() => {
    if (!imprimindoTodasSumulas || !sumulasParaImpressao.length) return undefined;

    const id = window.setTimeout(() => {
      window.print();
    }, 350);

    return () => window.clearTimeout(id);
  }, [imprimindoTodasSumulas, sumulasParaImpressao]);

  useEffect(() => {
    function limparImpressaoEmLote() {
      setImprimindoTodasSumulas(false);
    }

    window.addEventListener("afterprint", limparImpressaoEmLote);
    return () => window.removeEventListener("afterprint", limparImpressaoEmLote);
  }, []);

  const provaAtual = useMemo(
    () => provas.find((p) => p.id === provaSelecionada),
    [provas, provaSelecionada]
  );

  const nomeProvaAtual = String(provaAtual?.nome || "").toUpperCase();

  const ehCombinada = provaAtual?.tipo === "combinada" || ehProvaCombinada(provaAtual?.nome);
  const combinadaInfo = ehCombinada
    ? buscarCombinadaPorCategoriaNaipe(provaAtual?.categoria, provaAtual?.naipe)
    : null;

  useEffect(() => {
    const id = window.setTimeout(() => {
    if (!provaSelecionada || !ehCombinada) {
      setDatasCombinada({ dia1: "", dia2: "" });
      return;
    }

    const chave = "sumula-combinada-datas-" + provaSelecionada;

    try {
      const salvo = window.localStorage.getItem(chave);
      if (salvo) {
        const datas = JSON.parse(salvo);
        setDatasCombinada({ dia1: datas.dia1 || dataProva || "", dia2: datas.dia2 || "" });
        return;
      }
    } catch {
      // Se o navegador bloquear o localStorage, a tela continua usando as datas em memoria.
    }

    setDatasCombinada({ dia1: dataProva || "", dia2: "" });
    }, 0);

    return () => window.clearTimeout(id);
  }, [provaSelecionada, ehCombinada, dataProva]);

  function atualizarDataCombinada(campo, valor) {
    setDatasCombinada((atual) => {
      const novasDatas = { ...atual, [campo]: valor };

      if (provaSelecionada && ehCombinada) {
        try {
          window.localStorage.setItem(
            "sumula-combinada-datas-" + provaSelecionada,
            JSON.stringify(novasDatas)
          );
        } catch {
          // Mantem a alteracao em tela mesmo se o navegador nao permitir salvar localmente.
        }
      }

      return novasDatas;
    });
  }

  const ehRevezamento =
    provaAtual?.tipo === "revezamento" ||
    provaAtual?.subtipo === "revezamento" ||
    nomeProvaAtual.includes("REVEZAMENTO") ||
    nomeProvaAtual.includes("4X100") ||
    nomeProvaAtual.includes("4 X 100") ||
    nomeProvaAtual.includes("5X80") ||
    nomeProvaAtual.includes("5 X 80") ||
    nomeProvaAtual.includes("4X400") ||
    nomeProvaAtual.includes("4 X 400");

  const ehSaltoAltura =
    provaAtual?.subtipo === "salto_altura" ||
    nomeProvaAtual.includes("SALTO EM ALTURA");

  const ehCampoTentativas =
    !ehCombinada &&
    !ehSaltoAltura &&
    !ehRevezamento &&
    (provaAtual?.tipo === "campo" ||
      provaAtual?.subtipo === "campo_tentativas" ||
      nomeProvaAtual.includes("ARREMESSO") ||
      nomeProvaAtual.includes("LANCAMENTO") ||
      nomeProvaAtual.includes("SALTO EM DISTANCIA") ||
      nomeProvaAtual.includes("SALTO TRIPLO") ||
      nomeProvaAtual.includes("DARDO") ||
      nomeProvaAtual.includes("DISCO") ||
      nomeProvaAtual.includes("MARTELO") ||
      nomeProvaAtual.includes("PESO"));

  const categorias = [...new Set(provas.map((p) => p.categoria).filter(Boolean))];
  const naipes = [...new Set(provas.map((p) => p.naipe).filter(Boolean))];
  const fases = [...new Set([...FASES_PROVA_PADRAO, ...provas.map((p) => p.fase || "QUALIFICACAO")])];
  const tipos = [...new Set(provas.map((p) => p.subtipo || p.tipo).filter(Boolean))];

  const provasFiltradas = provas.filter((p) => {
    const fase = p.fase || "QUALIFICACAO";
    const tipo = p.subtipo || p.tipo || "";
    const texto = `${p.nome} ${p.categoria} ${p.naipe} ${fase} ${tipo}`.toLowerCase();

    return (
      texto.includes(buscaProva.toLowerCase()) &&
      (!filtroCategoria || p.categoria === filtroCategoria) &&
      (!filtroNaipe || p.naipe === filtroNaipe) &&
      (!filtroFase || fase === filtroFase) &&
      (!filtroTipo || tipo === filtroTipo)
    );
  });

  return (
    <div>
      <div className="nao-imprimir">
        <h1>Sumulas</h1>
        <p className="muted">Controle completo da prova em uma unica tela.</p>

        <div className="card" style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button
            onClick={() => setModoSumula("oficial")}
            style={{
              background: modoSumula === "oficial" ? "#22c55e" : "#e2e8f0",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: "bold",
              padding: "12px 18px",
            }}
          >
            Sumula oficial
          </button>

          <button
            onClick={() => setModoSumula("manual")}
            style={{
              background: modoSumula === "manual" ? "#22c55e" : "#e2e8f0",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: "bold",
              padding: "12px 18px",
            }}
          >
            Sumula manual
          </button>
        </div>

        {modoSumula === "oficial" && (
          <>
        <EtapaSelecaoProva
          buscaProva={buscaProva}
          setBuscaProva={setBuscaProva}
          filtroCategoria={filtroCategoria}
          setFiltroCategoria={setFiltroCategoria}
          filtroNaipe={filtroNaipe}
          setFiltroNaipe={setFiltroNaipe}
          filtroFase={filtroFase}
          setFiltroFase={setFiltroFase}
          filtroTipo={filtroTipo}
          setFiltroTipo={setFiltroTipo}
          categorias={categorias}
          naipes={naipes}
          fases={fases}
          tipos={tipos}
          limparFiltros={limparFiltros}
          provasFiltradas={provasFiltradas}
          provaSelecionada={provaSelecionada}
          selecionarProva={selecionarProva}
          gerarSeriesDaProva={gerarSeriesDaProva}
          reequilibrarSeries={reequilibrarSeries}
          carregarSeries={carregarSeries}
          abrirGerenciarInscritos={inscritos.abrirGerenciarInscritos}
          mostrarGerenciarInscritos={inscritos.mostrarGerenciarInscritos}
          sumulaDigital={sumulaDigital.sumulaDigital}
          sumulasDigitais={sumulaDigital.sumulasDigitais}
          tokenMensagem={sumulaDigital.tokenMensagem}
          linkArbitro={sumulaDigital.linkArbitro}
          gerarSumulaDigital={sumulaDigital.gerarSumulaDigital}
          bloquearSumulaDigital={sumulaDigital.bloquearSumulaDigital}
          reabrirSumulaDigital={sumulaDigital.reabrirSumulaDigital}
          setTokenMensagem={sumulaDigital.setTokenMensagem}
          inscricoesProva={inscritos.inscricoesProva}
          buscaAtleta={inscritos.buscaAtleta}
          setBuscaAtleta={inscritos.setBuscaAtleta}
          atletasEncontrados={inscritos.atletasEncontrados}
          buscarAtletas={inscritos.buscarAtletas}
          adicionarAtletaNaProva={inscritos.adicionarAtletaNaProva}
          removerInscricaoDaProva={inscritos.removerInscricaoDaProva}
          substituirInscricaoDaProva={inscritos.substituirInscricaoDaProva}
          criarAtletaESubstituir={inscritos.criarAtletaESubstituir}
          carregandoInscritos={inscritos.carregandoInscritos}
          dataProva={dataProva}
          setDataProva={setDataProva}
          faseEditadaPorProva={faseEditadaPorProva}
          alterarFaseProva={alterarFaseProva}
          salvarFaseProva={salvarFaseProva}
          salvandoFaseId={salvandoFaseId}
        />

        <EtapaLancamento
          salvarResultados={salvarResultados}
          classificarAutomaticamente={classificarAutomaticamente}
          imprimir={imprimir}
          salvandoResultados={salvandoResultados}
        />

        {provaSelecionada && series.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>Faltou alguém na súmula?</h3>
            <p style={{ color: "#64748b", fontWeight: 700, marginTop: 0 }}>
              Cadastre um atleta que não está na lista e adicione direto numa série, sem regerar as séries.
            </p>
            <button
              onClick={() => {
                inscritos.setEscolasEncontradas?.([]);
                inscritos.setMostrarAcrescentarAtleta(true);
              }}
              style={{
                background: "#a78bfa",
                border: "none",
                borderRadius: 10,
                color: "#1e1b4b",
                cursor: "pointer",
                fontWeight: "bold",
                padding: "12px 18px",
              }}
            >
              + Acrescentar atleta na súmula
            </button>
          </div>
        )}

        {inscritos.mostrarAcrescentarAtleta && (
          <AcrescentarAtleta
            series={series}
            escolasEncontradas={inscritos.escolasEncontradas}
            buscarEscolas={inscritos.buscarEscolas}
            acrescentarAtletaNaSerie={inscritos.acrescentarAtletaNaSerie}
            onFechar={() => inscritos.setMostrarAcrescentarAtleta(false)}
          />
        )}

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Acoes em lote das sumulas oficiais</h3>
          <p style={{ color: "#64748b", fontWeight: 700, marginTop: 0 }}>
            Le as series e resultados oficiais ja salvos para imprimir tudo de uma vez ou baixar uma copia em Excel.
          </p>

          <button
            onClick={imprimirTodasSumulasOficiais}
            disabled={carregandoAcoesLote}
            style={{
              background: "#0ea5e9",
              border: "none",
              borderRadius: 10,
              color: "#020617",
              cursor: carregandoAcoesLote ? "not-allowed" : "pointer",
              fontWeight: "bold",
              marginRight: 10,
              marginBottom: 10,
              opacity: carregandoAcoesLote ? 0.65 : 1,
              padding: "12px 18px",
            }}
          >
            {carregandoAcoesLote ? "Carregando..." : "Imprimir todas as sumulas"}
          </button>

          <button
            onClick={exportarTodasSumulasExcel}
            disabled={carregandoAcoesLote}
            style={{
              background: "#22c55e",
              border: "none",
              borderRadius: 10,
              color: "#020617",
              cursor: carregandoAcoesLote ? "not-allowed" : "pointer",
              fontWeight: "bold",
              marginBottom: 10,
              opacity: carregandoAcoesLote ? 0.65 : 1,
              padding: "12px 18px",
            }}
          >
            Exportar sumulas para Excel
          </button>
        </div>

        <div
          onBlur={(e) => {
            // Auto-save ao sair de um campo de input/select (nao dispara ao
            // navegar entre elementos que nao sao campos).
            const tag = e.target?.tagName;
            if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
              autoSalvarRascunho?.();
            }
          }}
        >
          <LancamentoOficialTela
            series={series}
            provaAtual={provaAtual}
            dataProva={dataProva}
            ehSaltoAltura={ehSaltoAltura}
            ehCampoTentativas={ehCampoTentativas}
            ehRevezamento={ehRevezamento}
            ehCombinada={ehCombinada}
            combinadaInfo={combinadaInfo}
            config={config}
            datasCombinada={datasCombinada}
            pegarValorAltura={pegarValorAltura}
            mudarTentativaAltura={mudarTentativaAltura}
            mudarCampo={mudarCampo}
            calcularResultadoAltura={calcularResultadoAltura}
            melhorDasTresPrimeiras={melhorDasTresPrimeiras}
            melhorDasTentativas={melhorDasTentativas}
            formatarNascimento={formatarNascimento}
            onRemoverAtleta={inscritos.removerAtletaDaSerie}
            onEditarNumero={inscritos.atualizarNumeroAtleta}
          />
        </div>

        {ehCombinada && combinadaInfo && (
          <div className="card combinada-datas-card" style={{ marginBottom: 20 }}>
            <h3>Datas da combinada</h3>

            <div className="combinada-datas-grid">
              <label>
                Dia 1
                <input
                  type="date"
                  value={datasCombinada.dia1 || ""}
                  onChange={(e) => atualizarDataCombinada("dia1", e.target.value)}
                />
              </label>

              <label>
                Dia 2
                <input
                  type="date"
                  value={datasCombinada.dia2 || ""}
                  onChange={(e) => atualizarDataCombinada("dia2", e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        <EtapaProximaFase
          mostrarProximaFase={proximaFase.mostrarProximaFase}
          setMostrarProximaFase={proximaFase.setMostrarProximaFase}
          tipoProximaFase={proximaFase.tipoProximaFase}
          setTipoProximaFase={proximaFase.setTipoProximaFase}
          raiasProximaFase={proximaFase.raiasProximaFase}
          setRaiasProximaFase={proximaFase.setRaiasProximaFase}
          regraSugeridaProximaFase={proximaFase.regraSugeridaProximaFase}
          totalSeriesDetectadas={proximaFase.totalSeriesDetectadas}
          faseBotao={proximaFase.faseBotao}
          montarPreviewProximaFase={proximaFase.montarPreviewProximaFase}
          gerarProximaFase={proximaFase.gerarProximaFase}
          previewProximaFase={proximaFase.previewProximaFase}
          mostrarAvancadoProximaFase={proximaFase.mostrarAvancadoProximaFase}
          setMostrarAvancadoProximaFase={proximaFase.setMostrarAvancadoProximaFase}
          criterioClassificacao={proximaFase.criterioClassificacao}
          setCriterioClassificacao={proximaFase.setCriterioClassificacao}
          qAutomaticos={proximaFase.qAutomaticos}
          setQAutomaticos={proximaFase.setQAutomaticos}
          qTempos={proximaFase.qTempos}
          setQTempos={proximaFase.setQTempos}
          quantidadeClassificados={proximaFase.quantidadeClassificados}
          setQuantidadeClassificados={proximaFase.setQuantidadeClassificados}
          setRegraPreviewProximaFase={proximaFase.setRegraPreviewProximaFase}
          statusBoletimProximaFase={proximaFase.statusBoletimProximaFase}
        />

        {mensagem && (
          <div className="card" style={{ marginBottom: 20 }}>
            {mensagem}
          </div>
        )}
          </>
        )}
      </div>

      {modoSumula === "manual" && (
        <SumulaManual config={config} imprimir={imprimir} />
      )}

      {modoSumula === "oficial" && !imprimindoTodasSumulas && (
        <SumulaImpressao
          series={series}
          ehSaltoAltura={ehSaltoAltura}
          ehCampoTentativas={ehCampoTentativas}
          ehRevezamento={ehRevezamento}
          ehCombinada={ehCombinada}
          combinadaInfo={combinadaInfo}
          config={config}
          provaAtual={provaAtual}
          dataProva={dataProva}
          datasCombinada={datasCombinada}
          pegarValorAltura={pegarValorAltura}
          mudarTentativaAltura={mudarTentativaAltura}
          mudarCampo={mudarCampo}
          calcularResultadoAltura={calcularResultadoAltura}
          melhorDasTresPrimeiras={melhorDasTresPrimeiras}
          melhorDasTentativas={melhorDasTentativas}
          formatarNascimento={formatarNascimento}
        />
      )}

      {modoSumula === "oficial" && imprimindoTodasSumulas && (
        <>
          {sumulasParaImpressao.map((item) => (
            <SumulaImpressao
              key={item.prova?.id}
              series={item.series}
              ehSaltoAltura={item.ehSaltoAltura}
              ehCampoTentativas={item.ehCampoTentativas}
              ehRevezamento={item.ehRevezamento}
              ehCombinada={item.ehCombinada}
              combinadaInfo={item.combinadaInfo}
              config={config}
              provaAtual={item.prova}
              dataProva={item.dataProva}
              datasCombinada={item.datasCombinada}
              pegarValorAltura={pegarValorAltura}
              mudarTentativaAltura={() => {}}
              mudarCampo={() => {}}
              calcularResultadoAltura={calcularResultadoAltura}
              melhorDasTresPrimeiras={melhorDasTresPrimeiras}
              melhorDasTentativas={melhorDasTentativas}
              formatarNascimento={formatarNascimento}
            />
          ))}
        </>
      )}
    </div>
  );
}