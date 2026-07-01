import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

function tabelaInexistente(error, tabela) {
  if (!error) return false;
  const alvo = String(tabela || "").toLowerCase();
  const texto = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();
  return (
    error.code === "PGRST205" ||
    (texto.includes("not found") && texto.includes(alvo)) ||
    (texto.includes("could not find") && texto.includes(alvo))
  );
}

function erroTriggerUpdatedAt(error) {
  const texto = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return texto.includes("updated_at") && texto.includes("record \"new\"");
}

function colunaNaoExiste(error, coluna) {
  const texto = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  const alvo = String(coluna || "").toLowerCase();
  return texto.includes("could not find") && texto.includes(alvo);
}

function tempoParaNumero(tempo) {
  if (!tempo) return 999999;
  const limpo = String(tempo).replace(",", ".").trim();
  if (limpo.includes(":")) {
    const partes = limpo.split(":").map(Number);
    if (partes.length === 2) return partes[0] * 60 + partes[1];
    if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
  }
  return Number(limpo) || 999999;
}

function marcaParaNumero(valor) {
  if (!valor && valor !== 0) return null;
  const texto = String(valor).trim().toUpperCase();
  if (["X", "-", "DNS", "DQ", "ABD", "DNF", "NM"].includes(texto)) {
    return null;
  }
  const numero = Number(texto.replace(",", "."));
  return Number.isNaN(numero) ? null : numero;
}

