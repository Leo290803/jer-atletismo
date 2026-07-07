import { useEffect, useMemo, useState } from "react";
import {
  buscarProvaFaseExistente,
  gerarProximaFaseNoBanco,
  salvarQualificacoesDaFaseAtual,
  verificarQualificacoesNoBoletim,
} from "../services/proximaFaseService";
import {
  aplicarQualificacaoEmSeries,
  calcularRegraAutomaticaProximaFase,
  formatarValorClassificacao,
  obterRankingParaProximaFase,
  ordenarClassificadosParaRaias,
  selecionarClassificados,
  validarDadosParaProximaFase,
} from "../utils/proximaFaseUtils";

export function useProximaFase({
  provaSelecionada,
  provas,
  series,
  setSeries,
  config,
  setMensagem,
  carregarProvas,
  melhorDasTentativas,
  calcularResultadoAltura,
}) {
  const [mostrarProximaFase, setMostrarProximaFase] = useState(false);
  const [tipoProximaFase, setTipoProximaFase] = useState("FINAL");
  const [criterioClassificacao, setCriterioClassificacao] = useState("q_q");
  const [quantidadeClassificados, setQuantidadeClassificados] = useState(Number(config?.quantidade_raias || 8));
  const [raiasProximaFase, setRaiasProximaFase] = useState(Number(config?.quantidade_raias || 8));
  const [qAutomaticos, setQAutomaticos] = useState(2);
  const [qTempos, setQTempos] = useState(2);
  const [mostrarOpcoesAvancadas, setMostrarOpcoesAvancadas] = useState(false);
  const [previaClassificados, setPreviaClassificados] = useState([]);
  const [regraPreviewProximaFase, setRegraPreviewProximaFase] = useState(null);
  const [statusBoletimProximaFase, setStatusBoletimProximaFase] = useState(null);

  const provaAtual = useMemo(
    () => (provas || []).find((p) => p.id === provaSelecionada),
    [provas, provaSelecionada]
  );

  // Detecta prova de campo (arremesso, lancamento, salto em distancia).
  // Salto em altura tem logica propria e nao entra na progressao padrao.
  const ehCampoProximaFase = useMemo(() => {
    const tipo = String(provaAtual?.tipo || "").toLowerCase();
    const subtipo = String(provaAtual?.subtipo || "").toLowerCase();
    return (
      tipo === "campo" ||
      subtipo.includes("campo_tentativas") ||
      subtipo.includes("arremesso") ||
      subtipo.includes("lancamento") ||
      subtipo.includes("lançamento") ||
      (subtipo.includes("salto") && !subtipo.includes("altura"))
    );
  }, [provaAtual]);

  const regraAutomatica = useMemo(
    () =>
      calcularRegraAutomaticaProximaFase(series, raiasProximaFase, tipoProximaFase, {
        ehCampo: ehCampoProximaFase,
        finalistasCampo: Number(config?.finalistas_campo || 8),
      }),
    [series, raiasProximaFase, tipoProximaFase, ehCampoProximaFase, config]
  );

  useEffect(() => {
    if (mostrarOpcoesAvancadas) return;

    queueMicrotask(() => {
      setCriterioClassificacao(regraAutomatica.criterio);
      setQAutomaticos(regraAutomatica.qPorSerie);
      setQTempos(regraAutomatica.qPorTempo);
      setQuantidadeClassificados(regraAutomatica.totalClassificados);
    });
  }, [regraAutomatica, mostrarOpcoesAvancadas]);

  function regraAtual() {
    if (mostrarOpcoesAvancadas) {
      return {
        criterio: criterioClassificacao,
        qPorSerie: Number(qAutomaticos) || 0,
        qPorTempo: Number(qTempos) || 0,
        totalClassificados: Number(quantidadeClassificados) || Number(raiasProximaFase) || 8,
        raias: Number(raiasProximaFase) || 8,
        totalSeries: regraAutomatica.totalSeries || 0,
        descricao:
          criterioClassificacao === "melhores_gerais"
            ? `Melhores resultados gerais ate ${Number(quantidadeClassificados) || Number(raiasProximaFase) || 8} atleta(s).`
            : `${Number(qAutomaticos) || 0} classificado(s) por serie + ${Number(qTempos) || 0} melhor(es) tempo(s)/marca(s).`,
        aviso: "",
      };
    }

    return regraAutomatica;
  }

  function montarMensagemPreviaIncompleta(regra, classificados, ranking) {
    const totalEsperado = Number(regra?.totalClassificados || 0);
    const totalEncontrado = classificados.length;
    const qPorSerie = Number(regra?.qPorSerie || 0);
    const seriesSemQ = (series || [])
      .filter((serie) => (serie.raias || []).length > 0)
      .filter((serie) => {
        if (qPorSerie <= 0) return false;
        const validosDaSerie = (ranking || []).filter(
          (item) => Number(item.serieNumero) === Number(serie.numero_serie)
        );
        return validosDaSerie.length < qPorSerie;
      })
      .map((serie) => serie.numero_serie)
      .filter(Boolean);

    const partes = [
      `A previa encontrou ${totalEncontrado} de ${totalEsperado} classificado(s). Preencha e classifique todas as series antes de gerar a proxima fase.`,
    ];

    if (seriesSemQ.length > 0) {
      partes.push(`Series sem resultado valido suficiente para Q: ${seriesSemQ.join(", ")}.`);
    }

    return partes.join(" ");
  }
  function calcularPreviaProximaFase() {
    if (!provaAtual) {
      window.alert("Selecione uma prova.");
      return [];
    }

    const ranking = obterRankingParaProximaFase(series, provaAtual, {
      melhorDasTentativasFn: melhorDasTentativas,
      calcularResultadoAlturaFn: calcularResultadoAltura,
    });

    const erroValidacao = validarDadosParaProximaFase({
      provaSelecionada,
      series,
      ranking,
    });

    if (erroValidacao) {
      window.alert(erroValidacao);
      setMensagem?.(erroValidacao);
      setPreviaClassificados([]);
      setRegraPreviewProximaFase(null);
      return [];
    }

    const regra = regraAtual();
    const classificados = selecionarClassificados(ranking, regra, provaAtual);

    if (classificados.length === 0) {
      window.alert("Nenhum classificado encontrado.");
      setPreviaClassificados([]);
      setRegraPreviewProximaFase(null);
      return [];
    }

    if (classificados.length < Number(regra.totalClassificados || 0)) {
      const mensagemIncompleta = montarMensagemPreviaIncompleta(regra, classificados, ranking);
      window.alert(mensagemIncompleta);
      setMensagem?.(mensagemIncompleta);
      setPreviaClassificados([]);
      setRegraPreviewProximaFase(null);
      return [];
    }

    const classificadosOrdenados = ordenarClassificadosParaRaias(classificados, provaAtual);

    setPreviaClassificados(classificadosOrdenados);
    setRegraPreviewProximaFase(regra);
    setMensagem?.(
      `Previa gerada: ${classificadosOrdenados.length} atleta(s) para ${tipoProximaFase}. Confira antes de confirmar.`
    );

    return classificadosOrdenados;
  }

  async function confirmarGerarProximaFase(classificadosOrdenados, regra, substituirExistente = false) {
    const fase = String(tipoProximaFase || "FINAL").toUpperCase();

    const resultado = await gerarProximaFaseNoBanco({
      provaAtual,
      fase,
      regra,
      classificadosOrdenados,
      raiasProximaFase,
      substituirExistente,
      ehCampo: ehCampoProximaFase,
    });

    if (!resultado.ok) {
      if (resultado.errorCode === "FASE_EXISTENTE") {
        const confirmarSubstituicao = window.confirm(
          `A fase ${fase} ja existe para esta prova. Deseja substituir as inscricoes, series, raias e resultados dessa fase?`
        );

        if (!confirmarSubstituicao) return false;

        return confirmarGerarProximaFase(classificadosOrdenados, regra, true);
      }

      setMensagem?.("Erro ao gerar proxima fase: " + (resultado.error?.message || resultado.message || "Erro desconhecido"));
      return false;
    }

    setPreviaClassificados([]);
    setRegraPreviewProximaFase(null);
    await carregarProvas?.();

    let mensagemBase = `${fase} gerada com sucesso com ${resultado.totalClassificados} atleta(s), ${resultado.totalSeries} serie(s) e sorteio oficial de raias.`;

    // Confirma no banco se os qualificados vao aparecer no boletim.
    const verificacao = await verificarQualificacoesNoBoletim(provaAtual.id);

    if (verificacao.ok) {
      setStatusBoletimProximaFase(verificacao);

      if (verificacao.tudoPublicado) {
        mensagemBase +=
          ` Boletim: ${verificacao.totalQualificados} qualificacao(oes) gravada(s) e publicada(s) — o bloco "ATLETAS QUALIFICADOS" ja aparece no boletim oficial.`;
      } else if (verificacao.totalQualificados === 0) {
        mensagemBase +=
          ` ATENCAO: nenhuma qualificacao foi gravada na fase de origem. O boletim NAO vai mostrar os classificados. Verifique o casamento das raias.`;
      } else {
        mensagemBase +=
          ` ATENCAO: ${verificacao.totalQualificados} qualificacao(oes) gravada(s), mas apenas ${verificacao.totalPublicados} publicada(s). Publique os resultados desta fase para os classificados aparecerem no boletim.`;
      }
    } else {
      setStatusBoletimProximaFase(null);
    }

    setMensagem?.(mensagemBase);

    return true;
  }

  async function gerarProximaFase() {
    if (!provaAtual) {
      window.alert("Selecione uma prova.");
      return;
    }

    let classificadosOrdenados = previaClassificados;
    let regra = regraPreviewProximaFase || regraAtual();

    if (!classificadosOrdenados || classificadosOrdenados.length === 0) {
      classificadosOrdenados = calcularPreviaProximaFase();

      if (!classificadosOrdenados || classificadosOrdenados.length === 0) return;

      setMensagem?.("Confira a previa e clique novamente em Confirmar e Gerar Proxima Fase.");
      return;
    }

    const fase = String(tipoProximaFase || "FINAL").toUpperCase();
    const confirmar = window.confirm(
      `Confirmar geracao da fase ${fase} com ${classificadosOrdenados.length} atleta(s)?`
    );
    if (!confirmar) return;

    const seriesAtualizadas = aplicarQualificacaoEmSeries(series, classificadosOrdenados);
    setSeries(seriesAtualizadas);

    const { error: erroQualificacao } = await salvarQualificacoesDaFaseAtual(provaSelecionada, seriesAtualizadas);
    if (erroQualificacao) {
      setMensagem?.("Falha ao salvar qualificacoes da fase atual: " + erroQualificacao.message);
      return;
    }

    await confirmarGerarProximaFase(classificadosOrdenados, regra, false);
  }

  return {
    mostrarProximaFase,
    setMostrarProximaFase,
    tipoProximaFase,
    setTipoProximaFase,
    criterioClassificacao,
    setCriterioClassificacao,
    quantidadeClassificados,
    setQuantidadeClassificados,
    raiasProximaFase,
    setRaiasProximaFase,
    qAutomaticos,
    setQAutomaticos,
    qTempos,
    setQTempos,
    mostrarOpcoesAvancadas,
    setMostrarOpcoesAvancadas,
    mostrarAvancadoProximaFase: mostrarOpcoesAvancadas,
    setMostrarAvancadoProximaFase: setMostrarOpcoesAvancadas,
    previaClassificados,
    previewProximaFase: previaClassificados,
    regraAutomatica,
    regraSugeridaProximaFase: regraAtual(),
    totalSeriesDetectadas: regraAtual().totalSeries || 0,
    faseBotao: String(tipoProximaFase || "FINAL").toUpperCase(),
    calcularPreviaProximaFase,
    montarPreviewProximaFase: calcularPreviaProximaFase,
    confirmarGerarProximaFase,
    gerarProximaFase,
    statusBoletimProximaFase,
    setStatusBoletimProximaFase,
    setRegraPreviewProximaFase,
    regraPreviewProximaFase,
    formatarValorClassificacao,
    buscarProvaFaseExistente,
  };
}