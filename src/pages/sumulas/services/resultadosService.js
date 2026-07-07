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
  // Proteção: nunca apagar tudo se não há nada para inserir.
  if (!resultados || resultados.length === 0) {
    return { error: null, semDados: true };
  }

  const { error: erroDelete } = await supabase.from("resultados").delete().eq("prova_id", provaId);
  if (erroDelete) {
    return { error: erroDelete };
  }

  const { error: erroInsert } = await supabase.from("resultados").insert(resultados);
  if (erroInsert) {
    return { error: erroInsert };
  }

  return { error: null };
}

export async function apagarResultadosDaProva(provaId) {
  return supabase.from("resultados").delete().eq("prova_id", provaId);
}