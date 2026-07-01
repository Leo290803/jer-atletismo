type AtletaNumeroLike = {
  numero_competicao?: string | number | null;
  numero?: string | number | null;
} | null | undefined;

export function getNumeroAtleta(atleta: AtletaNumeroLike): string {
  const numero = atleta?.numero_competicao ?? atleta?.numero;

  if (numero === null || numero === undefined) {
    return "-";
  }

  const texto = String(numero).trim();
  return texto === "" ? "-" : texto;
}
