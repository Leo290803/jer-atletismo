import { getNumeroAtleta } from "../../../utils/getNumeroAtleta";
import {
  TabelaCampo,
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

export default function SumulaImpressao({
  series,
  ehSaltoAltura,
  ehCampoTentativas,
  ehRevezamento,
  config,
  provaAtual,
  dataProva,
  pegarValorAltura,
  mudarTentativaAltura,
  mudarCampo,
  calcularResultadoAltura,
  melhorDasTresPrimeiras,
  melhorDasTentativas,
  formatarNascimento,
}) {
  return (
    <>
      {series.map((serie) => (
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
          <h2 style={{ textAlign: "center" }}>{config.texto_cabecalho}</h2>

          {provaAtual && (
            <p style={{ textAlign: "center" }}>
              <strong>Prova:</strong> {provaAtual.nome}
              &nbsp; | &nbsp;
              <strong>Categoria:</strong> {provaAtual.categoria}
              &nbsp; | &nbsp;
              <strong>Naipe:</strong> {provaAtual.naipe}
              &nbsp; | &nbsp;
              <strong>Fase:</strong> {provaAtual.fase || "QUALIFICACAO"}
              &nbsp; | &nbsp;
              <strong>Data:</strong> {dataProva}
            </p>
          )}

          {ehSaltoAltura && (
            <>
              <h3>Salto em Altura</h3>

              <div style={{ overflowX: "auto" }}>
                <table width="100%" cellPadding="10">
                  <thead>
                    <tr>
                      <th rowSpan="2">No</th>
                      <th rowSpan="2">Atleta</th>
                      <th rowSpan="2">Escola</th>
                      <th rowSpan="2">Nascimento</th>

                      {config.alturas_salto_altura.map((altura) => (
                        <th key={altura} colSpan="3">
                          {altura}
                        </th>
                      ))}

                      <th rowSpan="2">Resultado</th>
                      <th rowSpan="2">Colocacao</th>
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
              <h3>Classificacao / Qualificacao</h3>

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
              <h3>Revezamento - Serie {serie.numero_serie}</h3>

              <TabelaRevezamento serie={serie} mudarCampo={mudarCampo} inputTabela={inputTabela} />
            </>
          )}

          {!ehCampoTentativas && !ehSaltoAltura && !ehRevezamento && (
            <>
              <h3>Serie {serie.numero_serie}</h3>

              <TabelaPista
                serie={serie}
                mudarCampo={mudarCampo}
                inputTabela={inputTabela}
                formatarNascimento={formatarNascimento}
              />
            </>
          )}

          {config.mostrar_assinaturas && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 50, gap: 40 }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ borderTop: "1px solid black", paddingTop: 8 }}>Arbitro da Prova</div>
              </div>

              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ borderTop: "1px solid black", paddingTop: 8 }}>Coordenacao de Atletismo</div>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
