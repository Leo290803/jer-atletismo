import { supabase } from "../../../lib/supabase";

export function gerarTokenAcesso() {
  return window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function linkArbitro(token) {
  return `${window.location.origin}/arbitro/sumula/${token}`;
}

export async function carregarSumulaDigital(provaId) {
  return supabase.from("sumulas_digitais").select("*").eq("prova_id", provaId).order("criada_em", { ascending: false });
}

export async function gerarSumulaDigital(payload) {
  return supabase.from("sumulas_digitais").insert(payload).select().single();
}

export async function bloquearSumulaDigital(id) {
  return supabase.from("sumulas_digitais").update({ status: "BLOQUEADA", bloqueada_em: new Date().toISOString() }).eq("id", id);
}

export async function reabrirSumulaDigital(id) {
  return supabase.from("sumulas_digitais").update({ status: "ABERTA", bloqueada_em: null }).eq("id", id);
}

export async function sincronizarResultadosDaSumula(sumulaId, provaId) {
  const { data: inscricoes, error } = await supabase.from("inscricoes").select("atleta_id").eq("prova_id", provaId);
  if (error) return { ok: false, message: error.message };

  const atletaIds = [...new Set((inscricoes || []).map((i) => i.atleta_id).filter(Boolean))];
  const payload = atletaIds.map((atletaId) => ({ sumula_id: sumulaId, atleta_id: atletaId, tentativas: ["", "", "", "", "", ""] }));
  const { error: erroUpsert } = await supabase.from("sumula_resultados").upsert(payload, { onConflict: "sumula_id,atleta_id" });
  if (erroUpsert) return { ok: false, message: erroUpsert.message };
  return { ok: true, message: `Sumula pronta com ${atletaIds.length} atleta(s).` };
}
