import { useState } from "react";
import { getNumeroAtleta } from "../../../utils/getNumeroAtleta";

const inputPesquisa = {
  width: "100%",
  padding: 12,
  marginTop: 8,
  marginBottom: 12,
  borderRadius: 10,
};

const boxCriarSubstituto = {
  background: "#111827",
  border: "1px dashed #22c55e",
  borderRadius: 12,
  padding: 12,
  marginBottom: 14,
};

const boxGerenciar = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 16,
  marginTop: 15,
  marginBottom: 15,
};

const gridGerenciar = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const listaInscritos = {
  maxHeight: 360,
  overflowY: "auto",
  paddingRight: 6,
};

const linhaInscrito = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 10,
  marginBottom: 8,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};

const avisoSubstituicao = {
  background: "#facc15",
  color: "#020617",
  padding: 10,
  borderRadius: 10,
  marginBottom: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};

const botaoMiniBase = {
  border: "none",
  borderRadius: 8,
  padding: "8px 10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botaoMiniVerde = { ...botaoMiniBase, background: "#22c55e", color: "#020617" };
const botaoMiniAzul = { ...botaoMiniBase, background: "#38bdf8", color: "#020617" };
const botaoMiniCinza = { ...botaoMiniBase, background: "#94a3b8", color: "#020617" };
const botaoMiniVermelho = { ...botaoMiniBase, background: "#ef4444", color: "white" };
const botaoAzul = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 10,
  color: "#020617",
  fontWeight: "bold",
  marginRight: 10,
  marginBottom: 10,
  cursor: "pointer",
  background: "#38bdf8",
};

export default function GerenciarInscritos({
  inscricoes,
  buscaAtleta,
  setBuscaAtleta,
  atletasEncontrados,
  buscarAtletas,
  adicionarAtletaNaProva,
  removerInscricaoDaProva,
  substituirInscricaoDaProva,
  criarAtletaESubstituir,
  carregando,
}) {
  const [inscricaoParaSubstituir, setInscricaoParaSubstituir] = useState(null);
  const [nomeNovoAtleta, setNomeNovoAtleta] = useState("");
  const [numeroNovoAtleta, setNumeroNovoAtleta] = useState("");

  function limparSubstituicao() {
    setInscricaoParaSubstituir(null);
    setNomeNovoAtleta("");
    setNumeroNovoAtleta("");
  }

  async function confirmarCriacaoSubstituto() {
    await criarAtletaESubstituir(inscricaoParaSubstituir, {
      nome: nomeNovoAtleta,
      numero: numeroNovoAtleta,
    });

    setNomeNovoAtleta("");
    setNumeroNovoAtleta("");
  }

  return (
    <div style={boxGerenciar}>
      <h3 style={{ marginTop: 0 }}>Gerenciar inscritos da prova</h3>

      <p style={{ opacity: 0.85 }}>
        Use esta area antes de gerar as series. Se a prova ja tiver series, depois da troca clique em Gerar Series desta Prova novamente.
      </p>

      <div style={gridGerenciar}>
        <div>
          <h4>Inscritos atuais ({inscricoes.length})</h4>

          {carregando ? (
            <p>Carregando inscritos...</p>
          ) : inscricoes.length === 0 ? (
            <p>Nenhum atleta inscrito nesta prova.</p>
          ) : (
            <div style={listaInscritos}>
              {inscricoes.map((inscricao) => {
                const atleta = inscricao.atletas;

                return (
                  <div key={inscricao.id} style={linhaInscrito}>
                    <div>
                      <strong>{atleta?.nome}</strong>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        No {getNumeroAtleta(atleta)} - {atleta?.escolas?.nome || "Sem escola"} - {atleta?.municipio || "-"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => setInscricaoParaSubstituir(inscricao)}
                        style={botaoMiniAzul}
                      >
                        Substituir
                      </button>

                      <button
                        onClick={() => removerInscricaoDaProva(inscricao)}
                        style={botaoMiniVermelho}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4>{inscricaoParaSubstituir ? "Escolher substituto" : "Adicionar novo atleta"}</h4>

          {inscricaoParaSubstituir && (
            <div style={avisoSubstituicao}>
              Substituindo: <strong>{inscricaoParaSubstituir.atletas?.nome}</strong>
              <button onClick={limparSubstituicao} style={botaoMiniCinza}>
                Cancelar
              </button>
            </div>
          )}

          {inscricaoParaSubstituir && (
            <div style={boxCriarSubstituto}>
              <h4 style={{ marginTop: 0 }}>Substituto nao esta cadastrado?</h4>

              <p style={{ fontSize: 13, opacity: 0.85 }}>
                Cadastre rapidamente o novo atleta usando a mesma escola e municipio do atleta substituido.
              </p>

              <label>Nome do novo atleta</label>
              <input
                value={nomeNovoAtleta}
                onChange={(e) => setNomeNovoAtleta(e.target.value)}
                placeholder="Digite o nome completo"
                style={{ ...inputPesquisa, marginTop: 6 }}
              />

              <label>Numero do atleta (opcional)</label>
              <input
                value={numeroNovoAtleta}
                onChange={(e) => setNumeroNovoAtleta(e.target.value)}
                placeholder="Ex: 102"
                style={{ ...inputPesquisa, marginTop: 6 }}
              />

              <button onClick={confirmarCriacaoSubstituto} style={botaoMiniVerde}>
                Criar atleta e substituir
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={buscaAtleta}
              onChange={(e) => setBuscaAtleta(e.target.value)}
              placeholder="Pesquisar atleta pelo nome..."
              style={{ ...inputPesquisa, margin: 0 }}
            />

            <button onClick={buscarAtletas} style={botaoAzul}>
              Buscar
            </button>
          </div>

          <div style={listaInscritos}>
            {atletasEncontrados.length === 0 ? (
              <p>Pesquise um atleta para adicionar ou substituir.</p>
            ) : (
              atletasEncontrados.map((atleta) => (
                <div key={atleta.id} style={linhaInscrito}>
                  <div>
                    <strong>{atleta.nome}</strong>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      No {getNumeroAtleta(atleta)} - {atleta.escolas?.nome || "Sem escola"} - {atleta.municipio || "-"}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      inscricaoParaSubstituir
                        ? substituirInscricaoDaProva(inscricaoParaSubstituir, atleta)
                        : adicionarAtletaNaProva(atleta)
                    }
                    style={botaoMiniVerde}
                  >
                    {inscricaoParaSubstituir ? "Usar como substituto" : "Adicionar"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
