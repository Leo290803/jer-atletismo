export function contarErros(valor) {
  return (String(valor || "").toUpperCase().match(/X/g) || []).length;
}

export function pegarValorAltura(raia, altura) {
  const item = (raia.alturas || []).find((a) => a.altura === altura);
  return item?.valor || "";
}

export function calcularResultadoAltura(raia, alturas, pegarValorAlturaFn = pegarValorAltura) {
  let melhor = "";

  for (const altura of alturas || []) {
    const valor = String(pegarValorAlturaFn(raia, altura) || "").toUpperCase();

    if (["O", "XO", "XXO"].includes(valor)) {
      melhor = altura;
    }

    if (valor === "XXX") break;
  }

  return melhor;
}

export function classificarSaltoAltura(series = [], config = {}) {
  const todos = [];

  (series || []).forEach((serie) => {
    (serie.raias || []).forEach((raia) => {
      let melhorAltura = null;
      let melhorAlturaTexto = "";
      let errosNaMelhorAltura = 0;
      let errosTotais = 0;

      (config.alturas_salto_altura || []).forEach((altura) => {
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
      if (b.melhorAltura !== a.melhorAltura) return b.melhorAltura - a.melhorAltura;
      if (a.errosNaMelhorAltura !== b.errosNaMelhorAltura) {
        return a.errosNaMelhorAltura - b.errosNaMelhorAltura;
      }
      if (a.errosTotais !== b.errosTotais) return a.errosTotais - b.errosTotais;

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

  return (series || []).map((serie) => ({
    ...serie,
    raias: (serie.raias || []).map((r) => ({
      ...r,
      resultado_final:
        mapa[r.id]?.resultado_final || calcularResultadoAltura(r, config.alturas_salto_altura || []),
      colocacao: mapa[r.id]?.colocacao || "",
    })),
  }));
}
