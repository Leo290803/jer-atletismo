import { useMemo } from "react";

export function useProximaFase({ series = [], raiasProximaFase = 8, mostrarAvancado = false, calcularRegraAutomatica }) {
  return useMemo(() => {
    if (mostrarAvancado || typeof calcularRegraAutomatica !== "function") {
      return {
        criterio: "TEMPOS",
        qPorSerie: 1,
        qPorTempo: 0,
        totalClassificados: 0,
      };
    }

    return calcularRegraAutomatica({ series, raiasProximaFase });
  }, [series, raiasProximaFase, mostrarAvancado, calcularRegraAutomatica]);
}
