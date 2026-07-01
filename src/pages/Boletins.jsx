import { useState } from "react";
import { supabase } from "../lib/supabase";
import { getNumeroAtleta } from "../utils/getNumeroAtleta";

export default function Boletins() {
  const hoje = new Date().toISOString().slice(0, 10);

  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  const [resultados, setResultados] = useState([]);
  const [mensagem, setMensagem] = useState("");

  async function carregarBoletim() {
    setMensagem("Carregando boletim do período...");

    const { data, error } = await supabase
      .from("resultados")
      .select(`
        *,
        series (
          numero_serie
        ),
        provas (
          nome,
          categoria,
          naipe,
          fase,
          tipo,
          subtipo
        ),
        inscricoes (
          atletas (
            numero,
            numero_competicao,
            nome,
            municipio,
            escolas (
              nome
            )
          )
        )
      `)
      .gte("data_resultado", dataInicio)
      .lte("data_resultado", dataFim)
      .eq("publicado", true)
      .order("data_resultado", { ascending: true })
      .order("colocacao", { ascending: true });

    if (error) {
      setMensagem("Erro ao carregar boletim: " + error.message);
      return;
    }

    setResultados(data || []);

    if (!data || data.length === 0) {
      setMensagem("Nenhum resultado publicado encontrado nesse período.");
    } else {
      setMensagem(`Boletim carregado com ${data.length} resultado(s) publicado(s).`);
    }
  }

  async function publicarTudoDoPeriodo() {
    const confirmar = window.confirm(
      `Deseja publicar todos os resultados de ${dataInicio} até ${dataFim}?`
    );

    if (!confirmar) return;

    setMensagem("Publicando todos os resultados do período...");

    const { error } = await supabase
      .from("resultados")
      .update({ publicado: true })
      .gte("data_resultado", dataInicio)
      .lte("data_resultado", dataFim);

    if (error) {
      setMensagem("Erro ao publicar tudo: " + error.message);
      return;
    }

    setMensagem("Todos os resultados do período foram publicados.");
    carregarBoletim();
  }

  async function despublicarTudoDoPeriodo() {
    const confirmar = window.confirm(
      `Deseja DESPUBLICAR todos os resultados de ${dataInicio} até ${dataFim}? Eles sairão do boletim, mas não serão apagados.`
    );

    if (!confirmar) return;

    setMensagem("Despublicando resultados do período...");

    const { error } = await supabase
      .from("resultados")
      .update({ publicado: false })
      .gte("data_resultado", dataInicio)
      .lte("data_resultado", dataFim);

    if (error) {
      setMensagem("Erro ao despublicar: " + error.message);
      return;
    }

    setResultados([]);
    setMensagem("Resultados despublicados com sucesso.");
  }

  async function excluirResultadosDoPeriodo() {
    const confirmacao = window.prompt(
      `ATENÇÃO: isso vai EXCLUIR os resultados de ${dataInicio} até ${dataFim}. Digite EXCLUIR para confirmar.`
    );

    if (confirmacao !== "EXCLUIR") {
      setMensagem("Exclusão cancelada.");
      return;
    }

    setMensagem("Excluindo resultados do período...");

    const { error } = await supabase
      .from("resultados")
      .delete()
      .gte("data_resultado", dataInicio)
      .lte("data_resultado", dataFim);

    if (error) {
      setMensagem("Erro ao excluir: " + error.message);
      return;
    }

    setResultados([]);
    setMensagem("Resultados excluídos com sucesso.");
  }

  function resultadoFinal(r) {
    return r.tempo || r.melhor_marca || r.resultado_final || r.marca || "-";
  }

  function medalha(pos) {
    if (pos === 1) return "OURO";
    if (pos === 2) return "PRATA";
    if (pos === 3) return "BRONZE";
    return "";
  }

  function ehFinalDaProva(fase) {
    return ["FINAL", "FINAL POR TEMPO"].includes(fase || "");
  }

  function formatarData(data) {
    if (!data) return "";
    const [ano, mes, dia] = String(data).split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function agruparPorProva(lista) {
    const grupos = {};

    lista.forEach((r) => {
      const p = r.provas;

      const chave = `${r.data_resultado} | ${p?.nome} | ${p?.categoria} | ${p?.naipe} | ${
        p?.fase || "QUALIFICAÇÃO"
      }`;

      if (!grupos[chave]) {
        grupos[chave] = {
          data: r.data_resultado,
          prova: p,
          resultados: [],
        };
      }

      grupos[chave].resultados.push(r);
    });

    return Object.values(grupos).sort((a, b) => {
      if (a.data !== b.data) {
        return String(a.data).localeCompare(String(b.data));
      }

      return String(a.prova?.nome || "").localeCompare(
        String(b.prova?.nome || "")
      );
    });
  }

  function agruparPorSerie(lista) {
    const grupos = {};

    lista.forEach((r) => {
      const numeroSerie = r.series?.numero_serie || 1;
      const chave = `Série ${numeroSerie}`;

      if (!grupos[chave]) {
        grupos[chave] = {
          numeroSerie,
          resultados: [],
        };
      }

      grupos[chave].resultados.push(r);
    });

    return Object.values(grupos).sort(
      (a, b) => Number(a.numeroSerie) - Number(b.numeroSerie)
    );
  }

  function ordenarResultados(lista, final) {
    return [...lista].sort((a, b) => {
      if (final) {
        const ca = a.colocacao || 9999;
        const cb = b.colocacao || 9999;
        return ca - cb;
      }

      const sa = a.series?.numero_serie || 1;
      const sb = b.series?.numero_serie || 1;

      if (sa !== sb) return sa - sb;

      const ca = a.colocacao || 9999;
      const cb = b.colocacao || 9999;

      return ca - cb;
    });
  }

  function gerarWord() {
    const estilos = `
      body { font-family: Arial, sans-serif; color: #111827; }
      h1, h2, h3, h4 { margin: 0 0 10px; }
      p { margin: 0 0 10px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th, td { border: 1px solid #111827; padding: 8px; }
      th { background: #f3f4f6; }
      .cabecalho { margin-bottom: 20px; }
      .secao { margin-top: 20px; }
    `;

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <title>Boletim Oficial de Resultados</title>
          <style>${estilos}</style>
        </head>
        <body>
          <div class="cabecalho">
            <h1>JOGOS ESCOLARES DE RORAIMA - JER 2026</h1>
            <h2>BOLETIM OFICIAL DE RESULTADOS</h2>
            <p><strong>Modalidade:</strong> Atletismo</p>
            <p><strong>Período:</strong> ${formatarData(dataInicio)} até ${formatarData(dataFim)}</p>
            <p><strong>Total de provas com resultado publicado:</strong> ${grupos.length}</p>
            <p><strong>Total de registros publicados:</strong> ${resultados.length}</p>
          </div>

          ${grupos
            .map((grupo) => {
              const fase = grupo.prova?.fase || "QUALIFICAÇÃO";
              const final = ehFinalDaProva(fase);
              const resultadosOrdenados = ordenarResultados(grupo.resultados, final);
              const seriesDaProva = agruparPorSerie(resultadosOrdenados);

              return `
                <div class="secao">
                  <h3>${formatarData(grupo.data)} — ${grupo.prova?.nome} - ${grupo.prova?.categoria} - ${grupo.prova?.naipe} - ${fase}</h3>
                  ${final ? `
                    <h4>Medalhistas</h4>
                    ${gerarTabelaResultados(resultadosOrdenados)}
                  ` : `
                    <h4>Resultados por Série</h4>
                    ${seriesDaProva
                      .map(
                        (serie) => `
                          <div style="margin-bottom: 16px;">
                            <h4>Série ${serie.numeroSerie}</h4>
                            ${gerarTabelaResultados(serie.resultados)}
                          </div>
                        `
                      )
                      .join("")}
                  `}
                </div>
              `;
            })
            .join("")}
        </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", html], {
      type: "application/msword",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Boletim-${dataInicio}-a-${dataFim}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function gerarTabelaResultados(resultadosTabela) {
    const temStatusDiferenteOk = resultadosTabela.some(
      (r) => r.status && r.status !== "OK"
    );

    const temQualificacao = resultadosTabela.some((r) => r.qualificacao);

    return `
      <table>
        <thead>
          <tr>
            <th>Colocação</th>
            <th>Nº</th>
            <th>Atleta</th>
            <th>Escola</th>
            <th>Município</th>
            <th>Resultado</th>
            ${temStatusDiferenteOk ? "<th>Status</th>" : ""}
            ${temQualificacao ? "<th>Class.</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${resultadosTabela
            .map((r, i) => {
              const atleta = r.inscricoes?.atletas;
              return `
                <tr>
                  <td>${r.colocacao ? `${r.colocacao}º` : `${i + 1}º`}</td>
                  <td>${getNumeroAtleta(atleta)}</td>
                  <td>${atleta?.nome || ""}</td>
                  <td>${atleta?.escolas?.nome || ""}</td>
                  <td>${atleta?.municipio || ""}</td>
                  <td>${resultadoFinal(r)}</td>
                  ${temStatusDiferenteOk ? `<td>${r.status && r.status !== "OK" ? r.status : ""}</td>` : ""}
                  ${temQualificacao ? `<td>${r.qualificacao || ""}</td>` : ""}
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  function imprimir() {
    window.print();
  }

  const grupos = agruparPorProva(resultados);

  return (
    <div className="boletim-pagina">
      <style>
        {`
          .boletim-pagina {
            max-width: 1120px;
            margin: 0 auto;
            padding: 20px 18px 40px;
            color: #0f172a;
            font-family: Inter, system-ui, sans-serif;
          }

          .boletim-pagina .card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
          }

          .cabecalho-boletim {
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            padding: 22px 24px;
            margin-bottom: 28px;
            background: #ffffff;
          }

          .cabecalho-logos {
            display: grid;
            grid-template-columns: 1fr minmax(320px, 2.7fr) 1fr;
            align-items: center;
            gap: 12px;
            margin-bottom: 18px;
          }

          .cabecalho-logos img {
            width: auto;
            height: 66px;
            object-fit: contain;
          }

          .boletim-titulo {
            text-align: center;
          }

          .boletim-titulo h2,
          .boletim-titulo h3 {
            margin: 0;
          }

          .boletim-titulo h2 {
            font-size: 22px;
            letter-spacing: 0.02em;
            line-height: 1.2;
          }

          .boletim-titulo h3 {
            margin-top: 6px;
            font-size: 16px;
            color: #334155;
          }

          .boletim-titulo {
            text-align: center;
            margin: 0 auto;
            max-width: 640px;
          }

          .boletim-titulo h2 {
            margin: 0;
            font-size: 24px;
            letter-spacing: 0.04em;
          }

          .boletim-titulo h3 {
            margin: 10px 0 0;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.03em;
          }

          .linha-rodape {
            display: flex;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 14px;
            color: #475569;
            font-size: 14px;
          }

          .linha-rodape span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          .boletim-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 14px;
            background: white;
          }

          .boletim-table th,
          .boletim-table td {
            border: 1px solid #cbd5e1;
            padding: 12px 10px;
            text-align: left;
          }

          .boletim-table th {
            background: #f1f5f9;
            color: #0f172a;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 13px;
            letter-spacing: 0.04em;
          }

          .boletim-table tbody tr:nth-child(even) {
            background: #f8fafc;
          }

          .subtitulo {
            margin: 28px 0 12px;
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
          }

          .resumo-titulo {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 20px;
            font-weight: 700;
          }

          .boletim-table th:first-child,
          .boletim-table td:first-child {
            width: 120px;
          }

          @media print {
            .sidebar,
            .topbar,
            .nao-imprimir {
              display: none !important;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
            }

            .content {
              padding: 0 !important;
              margin: 0 !important;
            }

            .card {
              box-shadow: none !important;
              border: none !important;
            }

            .boletim-pagina {
              margin: 0;
              padding: 0;
            }

            .boletim-table {
              font-size: 10.5px !important;
            }

            .boletim-table th,
            .boletim-table td {
              border: 1px solid black !important;
              padding: 6px !important;
              color: black !important;
            }

            .boletim-table th {
              background: #e2e8f0 !important;
            }

            .quebra-pagina {
              page-break-after: always;
            }

            .evitar-quebra {
              page-break-inside: avoid;
            }

            .cabecalho-boletim {
              border-color: black !important;
              padding: 18px !important;
            }

            .cabecalho-logos img {
              height: 54px !important;
            }
          }
        `}
      </style>

      <div className="nao-imprimir">
        <h1>Boletins</h1>

        <p className="muted">
          Gere, publique, despublique ou exclua resultados do boletim por período.
        </p>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div>
              <label>Data inSSicial</label>

              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={inputData}
              />
            </div>

            <div>
              <label>Data final</label>

              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={inputData}
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button onClick={carregarBoletim} style={botaoVerde}>
              Gerar Boletim
            </button>

            <button onClick={publicarTudoDoPeriodo} style={botaoAmarelo}>
              Publicar Tudo
            </button>

            <button onClick={despublicarTudoDoPeriodo} style={botaoCinza}>
              Despublicar Tudo
            </button>

            <button onClick={excluirResultadosDoPeriodo} style={botaoVermelho}>
              Excluir Resultados
            </button>

            <button
              onClick={imprimir}
              disabled={resultados.length === 0}
              style={botaoAzul}
            >
              Imprimir
            </button>

            <button
              onClick={gerarWord}
              disabled={resultados.length === 0}
              style={{
                ...botaoBase,
                background: "#2563eb",
                color: "white",
              }}
            >
              Exportar em Word
            </button>
          </div>

          {mensagem && <p>{mensagem}</p>}
        </div>
      </div>

      {resultados.length > 0 && (
        <div className="card">
          <div className="cabecalho-boletim">
            <div className="cabecalho-logos">
              <img src="/logo-jer.png" alt="Jogos Escolares" />
              <div className="boletim-titulo">
                <h2>JOGOS ESCOLARES DE RORAIMA - JER 2026</h2>
                <h3>BOLETIM OFICIAL DE RESULTADOS</h3>
              </div>
              <img src="/logo-idjuv.png" alt="IDJUV" />
            </div>

            <div className="linha-rodape">
              <span>
                <strong>Modalidade:</strong> Atletismo
              </span>
              <span>•</span>
              <span>
                <strong>Período:</strong> {formatarData(dataInicio)} até {formatarData(dataFim)}
              </span>
            </div>
          </div>

          <h3 className="resumo-titulo">Resumo do Período</h3>

          <table className="boletim-table boletim-resumo" width="100%" cellPadding="10">
            <thead>
              <tr>
                <th>Total de provas com resultado publicado</th>
                <th>Total de registros publicados</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>{grupos.length}</td>
                <td>{resultados.length}</td>
              </tr>
            </tbody>
          </table>

          {grupos.map((grupo, index) => {
            const fase = grupo.prova?.fase || "QUALIFICAÇÃO";
            const final = ehFinalDaProva(fase);
            const resultadosOrdenados = ordenarResultados(grupo.resultados, final);
            const seriesDaProva = agruparPorSerie(resultadosOrdenados);

            return (
              <div key={index} className="quebra-pagina">
                <h3 className="subtitulo">
                  {formatarData(grupo.data)} — {grupo.prova?.nome} - {grupo.prova?.categoria} - {grupo.prova?.naipe} - {fase}
                </h3>

                {final && (
                  <>
                    <h4>Medalhistas</h4>

                    <table className="boletim-table" width="100%" cellPadding="10">
                      <thead>
                        <tr>
                          <th>Medalha</th>
                          <th>Colocação</th>
                          <th>Nº</th>
                          <th>Atleta</th>
                          <th>Escola</th>
                          <th>Município</th>
                          <th>Resultado</th>
                        </tr>
                      </thead>

                      <tbody>
                        {resultadosOrdenados
                          .filter((r) => r.colocacao >= 1 && r.colocacao <= 3)
                          .map((r) => {
                            const atleta = r.inscricoes?.atletas;

                            return (
                              <tr key={r.id}>
                                <td>{medalha(r.colocacao)}</td>
                                <td>{r.colocacao}º</td>
                                <td>{getNumeroAtleta(atleta)}</td>
                                <td>{atleta?.nome}</td>
                                <td>{atleta?.escolas?.nome}</td>
                                <td>{atleta?.municipio}</td>
                                <td>{resultadoFinal(r)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </>
                )}

                {final ? (
                  <>
                    <h4>Classificação Geral</h4>

                    <TabelaResultados
                      resultados={resultadosOrdenados}
                      resultadoFinal={resultadoFinal}
                    />
                  </>
                ) : (
                  <>
                    <h4>Resultados por Série</h4>

                    {seriesDaProva.map((serie) => (
                      <div
                        key={serie.numeroSerie}
                        className="evitar-quebra"
                        style={{ marginTop: 18 }}
                      >
                        <h4>Série {serie.numeroSerie}</h4>

                        <TabelaResultados
                          resultados={serie.resultados}
                          resultadoFinal={resultadoFinal}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabelaResultados({ resultados, resultadoFinal }) {
  const temStatusDiferenteOk = resultados.some(
    (r) => r.status && r.status !== "OK"
  );

  const temQualificacao = resultados.some((r) => r.qualificacao);

  return (
<table className="boletim-table" width="100%" cellPadding="10">
      <thead>
        <tr>
          <th>Colocação</th>
          <th>Nº</th>
          <th>Atleta</th>
          <th>Escola</th>
          <th>Município</th>
          <th>Resultado</th>
          {temStatusDiferenteOk && <th>Status</th>}
          {temQualificacao && <th>Class.</th>}
        </tr>
      </thead>

      <tbody>
        {resultados.map((r, i) => {
          const atleta = r.inscricoes?.atletas;

          return (
            <tr key={r.id}>
              <td>{r.colocacao ? `${r.colocacao}º` : `${i + 1}º`}</td>
              <td>{getNumeroAtleta(atleta)}</td>
              <td>{atleta?.nome}</td>
              <td>{atleta?.escolas?.nome}</td>
              <td>{atleta?.municipio}</td>
              <td>{resultadoFinal(r)}</td>

              {temStatusDiferenteOk && (
                <td>{r.status && r.status !== "OK" ? r.status : ""}</td>
              )}

              {temQualificacao && (
                <td style={{ fontWeight: "bold", textAlign: "center" }}>
                  {r.qualificacao || ""}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const botaoBase = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "none",
  color: "#020617",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: 10,
  marginBottom: 10,
};

const botaoVerde = { ...botaoBase, background: "#22c55e" };
const botaoAmarelo = { ...botaoBase, background: "#facc15" };
const botaoAzul = { ...botaoBase, background: "#38bdf8" };
const botaoCinza = { ...botaoBase, background: "#94a3b8" };
const botaoVermelho = { ...botaoBase, background: "#ef4444", color: "white" };

const inputData = {
  display: "block",
  padding: 12,
  marginTop: 8,
  borderRadius: 10,
  width: 220,
};