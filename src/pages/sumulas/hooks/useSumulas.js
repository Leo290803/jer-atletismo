import { useEffect, useState } from "react";
import { carregarConfiguracoes, carregarProvas } from "../services/sumulasService";

const CONFIG_PADRAO = {
  texto_cabecalho: "SUMULA OFICIAL DE ATLETISMO - JER 2026",
  mostrar_municipio: true,
  mostrar_assinaturas: true,
  quantidade_raias: 8,
  atletas_por_serie_campo: 15,
  finalistas_campo: 8,
  alturas_salto_altura: [
    "1.15", "1.20", "1.25", "1.30", "1.35", "1.40",
    "1.45", "1.50", "1.55", "1.60", "1.65", "1.70",
    "1.75", "1.80",
  ],
};

export function useSumulas() {
  const [config, setConfig] = useState(CONFIG_PADRAO);
  const [provas, setProvas] = useState([]);
  const [provaSelecionada, setProvaSelecionada] = useState("");
  const [loading, setLoading] = useState(false);

  async function carregarConfiguracoesIniciais() {
    const { data } = await carregarConfiguracoes();

    if (data?.valor) {
      const novaConfig = {
        ...CONFIG_PADRAO,
        ...data.valor,
      };

      setConfig(novaConfig);
    }
  }

  async function carregarProvasLista() {
    const { data, error } = await carregarProvas();

    if (error) {
      return { ok: false, message: error.message };
    }

    setProvas(data || []);
    return { ok: true };
  }

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setLoading(true);

      const [configResp, provasResp] = await Promise.all([
        carregarConfiguracoes(),
        carregarProvas(),
      ]);

      if (cancelado) return;

      if (configResp.data?.valor) {
        setConfig({
          ...CONFIG_PADRAO,
          ...configResp.data.valor,
        });
      }

      setProvas(provasResp.data || []);
      setLoading(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  return {
    config,
    setConfig,
    provas,
    setProvas,
    provaSelecionada,
    setProvaSelecionada,
    carregarConfiguracoesIniciais,
    carregarProvas: carregarProvasLista,
    loading,
  };
}
