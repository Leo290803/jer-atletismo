import { tempoParaNumero as tempoParaNumeroPadrao } from "./formatadores";

export function tempoParaNumero(tempo) {
  return tempoParaNumeroPadrao(tempo);
}

export function classificarPista(series, opcoes = {}) {
  const tempoParaNumeroFn = opcoes.tempoParaNumeroFn || tempoParaNumero;

  // Textos de status digitados por engano no campo de tempo (ex.: "DNF")
  // nao podem receber colocacao. 999999 = tempo ilegivel/nao numerico.
  const TEXTOS_STATUS = new Set(["DNF", "DNS", "DQ", "ABD", "NM"]);
  const tempoValido = (r) => {
    const texto = String(r.tempo || "").trim().toUpperCase();
    if (!texto || TEXTOS_STATUS.has(texto)) return false;
    return tempoParaNumeroFn(r.tempo) < 999999;
  };

  return (series || []).map((serie) => {
    const validos = [...(serie.raias || [])]
      .filter((r) => r.status === "OK" && tempoValido(r))
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