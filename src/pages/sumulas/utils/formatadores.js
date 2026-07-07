export function formatarNascimento(data) {
  if (!data) return "-";

  const dataFormatada = new Date(data);
  if (Number.isNaN(dataFormatada.getTime())) {
    return String(data);
  }

  return dataFormatada.toLocaleDateString("pt-BR");
}

export function tempoParaNumero(tempo) {
  if (tempo === null || tempo === undefined) return 999999;
  let t = String(tempo).trim();
  if (!t) return 999999;

  // Aceita os formatos usados no atletismo brasileiro:
  //   2.44"30  ou  2:44.30  ou  2'44"30  -> 2min 44s 30centesimos
  //   44"30    ou  44.30    ou  44,30    -> 44s 30centesimos
  //   1:23.45  -> 1min 23s 45centesimos
  //   12.34 / 12,34 / 58   -> segundos (com ou sem centesimos)
  t = t.replace(/\s/g, "");

  const tinhaDoisPontos = t.includes(":");
  const tinhaAspas = t.includes('"');

  // Quebra por qualquer separador (. , : " ')
  const grupos = t.split(/[.,:"']+/).filter((x) => x !== "");
  const nums = grupos.map((x) => Number(x)).filter((x) => !Number.isNaN(x));

  if (nums.length === 0) return 999999;

  // 3 grupos -> minutos, segundos, centesimos
  if (nums.length === 3) {
    return nums[0] * 60 + nums[1] + nums[2] / 100;
  }

  // 2 grupos -> pode ser min:seg (tinha ":") ou seg.centesimos
  if (nums.length === 2) {
    if (tinhaDoisPontos && !tinhaAspas) {
      // min:seg (ex.: 1:23) — sem centesimos separados
      return nums[0] * 60 + nums[1];
    }
    // seg + centesimos (ex.: 12.34, 44"30, 12,34)
    return nums[0] + nums[1] / 100;
  }

  // 1 grupo -> segundos inteiros
  return nums[0] || 999999;
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