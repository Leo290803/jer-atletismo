import { supabase } from "../../../lib/supabase";
import {
  contarConflitosEscola,
  distribuirSimples,
  embaralhar,
  escolaDaInscricao,
} from "../utils/balizamentoUtils";
import { apagarResultadosDaProva } from "./resultadosService";

export async function carregarSeries(provaId) {
  return supabase
    .from("series")
    .select("id,numero_serie,raias(id,raia,ordem,inscricoes(id,evento_id,atleta_id,atletas(id,numero,numero_competicao,nome,municipio,data_nascimento,escolas(nome))))")
    .eq("prova_id", provaId)
    .order("numero_serie", { ascending: true });
}

export async function carregarInscricoesParaSeries(provaId) {
  return supabase
    .from("inscricoes")
    .select(`
      id,
      evento_id,
      prova_id,
      atleta_id,
      atletas (
        id,
        nome,
        numero,
        numero_competicao,
        municipio,
        data_nascimento,
        escolas (
          id,
          nome
        )
      )
    `)
    .eq("prova_id", provaId)
    .order("id", { ascending: true });
}

export async function apagarSeriesExistentes(provaId) {
  const { data: seriesExistentes, error } = await supabase.from("series").select("id").eq("prova_id", provaId);
  if (error) return { error };

  const ids = (seriesExistentes || []).map((s) => s.id);
  const { error: erroResultados } = await apagarResultadosDaProva(provaId);
  if (erroResultados) return { error: erroResultados };

  if (ids.length > 0) {
    const { error: erroRaias } = await supabase.from("raias").delete().in("serie_id", ids);
    if (erroRaias) return { error: erroRaias };
  }

  return supabase.from("series").delete().eq("prova_id", provaId);
}

export async function criarSeries(provaId, totalSeries) {
  const novasSeries = [];

  for (let i = 1; i <= totalSeries; i += 1) {
    const { data, error } = await supabase
      .from("series")
      .insert({
        prova_id: provaId,
        numero_serie: i,
      })
      .select()
      .single();

    if (error) return { data: null, error };
    novasSeries.push(data);
  }

  return { data: novasSeries, error: null };
}

export async function criarRaias(raiasParaCriar) {
  return supabase.from("raias").insert(raiasParaCriar);
}

function grupoTemEscola(grupo, escola) {
  return (grupo || []).some((inscricao) => escolaDaInscricao(inscricao) === escola);
}

function melhorarDistribuicaoPorEscola(gruposOriginais) {
  const grupos = gruposOriginais.map((grupo) => [...grupo]);
  let conflitosAtuais = contarConflitosEscola(grupos);

  if (conflitosAtuais === 0) return grupos;

  let melhorou = true;
  let tentativas = 0;

  while (melhorou && conflitosAtuais > 0 && tentativas < 300) {
    melhorou = false;
    tentativas += 1;

    for (let i = 0; i < grupos.length; i += 1) {
      for (let a = 0; a < grupos[i].length; a += 1) {
        const atletaA = grupos[i][a];

        for (let j = 0; j < grupos.length; j += 1) {
          if (i === j) continue;

          for (let b = 0; b < grupos[j].length; b += 1) {
            const atletaB = grupos[j][b];

            const novosGrupos = grupos.map((grupo) => [...grupo]);
            novosGrupos[i][a] = atletaB;
            novosGrupos[j][b] = atletaA;

            const novosConflitos = contarConflitosEscola(novosGrupos);
            if (novosConflitos < conflitosAtuais) {
              grupos[i][a] = atletaB;
              grupos[j][b] = atletaA;
              conflitosAtuais = novosConflitos;
              melhorou = true;
              break;
            }
          }

          if (melhorou) break;
        }

        if (melhorou) break;
      }

      if (melhorou) break;
    }
  }

  return grupos;
}

function distribuirSemRepetirEscola(listaInscricoes, totalSeries, quantidadePorSerie) {
  const grupos = Array.from({ length: totalSeries }, () => []);
  const frequenciaEscola = {};

  (listaInscricoes || []).forEach((inscricao) => {
    const escola = escolaDaInscricao(inscricao);
    frequenciaEscola[escola] = (frequenciaEscola[escola] || 0) + 1;
  });

  const ordenadas = [...(listaInscricoes || [])].sort((a, b) => {
    const escolaA = escolaDaInscricao(a);
    const escolaB = escolaDaInscricao(b);
    const diff = (frequenciaEscola[escolaB] || 0) - (frequenciaEscola[escolaA] || 0);
    if (diff !== 0) return diff;
    return String(a.atletas?.nome || "").localeCompare(String(b.atletas?.nome || ""));
  });

  ordenadas.forEach((inscricao) => {
    const escola = escolaDaInscricao(inscricao);

    const candidatas = grupos
      .map((grupo, index) => ({
        index,
        grupo,
        tamanho: grupo.length,
        temMesmaEscola: grupoTemEscola(grupo, escola),
      }))
      .filter((item) => item.tamanho < quantidadePorSerie);

    let melhores = candidatas.filter((item) => !item.temMesmaEscola);
    if (melhores.length === 0) melhores = candidatas;

    melhores.sort((a, b) => {
      if (a.tamanho !== b.tamanho) return a.tamanho - b.tamanho;
      return a.index - b.index;
    });

    const escolhida = melhores[0] || candidatas[0];
    if (escolhida) grupos[escolhida.index].push(inscricao);
  });

  return melhorarDistribuicaoPorEscola(grupos);
}

