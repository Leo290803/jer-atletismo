import { supabase } from "../../../lib/supabase";
import { distribuirEmSeriesBalanceadas, raiaOficialPorSeed } from "../utils/proximaFaseUtils";

export async function buscarProvaFaseExistente(provaAtual, fase) {
  return supabase
    .from("provas")
    .select("*")
    .eq("evento_id", provaAtual.evento_id)
    .eq("nome", provaAtual.nome)
    .eq("categoria", provaAtual.categoria)
    .eq("naipe", provaAtual.naipe)
    .eq("fase", fase)
    .maybeSingle();
}

export async function criarProvaProximaFase(payload) {
  return supabase.from("provas").insert(payload).select().single();
}

export async function apagarDadosProximaFase(provaId) {
  const { data: seriesDaFase } = await supabase.from("series").select("id").eq("prova_id", provaId);
  const idsSeriesDaFase = (seriesDaFase || []).map((s) => s.id).filter(Boolean);
  await supabase.from("resultados").delete().eq("prova_id", provaId);
  if (idsSeriesDaFase.length > 0) {
    await supabase.from("raias").delete().in("serie_id", idsSeriesDaFase);
  }
  await supabase.from("series").delete().eq("prova_id", provaId);
  return supabase.from("inscricoes").delete().eq("prova_id", provaId);
}

export async function criarInscricoesProximaFase(inscricoesParaCriar) {
  return supabase.from("inscricoes").insert(inscricoesParaCriar).select();
}

export async function criarSeriesProximaFase(provaId, totalSeries) {
  const novasSeries = [];
  for (let i = 1; i <= totalSeries; i += 1) {
    const { data, error } = await supabase.from("series").insert({ prova_id: provaId, numero_serie: i }).select().single();
    if (error) return { data: null, error };
    novasSeries.push(data);
  }
  return { data: novasSeries, error: null };
}

export async function criarRaiasProximaFase(raiasParaCriar) {
  return supabase.from("raias").insert(raiasParaCriar);
}

export async function salvarQualificacoesDaFaseAtual(provaId, series = []) {
  const linhas = [];

  (series || []).forEach((serie) => {
    (serie.raias || []).forEach((raia) => {
      if (!raia.inscricoes?.id) return;

      linhas.push({
        prova_id: provaId,
        serie_id: raia.serie_id || serie.id,
        inscricao_id: raia.inscricoes.id,
        qualificacao: raia.qualificacao || null,
      });
    });
  });

  if (!linhas.length) return { error: null };

  const { data: existentes, error: erroExistentes } = await supabase
    .from("resultados")
    .select("id,inscricao_id")
    .eq("prova_id", provaId);

  if (erroExistentes) return { error: erroExistentes };

  const porInscricao = {};
  (existentes || []).forEach((item) => {
    porInscricao[item.inscricao_id] = item;
  });

  for (const linha of linhas) {
    const existente = porInscricao[linha.inscricao_id];

    if (existente?.id) {
      const { error } = await supabase
        .from("resultados")
        .update({ qualificacao: linha.qualificacao })
        .eq("id", existente.id);

      if (error) return { error };
    } else {
      const { error } = await supabase
        .from("resultados")
        .insert({
          prova_id: linha.prova_id,
          serie_id: linha.serie_id,
          inscricao_id: linha.inscricao_id,
          status: "OK",
          qualificacao: linha.qualificacao,
        });

      if (error) return { error };
    }
  }

  return { error: null };
}

export async function gerarProximaFaseNoBanco({
  provaAtual,
  fase,
  regra,
  classificadosOrdenados,
  raiasProximaFase,
  substituirExistente = false,
}) {
  const { data: provaExistente, error: erroBuscaFase } = await buscarProvaFaseExistente(provaAtual, fase);
  if (erroBuscaFase) return { ok: false, error: erroBuscaFase };

  let novaProva = provaExistente;

  if (novaProva && !substituirExistente) {
    return {
      ok: false,
      errorCode: "FASE_EXISTENTE",
      message: `A fase ${fase} ja existe para esta prova.`,
      provaExistente: novaProva,
    };
  }

  if (novaProva && substituirExistente) {
    const { error: erroApagar } = await apagarDadosProximaFase(novaProva.id);
    if (erroApagar) return { ok: false, error: erroApagar };
  }

  if (!novaProva) {
    const { data, error } = await criarProvaProximaFase({
      evento_id: provaAtual.evento_id,
      nome: provaAtual.nome,
      categoria: provaAtual.categoria,
      naipe: provaAtual.naipe,
      tipo: provaAtual.tipo,
      subtipo: provaAtual.subtipo,
      status: "pendente",
      fase,
      prova_origem_id: provaAtual.id,
      criterio_classificacao: regra.criterio,
      total_classificados: classificadosOrdenados.length,
    });

    if (error) return { ok: false, error };
    novaProva = data;
  } else {
    const { error } = await supabase
      .from("provas")
      .update({
        criterio_classificacao: regra.criterio,
        total_classificados: classificadosOrdenados.length,
      })
      .eq("id", novaProva.id);

    if (error) return { ok: false, error };
  }

  const inscricoesParaCriar = (classificadosOrdenados || []).map((c) => ({
    evento_id: provaAtual.evento_id,
    prova_id: novaProva.id,
    atleta_id: c.inscricoes.atleta_id,
  }));

  const { data: novasInscricoes, error: erroInscricoes } = await criarInscricoesProximaFase(inscricoesParaCriar);
  if (erroInscricoes) return { ok: false, error: erroInscricoes };

  const inscricaoPorAtleta = {};
  (novasInscricoes || []).forEach((inscricao) => {
    inscricaoPorAtleta[inscricao.atleta_id] = inscricao;
  });

  const totalSeries = Math.ceil(
    classificadosOrdenados.length / Number(regra.raias || raiasProximaFase || 8)
  );

  const { data: novasSeries, error: erroSeries } = await criarSeriesProximaFase(novaProva.id, totalSeries);
  if (erroSeries) return { ok: false, error: erroSeries };

  const distribuicaoPorSerie = distribuirEmSeriesBalanceadas(classificadosOrdenados, totalSeries);
  const raiasParaCriar = [];

  distribuicaoPorSerie.forEach((listaSerie, serieIndex) => {
    const serieCriada = novasSeries[serieIndex];

    (listaSerie || []).forEach((classificado, posicaoNaSerie) => {
      const inscricao = inscricaoPorAtleta[classificado.inscricoes.atleta_id];
      if (!inscricao) return;

      raiasParaCriar.push({
        serie_id: serieCriada.id,
        inscricao_id: inscricao.id,
        raia: raiaOficialPorSeed(posicaoNaSerie, regra.raias || raiasProximaFase),
        ordem: posicaoNaSerie + 1,
      });
    });
  });

  const { error: erroRaias } = await criarRaiasProximaFase(raiasParaCriar);
  if (erroRaias) return { ok: false, error: erroRaias };

  return {
    ok: true,
    novaProva,
    totalSeries,
    totalClassificados: classificadosOrdenados.length,
  };
}
