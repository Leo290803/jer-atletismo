import { supabase } from "../../../lib/supabase";

export async function carregarSeries(provaId) {
  return supabase
    .from("series")
    .select("id,numero_serie,raias(id,raia,ordem,inscricoes(id,evento_id,atleta_id,atletas(id,numero,numero_competicao,nome,municipio,data_nascimento,escolas(nome))))")
    .eq("prova_id", provaId)
    .order("numero_serie", { ascending: true });
}

export async function apagarSeriesDaProva(provaId) {
  const { data: seriesExistentes, error } = await supabase.from("series").select("id").eq("prova_id", provaId);
  if (error) return { error };

  const ids = (seriesExistentes || []).map((s) => s.id);
  await supabase.from("resultados").delete().eq("prova_id", provaId);
  if (ids.length > 0) {
    await supabase.from("raias").delete().in("serie_id", ids);
  }
  return supabase.from("series").delete().eq("prova_id", provaId);
}

export async function gerarSeriesDaProva() {
  throw new Error("gerarSeriesDaProva deve ser migrado gradualmente a partir de Sumulas.jsx");
}
