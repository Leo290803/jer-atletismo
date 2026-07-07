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

// Remove um atleta de uma serie (desistencia): apaga a raia, o resultado e a
// inscricao. Nao regenera as demais series/raias.
export async function removerAtletaDaSerie({ raiaId, inscricaoId }) {
  if (raiaId) {
    const { error: erroRaia } = await supabase.from("raias").delete().eq("id", raiaId);
    if (erroRaia) return { error: erroRaia };
  }

  if (inscricaoId) {
    await supabase.from("resultados").delete().eq("inscricao_id", inscricaoId);
    await supabase.from("raias").delete().eq("inscricao_id", inscricaoId);
    const { error: erroInscricao } = await supabase.from("inscricoes").delete().eq("id", inscricaoId);
    if (erroInscricao) return { error: erroInscricao };
  }

  return { error: null };
}

export async function substituirInscricaoDaProva(inscricaoId, atletaId) {
  await supabase.from("resultados").delete().eq("inscricao_id", inscricaoId);
  return supabase.from("inscricoes").update({ atleta_id: atletaId }).eq("id", inscricaoId);
}

export async function buscarEscolas(termo = "") {
  let query = supabase.from("escolas").select("id,nome").order("nome").limit(50);
  if (termo && termo.trim().length >= 2) {
    query = supabase.from("escolas").select("id,nome").ilike("nome", `%${termo.trim()}%`).order("nome").limit(50);
  }
  return query;
}

// Cria (ou reaproveita) um atleta e o adiciona diretamente numa serie existente,
// na proxima raia/ordem livre, sem regerar as series.
// Atualiza o numero (de competicao) do atleta na tabela atletas.
// Vale para todas as provas, pois o numero e um dado do proprio atleta.
export async function atualizarNumeroAtleta(atletaId, novoNumero) {
  const numero = String(novoNumero ?? "").trim();
  // Tenta gravar em numero_competicao (campo principal exibido) e numero.
  const { error: erroComp } = await supabase
    .from("atletas")
    .update({ numero_competicao: numero || null })
    .eq("id", atletaId);

  // Alguns bancos podem nao ter numero_competicao; tenta numero como fallback.
  if (erroComp) {
    const { error: erroNum } = await supabase
      .from("atletas")
      .update({ numero: numero || null })
      .eq("id", atletaId);
    if (erroNum) return { error: erroNum };
    return { error: null };
  }

  // Garante que numero tambem fique alinhado (quando existir a coluna).
  await supabase.from("atletas").update({ numero: numero || null }).eq("id", atletaId);
  return { error: null };
}

export async function criarAtletaEAdicionarNaSerie({ dadosAtleta, provaAtual, serie }) {
  const nome = String(dadosAtleta?.nome || "").trim().toUpperCase();
  const numero = String(dadosAtleta?.numero || "").trim();
  const municipio = String(dadosAtleta?.municipio || "").trim() || null;
  const dataNascimento = String(dadosAtleta?.data_nascimento || "").trim() || null;
  const escolaId = dadosAtleta?.escola_id || null;
  const categoria = provaAtual?.categoria || "SEM CATEGORIA";
  const naipe = provaAtual?.naipe || "SEM NAIPE";

  if (!nome) {
    return { error: new Error("Informe o nome do atleta.") };
  }

  // 1) Criar o atleta (tentando as variacoes de coluna de escola/nascimento)
  const payloadBase = { nome, municipio, categoria, naipe };
  if (numero) payloadBase.numero = numero;
  if (dataNascimento) payloadBase.data_nascimento = dataNascimento;

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
      .select("id,numero,numero_competicao,nome,municipio,data_nascimento,categoria,naipe,escolas(id,nome)")
      .single();
    if (!error && data) {
      atletaCriado = data;
      break;
    }
    ultimoErro = error;
  }

  if (!atletaCriado) {
    return { error: ultimoErro || new Error("Nao foi possivel criar o atleta.") };
  }

  // 2) Inscrever na prova
  const { data: inscricaoCriada, error: erroInscricao } = await supabase
    .from("inscricoes")
    .insert({
      evento_id: provaAtual.evento_id,
      prova_id: provaAtual.id,
      atleta_id: atletaCriado.id,
    })
    .select("id")
    .single();

  if (erroInscricao || !inscricaoCriada) {
    return { error: erroInscricao || new Error("Nao foi possivel inscrever o atleta na prova.") };
  }

  // 3) Descobrir a proxima raia/ordem livre da serie escolhida
  const { data: raiasExistentes, error: erroRaias } = await supabase
    .from("raias")
    .select("raia,ordem")
    .eq("serie_id", serie.id);

  if (erroRaias) {
    return { error: erroRaias, atleta: atletaCriado };
  }

  const numerosRaia = new Set((raiasExistentes || []).map((r) => Number(r.raia) || 0));
  const ordens = (raiasExistentes || []).map((r) => Number(r.ordem) || 0);
  const totalRaias = Math.max(1, Number(dadosAtleta?.total_raias) || 8);

  // Primeira raia LIVRE dentro do limite (1..totalRaias). Preenche buracos
  // (ex.: se a raia 1 esta vazia, usa a 1) em vez de "maior + 1".
  let proximaRaia = null;
  for (let n = 1; n <= totalRaias; n += 1) {
    if (!numerosRaia.has(n)) {
      proximaRaia = n;
      break;
    }
  }
  // Se todas as raias ate o limite estao ocupadas, cai para a proxima acima
  // (serie cheia — situacao excepcional).
  if (proximaRaia === null) {
    proximaRaia = (numerosRaia.size ? Math.max(...numerosRaia) : 0) + 1;
  }

  const proximaOrdem = (ordens.length ? Math.max(...ordens) : 0) + 1;

  // 4) Criar a raia
  const { error: erroCriarRaia } = await supabase.from("raias").insert({
    serie_id: serie.id,
    inscricao_id: inscricaoCriada.id,
    raia: proximaRaia,
    ordem: proximaOrdem,
  });

  if (erroCriarRaia) {
    return { error: erroCriarRaia, atleta: atletaCriado };
  }

  return { error: null, atleta: atletaCriado, raia: proximaRaia };
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