function formatarDataHora(data) {
  if (!data) return "";
  const dt = new Date(data);
  if (Number.isNaN(dt.getTime())) return String(data);
  return dt.toLocaleString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDataNascimento(data) {
  if (!data) return "-";
  const dt = new Date(data);
  if (Number.isNaN(dt.getTime())) return String(data);
  return dt.toLocaleDateString("pt-BR");
}

function melhorTentativaTexto(tentativas = [], limite = 6) {
  const lista = (tentativas || []).slice(0, limite);
  const validas = lista
    .map((valor) => marcaParaNumero(valor))
    .filter((valor) => valor !== null)
    .sort((a, b) => b - a);

  if (validas.length === 0) return "";
  return String(validas[0]).replace(".", ",");
}

function normalizarStatus(valor) {
  const status = String(valor || "OK").trim().toUpperCase();
  return ["OK", "DQ", "DNS", "ABD", "DNF", "NM"].includes(status) ? status : "OK";
}

function construirConferenciaResultado(lista, ehProvaCampo) {
  const base = (lista || []).map((item, idx) => {
    const situacao = normalizarStatus(item.observacao);
    const resultado = ehProvaCampo
      ? (item.marca || melhorTentativaTexto(item.tentativas, 6) || "")
      : (item.tempo || "");

    const valor = ehProvaCampo ? marcaParaNumero(resultado) : tempoParaNumero(resultado);
    const semResultado = ehProvaCampo ? valor === null : valor === 999999;
    const valido = situacao === "OK" && !semResultado;

    return {
      ...item,
      situacao,
      resultado,
      valor,
      valido,
      ordemOriginal: idx,
    };
  });

  const validos = base
    .filter((item) => item.valido)
    .sort((a, b) => {
      const serieA = Number(a.serie_numero || 1);
      const serieB = Number(b.serie_numero || 1);
      if (serieA !== serieB) return serieA - serieB;

      if (ehProvaCampo) {
        if (b.valor !== a.valor) return (b.valor || 0) - (a.valor || 0);
      } else if (a.valor !== b.valor) {
        return (a.valor || 999999) - (b.valor || 999999);
      }

      return a.ordemOriginal - b.ordemOriginal;
    })
    .map((item, idx) => ({
      ...item,
      colocacao: idx + 1,
    }));

  const invalidos = base
    .filter((item) => !item.valido)
    .sort((a, b) => a.ordemOriginal - b.ordemOriginal)
    .map((item) => ({
      ...item,
      colocacao: null,
    }));

  return {
    validos,
    invalidos,
    ordenados: [...validos, ...invalidos],
    mapaColocacao: Object.fromEntries(
      [...validos, ...invalidos].map((item) => [item.id, item.colocacao])
    ),
  };
}

function ordenarResultadosParaClassificacao(resultados) {
  return resultados
    .map((r) => ({
      ...r,
      tempo_num: tempoParaNumero(r.tempo),
      marca_num: marcaParaNumero(r.marca),
    }))
    .sort((a, b) => {
      const tempoA = a.tempo_num;
      const tempoB = b.tempo_num;
      const marcaA = a.marca_num;
      const marcaB = b.marca_num;

      const isCorrida = !!(a.tempo || b.tempo);
      if (isCorrida && tempoA !== 999999 && tempoB !== 999999) {
        return tempoA - tempoB;
      }

      if (marcaA !== null && marcaB !== null) {
        return marcaB - marcaA;
      }

      if (tempoA !== 999999 || tempoB !== 999999) {
        return tempoA - tempoB;
      }

      return (a.atleta?.numero || 0) - (b.atleta?.numero || 0);
    });
}

function normalizarResultado(r) {
  return {
    ...r,
    atleta: r.atleta || r.atletas || null,
    tentativas: Array.isArray(r.tentativas)
      ? r.tentativas
      : r.tentativas || ["", "", "", "", "", ""],
  };
}

export default function ArbitroSumula() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [sumula, setSumula] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [availableSumulas, setAvailableSumulas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [ultimoSalvo, setUltimoSalvo] = useState(null);
  const [alterado, setAlterado] = useState(false);
  const [nomeArbitro, setNomeArbitro] = useState(() => localStorage.getItem("arbitro_nome") || "");
  const [bloquearAtualizacaoStatus, setBloquearAtualizacaoStatus] = useState(false);
  const [statusFluxo, setStatusFluxo] = useState("aguardando");
  const [conferenciaAberta, setConferenciaAberta] = useState(false);
  const [classificacaoConferencia, setClassificacaoConferencia] = useState([]);
  const [serieEmConferencia, setSerieEmConferencia] = useState(null);
  const [seriesConfirmadas, setSeriesConfirmadas] = useState({});
  const [seriesFinalizadas, setSeriesFinalizadas] = useState({});

  const sumulasFiltradas = useMemo(() => {
    const nome = String(nomeArbitro || "").trim().toLowerCase();
    if (!nome) return availableSumulas;

    return availableSumulas.filter((s) => {
      const nomeDaSumula = String(s.arbitro_nome || "").trim().toLowerCase();
      return !nomeDaSumula || nomeDaSumula === nome;
    });
  }, [availableSumulas, nomeArbitro]);

  const ehProvaCampo = useMemo(() => {
    const tipo = String(sumula?.prova?.tipo || "").toLowerCase();
    const subtipo = String(sumula?.prova?.subtipo || "").toLowerCase();

    return (
      tipo === "campo" ||
      subtipo.includes("campo") ||
      subtipo.includes("salto") ||
      subtipo.includes("arremesso") ||
      subtipo.includes("lancamento") ||
      subtipo.includes("lançamento")
    );
  }, [sumula]);

  const carregarAvailableSumulas = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("sumulas_digitais")
      .select(`*, prova:provas (*)`)
      .in("status", ["ABERTA", "EM_ANDAMENTO"])
      .order("criada_em", { ascending: false });

    if (error) {
      if (tabelaInexistente(error, "sumulas_digitais")) {
        setMensagem(
          "A tabela sumulas_digitais ainda não existe no Supabase. Rode o script SQL de criação da súmula digital."
        );
      } else {
        setMensagem("Não foi possível carregar as súmulas disponíveis.");
      }
      setAvailableSumulas([]);
      setCarregando(false);
      return;
    }

    setAvailableSumulas(data || []);
    setCarregando(false);
  }, []);

  const buscarResultadosDaSumula = useCallback(async (sumulaId) => {
    const { data, error } = await supabase
      .from("sumula_resultados")
      .select(
        `*, atleta:atletas (id, numero, nome, municipio, data_nascimento, escolas (nome))`
      )
      .eq("sumula_id", sumulaId);

    if (error) {
      setMensagem("Erro ao carregar atletas da súmula: " + error.message);
      return [];
    }

    return (data || []).map(normalizarResultado);
  }, []);

  const anexarSerieERaia = useCallback(async (lista, provaId) => {
    if (!Array.isArray(lista) || lista.length === 0 || !provaId) return lista;

    const atletaIds = [...new Set(lista.map((r) => r.atleta_id).filter(Boolean))];
    if (atletaIds.length === 0) return lista;

    const { data, error } = await supabase
      .from("inscricoes")
      .select(
        `id, atleta_id, raias (raia, serie_id, serie:series (id, numero_serie))`
      )
      .eq("prova_id", provaId)
      .in("atleta_id", atletaIds);

    if (error) {
      return lista.map((r, index) => ({
        ...r,
        serie_numero: r.serie_numero || 1,
        raia_numero: r.raia_numero || index + 1,
      }));
    }

    const mapa = new Map();

    (data || []).forEach((inscricao) => {
      const primeiraRaia = Array.isArray(inscricao.raias) ? inscricao.raias[0] : inscricao.raias;
      mapa.set(String(inscricao.atleta_id), {
        inscricao_id: inscricao.id,
        serie_id: primeiraRaia?.serie?.id || primeiraRaia?.serie_id || null,
        serie_numero: primeiraRaia?.serie?.numero_serie || null,
        raia_numero: primeiraRaia?.raia || null,
      });
    });

    return lista.map((r, index) => {
      const info = mapa.get(String(r.atleta_id));
      return {
        ...r,
        inscricao_id: info?.inscricao_id || r.inscricao_id || null,
        serie_id: info?.serie_id || r.serie_id || null,
        serie_numero: info?.serie_numero || r.serie_numero || 1,
        raia_numero: info?.raia_numero || r.raia_numero || index + 1,
      };
    });
  }, []);

  const sincronizarResultadosParaPista = useCallback(async (classificacaoParcial, listaBase = resultados) => {
    if (!sumula?.prova_id || (listaBase || []).length === 0) return;

    const dataResultado = new Date().toISOString().slice(0, 10);

    const linhas = (listaBase || [])
      .filter((r) => r.inscricao_id)
      .map((r) => {
        const melhorMarcaCampo = r.marca || melhorTentativaTexto(r.tentativas, 6) || null;

        return {
          prova_id: sumula.prova_id,
          serie_id: r.serie_id || null,
          inscricao_id: r.inscricao_id,
          data_resultado: dataResultado,
          tempo: ehProvaCampo ? null : r.tempo || null,
          colocacao: classificacaoParcial[r.id] || null,
          status: normalizarStatus(r.observacao),
          tentativa1: ehProvaCampo ? (r.tentativas?.[0] || null) : null,
          tentativa2: ehProvaCampo ? (r.tentativas?.[1] || null) : null,
          tentativa3: ehProvaCampo ? (r.tentativas?.[2] || null) : null,
          tentativa4: ehProvaCampo ? (r.tentativas?.[3] || null) : null,
          tentativa5: ehProvaCampo ? (r.tentativas?.[4] || null) : null,
          tentativa6: ehProvaCampo ? (r.tentativas?.[5] || null) : null,
          melhor_marca: ehProvaCampo ? melhorMarcaCampo : null,
          classificacao_parcial: classificacaoParcial[r.id] || null,
          classificacao_parcial_final: ehProvaCampo ? classificacaoParcial[r.id] || null : null,
          finalista: ehProvaCampo,
          alturas: [],
          resultado_final: ehProvaCampo ? melhorMarcaCampo : r.tempo || null,
          publicado: true,
          qualificacao: r.resultado || null,
        };
      });

    if (linhas.length === 0) return;

    const inscricoesIds = [...new Set(linhas.map((l) => l.inscricao_id))];

    const { data: existentes, error: erroExistentes } = await supabase
      .from("resultados")
      .select("id, inscricao_id")
      .eq("prova_id", sumula.prova_id)
      .in("inscricao_id", inscricoesIds);

    if (erroExistentes) {
      throw new Error("Erro ao verificar resultados da pista: " + erroExistentes.message);
    }

    const mapaExistentes = new Map((existentes || []).map((e) => [String(e.inscricao_id), e.id]));

    const paraAtualizar = [];
    const paraInserir = [];

    linhas.forEach((linha) => {
      const idExistente = mapaExistentes.get(String(linha.inscricao_id));
      if (idExistente) {
        paraAtualizar.push({ id: idExistente, ...linha });
      } else {
        paraInserir.push(linha);
      }
    });

    if (paraAtualizar.length > 0) {
      const { error } = await supabase
        .from("resultados")
        .upsert(paraAtualizar, { onConflict: "id" });

      if (error) {
        throw new Error("Erro ao atualizar resultados da pista: " + error.message);
      }
    }

    if (paraInserir.length > 0) {
      const { error } = await supabase.from("resultados").insert(paraInserir);
      if (error) {
        throw new Error("Erro ao inserir resultados da pista: " + error.message);
      }
    }
  }, [ehProvaCampo, resultados, sumula]);

  const executarRpcComFallback = useCallback(async (nomeRpc, parametros, fallbackFn) => {
    const { error } = await supabase.rpc(nomeRpc, parametros);

    if (!error) {
      return { ok: true, via: "rpc" };
    }

    if (typeof fallbackFn !== "function") {
      return { ok: false, via: "rpc", error };
    }

    const erroTexto = String(error.message || "").toLowerCase();
    const rpcNaoDisponivel =
      error.code === "PGRST202" ||
      erroTexto.includes("function") ||
      erroTexto.includes("rpc") ||
      erroTexto.includes("not found");

    if (!rpcNaoDisponivel) {
      return { ok: false, via: "rpc", error };
    }

    const fallbackResult = await fallbackFn();
    return fallbackResult?.error
      ? { ok: false, via: "fallback", error: fallbackResult.error }
      : { ok: true, via: "fallback" };
  }, []);

  const carregarResultadosIniciais = useCallback(async (sumulaId, provaId) => {
    if (!sumulaId || !provaId) {
      setMensagem("Não foi possível preparar a súmula: prova não identificada.");
      setResultados([]);
      return;
    }

    const { data: inscricoes, error: erroInscricoes } = await supabase
      .from("inscricoes")
      .select("atleta_id")
      .eq("prova_id", provaId);

    if (erroInscricoes) {
      setMensagem("Erro ao carregar inscritos da prova: " + erroInscricoes.message);
      setResultados([]);
      return;
    }

    const atletaIds = [...new Set((inscricoes || []).map((i) => i.atleta_id).filter(Boolean))];
    if (atletaIds.length === 0) {
      setMensagem("Esta súmula não tem atletas inscritos. Cadastre os inscritos na prova e tente novamente.");
      setResultados([]);
      return;
    }

    const payload = atletaIds.map((atletaId) => ({
      sumula_id: sumulaId,
      atleta_id: atletaId,
      tentativas: ["", "", "", "", "", ""],
    }));

    const resultadoPreparacao = await executarRpcComFallback(
      "preparar_sumula_resultados_por_token",
      {
        p_sumula_id: sumulaId,
        p_token_acesso: token,
        p_atleta_ids: atletaIds,
      },
      () =>
        supabase
          .from("sumula_resultados")
          .upsert(payload, { onConflict: "sumula_id,atleta_id" })
    );

    const erroInsert = resultadoPreparacao.ok ? null : resultadoPreparacao.error;

    if (erroInsert) {
      setMensagem("Erro ao preparar atletas da súmula: " + erroInsert.message);
      setResultados([]);
      return;
    }

    const novosResultados = await buscarResultadosDaSumula(sumulaId);
    const resultadosComSerie = await anexarSerieERaia(novosResultados, provaId);
    setResultados(resultadosComSerie);
    setMensagem("Atletas carregados na súmula. Você já pode lançar os resultados.");
  }, [anexarSerieERaia, buscarResultadosDaSumula, executarRpcComFallback, token]);

  const carregarSumula = useCallback(async () => {
    setCarregando(true);
    setMensagem("");

    const { data, error } = await supabase
      .from("sumulas_digitais")
      .select(
        `*, prova:provas (*), sumula_resultados (*, atleta:atletas (id, numero, nome, municipio, data_nascimento, escolas (nome)))`
      )
      .eq("token_acesso", token)
      .maybeSingle();

    if (error || !data) {
      setMensagem("Acesso não autorizado ou súmula indisponível.");
      setCarregando(false);
      return;
    }

    const expirou = data.expires_at && new Date(data.expires_at) < new Date();
    const bloqueado = data.status === "BLOQUEADA";

    if (expirou || bloqueado) {
      setMensagem("Acesso não autorizado ou súmula indisponível.");
      setCarregando(false);
      return;
    }

    setSumula(data);
    setStatusFluxo(data.status === "ENVIADA" ? "finalizada" : "em_preenchimento");
    const resultadosAtuais = (data.sumula_resultados || []).map(normalizarResultado);

    if (resultadosAtuais.length === 0) {
      await carregarResultadosIniciais(data.id, data.prova_id);
      setCarregando(false);
      return;
    }

    const resultadosComSerie = await anexarSerieERaia(resultadosAtuais, data.prova_id);
    setResultados(resultadosComSerie);
    setCarregando(false);
  }, [anexarSerieERaia, carregarResultadosIniciais, token]);

  useEffect(() => {
    localStorage.setItem("arbitro_nome", nomeArbitro);
  }, [nomeArbitro]);

  useEffect(() => {
    async function carregarTela() {
      if (!token) {
        setMensagem("");
        setSumula(null);
        setResultados([]);
        await carregarAvailableSumulas();
        return;
      }

      await carregarSumula();
    }

    void carregarTela();
  }, [token, carregarAvailableSumulas, carregarSumula]);

  function isEditavel() {
    return sumula && ["ABERTA", "EM_ANDAMENTO"].includes(sumula.status);
  }

  function obterItensDaSerie(serieNumero) {
    return resultados.filter((item) => Number(item.serie_numero || 1) === Number(serieNumero));
  }

  const mapaStatusFluxo = {
    aguardando: "Aguardando",
    prova_na_pista: "Prova na pista",
    em_preenchimento: "Em preenchimento",
    em_conferencia: "Em conferência",
    classificacao_confirmada: "Classificação confirmada",
    finalizada: "Súmula finalizada",
    publicada_telao: "Publicada no telão",
  };

  const registrarHistorico = useCallback(async (acao, detalhes = {}) => {
    if (!sumula?.id || !token) return;

    const parametros = {
      p_sumula_id: sumula.id,
      p_token_acesso: token,
      p_acao: acao,
      p_arbitro_nome: nomeArbitro || sumula.arbitro_nome || null,
      p_detalhes: detalhes,
    };

    const { error: erroRpc } = await supabase.rpc("registrar_historico_sumula_por_token", parametros);
    if (!erroRpc) return;

    const { error } = await supabase
      .from("sumula_historico_acoes")
      .insert({
        sumula_id: sumula.id,
        token_acesso: token,
        acao,
        arbitro_nome: nomeArbitro || sumula.arbitro_nome || null,
        detalhes,
      });

    if (error && !tabelaInexistente(error, "sumula_historico_acoes")) {
      console.warn("Falha ao registrar histórico da súmula", error.message || error);
    }
  }, [nomeArbitro, sumula, token]);

  function atualizarResultado(id, campo, valor) {
    const alvo = resultados.find((item) => item.id === id);
    if (alvo?.serie_numero) {
      setSeriesConfirmadas((old) => ({ ...old, [alvo.serie_numero]: false }));
    }

    if (statusFluxo === "classificacao_confirmada") {
      setStatusFluxo("em_preenchimento");
    }

    setResultados((old) =>
      old.map((r) => {
        if (r.id !== id) return r;
        if (campo.startsWith("tentativas.")) {
          const index = Number(campo.split(".")[1]);
          const tentativas = [...(r.tentativas || ["", "", "", "", "", ""])];
          tentativas[index] = valor;
          return { ...r, tentativas };
        }
        return { ...r, [campo]: valor };
      })
    );
    setAlterado(true);
  }

  function gerarClassificacaoParcial(lista) {
    const porSerie = lista.reduce((acc, item) => {
      const chave = item.serie_numero || 1;
      if (!acc[chave]) acc[chave] = [];
      acc[chave].push(item);
      return acc;
    }, {});

    const classificacao = {};

    Object.values(porSerie).forEach((grupo) => {
      const ordenados = ordenarResultadosParaClassificacao(grupo);
      ordenados.forEach((item, idx) => {
        classificacao[item.id] = idx + 1;
      });
    });

    return classificacao;
  }

  const resultadosPorSerie = useMemo(() => {
    const mapa = new Map();

    resultados.forEach((item) => {
      const serie = item.serie_numero || 1;
      if (!mapa.has(serie)) mapa.set(serie, []);
      mapa.get(serie).push(item);
    });

    return [...mapa.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([serieNumero, itens]) => ({
        serieNumero,
        itens: itens.sort((a, b) => {
          const raiaA = Number(a.raia_numero || 999);
          const raiaB = Number(b.raia_numero || 999);
          if (raiaA !== raiaB) return raiaA - raiaB;
          return (a.atleta?.numero || 0) - (b.atleta?.numero || 0);
        }),
      }));
  }, [resultados]);

  const publicarTelaoControle = useCallback(async (sumulaRecord, dados) => {
    const payloadComSumula = {
      prova_id: sumulaRecord?.prova_id,
      sumula_id: sumulaRecord?.id,
      publicado: true,
      dados,
      atualizado_em: new Date().toISOString(),
    };

    const payloadSemSumula = {
      prova_id: sumulaRecord?.prova_id,
      publicado: true,
      dados,
      atualizado_em: new Date().toISOString(),
    };

    const { data: atualizadosPorSumula, error: erroUpdatePorSumula } = await supabase
      .from("telao_pista_controle")
      .update(payloadComSumula)
      .eq("sumula_id", sumulaRecord?.id)
      .select("id")
      .limit(1);

    if (!erroUpdatePorSumula && (atualizadosPorSumula || []).length > 0) {
      return;
    }

    const usarFallbackPorProva =
      !!erroUpdatePorSumula && colunaNaoExiste(erroUpdatePorSumula, "sumula_id");

    if (usarFallbackPorProva) {
      const { data: atualizadosPorProva, error: erroUpdatePorProva } = await supabase
        .from("telao_pista_controle")
        .update(payloadSemSumula)
        .eq("prova_id", sumulaRecord?.prova_id)
        .select("id")
        .limit(1);

      if (!erroUpdatePorProva && (atualizadosPorProva || []).length > 0) {
        return;
      }

      const { error: erroInsertSemSumula } = await supabase
        .from("telao_pista_controle")
        .insert(payloadSemSumula);

      if (erroInsertSemSumula) {
        throw new Error("Erro ao publicar no telão da pista: " + erroInsertSemSumula.message);
      }

      return;
    }

    if (erroUpdatePorSumula && !colunaNaoExiste(erroUpdatePorSumula, "sumula_id")) {
      throw new Error("Erro ao publicar no telão da pista: " + erroUpdatePorSumula.message);
    }

    const { error: erroInsert } = await supabase
      .from("telao_pista_controle")
      .insert(payloadComSumula);

    if (erroInsert) {
      throw new Error("Erro ao publicar no telão da pista: " + erroInsert.message);
    }
  }, []);

  function construirAtletasTelao(listaResultados = []) {
    return [...(listaResultados || [])]
      .sort((a, b) => {
        const serieA = Number(a.serie_numero || 1);
        const serieB = Number(b.serie_numero || 1);
        if (serieA !== serieB) return serieA - serieB;
        return Number(a.raia_numero || 999) - Number(b.raia_numero || 999);
      })
      .map((r, index) => ({
        serie: `SÉRIE ${r.serie_numero || 1}`,
        raia: r.raia_numero || null,
        ordem: index + 1,
        nome: r.atleta?.nome || "-",
        escola: r.atleta?.escolas?.nome || "-",
        municipio: r.atleta?.municipio || "-",
      }));
  }

  const publicarProvaNaPistaNoTelao = useCallback(async (sumulaRecord, listaResultados = []) => {
    const dados = {
      tipo: "prova_na_pista",
      status: "PROVA NA PISTA",
      status_telao: "aguardando_largada",
      titulo: sumulaRecord?.prova?.nome || "",
      categoria: sumulaRecord?.prova?.categoria || "",
      naipe: sumulaRecord?.prova?.naipe || "",
      fase: sumulaRecord?.prova?.fase || "QUALIFICAÇÃO",
      serie: sumulaRecord?.serie || `SÉRIE ${(listaResultados[0]?.serie_numero || 1)}`,
      atletas: construirAtletasTelao(listaResultados),
      ultima_atualizacao: new Date().toISOString(),
    };

    await publicarTelaoControle(sumulaRecord, dados);
  }, [publicarTelaoControle]);

  const publicarResultadoOficialNoTelao = useCallback(async (sumulaRecord, conferencia) => {
    const ordenados = conferencia?.ordenados || [];
    const podio = ordenados
      .filter((item) => item.colocacao)
      .slice(0, 3)
      .map((item) => ({
        colocacao: item.colocacao,
        atleta: item.atleta?.nome || "-",
        resultado: item.resultado || "-",
      }));

    const dados = {
      tipo: "resultado_oficial",
      status: "RESULTADO OFICIAL",
      status_telao: "resultado_oficial",
      titulo: sumulaRecord?.prova?.nome || "",
      categoria: sumulaRecord?.prova?.categoria || "",
      naipe: sumulaRecord?.prova?.naipe || "",
      fase: sumulaRecord?.prova?.fase || "QUALIFICAÇÃO",
      serie: sumulaRecord?.serie || `SÉRIE ${(ordenados[0]?.serie_numero || 1)}`,
      resultados: ordenados.map((item) => ({
        colocacao: item.colocacao || null,
        serie: item.serie_numero || 1,
        raia: item.raia_numero || null,
        nome: item.atleta?.nome || "-",
        escola: item.atleta?.escolas?.nome || "-",
        municipio: item.atleta?.municipio || "-",
        resultado: item.resultado || "-",
        situacao: item.situacao || "OK",
      })),
      podio,
      ultima_atualizacao: new Date().toISOString(),
    };

    await publicarTelaoControle(sumulaRecord, dados);
  }, [publicarTelaoControle]);

  const salvarSumula = useCallback(async (automatico = false, opcoes = {}) => {
    if (!sumula || resultados.length === 0) return false;

    const {
      mensagemInicio,
      mensagemSucesso,
      registrarAcao = !automatico,
      acaoHistorico = "salvar_rascunho",
      listaResultados = resultados,
      classificacaoOverride = null,
    } = opcoes;

    setSalvando(true);
    setMensagem(mensagemInicio || (automatico ? "Salvando rascunho..." : "Salvando..."));

    const classificacaoParcial = classificacaoOverride || gerarClassificacaoParcial(listaResultados);

    const resultadosParaSalvar = (listaResultados || []).map((r) => ({
      id: r.id,
      sumula_id: sumula.id,
      atleta_id: r.atleta_id,
      resultado: r.resultado || "",
      tempo: r.tempo || "",
      marca: marcaParaNumero(ehProvaCampo ? r.marca || melhorTentativaTexto(r.tentativas, 6) : r.marca),
      tentativas: r.tentativas,
      classificacao: classificacaoParcial[r.id] || null,
      observacao: r.observacao || "",
      updated_at: new Date().toISOString(),
    }));

    const resultadoSalvar = await executarRpcComFallback(
      "gravar_sumula_resultados_por_token",
      {
        p_sumula_id: sumula.id,
        p_token_acesso: token,
        p_resultados: resultadosParaSalvar,
      },
      () =>
        supabase
          .from("sumula_resultados")
          .upsert(resultadosParaSalvar, { onConflict: "id" })
    );

    const erroSalvar = resultadoSalvar.ok ? null : resultadoSalvar.error;

    if (erroSalvar) {
      setMensagem("Erro ao salvar resultados: " + erroSalvar.message);
      setSalvando(false);
      return false;
    }

    try {
      await sincronizarResultadosParaPista(classificacaoParcial, listaResultados);
    } catch (erroPista) {
      setMensagem(erroPista.message || "Erro ao sincronizar resultados para a pista.");
      setSalvando(false);
      return false;
    }

    const novoStatus = sumula.status === "ABERTA" ? "EM_ANDAMENTO" : sumula.status;

    if (!bloquearAtualizacaoStatus) {
      const resultadoStatus = await executarRpcComFallback(
        "atualizar_status_sumula_por_token",
        {
          p_sumula_id: sumula.id,
          p_token_acesso: token,
          p_status: novoStatus,
        },
        () => supabase.from("sumulas_digitais").update({ status: novoStatus }).eq("id", sumula.id)
      );

      const erroStatus = resultadoStatus.ok ? null : resultadoStatus.error;

      if (erroStatus && erroTriggerUpdatedAt(erroStatus)) {
        setBloquearAtualizacaoStatus(true);
        setMensagem(
          "Resultados salvos. O status da súmula não foi atualizado porque o trigger do banco usa updated_at; aplique o SQL de correção."
        );
      } else if (erroStatus) {
        setMensagem("Erro ao atualizar status: " + erroStatus.message);
        setSalvando(false);
        return false;
      }
    }

    setSumula((old) => ({ ...old, status: novoStatus }));
    setResultados((old) =>
      old.map((r) => ({
        ...r,
        classificacao:
          Object.prototype.hasOwnProperty.call(classificacaoParcial, r.id)
            ? classificacaoParcial[r.id] || null
            : r.classificacao || null,
      }))
    );

    if (!erroTriggerUpdatedAt({ message: mensagem })) {
      setMensagem(mensagemSucesso || (automatico ? "Rascunho salvo automaticamente." : "Rascunho salvo com sucesso."));
    }

    if (registrarAcao) {
      void registrarHistorico(acaoHistorico, {
        status_sumula: novoStatus,
        quantidade_atletas: (listaResultados || []).length,
      });
    }

    setAlterado(false);
    setUltimoSalvo(new Date());
    setStatusFluxo("em_preenchimento");
    setSalvando(false);
    return true;
  }, [
    bloquearAtualizacaoStatus,
    ehProvaCampo,
    mensagem,
    registrarHistorico,
    resultados,
    sincronizarResultadosParaPista,
    sumula,
    token,
    executarRpcComFallback,
  ]);

  useEffect(() => {
    if (!alterado || salvando) return;
    const timeout = setTimeout(() => {
      void salvarSumula(true);
    }, 2500);
    return () => clearTimeout(timeout);
  }, [alterado, salvando, salvarSumula]);

  async function enviarProvaNaPista(serieNumero) {
    if (!sumula) return;
    const itensSerie = obterItensDaSerie(serieNumero);
    if (itensSerie.length === 0) return;

    const confirmar = window.confirm(
      "Deseja enviar esta prova para o telão da pista com a lista de atletas?"
    );

    if (!confirmar) return;

    setSalvando(true);
    setMensagem("Publicando prova no telão da pista...");

    try {
      await publicarProvaNaPistaNoTelao(
        { ...sumula, serie: `SÉRIE ${serieNumero}` },
        itensSerie
      );
      setStatusFluxo("prova_na_pista");
      setMensagem(`Série ${serieNumero} enviada para o telão. Status: AGUARDANDO LARGADA.`);
      void registrarHistorico("prova_na_pista", {
        serie: serieNumero,
        quantidade_atletas: itensSerie.length,
        prova_id: sumula.prova_id,
      });
    } catch (erro) {
      setMensagem("Falha ao enviar prova para o telão: " + (erro.message || erro));
    } finally {
      setSalvando(false);
    }
  }

  async function abrirConferenciaResultado(serieNumero) {
    if (!sumula) return;
    const itensSerie = obterItensDaSerie(serieNumero);
    if (itensSerie.length === 0) return;

    const salvo = await salvarSumula(false, {
      mensagemInicio: "Salvando para conferência...",
      mensagemSucesso: "Rascunho salvo para conferência.",
      registrarAcao: false,
    });

    if (!salvo) return;

    const conferencia = construirConferenciaResultado(itensSerie, ehProvaCampo);
    setClassificacaoConferencia(conferencia.ordenados);
    setSerieEmConferencia(serieNumero);
    setConferenciaAberta(true);
    setSeriesConfirmadas((old) => ({ ...old, [serieNumero]: false }));
    setStatusFluxo("em_conferencia");

    void registrarHistorico("conferir_resultado", {
      serie: serieNumero,
      validos: conferencia.validos.length,
      invalidos: conferencia.invalidos.length,
    });
  }

  function voltarECorrigir() {
    setConferenciaAberta(false);
    setSerieEmConferencia(null);
    setStatusFluxo("em_preenchimento");
    void registrarHistorico("voltar_corrigir", {});
  }

  function confirmarClassificacao() {
    if (!serieEmConferencia) return;
    const itensSerie = obterItensDaSerie(serieEmConferencia);
    const conferencia = construirConferenciaResultado(itensSerie, ehProvaCampo);
    setClassificacaoConferencia(conferencia.ordenados);
    setSeriesConfirmadas((old) => ({ ...old, [serieEmConferencia]: true }));
    setStatusFluxo("classificacao_confirmada");

    setResultados((old) =>
      old.map((r) => ({
        ...r,
        classificacao:
          Object.prototype.hasOwnProperty.call(conferencia.mapaColocacao, r.id)
            ? conferencia.mapaColocacao[r.id] || null
            : r.classificacao || null,
      }))
    );

    void registrarHistorico("confirmar_classificacao", {
      serie: serieEmConferencia,
      quantidade_classificados: conferencia.validos.length,
    });
  }

  async function finalizarELancarNoTelao(serieNumeroArg = null) {
    const serieAlvo = serieNumeroArg || serieEmConferencia;
    if (!sumula || !serieAlvo) return;
    const itensSerie = obterItensDaSerie(serieAlvo);
    if (itensSerie.length === 0) return;

    if (!seriesConfirmadas[serieAlvo]) {
      setMensagem(`Confirme a classificação da série ${serieAlvo} antes de finalizar.`);
      return;
    }

    const confirmar = window.confirm(
      "Após finalizar, a súmula será bloqueada e o resultado será lançado no telão. Deseja continuar?"
    );

    if (!confirmar) return;

    const conferenciaFinal = construirConferenciaResultado(itensSerie, ehProvaCampo);
    const listaFinal = itensSerie.map((r) => ({
      ...r,
      classificacao: conferenciaFinal.mapaColocacao[r.id] || null,
    }));

    setResultados((old) =>
      old.map((r) => {
        const daSerie = listaFinal.find((item) => item.id === r.id);
        return daSerie || r;
      })
    );

    setSalvando(true);
    setMensagem("Finalizando súmula e lançando no telão...");

    const salvo = await salvarSumula(false, {
      mensagemInicio: "Salvando resultado oficial...",
      mensagemSucesso: "Resultado oficial salvo.",
      registrarAcao: false,
      listaResultados: listaFinal,
      classificacaoOverride: conferenciaFinal.mapaColocacao,
    });

    if (!salvo) {
      setSalvando(false);
      return;
    }

    const enviadaEm = new Date().toISOString();

    try {
      await publicarResultadoOficialNoTelao(
        { ...sumula, status: "EM_ANDAMENTO", serie: `SÉRIE ${serieAlvo}` },
        conferenciaFinal
      );
    } catch (erroTelao) {
      setMensagem("Súmula finalizada, mas houve erro ao publicar no telão: " + (erroTelao.message || erroTelao));
      setSalvando(false);
      return;
    }

    setSeriesFinalizadas((old) => ({ ...old, [serieAlvo]: true }));
    setConferenciaAberta(false);
    setSerieEmConferencia(null);
    setStatusFluxo("publicada_telao");
    setMensagem(`Série ${serieAlvo} finalizada e resultado oficial publicado no telão.`);

    void registrarHistorico("finalizar_lancar_telao", {
      serie: serieAlvo,
      finalizada_em: enviadaEm,
      quantidade_resultados: conferenciaFinal.ordenados.length,
      podio: conferenciaFinal.validos.slice(0, 3).map((item) => ({
        colocacao: item.colocacao,
        atleta: item.atleta?.nome || "-",
      })),
    });

    setSalvando(false);
  }

  async function abrirSumulaParaLancamento(sd) {
    const nome = String(nomeArbitro || "").trim();
    if (!nome) {
      setMensagem("Informe o nome do árbitro para abrir a súmula de lançamento.");
      return;
    }

    const atual = String(sd.arbitro_nome || "").trim().toLowerCase();
    const informado = nome.toLowerCase();

    if (atual && atual !== informado) {
      setMensagem("Essa súmula já está vinculada a outro árbitro.");
      return;
    }

    if (!atual) {
      const resultadoVinculo = await executarRpcComFallback(
        "vincular_arbitro_sumula_por_token",
        {
          p_sumula_id: sd.id,
          p_token_acesso: sd.token_acesso,
          p_arbitro_nome: nome,
        },
        () =>
          supabase
            .from("sumulas_digitais")
            .update({ arbitro_nome: nome })
            .eq("id", sd.id)
            .is("arbitro_nome", null)
      );

      const error = resultadoVinculo.ok ? null : resultadoVinculo.error;

      if (error && !erroTriggerUpdatedAt(error)) {
        setMensagem("Não foi possível vincular a súmula ao árbitro: " + error.message);
        return;
      }
    }

    navigate(`/arbitro/sumula/${sd.token_acesso}`);
  }

  if (carregando) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Súmula Digital do Árbitro</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            background: "#ffffff",
            borderRadius: 20,
            padding: 32,
            boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
          }}
        >
          <h1 style={{ marginTop: 0 }}>Acesso do Árbitro</h1>
          <p style={{ color: "#475569" }}>
            Escolha a súmula que você vai conduzir. Clique no item abaixo para abrir.
          </p>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
              Nome do árbitro
            </label>
            <input
              value={nomeArbitro}
              onChange={(e) => setNomeArbitro(e.target.value)}
              placeholder="Digite seu nome"
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }}
            />
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 18,
              background: "#f8fafc",
              borderRadius: 16,
              border: "1px solid #cbd5e1",
              color: "#334155",
            }}
          >
            Se você já tem um token, peça ao coordenador para registrar a súmula no painel e ela aparecerá aqui.
          </div>

          {mensagem && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: "#f8fafc",
                borderRadius: 12,
                border: "1px solid #c7d2fe",
                color: "#1e293b",
              }}
            >
              {mensagem}
            </div>
          )}

          <div style={{ marginTop: 32 }}>
            <h2 style={{ margin: "0 0 16px" }}>Súmulas disponíveis</h2>

            {sumulasFiltradas.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                }}
              >
                Nenhuma súmula disponível para este árbitro no momento.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {sumulasFiltradas.map((sd) => (
                  <button
                    key={sd.id}
                    onClick={() => abrirSumulaParaLancamento(sd)}
                    style={{
                      textAlign: "left",
                      padding: 18,
                      borderRadius: 16,
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{sd.prova?.nome || "Súmula sem prova"}</div>
                        <div style={{ color: "#475569", marginTop: 6 }}>
                          {sd.prova?.categoria || "-"} • {sd.prova?.naipe || "-"} • {sd.prova?.fase || "QUALIFICAÇÃO"}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "#2563eb",
                          color: "white",
                          fontSize: 12,
                        }}
                      >
                        {sd.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div style={{ marginTop: 10, color: "#475569", fontSize: 13 }}>
                      Árbitro: {sd.arbitro_nome || "Não vinculado"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!sumula) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Acesso não autorizado</h1>
        <p>{mensagem || "Token inválido ou súmula indisponível."}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
      <div style={{ maxWidth: 1220, margin: "0 auto" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "#ffffff",
            borderRadius: 16,
            padding: "20px 24px",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  textTransform: "uppercase",
                  color: "#2563eb",
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                SÚMULA DIGITAL DO ÁRBITRO
              </p>
              <h1 style={{ margin: "8px 0 0", fontSize: 28 }}>{sumula.prova?.nome}</h1>
              <p style={{ margin: "10px 0 0", color: "#475569" }}>
                <strong>Categoria:</strong> {sumula.prova?.categoria || "-"} • <strong>Naipe:</strong>{" "}
                {sumula.prova?.naipe || "-"} • <strong>Fase:</strong> {sumula.prova?.fase || "QUALIFICAÇÃO"}
              </p>
              <p style={{ margin: "6px 0 0", color: "#475569" }}>
                <strong>Status:</strong> {sumula.status.replaceAll("_", " ")}
              </p>
              <p style={{ margin: "6px 0 0", color: "#475569" }}>
                <strong>Fluxo:</strong> {mapaStatusFluxo[statusFluxo] || statusFluxo}
              </p>
              <p style={{ margin: "6px 0 0", color: "#475569" }}>
                <strong>Árbitro:</strong> {sumula.arbitro_nome || nomeArbitro || "Não informado"}
              </p>
            </div>

            <div style={{ minWidth: 240, maxWidth: 360, display: "grid", gap: 10 }}>
              <div
                style={{
                  padding: 16,
                  background: "#eff6ff",
                  borderRadius: 16,
                  border: "1px solid #bfdbfe",
                }}
              >
                <div style={{ color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>Série / Grupo</div>
                <div style={{ color: "#334155" }}>{sumula.serie || sumula.prova?.serie || "Sem grupo definido"}</div>
              </div>

              <div
                style={{
                  padding: 16,
                  background: "#fef3c7",
                  borderRadius: 16,
                  border: "1px solid #fde68a",
                }}
              >
                <div style={{ color: "#92400e", fontWeight: 700, marginBottom: 8 }}>Aviso</div>
                <div style={{ color: "#854d0e" }}>
                  {salvando
                    ? "Salvando..."
                    : alterado
                      ? "Alterações pendentes"
                      : "Último salvamento: " + (ultimoSalvo ? formatarDataHora(ultimoSalvo) : "Ainda não salvo")}
                </div>
              </div>
            </div>
          </div>
        </header>

        {mensagem && (
          <div
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #c7d2fe",
              color: "#1e293b",
            }}
          >
            {mensagem}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {resultados.length === 0 ? (
            <div
              style={{
                borderRadius: 18,
                background: "#ffffff",
                padding: 20,
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Sem atletas para lançar</h3>
              <p style={{ marginTop: 0, color: "#475569" }}>
                Esta súmula ainda não possui atletas carregados.
              </p>
              <button
                onClick={() => carregarResultadosIniciais(sumula?.id, sumula?.prova_id)}
                disabled={!sumula || salvando}
                style={{
                  padding: "12px 18px",
                  borderRadius: 12,
                  background: "#2563eb",
                  border: "none",
                  color: "white",
                  cursor: sumula ? "pointer" : "not-allowed",
                }}
              >
                Carregar atletas da prova
              </button>
            </div>
          ) : (
            resultadosPorSerie.map((grupo) => (
              <div
                key={`serie-${grupo.serieNumero}`}
                style={{
                  borderRadius: 18,
                  background: "#ffffff",
                  padding: 16,
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
                }}
              >
                <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#0f172a" }}>
                  Série {grupo.serieNumero}
                </h3>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {seriesFinalizadas[grupo.serieNumero] && (
                    <span style={{ padding: "6px 10px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 12 }}>
                      Resultado oficial publicado
                    </span>
                  )}
                  {seriesConfirmadas[grupo.serieNumero] && !seriesFinalizadas[grupo.serieNumero] && (
                    <span style={{ padding: "6px 10px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontWeight: 700, fontSize: 12 }}>
                      Classificação confirmada
                    </span>
                  )}
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1220 }}>
                    <thead>
                      <tr style={{ background: "#e2e8f0", color: "#0f172a" }}>
                        {!ehProvaCampo && (
                          <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>RAIA</th>
                        )}
                        <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>Nº</th>
                        <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>ATLETA</th>
                        <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>ESCOLA</th>
                        <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>NASCIMENTO</th>
                        {!ehProvaCampo && (
                          <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>TEMPO</th>
                        )}
                        {ehProvaCampo && [1, 2, 3].map((tentativa) => (
                          <th key={`th-tentativa-${tentativa}`} style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>
                            {tentativa}ª
                          </th>
                        ))}
                        {ehProvaCampo && (
                          <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>PARCIAL</th>
                        )}
                        {ehProvaCampo && (
                          <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>CLASS.</th>
                        )}
                        {ehProvaCampo && [4, 5].map((tentativa) => (
                          <th key={`th-tentativa-${tentativa}`} style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>
                            {tentativa}ª
                          </th>
                        ))}
                        {ehProvaCampo && (
                          <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>CLASSS. PARCIAL</th>
                        )}
                        {ehProvaCampo && (
                          <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>6ª</th>
                        )}
                        {ehProvaCampo && (
                          <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>RESULTADO FINAL</th>
                        )}
                        <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>COLOCAÇÃO</th>
                        <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>Q</th>
                        {!ehProvaCampo && (
                          <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 12 }}>STATUS</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.itens.map((r, index) => {
                        const editable = isEditavel() && !seriesFinalizadas[grupo.serieNumero];
                        const parcial3 = melhorTentativaTexto(r.tentativas, 3);
                        const parcial6 = r.marca || melhorTentativaTexto(r.tentativas, 6);
                        return (
                          <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            {!ehProvaCampo && (
                              <td style={{ padding: 8, fontSize: 12 }}>{r.raia_numero || index + 1}</td>
                            )}
                            <td style={{ padding: 8, fontSize: 12 }}>{r.atleta?.numero || "-"}</td>
                            <td style={{ padding: 8, fontSize: 12, fontWeight: 700 }}>{r.atleta?.nome || "-"}</td>
                            <td style={{ padding: 8, fontSize: 12 }}>{r.atleta?.escolas?.nome || "-"}</td>
                            <td style={{ padding: 8, fontSize: 12 }}>{formatarDataNascimento(r.atleta?.data_nascimento)}</td>
                            {!ehProvaCampo && (
                              <td style={{ padding: 8 }}>
                                <input
                                  value={r.tempo || ""}
                                  disabled={!editable}
                                  onChange={(e) => atualizarResultado(r.id, "tempo", e.target.value)}
                                  placeholder="00:00,00"
                                  style={{ width: 110, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
                                />
                              </td>
                            )}
                            {ehProvaCampo && [0, 1, 2].map((idx) => (
                              <td key={`${r.id}-tentativa-${idx}`} style={{ padding: 8 }}>
                                <input
                                  value={(r.tentativas || ["", "", "", "", "", ""])[idx] || ""}
                                  disabled={!editable}
                                  onChange={(e) => atualizarResultado(r.id, `tentativas.${idx}`, e.target.value)}
                                  placeholder="-"
                                  style={{ width: 78, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
                                />
                              </td>
                            ))}
                            {ehProvaCampo && (
                              <td style={{ padding: 8, fontSize: 12, fontWeight: 700 }}>{parcial3 || "-"}</td>
                            )}
                            {ehProvaCampo && (
                              <td style={{ padding: 8 }}>
                                <input
                                  value={r.classificacao || ""}
                                  disabled={!editable}
                                  onChange={(e) => atualizarResultado(r.id, "classificacao", e.target.value)}
                                  placeholder=""
                                  style={{ width: 84, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
                                />
                              </td>
                            )}
                            {ehProvaCampo && [3, 4].map((idx) => (
                              <td key={`${r.id}-tentativa-${idx}`} style={{ padding: 8 }}>
                                <input
                                  value={(r.tentativas || ["", "", "", "", "", ""])[idx] || ""}
                                  disabled={!editable}
                                  onChange={(e) => atualizarResultado(r.id, `tentativas.${idx}`, e.target.value)}
                                  placeholder="-"
                                  style={{ width: 78, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
                                />
                              </td>
                            ))}
                            {ehProvaCampo && (
                              <td style={{ padding: 8, fontSize: 12, color: "#475569" }}>-</td>
                            )}
                            {ehProvaCampo && (
                              <td style={{ padding: 8 }}>
                                <input
                                  value={(r.tentativas || ["", "", "", "", "", ""])[5] || ""}
                                  disabled={!editable}
                                  onChange={(e) => atualizarResultado(r.id, "tentativas.5", e.target.value)}
                                  placeholder="-"
                                  style={{ width: 78, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
                                />
                              </td>
                            )}
                            {ehProvaCampo && (
                              <td style={{ padding: 8 }}>
                                <input
                                  value={parcial6}
                                  disabled={!editable}
                                  onChange={(e) => atualizarResultado(r.id, "marca", e.target.value)}
                                  placeholder=""
                                  style={{ width: 110, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
                                />
                              </td>
                            )}
                            <td style={{ padding: 8 }}>
                              <input
                                value={r.classificacao || ""}
                                disabled={!editable}
                                onChange={(e) => atualizarResultado(r.id, "classificacao", e.target.value)}
                                style={{ width: 84, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
                              />
                            </td>
                            <td style={{ padding: 8 }}>
                              <input
                                value={r.resultado || ""}
                                disabled={!editable}
                                onChange={(e) => atualizarResultado(r.id, "resultado", e.target.value)}
                                placeholder="Q"
                                style={{ width: 70, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
                              />
                            </td>
                            {!ehProvaCampo && (
                              <td style={{ padding: 8 }}>
                                <select
                                  value={r.observacao || "OK"}
                                  disabled={!editable}
                                  onChange={(e) => atualizarResultado(r.id, "observacao", e.target.value)}
                                  style={{ width: 90, padding: "8px 6px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12 }}
                                >
                                  <option value="OK">OK</option>
                                  <option value="DQ">DQ</option>
                                  <option value="DNS">DNS</option>
                                  <option value="ABD">ABD</option>
                                  <option value="DNF">DNF</option>
                                  <option value="NM">NM</option>
                                </select>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <button
                    onClick={() => void enviarProvaNaPista(grupo.serieNumero)}
                    disabled={!isEditavel() || salvando || grupo.itens.length === 0}
                    style={{
                      minHeight: 44,
                      borderRadius: 10,
                      border: "none",
                      background: "#1d4ed8",
                      color: "white",
                      fontWeight: 700,
                      cursor: isEditavel() && grupo.itens.length > 0 ? "pointer" : "not-allowed",
                    }}
                  >
                    Prova na pista
                  </button>

                  <button
                    onClick={() => void salvarSumula(false, { listaResultados: grupo.itens })}
                    disabled={!isEditavel() || salvando || grupo.itens.length === 0}
                    style={{
                      minHeight: 44,
                      borderRadius: 10,
                      border: "none",
                      background: "#2563eb",
                      color: "white",
                      fontWeight: 700,
                      cursor: isEditavel() && grupo.itens.length > 0 ? "pointer" : "not-allowed",
                    }}
                  >
                    Salvar rascunho
                  </button>

                  <button
                    onClick={() => void abrirConferenciaResultado(grupo.serieNumero)}
                    disabled={!isEditavel() || salvando || grupo.itens.length === 0}
                    style={{
                      minHeight: 44,
                      borderRadius: 10,
                      border: "none",
                      background: "#0f766e",
                      color: "white",
                      fontWeight: 700,
                      cursor: isEditavel() && grupo.itens.length > 0 ? "pointer" : "not-allowed",
                    }}
                  >
                    Conferir resultado
                  </button>

                  <button
                    onClick={() => void finalizarELancarNoTelao(grupo.serieNumero)}
                    disabled={!isEditavel() || salvando || !seriesConfirmadas[grupo.serieNumero] || seriesFinalizadas[grupo.serieNumero]}
                    style={{
                      minHeight: 44,
                      borderRadius: 10,
                      border: "none",
                      background:
                        seriesConfirmadas[grupo.serieNumero] && !seriesFinalizadas[grupo.serieNumero]
                          ? "#dc2626"
                          : "#94a3b8",
                      color: "white",
                      fontWeight: 700,
                      cursor:
                        isEditavel() && seriesConfirmadas[grupo.serieNumero] && !seriesFinalizadas[grupo.serieNumero]
                          ? "pointer"
                          : "not-allowed",
                    }}
                  >
                    Finalizar e lançar no telão
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {conferenciaAberta && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.56)",
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              style={{
                width: "min(980px, 100%)",
                maxHeight: "88vh",
                overflow: "auto",
                background: "#ffffff",
                borderRadius: 18,
                boxShadow: "0 20px 60px rgba(15,23,42,0.26)",
                padding: 20,
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 6 }}>Conferência do Resultado</h2>
              <p style={{ marginTop: 0, color: "#475569" }}>
                {serieEmConferencia ? `Série ${serieEmConferencia} - ` : ""}
                Revise a classificação calculada automaticamente antes de finalizar.
              </p>

              <div style={{ overflowX: "auto", marginTop: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: "#e2e8f0" }}>
                      <th style={{ textAlign: "left", padding: 10 }}>Class.</th>
                      <th style={{ textAlign: "left", padding: 10 }}>Série</th>
                      <th style={{ textAlign: "left", padding: 10 }}>Raia</th>
                      <th style={{ textAlign: "left", padding: 10 }}>Atleta</th>
                      <th style={{ textAlign: "left", padding: 10 }}>Escola</th>
                      <th style={{ textAlign: "left", padding: 10 }}>Resultado</th>
                      <th style={{ textAlign: "left", padding: 10 }}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classificacaoConferencia.map((item) => (
                      <tr key={`conf-${item.id}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: 10, fontWeight: 700 }}>
                          {item.colocacao ? `${item.colocacao}º` : "-"}
                        </td>
                        <td style={{ padding: 10 }}>{item.serie_numero || 1}</td>
                        <td style={{ padding: 10 }}>{item.raia_numero || "-"}</td>
                        <td style={{ padding: 10, fontWeight: 700 }}>{item.atleta?.nome || "-"}</td>
                        <td style={{ padding: 10 }}>{item.atleta?.escolas?.nome || "-"}</td>
                        <td style={{ padding: 10 }}>{item.resultado || "-"}</td>
                        <td style={{ padding: 10 }}>{item.situacao || "OK"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                <button
                  onClick={voltarECorrigir}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Voltar e corrigir
                </button>

                <button
                  onClick={confirmarClassificacao}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 12,
                    border: "none",
                    background: "#0f766e",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Confirmar classificação
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, color: "#475569", fontWeight: 600 }}>
          Ações por série: use os botões no card de cada série para publicar e finalizar sem esperar as demais.
        </div>
      </div>
    </div>
  );
}
