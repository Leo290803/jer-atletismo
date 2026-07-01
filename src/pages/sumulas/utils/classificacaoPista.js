import { tempoParaNumero as tempoParaNumeroPadrao } from "./formatadores";

export function tempoParaNumero(tempo) {
  return tempoParaNumeroPadrao(tempo);
}

export function classificarPista(series, opcoes = {}) {
  const tempoParaNumeroFn = opcoes.tempoParaNumeroFn || tempoParaNumero;

  return (series || []).map((serie) => {
    const validos = [...(serie.raias || [])]
      .filter((r) => r.status === "OK" && r.tempo)
      .sort((a, b) => tempoParaNumeroFn(a.tempo) - tempoParaNumeroFn(b.tempo));

    const mapaColocacao = {};
    validos.forEach((r, index) => {
      mapaColocacao[r.id] = index + 1;
    });

    return {
      ...serie,
      raias: (serie.raias || []).map((r) => ({
        ...r,
        colocacao: mapaColocacao[r.id] || "",
        qualificacao: "",
      })),
    };
  });
}
