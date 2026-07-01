import {
  formatarMarca as formatarMarcaPadrao,
  marcaParaNumero as marcaParaNumeroPadrao,
} from "./formatadores";

export function marcaParaNumero(valor) {
  return marcaParaNumeroPadrao(valor);
}

export function formatarMarca(valor) {
  return formatarMarcaPadrao(valor);
}

export function melhorDasTentativas(r, marcaParaNumeroFn = marcaParaNumero) {
  const marcas = [
    marcaParaNumeroFn(r.tentativa1),
    marcaParaNumeroFn(r.tentativa2),
    marcaParaNumeroFn(r.tentativa3),
    marcaParaNumeroFn(r.tentativa4),
    marcaParaNumeroFn(r.tentativa5),
    marcaParaNumeroFn(r.tentativa6),
  ].filter((v) => v !== null);

  if (marcas.length === 0) return "";
  return Math.max(...marcas).toFixed(2).replace(".", ",");
}

export function melhorDasTresPrimeiras(r, marcaParaNumeroFn = marcaParaNumero) {
  const marcas = [
    marcaParaNumeroFn(r.tentativa1),
    marcaParaNumeroFn(r.tentativa2),
    marcaParaNumeroFn(r.tentativa3),
  ].filter((v) => v !== null);

  if (marcas.length === 0) return "";
  return Math.max(...marcas).toFixed(2).replace(".", ",");
}

export function marcasValidasCampo(r, marcaParaNumeroFn = marcaParaNumero) {
  return [
    marcaParaNumeroFn(r.tentativa1),
    marcaParaNumeroFn(r.tentativa2),
    marcaParaNumeroFn(r.tentativa3),
    marcaParaNumeroFn(r.tentativa4),
    marcaParaNumeroFn(r.tentativa5),
    marcaParaNumeroFn(r.tentativa6),
  ]
    .filter((v) => v !== null)
    .sort((a, b) => b - a);
}

export function compararCampoOficial(a, b, marcaParaNumeroFn = marcaParaNumero) {
  const marcasA = marcasValidasCampo(a, marcaParaNumeroFn);
  const marcasB = marcasValidasCampo(b, marcaParaNumeroFn);
  const maiorTamanho = Math.max(marcasA.length, marcasB.length);

  for (let i = 0; i < maiorTamanho; i += 1) {
    const valorA = marcasA[i] ?? -1;
    const valorB = marcasB[i] ?? -1;
    if (valorA !== valorB) return valorB - valorA;
  }

  return String(a.inscricoes?.atletas?.nome || "").localeCompare(
    String(b.inscricoes?.atletas?.nome || "")
  );
}

export function classificarCampo(series = [], config = {}) {
  const todos = [];

  (series || []).forEach((serie) => {
    (serie.raias || []).forEach((raia) => {
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

      for (let i = 0; i < maiorTamanho; i += 1) {
        const valorA = marcasA[i] ?? -1;
        const valorB = marcasB[i] ?? -1;

        if (valorA !== valorB) return valorB - valorA;
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

      for (let i = 0; i < maiorTamanho; i += 1) {
        const valorA = marcasA[i] ?? -1;
        const valorB = marcasB[i] ?? -1;

        if (valorA !== valorB) return valorB - valorA;
      }

      return String(a.inscricoes?.atletas?.nome || "").localeCompare(
        String(b.inscricoes?.atletas?.nome || "")
      );
    });

  const rankingFinal = [...todos]
    .filter((r) => r.melhorFinalNumero !== null)
    .sort((a, b) => compararCampoOficial(a, b));

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

  return (series || []).map((serie) => ({
    ...serie,
    raias: (serie.raias || []).map((r) => ({
      ...r,
      melhor_marca: mapa[r.id]?.melhor_marca || "",
      classificacao_parcial: mapa[r.id]?.classificacao_parcial || "",
      classificacao_parcial_final: mapa[r.id]?.classificacao_parcial_final || "",
      finalista: mapa[r.id]?.finalista || false,
      colocacao: mapa[r.id]?.colocacao || "",
      status: mapa[r.id]?.status || r.status || "OK",
      qualificacao: mapa[r.id]?.finalista && mapa[r.id]?.status === "OK" ? "Q" : "",
    })),
  }));
}
