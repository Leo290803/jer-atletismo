import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Series() {
  const [provas, setProvas] = useState([]);
  const [provaSelecionada, setProvaSelecionada] = useState("");
  const [raias, setRaias] = useState(8);
  const [modoDivisaoCampo, setModoDivisaoCampo] = useState("atletas_por_serie");
  const [quantidadeCampo, setQuantidadeCampo] = useState(15);
  const [mensagem, setMensagem] = useState("");
  const [seriesGeradas, setSeriesGeradas] = useState([]);

  useEffect(() => {
    carregarProvas();
  }, []);

  async function carregarProvas() {
    const { data, error } = await supabase
      .from("provas")
      .select(`
        id,nome,categoria,naipe,tipo,subtipo,
        inscricoes (
          id,
          atletas (
            id,numero,nome,municipio,
            escolas (nome)
          )
        )
      `)
      .order("nome");

    if (error) {
      setMensagem("Erro ao carregar provas: " + error.message);
      return;
    }

    setProvas(data || []);
  }

  async function carregarSeries(provaId) {
    const { data, error } = await supabase
      .from("series")
      .select(`
        id,numero_serie,
        raias (
          id,raia,ordem,
          inscricoes (
            id,
            atletas (
              id,numero,nome,municipio,
              escolas (nome)
            )
          )
        )
      `)
      .eq("prova_id", provaId)
      .order("numero_serie");

    if (error) {
      setMensagem("Erro ao carregar séries: " + error.message);
      return;
    }

    setSeriesGeradas(data || []);
  }

  function calcularTotalSeries(prova, totalAtletas) {
    const ehCampo =
      prova.subtipo === "campo_tentativas" ||
      prova.subtipo === "salto_altura" ||
      prova.tipo === "campo";

    if (!ehCampo) {
      return Math.ceil(totalAtletas / raias);
    }

    if (modoDivisaoCampo === "atletas_por_serie") {
      return Math.ceil(totalAtletas / quantidadeCampo);
    }

    if (modoDivisaoCampo === "quantidade_series") {
      return Math.max(1, quantidadeCampo);
    }

    return 1;
  }

  function descobrirSerieIndex(index, totalAtletas, totalSeries, ehCampo) {
    if (!ehCampo) {
      return Math.floor(index / raias);
    }

    if (modoDivisaoCampo === "atletas_por_serie") {
      return Math.floor(index / quantidadeCampo);
    }

    if (modoDivisaoCampo === "quantidade_series") {
      return index % totalSeries;
    }

    return 0;
  }

  async function gerarSeries() {
    const prova = provas.find((p) => p.id === provaSelecionada);

    if (!prova) {
      alert("Selecione uma prova.");
      return;
    }

    const inscritos = prova.inscricoes || [];

    if (inscritos.length === 0) {
      alert("Essa prova não possui atletas.");
      return;
    }

    if (quantidadeCampo < 1) {
      alert("A quantidade precisa ser maior que zero.");
      return;
    }

    const { data: seriesAntigas } = await supabase
      .from("series")
      .select("id")
      .eq("prova_id", prova.id);

    const idsSeriesAntigas = (seriesAntigas || []).map((s) => s.id);

    if (idsSeriesAntigas.length > 0) {
      await supabase.from("raias").delete().in("serie_id", idsSeriesAntigas);
    }

    await supabase.from("series").delete().eq("prova_id", prova.id);

    const ehCampo =
      prova.subtipo === "campo_tentativas" ||
      prova.subtipo === "salto_altura" ||
      prova.tipo === "campo";

    const totalSeries = calcularTotalSeries(prova, inscritos.length);
    const novasSeries = [];

    for (let i = 1; i <= totalSeries; i++) {
      const { data: serie, error } = await supabase
        .from("series")
        .insert({
          prova_id: prova.id,
          numero_serie: i,
        })
        .select()
        .single();

      if (error) {
        setMensagem("Erro ao criar série: " + error.message);
        return;
      }

      novasSeries.push(serie);
    }

    const contadorOrdemPorSerie = {};
    const raiasParaSalvar = [];

    inscritos.forEach((inscricao, index) => {
      const serieIndex = descobrirSerieIndex(
        index,
        inscritos.length,
        totalSeries,
        ehCampo
      );

      contadorOrdemPorSerie[serieIndex] =
        (contadorOrdemPorSerie[serieIndex] || 0) + 1;

      if (ehCampo) {
        raiasParaSalvar.push({
          serie_id: novasSeries[serieIndex].id,
          inscricao_id: inscricao.id,
          raia: null,
          ordem: contadorOrdemPorSerie[serieIndex],
        });
      } else {
        const raiaNumero = (index % raias) + 1;

        raiasParaSalvar.push({
          serie_id: novasSeries[serieIndex].id,
          inscricao_id: inscricao.id,
          raia: raiaNumero,
          ordem: contadorOrdemPorSerie[serieIndex],
        });
      }
    });

    const { error: erroRaias } = await supabase
      .from("raias")
      .insert(raiasParaSalvar);

    if (erroRaias) {
      setMensagem("Erro ao salvar raias: " + erroRaias.message);
      return;
    }

    setMensagem(`Séries geradas com sucesso: ${totalSeries} série(s).`);
    carregarSeries(prova.id);
  }

  function mudarProva(id) {
    setProvaSelecionada(id);
    setSeriesGeradas([]);
    if (id) carregarSeries(id);
  }

  function imprimir() {
    window.print();
  }

  const provaAtual = provas.find((p) => p.id === provaSelecionada);

  const ehCampo =
    provaAtual?.subtipo === "campo_tentativas" ||
    provaAtual?.subtipo === "salto_altura" ||
    provaAtual?.tipo === "campo";

  const ehSaltoAltura = provaAtual?.subtipo === "salto_altura";

  const alturasPadrao = [
    "1.15", "1.20", "1.25", "1.30", "1.35", "1.40",
    "1.45", "1.50", "1.55", "1.60", "1.65", "1.70",
    "1.75", "1.80"
  ];

  return (
    <div>
      <style>
        {`
          @media print {
            body { background:white !important; color:black !important; }
            .sidebar,.nao-imprimir { display:none !important; }
            .content { padding:0 !important; }
            .card { border:none !important; background:white !important; color:black !important; box-shadow:none !important; }
            table { border-collapse:collapse !important; width:100% !important; color:black !important; font-size:11px; }
            th,td { border:1px solid black !important; padding:5px !important; color:black !important; }
            h1,h2,h3,p { color:black !important; }
            .sumula-print { page-break-after:always; }
          }
        `}
      </style>

      <div className="nao-imprimir">
        <h1>Séries, Raias e Ordem de Tentativas</h1>

        <p className="muted">
          Para pista, gere séries e raias. Para campo, gere séries por quantidade de atletas ou por número de séries.
        </p>

        <div className="card" style={{ marginBottom: 20 }}>
          <label>Selecione a prova</label>

          <select
            value={provaSelecionada}
            onChange={(e) => mudarProva(e.target.value)}
            style={{ width: "100%", padding: 12, marginTop: 8, marginBottom: 12, borderRadius: 10 }}
          >
            <option value="">Selecione...</option>

            {provas.map((prova) => (
              <option key={prova.id} value={prova.id}>
                {prova.nome} - {prova.categoria} - {prova.naipe} -{" "}
                {prova.inscricoes?.length || 0} atletas - {prova.subtipo || prova.tipo}
              </option>
            ))}
          </select>

          {!ehCampo && (
            <>
              <label>Quantidade de raias</label>

              <input
                type="number"
                value={raias}
                onChange={(e) => setRaias(Number(e.target.value))}
                min="1"
                max="10"
                style={{ width: 120, padding: 12, marginTop: 8, marginRight: 12, borderRadius: 10 }}
              />
            </>
          )}

          {ehCampo && (
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "end",
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              <div>
                <label>Divisão das séries</label>
                <select
                  value={modoDivisaoCampo}
                  onChange={(e) => setModoDivisaoCampo(e.target.value)}
                  style={{
                    display: "block",
                    width: 280,
                    padding: 12,
                    marginTop: 8,
                    borderRadius: 10,
                  }}
                >
                  <option value="atletas_por_serie">
                    Por quantidade de atletas em cada série
                  </option>
                  <option value="quantidade_series">
                    Por quantidade total de séries
                  </option>
                </select>
              </div>

              <div>
                <label>
                  {modoDivisaoCampo === "atletas_por_serie"
                    ? "Atletas por série"
                    : "Quantidade de séries"}
                </label>

                <input
                  type="number"
                  value={quantidadeCampo}
                  onChange={(e) => setQuantidadeCampo(Number(e.target.value))}
                  min="1"
                  style={{
                    display: "block",
                    width: 140,
                    padding: 12,
                    marginTop: 8,
                    borderRadius: 10,
                  }}
                />
              </div>
            </div>
          )}

          <button
            onClick={gerarSeries}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "none",
              background: "#22c55e",
              color: "#020617",
              fontWeight: "bold",
              cursor: "pointer",
              marginRight: 10,
            }}
          >
            Gerar Séries
          </button>

          <button
            onClick={imprimir}
            disabled={seriesGeradas.length === 0}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "none",
              background: "#38bdf8",
              color: "#020617",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Imprimir Súmula
          </button>

          {mensagem && <p>{mensagem}</p>}
        </div>
      </div>

      {seriesGeradas.map((serie) => (
        <div className="card sumula-print" key={serie.id} style={{ marginBottom: 20 }}>
          <h2 style={{ textAlign: "center" }}>SÚMULA DE ATLETISMO - JER 2026</h2>

          {provaAtual && (
            <p style={{ textAlign: "center" }}>
              <strong>Prova:</strong> {provaAtual.nome} &nbsp; | &nbsp;
              <strong>Categoria:</strong> {provaAtual.categoria} &nbsp; | &nbsp;
              <strong>Naipe:</strong> {provaAtual.naipe}
            </p>
          )}

          {!ehCampo && <h3>Série {serie.numero_serie}</h3>}
          {ehCampo && <h3>Série {serie.numero_serie} - Ordem de Tentativas</h3>}

          {!ehCampo && (
            <table width="100%" cellPadding="10">
              <thead>
                <tr>
                  <th>Raia</th>
                  <th>Nº</th>
                  <th>Atleta</th>
                  <th>Escola</th>
                  <th>Município</th>
                  <th>Tempo</th>
                  <th>Colocação</th>
                </tr>
              </thead>

              <tbody>
                {[...(serie.raias || [])]
                  .sort((a, b) => a.raia - b.raia)
                  .map((item) => {
                    const atleta = item.inscricoes?.atletas;

                    return (
                      <tr key={item.id}>
                        <td>{item.raia}</td>
                        <td>{atleta?.numero}</td>
                        <td>{atleta?.nome}</td>
                        <td>{atleta?.escolas?.nome}</td>
                        <td>{atleta?.municipio}</td>
                        <td style={{ height: 34 }}></td>
                        <td></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {ehCampo && !ehSaltoAltura && (
            <table width="100%" cellPadding="10">
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Nº</th>
                  <th>Atleta</th>
                  <th>Escola</th>
                  <th>Município</th>
                  <th>1ª</th>
                  <th>2ª</th>
                  <th>3ª</th>
                  <th>Parcial</th>
                  <th>Class.</th>
                  <th>4ª</th>
                  <th>5ª</th>
                  <th>6ª</th>
                  <th>Resultado Final</th>
                  <th>Colocação</th>
                </tr>
              </thead>

              <tbody>
                {[...(serie.raias || [])]
                  .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                  .map((item) => {
                    const atleta = item.inscricoes?.atletas;

                    return (
                      <tr key={item.id}>
                        <td>{item.ordem}</td>
                        <td>{atleta?.numero}</td>
                        <td>{atleta?.nome}</td>
                        <td>{atleta?.escolas?.nome}</td>
                        <td>{atleta?.municipio}</td>
                        <td style={{ height: 30 }}></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {ehSaltoAltura && (
            <table width="100%" cellPadding="10">
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Nº</th>
                  <th>Atleta</th>
                  <th>Escola</th>
                  {alturasPadrao.map((altura) => (
                    <th key={altura}>{altura}</th>
                  ))}
                  <th>Resultado</th>
                  <th>Colocação</th>
                </tr>
              </thead>

              <tbody>
                {[...(serie.raias || [])]
                  .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                  .map((item) => {
                    const atleta = item.inscricoes?.atletas;

                    return (
                      <tr key={item.id}>
                        <td>{item.ordem}</td>
                        <td>{atleta?.numero}</td>
                        <td>{atleta?.nome}</td>
                        <td>{atleta?.escolas?.nome}</td>
                        {alturasPadrao.map((altura) => (
                          <td key={altura} style={{ height: 28 }}></td>
                        ))}
                        <td></td>
                        <td></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 50, gap: 40 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ borderTop: "1px solid black", paddingTop: 8 }}>
                Árbitro da Prova
              </div>
            </div>

            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ borderTop: "1px solid black", paddingTop: 8 }}>
                Coordenação de Atletismo
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}