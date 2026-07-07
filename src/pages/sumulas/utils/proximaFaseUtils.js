import { marcaParaNumero, tempoParaNumero } from "./formatadores";

function contarSeriesComAtletas(series = []) {
  return (series || []).filter((serie) => (serie.raias || []).length > 0).length;
}

function totalAtletasNasSeries(series = []) {
  return (series || []).reduce(
    (total, serie) => total + (serie.raias || []).filter((r) => r.inscricoes?.id).length,
    0
  );
}

function provaEhPista(prova) {
  return prova?.tipo === "corrida" || prova?.subtipo === "pista";
}

export function formatarValorClassificacao(item) {
  return item.tempo || item.melhor_marca || item.resultado_final || item.valorClassificacao || "-";
}

function multiplicadorSeriesDaFase(fase) {
  const faseNormalizada = String(fase || "FINAL").toUpperCase();
  if (faseNormalizada.includes("QUARTAS")) return 4;
  if (faseNormalizada.includes("SEMIFINAL")) return 2;
  return 1;
}

export function calcularRegraAutomaticaProximaFase(series = [], raiasProximaFase = 8, faseProxima = "FINAL", opcoes = {}) {
  const totalSeries = contarSeriesComAtletas(series);
  const totalRaias = Math.max(1, Number(raiasProximaFase) || 8);
  const totalAtletas = totalAtletasNasSeries(series);

  // CAMPO: a final e uma serie unica com os N melhores da classificacao geral
  // (N configuravel, default 8). Nao usa raias nem "q por serie".
  if (opcoes.ehCampo) {
    const finalistas = Math.max(1, Number(opcoes.finalistasCampo) || 8);
    const totalClassificados = Math.min(finalistas, Math.max(totalAtletas, 0) || finalistas);
    return {
      criterio: "melhores_gerais",
      qPorSerie: 0,
      qPorTempo: 0,
      totalClassificados,
      raias: 1,
      totalSeries: 1,
      ehCampo: true,
      descricao: `Final de campo: ${totalClassificados} melhores em serie unica (mais 3 tentativas).`,
      aviso: "",
    };
  }

  const totalVagasDaFase = totalRaias * multiplicadorSeriesDaFase(faseProxima);
  const totalClassificados = Math.min(totalVagasDaFase, Math.max(totalAtletas, 0) || totalVagasDaFase);

  if (totalSeries <= 0) {
    return {
      criterio: "q_q",
      qPorSerie: 0,
      qPorTempo: totalClassificados,
      totalClassificados,
      raias: totalRaias,
      totalSeries,
      descricao: "Gere ou carregue as series para o sistema sugerir a regra.",
      aviso: "Nenhuma serie carregada.",
    };
  }

  if (totalSeries === 1) {
    return {
      criterio: "melhores_gerais",
      qPorSerie: 0,
      qPorTempo: 0,
      totalClassificados,
      raias: totalRaias,
      totalSeries,
      descricao: `Melhores resultados gerais ate ${totalClassificados} atleta(s).`,
      aviso: "",
    };
  }

  if (totalSeries > totalClassificados) {
    return {
      criterio: "melhores_gerais",
      qPorSerie: 0,
      qPorTempo: 0,
      totalClassificados,
      raias: totalRaias,
      totalSeries,
      descricao: `${totalSeries} series para ${totalClassificados} vaga(s). Criterio sugerido: melhores resultados gerais.`,
      aviso: "Ha mais series do que vagas. Nao e possivel garantir 1 classificado por serie.",
    };
  }

  let qPorSerie = 1;
  let qPorTempo = 0;
  let criterio = "q_q";

  if (multiplicadorSeriesDaFase(faseProxima) === 1 && totalRaias === 8) {
    const regras8 = {
      2: { qPorSerie: 3, qPorTempo: 2 },
      3: { qPorSerie: 2, qPorTempo: 2 },
      4: { qPorSerie: 1, qPorTempo: 4 },
      5: { qPorSerie: 1, qPorTempo: 3 },
      6: { qPorSerie: 1, qPorTempo: 2 },
      7: { qPorSerie: 1, qPorTempo: 1 },
      8: { qPorSerie: 1, qPorTempo: 0 },
    };

    const regraTabela = regras8[totalSeries];
    if (regraTabela) {
      qPorSerie = regraTabela.qPorSerie;
      qPorTempo = regraTabela.qPorTempo;
    }
  } else {
    const vagasPorSerie = Math.floor(totalClassificados / totalSeries);
    const faseComMultiplasSeries = multiplicadorSeriesDaFase(faseProxima) > 1;

    qPorSerie = faseComMultiplasSeries
      ? Math.max(1, vagasPorSerie - 1)
      : Math.max(1, vagasPorSerie);
    qPorTempo = Math.max(0, totalClassificados - qPorSerie * totalSeries);
  }

  let classificadosDiretos = qPorSerie * totalSeries;
  if (classificadosDiretos > totalClassificados) {
    qPorSerie = Math.max(0, Math.floor(totalClassificados / totalSeries));
    classificadosDiretos = qPorSerie * totalSeries;
    qPorTempo = Math.max(0, totalClassificados - classificadosDiretos);
  }

  if (qPorSerie <= 0) {
    criterio = "melhores_gerais";
    qPorTempo = 0;
  }

  return {
    criterio,
    qPorSerie,
    qPorTempo,
    totalClassificados,
    raias: totalRaias,
    totalSeries,
    descricao:
      criterio === "melhores_gerais"
        ? `Melhores resultados gerais ate ${totalClassificados} atleta(s).`
        : `${qPorSerie} Q por serie + ${qPorTempo} q por tempo/marca.`,
    aviso: "",
  };
}

