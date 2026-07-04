import { useEffect, useMemo, useState } from "react";
import EtapaLancamento from "./sumulas/components/EtapaLancamento";
import EtapaProximaFase from "./sumulas/components/EtapaProximaFase";
import EtapaSelecaoProva from "./sumulas/components/EtapaSelecaoProva";
import SumulaManual from "./sumulas/components/SumulaManual";
import SumulaImpressao from "./sumulas/components/SumulaImpressao";
import { useGerenciarInscritos } from "./sumulas/hooks/useGerenciarInscritos";
import { useProximaFase } from "./sumulas/hooks/useProximaFase";
import { useSeries } from "./sumulas/hooks/useSeries";
import { useSumulaDigital } from "./sumulas/hooks/useSumulaDigital";
import { useSumulas } from "./sumulas/hooks/useSumulas";
import { buscarCombinadaPorCategoriaNaipe, ehProvaCombinada } from "../data/provasCombinadas";
import { formatarNascimento } from "./sumulas/utils/formatadores";
import "./sumulas/styles/printSumulas.css";

export default function Sumulas() {
  const [mensagem, setMensagem] = useState("");
  const [modoSumula, setModoSumula] = useState("oficial");

  const sumulas = useSumulas();
  const {
    config,
    provas,
    provaSelecionada,
    setProvaSelecionada,
    carregarProvas,
  } = sumulas;

  const [buscaProva, setBuscaProva] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroNaipe, setFiltroNaipe] = useState("");
  const [filtroFase, setFiltroFase] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [datasCombinada, setDatasCombinada] = useState({ dia1: "", dia2: "" });

  const seriesState = useSeries({
    provaSelecionada,
    provas,
    config,
    setMensagem,
    carregarProvas,
  });

  const {
    series,
    dataProva,
    setDataProva,
    carregarSeries,
    gerarSeriesDaProva,
    salvarResultados,
    classificarAutomaticamente,
    mudarCampo,
    mudarTentativaAltura,
    pegarValorAltura,
    calcularResultadoAltura,
    melhorDasTresPrimeiras,
    melhorDasTentativas,
    hasAlteracoesLocais,
  } = seriesState;

  const sumulaDigital = useSumulaDigital({
    provaSelecionada,
    setMensagem,
  });
  const { carregarSumulaDigital } = sumulaDigital;

  const inscritos = useGerenciarInscritos({
    provaSelecionada,
    provas,
    carregarSeries,
    setMensagem,
  });

  const proximaFase = useProximaFase({
    provaSelecionada,
    provas,
    series,
    setSeries: seriesState.setSeries,
    config,
    setMensagem,
    carregarProvas,
    melhorDasTentativas,
    calcularResultadoAltura,
  });

  useEffect(() => {
    if (!provaSelecionada) return;

    const intervalId = setInterval(() => {
      if (!hasAlteracoesLocais) {
        carregarSeries(provaSelecionada);
      }
      carregarSumulaDigital(provaSelecionada);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [provaSelecionada, carregarSeries, carregarSumulaDigital, hasAlteracoesLocais]);

  async function selecionarProva(id) {
    setProvaSelecionada(id);
    inscritos.setBuscaAtleta("");
    await carregarSeries(id);
    await carregarSumulaDigital(id);
  }

  function limparFiltros() {
    setBuscaProva("");
    setFiltroCategoria("");
    setFiltroNaipe("");
    setFiltroFase("");
    setFiltroTipo("");
  }

  function imprimir() {
    window.print();
  }

  const provaAtual = useMemo(
    () => provas.find((p) => p.id === provaSelecionada),
    [provas, provaSelecionada]
  );

  const nomeProvaAtual = String(provaAtual?.nome || "").toUpperCase();

  const ehCombinada = provaAtual?.tipo === "combinada" || ehProvaCombinada(provaAtual?.nome);
  const combinadaInfo = ehCombinada
    ? buscarCombinadaPorCategoriaNaipe(provaAtual?.categoria, provaAtual?.naipe)
    : null;

  useEffect(() => {
    const id = window.setTimeout(() => {
    if (!provaSelecionada || !ehCombinada) {
      setDatasCombinada({ dia1: "", dia2: "" });
      return;
    }

    const chave = "sumula-combinada-datas-" + provaSelecionada;

    try {
      const salvo = window.localStorage.getItem(chave);
      if (salvo) {
        const datas = JSON.parse(salvo);
        setDatasCombinada({ dia1: datas.dia1 || dataProva || "", dia2: datas.dia2 || "" });
        return;
      }
    } catch {
      // Se o navegador bloquear o localStorage, a tela continua usando as datas em memoria.
    }

    setDatasCombinada({ dia1: dataProva || "", dia2: "" });
    }, 0);

    return () => window.clearTimeout(id);
  }, [provaSelecionada, ehCombinada, dataProva]);

  function atualizarDataCombinada(campo, valor) {
    setDatasCombinada((atual) => {
      const novasDatas = { ...atual, [campo]: valor };

      if (provaSelecionada && ehCombinada) {
        try {
          window.localStorage.setItem(
            "sumula-combinada-datas-" + provaSelecionada,
            JSON.stringify(novasDatas)
          );
        } catch {
          // Mantem a alteracao em tela mesmo se o navegador nao permitir salvar localmente.
        }
      }

      return novasDatas;
    });
  }

  const ehRevezamento =
    provaAtual?.tipo === "revezamento" ||
    provaAtual?.subtipo === "revezamento" ||
    nomeProvaAtual.includes("REVEZAMENTO") ||
    nomeProvaAtual.includes("4X100") ||
    nomeProvaAtual.includes("4 X 100") ||
    nomeProvaAtual.includes("5X80") ||
    nomeProvaAtual.includes("5 X 80") ||
    nomeProvaAtual.includes("4X400") ||
    nomeProvaAtual.includes("4 X 400");

  const ehSaltoAltura =
    provaAtual?.subtipo === "salto_altura" ||
    nomeProvaAtual.includes("SALTO EM ALTURA");

  const ehCampoTentativas =
    !ehCombinada &&
    !ehSaltoAltura &&
    !ehRevezamento &&
    (provaAtual?.tipo === "campo" ||
      provaAtual?.subtipo === "campo_tentativas" ||
      nomeProvaAtual.includes("ARREMESSO") ||
      nomeProvaAtual.includes("LANCAMENTO") ||
      nomeProvaAtual.includes("SALTO EM DISTANCIA") ||
      nomeProvaAtual.includes("SALTO TRIPLO") ||
      nomeProvaAtual.includes("DARDO") ||
      nomeProvaAtual.includes("DISCO") ||
      nomeProvaAtual.includes("MARTELO") ||
      nomeProvaAtual.includes("PESO"));

  const categorias = [...new Set(provas.map((p) => p.categoria).filter(Boolean))];
  const naipes = [...new Set(provas.map((p) => p.naipe).filter(Boolean))];
  const fases = [...new Set(provas.map((p) => p.fase || "QUALIFICACAO"))];
  const tipos = [...new Set(provas.map((p) => p.subtipo || p.tipo).filter(Boolean))];

  const provasFiltradas = provas.filter((p) => {
    const fase = p.fase || "QUALIFICACAO";
    const tipo = p.subtipo || p.tipo || "";
    const texto = `${p.nome} ${p.categoria} ${p.naipe} ${fase} ${tipo}`.toLowerCase();

    return (
      texto.includes(buscaProva.toLowerCase()) &&
      (!filtroCategoria || p.categoria === filtroCategoria) &&
      (!filtroNaipe || p.naipe === filtroNaipe) &&
      (!filtroFase || fase === filtroFase) &&
      (!filtroTipo || tipo === filtroTipo)
    );
  });

  return (
    <div>
      <div className="nao-imprimir">
        <h1>Sumulas</h1>
        <p className="muted">Controle completo da prova em uma unica tela.</p>

        <div className="card" style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button
            onClick={() => setModoSumula("oficial")}
            style={{
              background: modoSumula === "oficial" ? "#22c55e" : "#e2e8f0",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: "bold",
              padding: "12px 18px",
            }}
          >
            Sumula oficial
          </button>

          <button
            onClick={() => setModoSumula("manual")}
            style={{
              background: modoSumula === "manual" ? "#22c55e" : "#e2e8f0",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: "bold",
              padding: "12px 18px",
            }}
          >
            Sumula manual
          </button>
        </div>

        {modoSumula === "oficial" && (
          <>
        <EtapaSelecaoProva
          buscaProva={buscaProva}
          setBuscaProva={setBuscaProva}
          filtroCategoria={filtroCategoria}
          setFiltroCategoria={setFiltroCategoria}
          filtroNaipe={filtroNaipe}
          setFiltroNaipe={setFiltroNaipe}
          filtroFase={filtroFase}
          setFiltroFase={setFiltroFase}
          filtroTipo={filtroTipo}
          setFiltroTipo={setFiltroTipo}
          categorias={categorias}
          naipes={naipes}
          fases={fases}
          tipos={tipos}
          limparFiltros={limparFiltros}
          provasFiltradas={provasFiltradas}
          provaSelecionada={provaSelecionada}
          selecionarProva={selecionarProva}
          gerarSeriesDaProva={gerarSeriesDaProva}
          carregarSeries={carregarSeries}
          abrirGerenciarInscritos={inscritos.abrirGerenciarInscritos}
          mostrarGerenciarInscritos={inscritos.mostrarGerenciarInscritos}
          sumulaDigital={sumulaDigital.sumulaDigital}
          sumulasDigitais={sumulaDigital.sumulasDigitais}
          tokenMensagem={sumulaDigital.tokenMensagem}
          linkArbitro={sumulaDigital.linkArbitro}
          gerarSumulaDigital={sumulaDigital.gerarSumulaDigital}
          bloquearSumulaDigital={sumulaDigital.bloquearSumulaDigital}
          reabrirSumulaDigital={sumulaDigital.reabrirSumulaDigital}
          setTokenMensagem={sumulaDigital.setTokenMensagem}
          inscricoesProva={inscritos.inscricoesProva}
          buscaAtleta={inscritos.buscaAtleta}
          setBuscaAtleta={inscritos.setBuscaAtleta}
          atletasEncontrados={inscritos.atletasEncontrados}
          buscarAtletas={inscritos.buscarAtletas}
          adicionarAtletaNaProva={inscritos.adicionarAtletaNaProva}
          removerInscricaoDaProva={inscritos.removerInscricaoDaProva}
          substituirInscricaoDaProva={inscritos.substituirInscricaoDaProva}
          criarAtletaESubstituir={inscritos.criarAtletaESubstituir}
          carregandoInscritos={inscritos.carregandoInscritos}
          dataProva={dataProva}
          setDataProva={setDataProva}
        />

        <EtapaLancamento
          salvarResultados={salvarResultados}
          classificarAutomaticamente={classificarAutomaticamente}
          imprimir={imprimir}
        />

        {ehCombinada && combinadaInfo && (
          <div className="card combinada-datas-card" style={{ marginBottom: 20 }}>
            <h3>Datas da combinada</h3>

            <div className="combinada-datas-grid">
              <label>
                Dia 1
                <input
                  type="date"
                  value={datasCombinada.dia1 || ""}
                  onChange={(e) => atualizarDataCombinada("dia1", e.target.value)}
                />
              </label>

              <label>
                Dia 2
                <input
                  type="date"
                  value={datasCombinada.dia2 || ""}
                  onChange={(e) => atualizarDataCombinada("dia2", e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        <EtapaProximaFase
          mostrarProximaFase={proximaFase.mostrarProximaFase}
          setMostrarProximaFase={proximaFase.setMostrarProximaFase}
          tipoProximaFase={proximaFase.tipoProximaFase}
          setTipoProximaFase={proximaFase.setTipoProximaFase}
          raiasProximaFase={proximaFase.raiasProximaFase}
          setRaiasProximaFase={proximaFase.setRaiasProximaFase}
          regraSugeridaProximaFase={proximaFase.regraSugeridaProximaFase}
          totalSeriesDetectadas={proximaFase.totalSeriesDetectadas}
          faseBotao={proximaFase.faseBotao}
          montarPreviewProximaFase={proximaFase.montarPreviewProximaFase}
          gerarProximaFase={proximaFase.gerarProximaFase}
          previewProximaFase={proximaFase.previewProximaFase}
          mostrarAvancadoProximaFase={proximaFase.mostrarAvancadoProximaFase}
          setMostrarAvancadoProximaFase={proximaFase.setMostrarAvancadoProximaFase}
          criterioClassificacao={proximaFase.criterioClassificacao}
          setCriterioClassificacao={proximaFase.setCriterioClassificacao}
          qAutomaticos={proximaFase.qAutomaticos}
          setQAutomaticos={proximaFase.setQAutomaticos}
          qTempos={proximaFase.qTempos}
          setQTempos={proximaFase.setQTempos}
          quantidadeClassificados={proximaFase.quantidadeClassificados}
          setQuantidadeClassificados={proximaFase.setQuantidadeClassificados}
          setRegraPreviewProximaFase={proximaFase.setRegraPreviewProximaFase}
        />

        {mensagem && (
          <div className="card" style={{ marginBottom: 20 }}>
            {mensagem}
          </div>
        )}
          </>
        )}
      </div>

      {modoSumula === "manual" && (
        <SumulaManual config={config} imprimir={imprimir} />
      )}

      {modoSumula === "oficial" && (
        <SumulaImpressao
          series={series}
          ehSaltoAltura={ehSaltoAltura}
          ehCampoTentativas={ehCampoTentativas}
          ehRevezamento={ehRevezamento}
          ehCombinada={ehCombinada}
          combinadaInfo={combinadaInfo}
          config={config}
          provaAtual={provaAtual}
          dataProva={dataProva}
          datasCombinada={datasCombinada}
          pegarValorAltura={pegarValorAltura}
          mudarTentativaAltura={mudarTentativaAltura}
          mudarCampo={mudarCampo}
          calcularResultadoAltura={calcularResultadoAltura}
          melhorDasTresPrimeiras={melhorDasTresPrimeiras}
          melhorDasTentativas={melhorDasTentativas}
          formatarNascimento={formatarNascimento}
        />
      )}
    </div>
  );
}
