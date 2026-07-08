export function contarErros(valor) {
  return (String(valor || "").toUpperCase().match(/X/g) || []).length;
}

// Normaliza uma altura para comparacao: "1,50" / "1.5" / "1.50" -> 1.5 (numero).
// Assim a busca funciona mesmo que o formato lancado seja diferente do configurado.
function alturaNumero(altura) {
  const n = Number(String(altura ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

export function pegarValorAltura(raia, altura) {
  const alvo = alturaNumero(altura);
  const lista = raia.alturas || [];

  // 1) Match exato de texto tem prioridade. Evita que colunas distintas
  //    porem numericamente iguais (ex.: "1.5" e "1.50") leiam o valor
  //    uma da outra quando ambas existem na configuracao.
  const exato = lista.find((a) => a.altura === altura);
  if (exato) return exato.valor || "";

  // 2) Fallback numerico (1.5 === 1.50) para formatos diferentes
  //    entre o lancado e o configurado.
  const item = lista.find((a) => {
    const na = alturaNumero(a.altura);
    return na !== null && alvo !== null && na === alvo;
  });
  return item?.valor || "";
}

export function calcularResultadoAltura(raia, alturas, pegarValorAlturaFn = pegarValorAltura) {
  let melhor = "";

  for (const altura of alturas || []) {
    // Normaliza: remove espacos e deixa maiusculo. Ex.: "X O" -> "XO", " O" -> "O".
    const valor = String(pegarValorAlturaFn(raia, altura) || "")
      .toUpperCase()
      .replace(/\s/g, "");

    // Venceu a altura se tem pelo menos um "O" (valido) E nao e so falhas.
    // "O", "XO", "XXO" sao validos. "XXX" (3 erros) nao vence.
    const venceu = valor.includes("O");

    if (venceu) {
      melhor = altura;
    }

    // Se falhou as 3 tentativas nesta altura (XXX) e nao passou, para.
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