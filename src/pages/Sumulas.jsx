import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import EtapaSelecaoProva from "./sumulas/components/EtapaSelecaoProva";
import EtapaLancamento from "./sumulas/components/EtapaLancamento";
import EtapaProximaFase from "./sumulas/components/EtapaProximaFase";
import SumulaImpressao from "./sumulas/components/SumulaImpressao";
import {
  formatarNascimento,
  tempoParaNumero,
  marcaParaNumero,
  formatarMarca,
} from "./sumulas/utils/formatadores";
import "./sumulas/styles/printSumulas.css";

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


const CONFIG_PADRAO = {
  texto_cabecalho: "SÚMULA OFICIAL DE ATLETISMO - JER 2026",
  mostrar_municipio: true,
  mostrar_assinaturas: true,
  quantidade_raias: 8,
  atletas_por_serie_campo: 15,
  finalistas_campo: 8,
  alturas_salto_altura: [
    "1.15", "1.20", "1.25", "1.30", "1.35", "1.40",
    "1.45", "1.50", "1.55", "1.60", "1.65", "1.70",
    "1.75", "1.80"
  ],
};

export default function Sumulas() {
  const hoje = new Date().toISOString().slice(0, 10);

  const [config, setConfig] = useState(CONFIG_PADRAO);
  const [provas, setProvas] = useState([]);
  const [provaSelecionada, setProvaSelecionada] = useState("");
  const [dataProva, setDataProva] = useState(hoje);
  const [series, setSeries] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [mostrarProximaFase, setMostrarProximaFase] = useState(false);

  const [buscaProva, setBuscaProva] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroNaipe, setFiltroNaipe] = useState("");
  const [filtroFase, setFiltroFase] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const [tipoProximaFase, setTipoProximaFase] = useState("FINAL");
  const [criterioClassificacao, setCriterioClassificacao] = useState("q_q");
  const [quantidadeClassificados, setQuantidadeClassificados] = useState(8);
  const [raiasProximaFase, setRaiasProximaFase] = useState(8);
  const [qAutomaticos, setQAutomaticos] = useState(2);
  const [qTempos, setQTempos] = useState(2);
  const [mostrarAvancadoProximaFase, setMostrarAvancadoProximaFase] = useState(false);
  const [previewProximaFase, setPreviewProximaFase] = useState([]);
  const [regraPreviewProximaFase, setRegraPreviewProximaFase] = useState(null);

  const [mostrarGerenciarInscritos, setMostrarGerenciarInscritos] = useState(false);
  const [inscricoesProva, setInscricoesProva] = useState([]);
  const [buscaAtleta, setBuscaAtleta] = useState("");
  const [atletasEncontrados, setAtletasEncontrados] = useState([]);
  const [carregandoInscritos, setCarregandoInscritos] = useState(false);
  const [sumulaDigital, setSumulaDigital] = useState(null);
  const [sumulasDigitais, setSumulasDigitais] = useState([]);
  const [tokenMensagem, setTokenMensagem] = useState("");

  
  useEffect(() => {
    carregarConfiguracoes();
    carregarProvas();
  }, []);

  useEffect(() => {
    if (!provaSelecionada) return;

    const intervalId = setInterval(() => {
      carregarSeries(provaSelecionada);
      carregarSumulaDigital(provaSelecionada);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [provaSelecionada]);

  useEffect(() => {
    if (mostrarAvancadoProximaFase) return;

    const regra = calcularRegraAutomaticaProximaFase();

    queueMicrotask(() => {
      setCriterioClassificacao(regra.criterio);
      setQAutomaticos(regra.qPorSerie);
      setQTempos(regra.qPorTempo);
      setQuantidadeClassificados(regra.totalClassificados);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series.length, raiasProximaFase, mostrarAvancadoProximaFase]);

  function gerarTokenAcesso() {
    return (
      window.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    );
  }

  function linkArbitro(token) {
    return `${window.location.origin}/arbitro/sumula/${token}`;
  }

  async function sincronizarResultadosDaSumula(sumulaId, provaId) {
    if (!sumulaId || !provaId) return { ok: false, message: "Súmula ou prova inválida." };

    const { data: inscricoes, error: erroInscricoes } = await supabase
      .from("inscricoes")
      .select("atleta_id")
      .eq("prova_id", provaId);

    if (erroInscricoes) {
      return { ok: false, message: "Erro ao carregar inscritos: " + erroInscricoes.message };
    }

    const atletaIds = [...new Set((inscricoes || []).map((i) => i.atleta_id).filter(Boolean))];
    if (atletaIds.length === 0) {
      return { ok: true, message: "Súmula criada sem atletas. Cadastre inscritos para lançar resultados." };
    }

    const payload = atletaIds.map((atletaId) => ({
      sumula_id: sumulaId,
      atleta_id: atletaId,
      tentativas: ["", "", "", "", "", ""],
    }));

    const { error: erroUpsert } = await supabase
      .from("sumula_resultados")
      .upsert(payload, { onConflict: "sumula_id,atleta_id" });

    if (erroUpsert) {
      return { ok: false, message: "Erro ao preparar resultados da súmula: " + erroUpsert.message };
    }

    return { ok: true, message: `Súmula pronta com ${atletaIds.length} atleta(s).` };
  }

  async function carregarSumulaDigital(provaId) {
    if (!provaId) {
      setSumulaDigital(null);
      setSumulasDigitais([]);
      return;
    }

    const { data, error } = await supabase
      .from("sumulas_digitais")
      .select("*")
      .eq("prova_id", provaId)
      .order("criada_em", { ascending: false });

    if (error) {
      if (tabelaInexistente(error, "sumulas_digitais")) {
        setTokenMensagem("Tabela sumulas_digitais não encontrada no Supabase. Execute o script SQL de criação.");
      } else {
        setTokenMensagem("Não foi possível carregar a súmula digital.");
      }
      setSumulaDigital(null);
      setSumulasDigitais([]);
      return;
    }

    setSumulasDigitais(data || []);
    setSumulaDigital((data || [])[0] || null);
    setTokenMensagem("");
  }

  async function gerarSumulaDigital() {
    if (!provaSelecionada) {
      alert("Selecione uma prova primeiro.");
      return;
    }

    const token = gerarTokenAcesso();

    const { data, error } = await supabase
      .from("sumulas_digitais")
      .insert({
        prova_id: provaSelecionada,
        token_acesso: token,
        status: "ABERTA",
        arbitro_nome: "",
      })
      .select()
      .single();

    if (error) {
      if (tabelaInexistente(error, "sumulas_digitais")) {
        setTokenMensagem("Tabela sumulas_digitais não encontrada no Supabase. Execute o script SQL de criação.");
        return;
      }
      setTokenMensagem("Erro ao criar súmula digital: " + error.message);
      return;
    }

    const sync = await sincronizarResultadosDaSumula(data.id, provaSelecionada);
    if (!sync.ok) {
      setTokenMensagem("Súmula criada, mas houve falha ao carregar atletas: " + sync.message);
    }

    await carregarSumulaDigital(provaSelecionada);
    setTokenMensagem(sync.message || "Súmula digital criada com sucesso.");
  }

  async function bloquearSumulaDigital() {
    if (!sumulaDigital) return;

    const { error } = await supabase
      .from("sumulas_digitais")
      .update({ status: "BLOQUEADA", bloqueada_em: new Date().toISOString() })
      .eq("id", sumulaDigital.id);

    if (error) {
      if (tabelaInexistente(error, "sumulas_digitais")) {
        setTokenMensagem("Tabela sumulas_digitais não encontrada no Supabase. Execute o script SQL de criação.");
        return;
      }
      setTokenMensagem("Erro ao bloquear: " + error.message);
      return;
    }

    await carregarSumulaDigital(provaSelecionada);
    setTokenMensagem("Súmula bloqueada.");
  }

  async function reabrirSumulaDigital() {
    if (!sumulaDigital) return;

    const motivo = window.prompt("Informe o motivo da reabertura da súmula:");
    if (!motivo || !motivo.trim()) {
      setTokenMensagem("Reabertura cancelada. Informe um motivo válido.");
      return;
    }

    const { error } = await supabase
      .from("sumulas_digitais")
      .update({ status: "ABERTA", bloqueada_em: null })
      .eq("id", sumulaDigital.id);

    if (error) {
      if (tabelaInexistente(error, "sumulas_digitais")) {
        setTokenMensagem("Tabela sumulas_digitais não encontrada no Supabase. Execute o script SQL de criação.");
        return;
      }
      setTokenMensagem("Erro ao reabrir: " + error.message);
      return;
    }

    const { error: erroHistorico } = await supabase
      .from("sumula_historico_acoes")
      .insert({
        sumula_id: sumulaDigital.id,
        acao: "reabertura_admin",
        arbitro_nome: null,
        detalhes: {
          motivo,
          origem: "painel_sumulas",
          data_hora: new Date().toISOString(),
        },
      });

    if (erroHistorico && !tabelaInexistente(erroHistorico, "sumula_historico_acoes")) {
      setTokenMensagem("Súmula reaberta, mas falhou registro de histórico: " + erroHistorico.message);
      await carregarSumulaDigital(provaSelecionada);
      return;
    }

    await carregarSumulaDigital(provaSelecionada);
    setTokenMensagem("Súmula reaberta para o árbitro com motivo registrado.");
  }

  async function carregarConfiguracoes() {
    const { data } = await supabase
      .from("configuracoes")
      .select("*")
      .eq("chave", "atletismo_geral")
      .maybeSingle();

    if (data?.valor) {
      const novaConfig = {
        ...CONFIG_PADRAO,
        ...data.valor,
      };

      setConfig(novaConfig);

      if (novaConfig.finalistas_campo) {
        setQuantidadeClassificados(Number(novaConfig.finalistas_campo));
      }

      if (novaConfig.quantidade_raias) {
        setRaiasProximaFase(Number(novaConfig.quantidade_raias));
      }
    }
  }

  async function carregarProvas() {
    const { data, error } = await supabase
      .from("provas")
      .select("*")
      .order("nome");

    if (error) {
      setMensagem(error.message);
      return;
    }

    setProvas(data || []);
  }

  async function selecionarProva(id) {
    setProvaSelecionada(id);
    setInscricoesProva([]);
    setAtletasEncontrados([]);
    setBuscaAtleta("");
    await carregarSeries(id);
    await carregarSumulaDigital(id);
  }

  async function carregarInscricoesDaProva(provaId = provaSelecionada) {
    if (!provaId) {
      alert("Selecione uma prova primeiro.");
      return;
    }

    setCarregandoInscritos(true);
    setMensagem("Carregando inscritos da prova...");

    const { data, error } = await supabase
      .from("inscricoes")
      .select(`
        id,
        evento_id,
        prova_id,
        atleta_id,
        atletas (
          id,
          numero,
          numero_competicao,
          nome,
          municipio,
          data_nascimento,
          categoria,
          naipe,
          escolas (
            id,
            nome
          )
        )
      `)
      .eq("prova_id", provaId)
      .order("id", { ascending: true });

    setCarregandoInscritos(false);

    if (error) {
      setMensagem("Erro ao carregar inscritos: " + error.message);
      return;
    }

    setInscricoesProva(data || []);
    setMensagem(`Inscritos carregados: ${(data || []).length}.`);
  }

  async function abrirGerenciarInscritos() {
    if (!provaSelecionada) {
      alert("Selecione uma prova primeiro.");
      return;
    }

    const novoValor = !mostrarGerenciarInscritos;
    setMostrarGerenciarInscritos(novoValor);

    if (novoValor) {
      await carregarInscricoesDaProva(provaSelecionada);
    }
  }

  async function buscarAtletas() {
    const termo = buscaAtleta.trim();

    if (termo.length < 2) {
      alert("Digite pelo menos 2 letras do nome do atleta.");
      return;
    }

    setMensagem("Buscando atletas...");

    const { data, error } = await supabase
      .from("atletas")
      .select(`
        id,
        numero,
        numero_competicao,
        nome,
        municipio,
        data_nascimento,
        categoria,
        naipe,
        escolas (
          id,
          nome
        )
      `)
      .ilike("nome", `%${termo}%`)
      .order("nome")
      .limit(20);

    if (error) {
      setMensagem("Erro ao buscar atletas: " + error.message);
      return;
    }

    setAtletasEncontrados(data || []);
    setMensagem(`Atletas encontrados: ${(data || []).length}.`);
  }

  async function adicionarAtletaNaProva(atleta) {
    try {
      if (!provaSelecionada) {
        alert("Selecione uma prova primeiro.");
        return;
      }

      const provaAtual = provas.find((p) => p.id === provaSelecionada);

      if (!provaAtual) {
        alert("Prova não encontrada.");
        return;
      }

      const jaInscrito = inscricoesProva.some(
        (i) => i.atleta_id === atleta.id || i.atletas?.id === atleta.id
      );

      if (jaInscrito) {
        alert("Esse atleta já está inscrito nesta prova.");
        return;
      }

      const { error } = await supabase.from("inscricoes").insert({
        evento_id: provaAtual.evento_id,
        prova_id: provaSelecionada,
        atleta_id: atleta.id,
      });

      if (error) throw error;

      await carregarInscricoesDaProva(provaSelecionada);
      setMensagem("Atleta adicionado na prova. Se as séries já existirem, gere as séries novamente.");
    } catch (err) {
      setMensagem("Erro ao adicionar atleta: " + err.message);
    }
  }

  async function removerInscricaoDaProva(inscricao) {
    try {
      const nome = inscricao.atletas?.nome || "atleta";
      const confirmar = window.confirm(`Remover ${nome} desta prova?`);

      if (!confirmar) return;

      const { data: seriesExistentes } = await supabase
        .from("series")
        .select("id")
        .eq("prova_id", provaSelecionada);

      if (seriesExistentes && seriesExistentes.length > 0) {
        const confirmarSeries = window.confirm(
          "Essa prova já tem séries geradas. Ao remover o atleta, você deve gerar as séries novamente depois. Deseja continuar?"
        );

        if (!confirmarSeries) return;
      }

      await supabase
        .from("resultados")
        .delete()
        .eq("inscricao_id", inscricao.id);

      await supabase
        .from("raias")
        .delete()
        .eq("inscricao_id", inscricao.id);

      const { error } = await supabase
        .from("inscricoes")
        .delete()
        .eq("id", inscricao.id);

      if (error) throw error;

      await carregarInscricoesDaProva(provaSelecionada);
      await carregarSeries(provaSelecionada);

      setMensagem("Atleta removido da prova. Gere as séries novamente para reorganizar.");
    } catch (err) {
      setMensagem("Erro ao remover atleta: " + err.message);
    }
  }

  async function substituirInscricaoDaProva(inscricaoAntiga, atletaNovo) {
    try {
      if (!inscricaoAntiga?.id || !atletaNovo?.id) return;

      const nomeAntigo = inscricaoAntiga.atletas?.nome || "atleta antigo";
      const nomeNovo = atletaNovo.nome || "novo atleta";

      const confirmar = window.confirm(
        `Substituir ${nomeAntigo} por ${nomeNovo} nesta prova?`
      );

      if (!confirmar) return;

      const jaInscrito = inscricoesProva.some(
        (i) => i.id !== inscricaoAntiga.id && (i.atleta_id === atletaNovo.id || i.atletas?.id === atletaNovo.id)
      );

      if (jaInscrito) {
        alert("Esse novo atleta já está inscrito nesta prova.");
        return;
      }

      await supabase
        .from("resultados")
        .delete()
        .eq("inscricao_id", inscricaoAntiga.id);

      const { error } = await supabase
        .from("inscricoes")
        .update({ atleta_id: atletaNovo.id })
        .eq("id", inscricaoAntiga.id);

      if (error) throw error;

      await carregarInscricoesDaProva(provaSelecionada);
      await carregarSeries(provaSelecionada);

      setMensagem("Substituição realizada. Se as séries já existirem, gere as séries novamente.");
    } catch (err) {
      setMensagem("Erro ao substituir atleta: " + err.message);
    }
  }


  async function criarAtletaESubstituir(inscricaoAntiga, dadosNovoAtleta) {
    try {
      if (!inscricaoAntiga?.id) return;

      const nome = String(dadosNovoAtleta?.nome || "").trim().toUpperCase();
      const numero = String(dadosNovoAtleta?.numero || "").trim();

      if (nome.length < 3) {
        alert("Digite o nome completo do novo atleta.");
        return;
      }

      const atletaAntigo = inscricaoAntiga.atletas;
      const provaAtual = provas.find((p) => p.id === provaSelecionada);
      const nomeAntigo = atletaAntigo?.nome || "atleta antigo";
      const escolaId = atletaAntigo?.escolas?.id || null;
      const nomeEscola = atletaAntigo?.escolas?.nome || "mesma escola";
      const municipio = atletaAntigo?.municipio || null;
      const categoria = atletaAntigo?.categoria || provaAtual?.categoria || "SEM CATEGORIA";
      const naipe = atletaAntigo?.naipe || provaAtual?.naipe || "SEM NAIPE";

      const confirmar = window.confirm(
        `Criar ${nome} na ${nomeEscola} e substituir ${nomeAntigo} nesta prova?`
      );

      if (!confirmar) return;

      setMensagem("Criando novo atleta e realizando substituição...");

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
        throw ultimoErro || new Error("Não foi possível criar o atleta.");
      }

      await supabase
        .from("resultados")
        .delete()
        .eq("inscricao_id", inscricaoAntiga.id);

      const { error: erroUpdate } = await supabase
        .from("inscricoes")
        .update({ atleta_id: atletaCriado.id })
        .eq("id", inscricaoAntiga.id);

      if (erroUpdate) throw erroUpdate;

      setBuscaAtleta("");
      setAtletasEncontrados([]);

      await carregarInscricoesDaProva(provaSelecionada);
      await carregarSeries(provaSelecionada);

      setMensagem(
        `Atleta ${atletaCriado.nome} criado e substituição realizada. Gere as séries novamente se elas já existirem.`
      );
    } catch (err) {
      setMensagem("Erro ao criar/substituir atleta: " + err.message);
    }
  }

  async function carregarSeries(provaId) {
    if (!provaId) {
      setSeries([]);
      return;
    }

    setMensagem("Carregando séries...");

    const { data, error } = await supabase
      .from("series")
      .select(`
        id,
        numero_serie,
        raias (
          id,
          raia,
          ordem,
          inscricoes (
            id,
            evento_id,
            atleta_id,
            atletas (
              id,
              numero,
              numero_competicao,
              nome,
              municipio,
              data_nascimento,
              escolas (
                nome
              )
            )
          )
        )
      `)
      .eq("prova_id", provaId)
      .order("numero_serie", { ascending: true });

    if (error) {
      setMensagem(error.message);
      return;
    }

    const { data: resultadosSalvos } = await supabase
      .from("resultados")
      .select("*")
      .eq("prova_id", provaId);

    const { data: sumulaDigitalAtiva } = await supabase
      .from("sumulas_digitais")
      .select("id")
      .eq("prova_id", provaId)
      .in("status", ["ABERTA", "EM_ANDAMENTO", "ENVIADA"])
      .order("criada_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    let mapaResultadosDigitais = {};

    if (sumulaDigitalAtiva?.id) {
      const { data: resultadosDigitais } = await supabase
        .from("sumula_resultados")
        .select("atleta_id, tempo, marca, resultado, observacao, classificacao")
        .eq("sumula_id", sumulaDigitalAtiva.id);

      (resultadosDigitais || []).forEach((r) => {
        mapaResultadosDigitais[r.atleta_id] = r;
      });
    }

    const mapaResultados = {};

    (resultadosSalvos || []).forEach((r) => {
      mapaResultados[r.inscricao_id] = r;
    });

    const primeiroResultado = (resultadosSalvos || [])[0];

    if (primeiroResultado?.data_resultado) {
      setDataProva(primeiroResultado.data_resultado);
    }

    const seriesTratadas = (data || []).map((serie) => ({
      ...serie,
      raias: (serie.raias || []).map((r) => {
        const resultado = mapaResultados[r.inscricoes?.id];
        const resultadoDigital = mapaResultadosDigitais[r.inscricoes?.atleta_id];

        return {
          ...r,
          tempo: resultado?.tempo || resultadoDigital?.tempo || "",
          colocacao: resultado?.colocacao || resultadoDigital?.classificacao || "",
          status: resultado?.status || resultadoDigital?.observacao || "OK",
          tentativa1: resultado?.tentativa1 || "",
          tentativa2: resultado?.tentativa2 || "",
          tentativa3: resultado?.tentativa3 || "",
          tentativa4: resultado?.tentativa4 || "",
          tentativa5: resultado?.tentativa5 || "",
          tentativa6: resultado?.tentativa6 || "",
          melhor_marca: resultado?.melhor_marca || resultadoDigital?.marca || "",
          classificacao_parcial: resultado?.classificacao_parcial || resultadoDigital?.classificacao || "",
          classificacao_parcial_final: resultado?.classificacao_parcial_final || "",
          finalista: resultado?.finalista || false,
          alturas: resultado?.alturas || [],
          resultado_final: resultado?.resultado_final || resultadoDigital?.resultado || "",
          publicado: resultado?.publicado || false,
          qualificacao: resultado?.qualificacao || "",
        };
      }),
    }));

    setSeries(seriesTratadas);
    setMensagem(
      seriesTratadas.length
        ? "Séries carregadas."
        : "Nenhuma série encontrada. Use o botão Gerar Séries desta Prova."
    );
  }

async function gerarSeriesDaProva() {
  try {
    if (!provaSelecionada) {
      alert("Selecione uma prova primeiro.");
      return;
    }

    const provaAtual = provas.find((p) => p.id === provaSelecionada);

    if (!provaAtual) {
      alert("Prova não encontrada.");
      return;
    }

    setMensagem("Buscando inscrições da prova...");

    const { data: inscricoes, error: erroInscricoes } = await supabase
      .from("inscricoes")
      .select(`
        id,
        evento_id,
        prova_id,
        atleta_id,
        atletas (
          id,
          nome,
          numero,
          numero_competicao,
          municipio,
          data_nascimento,
          escolas (
            id,
            nome
          )
        )
      `)
      .eq("prova_id", provaSelecionada)
      .order("id", { ascending: true });

    if (erroInscricoes) throw erroInscricoes;

    if (!inscricoes || inscricoes.length === 0) {
      alert("Essa prova não tem atletas inscritos.");
      return;
    }

    const { data: seriesExistentes, error: erroSeriesExistentes } = await supabase
      .from("series")
      .select("id")
      .eq("prova_id", provaSelecionada);

    if (erroSeriesExistentes) throw erroSeriesExistentes;

    if (seriesExistentes && seriesExistentes.length > 0) {
      const confirmar = window.confirm(
        "Essa prova já possui séries. Deseja apagar as séries/raias antigas, resultados e gerar novamente?"
      );

      if (!confirmar) return;

      setMensagem("Apagando séries, raias e resultados antigos...");

      const idsSeries = seriesExistentes.map((s) => s.id);

      const { error: erroApagarResultados } = await supabase
        .from("resultados")
        .delete()
        .eq("prova_id", provaSelecionada);

      if (erroApagarResultados) throw erroApagarResultados;

      if (idsSeries.length > 0) {
        const { error: erroApagarRaias } = await supabase
          .from("raias")
          .delete()
          .in("serie_id", idsSeries);

        if (erroApagarRaias) throw erroApagarRaias;
      }

      const { error: erroApagarSeries } = await supabase
        .from("series")
        .delete()
        .eq("prova_id", provaSelecionada);

      if (erroApagarSeries) throw erroApagarSeries;

      setSeries([]);
    }

    const ehCampo =
      provaAtual.tipo === "campo" ||
      provaAtual.subtipo === "campo_tentativas" ||
      provaAtual.subtipo === "salto_altura";

    const limiteFinalDireta = ehCampo
      ? Number(config.finalistas_campo || 8)
      : Number(config.quantidade_raias || 8);

    const faseAutomatica =
      inscricoes.length <= limiteFinalDireta ? "FINAL" : "QUALIFICAÇÃO";

    const { error: erroAtualizarFase } = await supabase
      .from("provas")
      .update({
        fase: faseAutomatica,
      })
      .eq("id", provaSelecionada);

    if (erroAtualizarFase) throw erroAtualizarFase;

    const quantidadePorSerie = ehCampo
      ? Number(config.atletas_por_serie_campo || 15)
      : Number(config.quantidade_raias || 8);

    const totalSeries = Math.ceil(inscricoes.length / quantidadePorSerie);
    const novasSeries = [];

    setMensagem("Gerando novas séries...");

    for (let i = 1; i <= totalSeries; i++) {
      const { data, error } = await supabase
        .from("series")
        .insert({
          prova_id: provaSelecionada,
          numero_serie: i,
        })
        .select()
        .single();

      if (error) throw error;

      novasSeries.push(data);
    }

    function escolaDaInscricao(inscricao) {
      return (
        inscricao?.atletas?.escolas?.id ||
        inscricao?.atletas?.escolas?.nome ||
        "SEM_ESCOLA"
      );
    }

    function contarConflitosEscola(grupos) {
      let conflitos = 0;

      grupos.forEach((grupo) => {
        const contagem = {};

        grupo.forEach((inscricao) => {
          const escola = escolaDaInscricao(inscricao);
          contagem[escola] = (contagem[escola] || 0) + 1;
        });

        Object.values(contagem).forEach((qtd) => {
          if (qtd > 1) conflitos += qtd - 1;
        });
      });

      return conflitos;
    }

    function grupoTemEscola(grupo, escola) {
      return grupo.some((inscricao) => escolaDaInscricao(inscricao) === escola);
    }

    function distribuirSemRepetirEscola(listaInscricoes) {
      const grupos = Array.from({ length: totalSeries }, () => []);

      const frequenciaEscola = {};

      listaInscricoes.forEach((inscricao) => {
        const escola = escolaDaInscricao(inscricao);
        frequenciaEscola[escola] = (frequenciaEscola[escola] || 0) + 1;
      });

      const ordenadas = [...listaInscricoes].sort((a, b) => {
        const escolaA = escolaDaInscricao(a);
        const escolaB = escolaDaInscricao(b);

        const diff = (frequenciaEscola[escolaB] || 0) - (frequenciaEscola[escolaA] || 0);
        if (diff !== 0) return diff;

        return String(a.atletas?.nome || "").localeCompare(String(b.atletas?.nome || ""));
      });

      ordenadas.forEach((inscricao) => {
        const escola = escolaDaInscricao(inscricao);

        let candidatas = grupos
          .map((grupo, index) => ({
            index,
            grupo,
            tamanho: grupo.length,
            temMesmaEscola: grupoTemEscola(grupo, escola),
          }))
          .filter((item) => item.tamanho < quantidadePorSerie);

        let melhores = candidatas.filter((item) => !item.temMesmaEscola);

        if (melhores.length === 0) {
          melhores = candidatas;
        }

        melhores.sort((a, b) => {
          if (a.tamanho !== b.tamanho) return a.tamanho - b.tamanho;
          return a.index - b.index;
        });

        const escolhida = melhores[0] || candidatas[0];

        if (escolhida) {
          grupos[escolhida.index].push(inscricao);
        }
      });

      return melhorarDistribuicaoPorEscola(grupos);
    }

    function melhorarDistribuicaoPorEscola(gruposOriginais) {
      const grupos = gruposOriginais.map((grupo) => [...grupo]);
      let conflitosAtuais = contarConflitosEscola(grupos);

      if (conflitosAtuais === 0) return grupos;

      let melhorou = true;
      let tentativas = 0;

      while (melhorou && conflitosAtuais > 0 && tentativas < 300) {
        melhorou = false;
        tentativas += 1;

        for (let i = 0; i < grupos.length; i++) {
          for (let a = 0; a < grupos[i].length; a++) {
            const atletaA = grupos[i][a];

            for (let j = 0; j < grupos.length; j++) {
              if (i === j) continue;

              for (let b = 0; b < grupos[j].length; b++) {
                const atletaB = grupos[j][b];

                const novosGrupos = grupos.map((grupo) => [...grupo]);
                novosGrupos[i][a] = atletaB;
                novosGrupos[j][b] = atletaA;

                const novosConflitos = contarConflitosEscola(novosGrupos);

                if (novosConflitos < conflitosAtuais) {
                  grupos[i][a] = atletaB;
                  grupos[j][b] = atletaA;
                  conflitosAtuais = novosConflitos;
                  melhorou = true;
                  break;
                }
              }

              if (melhorou) break;
            }

            if (melhorou) break;
          }

          if (melhorou) break;
        }
      }

      return grupos;
    }

    function distribuirSimples(listaInscricoes) {
      const grupos = Array.from({ length: totalSeries }, () => []);

      listaInscricoes.forEach((inscricao, index) => {
        const serieIndex = Math.floor(index / quantidadePorSerie);
        grupos[serieIndex].push(inscricao);
      });

      return grupos;
    }

    const deveEvitarMesmaEscola =
      faseAutomatica !== "FINAL" &&
      totalSeries > 1;

    const distribuicaoPorSerie = deveEvitarMesmaEscola
  ? distribuirSemRepetirEscola(embaralhar(inscricoes))
  : distribuirSimples(embaralhar(inscricoes));

function embaralhar(lista) {
  const array = [...lista];

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

    const conflitosRestantes = contarConflitosEscola(distribuicaoPorSerie);

    const ordemRaias = embaralhar([1,2,3,4,5,6,7,8,9,10]);
    const raiasParaCriar = [];

    distribuicaoPorSerie.forEach((grupo, serieIndex) => {
      const serieCriada = novasSeries[serieIndex];

      grupo.forEach((inscricao, posicaoNaSerie) => {
        const raia = ehCampo
          ? posicaoNaSerie + 1
          : ordemRaias[posicaoNaSerie] || posicaoNaSerie + 1;

        raiasParaCriar.push({
          serie_id: serieCriada.id,
          inscricao_id: inscricao.id,
          raia,
          ordem: posicaoNaSerie + 1,
        });
      });
    });

    const { error: erroRaias } = await supabase
      .from("raias")
      .insert(raiasParaCriar);

    if (erroRaias) throw erroRaias;

    await carregarProvas();
    await carregarSeries(provaSelecionada);

    setMensagem(
      `Séries geradas com sucesso: ${totalSeries} série(s), ${inscricoes.length} atleta(s). Fase definida automaticamente como ${faseAutomatica}. ${
        deveEvitarMesmaEscola
          ? conflitosRestantes === 0
            ? "Distribuição feita sem repetir escola na mesma série."
            : `Distribuição tentou evitar escolas repetidas. Conflitos restantes: ${conflitosRestantes}.`
          : ""
      }`
    );
  } catch (err) {
    setMensagem("Erro ao gerar séries: " + (err.message || JSON.stringify(err)));
  }
}

  function mudarCampo(serieId, raiaId, campo, valor) {
    setSeries((old) =>
      old.map((serie) => {
        if (serie.id !== serieId) return serie;

        return {
          ...serie,
          raias: serie.raias.map((r) => {
            if (r.id !== raiaId) return r;
            return { ...r, [campo]: valor };
          }),
        };
      })
    );
  }

  function mudarAltura(serieId, raiaId, altura, valor) {
    setSeries((old) =>
      old.map((serie) => {
        if (serie.id !== serieId) return serie;

        return {
          ...serie,
          raias: serie.raias.map((r) => {
            if (r.id !== raiaId) return r;

            const alturasAtuais = Array.isArray(r.alturas) ? r.alturas : [];
            const semAltura = alturasAtuais.filter((a) => a.altura !== altura);

            return {
              ...r,
              alturas: [
                ...semAltura,
                {
                  altura,
                  valor: String(valor).toUpperCase(),
                },
              ],
            };
          }),
        };
      })
    );
  }

  function pegarValorAltura(r, altura) {
    const item = (r.alturas || []).find((a) => a.altura === altura);
    return item?.valor || "";
  }

  function mudarTentativaAltura(serieId, raiaId, altura, indiceTentativa, valorDigitado) {
    const atual = String(
      series
        .find((serie) => serie.id === serieId)
        ?.raias
        ?.find((raia) => raia.id === raiaId)
        ?.alturas
        ?.find((item) => item.altura === altura)
        ?.valor || ""
    )
      .toUpperCase()
      .padEnd(3, " ");

    const caracteres = atual.split("");
    caracteres[indiceTentativa] = String(valorDigitado || "")
      .toUpperCase()
      .slice(-1);

    const novoValor = caracteres.join("").trimEnd();

    mudarAltura(serieId, raiaId, altura, novoValor);
  }


  function melhorDasTentativas(r) {
    const marcas = [
      marcaParaNumero(r.tentativa1),
      marcaParaNumero(r.tentativa2),
      marcaParaNumero(r.tentativa3),
      marcaParaNumero(r.tentativa4),
      marcaParaNumero(r.tentativa5),
      marcaParaNumero(r.tentativa6),
    ].filter((v) => v !== null);

    if (marcas.length === 0) return "";

    return Math.max(...marcas).toFixed(2).replace(".", ",");
  }

  function melhorDasTresPrimeiras(r) {
    const marcas = [
      marcaParaNumero(r.tentativa1),
      marcaParaNumero(r.tentativa2),
      marcaParaNumero(r.tentativa3),
    ].filter((v) => v !== null);

    if (marcas.length === 0) return "";

    return Math.max(...marcas).toFixed(2).replace(".", ",");
  }

  function marcasValidasCampo(r) {
    return [
      marcaParaNumero(r.tentativa1),
      marcaParaNumero(r.tentativa2),
      marcaParaNumero(r.tentativa3),
      marcaParaNumero(r.tentativa4),
      marcaParaNumero(r.tentativa5),
      marcaParaNumero(r.tentativa6),
    ]
      .filter((v) => v !== null)
      .sort((a, b) => b - a);
  }

  function compararCampoOficial(a, b) {
    const marcasA = marcasValidasCampo(a);
    const marcasB = marcasValidasCampo(b);

    const maiorTamanho = Math.max(marcasA.length, marcasB.length);

    for (let i = 0; i < maiorTamanho; i++) {
      const valorA = marcasA[i] ?? -1;
      const valorB = marcasB[i] ?? -1;

      if (valorA !== valorB) {
        return valorB - valorA;
      }
    }

    return String(a.inscricoes?.atletas?.nome || "").localeCompare(
      String(b.inscricoes?.atletas?.nome || "")
    );
  }

  function calcularResultadoAltura(r) {
    let melhor = "";

    for (const altura of config.alturas_salto_altura) {
      const valor = pegarValorAltura(r, altura).toUpperCase();

      if (["O", "XO", "XXO"].includes(valor)) {
        melhor = altura;
      }

      if (valor === "XXX") break;
    }

    return melhor;
  }

  function provaEhCampoTentativas(prova) {
    if (!prova) return false;

    const nome = String(prova.nome || "").toUpperCase();

    return (
      prova.tipo === "campo" ||
      prova.subtipo === "campo_tentativas" ||
      nome.includes("ARREMESSO") ||
      nome.includes("LANÇAMENTO") ||
      nome.includes("SALTO EM DISTÂNCIA") ||
      nome.includes("SALTO EM DISTANCIA") ||
      nome.includes("SALTO TRIPLO") ||
      nome.includes("DARDO") ||
      nome.includes("DISCO") ||
      nome.includes("MARTELO") ||
      nome.includes("PESO")
    );
  }

  function classificarAutomaticamente() {
    const provaAtual = provas.find((p) => p.id === provaSelecionada);

    if (!provaAtual) {
      alert("Selecione uma prova.");
      return;
    }

    if (provaAtual.subtipo === "salto_altura") {
      classificarSaltoAltura();
      return;
    }

    if (provaEhCampoTentativas(provaAtual)) {
      classificarCampo();
      return;
    }

    classificarPista();
  }

  function classificarPista() {
    setSeries((old) =>
      old.map((serie) => {
        const validos = [...serie.raias]
          .filter((r) => r.status === "OK" && r.tempo)
          .sort((a, b) => tempoParaNumero(a.tempo) - tempoParaNumero(b.tempo));

        const mapaColocacao = {};

        validos.forEach((r, index) => {
          mapaColocacao[r.id] = index + 1;
        });

        return {
          ...serie,
          raias: serie.raias.map((r) => ({
            ...r,
            colocacao: mapaColocacao[r.id] || "",
            qualificacao: "",
          })),
        };
      })
    );

    setMensagem("Classificação por série aplicada.");
  }

  function classificarCampo() {
    const todos = [];

    series.forEach((serie) => {
      serie.raias.forEach((raia) => {
        const marcasPrimeiras = [
          marcaParaNumero(raia.tentativa1),
          marcaParaNumero(raia.tentativa2),
          marcaParaNumero(raia.tentativa3),
        ]
          .filter((v) => v !== null)
          .sort((a, b) => b - a);

        const marcasTodas = marcasValidasCampo(raia);

        todos.push({
          ...raia,
          marcasPrimeiras,
          marcasTodas,
          melhorParcialNumero: marcasPrimeiras[0] ?? null,
          melhorFinalNumero: marcasTodas[0] ?? null,
        });
      });
    });

    const rankingParcial = [...todos]
      .filter((r) => r.melhorParcialNumero !== null)
      .sort((a, b) => {
        const marcasA = a.marcasPrimeiras || [];
        const marcasB = b.marcasPrimeiras || [];
        const maiorTamanho = Math.max(marcasA.length, marcasB.length);

        for (let i = 0; i < maiorTamanho; i++) {
          const valorA = marcasA[i] ?? -1;
          const valorB = marcasB[i] ?? -1;

          if (valorA !== valorB) {
            return valorB - valorA;
          }
        }

        return String(a.inscricoes?.atletas?.nome || "").localeCompare(
          String(b.inscricoes?.atletas?.nome || "")
        );
      });

    const rankingCincoTentativas = [...todos]
      .map((r) => {
        const marcasCinco = [
          marcaParaNumero(r.tentativa1),
          marcaParaNumero(r.tentativa2),
          marcaParaNumero(r.tentativa3),
          marcaParaNumero(r.tentativa4),
          marcaParaNumero(r.tentativa5),
        ]
          .filter((v) => v !== null)
          .sort((a, b) => b - a);

        return {
          ...r,
          marcasCinco,
          melhorCincoNumero: marcasCinco[0] ?? null,
        };
      })
      .filter((r) => r.melhorCincoNumero !== null)
      .sort((a, b) => {
        const marcasA = a.marcasCinco || [];
        const marcasB = b.marcasCinco || [];
        const maiorTamanho = Math.max(marcasA.length, marcasB.length);

        for (let i = 0; i < maiorTamanho; i++) {
          const valorA = marcasA[i] ?? -1;
          const valorB = marcasB[i] ?? -1;

          if (valorA !== valorB) {
            return valorB - valorA;
          }
        }

        return String(a.inscricoes?.atletas?.nome || "").localeCompare(
          String(b.inscricoes?.atletas?.nome || "")
        );
      });

    const rankingFinal = [...todos]
      .filter((r) => r.melhorFinalNumero !== null)
      .sort(compararCampoOficial);

    const mapa = {};

    rankingParcial.forEach((r, index) => {
      if (!mapa[r.id]) mapa[r.id] = {};

      mapa[r.id].classificacao_parcial = index + 1;
      mapa[r.id].finalista = index < Number(config.finalistas_campo || 8);
    });

    rankingCincoTentativas.forEach((r, index) => {
      if (!mapa[r.id]) mapa[r.id] = {};

      mapa[r.id].classificacao_parcial_final = index + 1;
    });

    rankingFinal.forEach((r, index) => {
      if (!mapa[r.id]) mapa[r.id] = {};

      mapa[r.id].colocacao = index + 1;
      mapa[r.id].melhor_marca = formatarMarca(r.melhorFinalNumero);
      mapa[r.id].status = "OK";
    });

    todos.forEach((r) => {
      if (!mapa[r.id]) mapa[r.id] = {};

      if (r.melhorFinalNumero === null) {
        mapa[r.id].melhor_marca = "";
        mapa[r.id].colocacao = "";
        mapa[r.id].status = "NM";
      }
    });

    setSeries((old) =>
      old.map((serie) => ({
        ...serie,
        raias: serie.raias.map((r) => ({
          ...r,
          melhor_marca: mapa[r.id]?.melhor_marca || "",
          classificacao_parcial: mapa[r.id]?.classificacao_parcial || "",
          classificacao_parcial_final: mapa[r.id]?.classificacao_parcial_final || "",
          finalista: mapa[r.id]?.finalista || false,
          colocacao: mapa[r.id]?.colocacao || "",
          status: mapa[r.id]?.status || r.status || "OK",
          qualificacao:
            mapa[r.id]?.finalista && mapa[r.id]?.status === "OK" ? "Q" : "",
        })),
      }))
    );

    setMensagem(
      "Classificação de campo aplicada: parcial após 3ª tentativa, parcial após 5ª tentativa, resultado final e desempates oficiais."
    );
  }

function classificarSaltoAltura() {
  function contarErros(valor) {
    return (String(valor || "").toUpperCase().match(/X/g) || []).length;
  }

  const todos = [];

  series.forEach((serie) => {
    serie.raias.forEach((raia) => {
      let melhorAltura = null;
      let melhorAlturaTexto = "";
      let errosNaMelhorAltura = 0;
      let errosTotais = 0;

      config.alturas_salto_altura.forEach((altura) => {
        const valor = pegarValorAltura(raia, altura).toUpperCase();

        errosTotais += contarErros(valor);

        if (valor.includes("O")) {
          melhorAltura = Number(String(altura).replace(",", "."));
          melhorAlturaTexto = altura;
          errosNaMelhorAltura = contarErros(valor);
        }
      });

      todos.push({
        ...raia,
        melhorAltura,
        melhorAlturaTexto,
        errosNaMelhorAltura,
        errosTotais,
      });
    });
  });

  const ranking = [...todos]
    .filter((r) => r.melhorAltura !== null)
    .sort((a, b) => {
      if (b.melhorAltura !== a.melhorAltura) {
        return b.melhorAltura - a.melhorAltura;
      }

      if (a.errosNaMelhorAltura !== b.errosNaMelhorAltura) {
        return a.errosNaMelhorAltura - b.errosNaMelhorAltura;
      }

      if (a.errosTotais !== b.errosTotais) {
        return a.errosTotais - b.errosTotais;
      }

      return String(a.inscricoes?.atletas?.nome || "").localeCompare(
        String(b.inscricoes?.atletas?.nome || "")
      );
    });

  const mapa = {};

  ranking.forEach((r, index) => {
    mapa[r.id] = {
      resultado_final: r.melhorAlturaTexto,
      colocacao: index + 1,
    };
  });

  setSeries((old) =>
    old.map((serie) => ({
      ...serie,
      raias: serie.raias.map((r) => ({
        ...r,
        resultado_final: mapa[r.id]?.resultado_final || calcularResultadoAltura(r),
        colocacao: mapa[r.id]?.colocacao || "",
      })),
    }))
  );

  setMensagem("Classificação oficial do salto em altura aplicada.");
}


  function contarSeriesComAtletas() {
    return (series || []).filter((serie) => (serie.raias || []).length > 0).length;
  }

  function totalAtletasNasSeries() {
    return (series || []).reduce(
      (total, serie) => total + (serie.raias || []).filter((r) => r.inscricoes?.id).length,
      0
    );
  }

  function calcularRegraAutomaticaProximaFase() {
    const totalSeries = contarSeriesComAtletas();
    const totalRaias = Math.max(1, Number(raiasProximaFase) || 8);
    const totalAtletas = totalAtletasNasSeries();
    const totalClassificados = Math.min(totalRaias, Math.max(totalAtletas, 0) || totalRaias);

    if (totalSeries <= 0) {
      return {
        criterio: "q_q",
        qPorSerie: 0,
        qPorTempo: totalClassificados,
        totalClassificados,
        raias: totalRaias,
        totalSeries,
        descricao: "Gere ou carregue as séries para o sistema sugerir a regra.",
        aviso: "Nenhuma série carregada.",
      };
    }

    if (totalSeries === 1) {
      return {
        criterio: "melhores_gerais",
        qPorSerie: 0,
        qPorTempo: 0,
        totalClassificados,
        raias: totalRaias,
        totalSeries,
        descricao: `Melhores resultados gerais até ${totalClassificados} atleta(s).`,
        aviso: "",
      };
    }

    if (totalSeries > totalClassificados) {
      return {
        criterio: "melhores_gerais",
        qPorSerie: 0,
        qPorTempo: 0,
        totalClassificados,
        raias: totalRaias,
        totalSeries,
        descricao: `${totalSeries} séries para ${totalClassificados} vaga(s). Critério sugerido: melhores resultados gerais.`,
        aviso: "Há mais séries do que vagas. Não é possível garantir 1 classificado por série.",
      };
    }

    let qPorSerie;

    if (totalSeries === 2) {
      qPorSerie = Math.max(1, Math.min(3, Math.floor((totalClassificados - 2) / 2)));
    } else if (totalSeries === 3) {
      qPorSerie = Math.max(1, Math.floor((totalClassificados - 2) / 3));
    } else {
      qPorSerie = 1;
    }

    const classificadosDiretos = qPorSerie * totalSeries;
    const qPorTempo = Math.max(0, totalClassificados - classificadosDiretos);

    return {
      criterio: "q_q",
      qPorSerie,
      qPorTempo,
      totalClassificados,
      raias: totalRaias,
      totalSeries,
      descricao: `${qPorSerie} classificado(s) por série + ${qPorTempo} melhor(es) tempo(s)/marca(s).`,
      aviso: "",
    };
  }

  function obterRegraProximaFaseAtual() {
    if (mostrarAvancadoProximaFase) {
      return {
        criterio: criterioClassificacao,
        qPorSerie: Number(qAutomaticos) || 0,
        qPorTempo: Number(qTempos) || 0,
        totalClassificados: Number(quantidadeClassificados) || Number(raiasProximaFase) || 8,
        raias: Number(raiasProximaFase) || 8,
        totalSeries: contarSeriesComAtletas(),
        descricao:
          criterioClassificacao === "melhores_gerais"
            ? `Melhores resultados gerais até ${Number(quantidadeClassificados) || Number(raiasProximaFase) || 8} atleta(s).`
            : `${Number(qAutomaticos) || 0} classificado(s) por série + ${Number(qTempos) || 0} melhor(es) tempo(s)/marca(s).`,
        aviso: "",
      };
    }

    return calcularRegraAutomaticaProximaFase();
  }

  function validarResultadosParaProximaFase(ranking) {
    if (!provaSelecionada) return "Selecione uma prova primeiro.";
    if (!series.length) return "Gere ou carregue as séries da prova antes de gerar a próxima fase.";
    if (!ranking.length) return "Nenhum resultado válido encontrado. Lance os tempos/marcas antes de gerar a próxima fase.";

    const algumResultado = series.some((serie) =>
      (serie.raias || []).some(
        (r) =>
          r.tempo ||
          r.melhor_marca ||
          r.resultado_final ||
          r.tentativa1 ||
          r.tentativa2 ||
          r.tentativa3 ||
          r.tentativa4 ||
          r.tentativa5 ||
          r.tentativa6
      )
    );

    if (!algumResultado) {
      return "Preencha os tempos/marcas da fase atual antes de gerar a próxima fase.";
    }

    const algumaClassificacao = series.some((serie) =>
      (serie.raias || []).some(
        (r) =>
          r.colocacao ||
          r.classificacao_parcial ||
          r.classificacao_parcial_final ||
          r.qualificacao
      )
    );

    if (!algumaClassificacao) {
      return "Clique em Classificar e confira as colocações antes de gerar a próxima fase.";
    }

    return "";
  }

  function montarPreviewProximaFase() {
    const provaAtual = provas.find((p) => p.id === provaSelecionada);

    if (!provaAtual) {
      alert("Selecione uma prova.");
      return [];
    }

    const ranking = obterRankingParaProximaFase();
    const erroValidacao = validarResultadosParaProximaFase(ranking);

    if (erroValidacao) {
      alert(erroValidacao);
      setMensagem(erroValidacao);
      setPreviewProximaFase([]);
      setRegraPreviewProximaFase(null);
      return [];
    }

    const regra = obterRegraProximaFaseAtual();
    const classificados = selecionarClassificados(ranking, regra);

    if (classificados.length === 0) {
      alert("Nenhum classificado encontrado.");
      setPreviewProximaFase([]);
      setRegraPreviewProximaFase(null);
      return [];
    }

    const classificadosOrdenados = ordenarClassificadosParaRaias(classificados, provaAtual);

    setPreviewProximaFase(classificadosOrdenados);
    setRegraPreviewProximaFase(regra);
    setMensagem(
      `Prévia gerada: ${classificadosOrdenados.length} atleta(s) para ${tipoProximaFase}. Confira antes de confirmar.`
    );

    return classificadosOrdenados;
  }

  function obterRankingParaProximaFase() {
    const provaAtual = provas.find((p) => p.id === provaSelecionada);
    const todos = [];

    series.forEach((serie) => {
      serie.raias.forEach((r) => {
        if (!r.inscricoes?.id || !r.inscricoes?.atleta_id) return;

        let valor;

        if (provaAtual?.subtipo === "campo_tentativas") {
          valor = marcaParaNumero(r.melhor_marca || melhorDasTentativas(r));
        } else if (provaAtual?.subtipo === "salto_altura") {
          valor = marcaParaNumero(r.resultado_final || calcularResultadoAltura(r));
        } else {
          if (r.status !== "OK") return;
          valor = r.tempo ? tempoParaNumero(r.tempo) : null;
        }

        if (valor === null || valor === 999999) return;

        todos.push({
          ...r,
          valorClassificacao: valor,
          serieNumero: serie.numero_serie,
        });
      });
    });

    if (provaAtual?.tipo === "corrida" || provaAtual?.subtipo === "pista") {
      return todos.sort((a, b) => a.valorClassificacao - b.valorClassificacao);
    }

    return todos.sort((a, b) => b.valorClassificacao - a.valorClassificacao);
  }

  function selecionarClassificados(ranking, regraOverride = null) {
    const regra = regraOverride || obterRegraProximaFaseAtual();
    const qtdTotal = Number(regra.totalClassificados ?? quantidadeClassificados) || 0;
    const qtdQ = Number(regra.qPorSerie ?? qAutomaticos) || 0;
    const qtdq = Number(regra.qPorTempo ?? qTempos) || 0;
    const criterio = regra.criterio || criterioClassificacao;

    if (!ranking || ranking.length === 0) return [];

    const provaAtual = provas.find((p) => p.id === provaSelecionada);
    const ehPista = provaAtual?.tipo === "corrida" || provaAtual?.subtipo === "pista";

    if (criterio === "melhores_gerais" || qtdQ <= 0) {
      return ranking.slice(0, qtdTotal).map((r) => ({
        ...r,
        qualificacao: "q",
      }));
    }

    const classificados = [];
    const restantes = [];
    const porSerie = {};

    ranking.forEach((r) => {
      if (!porSerie[r.serieNumero]) {
        porSerie[r.serieNumero] = [];
      }

      porSerie[r.serieNumero].push(r);
    });

    Object.values(porSerie).forEach((listaSerie) => {
      const ordenadosDaSerie = [...listaSerie].sort((a, b) => {
        const ca = Number(a.colocacao || 9999);
        const cb = Number(b.colocacao || 9999);

        if (ca !== cb) return ca - cb;

        return ehPista
          ? a.valorClassificacao - b.valorClassificacao
          : b.valorClassificacao - a.valorClassificacao;
      });

      ordenadosDaSerie.forEach((r, index) => {
        if (index < qtdQ && classificados.length < qtdTotal) {
          classificados.push({
            ...r,
            qualificacao: "Q",
          });
        } else {
          restantes.push(r);
        }
      });
    });

    restantes
      .sort((a, b) =>
        ehPista
          ? a.valorClassificacao - b.valorClassificacao
          : b.valorClassificacao - a.valorClassificacao
      )
      .slice(0, Math.max(0, qtdq))
      .forEach((r) => {
        if (classificados.length < qtdTotal) {
          classificados.push({
            ...r,
            qualificacao: "q",
          });
        }
      });

    if (classificados.length < qtdTotal) {
      const jaSelecionados = new Set(classificados.map((r) => r.id));

      ranking
        .filter((r) => !jaSelecionados.has(r.id))
        .sort((a, b) =>
          ehPista
            ? a.valorClassificacao - b.valorClassificacao
            : b.valorClassificacao - a.valorClassificacao
        )
        .slice(0, qtdTotal - classificados.length)
        .forEach((r) => {
          classificados.push({
            ...r,
            qualificacao: "q",
          });
        });
    }

    return classificados.slice(0, qtdTotal || classificados.length);
  }

  function aplicarQualificacao(classificados) {
    const mapa = {};

    classificados.forEach((c) => {
      mapa[c.id] = c.qualificacao;
    });

    setSeries((old) =>
      old.map((serie) => ({
        ...serie,
        raias: serie.raias.map((r) => ({
          ...r,
          qualificacao: mapa[r.id] || "",
        })),
      }))
    );
  }


  function provaEhPista(prova) {
    return prova?.tipo === "corrida" || prova?.subtipo === "pista";
  }

  function ordenarClassificadosParaRaias(classificados, provaAtual) {
    const ehPista = provaEhPista(provaAtual);

    return [...classificados].sort((a, b) => {
      if (a.qualificacao !== b.qualificacao) {
        if (a.qualificacao === "Q") return -1;
        if (b.qualificacao === "Q") return 1;
      }

      const valorA = Number(a.valorClassificacao || 999999);
      const valorB = Number(b.valorClassificacao || 999999);

      if (valorA !== valorB) {
        return ehPista ? valorA - valorB : valorB - valorA;
      }

      const colocacaoA = Number(a.colocacao || 9999);
      const colocacaoB = Number(b.colocacao || 9999);

      return colocacaoA - colocacaoB;
    });
  }

  function raiaOficialPorSeed(posicao, totalRaias) {
    const ordem8 = [4, 5, 3, 6, 2, 7, 1, 8];
    const ordem9 = [5, 6, 4, 7, 3, 8, 2, 9, 1];
    const ordem10 = [5, 6, 4, 7, 3, 8, 2, 9, 1, 10];

    if (Number(totalRaias) === 8) return ordem8[posicao] || posicao + 1;
    if (Number(totalRaias) === 9) return ordem9[posicao] || posicao + 1;
    if (Number(totalRaias) === 10) return ordem10[posicao] || posicao + 1;

    return posicao + 1;
  }

  function distribuirEmSeriesBalanceadas(classificadosOrdenados, totalSeries) {
    const grupos = Array.from({ length: totalSeries }, () => []);

    classificadosOrdenados.forEach((atleta, index) => {
      const bloco = Math.floor(index / totalSeries);
      const posicaoNoBloco = index % totalSeries;
      const serieIndex = bloco % 2 === 0
        ? posicaoNoBloco
        : totalSeries - 1 - posicaoNoBloco;

      grupos[serieIndex].push(atleta);
    });

    return grupos;
  }

  async function gerarProximaFase() {
    try {
      const provaAtual = provas.find((p) => p.id === provaSelecionada);

      if (!provaAtual) {
        alert("Selecione uma prova.");
        return;
      }

      let classificadosOrdenados = previewProximaFase;
      let regra = regraPreviewProximaFase || obterRegraProximaFaseAtual();

      if (!classificadosOrdenados || classificadosOrdenados.length === 0) {
        classificadosOrdenados = montarPreviewProximaFase();
        regra = regraPreviewProximaFase || obterRegraProximaFaseAtual();

        if (!classificadosOrdenados || classificadosOrdenados.length === 0) {
          return;
        }

        setMensagem("Confira a prévia e clique novamente em Confirmar e Gerar Próxima Fase.");
        return;
      }

      const fase = tipoProximaFase.toUpperCase();

      const confirmar = window.confirm(
        `Confirmar geração da fase ${fase} com ${classificadosOrdenados.length} atleta(s)?`
      );

      if (!confirmar) return;

      aplicarQualificacao(classificadosOrdenados);

      const { data: provaExistente, error: erroBuscaFase } = await supabase
        .from("provas")
        .select("*")
        .eq("evento_id", provaAtual.evento_id)
        .eq("nome", provaAtual.nome)
        .eq("categoria", provaAtual.categoria)
        .eq("naipe", provaAtual.naipe)
        .eq("fase", fase)
        .maybeSingle();

      if (erroBuscaFase) throw erroBuscaFase;

      let novaProva = provaExistente;

      if (novaProva) {
        const confirmarSubstituicao = window.confirm(
          `A fase ${fase} já existe para esta prova. Deseja substituir as inscrições, séries, raias e resultados dessa fase?`
        );

        if (!confirmarSubstituicao) return;

        const { data: seriesDaFase } = await supabase
          .from("series")
          .select("id")
          .eq("prova_id", novaProva.id);

        const idsSeriesDaFase = (seriesDaFase || []).map((s) => s.id).filter(Boolean);

        await supabase.from("resultados").delete().eq("prova_id", novaProva.id);

        if (idsSeriesDaFase.length > 0) {
          await supabase.from("raias").delete().in("serie_id", idsSeriesDaFase);
        }

        await supabase.from("series").delete().eq("prova_id", novaProva.id);
        await supabase.from("inscricoes").delete().eq("prova_id", novaProva.id);
      }

      if (!novaProva) {
        const { data, error } = await supabase
          .from("provas")
          .insert({
            evento_id: provaAtual.evento_id,
            nome: provaAtual.nome,
            categoria: provaAtual.categoria,
            naipe: provaAtual.naipe,
            tipo: provaAtual.tipo,
            subtipo: provaAtual.subtipo,
            status: "pendente",
            fase,
            prova_origem_id: provaAtual.id,
            criterio_classificacao: regra.criterio,
            total_classificados: classificadosOrdenados.length,
          })
          .select()
          .single();

        if (error) throw error;
        novaProva = data;
      } else {
        await supabase
          .from("provas")
          .update({
            criterio_classificacao: regra.criterio,
            total_classificados: classificadosOrdenados.length,
          })
          .eq("id", novaProva.id);
      }

      const inscricoesParaCriar = classificadosOrdenados.map((c) => ({
        evento_id: provaAtual.evento_id,
        prova_id: novaProva.id,
        atleta_id: c.inscricoes.atleta_id,
      }));

      const { data: novasInscricoes, error: erroInscricoes } = await supabase
        .from("inscricoes")
        .insert(inscricoesParaCriar)
        .select();

      if (erroInscricoes) throw erroInscricoes;

      const inscricaoPorAtleta = {};

      (novasInscricoes || []).forEach((inscricao) => {
        inscricaoPorAtleta[inscricao.atleta_id] = inscricao;
      });

      const totalSeries = Math.ceil(classificadosOrdenados.length / Number(regra.raias || raiasProximaFase || 8));
      const novasSeries = [];

      for (let i = 1; i <= totalSeries; i++) {
        const { data, error } = await supabase
          .from("series")
          .insert({
            prova_id: novaProva.id,
            numero_serie: i,
          })
          .select()
          .single();

        if (error) throw error;
        novasSeries.push(data);
      }

      const distribuicaoPorSerie = distribuirEmSeriesBalanceadas(
        classificadosOrdenados,
        totalSeries
      );

      const raiasParaCriar = [];

      distribuicaoPorSerie.forEach((listaSerie, serieIndex) => {
        const serieCriada = novasSeries[serieIndex];

        listaSerie.forEach((classificado, posicaoNaSerie) => {
          const inscricao = inscricaoPorAtleta[classificado.inscricoes.atleta_id];

          if (!inscricao) return;

          raiasParaCriar.push({
            serie_id: serieCriada.id,
            inscricao_id: inscricao.id,
            raia: raiaOficialPorSeed(posicaoNaSerie, regra.raias || raiasProximaFase),
            ordem: posicaoNaSerie + 1,
          });
        });
      });

      const { error: erroRaias } = await supabase.from("raias").insert(raiasParaCriar);

      if (erroRaias) throw erroRaias;

      setPreviewProximaFase([]);
      setRegraPreviewProximaFase(null);

      await carregarProvas();

      setMensagem(
        `${fase} gerada com sucesso com ${classificadosOrdenados.length} atleta(s), ${totalSeries} série(s) e sorteio oficial de raias.`
      );
    } catch (err) {
      setMensagem("Erro ao gerar próxima fase: " + (err.message || JSON.stringify(err)));
    }
  }

  async function salvarResultados(publicar = false) {
    try {
      if (!provaSelecionada) {
        alert("Selecione uma prova.");
        return;
      }

      const resultados = [];

      series.forEach((serie) => {
        serie.raias.forEach((r) => {
          resultados.push({
  prova_id: provaSelecionada,
  serie_id: r.serie_id || serie.id,
  inscricao_id: r.inscricoes.id,
            data_resultado: dataProva,
            tempo: r.tempo || null,
            colocacao: r.colocacao ? Number(r.colocacao) : null,
            status: r.status || "OK",
            tentativa1: r.tentativa1 || null,
            tentativa2: r.tentativa2 || null,
            tentativa3: r.tentativa3 || null,
            tentativa4: r.tentativa4 || null,
            tentativa5: r.tentativa5 || null,
            tentativa6: r.tentativa6 || null,
            melhor_marca: r.melhor_marca || null,
            classificacao_parcial: r.classificacao_parcial
              ? Number(r.classificacao_parcial)
              : null,
            classificacao_parcial_final: r.classificacao_parcial_final
              ? Number(r.classificacao_parcial_final)
              : null,
            finalista: !!r.finalista,
            alturas: r.alturas || [],
            resultado_final: r.resultado_final || null,
            publicado: publicar,
            qualificacao: r.qualificacao || null,
          });
        });
      });

      await supabase.from("resultados").delete().eq("prova_id", provaSelecionada);

      const { error } = await supabase.from("resultados").insert(resultados);

      if (error) {
        setMensagem(error.message);
        return;
      }

      setMensagem(
        publicar
          ? "Resultados publicados no boletim com sucesso."
          : "Rascunho salvo."
      );
    } catch (err) {
      setMensagem(err.message);
    }
  }

  function limparFiltros() {
    setBuscaProva("");
    setFiltroCategoria("");
    setFiltroNaipe("");
    setFiltroFase("");
    setFiltroTipo("");
  }

  function imprimir() {
    window.print();
  }

  const provaAtual = provas.find((p) => p.id === provaSelecionada);
  const nomeProvaAtual = String(provaAtual?.nome || "").toUpperCase();
  const ehRevezamento =
    provaAtual?.tipo === "revezamento" ||
    provaAtual?.subtipo === "revezamento" ||
    nomeProvaAtual.includes("REVEZAMENTO") ||
    nomeProvaAtual.includes("4X100") ||
    nomeProvaAtual.includes("4 X 100") ||
    nomeProvaAtual.includes("5X80") ||
    nomeProvaAtual.includes("5 X 80") ||
    nomeProvaAtual.includes("4X400") ||
    nomeProvaAtual.includes("4 X 400");
const ehSaltoAltura =
  provaAtual?.subtipo === "salto_altura" ||
  nomeProvaAtual.includes("SALTO EM ALTURA");

const ehCampoTentativas =
  !ehSaltoAltura &&
  !ehRevezamento &&
  (
    provaAtual?.tipo === "campo" ||
    provaAtual?.subtipo === "campo_tentativas" ||
    nomeProvaAtual.includes("ARREMESSO") ||
    nomeProvaAtual.includes("LANÇAMENTO") ||
    nomeProvaAtual.includes("LANCAMENTO") ||
    nomeProvaAtual.includes("SALTO EM DISTÂNCIA") ||
    nomeProvaAtual.includes("SALTO EM DISTANCIA") ||
    nomeProvaAtual.includes("SALTO TRIPLO") ||
    nomeProvaAtual.includes("DARDO") ||
    nomeProvaAtual.includes("DISCO") ||
    nomeProvaAtual.includes("MARTELO") ||
    nomeProvaAtual.includes("PESO")
  );

  const categorias = [...new Set(provas.map((p) => p.categoria).filter(Boolean))];
  const naipes = [...new Set(provas.map((p) => p.naipe).filter(Boolean))];
  const fases = [...new Set(provas.map((p) => p.fase || "QUALIFICAÇÃO"))];
  const tipos = [...new Set(provas.map((p) => p.subtipo || p.tipo).filter(Boolean))];

  const provasFiltradas = provas.filter((p) => {
    const fase = p.fase || "QUALIFICAÇÃO";
    const tipo = p.subtipo || p.tipo || "";
    const texto = `${p.nome} ${p.categoria} ${p.naipe} ${fase} ${tipo}`.toLowerCase();

    return (
      texto.includes(buscaProva.toLowerCase()) &&
      (!filtroCategoria || p.categoria === filtroCategoria) &&
      (!filtroNaipe || p.naipe === filtroNaipe) &&
      (!filtroFase || fase === filtroFase) &&
      (!filtroTipo || tipo === filtroTipo)
    );
  });



  const regraSugeridaProximaFase = obterRegraProximaFaseAtual();
  const totalSeriesDetectadas = regraSugeridaProximaFase.totalSeries || 0;
  const faseBotao = String(tipoProximaFase || "FINAL").toUpperCase();

  return (
    <div>
      <div className="nao-imprimir">
        <h1>Súmulas</h1>
        <p className="muted">Controle completo da prova em uma única tela.</p>

        <EtapaSelecaoProva
          buscaProva={buscaProva}
          setBuscaProva={setBuscaProva}
          filtroCategoria={filtroCategoria}
          setFiltroCategoria={setFiltroCategoria}
          filtroNaipe={filtroNaipe}
          setFiltroNaipe={setFiltroNaipe}
          filtroFase={filtroFase}
          setFiltroFase={setFiltroFase}
          filtroTipo={filtroTipo}
          setFiltroTipo={setFiltroTipo}
          categorias={categorias}
          naipes={naipes}
          fases={fases}
          tipos={tipos}
          limparFiltros={limparFiltros}
          provasFiltradas={provasFiltradas}
          provaSelecionada={provaSelecionada}
          selecionarProva={selecionarProva}
          gerarSeriesDaProva={gerarSeriesDaProva}
          carregarSeries={carregarSeries}
          abrirGerenciarInscritos={abrirGerenciarInscritos}
          mostrarGerenciarInscritos={mostrarGerenciarInscritos}
          sumulaDigital={sumulaDigital}
          sumulasDigitais={sumulasDigitais}
          tokenMensagem={tokenMensagem}
          linkArbitro={linkArbitro}
          gerarSumulaDigital={gerarSumulaDigital}
          bloquearSumulaDigital={bloquearSumulaDigital}
          reabrirSumulaDigital={reabrirSumulaDigital}
          setTokenMensagem={setTokenMensagem}
          inscricoesProva={inscricoesProva}
          buscaAtleta={buscaAtleta}
          setBuscaAtleta={setBuscaAtleta}
          atletasEncontrados={atletasEncontrados}
          buscarAtletas={buscarAtletas}
          adicionarAtletaNaProva={adicionarAtletaNaProva}
          removerInscricaoDaProva={removerInscricaoDaProva}
          substituirInscricaoDaProva={substituirInscricaoDaProva}
          criarAtletaESubstituir={criarAtletaESubstituir}
          carregandoInscritos={carregandoInscritos}
          dataProva={dataProva}
          setDataProva={setDataProva}
        />

        <EtapaLancamento
          salvarResultados={salvarResultados}
          classificarAutomaticamente={classificarAutomaticamente}
          imprimir={imprimir}
        />

        <EtapaProximaFase
          mostrarProximaFase={mostrarProximaFase}
          setMostrarProximaFase={setMostrarProximaFase}
          tipoProximaFase={tipoProximaFase}
          setTipoProximaFase={setTipoProximaFase}
          raiasProximaFase={raiasProximaFase}
          setRaiasProximaFase={setRaiasProximaFase}
          regraSugeridaProximaFase={regraSugeridaProximaFase}
          totalSeriesDetectadas={totalSeriesDetectadas}
          faseBotao={faseBotao}
          montarPreviewProximaFase={montarPreviewProximaFase}
          gerarProximaFase={gerarProximaFase}
          previewProximaFase={previewProximaFase}
          mostrarAvancadoProximaFase={mostrarAvancadoProximaFase}
          setMostrarAvancadoProximaFase={setMostrarAvancadoProximaFase}
          criterioClassificacao={criterioClassificacao}
          setCriterioClassificacao={setCriterioClassificacao}
          qAutomaticos={qAutomaticos}
          setQAutomaticos={setQAutomaticos}
          qTempos={qTempos}
          setQTempos={setQTempos}
          quantidadeClassificados={quantidadeClassificados}
          setQuantidadeClassificados={setQuantidadeClassificados}
          setRegraPreviewProximaFase={setRegraPreviewProximaFase}
        />

        {mensagem && (
          <div className="card" style={{ marginBottom: 20 }}>
            {mensagem}
          </div>
        )}
      </div>

      <SumulaImpressao
        series={series}
        ehSaltoAltura={ehSaltoAltura}
        ehCampoTentativas={ehCampoTentativas}
        ehRevezamento={ehRevezamento}
        config={config}
        provaAtual={provaAtual}
        dataProva={dataProva}
        pegarValorAltura={pegarValorAltura}
        mudarTentativaAltura={mudarTentativaAltura}
        mudarCampo={mudarCampo}
        calcularResultadoAltura={calcularResultadoAltura}
        melhorDasTresPrimeiras={melhorDasTresPrimeiras}
        melhorDasTentativas={melhorDasTentativas}
        formatarNascimento={formatarNascimento}
      />
    </div>
  );
}

