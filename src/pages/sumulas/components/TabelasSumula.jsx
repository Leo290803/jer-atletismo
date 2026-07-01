import { getNumeroAtleta } from "../../../utils/getNumeroAtleta";

export function TabelaRevezamento({ serie, mudarCampo, inputTabela }) {
  function chaveEscola(raia) {
    return raia.inscricoes?.atletas?.escolas?.nome || "SEM ESCOLA";
  }

  const gruposPorEscola = {};

  [...(serie.raias || [])]
    .sort((a, b) => (a.raia || 0) - (b.raia || 0))
    .forEach((raia) => {
      const escola = chaveEscola(raia);

      if (!gruposPorEscola[escola]) {
        gruposPorEscola[escola] = [];
      }

      gruposPorEscola[escola].push(raia);
    });

  const grupos = Object.entries(gruposPorEscola).map(([escola, raias]) => ({
    escola,
    raias: raias.slice(0, 8),
    representante: raias[0],
  }));

  return (
    <table width="100%" cellPadding="10">
      <thead>
        <tr>
          <th>Nº</th>
          <th>Nome</th>
          <th>Escola</th>
          <th>Tempo</th>
          <th>Raia</th>
          <th>Classificação</th>
        </tr>
      </thead>

      <tbody>
        {grupos.map((grupo, grupoIndex) => {
          const representante = grupo.representante;
          const quantidadeLinhas = Math.max(grupo.raias.length, 4);
          const linhas = Array.from({ length: quantidadeLinhas }, (_, index) => grupo.raias[index] || null);

          return linhas.map((r, index) => {
            const atleta = r?.inscricoes?.atletas;
            const chaveLinha = r?.id || `${grupo.escola}-${grupoIndex}-${index}`;

            return (
              <tr key={chaveLinha}>
                <td>{getNumeroAtleta(atleta)}</td>
                <td>{atleta?.nome || ""}</td>

                {index === 0 && (
                  <td rowSpan={quantidadeLinhas} style={{ fontWeight: "bold", textAlign: "center" }}>
                    {grupo.escola}
                  </td>
                )}

                {index === 0 && (
                  <td rowSpan={quantidadeLinhas}>
                    <input
                      value={representante?.tempo || ""}
                      onChange={(e) =>
                        mudarCampo(serie.id, representante.id, "tempo", e.target.value)
                      }
                      placeholder=""
                      style={inputTabela}
                    />
                  </td>
                )}

                {index === 0 && (
                  <td rowSpan={quantidadeLinhas}>
                    <input
                      value={representante?.raia || ""}
                      onChange={(e) =>
                        mudarCampo(serie.id, representante.id, "raia", e.target.value)
                      }
                      placeholder=""
                      style={inputTabela}
                    />
                  </td>
                )}

                {index === 0 && (
                  <td rowSpan={quantidadeLinhas}>
                    <input
                      value={representante?.colocacao || ""}
                      onChange={(e) =>
                        mudarCampo(serie.id, representante.id, "colocacao", e.target.value)
                      }
                      placeholder=""
                      style={inputTabela}
                    />
                  </td>
                )}
              </tr>
            );
          });
        })}
      </tbody>
    </table>
  );
}

