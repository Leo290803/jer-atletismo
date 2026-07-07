import { getNumeroAtleta } from "../../../utils/getNumeroAtleta";
import { marcaParaNumero, tempoParaNumero } from "../utils/formatadores";
import { useState } from "react";

// Celula do numero do atleta que vira editavel ao clicar. Salva ao sair (blur)
// ou Enter. Se onEditarNumero nao for passado, mostra so o texto (ex.: impressao).
function CelulaNumeroEditavel({ atleta, onEditarNumero }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");

  const numeroAtual = getNumeroAtleta(atleta);
  const atletaId = atleta?.id;

  if (!onEditarNumero || !atletaId) {
    return <td>{numeroAtual}</td>;
  }

  function iniciar() {
    setValor(numeroAtual === "-" ? "" : numeroAtual);
    setEditando(true);
  }

  function confirmar() {
    setEditando(false);
    const novo = String(valor).trim();
    if (novo !== "" && novo !== (numeroAtual === "-" ? "" : numeroAtual)) {
      onEditarNumero(atletaId, novo);
    }
  }

  if (editando) {
    return (
      <td>
        <input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmar();
            if (e.key === "Escape") setEditando(false);
          }}
          style={{ width: 56, padding: "4px 6px", borderRadius: 6, border: "1px solid #2563eb", textAlign: "center" }}
        />
      </td>
    );
  }

  return (
    <td
      onClick={iniciar}
      title="Clique para corrigir o número"
      style={{ cursor: "pointer" }}
    >
      {numeroAtual}
      <span className="nao-imprimir" style={{ color: "#94a3b8", fontSize: 10, marginLeft: 4 }}>✎</span>
    </td>
  );
}

export function TabelaRevezamento({ serie, mudarCampo, inputTabela, titulares = 4 }) {
  function chaveEscola(raia) {
    const atleta = raia.inscricoes?.atletas;
    const escola = atleta?.escolas?.nome || "SEM ESCOLA";
    const municipio = atleta?.municipio || "";
    return municipio ? `${escola} - ${municipio}` : escola;
  }

  const gruposPorEscola = {};

  [...(serie.raias || [])]
    .sort((a, b) => (a.raia || 0) - (b.raia || 0) || (a.ordem || 0) - (b.ordem || 0))
    .forEach((raia) => {
      const escola = chaveEscola(raia);

      if (!gruposPorEscola[escola]) {
        gruposPorEscola[escola] = [];
      }

      gruposPorEscola[escola].push(raia);
    });

  const grupos = Object.entries(gruposPorEscola).map(([escola, raias]) => {
    const ordenadas = [...raias].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const titularesEquipe = ordenadas.filter((r) => !r.reserva);
    const reservasEquipe = ordenadas.filter((r) => r.reserva);

    return {
      escola,
      // Representante da equipe = atleta de menor ordem (ancora do tempo/colocacao).
      representante: ordenadas[0],
      linhas: [
        ...titularesEquipe.map((r) => ({ raia: r, reserva: false })),
        ...reservasEquipe.map((r) => ({ raia: r, reserva: true })),
      ],
    };
  });

  return (
    <table width="100%" cellPadding="10">
      <caption style={{ captionSide: "top", textAlign: "left", fontSize: 12, opacity: 0.7, paddingBottom: 6 }}>
        Titulares por equipe: {titulares}. Marque os atletas excedentes como reserva.
      </caption>

      <thead>
        <tr>
          <th>Nº</th>
          <th>Nome</th>
          <th>Escola</th>
          <th>Tempo</th>
          <th>Raia</th>
          <th>Classificação</th>
          <th className="nao-imprimir">Reserva</th>
        </tr>
      </thead>

      <tbody>
        {grupos.map((grupo, grupoIndex) => {
          const representante = grupo.representante;
          const quantidadeLinhas = Math.max(grupo.linhas.length, 1);

          return grupo.linhas.map((linha, index) => {
            const r = linha.raia;
            const atleta = r?.inscricoes?.atletas;
            const chaveLinha = r?.id || `${grupo.escola}-${grupoIndex}-${index}`;

            return (
              <tr
                key={chaveLinha}
                style={linha.reserva ? { fontStyle: "italic", opacity: 0.85 } : undefined}
              >
                <td>{getNumeroAtleta(atleta)}</td>
                <td>
                  {atleta?.nome || ""}
                  {linha.reserva ? " (reserva)" : ""}
                </td>

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
                  <td rowSpan={quantidadeLinhas} style={{ textAlign: "center" }}>
                    <input
                      value={representante?.raia ?? ""}
                      onChange={(e) =>
                        mudarCampo(serie.id, representante.id, "raia", e.target.value)
                      }
                      placeholder=""
                      style={inputTabela}
                    />
                  </td>
                )}

                {index === 0 && (
                  <td rowSpan={quantidadeLinhas} style={{ textAlign: "center" }}>
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

                <td className="nao-imprimir" style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={!!r?.reserva}
                    onChange={(e) => mudarCampo(serie.id, r.id, "reserva", e.target.checked)}
                  />
                </td>
              </tr>
            );
          });
        })}
      </tbody>
    </table>
  );
}

