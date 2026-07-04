import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import BoletimManual from "./BoletimManual";

const provaManualPadrao = {
  prova: "",
  categoria: "12 a 14 anos",
  naipe: "Feminino",
  fase: "QUALIFICACAO",
  tipo: "corrida",
  totalSeries: 1,
  raiasPorSerie: 8,
  linhas: [],
};

const inputStyle = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "9px 10px",
  background: "#fff",
  color: "#0f172a",
};

const labelStyle = {
  display: "grid",
  gap: 6,
  color: "#0f2744",
  fontSize: 13,
  fontWeight: 700,
};

const botaoBase = {
  border: "none",
  borderRadius: 10,
  color: "#020617",
  cursor: "pointer",
  fontWeight: "bold",
  marginBottom: 10,
  marginRight: 10,
  padding: "12px 16px",
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function criarId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function linhaVazia(serie, raia) {
  return {
    id: criarId(`linha-${serie}-${raia}`),
    serie,
    raia,
    numero: "",
    atleta: "",
    escola: "",
    nascimento: "",
    tentativa1: "",
    tentativa2: "",
    tentativa3: "",
    resultado: "",
    colocacao: "",
    status: "OK",
  };
}

function normalizarLinha(linha, indice = 0) {
  const serie = Number(linha?.serie) || 1;
  const raia = Number(linha?.raia) || indice + 1;

  return {
    ...linhaVazia(serie, raia),
    ...linha,
    serie,
    raia,
    status: linha?.status || "OK",
  };
}

function criarProvaManual(dados = {}) {
  return normalizarProva({
    id: criarId("prova-manual"),
    ...provaManualPadrao,
    data: hojeISO(),
    ...dados,
  });
}

function normalizarProva(dados = {}) {
  const linhas = Array.isArray(dados.linhas) ? dados.linhas : [];

  return {
    ...provaManualPadrao,
    ...dados,
    id: dados.id || criarId("prova-manual"),
    data: dados.data || hojeISO(),
    totalSeries: Math.max(1, Number(dados.totalSeries) || 1),
    raiasPorSerie: Math.max(1, Number(dados.raiasPorSerie) || 8),
    linhas: linhas.map(normalizarLinha),
  };
}

function criarCompeticaoManual(dados = {}) {
  const data = hojeISO();
  const prova = criarProvaManual({ data });

  return normalizarCompeticao({
    id: criarId("competicao-manual"),
    nomeEvento: "",
    local: "",
    dataInicio: data,
    dataFim: data,
    provas: [prova],
    ...dados,
  });
}

function normalizarCompeticao(dados = {}) {
  const dataInicio = dados.dataInicio || dados.data || hojeISO();
  const provas = Array.isArray(dados.provas) ? dados.provas : [];

  return {
    id: dados.id || criarId("competicao-manual"),
    nomeEvento: dados.nomeEvento || dados.nome_evento || "",
    local: dados.local || dados.localEvento || "",
    dataInicio,
    dataFim: dados.dataFim || dados.data || dataInicio,
    provas: provas.length ? provas.map(normalizarProva) : [criarProvaManual({ data: dataInicio })],
  };
}

function normalizarEstadoManual(dados = {}) {
  const competicoes = Array.isArray(dados.competicoes) ? dados.competicoes : [];
  const normalizadas = competicoes.map(normalizarCompeticao);

  return {
    competicoes: normalizadas.length ? normalizadas : [criarCompeticaoManual()],
  };
}

function carregarEstadoManual() {
  return normalizarEstadoManual();
}

function linhaBancoParaTela(linha) {
  return normalizarLinha({
    id: linha.id,
    serie: linha.serie,
    raia: linha.raia,
    numero: linha.numero || "",
    atleta: linha.atleta_nome || "",
    escola: linha.escola_nome || "",
    nascimento: linha.nascimento || "",
    tentativa1: linha.tentativa1 || "",
    tentativa2: linha.tentativa2 || "",
    tentativa3: linha.tentativa3 || "",
    resultado: linha.resultado || "",
    colocacao: linha.colocacao || "",
    status: linha.status || "OK",
  });
}

function provaBancoParaTela(prova, linhas) {
  return normalizarProva({
    id: prova.id,
    prova: prova.prova || "",
    categoria: prova.categoria || "12 a 14 anos",
    naipe: prova.naipe || "Feminino",
    fase: prova.fase || "QUALIFICACAO",
    tipo: prova.tipo || "corrida",
    data: prova.data_prova || hojeISO(),
    totalSeries: prova.total_series || 1,
    raiasPorSerie: prova.raias_por_serie || 8,
    linhas: linhas
      .filter((linha) => linha.prova_manual_id === prova.id)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || (a.serie || 0) - (b.serie || 0) || (a.raia || 0) - (b.raia || 0))
      .map(linhaBancoParaTela),
  });
}

function competicaoBancoParaTela(competicao, provas, linhas) {
  const provasDaCompeticao = provas
    .filter((prova) => prova.competicao_id === competicao.id)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || String(a.criada_em || "").localeCompare(String(b.criada_em || "")))
    .map((prova) => provaBancoParaTela(prova, linhas));

  return normalizarCompeticao({
    id: competicao.id,
    nomeEvento: competicao.nome_evento || "",
    local: competicao.local_evento || "",
    dataInicio: competicao.data_inicio || hojeISO(),
    dataFim: competicao.data_fim || competicao.data_inicio || hojeISO(),
    provas: provasDaCompeticao,
  });
}

function numeroOuNulo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function montarPayloadBanco(estado) {
  const competicoes = estado.competicoes.map((competicao) => ({
    id: competicao.id,
    nome_evento: competicao.nomeEvento || null,
    local_evento: competicao.local || null,
    data_inicio: competicao.dataInicio || null,
    data_fim: competicao.dataFim || null,
  }));

  const provas = estado.competicoes.flatMap((competicao) =>
    competicao.provas.map((prova, indice) => ({
      id: prova.id,
      competicao_id: competicao.id,
      prova: prova.prova || null,
      categoria: prova.categoria || null,
      naipe: prova.naipe || null,
      fase: prova.fase || null,
      tipo: prova.tipo || "corrida",
      data_prova: prova.data || null,
      total_series: Math.max(1, Number(prova.totalSeries) || 1),
      raias_por_serie: Math.max(1, Number(prova.raiasPorSerie) || 8),
      ordem: indice + 1,
    }))
  );

  const linhas = estado.competicoes.flatMap((competicao) =>
    competicao.provas.flatMap((prova) =>
      prova.linhas.map((linha, indice) => ({
        id: linha.id,
        prova_manual_id: prova.id,
        serie: Number(linha.serie) || 1,
        raia: numeroOuNulo(linha.raia),
        numero: linha.numero || null,
        atleta_nome: linha.atleta || null,
        escola_nome: linha.escola || null,
        nascimento: linha.nascimento || null,
        tentativa1: linha.tentativa1 || null,
        tentativa2: linha.tentativa2 || null,
        tentativa3: linha.tentativa3 || null,
        resultado: linha.resultado || null,
        colocacao: numeroOuNulo(linha.colocacao),
        status: linha.status || "OK",
        ordem: indice + 1,
      }))
    )
  );

  return { competicoes, provas, linhas };
}

