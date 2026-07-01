import { supabase } from "../../../lib/supabase";

export async function carregarInscricoesDaProva(provaId) {
  return supabase
    .from("inscricoes")
    .select("id,evento_id,prova_id,atleta_id,atletas(id,numero,numero_competicao,nome,municipio,data_nascimento,categoria,naipe,escolas(id,nome))")
    .eq("prova_id", provaId)
    .order("id", { ascending: true });
}

export async function buscarAtletas(termo) {
  return supabase
    .from("atletas")
    .select("id,numero,numero_competicao,nome,municipio,data_nascimento,categoria,naipe,escolas(id,nome)")
    .ilike("nome", `%${termo}%`)
    .order("nome")
    .limit(20);
}

export async function adicionarAtletaNaProva(payload) {
  return supabase.from("inscricoes").insert(payload);
}

export async function removerInscricaoDaProva(inscricaoId) {
  await supabase.from("resultados").delete().eq("inscricao_id", inscricaoId);
  await supabase.from("raias").delete().eq("inscricao_id", inscricaoId);
  return supabase.from("inscricoes").delete().eq("id", inscricaoId);
}

export async function substituirInscricaoDaProva(inscricaoId, atletaId) {
  await supabase.from("resultados").delete().eq("inscricao_id", inscricaoId);
  return supabase.from("inscricoes").update({ atleta_id: atletaId }).eq("id", inscricaoId);
}

export async function criarAtletaESubstituir() {
  throw new Error("criarAtletaESubstituir deve ser migrado gradualmente a partir de Sumulas.jsx");
}