export function TabelaPista({ serie, mudarCampo, inputTabela, formatarNascimento, fase, modoImpressao = false, onRemover, onEditarNumero }) {
  // Coluna "Q" nunca aparece na impressao da sumula (o arbitro preenche em
  // branco; qualificacao so e definida depois, ao gerar a proxima fase).
  // Na tela de edicao, aparece apenas em fase classificatoria.
  const faseNormalizada = String(fase || "QUALIFICACAO").toUpperCase();
  const mostrarColunaQ = !modoImpressao && !["FINAL", "FINAL POR TEMPO"].includes(faseNormalizada);

  return (
    <table className="tabela-pista-oficial" width="100%" cellPadding="10">
      <colgroup>
        <col className="pista-col-raia" />
        <col className="pista-col-numero" />
        <col className="pista-col-atleta" />
        <col className="pista-col-escola" />
        <col className="pista-col-nascimento" />
        <col className="pista-col-tempo" />
        <col className="pista-col-colocacao" />
        {mostrarColunaQ && <col className="pista-col-q" />}
        <col className="nao-imprimir" />
        {onRemover && <col className="nao-imprimir" />}
      </colgroup>
      <thead>
        <tr>
          <th>Raia</th>
          <th>Nº</th>
          <th>Atleta</th>
          <th>Escola</th>
          <th>Nascimento</th>
          <th>Tempo</th>
          <th>Col.</th>
          {mostrarColunaQ && <th>Q</th>}
          <th className="nao-imprimir">Status</th>
          {onRemover && <th className="nao-imprimir">Ações</th>}
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
                <CelulaNumeroEditavel atleta={atleta} onEditarNumero={onEditarNumero} />
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

                {mostrarColunaQ && (
                  <td style={{ fontWeight: "bold", textAlign: "center" }}>
                    {r.qualificacao || ""}
                  </td>
                )}

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

                {onRemover && (
                  <td className="nao-imprimir" style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => onRemover({ raia: r, serie })}
                      title="Remover atleta da série (desistência)"
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Remover
                    </button>
                  </td>
                )}
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
  fase,
  modoImpressao = false,
  onRemover,
  onEditarNumero,
}) {
  const faseNormalizada = String(fase || "QUALIFICACAO").toUpperCase();
  const mostrarColunaQ = !modoImpressao && !["FINAL", "FINAL POR TEMPO"].includes(faseNormalizada);

  return (
    <table className="tabela-campo-oficial" width="100%" cellPadding="10">
      <colgroup>
        <col className="campo-col-numero" />
        <col className="campo-col-atleta" />
        <col className="campo-col-escola" />
        <col className="campo-col-nascimento" />
        <col className="campo-col-tentativa" />
        <col className="campo-col-tentativa" />
        <col className="campo-col-tentativa" />
        <col className="campo-col-parcial" />
        <col className="campo-col-classificacao" />
        <col className="campo-col-tentativa" />
        <col className="campo-col-tentativa" />
        <col className="campo-col-classificacao-parcial" />
        <col className="campo-col-tentativa" />
        <col className="campo-col-resultado" />
        <col className="campo-col-colocacao" />
        {mostrarColunaQ && <col className="campo-col-q" />}
        {onRemover && <col className="nao-imprimir" />}
      </colgroup>
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
          <th>Class. Parc.</th>
          <th>6ª</th>
          <th>Resultado</th>
          <th>Col.</th>
          {mostrarColunaQ && <th>Q</th>}
          {onRemover && <th className="nao-imprimir">Ações</th>}
        </tr>
      </thead>

      <tbody>
        {serie.raias
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
          .map((r) => {
            const atleta = r.inscricoes?.atletas;

            return (
              <tr key={r.id}>
                <CelulaNumeroEditavel atleta={atleta} onEditarNumero={onEditarNumero} />
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

                {mostrarColunaQ && (
                  <td style={{ fontWeight: "bold", textAlign: "center" }}>
                    {r.qualificacao || ""}
                  </td>
                )}

                {onRemover && (
                  <td className="nao-imprimir" style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => onRemover({ raia: r, serie })}
                      title="Remover atleta da série (desistência)"
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Remover
                    </button>
                  </td>
                )}
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

function mapaClassificacaoPorTempo(linhas, pegarNumero) {
  const ordenadas = [...linhas]
    .map((raia) => ({ raiaId: raia.id, numero: pegarNumero(raia) }))
    .filter((item) => Number.isFinite(item.numero))
    .sort((a, b) => a.numero - b.numero);

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

function montarResumoCombinada(serie, subprovas, alteracaoAtual = null) {
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

  return { resumo, colocacaoPorRaia };
}

function recalcularTotaisEClassificacaoCombinada({ serie, subprovas, mudarCampo, alteracaoAtual = null }) {
  const { resumo, colocacaoPorRaia } = montarResumoCombinada(serie, subprovas, alteracaoAtual);

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
  const classificacaoSubprova = !ehCampoTentativas
    ? subprova?.tipo === "corrida"
      ? mapaClassificacaoPorTempo(linhas, (raia) => {
          const valor = raia["tentativa" + subprova.ordem] || "";
          const numero = tempoParaNumero(valor);
          return Number.isFinite(numero) && numero < 999999 ? numero : null;
        })
      : mapaClassificacaoPorMarca(linhas, (raia) => {
          const valor = raia["tentativa" + subprova.ordem] || "";
          return marcaParaNumero(valor);
        })
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
              <th>Classificacao</th>
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
                  <td>{classificacaoSubprova.get(raia.id) || ""}</td>
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
  const { resumo, colocacaoPorRaia } = montarResumoCombinada(serie, subprovas);
  const resumoPorRaia = new Map(resumo.map((item) => [item.raia.id, item]));

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
            const itemResumo = resumoPorRaia.get(raia.id);
            const totalPontos =
              raia.resultado_final ||
              (itemResumo?.completo ? String(itemResumo.total) : "") ||
              "";
            const colocacaoAutomatica = itemResumo?.semClassificacao
              ? raia.status || ""
              : colocacaoPorRaia.get(raia.id) || "";

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
                    value={raia.colocacao || colocacaoAutomatica}
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