export function obterRankingParaProximaFase(series = [], provaAtual, opcoes = {}) {
  const {
    melhorDasTentativasFn,
    calcularResultadoAlturaFn,
  } = opcoes;

  const todos = [];

  // Deteccao robusta do tipo de prova (subtipo pode variar: campo_tentativas,
  // salto, arremesso, lancamento, ou tipo === "campo").
  const tipoProva = String(provaAtual?.tipo || "").toLowerCase();
  const subtipoProva = String(provaAtual?.subtipo || "").toLowerCase();
  const nomeProva = String(provaAtual?.nome || "").toLowerCase();
  const ehSaltoAltura = subtipoProva.includes("salto_altura") || nomeProva.includes("salto em altura");
  const ehCampoTentativas =
    !ehSaltoAltura &&
    (tipoProva === "campo" ||
      subtipoProva.includes("campo") ||
      subtipoProva.includes("arremesso") ||
      subtipoProva.includes("lancamento") ||
      subtipoProva.includes("lançamento") ||
      subtipoProva.includes("salto") ||
      nomeProva.includes("arremesso") ||
      nomeProva.includes("lancamento") ||
      nomeProva.includes("lançamento") ||
      nomeProva.includes("salto em distancia") ||
      nomeProva.includes("salto em distância") ||
      nomeProva.includes("salto triplo"));

  (series || []).forEach((serie) => {
    (serie.raias || []).forEach((r) => {
      if (!r.inscricoes?.id || !r.inscricoes?.atleta_id) return;

      let valor;

      if (ehCampoTentativas) {
        valor = marcaParaNumero(r.melhor_marca || (melhorDasTentativasFn ? melhorDasTentativasFn(r) : ""));
        // No campo, se tem colocacao preenchida, entra mesmo sem marca legivel.
        const colBruta = String(r.colocacao ?? r.colocacao_final ?? r.classificacao ?? "").replace(/[^\d]/g, "");
        const temColocacao = parseInt(colBruta, 10) > 0;
        if ((valor === null || valor === 999999) && !temColocacao) return;
        if (valor === null || valor === 999999) valor = 0; // placeholder; ordena pela colocacao
      } else if (ehSaltoAltura) {
        valor = marcaParaNumero(r.resultado_final || (calcularResultadoAlturaFn ? calcularResultadoAlturaFn(r) : ""));
        if (valor === null || valor === 999999) return;
      } else {
        if (r.status !== "OK") return;
        valor = r.tempo ? tempoParaNumero(r.tempo) : null;
        if (valor === null || valor === 999999) return;
      }

      todos.push({
        ...r,
        valorClassificacao: valor,
        serieNumero: serie.numero_serie,
      });
    });
  });

  if (provaEhPista(provaAtual)) {
    return todos.sort((a, b) => a.valorClassificacao - b.valorClassificacao);
  }

  // Le a colocacao removendo sufixos como "º" (ex.: "10º" -> 10)
  const colocacaoNumero = (r) => {
    const bruta = r?.colocacao ?? r?.colocacao_final ?? r?.classificacao ?? "";
    const limpo = String(bruta).replace(/[^\d]/g, "");
    const n = parseInt(limpo, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // CAMPO: respeita a COLOCACAO ja preenchida na sumula (col.). Pega quem esta
  // em 1o, 2o, 3o... exatamente como aparece na tela. So cai para a marca se
  // a colocacao nao estiver definida (empate/sem colocacao).
  return todos.sort((a, b) => {
    const colA = colocacaoNumero(a);
    const colB = colocacaoNumero(b);

    if (colA && colB) return colA - colB; // 1o antes de 2o...
    if (colA && !colB) return -1;
    if (!colA && colB) return 1;
    return b.valorClassificacao - a.valorClassificacao;
  });
}

export function selecionarClassificados(ranking = [], regra, provaAtual) {
  const qtdTotal = Number(regra?.totalClassificados || 0);
  const qtdQ = Number(regra?.qPorSerie || 0);
  const qtdq = Number(regra?.qPorTempo || 0);
  const criterio = regra?.criterio || "q_q";
  const ehPista = provaEhPista(provaAtual);

  if (!ranking.length) return [];

  if (criterio === "melhores_gerais" || qtdQ <= 0) {
    return ranking.slice(0, qtdTotal).map((r) => ({ ...r, qualificacao: "q" }));
  }

  const classificados = [];
  const restantes = [];
  const porSerie = {};

  ranking.forEach((r) => {
    if (!porSerie[r.serieNumero]) porSerie[r.serieNumero] = [];
    porSerie[r.serieNumero].push(r);
  });

  Object.values(porSerie).forEach((listaSerie) => {
    const ordenadosDaSerie = [...listaSerie].sort((a, b) => {
      const ca = Number(a.colocacao || 9999);
      const cb = Number(b.colocacao || 9999);

      if (ca !== cb) return ca - cb;

      return ehPista
        ? a.valorClassificacao - b.valorClassificacao
        : b.valorClassificacao - a.valorClassificacao;
    });

    ordenadosDaSerie.forEach((r, index) => {
      if (index < qtdQ && classificados.length < qtdTotal) {
        classificados.push({ ...r, qualificacao: "Q" });
      } else {
        restantes.push(r);
      }
    });
  });

  restantes
    .sort((a, b) =>
      ehPista
        ? a.valorClassificacao - b.valorClassificacao
        : b.valorClassificacao - a.valorClassificacao
    )
    .slice(0, Math.max(0, qtdq))
    .forEach((r) => {
      if (classificados.length < qtdTotal) {
        classificados.push({ ...r, qualificacao: "q" });
      }
    });

  if (classificados.length < qtdTotal) {
    const jaSelecionados = new Set(classificados.map((r) => r.id));

    ranking
      .filter((r) => !jaSelecionados.has(r.id))
      .sort((a, b) =>
        ehPista
          ? a.valorClassificacao - b.valorClassificacao
          : b.valorClassificacao - a.valorClassificacao
      )
      .slice(0, qtdTotal - classificados.length)
      .forEach((r) => {
        classificados.push({ ...r, qualificacao: "q" });
      });
  }

  return classificados.slice(0, qtdTotal || classificados.length);
}

export function aplicarQualificacaoEmSeries(series = [], classificados = []) {
  const mapa = {};

  classificados.forEach((c) => {
    mapa[c.id] = c.qualificacao;
  });

  return (series || []).map((serie) => ({
    ...serie,
    raias: (serie.raias || []).map((r) => ({
      ...r,
      qualificacao: mapa[r.id] || "",
    })),
  }));
}

export function ordenarClassificadosParaRaias(classificados = [], provaAtual) {
  const ehPista = provaEhPista(provaAtual);

  return [...classificados].sort((a, b) => {
    if (a.qualificacao !== b.qualificacao) {
      if (a.qualificacao === "Q") return -1;
      if (b.qualificacao === "Q") return 1;
    }

    const valorA = Number(a.valorClassificacao || 999999);
    const valorB = Number(b.valorClassificacao || 999999);

    if (valorA !== valorB) {
      return ehPista ? valorA - valorB : valorB - valorA;
    }

    const colocacaoA = Number(a.colocacao || 9999);
    const colocacaoB = Number(b.colocacao || 9999);

    return colocacaoA - colocacaoB;
  });
}

export function validarDadosParaProximaFase({ provaSelecionada, series = [], ranking = [] }) {
  if (!provaSelecionada) return "Selecione uma prova primeiro.";
  if (!series.length) return "Gere ou carregue as series da prova antes de gerar a proxima fase.";
  if (!ranking.length) return "Nenhum resultado valido encontrado. Lance os tempos/marcas antes de gerar a proxima fase.";

  const algumResultado = series.some((serie) =>
    (serie.raias || []).some(
      (r) =>
        r.tempo ||
        r.melhor_marca ||
        r.resultado_final ||
        r.tentativa1 ||
        r.tentativa2 ||
        r.tentativa3 ||
        r.tentativa4 ||
        r.tentativa5 ||
        r.tentativa6
    )
  );

  if (!algumResultado) {
    return "Preencha os tempos/marcas da fase atual antes de gerar a proxima fase.";
  }

  const algumaClassificacao = series.some((serie) =>
    (serie.raias || []).some(
      (r) => r.colocacao || r.classificacao_parcial || r.classificacao_parcial_final || r.qualificacao
    )
  );

  if (!algumaClassificacao) {
    return "Clique em Classificar e confira as colocacoes antes de gerar a proxima fase.";
  }

  return "";
}

export function raiaOficialPorSeed(posicao, totalRaias) {
  const ordem8 = [4, 5, 3, 6, 2, 7, 1, 8];
  const ordem9 = [5, 6, 4, 7, 3, 8, 2, 9, 1];
  const ordem10 = [5, 6, 4, 7, 3, 8, 2, 9, 1, 10];

  if (Number(totalRaias) === 8) return ordem8[posicao] || posicao + 1;
  if (Number(totalRaias) === 9) return ordem9[posicao] || posicao + 1;
  if (Number(totalRaias) === 10) return ordem10[posicao] || posicao + 1;
  return posicao + 1;
}

export function distribuirEmSeriesBalanceadas(classificadosOrdenados, totalSeries) {
  const grupos = Array.from({ length: totalSeries }, () => []);

  (classificadosOrdenados || []).forEach((atleta, index) => {
    const bloco = Math.floor(index / totalSeries);
    const posicaoNoBloco = index % totalSeries;
    const serieIndex = bloco % 2 === 0 ? posicaoNoBloco : totalSeries - 1 - posicaoNoBloco;
    grupos[serieIndex].push(atleta);
  });

  return grupos;
}