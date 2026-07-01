import { useState } from "react";
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
} from "../services/seriesService";
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

export function useSeries({
  provaSelecionada,
  provas,
  config,
  setMensagem,
  carregarProvas,
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [series, setSeries] = useState([]);
  const [dataProva, setDataProva] = useState(hoje);

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
        };
      }),
    }));

    setSeries(seriesTratadas);
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

  function mudarCampo(serieId, raiaId, campo, valor) {
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

    if (provaAtual.subtipo === "salto_altura") {
      setSeries((old) => classificarSaltoAltura(old, config));
      setMensagem?.("Classificacao oficial do salto em altura aplicada.");
      return;
    }

    if (provaEhCampoTentativas(provaAtual)) {
      setSeries((old) => classificarCampo(old, config));
      setMensagem?.(
        "Classificacao de campo aplicada: parcial apos 3a tentativa, parcial apos 5a tentativa, resultado final e desempates oficiais."
      );
      return;
    }

    setSeries((old) => classificarPista(old));
    setMensagem?.("Classificacao por serie aplicada.");
  }

  async function salvarResultados(publicar = false) {
    if (!provaSelecionada) {
      window.alert("Selecione uma prova.");
      return;
    }

    const resultados = [];

    (series || []).forEach((serie) => {
      (serie.raias || []).forEach((r) => {
        if (!r.inscricoes?.id) return;

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
          classificacao_parcial: r.classificacao_parcial ? Number(r.classificacao_parcial) : null,
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

    const { error } = await salvarResultadosService(provaSelecionada, resultados);
    if (error) {
      setMensagem?.(error.message);
      return;
    }

    setMensagem?.(publicar ? "Resultados publicados no boletim com sucesso." : "Rascunho salvo.");
  }

  return {
    series,
    setSeries,
    dataProva,
    setDataProva,
    carregarSeries,
    gerarSeriesDaProva,
    mudarCampo,
    mudarAltura,
    mudarTentativaAltura,
    pegarValorAltura,
    classificarAutomaticamente,
    salvarResultados,
    melhorDasTentativas,
    melhorDasTresPrimeiras,
    calcularResultadoAltura: (raia) => calcularResultadoAltura(raia, config.alturas_salto_altura || [], pegarValorAltura),
  };
}
