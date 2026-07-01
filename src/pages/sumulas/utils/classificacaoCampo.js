export function melhorDasTentativas(r, marcaParaNumeroFn) {
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

export function melhorDasTresPrimeiras(r, marcaParaNumeroFn) {
  const marcas = [
    marcaParaNumeroFn(r.tentativa1),
    marcaParaNumeroFn(r.tentativa2),
    marcaParaNumeroFn(r.tentativa3),
  ].filter((v) => v !== null);

  if (marcas.length === 0) return "";
  return Math.max(...marcas).toFixed(2).replace(".", ",");
}

export function marcasValidasCampo(r, marcaParaNumeroFn) {
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

export function compararCampoOficial(a, b, marcaParaNumeroFn) {
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
