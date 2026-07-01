export function contarErros(valor) {
  return (String(valor || "").toUpperCase().match(/X/g) || []).length;
}

export function calcularResultadoAltura(raia, alturas, pegarValorAlturaFn) {
  let melhor = "";

  for (const altura of alturas || []) {
    const valor = String(pegarValorAlturaFn(raia, altura) || "").toUpperCase();

    if (["O", "XO", "XXO"].includes(valor)) {
      melhor = altura;
    }

    if (valor === "XXX") break;
  }

  return melhor;
}
