import { useState, useRef, useEffect } from "react";
import {
  classificarCampo,
  melhorDasTentativas,
  melhorDasTresPrimeiras,
} from "../utils/classificacaoCampo";
import {
  calcularResultadoAltura,
  classificarSaltoAltura,
  pegarValorAltura,
} from "../utils/classificacaoSaltoAltura";
import { classificarPista } from "../utils/classificacaoPista";
import {
  carregarSeries as carregarSeriesService,
  gerarSeriesDaProva as gerarSeriesService,
  reequilibrarSeries as reequilibrarSeriesService,
} from "../services/seriesService";
import { buscarCombinadaPorCategoriaNaipe, ehProvaCombinada } from "../../../data/provasCombinadas";
import {
  carregarResultadosDigitais,
  carregarResultadosSalvos,
  salvarResultados as salvarResultadosService,
} from "../services/resultadosService";
import { carregarSumulaDigital } from "../services/sumulaDigitalService";

function provaEhCampoTentativas(prova) {
  if (!prova) return false;

  const nome = String(prova.nome || "").toUpperCase();

  return (
    prova.tipo === "campo" ||
    prova.subtipo === "campo_tentativas" ||
    nome.includes("ARREMESSO") ||
    nome.includes("LANCAMENTO") ||
    nome.includes("LANCAMENTO") ||
    nome.includes("SALTO EM DISTANCIA") ||
    nome.includes("SALTO TRIPLO") ||
    nome.includes("DARDO") ||
    nome.includes("DISCO") ||
    nome.includes("MARTELO") ||
    nome.includes("PESO")
  );
}

const STATUS_SEM_CLASSIFICACAO = new Set(["DQ", "DNS", "ABD", "DNF", "NM"]);

function obterPontosCombinada(raia, ordem) {
  const dados = Array.isArray(raia?.alturas) ? raia.alturas : [];
  const item = dados.find(
    (registro) => registro?.tipo === "combinada_pontos" && Number(registro?.ordem) === Number(ordem)
  );

  return item?.pontos || "";
}

