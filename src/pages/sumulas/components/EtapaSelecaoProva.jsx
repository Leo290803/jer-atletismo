import Etapa from "./Etapa";
import Filtro from "./Filtro";
import EtapaSumulaDigital from "./EtapaSumulaDigital";
import GerenciarInscritos from "./GerenciarInscritos";

const baseBotao = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 10,
  color: "#020617",
  fontWeight: "bold",
  marginRight: 10,
  marginBottom: 10,
  cursor: "pointer",
};

const botaoCinza = { ...baseBotao, background: "#94a3b8" };
const botaoVerde = { ...baseBotao, background: "#22c55e" };
const botaoAmarelo = { ...baseBotao, background: "#facc15" };
const botaoAzul = { ...baseBotao, background: "#38bdf8" };
const botaoRoxo = { ...baseBotao, background: "#a78bfa", marginTop: 10 };

const inputPesquisa = {
  width: "100%",
  padding: 12,
  marginTop: 8,
  marginBottom: 12,
  borderRadius: 10,
};

const gridFiltros = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 12,
};

const listaProvas = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  marginTop: 12,
  maxHeight: 360,
  overflowY: "auto",
  paddingRight: 6,
};

const cardProva = {
  padding: 14,
  borderRadius: 12,
};

const inputData = {
  display: "block",
  marginTop: 6,
  padding: 10,
  borderRadius: 8,
  width: 220,
};

export default function EtapaSelecaoProva(props) {
  const {
    buscaProva,
    setBuscaProva,
    filtroCategoria,
    setFiltroCategoria,
    filtroNaipe,
    setFiltroNaipe,
    filtroFase,
    setFiltroFase,
    filtroTipo,
    setFiltroTipo,
    categorias,
    naipes,
    fases,
    tipos,
    limparFiltros,
    provasFiltradas,
    provaSelecionada,
    selecionarProva,
    gerarSeriesDaProva,
    carregarSeries,
    abrirGerenciarInscritos,
    mostrarGerenciarInscritos,
    sumulaDigital,
    sumulasDigitais,
    tokenMensagem,
    linkArbitro,
    gerarSumulaDigital,
    bloquearSumulaDigital,
    reabrirSumulaDigital,
    setTokenMensagem,
    inscricoesProva,
    buscaAtleta,
    setBuscaAtleta,
    atletasEncontrados,
    buscarAtletas,
    adicionarAtletaNaProva,
    removerInscricaoDaProva,
    substituirInscricaoDaProva,
    criarAtletaESubstituir,
    carregandoInscritos,
    dataProva,
    setDataProva,
  } = props;

  return (
    <Etapa numero="1" titulo="Escolher prova, gerar series e data">
      <label>Pesquisar prova</label>

      <input
        value={buscaProva}
        onChange={(e) => setBuscaProva(e.target.value)}
        placeholder="Digite o nome da prova, categoria, naipe ou fase..."
        style={inputPesquisa}
      />

      <div style={gridFiltros}>
        <Filtro label="Categoria" value={filtroCategoria} setValue={setFiltroCategoria} itens={categorias} />
        <Filtro label="Naipe" value={filtroNaipe} setValue={setFiltroNaipe} itens={naipes} />
        <Filtro label="Fase" value={filtroFase} setValue={setFiltroFase} itens={fases} />
        <Filtro label="Tipo" value={filtroTipo} setValue={setFiltroTipo} itens={tipos} />
      </div>

      <button onClick={limparFiltros} style={botaoCinza}>
        Limpar filtros
      </button>

      <p style={{ marginTop: 12 }}>
        Provas encontradas: <strong>{provasFiltradas.length}</strong>
      </p>

      <div style={listaProvas}>
        {provasFiltradas.map((p) => {
          const selecionada = provaSelecionada === p.id;

          return (
            <div
              key={p.id}
              style={{
                ...cardProva,
                border: selecionada ? "2px solid #22c55e" : "1px solid #cbd5e1",
                background: selecionada ? "#d9f99d" : "#f8fafc",
                color: "#0f172a",
              }}
            >
              <h4 style={{ margin: 0 }}>{p.nome}</h4>

              <p style={{ margin: "8px 0" }}>
                {p.categoria} • {p.naipe} • {p.fase || "QUALIFICACAO"}
              </p>

              <p style={{ margin: "8px 0", opacity: 0.8 }}>
                Tipo: {p.subtipo || p.tipo || "-"}
              </p>

              <button onClick={() => selecionarProva(p.id)} style={selecionada ? botaoVerde : botaoAzul}>
                {selecionada ? "Selecionada" : "Selecionar"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 15 }}>
        <button onClick={gerarSeriesDaProva} style={botaoRoxo}>
          Gerar Series desta Prova
        </button>

        <button onClick={() => carregarSeries(provaSelecionada)} style={botaoAzul}>
          Recarregar Series
        </button>

        <button onClick={abrirGerenciarInscritos} style={botaoAmarelo}>
          {mostrarGerenciarInscritos ? "Ocultar Inscritos" : "Gerenciar Inscritos"}
        </button>
      </div>

      <EtapaSumulaDigital
        sumulaDigital={sumulaDigital}
        sumulasDigitais={sumulasDigitais}
        tokenMensagem={tokenMensagem}
        linkArbitro={linkArbitro}
        gerarSumulaDigital={gerarSumulaDigital}
        bloquearSumulaDigital={bloquearSumulaDigital}
        reabrirSumulaDigital={reabrirSumulaDigital}
        setTokenMensagem={setTokenMensagem}
      />

      {mostrarGerenciarInscritos && (
        <GerenciarInscritos
          inscricoes={inscricoesProva}
          buscaAtleta={buscaAtleta}
          setBuscaAtleta={setBuscaAtleta}
          atletasEncontrados={atletasEncontrados}
          buscarAtletas={buscarAtletas}
          adicionarAtletaNaProva={adicionarAtletaNaProva}
          removerInscricaoDaProva={removerInscricaoDaProva}
          substituirInscricaoDaProva={substituirInscricaoDaProva}
          criarAtletaESubstituir={criarAtletaESubstituir}
          carregando={carregandoInscritos}
        />
      )}

      <div style={{ marginTop: 15 }}>
        <label>Data da prova</label>

        <input
          type="date"
          value={dataProva}
          onChange={(e) => setDataProva(e.target.value)}
          style={inputData}
        />
      </div>
    </Etapa>
  );
}
