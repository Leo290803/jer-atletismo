export function raiaOficialPorSeed(posicao, totalRaias) {
  const ordem8 = [4, 5, 3, 6, 2, 7, 1, 8];
  const ordem9 = [5, 6, 4, 7, 3, 8, 2, 9, 1];
  const ordem10 = [5, 6, 4, 7, 3, 8, 2, 9, 1, 10];

  if (Number(totalRaias) === 8) return ordem8[posicao] || posicao + 1;
  if (Number(totalRaias) === 9) return ordem9[posicao] || posicao + 1;
  if (Number(totalRaias) === 10) return ordem10[posicao] || posicao + 1;
  return posicao + 1;
}

export function distribuirEmSeriesBalanceadas(classificadosOrdenados, totalSeries) {
  const grupos = Array.from({ length: totalSeries }, () => []);

  (classificadosOrdenados || []).forEach((atleta, index) => {
    const bloco = Math.floor(index / totalSeries);
    const posicaoNoBloco = index % totalSeries;
    const serieIndex = bloco % 2 === 0 ? posicaoNoBloco : totalSeries - 1 - posicaoNoBloco;
    grupos[serieIndex].push(atleta);
  });

  return grupos;
}