function criarSessaoManual() {
  const estado = carregarEstadoManual();
  const competicao = estado.competicoes[0];
  const prova = competicao.provas[0];

  return {
    estado,
    competicaoId: competicao.id,
    provaId: prova.id,
  };
}

function ajustarSessao(estado, competicaoId, provaId) {
  const competicao = estado.competicoes.find((item) => item.id === competicaoId) || estado.competicoes[0];
  const prova = competicao.provas.find((item) => item.id === provaId) || competicao.provas[0];

  return {
    estado,
    competicaoId: competicao.id,
    provaId: prova.id,
  };
}

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

function gerarTokenAcesso() {
  return window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function linkArbitroManual(token) {
  return `${window.location.origin}/arbitro/sumula-manual/${token}`;
}

function numeroResultado(valor) {
  if (!valor && valor !== 0) return null;
  const texto = String(valor).trim().toUpperCase();
  if (["", "-", "X", "DNS", "DNF", "DQ", "NM"].includes(texto)) return null;

  const limpo = texto.replace(",", ".");
  if (limpo.includes(":")) {
    const partes = limpo.split(":").map(Number);
    if (partes.some(Number.isNaN)) return null;
    if (partes.length === 2) return partes[0] * 60 + partes[1];
    if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
  }

  const numero = Number(limpo);
  return Number.isNaN(numero) ? null : numero;
}

function melhorMarcaCampo(linha) {
  const valores = [linha.tentativa1, linha.tentativa2, linha.tentativa3, linha.resultado]
    .map(numeroResultado)
    .filter((valor) => valor !== null);

  return valores.length ? Math.max(...valores) : null;
}

function dataParaTexto(data) {
  if (!data) return "";
  const [ano, mes, dia] = String(data).split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

function agruparPorSerie(linhas) {
  return [...linhas]
    .sort((a, b) => (Number(a.serie) || 0) - (Number(b.serie) || 0) || (Number(a.raia) || 0) - (Number(b.raia) || 0))
    .reduce((mapa, linha) => {
      const chave = linha.serie || 1;
      if (!mapa[chave]) mapa[chave] = [];
      mapa[chave].push(linha);
      return mapa;
    }, {});
}

function nomeProvaNaLista(prova, indice) {
  const nome = prova.prova || `Prova manual ${indice + 1}`;
  return `${nome} - ${prova.categoria} - ${prova.naipe} - ${prova.fase}`;
}

function nomeCompeticaoNaLista(competicao, indice) {
  return competicao.nomeEvento || `Competicao manual ${indice + 1}`;
}

function resumoCompeticaoManual(competicao) {
  const provas = Array.isArray(competicao.provas) ? competicao.provas : [];
  const totalLinhas = provas.reduce((total, prova) => total + (prova.linhas?.length || 0), 0);

  return {
    totalProvas: provas.length,
    totalLinhas,
  };
}

export default function SumulaManual({ config, imprimir }) {
  const [sessao, setSessao] = useState(criarSessaoManual);
  const [mensagem, setMensagem] = useState("");
  const [statusBanco, setStatusBanco] = useState("Carregando competicoes manuais do banco...");
  const [carregandoBanco, setCarregandoBanco] = useState(true);
  const [bancoDisponivel, setBancoDisponivel] = useState(true);
  const [salvandoBanco, setSalvandoBanco] = useState(false);
  const [sumulaDigitalManual, setSumulaDigitalManual] = useState(null);
  const [gerandoDigital, setGerandoDigital] = useState(false);
  const [telaManual, setTelaManual] = useState("lista");
  const [tipoImpressaoManual, setTipoImpressaoManual] = useState("sumula");
  const [numeroBoletimManual, setNumeroBoletimManual] = useState("0001");
  const [boletimSomenteFinais, setBoletimSomenteFinais] = useState(false);
  const [boletimSomenteComResultado, setBoletimSomenteComResultado] = useState(false);
  const [buscaProvaManual, setBuscaProvaManual] = useState("");
  const [filtroCategoriaManual, setFiltroCategoriaManual] = useState("");
  const [filtroNaipeManual, setFiltroNaipeManual] = useState("");
  const [filtroFaseManual, setFiltroFaseManual] = useState("");
  const [filtroTipoManual, setFiltroTipoManual] = useState("");

  const salvarEstadoNoBanco = useCallback(async (estado, opcoes = {}) => {
    if (!bancoDisponivel) return false;

    const payload = montarPayloadBanco(estado);
    setSalvandoBanco(true);
    if (!opcoes.silencioso) setStatusBanco("Salvando no banco...");

    const { error: erroCompeticoes } = await supabase
      .from("competicoes_manuais")
      .upsert(payload.competicoes, { onConflict: "id" });

    if (erroCompeticoes) {
      setSalvandoBanco(false);
      if (tabelaInexistente(erroCompeticoes, "competicoes_manuais")) {
        setBancoDisponivel(false);
        setStatusBanco("Tabela competicoes_manuais nao encontrada. Execute o SQL manual no Supabase.");
        return false;
      }

      setStatusBanco("Erro ao salvar competicoes manuais: " + erroCompeticoes.message);
      return false;
    }

    const { error: erroProvas } = await supabase
      .from("provas_manuais")
      .upsert(payload.provas, { onConflict: "id" });

    if (erroProvas) {
      setSalvandoBanco(false);
      setStatusBanco("Erro ao salvar provas manuais: " + erroProvas.message);
      return false;
    }

    const idsProvas = payload.provas.map((prova) => prova.id);
    if (idsProvas.length) {
      const { error: erroLimparLinhas } = await supabase
        .from("prova_manual_linhas")
        .delete()
        .in("prova_manual_id", idsProvas);

      if (erroLimparLinhas) {
        setSalvandoBanco(false);
        setStatusBanco("Erro ao atualizar linhas manuais: " + erroLimparLinhas.message);
        return false;
      }
    }

    if (payload.linhas.length) {
      const { error: erroLinhas } = await supabase
        .from("prova_manual_linhas")
        .insert(payload.linhas);

      if (erroLinhas) {
        setSalvandoBanco(false);
        setStatusBanco("Erro ao salvar atletas/linhas manuais: " + erroLinhas.message);
        return false;
      }
    }

    setSalvandoBanco(false);
    setStatusBanco("Salvo no banco.");
    return true;
  }, [bancoDisponivel]);

  const carregarEstadoDoBanco = useCallback(async () => {
    setCarregandoBanco(true);
    setStatusBanco("Carregando competicoes manuais do banco...");

    const { data: competicoes, error: erroCompeticoes } = await supabase
      .from("competicoes_manuais")
      .select("*")
      .order("criada_em", { ascending: true });

    if (erroCompeticoes) {
      setCarregandoBanco(false);
      if (tabelaInexistente(erroCompeticoes, "competicoes_manuais")) {
        setBancoDisponivel(false);
        setStatusBanco("Tabelas manuais nao encontradas. Execute o SQL manual no Supabase para salvar tudo no banco.");
        return;
      }

      setStatusBanco("Erro ao carregar competicoes manuais: " + erroCompeticoes.message);
      return;
    }

    const [
      { data: provas, error: erroProvas },
      { data: linhas, error: erroLinhas },
    ] = await Promise.all([
      supabase.from("provas_manuais").select("*").order("ordem", { ascending: true }),
      supabase.from("prova_manual_linhas").select("*").order("ordem", { ascending: true }),
    ]);

    const erro = erroProvas || erroLinhas;
    if (erro) {
      setCarregandoBanco(false);
      if (tabelaInexistente(erro, "provas_manuais") || tabelaInexistente(erro, "prova_manual_linhas")) {
        setBancoDisponivel(false);
        setStatusBanco("Tabelas manuais nao encontradas. Execute o SQL manual no Supabase para salvar tudo no banco.");
        return;
      }

      setStatusBanco("Erro ao carregar competicoes manuais: " + erro.message);
      return;
    }

    const estado = normalizarEstadoManual({
      competicoes: (competicoes || []).map((competicao) =>
        competicaoBancoParaTela(competicao, provas || [], linhas || [])
      ),
    });

    setBancoDisponivel(true);
    setSessao((atual) => ajustarSessao(estado, atual.competicaoId, atual.provaId));
    setCarregandoBanco(false);
    setStatusBanco((competicoes || []).length ? "Dados manuais carregados do banco." : "Nenhuma competicao manual no banco ainda.");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregarEstadoDoBanco();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [carregarEstadoDoBanco]);

  useEffect(() => {
    if (carregandoBanco || !bancoDisponivel) return undefined;

    const timer = window.setTimeout(() => {
      void salvarEstadoNoBanco(sessao.estado, { silencioso: true });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [bancoDisponivel, carregandoBanco, salvarEstadoNoBanco, sessao.estado]);

  const competicaoAtual = useMemo(
    () => sessao.estado.competicoes.find((item) => item.id === sessao.competicaoId) || sessao.estado.competicoes[0],
    [sessao.competicaoId, sessao.estado.competicoes]
  );

  const provaAtual = useMemo(
    () => competicaoAtual.provas.find((item) => item.id === sessao.provaId) || competicaoAtual.provas[0],
    [competicaoAtual, sessao.provaId]
  );

  const rascunho = useMemo(
    () => ({
      ...provaAtual,
      nomeEvento: competicaoAtual.nomeEvento,
      localEvento: competicaoAtual.local,
      dataInicio: competicaoAtual.dataInicio,
      dataFim: competicaoAtual.dataFim,
    }),
    [competicaoAtual, provaAtual]
  );

  const linhasPorSerie = useMemo(() => agruparPorSerie(rascunho.linhas), [rascunho.linhas]);
  const ehCampo = rascunho.tipo === "campo";

  const categoriasManuais = useMemo(
    () => [...new Set(competicaoAtual.provas.map((prova) => prova.categoria).filter(Boolean))],
    [competicaoAtual.provas]
  );

  const naipesManuais = useMemo(
    () => [...new Set(competicaoAtual.provas.map((prova) => prova.naipe).filter(Boolean))],
    [competicaoAtual.provas]
  );

  const fasesManuais = useMemo(
    () => [...new Set(competicaoAtual.provas.map((prova) => prova.fase).filter(Boolean))],
    [competicaoAtual.provas]
  );

  const tiposManuais = useMemo(
    () => [...new Set(competicaoAtual.provas.map((prova) => prova.tipo).filter(Boolean))],
    [competicaoAtual.provas]
  );

  const provasManuaisFiltradas = useMemo(() => {
    const termo = buscaProvaManual.trim().toLowerCase();

    return competicaoAtual.provas.filter((prova) => {
      const texto = [
        prova.prova,
        prova.categoria,
        prova.naipe,
        prova.fase,
        prova.tipo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!termo || texto.includes(termo)) &&
        (!filtroCategoriaManual || prova.categoria === filtroCategoriaManual) &&
        (!filtroNaipeManual || prova.naipe === filtroNaipeManual) &&
        (!filtroFaseManual || prova.fase === filtroFaseManual) &&
        (!filtroTipoManual || prova.tipo === filtroTipoManual)
      );
    });
  }, [
    buscaProvaManual,
    competicaoAtual.provas,
    filtroCategoriaManual,
    filtroFaseManual,
    filtroNaipeManual,
    filtroTipoManual,
  ]);

  function limparFiltrosProvasManuais() {
    setBuscaProvaManual("");
    setFiltroCategoriaManual("");
    setFiltroNaipeManual("");
    setFiltroFaseManual("");
    setFiltroTipoManual("");
  }

  function aplicarEstado(transformar, selecao = {}, salvarAgora = false) {
    const estadoTransformado = typeof transformar === "function" ? transformar(sessao.estado) : transformar;
    const estado = normalizarEstadoManual(estadoTransformado);
    const competicaoId = selecao.competicaoId || sessao.competicaoId;
    const provaId = selecao.provaId || sessao.provaId;
    const novaSessao = ajustarSessao(estado, competicaoId, provaId);

    setSessao(novaSessao);

    if (salvarAgora && !carregandoBanco && bancoDisponivel) {
      void salvarEstadoNoBanco(novaSessao.estado, { silencioso: true });
    }
  }

  function atualizarCompeticaoAtual(campo, valor) {
    aplicarEstado((estado) => ({
      competicoes: estado.competicoes.map((competicao) =>
        competicao.id === sessao.competicaoId ? { ...competicao, [campo]: valor } : competicao
      ),
    }));
    setSumulaDigitalManual(null);
  }

  function atualizarProvaAtual(transformar, salvarAgora = false) {
    aplicarEstado((estado) => ({
      competicoes: estado.competicoes.map((competicao) => {
        if (competicao.id !== sessao.competicaoId) return competicao;

        return {
          ...competicao,
          provas: competicao.provas.map((prova) =>
            prova.id === sessao.provaId ? normalizarProva(transformar(prova)) : prova
          ),
        };
      }),
    }), {}, salvarAgora);
    setSumulaDigitalManual(null);
  }

  function selecionarCompeticao(id) {
    setSessao((atual) => {
      const competicao = atual.estado.competicoes.find((item) => item.id === id);
      return ajustarSessao(atual.estado, id, competicao?.provas[0]?.id || "");
    });
    setMensagem("");
    setSumulaDigitalManual(null);
  }

  function abrirCompeticao(id) {
    selecionarCompeticao(id);
    setTelaManual("competicao");
  }

  function voltarParaCompeticoes() {
    setTelaManual("lista");
    setMensagem("");
    setSumulaDigitalManual(null);
  }

  function selecionarProva(id) {
    setSessao((atual) => ajustarSessao(atual.estado, atual.competicaoId, id));
    setMensagem("");
    setSumulaDigitalManual(null);
  }

  function novaCompeticaoManual() {
    const nova = criarCompeticaoManual();
    aplicarEstado(
      (estado) => ({
        competicoes: [...estado.competicoes, nova],
      }),
      { competicaoId: nova.id, provaId: nova.provas[0].id },
      true
    );
    setTelaManual("competicao");
    setMensagem("Nova competição manual criada. Ela fica separada dos dados oficiais.");
    setSumulaDigitalManual(null);
  }

  function novaProvaManual() {
    const nova = criarProvaManual({
      data: provaAtual.data || competicaoAtual.dataInicio,
      categoria: provaAtual.categoria,
      naipe: provaAtual.naipe,
      tipo: provaAtual.tipo,
      fase: provaAtual.fase,
    });

    aplicarEstado(
      (estado) => ({
        competicoes: estado.competicoes.map((competicao) =>
          competicao.id === sessao.competicaoId
            ? { ...competicao, provas: [...competicao.provas, nova] }
            : competicao
        ),
      }),
      { competicaoId: sessao.competicaoId, provaId: nova.id },
      true
    );
    setMensagem("Nova prova manual criada dentro desta competicao.");
    setSumulaDigitalManual(null);
  }

  function duplicarProvaManual() {
    const copia = criarProvaManual({
      ...provaAtual,
      id: criarId("prova-manual"),
      prova: provaAtual.prova ? `${provaAtual.prova} - COPIA` : "PROVA MANUAL - COPIA",
      linhas: provaAtual.linhas.map((linha) => ({ ...linha, id: criarId("linha-copia") })),
    });

    aplicarEstado(
      (estado) => ({
        competicoes: estado.competicoes.map((competicao) =>
          competicao.id === sessao.competicaoId
            ? { ...competicao, provas: [...competicao.provas, copia] }
            : competicao
        ),
      }),
      { competicaoId: sessao.competicaoId, provaId: copia.id },
      true
    );
    setMensagem("Prova manual duplicada. Confira os dados antes de usar.");
    setSumulaDigitalManual(null);
  }

  async function excluirProvaManual() {
    if (!window.confirm("Excluir somente esta prova manual? Os dados oficiais nao serao alterados.")) {
      return;
    }

    if (bancoDisponivel) {
      setStatusBanco("Excluindo prova manual no banco...");
      const { error } = await supabase
        .from("provas_manuais")
        .delete()
        .eq("id", sessao.provaId);

      if (error) {
        setStatusBanco("Erro ao excluir prova manual: " + error.message);
        return;
      }
    }

    const proxima = criarProvaManual({ data: competicaoAtual.dataInicio });
    const provasRestantes = competicaoAtual.provas.filter((prova) => prova.id !== sessao.provaId);
    const provaSelecionada = provasRestantes[0] || proxima;

    aplicarEstado(
      (estado) => ({
        competicoes: estado.competicoes.map((competicao) =>
          competicao.id === sessao.competicaoId
            ? { ...competicao, provas: provasRestantes.length ? provasRestantes : [proxima] }
            : competicao
        ),
      }),
      { competicaoId: sessao.competicaoId, provaId: provaSelecionada.id },
      true
    );
    setMensagem("Prova manual excluida do banco.");
    setSumulaDigitalManual(null);
  }

  function atualizarCampo(campo, valor) {
    if (campo === "nomeEvento" || campo === "localEvento" || campo === "dataInicio" || campo === "dataFim") {
      const campoCompeticao = campo === "localEvento" ? "local" : campo;
      atualizarCompeticaoAtual(campoCompeticao, valor);
      return;
    }

    atualizarProvaAtual((atual) => ({ ...atual, [campo]: valor }));
  }

  function atualizarLinha(id, campo, valor) {
    atualizarProvaAtual((atual) => ({
      ...atual,
      linhas: atual.linhas.map((linha) =>
        linha.id === id ? { ...linha, [campo]: valor } : linha
      ),
    }));
  }

  function gerarLinhas() {
    const totalSeries = Math.max(1, Number(rascunho.totalSeries) || 1);
    const raiasPorSerie = Math.max(1, Number(rascunho.raiasPorSerie) || 8);
    const antigas = rascunho.linhas || [];
    const novas = [];

    for (let serie = 1; serie <= totalSeries; serie += 1) {
      for (let raia = 1; raia <= raiasPorSerie; raia += 1) {
        const existente = antigas.find(
          (linha) => Number(linha.serie) === serie && Number(linha.raia) === raia
        );
        novas.push(existente || linhaVazia(serie, raia));
      }
    }

    atualizarProvaAtual((atual) => ({ ...atual, linhas: novas }), true);
    setMensagem("Linhas da prova manual geradas.");
  }

  function adicionarLinha() {
    atualizarProvaAtual((atual) => {
      const ultima = atual.linhas[atual.linhas.length - 1];
      const serie = Number(ultima?.serie || 1);
      const raia = Number(ultima?.raia || 0) + 1;
      return {
        ...atual,
        linhas: [...atual.linhas, linhaVazia(serie, raia)],
      };
    }, true);
  }

  function removerLinha(id) {
    atualizarProvaAtual((atual) => ({
      ...atual,
      linhas: atual.linhas.filter((linha) => linha.id !== id),
    }), true);
  }

  function classificarAutomaticamente() {
    atualizarProvaAtual((atual) => {
      const linhasValidas = atual.linhas
        .map((linha, ordemOriginal) => {
          const status = String(linha.status || "OK").toUpperCase();
          const valor = atual.tipo === "campo"
            ? melhorMarcaCampo(linha)
            : numeroResultado(linha.resultado);

          return {
            ...linha,
            ordemOriginal,
            valorClassificacao: valor,
            valido: status === "OK" && valor !== null,
          };
        })
        .filter((linha) => linha.valido)
        .sort((a, b) => {
          if (a.valorClassificacao !== b.valorClassificacao) {
            return atual.tipo === "campo"
              ? b.valorClassificacao - a.valorClassificacao
              : a.valorClassificacao - b.valorClassificacao;
          }

          return a.ordemOriginal - b.ordemOriginal;
        });

      const colocacoes = new Map();
      linhasValidas.forEach((linha, index) => {
        colocacoes.set(linha.id, index + 1);
      });

      return {
        ...atual,
        linhas: atual.linhas.map((linha) => ({
          ...linha,
          colocacao: colocacoes.get(linha.id) || "",
          resultado: atual.tipo === "campo" && !linha.resultado && melhorMarcaCampo(linha) !== null
            ? String(melhorMarcaCampo(linha)).replace(".", ",")
            : linha.resultado,
        })),
      };
    });

    setMensagem("Classificacao manual calculada. Confira antes de imprimir ou gerar a sumula digital.");
  }

  async function salvarRascunho() {
    const salvo = await salvarEstadoNoBanco(sessao.estado);
    setMensagem(salvo ? "Competicoes e provas manuais salvas no banco." : "Nao foi possivel salvar no banco.");
  }

  function imprimirSumulaManual() {
    setTipoImpressaoManual("sumula");
    window.setTimeout(() => imprimir(), 80);
  }

  function imprimirBoletimManual() {
    setTipoImpressaoManual("boletim");
    window.setTimeout(() => imprimir(), 80);
  }

  function limparRascunho() {
    if (!window.confirm("Limpar somente a prova manual selecionada? Os dados oficiais nao serao alterados.")) {
      return;
    }

    atualizarProvaAtual((atual) => ({
      ...criarProvaManual({
        id: atual.id,
        data: atual.data,
        categoria: atual.categoria,
        naipe: atual.naipe,
        fase: atual.fase,
        tipo: atual.tipo,
      }),
    }));
    setMensagem("Prova manual selecionada limpa.");
    setSumulaDigitalManual(null);
  }

  async function gerarSumulaDigitalManual() {
    if (!rascunho.linhas.length) {
      window.alert("Gere as linhas da sumula manual antes de criar a sumula digital.");
      return;
    }

    setGerandoDigital(true);
    setMensagem("Criando sumula digital manual...");

    const token = gerarTokenAcesso();
    const { data: sumulaCriada, error } = await supabase
      .from("sumulas_manuais")
      .insert({
        token_acesso: token,
        status: "ABERTA",
        competicao_manual_id: competicaoAtual.id,
        prova_manual_id: provaAtual.id,
        nome_evento: competicaoAtual.nomeEvento,
        local_evento: competicaoAtual.local,
        data_inicio: competicaoAtual.dataInicio || null,
        data_fim: competicaoAtual.dataFim || null,
        prova: rascunho.prova,
        categoria: rascunho.categoria,
        naipe: rascunho.naipe,
        fase: rascunho.fase,
        tipo: rascunho.tipo,
        data_prova: rascunho.data || null,
      })
      .select()
      .single();

    if (error) {
      setGerandoDigital(false);
      if (tabelaInexistente(error, "sumulas_manuais")) {
        setMensagem("Tabela sumulas_manuais nao encontrada. Execute o SQL da sumula manual no Supabase.");
        return;
      }

      setMensagem("Erro ao criar sumula digital manual: " + error.message);
      return;
    }

    const linhasPayload = rascunho.linhas.map((linha) => ({
      sumula_id: sumulaCriada.id,
      serie: Number(linha.serie) || 1,
      raia: Number(linha.raia) || null,
      numero: linha.numero,
      atleta_nome: linha.atleta,
      escola_nome: linha.escola,
      nascimento: linha.nascimento,
      tentativa1: linha.tentativa1,
      tentativa2: linha.tentativa2,
      tentativa3: linha.tentativa3,
      resultado: linha.resultado,
      colocacao: linha.colocacao ? Number(linha.colocacao) : null,
      status: linha.status || "OK",
    }));

    const { error: erroLinhas } = await supabase
      .from("sumula_manual_linhas")
      .insert(linhasPayload);

    setGerandoDigital(false);

    if (erroLinhas) {
      setMensagem("Sumula criada, mas houve erro ao enviar linhas: " + erroLinhas.message);
      return;
    }

    setSumulaDigitalManual(sumulaCriada);
    setMensagem("Sumula digital manual criada. Envie o link ou QR Code ao arbitro.");
  }

  function renderListaCompeticoes() {
    return (
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          marginBottom: 16,
          marginTop: 6,
          padding: 14,
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>Competições manuais criadas</h3>
            <p style={{ color: "#64748b", fontWeight: 700, margin: "4px 0 0" }}>
              Clique em uma competição para entrar nela e criar as provas.
            </p>
          </div>

          <span
            style={{
              background: "#dbeafe",
              borderRadius: 999,
              color: "#1e3a8a",
              fontWeight: 800,
              padding: "8px 12px",
              whiteSpace: "nowrap",
            }}
          >
            {sessao.estado.competicoes.length} evento(s)
          </span>
        </div>

        <button onClick={novaCompeticaoManual} style={{ ...botaoBase, background: "#38bdf8" }}>
          Nova competição
        </button>

        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            marginTop: 8,
          }}
        >
          {sessao.estado.competicoes.map((competicao, indice) => {
            const selecionada = competicao.id === sessao.competicaoId;
            const resumo = resumoCompeticaoManual(competicao);

            return (
              <button
                key={competicao.id}
                type="button"
                onClick={() => abrirCompeticao(competicao.id)}
                style={{
                  background: "#ffffff",
                  border: `2px solid ${selecionada ? "#22c55e" : "#e2e8f0"}`,
                  borderRadius: 14,
                  cursor: "pointer",
                  padding: 14,
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <strong style={{ color: "#0f2744", fontSize: 15 }}>
                    {nomeCompeticaoNaLista(competicao, indice)}
                  </strong>

                  <span
                    style={{
                      background: "#0ea5e9",
                      borderRadius: 999,
                      color: "#ffffff",
                      fontSize: 11,
                      fontWeight: 900,
                      padding: "5px 8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ABRIR
                  </span>
                </div>

                <div style={{ color: "#475569", display: "grid", gap: 4, fontSize: 12, fontWeight: 700 }}>
                  <span>Local: {competicao.local || "Não informado"}</span>
                  <span>
                    Período: {dataParaTexto(competicao.dataInicio) || "--"} até {dataParaTexto(competicao.dataFim) || "--"}
                  </span>
                  <span>
                    {resumo.totalProvas} prova(s) • {resumo.totalLinhas} linha(s)/atleta(s)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }


  return (
    <>
      <div className="nao-imprimir">
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>Sumula Manual</h2>

          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 10,
              color: "#0f2744",
              fontWeight: 700,
              marginBottom: 16,
              padding: 12,
            }}
          >
            Area isolada: competicoes manuais nao alteram atletas, inscricoes, provas, series ou resultados oficiais.
          </div>

          <div
            style={{
              background: bancoDisponivel ? "#ecfdf5" : "#fef2f2",
              border: `1px solid ${bancoDisponivel ? "#86efac" : "#fecaca"}`,
              borderRadius: 10,
              color: bancoDisponivel ? "#065f46" : "#991b1b",
              fontWeight: 700,
              marginBottom: 16,
              padding: 12,
            }}
          >
            Banco de dados: {salvandoBanco ? "salvando..." : statusBanco}
          </div>

          {telaManual === "lista" ? (
            renderListaCompeticoes()
          ) : (
            <>
              <button
                onClick={voltarParaCompeticoes}
                style={{ ...botaoBase, background: "#e2e8f0" }}
              >
                ← Voltar para competições
              </button>

          <h3 style={{ marginTop: 0 }}>Competição aberta</h3>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              marginBottom: 14,
            }}
          >
            <label style={labelStyle}>
              Competicao
              <select
                style={inputStyle}
                value={sessao.competicaoId}
                onChange={(e) => selecionarCompeticao(e.target.value)}
              >
                {sessao.estado.competicoes.map((competicao, indice) => (
                  <option key={competicao.id} value={competicao.id}>
                    {nomeCompeticaoNaLista(competicao, indice)}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Nome do evento
              <input
                style={inputStyle}
                value={rascunho.nomeEvento}
                onChange={(e) => atualizarCampo("nomeEvento", e.target.value)}
                placeholder="Ex.: JOGOS ESCOLARES DE RORAIMA - JER 2026"
              />
            </label>

            <label style={labelStyle}>
              Local
              <input
                style={inputStyle}
                value={rascunho.localEvento}
                onChange={(e) => atualizarCampo("localEvento", e.target.value)}
                placeholder="Ex.: Vila Olimpica"
              />
            </label>

            <label style={labelStyle}>
              Data inicial
              <input
                style={inputStyle}
                type="date"
                value={rascunho.dataInicio}
                onChange={(e) => atualizarCampo("dataInicio", e.target.value)}
              />
            </label>

            <label style={labelStyle}>
              Data final
              <input
                style={inputStyle}
                type="date"
                value={rascunho.dataFim}
                onChange={(e) => atualizarCampo("dataFim", e.target.value)}
              />
            </label>
          </div>

          <button onClick={novaCompeticaoManual} style={{ ...botaoBase, background: "#38bdf8" }}>
            Nova competição
          </button>

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              marginBottom: 16,
              marginTop: 6,
              padding: 14,
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>Competições manuais criadas</h3>
                <p style={{ color: "#64748b", fontWeight: 700, margin: "4px 0 0" }}>
                  Clique em uma competição para abrir e editar.
                </p>
              </div>

              <span
                style={{
                  background: "#dbeafe",
                  borderRadius: 999,
                  color: "#1e3a8a",
                  fontWeight: 800,
                  padding: "8px 12px",
                  whiteSpace: "nowrap",
                }}
              >
                {sessao.estado.competicoes.length} evento(s)
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              }}
            >
              {sessao.estado.competicoes.map((competicao, indice) => {
                const selecionada = competicao.id === sessao.competicaoId;
                const resumo = resumoCompeticaoManual(competicao);

                return (
                  <button
                    key={competicao.id}
                    type="button"
                    onClick={() => abrirCompeticao(competicao.id)}
                    style={{
                      background: selecionada ? "#ecfdf5" : "#ffffff",
                      border: `2px solid ${selecionada ? "#22c55e" : "#e2e8f0"}`,
                      borderRadius: 14,
                      cursor: "pointer",
                      padding: 14,
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <strong style={{ color: "#0f2744", fontSize: 15 }}>
                        {nomeCompeticaoNaLista(competicao, indice)}
                      </strong>

                      {selecionada && (
                        <span
                          style={{
                            background: "#22c55e",
                            borderRadius: 999,
                            color: "#ffffff",
                            fontSize: 11,
                            fontWeight: 900,
                            padding: "5px 8px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ABERTA
                        </span>
                      )}
                    </div>

                    <div style={{ color: "#475569", display: "grid", gap: 4, fontSize: 12, fontWeight: 700 }}>
                      <span>Local: {competicao.local || "Não informado"}</span>
                      <span>
                        Período: {dataParaTexto(competicao.dataInicio) || "--"} até {dataParaTexto(competicao.dataFim) || "--"}
                      </span>
                      <span>
                        {resumo.totalProvas} prova(s) • {resumo.totalLinhas} linha(s)/atleta(s)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              marginTop: 6,
              paddingTop: 16,
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>Provas desta competição</h3>
                <p style={{ color: "#64748b", fontWeight: 700, margin: "4px 0 0" }}>
                  Pesquise, filtre e clique em uma prova para selecionar.
                </p>
              </div>

              <span
                style={{
                  background: "#dbeafe",
                  borderRadius: 999,
                  color: "#1e3a8a",
                  fontWeight: 800,
                  padding: "8px 12px",
                  whiteSpace: "nowrap",
                }}
              >
                {provasManuaisFiltradas.length} de {competicaoAtual.provas.length} prova(s)
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "1fr",
                marginBottom: 12,
              }}
            >
              <label style={labelStyle}>
                Pesquisar prova
                <input
                  style={inputStyle}
                  value={buscaProvaManual}
                  onChange={(e) => setBuscaProvaManual(e.target.value)}
                  placeholder="Digite o nome da prova, categoria, naipe ou fase..."
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                }}
              >
                <label style={labelStyle}>
                  Categoria
                  <select
                    style={inputStyle}
                    value={filtroCategoriaManual}
                    onChange={(e) => setFiltroCategoriaManual(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {categoriasManuais.map((categoria) => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  Naipe
                  <select
                    style={inputStyle}
                    value={filtroNaipeManual}
                    onChange={(e) => setFiltroNaipeManual(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {naipesManuais.map((naipe) => (
                      <option key={naipe} value={naipe}>{naipe}</option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  Fase
                  <select
                    style={inputStyle}
                    value={filtroFaseManual}
                    onChange={(e) => setFiltroFaseManual(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {fasesManuais.map((fase) => (
                      <option key={fase} value={fase}>{fase}</option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  Tipo
                  <select
                    style={inputStyle}
                    value={filtroTipoManual}
                    onChange={(e) => setFiltroTipoManual(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {tiposManuais.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <button onClick={limparFiltrosProvasManuais} style={{ ...botaoBase, background: "#94a3b8", color: "#ffffff" }}>
                Limpar filtros
              </button>
              <button onClick={novaProvaManual} style={{ ...botaoBase, background: "#22c55e" }}>
                Nova prova
              </button>
              <button onClick={duplicarProvaManual} style={{ ...botaoBase, background: "#a78bfa" }}>
                Duplicar prova
              </button>
              <button onClick={excluirProvaManual} style={{ ...botaoBase, background: "#ef4444", color: "#fff" }}>
                Excluir prova
              </button>
            </div>

            <p style={{ color: "#0f2744", fontWeight: 800, margin: "0 0 10px" }}>
              Provas encontradas: {provasManuaisFiltradas.length}
            </p>

            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                maxHeight: 310,
                overflowY: "auto",
                paddingRight: 6,
                marginBottom: 14,
              }}
            >
              {!provasManuaisFiltradas.length && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    borderRadius: 12,
                    color: "#64748b",
                    fontWeight: 700,
                    padding: 14,
                    textAlign: "center",
                  }}
                >
                  Nenhuma prova encontrada com os filtros atuais.
                </div>
              )}

              {provasManuaisFiltradas.map((prova, indice) => {
                const selecionada = prova.id === sessao.provaId;
                const totalAtletas = prova.linhas?.length || 0;

                return (
                  <div
                    key={prova.id}
                    style={{
                      background: selecionada ? "#ecfdf5" : "#f8fafc",
                      border: `2px solid ${selecionada ? "#22c55e" : "#cbd5e1"}`,
                      borderRadius: 12,
                      display: "grid",
                      gap: 8,
                      minHeight: 138,
                      padding: 12,
                    }}
                  >
                    <strong style={{ color: "#0f2744", fontSize: 14, lineHeight: 1.2 }}>
                      {prova.prova || `Prova manual ${indice + 1}`}
                    </strong>

                    <div style={{ color: "#0f2744", fontSize: 12, lineHeight: 1.25 }}>
                      {prova.categoria} • {prova.naipe} • {prova.fase}
                    </div>

                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>
                      Tipo: {prova.tipo || "corrida"} • {totalAtletas} atleta(s)
                    </div>

                    <button
                      type="button"
                      onClick={() => selecionarProva(prova.id)}
                      style={{
                        ...botaoBase,
                        alignSelf: "end",
                        background: selecionada ? "#16a34a" : "#38bdf8",
                        color: selecionada ? "#ffffff" : "#020617",
                        margin: 0,
                        padding: "9px 12px",
                        width: "fit-content",
                      }}
                    >
                      {selecionada ? "Selecionada" : "Selecionar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <h3>Dados da prova selecionada</h3>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              marginBottom: 14,
            }}
          >
            <label style={labelStyle}>
              Prova
              <input
                style={inputStyle}
                value={rascunho.prova}
                onChange={(e) => atualizarCampo("prova", e.target.value)}
                placeholder="Ex.: 100 METROS"
              />
            </label>

            <label style={labelStyle}>
              Categoria
              <select
                style={inputStyle}
                value={rascunho.categoria}
                onChange={(e) => atualizarCampo("categoria", e.target.value)}
              >
                <option>12 a 14 anos</option>
                <option>15 a 17 anos</option>
                <option>Livre</option>
              </select>
            </label>

            <label style={labelStyle}>
              Naipe
              <select
                style={inputStyle}
                value={rascunho.naipe}
                onChange={(e) => atualizarCampo("naipe", e.target.value)}
              >
                <option>Feminino</option>
                <option>Masculino</option>
                <option>Misto</option>
              </select>
            </label>

            <label style={labelStyle}>
              Fase
              <select
                style={inputStyle}
                value={rascunho.fase}
                onChange={(e) => atualizarCampo("fase", e.target.value)}
              >
                <option>QUALIFICACAO</option>
                <option>SEMI-FINAL</option>
                <option>FINAL</option>
                <option>AVULSA</option>
              </select>
            </label>

            <label style={labelStyle}>
              Tipo
              <select
                style={inputStyle}
                value={rascunho.tipo}
                onChange={(e) => atualizarCampo("tipo", e.target.value)}
              >
                <option value="corrida">Corrida</option>
                <option value="campo">Campo</option>
                <option value="revezamento">Revezamento</option>
              </select>
            </label>

            <label style={labelStyle}>
              Data da prova
              <input
                style={inputStyle}
                type="date"
                value={rascunho.data}
                onChange={(e) => atualizarCampo("data", e.target.value)}
              />
            </label>

            <label style={labelStyle}>
              Series
              <input
                min="1"
                style={inputStyle}
                type="number"
                value={rascunho.totalSeries}
                onChange={(e) => atualizarCampo("totalSeries", e.target.value)}
              />
            </label>

            <label style={labelStyle}>
              Raias/linhas
              <input
                min="1"
                style={inputStyle}
                type="number"
                value={rascunho.raiasPorSerie}
                onChange={(e) => atualizarCampo("raiasPorSerie", e.target.value)}
              />
            </label>
          </div>

          <button onClick={gerarLinhas} style={{ ...botaoBase, background: "#a78bfa" }}>
            Gerar linhas
          </button>
          <button onClick={adicionarLinha} style={{ ...botaoBase, background: "#38bdf8" }}>
            Adicionar linha
          </button>
          <button onClick={salvarRascunho} style={{ ...botaoBase, background: "#22c55e" }}>
            Salvar no banco agora
          </button>
          <button onClick={classificarAutomaticamente} style={{ ...botaoBase, background: "#facc15" }}>
            Classificar automatico
          </button>
          <button onClick={imprimirSumulaManual} style={{ ...botaoBase, background: "#facc15" }}>
            Imprimir sumula manual
          </button>
          <button
            onClick={() => void gerarSumulaDigitalManual()}
            style={{ ...botaoBase, background: "#22c55e" }}
            disabled={gerandoDigital}
          >
            Gerar sumula digital manual
          </button>
          <button onClick={limparRascunho} style={{ ...botaoBase, background: "#ef4444", color: "#fff" }}>
            Limpar prova atual
          </button>

          <BoletimManual
            modo="preview"
            competicao={competicaoAtual}
            numeroBoletim={numeroBoletimManual}
            setNumeroBoletim={setNumeroBoletimManual}
            somenteFinais={boletimSomenteFinais}
            setSomenteFinais={setBoletimSomenteFinais}
            somenteComResultado={boletimSomenteComResultado}
            setSomenteComResultado={setBoletimSomenteComResultado}
            dataParaTexto={dataParaTexto}
            onImprimir={imprimirBoletimManual}
          />

          {mensagem && <p style={{ color: "#0f2744", fontWeight: 700 }}>{mensagem}</p>}

          {sumulaDigitalManual && (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <label style={labelStyle}>
                Link do arbitro manual
                <input
                  readOnly
                  style={inputStyle}
                  value={linkArbitroManual(sumulaDigitalManual.token_acesso)}
                />
              </label>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText(linkArbitroManual(sumulaDigitalManual.token_acesso));
                  setMensagem("Link da sumula manual copiado.");
                }}
                style={{ ...botaoBase, background: "#38bdf8", width: "fit-content" }}
              >
                Copiar link
              </button>

              <div>
                <strong>QR Code</strong>
                <div style={{ marginTop: 8 }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code?size=160x160&data=${encodeURIComponent(
                      linkArbitroManual(sumulaDigitalManual.token_acesso)
                    )}`}
                    alt="QR Code da sumula manual"
                    style={{ border: "1px solid #cbd5e1", borderRadius: 12 }}
                  />
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {telaManual === "competicao" && (
        <div className="card" style={{ marginBottom: 20, overflowX: "auto" }}>
          <h3 style={{ marginTop: 0 }}>Atletas da prova manual selecionada</h3>

          <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr>
                <th>Serie</th>
                <th>{ehCampo ? "Ordem" : "Raia"}</th>
                <th>No</th>
                <th>Atleta</th>
                <th>Escola</th>
                <th>Nascimento</th>
                {ehCampo && <th>1a</th>}
                {ehCampo && <th>2a</th>}
                {ehCampo && <th>3a</th>}
                <th>{ehCampo ? "Melhor" : "Resultado"}</th>
                <th>Colocacao</th>
                <th>Status</th>
                <th>Acao</th>
              </tr>
            </thead>

            <tbody>
              {!rascunho.linhas.length && (
                <tr>
                  <td colSpan={ehCampo ? 13 : 10} style={{ color: "#64748b", fontWeight: 700, textAlign: "center" }}>
                    Gere as linhas ou adicione atletas manualmente.
                  </td>
                </tr>
              )}

              {rascunho.linhas.map((linha) => (
                <tr key={linha.id}>
                  <td>
                    <input style={inputStyle} value={linha.serie} onChange={(e) => atualizarLinha(linha.id, "serie", e.target.value)} />
                  </td>
                  <td>
                    <input style={inputStyle} value={linha.raia} onChange={(e) => atualizarLinha(linha.id, "raia", e.target.value)} />
                  </td>
                  <td>
                    <input style={inputStyle} value={linha.numero} onChange={(e) => atualizarLinha(linha.id, "numero", e.target.value)} />
                  </td>
                  <td>
                    <input style={inputStyle} value={linha.atleta} onChange={(e) => atualizarLinha(linha.id, "atleta", e.target.value)} />
                  </td>
                  <td>
                    <input style={inputStyle} value={linha.escola} onChange={(e) => atualizarLinha(linha.id, "escola", e.target.value)} />
                  </td>
                  <td>
                    <input style={inputStyle} value={linha.nascimento} onChange={(e) => atualizarLinha(linha.id, "nascimento", e.target.value)} />
                  </td>
                  {ehCampo && (
                    <td>
                      <input style={inputStyle} value={linha.tentativa1} onChange={(e) => atualizarLinha(linha.id, "tentativa1", e.target.value)} />
                    </td>
                  )}
                  {ehCampo && (
                    <td>
                      <input style={inputStyle} value={linha.tentativa2} onChange={(e) => atualizarLinha(linha.id, "tentativa2", e.target.value)} />
                    </td>
                  )}
                  {ehCampo && (
                    <td>
                      <input style={inputStyle} value={linha.tentativa3} onChange={(e) => atualizarLinha(linha.id, "tentativa3", e.target.value)} />
                    </td>
                  )}
                  <td>
                    <input style={inputStyle} value={linha.resultado} onChange={(e) => atualizarLinha(linha.id, "resultado", e.target.value)} />
                  </td>
                  <td>
                    <input style={inputStyle} value={linha.colocacao} onChange={(e) => atualizarLinha(linha.id, "colocacao", e.target.value)} />
                  </td>
                  <td>
                    <select style={inputStyle} value={linha.status} onChange={(e) => atualizarLinha(linha.id, "status", e.target.value)}>
                      <option>OK</option>
                      <option>DNS</option>
                      <option>DNF</option>
                      <option>DQ</option>
                      <option>NM</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => removerLinha(linha.id)} style={{ ...botaoBase, background: "#e2e8f0", margin: 0, padding: "8px 10px" }}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {telaManual === "competicao" && tipoImpressaoManual === "boletim" && (
        <BoletimManual
          modo="impressao"
          competicao={competicaoAtual}
          numeroBoletim={numeroBoletimManual}
          setNumeroBoletim={setNumeroBoletimManual}
          somenteFinais={boletimSomenteFinais}
          setSomenteFinais={setBoletimSomenteFinais}
          somenteComResultado={boletimSomenteComResultado}
          setSomenteComResultado={setBoletimSomenteComResultado}
          dataParaTexto={dataParaTexto}
          onImprimir={imprimirBoletimManual}
        />
      )}

      {telaManual === "competicao" && tipoImpressaoManual === "sumula" && Object.entries(linhasPorSerie).map(([numeroSerie, linhas]) => (
        <div
          className={`quebra-pagina sumula-print ${ehCampo ? "sumula-campo" : "sumula-pista"}`}
          key={numeroSerie}
        >
          <h2 style={{ textAlign: "center" }}>
            {rascunho.nomeEvento || config?.texto_cabecalho || "SÚMULA OFICIAL DE ATLETISMO - JER 2026"}
          </h2>

          <p style={{ textAlign: "center" }}>
            <strong>Prova:</strong> {rascunho.prova || "SÚMULA MANUAL"}
            &nbsp; | &nbsp;
            <strong>Categoria:</strong> {rascunho.categoria}
            &nbsp; | &nbsp;
            <strong>Naipe:</strong> {rascunho.naipe}
            &nbsp; | &nbsp;
            <strong>Fase:</strong> {rascunho.fase}
            &nbsp; | &nbsp;
            <strong>Data:</strong> {dataParaTexto(rascunho.data)}
          </p>

          {rascunho.localEvento && (
            <p style={{ textAlign: "center" }}>
              <strong>Local:</strong> {rascunho.localEvento}
            </p>
          )}

          <h3>{ehCampo ? "Ordem de tentativa" : `Série ${numeroSerie}`}</h3>

          <table width="100%" cellPadding="10">
            <thead>
              <tr>
                <th>{ehCampo ? "Ordem" : "Raia"}</th>
                <th>Nº</th>
                <th>Atleta</th>
                <th>Escola</th>

                {ehCampo && <th>1ª</th>}
                {ehCampo && <th>2ª</th>}
                {ehCampo && <th>3ª</th>}

                <th>{ehCampo ? "Melhor" : "Resultado"}</th>
                <th>Colocação</th>
              </tr>
            </thead>

            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.id}>
                  <td>{linha.raia}</td>
                  <td>{linha.numero}</td>
                  <td>{linha.atleta}</td>
                  <td>{linha.escola}</td>

                  {ehCampo && <td>{linha.tentativa1}</td>}
                  {ehCampo && <td>{linha.tentativa2}</td>}
                  {ehCampo && <td>{linha.tentativa3}</td>}

                  <td>{linha.resultado}</td>
                  <td>{linha.colocacao}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {config?.mostrar_assinaturas !== false && (
            <div className="assinaturas-sumula">
              <div>
                <div>Árbitro da Prova</div>
              </div>

              <div>
                <div>Coordenação de Atletismo</div>
              </div>
            </div>
          )}
        </div>
      ))}    </>
  );
}
