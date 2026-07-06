import { supabase } from "../../../lib/supabase";
import { normalizarFaseProva, podeSobrescreverFaseAutomaticamente } from "../../../data/fasesProvas";
import {
  contarConflitosEscola,
  distribuirSimples,
  embaralhar,
  escolaDaInscricao,
} from "../utils/balizamentoUtils";
import { apagarResultadosDaProva } from "./resultadosService";
import {
  chaveEquipeRevezamento,
  ehRevezamento,
  numeroCompeticaoOrdenavel,
} from "../utils/revezamento";

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

// Retorna os numeros de raia CENTRALIZADOS para uma serie com `qtdAtletas`
// atletas, dentro de `totalRaias` raias. Usa a ordem de preferencia oficial
// do atletismo (raias do meio primeiro), depois ordena.
// Ex.: 8 raias, 4 atletas -> [3,4,5,6]; 5 atletas -> [2,3,4,5,6].
function raiasCentralizadas(qtdAtletas, totalRaias) {
  const total = Math.max(1, Number(totalRaias) || 8);
  const qtd = Math.min(Math.max(0, Number(qtdAtletas) || 0), total);

  // Ordem de preferencia: centro para as bordas.
  const centro = (total + 1) / 2;
  const preferencia = Array.from({ length: total }, (_, i) => i + 1).sort((a, b) => {
    const da = Math.abs(a - centro);
    const db = Math.abs(b - centro);
    if (da !== db) return da - db;
    return a - b; // desempate: raia menor primeiro
  });

  // Pega as `qtd` melhores e ordena crescente para exibir bonito.
  return preferencia.slice(0, qtd).sort((a, b) => a - b);
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

// Agrupa as inscricoes de um revezamento em equipes (escola + municipio).
function agruparEquipesRevezamento(inscricoes) {
  const equipesMap = new Map();

  (inscricoes || []).forEach((inscricao) => {
    const chave = chaveEquipeRevezamento(inscricao);
    if (!equipesMap.has(chave)) equipesMap.set(chave, []);
    equipesMap.get(chave).push(inscricao);
  });

  // Ordena os atletas dentro de cada equipe pelo numero de competicao.
  return Array.from(equipesMap.values()).map((atletas) =>
    [...atletas].sort((a, b) => numeroCompeticaoOrdenavel(a) - numeroCompeticaoOrdenavel(b))
  );
}

// Geracao de series para revezamento: a unidade e a EQUIPE (escola), nao o atleta.
// Cada equipe ocupa uma unica raia; todos os atletas da equipe ficam na mesma serie.
async function gerarSeriesRevezamento({ provaSelecionada, inscricoes, config }) {
  const equipes = agruparEquipesRevezamento(inscricoes);

  if (equipes.length === 0) {
    return { ok: false, message: "Essa prova nao tem equipes inscritas." };
  }

  const equipesEmbaralhadas = embaralhar(equipes);
  const equipesPorSerie = Math.max(1, Number(config.quantidade_raias || 8));
  const totalSeries = Math.max(1, Math.ceil(equipesEmbaralhadas.length / equipesPorSerie));

  // Fase automatica com base na quantidade de EQUIPES.
  const faseAutomatica = equipesEmbaralhadas.length <= equipesPorSerie ? "FINAL" : "QUALIFICACAO";
  const faseAtualNormalizada = normalizarFaseProva(provaSelecionada?.fase);
  const deveAtualizarFase = podeSobrescreverFaseAutomaticamente(faseAtualNormalizada);
  const faseDaProva = deveAtualizarFase ? faseAutomatica : faseAtualNormalizada;

  if (deveAtualizarFase) {
    const { error: erroAtualizarFase } = await supabase
      .from("provas")
      .update({ fase: faseAutomatica })
      .eq("id", provaSelecionada.id);

    if (erroAtualizarFase) return { ok: false, message: erroAtualizarFase.message };
  }

  const { data: novasSeries, error: erroCriarSeries } = await criarSeries(provaSelecionada.id, totalSeries);
  if (erroCriarSeries) return { ok: false, message: erroCriarSeries.message };

  const raiasParaCriar = [];

  equipesEmbaralhadas.forEach((equipe, indiceEquipe) => {
    const serieIndex = Math.floor(indiceEquipe / equipesPorSerie);
    const serieCriada = novasSeries[serieIndex];
    const raiaDaEquipe = (indiceEquipe % equipesPorSerie) + 1;

    // Todos os atletas da equipe compartilham a mesma raia (a raia da equipe).
    equipe.forEach((inscricao, posicaoNaEquipe) => {
      raiasParaCriar.push({
        serie_id: serieCriada.id,
        inscricao_id: inscricao.id,
        raia: raiaDaEquipe,
        ordem: posicaoNaEquipe + 1,
      });
    });
  });

  const { error: erroRaias } = await criarRaias(raiasParaCriar);
  if (erroRaias) return { ok: false, message: erroRaias.message };

  return {
    ok: true,
    faseAutomatica,
    fase: faseDaProva,
    totalSeries,
    totalEquipes: equipesEmbaralhadas.length,
    totalAtletas: inscricoes.length,
    message: `Series de revezamento geradas: ${totalSeries} serie(s), ${equipesEmbaralhadas.length} equipe(s), ${inscricoes.length} atleta(s). ${
      deveAtualizarFase
        ? `Fase definida automaticamente como ${faseAutomatica}.`
        : `Fase manual mantida como ${faseDaProva}.`
    }`.trim(),
  };
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

  // Revezamento: geracao por equipe (escola), nao por atleta individual.
  if (ehRevezamento(provaAtual)) {
    return gerarSeriesRevezamento({ provaSelecionada: provaAtual, inscricoes, config });
  }

  const ehCampo =
    provaAtual.tipo === "campo" ||
    provaAtual.subtipo === "campo_tentativas" ||
    provaAtual.subtipo === "salto_altura";

  const limiteFinalDireta = ehCampo
    ? Number(config.finalistas_campo || 8)
    : Number(config.quantidade_raias || 8);

  const faseAutomatica = inscricoes.length <= limiteFinalDireta ? "FINAL" : "QUALIFICACAO";
  const faseAtualNormalizada = normalizarFaseProva(provaAtual.fase);
  const deveAtualizarFase = podeSobrescreverFaseAutomaticamente(faseAtualNormalizada);
  const faseDaProva = deveAtualizarFase ? faseAutomatica : faseAtualNormalizada;

  if (deveAtualizarFase) {
    const { error: erroAtualizarFase } = await supabase
      .from("provas")
      .update({ fase: faseAutomatica })
      .eq("id", provaSelecionada);

    if (erroAtualizarFase) return { ok: false, message: erroAtualizarFase.message };
  }

  const quantidadePorSerie = ehCampo
    ? Number(config.atletas_por_serie_campo || 15)
    : Number(config.quantidade_raias || 8);

  const totalSeries = Math.ceil(inscricoes.length / quantidadePorSerie);
  const { data: novasSeries, error: erroCriarSeries } = await criarSeries(provaSelecionada, totalSeries);
  if (erroCriarSeries) return { ok: false, message: erroCriarSeries.message };

  const deveEvitarMesmaEscola = !faseDaProva.includes("FINAL") && totalSeries > 1;
  const inscricoesEmbaralhadas = embaralhar(inscricoes);

  const distribuicaoPorSerie = deveEvitarMesmaEscola
    ? distribuirSemRepetirEscola(inscricoesEmbaralhadas, totalSeries, quantidadePorSerie)
    : distribuirSimples(inscricoesEmbaralhadas, totalSeries, quantidadePorSerie);

  const conflitosRestantes = contarConflitosEscola(distribuicaoPorSerie);

  const totalRaiasConfig = Math.max(1, Number(config.quantidade_raias || 8));
  const raiasParaCriar = [];

  distribuicaoPorSerie.forEach((grupo, serieIndex) => {
    const serieCriada = novasSeries[serieIndex];
    const atletasNaSerie = (grupo || []).length;

    // Raias centralizadas quando a serie tem menos atletas que o total de raias.
    // Para pista, embaralha a ordem dos atletas dentro das raias centrais
    // (sorteio); para campo, mantem a ordem sequencial das raias centrais.
    const raiasCentrais = raiasCentralizadas(atletasNaSerie, totalRaiasConfig);
    const raiasAtribuidas = ehCampo ? raiasCentrais : embaralhar([...raiasCentrais]);

    (grupo || []).forEach((inscricao, posicaoNaSerie) => {
      const raia = raiasAtribuidas[posicaoNaSerie] || posicaoNaSerie + 1;

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
    fase: faseDaProva,
    totalSeries,
    totalAtletas: inscricoes.length,
    conflitosRestantes,
    message: `Series geradas com sucesso: ${totalSeries} serie(s), ${inscricoes.length} atleta(s). ${
      deveAtualizarFase
        ? `Fase definida automaticamente como ${faseAutomatica}.`
        : `Fase manual mantida como ${faseDaProva}.`
    } ${msgEscola}`.trim(),
  };
}