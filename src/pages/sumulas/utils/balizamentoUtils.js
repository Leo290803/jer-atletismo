export function embaralhar(lista) {
  const array = [...(lista || [])];

  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

export function escolaDaInscricao(inscricao) {
  return inscricao?.atletas?.escolas?.id || inscricao?.atletas?.escolas?.nome || "SEM_ESCOLA";
}

export function contarConflitosEscola(grupos) {
  let conflitos = 0;

  (grupos || []).forEach((grupo) => {
    const contagem = {};

    (grupo || []).forEach((inscricao) => {
      const escola = escolaDaInscricao(inscricao);
      contagem[escola] = (contagem[escola] || 0) + 1;
    });

    Object.values(contagem).forEach((qtd) => {
      if (qtd > 1) conflitos += qtd - 1;
    });
  });

  return conflitos;
}

export function distribuirSimples(listaInscricoes, totalSeries, quantidadePorSerie) {
  const grupos = Array.from({ length: totalSeries }, () => []);

  (listaInscricoes || []).forEach((inscricao, index) => {
    const serieIndex = Math.floor(index / quantidadePorSerie);
    grupos[serieIndex].push(inscricao);
  });

  return grupos;
}

// Distribui os atletas o mais EQUILIBRADO possivel entre as series, respeitando
// o limite de raias. Ex.: 33 atletas / 8 raias -> 5 series de 7,7,7,6,6
// (em vez de 8,8,8,9 que estoura as raias, ou 8,8,8,8,1 que deixa 1 sozinho).
export function distribuirEquilibrado(listaInscricoes, quantidadePorSerie) {
  const lista = listaInscricoes || [];
  const total = lista.length;
  const limite = Math.max(1, Number(quantidadePorSerie) || 8);

  if (total === 0) return [];

  // Numero minimo de series para caber todos respeitando o limite de raias.
  const totalSeries = Math.max(1, Math.ceil(total / limite));
  const grupos = Array.from({ length: totalSeries }, () => []);

  // Distribuicao equilibrada: quantos vao em cada serie.
  // base = piso(total/series); resto series ganham +1.
  const base = Math.floor(total / totalSeries);
  const resto = total % totalSeries;

  let indice = 0;
  for (let s = 0; s < totalSeries; s += 1) {
    const tamanhoSerie = base + (s < resto ? 1 : 0);
    for (let k = 0; k < tamanhoSerie; k += 1) {
      grupos[s].push(lista[indice]);
      indice += 1;
    }
  }

  return grupos;
}