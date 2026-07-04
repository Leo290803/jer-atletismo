import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  marginTop: 16,
  padding: 14,
};

const botaoBase = {
  border: "none",
  borderRadius: 10,
  color: "#020617",
  cursor: "pointer",
  fontWeight: "bold",
  marginBottom: 10,
  marginRight: 10,
  padding: "12px 16px",
};

function dataParaTextoPadrao(data) {
  if (!data) return "";
  const [ano, mes, dia] = String(data).split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

function textoPreenchido(valor) {
  return String(valor ?? "").trim();
}

function linhaPossuiAtleta(linha) {
  return Boolean(
    textoPreenchido(linha?.numero) ||
      textoPreenchido(linha?.atleta) ||
      textoPreenchido(linha?.escola) ||
      textoPreenchido(linha?.resultado) ||
      textoPreenchido(linha?.tentativa1) ||
      textoPreenchido(linha?.tentativa2) ||
      textoPreenchido(linha?.tentativa3) ||
      textoPreenchido(linha?.colocacao)
  );
}

function resultadoLinha(linha, tipo) {
  if (tipo === "campo") {
    return (
      textoPreenchido(linha.resultado) ||
      textoPreenchido(linha.tentativa3) ||
      textoPreenchido(linha.tentativa2) ||
      textoPreenchido(linha.tentativa1) ||
      ""
    );
  }

  return textoPreenchido(linha.resultado);
}

function ehFinal(fase) {
  return String(fase || "").toUpperCase().includes("FINAL");
}

function temResultadoOuColocacao(linha) {
  return Boolean(
    textoPreenchido(linha.resultado) ||
      textoPreenchido(linha.colocacao) ||
      textoPreenchido(linha.tentativa1) ||
      textoPreenchido(linha.tentativa2) ||
      textoPreenchido(linha.tentativa3) ||
      String(linha.status || "OK") !== "OK"
  );
}

function ordenarLinhas(linhas, tipo) {
  return [...(linhas || [])].sort((a, b) => {
    const ca = Number(a.colocacao || 9999);
    const cb = Number(b.colocacao || 9999);

    if (ca !== cb) return ca - cb;

    const sa = Number(a.serie || 1);
    const sb = Number(b.serie || 1);
    if (sa !== sb) return sa - sb;

    const ra = Number(a.raia || 9999);
    const rb = Number(b.raia || 9999);
    if (ra !== rb) return ra - rb;

    if (tipo === "campo") {
      return String(a.atleta || "").localeCompare(String(b.atleta || ""));
    }

    return 0;
  });
}

function agruparPorProva(competicao, opcoes) {
  const provas = Array.isArray(competicao?.provas) ? competicao.provas : [];

  return provas
    .map((prova) => {
      const linhasValidas = Array.isArray(prova.linhas)
        ? prova.linhas.filter(linhaPossuiAtleta)
        : [];

      return {
        ...prova,
        linhasValidas,
      };
    })
    .filter((prova) => {
      const temLinha = prova.linhasValidas.length > 0;
      const temResultado = prova.linhasValidas.some(temResultadoOuColocacao);

      if (opcoes.somenteComResultado && !temResultado) return false;
      if (opcoes.somenteFinais && !ehFinal(prova.fase)) return false;

      return temLinha;
    })
    .map((prova) => ({
      ...prova,
      linhasOrdenadas: ordenarLinhas(prova.linhasValidas || [], prova.tipo),
    }));
}

function nomeCompeticao(competicao) {
  return competicao?.nomeEvento || "BOLETIM MANUAL DE RESULTADOS";
}

function formatarColocacao(colocacao) {
  if (!textoPreenchido(colocacao)) return "";
  return `${colocacao}º`;
}

function criarPortalRoot() {
  if (typeof document === "undefined") return null;

  let root = document.getElementById("portal-boletim-manual-root");

  if (!root) {
    root = document.createElement("div");
    root.id = "portal-boletim-manual-root";
    root.className = "portal-boletim-manual-root";
    document.body.appendChild(root);
  }

  return root;
}

export default function BoletimManual({
  modo = "completo",
  competicao,
  numeroBoletim,
  setNumeroBoletim,
  somenteFinais,
  setSomenteFinais,
  somenteComResultado,
  setSomenteComResultado,
  dataParaTexto = dataParaTextoPadrao,
}) {
  const [portalRoot, setPortalRoot] = useState(null);
  const [forcarImpressao, setForcarImpressao] = useState(false);

  useEffect(() => {
    setPortalRoot(criarPortalRoot());

    return () => {
      document.body.classList.remove("imprimindo-boletim-manual");
      document.body.classList.remove("print-boletim-manual");
    };
  }, []);

  const provasBoletim = useMemo(
    () => agruparPorProva(competicao, { somenteFinais, somenteComResultado }),
    [competicao, somenteFinais, somenteComResultado]
  );

  const totalLinhas = provasBoletim.reduce(
    (total, prova) => total + (prova.linhasOrdenadas?.length || 0),
    0
  );

  const mostrarPreview = modo !== "impressao";
  const mostrarImpressaoNormal = modo === "impressao";

  function limparModoImpressao() {
    document.body.classList.remove("imprimindo-boletim-manual");
    document.body.classList.remove("print-boletim-manual");
    setForcarImpressao(false);
    window.removeEventListener("afterprint", limparModoImpressao);
  }

  function imprimirBoletimManual() {
    document.body.classList.remove("print-sumula");
    document.body.classList.remove("modo-sumula-manual");
    document.body.classList.add("imprimindo-boletim-manual");
    document.body.classList.add("print-boletim-manual");

    setForcarImpressao(true);
    window.addEventListener("afterprint", limparModoImpressao);

    window.setTimeout(() => {
      window.print();
    }, 250);
  }

  function renderEstilosBase() {
    return (
      <style>
        {`
          @media screen {
            #portal-boletim-manual-root {
              display: none !important;
            }

            #portal-boletim-manual-root .boletim-manual-print {
              display: none !important;
            }
          }

          @media print {
            body.imprimindo-boletim-manual {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              overflow: visible !important;
            }

            body.imprimindo-boletim-manual > *:not(#portal-boletim-manual-root) {
              display: none !important;
              visibility: hidden !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root,
            body.imprimindo-boletim-manual #portal-boletim-manual-root * {
              visibility: visible !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              min-height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              overflow: visible !important;
              z-index: 999999 !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-print {
              display: block !important;
              visibility: visible !important;
              width: 297mm !important;
              min-height: 210mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, sans-serif !important;
              overflow: visible !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-page {
              display: block !important;
              width: 297mm !important;
              min-height: 210mm !important;
              margin: 0 auto !important;
              padding: 7mm 8mm 9mm !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #000000 !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-header {
              position: relative !important;
              margin: 0 0 7px !important;
              padding: 9px 10px 7px !important;
              border: 2px solid #0057b8 !important;
              background:
                linear-gradient(90deg, rgba(0, 87, 184, 0.08), rgba(0, 132, 61, 0.08)),
                #ffffff !important;
              text-align: center !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-faixa-topo {
              position: absolute !important;
              left: -2px !important;
              right: -2px !important;
              top: -2px !important;
              height: 7px !important;
              background: linear-gradient(
                90deg,
                #0057b8 0%,
                #0057b8 45%,
                #facc15 45%,
                #facc15 60%,
                #00843d 60%,
                #00843d 100%
              ) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-header h1 {
              margin: 8px 0 4px !important;
              color: #0f172a !important;
              font-size: 15px !important;
              font-weight: 900 !important;
              line-height: 1.1 !important;
              text-transform: uppercase !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-header h2 {
              margin: 4px 0 !important;
              color: #0057b8 !important;
              font-size: 18px !important;
              font-weight: 900 !important;
              line-height: 1.05 !important;
              text-transform: uppercase !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-header p {
              margin: 2px 0 !important;
              color: #111827 !important;
              font-size: 8.4px !important;
              font-weight: 700 !important;
              line-height: 1.15 !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-prova {
              margin: 0 0 7px !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-prova-titulo {
              padding: 4px 6px !important;
              border-left: 7px solid #0057b8 !important;
              border-top: 1px solid #111827 !important;
              border-right: 1px solid #111827 !important;
              border-bottom: 1px solid #111827 !important;
              background: linear-gradient(90deg, #eaf2ff, #f7fafc) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-prova-titulo strong {
              display: block !important;
              color: #0f172a !important;
              font-size: 9px !important;
              font-weight: 900 !important;
              line-height: 1.05 !important;
              text-transform: uppercase !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-prova-titulo span {
              display: block !important;
              margin-top: 2px !important;
              color: #111827 !important;
              font-size: 7px !important;
              font-weight: 800 !important;
              line-height: 1.1 !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table {
              display: table !important;
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: fixed !important;
              background: #ffffff !important;
              margin: 0 !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table thead {
              display: table-header-group !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table tbody {
              display: table-row-group !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table tr {
              display: table-row !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table th,
            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table td {
              display: table-cell !important;
              border: 1px solid #111827 !important;
              padding: 2px 4px !important;
              color: #111827 !important;
              font-size: 7.4px !important;
              line-height: 1.08 !important;
              height: 12px !important;
              vertical-align: middle !important;
              word-break: break-word !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table th {
              background: #0057b8 !important;
              color: #ffffff !important;
              font-size: 7px !important;
              font-weight: 900 !important;
              line-height: 1 !important;
              text-transform: uppercase !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table tbody tr:nth-child(even) {
              background: #f8fafc !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table .col-pos {
              width: 10% !important;
              text-align: center !important;
              font-weight: 900 !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table .col-num {
              width: 8% !important;
              text-align: center !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table .col-atleta {
              width: 34% !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table .col-escola {
              width: 34% !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table .col-resultado {
              width: 14% !important;
              text-align: center !important;
              font-weight: 800 !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-table .col-status {
              width: 10% !important;
              text-align: center !important;
              font-weight: 800 !important;
            }

            body.imprimindo-boletim-manual #portal-boletim-manual-root .boletim-manual-vazio {
              margin-top: 20px !important;
              padding: 14px !important;
              border: 1px solid #cbd5e1 !important;
              background: #f8fafc !important;
              color: #475569 !important;
              font-weight: 800 !important;
              text-align: center !important;
            }
          }
        `}
      </style>
    );
  }

  function renderEstilosPaisagemSomenteQuandoImprime() {
    if (!forcarImpressao) return null;

    return (
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 0;
            }
          }
        `}
      </style>
    );
  }

  function renderImpressao() {
    return (
      <div className="boletim-manual-print">
        <section className="boletim-manual-page">
          <header className="boletim-manual-header">
            <div className="boletim-manual-faixa-topo" />

            <h1>{nomeCompeticao(competicao)}</h1>

            <h2>BOLETIM Nº {numeroBoletim || "0001"} - ATLETISMO PARALÍMPICO</h2>

            <p>
              <strong>BOLETIM OFICIAL DE RESULTADOS - SÚMULA MANUAL</strong>
            </p>

            <p>
              <strong>Período:</strong> {dataParaTexto(competicao?.dataInicio)} até{" "}
              {dataParaTexto(competicao?.dataFim)}
            </p>

            {competicao?.local && (
              <p>
                <strong>Local:</strong> {competicao.local}
              </p>
            )}
          </header>

          {provasBoletim.length === 0 ? (
            <p className="boletim-manual-vazio">
              Nenhum resultado disponível para o boletim.
            </p>
          ) : (
            provasBoletim.map((prova) => {
              const temStatus = prova.linhasOrdenadas.some(
                (linha) => linha.status && linha.status !== "OK"
              );

              return (
                <article className="boletim-manual-prova" key={prova.id}>
                  <div className="boletim-manual-prova-titulo">
                    <strong>{prova.prova || "PROVA MANUAL"}</strong>

                    <span>
                      Categoria: {prova.categoria} &nbsp; | &nbsp; Naipe:{" "}
                      {prova.naipe} &nbsp; | &nbsp; Fase: {prova.fase}{" "}
                      &nbsp; | &nbsp; Data: {dataParaTexto(prova.data)}
                    </span>
                  </div>

                  <table className="boletim-manual-table">
                    <thead>
                      <tr>
                        <th className="col-pos">Colocação</th>
                        <th className="col-num">Nº</th>
                        <th className="col-atleta">Atleta</th>
                        <th className="col-escola">Escola</th>
                        <th className="col-resultado">Resultado</th>
                        {temStatus && <th className="col-status">Status</th>}
                      </tr>
                    </thead>

                    <tbody>
                      {prova.linhasOrdenadas.map((linha) => (
                        <tr key={linha.id}>
                          <td className="col-pos">
                            {formatarColocacao(linha.colocacao)}
                          </td>

                          <td className="col-num">{textoPreenchido(linha.numero)}</td>

                          <td className="col-atleta">{textoPreenchido(linha.atleta)}</td>

                          <td className="col-escola">{textoPreenchido(linha.escola)}</td>

                          <td className="col-resultado">
                            {resultadoLinha(linha, prova.tipo)}
                          </td>

                          {temStatus && (
                            <td className="col-status">
                              {linha.status !== "OK" ? linha.status : ""}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              );
            })
          )}
        </section>
      </div>
    );
  }

  return (
    <>
      {renderEstilosBase()}
      {renderEstilosPaisagemSomenteQuandoImprime()}

      {mostrarPreview && (
        <div className="nao-imprimir" style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Boletim manual do evento</h3>
              <p
                style={{
                  color: "#64748b",
                  fontWeight: 700,
                  margin: "4px 0 0",
                }}
              >
                Gera o boletim usando somente as provas e linhas desta competição manual.
              </p>
            </div>

            <span
              style={{
                alignSelf: "start",
                background: "#dbeafe",
                borderRadius: 999,
                color: "#1e3a8a",
                fontWeight: 800,
                padding: "8px 12px",
              }}
            >
              {provasBoletim.length} prova(s) • {totalLinhas} atleta(s)
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              marginTop: 14,
            }}
          >
            <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
              Nº do boletim
              <input
                value={numeroBoletim}
                onChange={(e) => setNumeroBoletim(e.target.value)}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "9px 10px",
                }}
                placeholder="0001"
              />
            </label>

            <label
              style={{
                alignItems: "center",
                display: "flex",
                gap: 8,
                fontWeight: 700,
              }}
            >
              <input
                type="checkbox"
                checked={somenteFinais}
                onChange={(e) => setSomenteFinais(e.target.checked)}
              />
              Somente finais
            </label>

            <label
              style={{
                alignItems: "center",
                display: "flex",
                gap: 8,
                fontWeight: 700,
              }}
            >
              <input
                type="checkbox"
                checked={somenteComResultado}
                onChange={(e) => setSomenteComResultado(e.target.checked)}
              />
              Somente com resultado/colocação
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <button onClick={imprimirBoletimManual} style={{ ...botaoBase, background: "#facc15" }}>
              Imprimir boletim manual
            </button>
          </div>

          <div
            style={{
              marginTop: 8,
              maxHeight: 360,
              overflow: "auto",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
            }}
          >
            {provasBoletim.length === 0 ? (
              <p style={{ color: "#64748b", fontWeight: 700, padding: 12 }}>
                Nenhuma prova encontrada para o boletim com os filtros atuais.
              </p>
            ) : (
              provasBoletim.map((prova) => (
                <div
                  key={prova.id}
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    padding: 12,
                  }}
                >
                  <strong style={{ color: "#0f2744" }}>
                    {prova.prova || "PROVA MANUAL"} - {prova.categoria} - {prova.naipe} - {prova.fase}
                  </strong>

                  <div
                    style={{
                      color: "#475569",
                      fontSize: 13,
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    {prova.linhasOrdenadas.length} atleta(s)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {mostrarImpressaoNormal && renderImpressao()}

      {forcarImpressao &&
        portalRoot &&
        createPortal(
          <>
            {renderEstilosBase()}
            {renderEstilosPaisagemSomenteQuandoImprime()}
            {renderImpressao()}
          </>,
          portalRoot
        )}
    </>
  );
}
