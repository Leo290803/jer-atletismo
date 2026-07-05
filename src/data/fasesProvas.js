export const FASES_PROVA_PADRAO = [
  "QUALIFICACAO",
  "QUALIFICACAO POR TEMPO",
  "SEMI-FINAL",
  "FINAL",
  "FINAL POR TEMPO",
  "FINAL DIRETA",
  "QUARTAS DE FINAL",
  "ELIMINATORIA",
  "CLASSIFICATORIA",
  "CONSOLACAO",
];

const FASES_AUTOMATICAS = new Set(["", "QUALIFICACAO", "FINAL"]);

export function normalizarFaseProva(valor) {
  const texto = String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return texto || "QUALIFICACAO";
}

export function podeSobrescreverFaseAutomaticamente(fase) {
  return FASES_AUTOMATICAS.has(normalizarFaseProva(fase));
}