export async function gerarSeriesDaProva({ provaSelecionada, provas, config, substituirSeries = false }) {
  const provaAtual = (provas || []).find((p) => p.id === provaSelecionada);
  if (!provaAtual) {
    return { ok: false, message: "Prova nao encontrada." };
  }

  const { data: inscricoes, error: erroInscricoes } = await carregarInscricoesParaSeries(provaSelecionada);
  if (erroInscricoes) return { ok: false, message: erroInscricoes.message };
  if (!inscricoes || inscricoes.length === 0) {
    return { ok: false, message: "Essa prova nao tem atletas inscritos." };
  }

  const { data: seriesExistentes, error: erroSeriesExistentes } = await supabase
    .from("series")
    .select("id")
    .eq("prova_id", provaSelecionada);

  if (erroSeriesExistentes) return { ok: false, message: erroSeriesExistentes.message };

  if ((seriesExistentes || []).length > 0 && !substituirSeries) {
    return { ok: false, errorCode: "SERIES_EXISTENTES" };
  }

  if ((seriesExistentes || []).length > 0 && substituirSeries) {
    const { error: erroApagar } = await apagarSeriesExistentes(provaSelecionada);
    if (erroApagar) return { ok: false, message: erroApagar.message };
  }

  const ehCampo =
    provaAtual.tipo === "campo" ||
    provaAtual.subtipo === "campo_tentativas" ||
    provaAtual.subtipo === "salto_altura";

  const limiteFinalDireta = ehCampo
    ? Number(config.finalistas_campo || 8)
    : Number(config.quantidade_raias || 8);

  const faseAutomatica = inscricoes.length <= limiteFinalDireta ? "FINAL" : "QUALIFICACAO";

  const { error: erroAtualizarFase } = await supabase
    .from("provas")
    .update({ fase: faseAutomatica })
    .eq("id", provaSelecionada);

  if (erroAtualizarFase) return { ok: false, message: erroAtualizarFase.message };

  const quantidadePorSerie = ehCampo
    ? Number(config.atletas_por_serie_campo || 15)
    : Number(config.quantidade_raias || 8);

  const totalSeries = Math.ceil(inscricoes.length / quantidadePorSerie);
  const { data: novasSeries, error: erroCriarSeries } = await criarSeries(provaSelecionada, totalSeries);
  if (erroCriarSeries) return { ok: false, message: erroCriarSeries.message };

  const deveEvitarMesmaEscola = faseAutomatica !== "FINAL" && totalSeries > 1;
  const inscricoesEmbaralhadas = embaralhar(inscricoes);

  const distribuicaoPorSerie = deveEvitarMesmaEscola
    ? distribuirSemRepetirEscola(inscricoesEmbaralhadas, totalSeries, quantidadePorSerie)
    : distribuirSimples(inscricoesEmbaralhadas, totalSeries, quantidadePorSerie);

  const conflitosRestantes = contarConflitosEscola(distribuicaoPorSerie);

  const ordemRaias = embaralhar([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const raiasParaCriar = [];

  distribuicaoPorSerie.forEach((grupo, serieIndex) => {
    const serieCriada = novasSeries[serieIndex];

    (grupo || []).forEach((inscricao, posicaoNaSerie) => {
      const raia = ehCampo ? posicaoNaSerie + 1 : ordemRaias[posicaoNaSerie] || posicaoNaSerie + 1;

      raiasParaCriar.push({
        serie_id: serieCriada.id,
        inscricao_id: inscricao.id,
        raia,
        ordem: posicaoNaSerie + 1,
      });
    });
  });

  const { error: erroRaias } = await criarRaias(raiasParaCriar);
  if (erroRaias) return { ok: false, message: erroRaias.message };

  const msgEscola = deveEvitarMesmaEscola
    ? conflitosRestantes === 0
      ? "Distribuicao feita sem repetir escola na mesma serie."
      : `Distribuicao tentou evitar escolas repetidas. Conflitos restantes: ${conflitosRestantes}.`
    : "";

  return {
    ok: true,
    faseAutomatica,
    totalSeries,
    totalAtletas: inscricoes.length,
    conflitosRestantes,
    message: `Series geradas com sucesso: ${totalSeries} serie(s), ${inscricoes.length} atleta(s). Fase definida automaticamente como ${faseAutomatica}. ${msgEscola}`.trim(),
  };
}
