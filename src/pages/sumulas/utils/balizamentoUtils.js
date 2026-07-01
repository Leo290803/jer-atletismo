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
