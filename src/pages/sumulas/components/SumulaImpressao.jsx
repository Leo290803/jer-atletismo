import { getNumeroAtleta } from "../../../utils/getNumeroAtleta";
import {
  TabelaCampo,
  TabelaCombinadaFinal,
  TabelaCombinadaProva,
  TabelaPista,
  TabelaRevezamento,
} from "./TabelasSumula";

const inputTabela = {
  width: 80,
  padding: 6,
};

const inputMini = {
  width: 55,
  padding: 5,
  textAlign: "center",
};

const inputMiniAltura = {
  width: 18,
  padding: 2,
  textAlign: "center",
};

function dataParaTexto(data) {
  if (!data) return "";
  const partes = String(data).split("-");
  if (partes.length !== 3) return data;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

export default function SumulaImpressao({
  series,
  ehSaltoAltura,
  ehCampoTentativas,
  ehRevezamento,
  ehCombinada,
  combinadaInfo,
  config,
  provaAtual,
  dataProva,
  datasCombinada,
  pegarValorAltura,
  mudarTentativaAltura,
  mudarCampo,
  calcularResultadoAltura,
  melhorDasTresPrimeiras,
  melhorDasTentativas,
  formatarNascimento,
}) {
  const subprovasCombinada = [...(combinadaInfo?.subprovas || [])].sort(
    (a, b) => (a?.ordem || 0) - (b?.ordem || 0)
  );

  function renderCabecalho({ provaNome, data }) {
    return (
      <div className="sumula-cabecalho-impressao">
        <h2>{config?.texto_cabecalho || "SÚMULA OFICIAL DE ATLETISMO"}</h2>

        {provaAtual && (
          <p className="sumula-meta-impressao">
            <strong>Prova:</strong> {provaNome || provaAtual.nome}
            &nbsp; | &nbsp;
            <strong>Categoria:</strong> {provaAtual.categoria}
            &nbsp; | &nbsp;
            <strong>Naipe:</strong> {provaAtual.naipe}
            &nbsp; | &nbsp;
            <strong>Fase:</strong> {provaAtual.fase || "QUALIFICACAO"}
            &nbsp; | &nbsp;
            <strong>Data:</strong> {dataParaTexto(data || dataProva)}
          </p>
        )}

        {config?.local_evento && (
          <p className="sumula-local-impressao">
            <strong>Local:</strong> {config.local_evento}
          </p>
        )}
      </div>
    );
  }

  function renderAssinaturas() {
    if (!config?.mostrar_assinaturas) return null;

    return (
      <div className="assinaturas-sumula">
        <div>
          <div>Árbitro da Prova</div>
        </div>

        <div>
          <div>Coordenação de Atletismo</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {series.map((serie) => {
        if (ehCombinada) {
          return (
            <div key={serie.id + "-combinada"}>
              {subprovasCombinada.map((subprova) => (
                <div
                  className="card quebra-pagina sumula-print sumula-combinada"
                  key={serie.id + "-subprova-" + subprova.ordem}
                  style={{ marginBottom: 20 }}
                >
                  {renderCabecalho({
                    provaNome: `${subprova.nome}${subprova.implemento ? " - " + subprova.implemento : ""}`,
                    data: datasCombinada["dia" + subprova.dia] || dataProva,
                  })}

                  <h3 className="sumula-titulo-serie">Série {serie.numero_serie}</h3>

                  <TabelaCombinadaProva
                    serie={serie}
                    subprova={subprova}
                    subprovas={subprovasCombinada}
                    dataSubprova={datasCombinada["dia" + subprova.dia]}
                    mudarCampo={mudarCampo}
                    inputTabela={inputMini}
                    formatarNascimento={formatarNascimento}
                  />

                  {renderAssinaturas()}
                </div>
              ))}

              <div
                className="card quebra-pagina sumula-print sumula-combinada"
                key={serie.id + "-resultado-final"}
                style={{ marginBottom: 20 }}
              >
                {renderCabecalho({
                  provaNome: `${provaAtual?.nome || "COMBINADA"} - Resultado Final`,
                  data: dataProva,
                })}

                <h3 className="sumula-titulo-serie">Série {serie.numero_serie}</h3>

                <TabelaCombinadaFinal
                  serie={serie}
                  subprovas={subprovasCombinada}
                  mudarCampo={mudarCampo}
                  inputTabela={inputMini}
                  formatarNascimento={formatarNascimento}
                />

                {renderAssinaturas()}
              </div>
            </div>
          );
        }

        return (
          <div
            className={`card quebra-pagina sumula-print ${
              ehSaltoAltura
                ? "sumula-salto-altura"
                : ehCampoTentativas
                ? "sumula-campo"
                : ehRevezamento
                ? "sumula-revezamento"
                : "sumula-pista"
            }`}
            key={serie.id}
            style={{ marginBottom: 20 }}
          >
            {renderCabecalho({ provaNome: provaAtual?.nome, data: dataProva })}

            {ehSaltoAltura && (
              <>
                <h3 className="sumula-titulo-serie">Salto em Altura</h3>

                <div style={{ overflowX: "auto" }}>
                  <table width="100%" cellPadding="10">
                    <thead>
                      <tr>
                        <th rowSpan="2">Nº</th>
                        <th rowSpan="2">Atleta</th>
                        <th rowSpan="2">Escola</th>
                        <th rowSpan="2">Nascimento</th>

                        {config.alturas_salto_altura.map((altura) => (
                          <th key={altura} colSpan="3">
                            {altura}
                          </th>
                        ))}

                        <th rowSpan="2">Resultado</th>
                        <th rowSpan="2">Colocação</th>
                        <th rowSpan="2">Q</th>
                      </tr>

                      <tr>
                        {config.alturas_salto_altura.flatMap((altura) => [
                          <th key={`${altura}-t1`}></th>,
                          <th key={`${altura}-t2`}></th>,
                          <th key={`${altura}-t3`}></th>,
                        ])}
                      </tr>
                    </thead>

                    <tbody>
                      {serie.raias
                        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                        .map((r) => {
                          const atleta = r.inscricoes?.atletas;

                          return (
                            <tr key={r.id}>
                              <td>{getNumeroAtleta(atleta)}</td>
                              <td>{atleta?.nome}</td>
                              <td>{atleta?.escolas?.nome}</td>
                              <td>{formatarNascimento(atleta?.data_nascimento)}</td>

                              {config.alturas_salto_altura.flatMap((altura) => {
                                const valor = String(pegarValorAltura(r, altura) || "")
                                  .toUpperCase()
                                  .padEnd(3, " ");

                                return [
                                  <td key={`${r.id}-${altura}-1`}>
                                    <input
                                      value={valor[0].trim()}
                                      onChange={(e) =>
                                        mudarTentativaAltura(serie.id, r.id, altura, 0, e.target.value)
                                      }
                                      placeholder=""
                                      style={inputMiniAltura}
                                    />
                                  </td>,

                                  <td key={`${r.id}-${altura}-2`}>
                                    <input
                                      value={valor[1].trim()}
                                      onChange={(e) =>
                                        mudarTentativaAltura(serie.id, r.id, altura, 1, e.target.value)
                                      }
                                      placeholder=""
                                      style={inputMiniAltura}
                                    />
                                  </td>,

                                  <td key={`${r.id}-${altura}-3`}>
                                    <input
                                      value={valor[2].trim()}
                                      onChange={(e) =>
                                        mudarTentativaAltura(serie.id, r.id, altura, 2, e.target.value)
                                      }
                                      placeholder=""
                                      style={inputMiniAltura}
                                    />
                                  </td>,
                                ];
                              })}

                              <td>
                                <input
                                  value={r.resultado_final || calcularResultadoAltura(r)}
                                  onChange={(e) => mudarCampo(serie.id, r.id, "resultado_final", e.target.value)}
                                  style={inputMini}
                                />
                              </td>

                              <td>
                                <input
                                  value={r.colocacao}
                                  onChange={(e) => mudarCampo(serie.id, r.id, "colocacao", e.target.value)}
                                  style={inputMini}
                                />
                              </td>

                              <td style={{ fontWeight: "bold", textAlign: "center" }}>
                                {r.qualificacao || ""}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {ehCampoTentativas && !ehSaltoAltura && !ehRevezamento && (
              <>
                <h3 className="sumula-titulo-serie">Classificação / Qualificação</h3>

                <TabelaCampo
                  serie={serie}
                  mudarCampo={mudarCampo}
                  melhorDasTresPrimeiras={melhorDasTresPrimeiras}
                  melhorDasTentativas={melhorDasTentativas}
                  inputTabela={inputTabela}
                  formatarNascimento={formatarNascimento}
                />
              </>
            )}

            {ehRevezamento && !ehSaltoAltura && (
              <>
                <h3 className="sumula-titulo-serie">Revezamento - Série {serie.numero_serie}</h3>

                <TabelaRevezamento serie={serie} mudarCampo={mudarCampo} inputTabela={inputTabela} />
              </>
            )}

            {!ehCampoTentativas && !ehSaltoAltura && !ehRevezamento && (
              <>
                <h3 className="sumula-titulo-serie">Série {serie.numero_serie}</h3>

                <TabelaPista
                  serie={serie}
                  mudarCampo={mudarCampo}
                  inputTabela={inputTabela}
                  formatarNascimento={formatarNascimento}
                />
              </>
            )}

            {renderAssinaturas()}
          </div>
        );
      })}
    </>
  );
}
