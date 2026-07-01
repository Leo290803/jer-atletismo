import Etapa from "./Etapa";

export default function EtapaLancamento({
  salvarResultados,
  classificarAutomaticamente,
  imprimir,
}) {
  const baseBotao = {
    padding: "12px 18px",
    border: "none",
    borderRadius: 10,
    color: "#020617",
    fontWeight: "bold",
    marginRight: 10,
    marginBottom: 10,
    cursor: "pointer",
  };

  const botaoCinza = { ...baseBotao, background: "#94a3b8" };
  const botaoVerde = { ...baseBotao, background: "#22c55e" };
  const botaoAmarelo = { ...baseBotao, background: "#facc15" };
  const botaoAzul = { ...baseBotao, background: "#38bdf8" };

  return (
    <Etapa numero="2" titulo="Lancar, classificar e publicar">
      <button onClick={() => salvarResultados(false)} style={botaoCinza}>
        Salvar Rascunho
      </button>

      <button onClick={classificarAutomaticamente} style={botaoAmarelo}>
        Classificar
      </button>

      <button onClick={() => salvarResultados(true)} style={botaoVerde}>
        Publicar no Boletim
      </button>

      <button onClick={imprimir} style={botaoAzul}>
        Imprimir Sumula
      </button>
    </Etapa>
  );
}
