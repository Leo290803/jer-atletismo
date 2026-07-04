import { useMemo } from "react";

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

function resultadoLinha(linha, tipo) {
  if (tipo === "campo") {
    return linha.resultado || linha.tentativa3 || linha.tentativa2 || linha.tentativa1 || "";
  }

  return linha.resultado || "";
}

function ehFinal(fase) {
  return String(fase || "").toUpperCase().includes("FINAL");
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
    .filter((prova) => {
      const linhas = Array.isArray(prova.linhas) ? prova.linhas : [];
      const temLinha = linhas.length > 0;
      const temResultado = linhas.some((linha) =>
        linha.resultado || linha.colocacao || linha.tentativa1 || linha.tentativa2 || linha.tentativa3 || String(linha.status || "OK") !== "OK"
      );

      if (opcoes.somenteComResultado && !temResultado) return false;
      if (opcoes.somenteFinais && !ehFinal(prova.fase)) return false;

      return temLinha;
    })
    .map((prova) => ({
      ...prova,
      linhasOrdenadas: ordenarLinhas(prova.linhas || [], prova.tipo),
    }));
}

function nomeCompeticao(competicao) {
  return competicao?.nomeEvento || "BOLETIM MANUAL DE RESULTADOS";
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
  onImprimir,
}) {
  const provasBoletim = useMemo(
    () => agruparPorProva(competicao, { somenteFinais, somenteComResultado }),
    [competicao, somenteFinais, somenteComResultado]
  );

  const totalLinhas = provasBoletim.reduce(
    (total, prova) => total + (prova.linhasOrdenadas?.length || 0),
    0
  );

  const mostrarPreview = modo !== "impressao";
  const mostrarImpressao = modo !== "preview";

  return (
    <>
      {mostrarPreview && (
      <div className="nao-imprimir" style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>Boletim manual do evento</h3>
            <p style={{ color: "#64748b", fontWeight: 700, margin: "4px 0 0" }}>
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
              style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 10px" }}
              placeholder="0001"
            />
          </label>

          <label style={{ alignItems: "center", display: "flex", gap: 8, fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={somenteFinais}
              onChange={(e) => setSomenteFinais(e.target.checked)}
            />
            Somente finais
          </label>

          <label style={{ alignItems: "center", display: "flex", gap: 8, fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={somenteComResultado}
              onChange={(e) => setSomenteComResultado(e.target.checked)}
            />
            Somente com resultado/colocação
          </label>
        </div>

        <div style={{ marginTop: 14 }}>
          <button onClick={onImprimir} style={{ ...botaoBase, background: "#facc15" }}>
            Imprimir boletim manual
          </button>
        </div>

        <div style={{ marginTop: 8, maxHeight: 360, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
          {provasBoletim.length === 0 ? (
            <p style={{ color: "#64748b", fontWeight: 700, padding: 12 }}>
              Nenhuma prova encontrada para o boletim com os filtros atuais.
            </p>
          ) : (
            provasBoletim.map((prova) => (
              <div key={prova.id} style={{ borderBottom: "1px solid #e2e8f0", padding: 12 }}>
                <strong style={{ color: "#0f2744" }}>
                  {prova.prova || "PROVA MANUAL"} - {prova.categoria} - {prova.naipe} - {prova.fase}
                </strong>
                <div style={{ color: "#475569", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                  {prova.linhasOrdenadas.length} atleta(s)
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {mostrarImpressao && (
      <div className="boletim-manual-print">
        <section className="boletim-manual-page">
          <header className="boletim-manual-header">
            <h1>{nomeCompeticao(competicao)}</h1>
            <h2>BOLETIM OFICIAL DE RESULTADOS - SÚMULA MANUAL</h2>
            <p>
              <strong>Boletim:</strong> {numeroBoletim || "0001"}
              &nbsp; | &nbsp;
              <strong>Modalidade:</strong> Atletismo Paralímpico
              &nbsp; | &nbsp;
              <strong>Período:</strong> {dataParaTexto(competicao?.dataInicio)} até {dataParaTexto(competicao?.dataFim)}
            </p>
            {competicao?.local && (
              <p>
                <strong>Local:</strong> {competicao.local}
              </p>
            )}
          </header>

          {provasBoletim.length === 0 ? (
            <p className="boletim-manual-vazio">Nenhum resultado disponível para o boletim.</p>
          ) : (
            provasBoletim.map((prova) => {
              const temStatus = prova.linhasOrdenadas.some((linha) => linha.status && linha.status !== "OK");

              return (
                <article className="boletim-manual-prova" key={prova.id}>
                  <div className="boletim-manual-prova-titulo">
                    <strong>{prova.prova || "PROVA MANUAL"}</strong>
                    <span>
                      Categoria: {prova.categoria} &nbsp; | &nbsp; Naipe: {prova.naipe} &nbsp; | &nbsp; Fase: {prova.fase} &nbsp; | &nbsp; Data: {dataParaTexto(prova.data)}
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
                      {prova.linhasOrdenadas.map((linha, index) => (
                        <tr key={linha.id}>
                          <td className="col-pos">{linha.colocacao ? `${linha.colocacao}º` : `${index + 1}º`}</td>
                          <td className="col-num">{linha.numero || ""}</td>
                          <td className="col-atleta">{linha.atleta || ""}</td>
                          <td className="col-escola">{linha.escola || ""}</td>
                          <td className="col-resultado">{resultadoLinha(linha, prova.tipo)}</td>
                          {temStatus && <td className="col-status">{linha.status !== "OK" ? linha.status : ""}</td>}
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
      )}
    </>
  );
}
