// Calculo oficial de pontos das provas combinadas (Pentatlo/Hexatlo) do JER.
// Usa as tabelas oficiais CBAt (marca -> pontos) extraidas dos documentos oficiais.

import { TABELAS_COMBINADAS } from "./tabelasCombinadas.js";

// Converte um tempo em varios formatos para segundos:
//  "1:53.81"  -> min:seg.centesimos
//  "01.40.00" -> min.seg.centesimos (formato de algumas tabelas)
//  "12.6"     -> segundos.decimos
export function marcaTempoParaSegundos(marca) {
  const txt = String(marca).trim();
  if (!txt) return NaN;
  if (txt.includes(":")) {
    const [mm, resto] = txt.split(":");
    return parseInt(mm, 10) * 60 + parseFloat(resto);
  }
  const partes = txt.split(".");
  if (partes.length === 3) {
    return parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10) + parseInt(partes[2], 10) / 100;
  }
  return parseFloat(txt.replace(",", "."));
}

// Mapeia a chave da combinada do sistema para a chave da tabela oficial.
export function mapearChaveCombinada(chaveSistema) {
  const c = String(chaveSistema || "").toUpperCase();
  if (c.includes("HEXATLO") && c.includes("12")) return "HEXATLO_12_14_MASC";
  if (c.includes("PENTATLO") && c.includes("12")) return "PENTATLO_12_14_FEM";
  if (c.includes("PENTATLO") && c.includes("15") && c.includes("MASC")) return "PENTATLO_15_17_MASC";
  if (c.includes("PENTATLO") && c.includes("15") && c.includes("FEM")) return "PENTATLO_15_17_FEM";
  return null;
}

// Mapeia o nome de uma subprova do sistema para o nome na tabela oficial.
export function mapearNomeProva(chaveTabela, nomeSubprova) {
  const tabela = TABELAS_COMBINADAS[chaveTabela];
  if (!tabela) return null;
  const n = String(nomeSubprova || "").toLowerCase();
  const provas = Object.keys(tabela);
  if (n.includes("barreira")) return provas.find((p) => { const x = p.toLowerCase(); return x.includes("barreira") || x.includes("sob"); });
  if (n.includes("distanc") || n.includes("distân")) return provas.find((p) => { const x = p.toLowerCase(); return x.includes("distan") || x.includes("distân"); });
  if (n.includes("altura")) return provas.find((p) => p.toLowerCase().includes("altura"));
  if (n.includes("peso")) return provas.find((p) => p.toLowerCase().includes("peso"));
  if (n.includes("dardo")) return provas.find((p) => p.toLowerCase().includes("dardo"));
  if (n.includes("600")) return provas.find((p) => p.includes("600"));
  if (n.includes("800")) return provas.find((p) => p.includes("800") || p.toLowerCase().includes("metros"));
  return null;
}

// Detecta se a prova e de tempo (pista) ou de marca (campo).
export function provaCombinadaEhTempo(nomeProva) {
  const n = String(nomeProva || "").toLowerCase();
  return n.includes("barreira") || n.includes("sob") || n.includes("600") || n.includes("800") || n.includes("metros");
}

// Calcula os pontos de uma marca numa subprova da combinada.
// chaveCombinada: chave do sistema (ex.: "HEXATLO_12_14_MASCULINO")
// nomeSubprova: nome da subprova no sistema (ex.: "ARREMESSO DO PESO")
// marcaAtleta: a marca lancada (tempo "1:53.81"/"14.20" ou distancia "9,60"/"1.45")
export function calcularPontosCombinada(chaveCombinada, nomeSubprova, marcaAtleta) {
  if (marcaAtleta === null || marcaAtleta === undefined || String(marcaAtleta).trim() === "") return 0;

  const chaveTabela = mapearChaveCombinada(chaveCombinada);
  if (!chaveTabela) return 0;

  const nomeTabela = mapearNomeProva(chaveTabela, nomeSubprova);
  if (!nomeTabela) return 0;

  const pares = TABELAS_COMBINADAS[chaveTabela][nomeTabela];
  if (!pares || !pares.length) return 0;

  if (provaCombinadaEhTempo(nomeTabela)) {
    // Pista: menor tempo = mais pontos. Pontua pela marca alcancada ou superada.
    const alvo = marcaTempoParaSegundos(marcaAtleta);
    if (!isFinite(alvo)) return 0;
    let melhor = 0;
    for (const [m, p] of pares) {
      if (alvo <= marcaTempoParaSegundos(m)) melhor = Math.max(melhor, p);
    }
    return melhor;
  }

  // Campo: maior marca = mais pontos.
  const alvo = parseFloat(String(marcaAtleta).replace(",", "."));
  if (!isFinite(alvo)) return 0;
  let melhor = 0;
  for (const [m, p] of pares) {
    if (alvo >= parseFloat(m)) melhor = Math.max(melhor, p);
  }
  return melhor;
}

// Calcula o total de pontos de um atleta somando todas as subprovas.
// resultadosPorSubprova: { "ARREMESSO DO PESO": "9,60", "800 METROS": "2:40.00", ... }
export function calcularTotalCombinada(chaveCombinada, resultadosPorSubprova) {
  let total = 0;
  const detalhe = {};
  for (const [subprova, marca] of Object.entries(resultadosPorSubprova || {})) {
    const pts = calcularPontosCombinada(chaveCombinada, subprova, marca);
    detalhe[subprova] = pts;
    total += pts;
  }
  return { total, detalhe };
}