export function formatarNascimento(data) {
  if (!data) return "-";

  const dataFormatada = new Date(data);
  if (Number.isNaN(dataFormatada.getTime())) {
    return String(data);
  }

  return dataFormatada.toLocaleDateString("pt-BR");
}

export function tempoParaNumero(tempo) {
  if (!tempo) return 999999;

  const limpo = String(tempo).replace(",", ".").trim();

  if (limpo.includes(":")) {
    const partes = limpo.split(":").map(Number);
    if (partes.length === 2) return partes[0] * 60 + partes[1];
    if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
  }

  return Number(limpo) || 999999;
}

export function marcaParaNumero(valor) {
  if (!valor) return null;

  const texto = String(valor).trim().toUpperCase();

  if (["X", "-", "DNS", "DQ", "ABD", "DNF", "NM"].includes(texto)) return null;

  const numero = Number(texto.replace(",", "."));

  if (Number.isNaN(numero)) return null;

  return numero;
}

export function formatarMarca(valor) {
  if (valor === null || valor === undefined) return "";
  return Number(valor).toFixed(2).replace(".", ",");
}
