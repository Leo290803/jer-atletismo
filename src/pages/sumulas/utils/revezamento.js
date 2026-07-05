// Utilitarios compartilhados para provas de revezamento (prova por equipe/escola).

function normalizarNome(prova) {
  return String(prova?.nome || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

export function ehRevezamento(prova) {
  const nome = normalizarNome(prova);

  return (
    prova?.tipo === "revezamento" ||
    prova?.subtipo === "revezamento" ||
    nome.includes("REVEZAMENTO") ||
    nome.includes("4X100") ||
    nome.includes("4 X 100") ||
    nome.includes("5X80") ||
    nome.includes("5 X 80") ||
    nome.includes("4X400") ||
    nome.includes("4 X 400")
  );
}

// Quantidade de atletas titulares conforme o tipo de revezamento.
// 5x80 -> 5 titulares; 4x100 e 4x400 -> 4 titulares (padrao).
export function titularesDoRevezamento(prova) {
  const nome = normalizarNome(prova).replace(/\s+/g, "");

  if (nome.includes("5X80")) return 5;
  return 4;
}

// Chave que identifica uma equipe: escola + municipio.
export function chaveEquipeRevezamento(inscricao) {
  const escola =
    inscricao?.atletas?.escolas?.id ||
    inscricao?.atletas?.escolas?.nome ||
    "SEM_ESCOLA";
  const municipio = inscricao?.atletas?.municipio || "SEM_MUNICIPIO";

  return `${escola}||${municipio}`;
}

// Rotulo legivel da equipe (escola - municipio).
export function rotuloEquipeRevezamento(inscricaoOuAtleta) {
  const atleta = inscricaoOuAtleta?.atletas || inscricaoOuAtleta;
  const escola = atleta?.escolas?.nome || "SEM ESCOLA";
  const municipio = atleta?.municipio || "";

  return municipio ? `${escola} - ${municipio}` : escola;
}

export function numeroCompeticaoOrdenavel(inscricao) {
  const atleta = inscricao?.atletas || inscricao;
  const numero = Number(atleta?.numero_competicao ?? atleta?.numero);

  return Number.isFinite(numero) ? numero : Number.POSITIVE_INFINITY;
}

// Colapsa uma lista plana de resultados (um por atleta) em uma entrada por
// EQUIPE (escola + municipio). Usado no boletim/resultados para revezamento.
// Cada entrada carrega os campos do representante (tempo, colocacao, status...)
// e as listas equipeAtletas (titulares) e equipeReservas.
export function agruparResultadosEquipe(resultados) {
  const mapa = new Map();

  (resultados || []).forEach((r) => {
    const chave = chaveEquipeRevezamento(r.inscricoes);
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave).push(r);
  });

  return Array.from(mapa.values()).map((linhas) => {
    const ordenadas = [...linhas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const titulares = ordenadas.filter((r) => !r.reserva);
    const reservas = ordenadas.filter((r) => r.reserva);
    const base = titulares.length ? titulares : ordenadas;

    const representante =
      base.find((r) => r.tempo || r.colocacao || r.resultado_final || r.melhor_marca) ||
      base[0] ||
      ordenadas[0];

    return {
      ...representante,
      equipe: true,
      equipeAtletas: base.map((r) => r.inscricoes?.atletas).filter(Boolean),
      equipeReservas: reservas.map((r) => r.inscricoes?.atletas).filter(Boolean),
    };
  });
}
