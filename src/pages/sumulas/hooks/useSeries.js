import { useEffect, useState } from "react";
import { carregarSeries } from "../services/seriesService";

export function useSeries(provaSelecionadaId) {
  const [series, setSeries] = useState([]);
  const [loadingSeries, setLoadingSeries] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      if (!provaSelecionadaId) {
        setSeries([]);
        return;
      }

      setLoadingSeries(true);
      const { data } = await carregarSeries(provaSelecionadaId);
      if (!cancelado) {
        setSeries(data || []);
        setLoadingSeries(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [provaSelecionadaId]);

  return {
    series,
    setSeries,
    loadingSeries,
  };
}
