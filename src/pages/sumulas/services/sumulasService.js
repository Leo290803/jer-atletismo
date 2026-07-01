import { supabase } from "../../../lib/supabase";

export async function carregarConfiguracoes() {
  return supabase.from("configuracoes").select("*").eq("chave", "atletismo_geral").maybeSingle();
}

export async function carregarProvas() {
  return supabase.from("provas").select("*").order("nome");
}
