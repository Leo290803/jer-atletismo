export const PROVAS_COMBINADAS_JER = [
  {
    chave: "HEXATLO_12_14_MASCULINO",
    nome: "COMBINADAS HEXATLO",
    categoria: "12 a 14 anos",
    naipe: "Masculino",
    totalProvas: 6,
    subprovas: [
      { ordem: 1, dia: 1, nome: "100 METROS COM BARREIRAS", tipo: "corrida", subtipo: "pista" },
      { ordem: 2, dia: 1, nome: "SALTO EM DISTÂNCIA", tipo: "campo", subtipo: "campo_tentativas" },
      { ordem: 3, dia: 1, nome: "ARREMESSO DO PESO", tipo: "campo", subtipo: "campo_tentativas", implemento: "4 KG" },
      { ordem: 4, dia: 2, nome: "SALTO EM ALTURA", tipo: "campo", subtipo: "salto_altura" },
      { ordem: 5, dia: 2, nome: "LANÇAMENTO DO DARDO", tipo: "campo", subtipo: "campo_tentativas", implemento: "600 G" },
      { ordem: 6, dia: 2, nome: "800 METROS", tipo: "corrida", subtipo: "pista" },
    ],
  },
  {
    chave: "PENTATLO_12_14_FEMININO",
    nome: "COMBINADAS PENTATLO",
    categoria: "12 a 14 anos",
    naipe: "Feminino",
    totalProvas: 5,
    subprovas: [
      { ordem: 1, dia: 1, nome: "80 METROS COM BARREIRAS", tipo: "corrida", subtipo: "pista" },
      { ordem: 2, dia: 1, nome: "SALTO EM ALTURA", tipo: "campo", subtipo: "salto_altura" },
      { ordem: 3, dia: 1, nome: "ARREMESSO DO PESO", tipo: "campo", subtipo: "campo_tentativas", implemento: "3 KG" },
      { ordem: 4, dia: 2, nome: "SALTO EM DISTÂNCIA", tipo: "campo", subtipo: "campo_tentativas" },
      { ordem: 5, dia: 2, nome: "600 METROS", tipo: "corrida", subtipo: "pista" },
    ],
  },
  {
    chave: "PENTATLO_15_17_MASCULINO",
    nome: "COMBINADAS PENTATLO",
    categoria: "15 a 17 anos",
    naipe: "Masculino",
    totalProvas: 5,
    subprovas: [
      { ordem: 1, dia: 1, nome: "110 METROS COM BARREIRAS", tipo: "corrida", subtipo: "pista" },
      { ordem: 2, dia: 1, nome: "SALTO EM ALTURA", tipo: "campo", subtipo: "salto_altura" },
      { ordem: 3, dia: 1, nome: "ARREMESSO DO PESO", tipo: "campo", subtipo: "campo_tentativas", implemento: "5 KG" },
      { ordem: 4, dia: 2, nome: "SALTO EM DISTÂNCIA", tipo: "campo", subtipo: "campo_tentativas" },
      { ordem: 5, dia: 2, nome: "800 METROS", tipo: "corrida", subtipo: "pista" },
    ],
  },
  {
    chave: "PENTATLO_15_17_FEMININO",
    nome: "COMBINADAS PENTATLO",
    categoria: "15 a 17 anos",
    naipe: "Feminino",
    totalProvas: 5,
    subprovas: [
      { ordem: 1, dia: 1, nome: "100 METROS COM BARREIRAS", tipo: "corrida", subtipo: "pista" },
      { ordem: 2, dia: 1, nome: "SALTO EM ALTURA", tipo: "campo", subtipo: "salto_altura" },
      { ordem: 3, dia: 1, nome: "ARREMESSO DO PESO", tipo: "campo", subtipo: "campo_tentativas", implemento: "3 KG" },
      { ordem: 4, dia: 2, nome: "SALTO EM DISTÂNCIA", tipo: "campo", subtipo: "campo_tentativas" },
      { ordem: 5, dia: 2, nome: "800 METROS", tipo: "corrida", subtipo: "pista" },
    ],
  },
];

export function normalizarTextoCombinada(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function buscarCombinadaPorCategoriaNaipe(categoria, naipe) {
  const cat = normalizarTextoCombinada(categoria);
  const np = normalizarTextoCombinada(naipe);

  return PROVAS_COMBINADAS_JER.find(
    (item) =>
      normalizarTextoCombinada(item.categoria) === cat &&
      normalizarTextoCombinada(item.naipe) === np
  );
}

export function ehProvaCombinada(nomeProva) {
  const nome = normalizarTextoCombinada(nomeProva);

  return (
    nome.includes("COMBINADAS") ||
    nome.includes("PENTATLO") ||
    nome.includes("PENTALTO") ||
    nome.includes("HEXATLO")
  );
}