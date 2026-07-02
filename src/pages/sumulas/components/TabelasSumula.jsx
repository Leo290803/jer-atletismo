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


const TIPO_PONTOS_COMBINADA = "combinada_pontos";
const TIPO_TENTATIVA_COMBINADA = "combinada_tentativa";
const STATUS_SEM_CLASSIFICACAO = new Set(["DQ", "DNS", "ABD", "DNF", "NM"]);

function obterPontosCombinada(raia, ordem) {
  const dados = Array.isArray(raia?.alturas) ? raia.alturas : [];
  const item = dados.find(
    (registro) => registro?.tipo === TIPO_PONTOS_COMBINADA && Number(registro?.ordem) === Number(ordem)
  );

  return item?.pontos || "";
}

function numeroPontos(valor) {
  const numero = Number(String(valor || "").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function numeroMarca(valor) {
  const numero = Number(String(valor || "").replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

function temPontosValidos(valor) {
  const limpo = String(valor || "").trim();
  if (!limpo) return false;

  const numero = Number(limpo.replace(",", "."));
  return Number.isFinite(numero);
}

function labelResultadoSubprova(subprova) {
  return subprova?.tipo === "corrida" ? "Tempo" : "Marca";
}

function formatarDataCombinada(valor) {
  if (!valor) return "Data a definir";

  const [ano, mes, dia] = String(valor).split("-");
  if (!ano || !mes || !dia) return valor;

  return dia + "/" + mes + "/" + ano;
}

function obterTentativaCombinada(raia, ordem, tentativa) {
  const dados = Array.isArray(raia?.alturas) ? raia.alturas : [];
  const item = dados.find(
    (registro) =>
      registro?.tipo === TIPO_TENTATIVA_COMBINADA &&
      Number(registro?.ordem) === Number(ordem) &&
      Number(registro?.tentativa) === Number(tentativa)
  );

  return item?.valor || "";
}

function ordenarLinhasCombinada(serie) {
  return [...(serie.raias || [])].sort((a, b) => (a.ordem || a.raia || 0) - (b.ordem || b.raia || 0));
}

function calcularTotalPontosCombinada(raia, subprovas = [], pontosAlterados = {}) {
  return subprovas.reduce((total, subprova) => {
    const chave = String(subprova.ordem);
    const pontos = Object.prototype.hasOwnProperty.call(pontosAlterados, chave)
      ? pontosAlterados[chave]
      : obterPontosCombinada(raia, subprova.ordem);

    return total + numeroPontos(pontos);
  }, 0);
}

function linhaComPontosCompletos(raia, subprovas = [], alteracaoAtual) {
  return subprovas.every((subprova) => {
    if (
      alteracaoAtual &&
      Number(alteracaoAtual.raiaId) === Number(raia.id) &&
      Number(alteracaoAtual.ordem) === Number(subprova.ordem)
    ) {
      return temPontosValidos(alteracaoAtual.valor);
    }

    return temPontosValidos(obterPontosCombinada(raia, subprova.ordem));
  });
}

function obterMelhorTentativaCombinada(raia, ordem, alteracoes = {}) {
  let melhor = null;

  for (let tentativa = 1; tentativa <= 6; tentativa += 1) {
    const chave = String(tentativa);
    const valor = Object.prototype.hasOwnProperty.call(alteracoes, chave)
      ? alteracoes[chave]
      : obterTentativaCombinada(raia, ordem, tentativa);
    const numero = numeroMarca(valor);

    if (numero === null) continue;

    if (!melhor || numero > melhor.numero) {
      melhor = {
        numero,
        texto: String(valor).trim(),
      };
    }
  }

  return melhor?.texto || "";
}

function obterMelhorTentativaAte(raia, ordem, tentativaLimite) {
  let melhor = null;

  for (let tentativa = 1; tentativa <= tentativaLimite; tentativa += 1) {
    const valor = obterTentativaCombinada(raia, ordem, tentativa);
    const numero = numeroMarca(valor);

    if (numero === null) continue;

    if (!melhor || numero > melhor.numero) {
      melhor = {
        numero,
        texto: String(valor).trim(),
      };
    }
  }

  return melhor;
}

function mapaClassificacaoPorMarca(linhas, pegarNumero) {
  const ordenadas = [...linhas]
    .map((raia) => ({ raiaId: raia.id, numero: pegarNumero(raia) }))
    .filter((item) => Number.isFinite(item.numero))
    .sort((a, b) => b.numero - a.numero);

  const mapa = new Map();
  let posicaoAtual = 0;
  let ultimoNumero = null;

  ordenadas.forEach((item, indice) => {
    if (ultimoNumero === null || item.numero !== ultimoNumero) {
      posicaoAtual = indice + 1;
      ultimoNumero = item.numero;
    }

    mapa.set(item.raiaId, String(posicaoAtual) + "º");
  });

  return mapa;
}

function recalcularTotaisEClassificacaoCombinada({ serie, subprovas, mudarCampo, alteracaoAtual = null }) {
  const linhas = ordenarLinhasCombinada(serie);

  const resumo = linhas.map((raia) => {
    const pontosAlterados =
      alteracaoAtual &&
      Number(alteracaoAtual.raiaId) === Number(raia.id) &&
      Number(alteracaoAtual.ordem) > 0
        ? { [String(alteracaoAtual.ordem)]: alteracaoAtual.valor }
        : {};

    const completo = linhaComPontosCompletos(raia, subprovas, alteracaoAtual);
    const total = completo ? calcularTotalPontosCombinada(raia, subprovas, pontosAlterados) : 0;
    const statusAlterado =
      alteracaoAtual && Number(alteracaoAtual.raiaId) === Number(raia.id)
        ? alteracaoAtual.status
        : null;
    const status = String(statusAlterado || raia.status || "OK").toUpperCase();
    const semClassificacao = STATUS_SEM_CLASSIFICACAO.has(status);

    return {
      raia,
      total,
      completo,
      semClassificacao,
    };
  });

  const classificados = resumo
    .filter((item) => item.completo && !item.semClassificacao)
    .sort((a, b) => b.total - a.total);

  const colocacaoPorRaia = new Map();
  let posicaoAtual = 0;
  let ultimaPontuacao = null;

  classificados.forEach((item, indice) => {
    if (ultimaPontuacao === null || item.total !== ultimaPontuacao) {
      posicaoAtual = indice + 1;
      ultimaPontuacao = item.total;
    }

    colocacaoPorRaia.set(item.raia.id, String(posicaoAtual) + "º");
  });

  resumo.forEach((item) => {
    const totalTexto = item.completo ? String(item.total) : "";
    const colocacaoTexto = item.semClassificacao
      ? item.raia.status || ""
      : colocacaoPorRaia.get(item.raia.id) || "";

    mudarCampo(serie.id, item.raia.id, "resultado_final", totalTexto);
    mudarCampo(serie.id, item.raia.id, "colocacao", colocacaoTexto);
  });
}

function atualizarPontosCombinada({ serie, raia, ordem, valor, subprovas, mudarCampo }) {
  const dadosAtuais = Array.isArray(raia.alturas) ? raia.alturas : [];
  const outrosDados = dadosAtuais.filter(
    (registro) =>
      !(registro?.tipo === TIPO_PONTOS_COMBINADA && Number(registro?.ordem) === Number(ordem))
  );
  const valorLimpo = String(valor || "").trim();
  const novosDados = valorLimpo
    ? [...outrosDados, { tipo: TIPO_PONTOS_COMBINADA, ordem, pontos: valorLimpo }]
    : outrosDados;

  mudarCampo(serie.id, raia.id, "alturas", novosDados);

  recalcularTotaisEClassificacaoCombinada({
    serie,
    subprovas,
    mudarCampo,
    alteracaoAtual: {
      raiaId: raia.id,
      ordem,
      valor: valorLimpo,
      status: null,
    },
  });
}

function atualizarTentativaCombinada({
  serie,
  raia,
  ordem,
  tentativa,
  valor,
  mudarCampo,
}) {
  const dadosAtuais = Array.isArray(raia.alturas) ? raia.alturas : [];
  const outrosDados = dadosAtuais.filter(
    (registro) =>
      !(
        registro?.tipo === TIPO_TENTATIVA_COMBINADA &&
        Number(registro?.ordem) === Number(ordem) &&
        Number(registro?.tentativa) === Number(tentativa)
      )
  );
  const valorLimpo = String(valor || "").trim();
  const novosDados = valorLimpo
    ? [...outrosDados, { tipo: TIPO_TENTATIVA_COMBINADA, ordem, tentativa, valor: valorLimpo }]
    : outrosDados;

  const melhor = obterMelhorTentativaCombinada(raia, ordem, {
    [String(tentativa)]: valorLimpo,
  });

  mudarCampo(serie.id, raia.id, "alturas", novosDados);
  mudarCampo(serie.id, raia.id, "tentativa" + ordem, melhor);
}

export function TabelaCombinadaProva({
  serie,
  subprova,
  subprovas,
  dataSubprova,
  mudarCampo,
  inputTabela,
  formatarNascimento,
}) {
  const linhas = ordenarLinhasCombinada(serie);
  const ehCampoTentativas = subprova?.subtipo === "campo_tentativas";

  const classificacaoParcial3 = ehCampoTentativas
    ? mapaClassificacaoPorMarca(linhas, (raia) => obterMelhorTentativaAte(raia, subprova.ordem, 3)?.numero)
    : new Map();
  const classificacaoParcial5 = ehCampoTentativas
    ? mapaClassificacaoPorMarca(linhas, (raia) => obterMelhorTentativaAte(raia, subprova.ordem, 5)?.numero)
    : new Map();
  const classificacaoFinal6 = ehCampoTentativas
    ? mapaClassificacaoPorMarca(linhas, (raia) => obterMelhorTentativaAte(raia, subprova.ordem, 6)?.numero)
    : new Map();

  return (
    <section className="combinada-dia combinada-prova">
      <div className="combinada-dia-cabecalho">
        <div>
          <strong>
            Dia {subprova.dia} - {subprova.ordem}. {subprova.nome}
            {subprova.implemento ? " - " + subprova.implemento : ""}
          </strong>
          <span>{formatarDataCombinada(dataSubprova)}</span>
        </div>
      </div>

      {ehCampoTentativas ? (
        <table width="100%" cellPadding="8" className="tabela-combinada-dia">
          <thead>
            <tr>
              <th>No</th>
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
              <th>Resultado</th>
              <th>Colocacao</th>
              <th>Q</th>
              <th>Pts</th>
            </tr>
          </thead>

          <tbody>
            {linhas.map((raia) => {
              const atleta = raia.inscricoes?.atletas;
              const parcial3 = obterMelhorTentativaAte(raia, subprova.ordem, 3);
              const parcial5 = obterMelhorTentativaAte(raia, subprova.ordem, 5);
              const final6 = obterMelhorTentativaAte(raia, subprova.ordem, 6);
              const resultadoSubprova = raia["tentativa" + subprova.ordem] || final6?.texto || "";

              return (
                <tr key={raia.id + "-subprova-campo-" + subprova.ordem}>
                  <td>{getNumeroAtleta(atleta)}</td>
                  <td>{atleta?.nome}</td>
                  <td>{atleta?.escolas?.nome}</td>
                  <td>{formatarNascimento(atleta?.data_nascimento)}</td>

                  {[1, 2, 3].map((tentativa) => (
                    <td key={raia.id + "-" + subprova.ordem + "-tentativa-" + tentativa}>
                      <input
                        value={obterTentativaCombinada(raia, subprova.ordem, tentativa)}
                        onChange={(e) =>
                          atualizarTentativaCombinada({
                            serie,
                            raia,
                            ordem: subprova.ordem,
                            tentativa,
                            valor: e.target.value,
                            mudarCampo,
                          })
                        }
                        style={inputTabela}
                      />
                    </td>
                  ))}

                  <td>{parcial3?.texto || ""}</td>
                  <td>{classificacaoParcial3.get(raia.id) || ""}</td>

                  <td>
                    <input
                      value={obterTentativaCombinada(raia, subprova.ordem, 4)}
                      onChange={(e) =>
                        atualizarTentativaCombinada({
                          serie,
                          raia,
                          ordem: subprova.ordem,
                          tentativa: 4,
                          valor: e.target.value,
                          mudarCampo,
                        })
                      }
                      style={inputTabela}
                    />
                  </td>

                  <td>
                    <input
                      value={obterTentativaCombinada(raia, subprova.ordem, 5)}
                      onChange={(e) =>
                        atualizarTentativaCombinada({
                          serie,
                          raia,
                          ordem: subprova.ordem,
                          tentativa: 5,
                          valor: e.target.value,
                          mudarCampo,
                        })
                      }
                      style={inputTabela}
                    />
                  </td>

                  <td>{classificacaoParcial5.get(raia.id) || ""}</td>

                  <td>
                    <input
                      value={obterTentativaCombinada(raia, subprova.ordem, 6)}
                      onChange={(e) =>
                        atualizarTentativaCombinada({
                          serie,
                          raia,
                          ordem: subprova.ordem,
                          tentativa: 6,
                          valor: e.target.value,
                          mudarCampo,
                        })
                      }
                      style={inputTabela}
                    />
                  </td>

                  <td>
                    <input
                      value={resultadoSubprova}
                      onChange={(e) =>
                        mudarCampo(serie.id, raia.id, "tentativa" + subprova.ordem, e.target.value)
                      }
                      style={inputTabela}
                    />
                  </td>

                  <td>{classificacaoFinal6.get(raia.id) || ""}</td>
                  <td>{raia.qualificacao || ""}</td>

                  <td>
                    <input
                      value={obterPontosCombinada(raia, subprova.ordem)}
                      onChange={(e) =>
                        atualizarPontosCombinada({
                          serie,
                          raia,
                          ordem: subprova.ordem,
                          valor: e.target.value,
                          subprovas,
                          mudarCampo,
                        })
                      }
                      style={inputTabela}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <table width="100%" cellPadding="8" className="tabela-combinada-dia">
          <thead>
            <tr>
              <th>No</th>
              <th>Atleta</th>
              <th>Escola</th>
              <th>Nascimento</th>
              <th>{labelResultadoSubprova(subprova)}</th>
              <th>Pts</th>
            </tr>
          </thead>

          <tbody>
            {linhas.map((raia) => {
              const atleta = raia.inscricoes?.atletas;

              return (
                <tr key={raia.id + "-subprova-" + subprova.ordem}>
                  <td>{getNumeroAtleta(atleta)}</td>
                  <td>{atleta?.nome}</td>
                  <td>{atleta?.escolas?.nome}</td>
                  <td>{formatarNascimento(atleta?.data_nascimento)}</td>

                  <td>
                    <input
                      value={raia["tentativa" + subprova.ordem] || ""}
                      onChange={(e) =>
                        mudarCampo(serie.id, raia.id, "tentativa" + subprova.ordem, e.target.value)
                      }
                      style={inputTabela}
                    />
                  </td>
                  <td>
                    <input
                      value={obterPontosCombinada(raia, subprova.ordem)}
                      onChange={(e) =>
                        atualizarPontosCombinada({
                          serie,
                          raia,
                          ordem: subprova.ordem,
                          valor: e.target.value,
                          subprovas,
                          mudarCampo,
                        })
                      }
                      style={inputTabela}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function TabelaCombinadaFinal({
  serie,
  subprovas,
  mudarCampo,
  inputTabela,
  formatarNascimento,
}) {
  const linhas = ordenarLinhasCombinada(serie);

  function mudarStatus(raia, valor) {
    mudarCampo(serie.id, raia.id, "status", valor);

    recalcularTotaisEClassificacaoCombinada({
      serie,
      subprovas,
      mudarCampo,
      alteracaoAtual: {
        raiaId: raia.id,
        ordem: 0,
        valor: "",
        status: valor,
      },
    });
  }

  return (
    <section className="combinada-final">
      <div className="combinada-dia-cabecalho">
        <div>
          <strong>Resultado Final da Combinada</strong>
          <span>Soma dos pontos e classificacao geral</span>
        </div>
      </div>

      <table width="100%" cellPadding="8" className="tabela-combinada-final">
        <thead>
          <tr>
            <th>No</th>
            <th>Atleta</th>
            <th>Escola</th>
            <th>Nascimento</th>
            <th>Total de pontos</th>
            <th>Colocacao</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {linhas.map((raia) => {
            const atleta = raia.inscricoes?.atletas;
            const totalPontos = raia.resultado_final || calcularTotalPontosCombinada(raia, subprovas) || "";

            return (
              <tr key={raia.id + "-final"}>
                <td>{getNumeroAtleta(atleta)}</td>
                <td>{atleta?.nome}</td>
                <td>{atleta?.escolas?.nome}</td>
                <td>{formatarNascimento(atleta?.data_nascimento)}</td>
                <td>
                  <input
                    value={totalPontos}
                    readOnly
                    style={inputTabela}
                  />
                </td>
                <td>
                  <input
                    value={raia.colocacao || ""}
                    readOnly
                    style={inputTabela}
                  />
                </td>
                <td>
                  <select
                    value={raia.status || "OK"}
                    onChange={(e) => mudarStatus(raia, e.target.value)}
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
    </section>
  );
}

export function TabelaCombinada({
  serie,
  combinadaInfo,
  datasCombinada = {},
  mudarCampo,
  inputTabela,
  formatarNascimento,
}) {
  const subprovas = combinadaInfo?.subprovas || [];
  const subprovasOrdenadas = [...subprovas].sort((a, b) => (a?.ordem || 0) - (b?.ordem || 0));
  const dias = [1, 2]
    .map((dia) => ({ dia, subprovas: subprovasOrdenadas.filter((subprova) => subprova.dia === dia) }))
    .filter((grupo) => grupo.subprovas.length > 0);

  return (
    <div className="sumula-combinada-wrap">
      {combinadaInfo && (
        <div className="combinada-resumo">
          <div>
            <strong>{combinadaInfo.nome}</strong>
            <span>
              {combinadaInfo.categoria} - {combinadaInfo.naipe} - {combinadaInfo.totalProvas} provas
            </span>
          </div>

          {dias.map((grupo) => (
            <span key={grupo.dia}>
              Dia {grupo.dia}: {grupo.subprovas.map((p) => p.nome).join(" | ")}
            </span>
          ))}
        </div>
      )}

      {subprovasOrdenadas.map((subprova) => (
        <TabelaCombinadaProva
          key={subprova.ordem}
          serie={serie}
          subprova={subprova}
          subprovas={subprovasOrdenadas}
          dataSubprova={datasCombinada["dia" + subprova.dia]}
          mudarCampo={mudarCampo}
          inputTabela={inputTabela}
          formatarNascimento={formatarNascimento}
        />
      ))}

      <TabelaCombinadaFinal
        serie={serie}
        subprovas={subprovasOrdenadas}
        mudarCampo={mudarCampo}
        inputTabela={inputTabela}
        formatarNascimento={formatarNascimento}
      />
    </div>
  );
}
