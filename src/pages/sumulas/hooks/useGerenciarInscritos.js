import { useEffect, useState } from "react";
import { carregarInscricoesDaProva } from "../services/atletasService";

export function useGerenciarInscritos(provaSelecionadaId) {
  const [inscricoes, setInscricoes] = useState([]);
  const [loadingInscricoes, setLoadingInscricoes] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      if (!provaSelecionadaId) {
        setInscricoes([]);
        return;
      }

      setLoadingInscricoes(true);
      const { data } = await carregarInscricoesDaProva(provaSelecionadaId);
      if (!cancelado) {
        setInscricoes(data || []);
        setLoadingInscricoes(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [provaSelecionadaId]);

  return {
    inscricoes,
    setInscricoes,
    loadingInscricoes,
  };
}
