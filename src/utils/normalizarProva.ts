export function normalizarProva(prova: string): string {
  if (!prova) return "";

  return prova
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

    // erros comuns
    .replace(/ARREMESO/g, "ARREMESSO")
    .replace(/LANCAMENTO/g, "LANÇAMENTO")

    // remove categoria textual
    .replace(/- MASCULINO/g, "")
    .replace(/- FEMININO/g, "")
    .replace(/- MISTA/g, " MISTO")

    // revezamentos
    .replace(/REVEZAMENTO:/g, "REVEZAMENTO")
    .replace(/5 X 80M/g, "5X80M")
    .replace(/4 X 100M/g, "4X100M")
    .replace(/4 X 400M/g, "4X400M")

    // remove símbolos estranhos
    .replace(/[➔:]/g, "")

    // espaços duplicados
    .replace(/\s+/g, " ")

    .trim();
}