export function TabelaPista({ serie, mudarCampo, inputTabela, formatarNascimento }) {
  return (
    <table width="100%" cellPadding="10">
      <thead>
        <tr>
          <th>Raia</th>
          <th>Nº</th>
          <th>Atleta</th>
          <th>Escola</th>
          <th>Nascimento</th>
          <th>Tempo</th>
          <th>Colocação</th>
          <th>Q</th>
          <th className="nao-imprimir">Status</th>
        </tr>
      </thead>

      <tbody>
        {serie.raias
          .sort((a, b) => a.raia - b.raia)
          .map((r) => {
            const atleta = r.inscricoes?.atletas;

            return (
              <tr key={r.id}>
                <td>{r.raia}</td>
                <td>{getNumeroAtleta(atleta)}</td>
                <td>{atleta?.nome}</td>
                <td>{atleta?.escolas?.nome}</td>
                <td>{formatarNascimento(atleta?.data_nascimento)}</td>

                <td>
                  <input
                    value={r.tempo}
                    onChange={(e) => mudarCampo(serie.id, r.id, "tempo", e.target.value)}
                    placeholder=""
                    style={inputTabela}
                  />
                </td>

                <td>
                  <input
                    value={r.colocacao}
                    onChange={(e) => mudarCampo(serie.id, r.id, "colocacao", e.target.value)}
                    style={inputTabela}
                  />
                </td>

                <td style={{ fontWeight: "bold", textAlign: "center" }}>
                  {r.qualificacao || ""}
                </td>

                <td className="nao-imprimir">
                  <select
                    value={r.status}
                    onChange={(e) => mudarCampo(serie.id, r.id, "status", e.target.value)}
                  >
                    <option value="OK">OK</option>
                    <option value="DQ">DQ</option>
                    <option value="DNS">DNS</option>
                    <option value="ABD">ABD</option>
                    <option value="DNF">DNF</option>
                    <option value="NM">NM</option>
                  </select>
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}

export function TabelaCampo({
  serie,
  mudarCampo,
  melhorDasTresPrimeiras,
  melhorDasTentativas,
  inputTabela,
  formatarNascimento,
}) {
  return (
    <table width="100%" cellPadding="10">
      <thead>
        <tr>
          <th>Nº</th>
          <th>Atleta</th>
          <th>Escola</th>
          <th>Nascimento</th>
          <th>1ª</th>
          <th>2ª</th>
          <th>3ª</th>
          <th>Parcial</th>
          <th>Class.</th>
          <th>4ª</th>
          <th>5ª</th>
          <th>Classs. Parcial</th>
          <th>6ª</th>
          <th>Resultado Final</th>
          <th>Colocação</th>
          <th>Q</th>
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

                {["tentativa1", "tentativa2", "tentativa3"].map((campo) => (
                  <td key={campo}>
                    <input
                      value={r[campo]}
                      onChange={(e) => mudarCampo(serie.id, r.id, campo, e.target.value)}
                      style={inputTabela}
                    />
                  </td>
                ))}

                <td>{melhorDasTresPrimeiras(r)}</td>

                <td>
                  <input
                    value={r.classificacao_parcial}
                    onChange={(e) =>
                      mudarCampo(serie.id, r.id, "classificacao_parcial", e.target.value)
                    }
                    style={inputTabela}
                  />
                </td>

                <td>
                  <input
                    value={r.tentativa4}
                    disabled={!r.finalista}
                    onChange={(e) => mudarCampo(serie.id, r.id, "tentativa4", e.target.value)}
                    style={{
                      ...inputTabela,
                      opacity: r.finalista ? 1 : 0.35,
                    }}
                  />
                </td>

                <td>
                  <input
                    value={r.tentativa5}
                    disabled={!r.finalista}
                    onChange={(e) => mudarCampo(serie.id, r.id, "tentativa5", e.target.value)}
                    style={{
                      ...inputTabela,
                      opacity: r.finalista ? 1 : 0.35,
                    }}
                  />
                </td>

                <td>
                  <input
                    value={r.classificacao_parcial_final || ""}
                    onChange={(e) =>
                      mudarCampo(serie.id, r.id, "classificacao_parcial_final", e.target.value)
                    }
                    style={inputTabela}
                  />
                </td>

                <td>
                  <input
                    value={r.tentativa6}
                    disabled={!r.finalista}
                    onChange={(e) => mudarCampo(serie.id, r.id, "tentativa6", e.target.value)}
                    style={{
                      ...inputTabela,
                      opacity: r.finalista ? 1 : 0.35,
                    }}
                  />
                </td>

                <td>
                  <input
                    value={r.melhor_marca || melhorDasTentativas(r)}
                    onChange={(e) => mudarCampo(serie.id, r.id, "melhor_marca", e.target.value)}
                    style={inputTabela}
                  />
                </td>

                <td>
                  <input
                    value={r.colocacao}
                    onChange={(e) => mudarCampo(serie.id, r.id, "colocacao", e.target.value)}
                    style={inputTabela}
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
  );
}