function numeroPontos(valor) {
  const numero = Number(String(valor || "").replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

function classificarCombinada(series = [], subprovas = []) {
  const subprovasOrdenadas = [...(subprovas || [])].sort((a, b) => (a?.ordem || 0) - (b?.ordem || 0));

  return (series || []).map((serie) => {
    const resumo = (serie.raias || []).map((raia) => {
      const status = String(raia.status || "OK").toUpperCase();
      const semClassificacao = STATUS_SEM_CLASSIFICACAO.has(status);

      let completo = true;
      let total = 0;

      subprovasOrdenadas.forEach((subprova) => {
        const pontosNumero = numeroPontos(obterPontosCombinada(raia, subprova.ordem));

        if (pontosNumero === null) {
          completo = false;
          return;
        }

        total += pontosNumero;
      });

      return {
        raiaId: raia.id,
        completo,
        total,
        semClassificacao,
        status,
      };
    });

    const classificados = resumo
      .filter((item) => item.completo && !item.semClassificacao)
      .sort((a, b) => b.total - a.total);

    const colocacaoPorRaia = new Map();
    let posicaoAtual = 0;
    let ultimaPontuacao = null;

    classificados.forEach((item, indice) => {
      if (ultimaPontuacao === null || item.total !== ultimaPontuacao) {
        posicaoAtual = indice + 1;
        ultimaPontuacao = item.total;
      }

      colocacaoPorRaia.set(item.raiaId, String(posicaoAtual) + "º");
    });

    const resumoPorRaia = new Map(resumo.map((item) => [item.raiaId, item]));

    return {
      ...serie,
      raias: (serie.raias || []).map((raia) => {
        const item = resumoPorRaia.get(raia.id);
        const resultadoFinal = item?.completo ? String(item.total) : "";
        const colocacao = item?.semClassificacao
          ? (raia.status || "")
          : (colocacaoPorRaia.get(raia.id) || "");

        return {
          ...raia,
          resultado_final: resultadoFinal,
          colocacao,
          qualificacao: "",
        };
      }),
    };
  });
}

export function useSeries({
  provaSelecionada,
  provas,
  config,
  setMensagem,
  carregarProvas,
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [series, setSeries] = useState([]);
  // Ref sempre com o valor mais recente de series, para o auto-save (onBlur)
  // nunca salvar uma versao desatualizada do estado.
  const seriesRef = useRef(series);
  useEffect(() => {
    seriesRef.current = series;
  }, [series]);
  const [dataProva, setDataProva] = useState(hoje);
  const [hasAlteracoesLocais, setHasAlteracoesLocais] = useState(false);
  const [salvandoResultados, setSalvandoResultados] = useState(false);

  async function carregarSeries(provaId = provaSelecionada) {
    if (!provaId) {
      setSeries([]);
      return;
    }

    setMensagem?.("Carregando series...");

    const { data, error } = await carregarSeriesService(provaId);
    if (error) {
      setMensagem?.(error.message);
      return;
    }

    const { data: resultadosSalvos } = await carregarResultadosSalvos(provaId);
    const { data: sumulas } = await carregarSumulaDigital(provaId);

    const sumulaDigitalAtiva = (sumulas || []).find((item) =>
      ["ABERTA", "EM_ANDAMENTO", "ENVIADA"].includes(item.status)
    );

    let mapaResultadosDigitais = {};
    if (sumulaDigitalAtiva?.id) {
      const { data: resultadosDigitais } = await carregarResultadosDigitais(sumulaDigitalAtiva.id);
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
          reserva: resultado?.reserva || false,
        };
      }),
    }));

    setSeries(seriesTratadas);
    setHasAlteracoesLocais(false);
    setMensagem?.(
      seriesTratadas.length
        ? "Series carregadas."
        : "Nenhuma serie encontrada. Use o botao Gerar Series desta Prova."
    );
  }

  async function gerarSeriesDaProva() {
    if (!provaSelecionada) {
      window.alert("Selecione uma prova primeiro.");
      return;
    }

    const primeiraTentativa = await gerarSeriesService({
      provaSelecionada,
      provas,
      config,
      substituirSeries: false,
    });

    if (primeiraTentativa.errorCode === "SERIES_EXISTENTES") {
      const confirmar = window.confirm(
        "Essa prova ja possui series. Deseja apagar as series/raias antigas, resultados e gerar novamente?"
      );

      if (!confirmar) return;

      const segundaTentativa = await gerarSeriesService({
        provaSelecionada,
        provas,
        config,
        substituirSeries: true,
      });

      if (!segundaTentativa.ok) {
        setMensagem?.("Erro ao gerar series: " + (segundaTentativa.message || "Erro desconhecido"));
        return;
      }

      await carregarProvas?.();
      await carregarSeries(provaSelecionada);
      setMensagem?.(segundaTentativa.message);
      return;
    }

    if (!primeiraTentativa.ok) {
      setMensagem?.("Erro ao gerar series: " + (primeiraTentativa.message || "Erro desconhecido"));
      return;
    }

    await carregarProvas?.();
    await carregarSeries(provaSelecionada);
    setMensagem?.(primeiraTentativa.message);
  }

  async function reequilibrarSeries() {
    if (!provaSelecionada) {
      window.alert("Selecione uma prova primeiro.");
      return;
    }

    const provaAtual = (provas || []).find((p) => p.id === provaSelecionada);
    if (!provaAtual) {
      window.alert("Prova nao encontrada.");
      return;
    }

    const confirmar = window.confirm(
      "Reequilibrar as series desta prova? Os atletas serao redistribuidos igualmente entre as series (evitando serie com 1 sozinho). ATENCAO: os resultados ja lancados desta prova serao apagados."
    );
    if (!confirmar) return;

    setMensagem?.("Reequilibrando series...");

    const resultado = await reequilibrarSeriesService({
      provaSelecionada: provaAtual,
      config,
    });

    if (!resultado.ok) {
      setMensagem?.("Erro ao reequilibrar: " + (resultado.message || "Erro desconhecido"));
      return;
    }

    await carregarSeries(provaSelecionada);
    setMensagem?.(resultado.message);
  }

  function mudarCampo(serieId, raiaId, campo, valor) {
    setHasAlteracoesLocais(true);
    setSeries((old) =>
      old.map((serie) => {
        if (serie.id !== serieId) return serie;
        return {
          ...serie,
          raias: (serie.raias || []).map((r) => (r.id !== raiaId ? r : { ...r, [campo]: valor })),
        };
      })
    );
  }

  function mudarAltura(serieId, raiaId, altura, valor) {
    setHasAlteracoesLocais(true);
    setSeries((old) =>
      old.map((serie) => {
        if (serie.id !== serieId) return serie;

        return {
          ...serie,
          raias: (serie.raias || []).map((r) => {
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
    caracteres[indiceTentativa] = String(valorDigitado || "").toUpperCase().slice(-1);
    const novoValor = caracteres.join("").trimEnd();
    mudarAltura(serieId, raiaId, altura, novoValor);
  }

  function classificarAutomaticamente() {
    const provaAtual = (provas || []).find((p) => p.id === provaSelecionada);
    if (!provaAtual) {
      window.alert("Selecione uma prova.");
      return;
    }

    const ehCombinada =
      provaAtual?.tipo === "combinada" || ehProvaCombinada(provaAtual?.nome);

    if (ehCombinada) {
      const combinadaInfo = buscarCombinadaPorCategoriaNaipe(provaAtual?.categoria, provaAtual?.naipe);
      const subprovas = combinadaInfo?.subprovas || [];

      if (!subprovas.length) {
        setMensagem?.("Combinada sem configuracao de subprovas para classificar.");
        return;
      }

      setHasAlteracoesLocais(true);
      setSeries((old) => classificarCombinada(old, subprovas));
      setMensagem?.("Classificacao da combinada aplicada (resultado final por soma de pontos).");
      return;
    }

    if (provaAtual.subtipo === "salto_altura") {
      setHasAlteracoesLocais(true);
      setSeries((old) => classificarSaltoAltura(old, config));
      setMensagem?.("Classificacao oficial do salto em altura aplicada.");
      return;
    }

    if (provaEhCampoTentativas(provaAtual)) {
      setHasAlteracoesLocais(true);
      setSeries((old) => classificarCampo(old, config));
      setMensagem?.(
        "Classificacao de campo aplicada: parcial apos 3a tentativa, parcial apos 5a tentativa, resultado final e desempates oficiais."
      );
      return;
    }

    setHasAlteracoesLocais(true);
    setSeries((old) => classificarPista(old));
    setMensagem?.("Classificacao por serie aplicada.");
  }

  async function salvarResultados(publicar = false, silencioso = false) {
    if (!provaSelecionada) {
      if (!silencioso) window.alert("Selecione uma prova.");
      return;
    }

    // Trava anti-duplo-clique: impede salvar duas vezes ao mesmo tempo,
    // o que causava duplicacao de resultados no banco.
    if (salvandoResultados) return;
    setSalvandoResultados(true);

    try {
      const resultados = [];
      const chavesVistas = new Set();

      // Usa sempre o estado MAIS RECENTE (ref), evitando que o auto-save
      // (disparado no onBlur) salve uma versao antiga sem o valor recem-digitado.
      const seriesAtual = seriesRef.current && seriesRef.current.length ? seriesRef.current : series;

      (seriesAtual || []).forEach((serie) => {
        (serie.raias || []).forEach((r) => {
          if (!r.inscricoes?.id) return;

          const serieId = r.serie_id || serie.id;
          // Dedup defensivo: nunca enviar o mesmo atleta+serie duas vezes.
          const chave = `${serieId}|${r.inscricoes.id}`;
          if (chavesVistas.has(chave)) return;
          chavesVistas.add(chave);

          resultados.push({
            prova_id: provaSelecionada,
            serie_id: serieId,
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
            classificacao_parcial: r.classificacao_parcial ? Number(r.classificacao_parcial) : null,
            classificacao_parcial_final: r.classificacao_parcial_final
              ? Number(r.classificacao_parcial_final)
              : null,
            finalista: !!r.finalista,
            alturas: r.alturas || [],
            resultado_final: r.resultado_final || null,
            publicado: publicar,
            qualificacao: r.qualificacao || null,
            reserva: !!r.reserva,
          });
        });
      });

      // PROTECAO CRITICA: nunca prosseguir com lista vazia. O servico faz
      // "delete tudo + insert"; se a lista estiver vazia, apagaria todos os
      // resultados sem inserir nada. No auto-save, apenas aborta silenciosamente.
      if (!resultados.length) {
        if (!silencioso) setMensagem?.("Nenhum resultado para salvar.");
        return;
      }

      const { error } = await salvarResultadosService(provaSelecionada, resultados);
      if (error) {
        setMensagem?.(silencioso ? "Falha ao salvar automaticamente. Salve manualmente." : error.message);
        return;
      }

      setHasAlteracoesLocais(false);
      setHasAlteracoesLocais(false);
      setMensagem?.(
        silencioso
          ? `Salvo automaticamente ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
          : publicar
          ? "Resultados publicados no boletim com sucesso."
          : "Rascunho salvo."
      );
    } finally {
      setSalvandoResultados(false);
    }
  }

  // Auto-save silencioso: chamado quando o usuario sai de um campo (onBlur).
  // Auto-save silencioso com debounce: aguarda 800ms apos a ultima edicao
  // (garante que o estado ja atualizou e agrupa varias edicoes num so save).
  const autoSaveTimerRef = useRef(null);
  function autoSalvarRascunho() {
    if (!provaSelecionada) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      // salvarResultados usa seriesRef (estado atual) e aborta se lista vazia,
      // entao e seguro chamar sem depender de closure de hasAlteracoesLocais.
      salvarResultados(false, true);
    }, 800);
  }

  return {
    series,
    hasAlteracoesLocais,
    setSeries,
    dataProva,
    setDataProva,
    carregarSeries,
    gerarSeriesDaProva,
    reequilibrarSeries,
    mudarCampo,
    mudarAltura,
    mudarTentativaAltura,
    pegarValorAltura,
    classificarAutomaticamente,
    salvarResultados,
    autoSalvarRascunho,
    salvandoResultados,
    melhorDasTentativas,
    melhorDasTresPrimeiras,
    calcularResultadoAltura: (raia) => calcularResultadoAltura(raia, config.alturas_salto_altura || [], pegarValorAltura),
  };
}