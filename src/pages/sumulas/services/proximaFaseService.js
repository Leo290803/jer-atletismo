import { supabase } from "../../../lib/supabase";

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

export async function gerarProximaFase() {
  throw new Error("gerarProximaFase deve ser migrado gradualmente a partir de Sumulas.jsx");
}
