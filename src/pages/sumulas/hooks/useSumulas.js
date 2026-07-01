import { useEffect, useState } from "react";
import { carregarConfiguracoes, carregarProvas } from "../services/sumulasService";

export function useSumulas() {
  const [provas, setProvas] = useState([]);
  const [tipoCompeticao, setTipoCompeticao] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setLoading(true);
      const [{ data: config }, { data: provasData }] = await Promise.all([
        carregarConfiguracoes(),
        carregarProvas(),
      ]);

      if (cancelado) return;
      setTipoCompeticao(config?.valor?.tipoCompeticao || "");
      setProvas(provasData || []);
      setLoading(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  return {
    provas,
    setProvas,
    tipoCompeticao,
    loading,
  };
}
