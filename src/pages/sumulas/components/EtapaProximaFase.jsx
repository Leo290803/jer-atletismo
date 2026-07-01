import { getNumeroAtleta } from "../../../utils/getNumeroAtleta";
import Etapa from "./Etapa";

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
const botaoAzul = { ...baseBotao, background: "#38bdf8" };
const botaoRoxo = { ...baseBotao, background: "#a78bfa", marginTop: 10 };

const selectPequeno = {
  display: "block",
  padding: 10,
  borderRadius: 8,
  marginTop: 6,
};

const inputPequeno = {
  display: "block",
  width: 120,
  padding: 10,
  borderRadius: 8,
  marginTop: 6,
};

export default function EtapaProximaFase(props) {
  const {
    mostrarProximaFase,
    setMostrarProximaFase,
    tipoProximaFase,
    setTipoProximaFase,
    raiasProximaFase,
    setRaiasProximaFase,
    regraSugeridaProximaFase,
    totalSeriesDetectadas,
    faseBotao,
    montarPreviewProximaFase,
    gerarProximaFase,
    previewProximaFase,
    mostrarAvancadoProximaFase,
    setMostrarAvancadoProximaFase,
    criterioClassificacao,
    setCriterioClassificacao,
    qAutomaticos,
    setQAutomaticos,
    qTempos,
    setQTempos,
    quantidadeClassificados,
    setQuantidadeClassificados,
    setRegraPreviewProximaFase,
  } = props;

  return (
    <Etapa numero="3" titulo="Proxima fase">
      <button onClick={() => setMostrarProximaFase(!mostrarProximaFase)} style={botaoRoxo}>
        {mostrarProximaFase ? "Ocultar opcoes" : "Mostrar opcoes de proxima fase"}
      </button>

      {mostrarProximaFase && (
        <div style={{ marginTop: 15 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <div>
              <label>Proxima fase</label>
              <select
                value={tipoProximaFase}
                onChange={(e) => {
                  setTipoProximaFase(e.target.value);
                  setRegraPreviewProximaFase(null);
                }}
                style={selectPequeno}
              >
                <option value="QUARTAS DE FINAL">Quartas de final</option>
                <option value="SEMIFINAL">Semifinal</option>
                <option value="FINAL">Final</option>
                <option value="FINAL POR TEMPO">Final por tempo</option>
              </select>
            </div>

            <div>
              <label>Raias da proxima fase</label>
              <input
                type="number"
                value={raiasProximaFase}
                onChange={(e) => {
                  setRaiasProximaFase(Number(e.target.value));
                  setRegraPreviewProximaFase(null);
                }}
                min="1"
                max="10"
                style={inputPequeno}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 12,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#0f172a",
            }}
          >
            <strong>Sistema detectou:</strong> {totalSeriesDetectadas} serie(s) classificatoria(s).
            <br />
            <strong>Regra sugerida:</strong> {regraSugeridaProximaFase.descricao}
            <br />
            <strong>Total:</strong> {regraSugeridaProximaFase.totalClassificados} classificado(s) para {faseBotao}.
            {regraSugeridaProximaFase.aviso && (
              <>
                <br />
                <span style={{ color: "#b45309", fontWeight: "bold" }}>
                  Atencao: {regraSugeridaProximaFase.aviso}
                </span>
              </>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={montarPreviewProximaFase} style={botaoAzul}>
              Ver previa dos classificados
            </button>

            <button
              onClick={gerarProximaFase}
              disabled={previewProximaFase.length === 0}
              style={{
                ...botaoVerde,
                opacity: previewProximaFase.length === 0 ? 0.55 : 1,
                cursor: previewProximaFase.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              Confirmar e Gerar {faseBotao}
            </button>

            <button
              onClick={() => setMostrarAvancadoProximaFase(!mostrarAvancadoProximaFase)}
              style={botaoCinza}
            >
              {mostrarAvancadoProximaFase ? "Ocultar opcoes avancadas" : "Mostrar opcoes avancadas"}
            </button>
          </div>

          {mostrarAvancadoProximaFase && (
            <div
              style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 12,
                border: "1px dashed #94a3b8",
                background: "#f8fafc",
              }}
            >
              <strong>Opcoes avancadas</strong>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                <div>
                  <label>Criterio</label>
                  <select
                    value={criterioClassificacao}
                    onChange={(e) => {
                      setCriterioClassificacao(e.target.value);
                      setRegraPreviewProximaFase(null);
                    }}
                    style={selectPequeno}
                  >
                    <option value="q_q">Q por serie + q por tempo/marca</option>
                    <option value="melhores_gerais">Melhores tempos/marcas gerais</option>
                  </select>
                </div>

                <div>
                  <label>Classificados por serie (Q)</label>
                  <input
                    type="number"
                    value={qAutomaticos}
                    onChange={(e) => {
                      setQAutomaticos(Number(e.target.value));
                      setRegraPreviewProximaFase(null);
                    }}
                    min="0"
                    style={inputPequeno}
                  />
                </div>

                <div>
                  <label>Melhores tempos/marcas (q)</label>
                  <input
                    type="number"
                    value={qTempos}
                    onChange={(e) => {
                      setQTempos(Number(e.target.value));
                      setRegraPreviewProximaFase(null);
                    }}
                    min="0"
                    style={inputPequeno}
                  />
                </div>

                <div>
                  <label>Total classificados</label>
                  <input
                    type="number"
                    value={quantidadeClassificados}
                    onChange={(e) => {
                      setQuantidadeClassificados(Number(e.target.value));
                      setRegraPreviewProximaFase(null);
                    }}
                    min="1"
                    style={inputPequeno}
                  />
                </div>
              </div>
            </div>
          )}

          {previewProximaFase.length > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                border: "1px solid #22c55e",
                background: "#ecfdf5",
                color: "#052e16",
              }}
            >
              <strong>Previa dos classificados para {faseBotao}</strong>

              <div style={{ overflowX: "auto", marginTop: 10 }}>
                <table width="100%" cellPadding="8">
                  <thead>
                    <tr>
                      <th align="left">Tipo</th>
                      <th align="left">No</th>
                      <th align="left">Atleta</th>
                      <th align="left">Escola</th>
                      <th align="center">Serie</th>
                      <th align="center">Colocacao</th>
                      <th align="center">Resultado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {previewProximaFase.map((item, index) => {
                      const atleta = item.inscricoes?.atletas;

                      return (
                        <tr key={`${item.id}-${index}`}>
                          <td>{item.qualificacao || "q"}</td>
                          <td>{getNumeroAtleta(atleta)}</td>
                          <td>{atleta?.nome || "-"}</td>
                          <td>{atleta?.escolas?.nome || "-"}</td>
                          <td align="center">{item.serieNumero || "-"}</td>
                          <td align="center">{item.colocacao ? `${item.colocacao}o` : "-"}</td>
                          <td align="center">
                            {item.tempo || item.melhor_marca || item.resultado_final || item.valorClassificacao || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Etapa>
  );
}
