import { useEffect, useState } from "react";
import { carregarSumulaDigital } from "../services/sumulaDigitalService";

export function useSumulaDigital(provaSelecionadaId) {
  const [sumulasDigitais, setSumulasDigitais] = useState([]);
  const [carregandoSumulaDigital, setCarregandoSumulaDigital] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      if (!provaSelecionadaId) {
        setSumulasDigitais([]);
        return;
      }

      setCarregandoSumulaDigital(true);
      const { data } = await carregarSumulaDigital(provaSelecionadaId);
      if (!cancelado) {
        setSumulasDigitais(data || []);
        setCarregandoSumulaDigital(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [provaSelecionadaId]);

  return {
    sumulasDigitais,
    setSumulasDigitais,
    carregandoSumulaDigital,
  };
}
