import { supabase } from "../../../lib/supabase";

export async function carregarResultadosSalvos(provaId) {
  return supabase.from("resultados").select("*").eq("prova_id", provaId);
}

export async function carregarResultadosDigitais(sumulaId) {
  return supabase
    .from("sumula_resultados")
    .select("atleta_id, tempo, marca, resultado, observacao, classificacao")
    .eq("sumula_id", sumulaId);
}

export async function salvarResultados(provaId, resultados) {
  const { error: erroDelete } = await supabase.from("resultados").delete().eq("prova_id", provaId);
  if (erroDelete) {
    return { error: erroDelete };
  }

  return supabase.from("resultados").insert(resultados);
}

export async function apagarResultadosDaProva(provaId) {
  return supabase.from("resultados").delete().eq("prova_id", provaId);
}
