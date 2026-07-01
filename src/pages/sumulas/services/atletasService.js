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

export async function criarAtletaESubstituir({ inscricaoAntiga, dadosNovoAtleta, provaAtual }) {
  const nome = String(dadosNovoAtleta?.nome || "").trim().toUpperCase();
  const numero = String(dadosNovoAtleta?.numero || "").trim();

  const atletaAntigo = inscricaoAntiga?.atletas;
  const escolaId = atletaAntigo?.escolas?.id || null;
  const municipio = atletaAntigo?.municipio || null;
  const categoria = atletaAntigo?.categoria || provaAtual?.categoria || "SEM CATEGORIA";
  const naipe = atletaAntigo?.naipe || provaAtual?.naipe || "SEM NAIPE";

  const payloadBase = {
    nome,
    municipio,
    categoria,
    naipe,
  };

  if (numero) {
    payloadBase.numero = numero;
  }

  const tentativasPayload = [];

  if (escolaId) {
    tentativasPayload.push({ ...payloadBase, escola_id: escolaId });
    tentativasPayload.push({ ...payloadBase, instituicao_id: escolaId });
    tentativasPayload.push({ ...payloadBase, institution_id: escolaId });
  }

  tentativasPayload.push(payloadBase);

  let atletaCriado = null;
  let ultimoErro = null;

  for (const payload of tentativasPayload) {
    const { data, error } = await supabase
      .from("atletas")
      .insert(payload)
      .select(`
        id,
        numero,
        numero_competicao,
        nome,
        municipio,
        categoria,
        naipe,
        escolas (
          id,
          nome
        )
      `)
      .single();

    if (!error && data) {
      atletaCriado = data;
      break;
    }

    ultimoErro = error;
  }

  if (!atletaCriado) {
    return { data: null, error: ultimoErro || new Error("Nao foi possivel criar o atleta.") };
  }

  await supabase.from("resultados").delete().eq("inscricao_id", inscricaoAntiga.id);

  const { error: erroUpdate } = await supabase
    .from("inscricoes")
    .update({ atleta_id: atletaCriado.id })
    .eq("id", inscricaoAntiga.id);

  return { data: atletaCriado, error: erroUpdate || null };
}
