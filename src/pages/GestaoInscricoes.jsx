import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const PAGE_SIZE = 20;

function formatarDataBR(dataISO) {
  if (!dataISO) return "-";
  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return dataISO;
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function Modal({ open, titulo, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button className="ghost-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function GestaoInscricoes() {
  const [atletas, setAtletas] = useState([]);
  const [provas, setProvas] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [filtros, setFiltros] = useState({
    nome: "",
    numero: "",
    escola: "",
    municipio: "",
    prova: "",
    categoria: "",
    naipe: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [selectedAtleta, setSelectedAtleta] = useState(null);
  const [selectedInscricao, setSelectedInscricao] = useState(null);
  const [formState, setFormState] = useState({
    nome: "",
    data_nascimento: "",
    municipio: "",
    escola_id: "",
    categoria: "",
    naipe: "",
    cpf: "",
    provas: [],
  });
  const [replacementAtletaId, setReplacementAtletaId] = useState("");

  const carregarProvas = useCallback(async () => {
    const { data, error } = await supabase
      .from("provas")
      .select(`id,nome,categoria,naipe,status`)
      .order("nome", { ascending: true });

    if (error) {
      setMensagem("Erro ao carregar provas: " + error.message);
      return;
    }

    setProvas(data || []);
  }, []);

  const carregarEscolas = useCallback(async () => {
    const { data, error } = await supabase
      .from("escolas")
      .select("id,nome")
      .order("nome", { ascending: true });

    if (error) {
      setMensagem("Erro ao carregar escolas: " + error.message);
      return;
    }

    setEscolas(data || []);
  }, []);

  const carregarAtletas = useCallback(async () => {
    setLoading(true);
    setMensagem("");

    const start = pageIndex * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const query = supabase
      .from("atletas")
      .select(
        `id,nome,numero,municipio,categoria,naipe,escola_id,escolas(nome),inscricoes(id,prova_id,provas(id,nome,categoria,naipe,status))`,
        { count: "exact" }
      )
      .order("nome", { ascending: true })
      .range(start, end);

    const { data, error, count } = await query;

    if (error) {
      setMensagem("Erro ao carregar atletas: " + error.message);
      setLoading(false);
      return;
    }

    setAtletas(data || []);
    setTotalRows(count || 0);
    setLoading(false);
  }, [pageIndex]);

  useEffect(() => {
    void carregarProvas();
    void carregarEscolas();
  }, [carregarProvas, carregarEscolas]);

  useEffect(() => {
    void carregarAtletas();
  }, [carregarAtletas]);

  const atletasEnriquecidos = useMemo(() => {
    return (atletas || []).map((atleta) => ({
      ...atleta,
      escola: atleta.escolas?.nome || "Sem escola",
      provas:
        atleta.inscricoes?.map((inscricao) => inscricao.provas).filter(Boolean) || [],
    }));
  }, [atletas]);

  const atletasFiltrados = useMemo(() => {
    return atletasEnriquecidos.filter((atleta) => {
      if (
        filtros.nome &&
        !atleta.nome.toLowerCase().includes(filtros.nome.toLowerCase())
      ) {
        return false;
      }

      if (
        filtros.numero &&
        String(atleta.numero).indexOf(String(filtros.numero)) === -1
      ) {
        return false;
      }

      if (
        filtros.escola &&
        !atleta.escola.toLowerCase().includes(filtros.escola.toLowerCase())
      ) {
        return false;
      }

      if (
        filtros.municipio &&
        !String(atleta.municipio || "")
          .toLowerCase()
          .includes(filtros.municipio.toLowerCase())
      ) {
        return false;
      }

      if (
        filtros.categoria &&
        !String(atleta.categoria || "")
          .toLowerCase()
          .includes(filtros.categoria.toLowerCase())
      ) {
        return false;
      }

      if (
        filtros.naipe &&
        !String(atleta.naipe || "")
          .toLowerCase()
          .includes(filtros.naipe.toLowerCase())
      ) {
        return false;
      }

      if (filtros.prova) {
        const provaf = filtros.prova.toLowerCase();
        return atleta.provas.some((prova) =>
          prova.nome?.toLowerCase().includes(provaf)
        );
      }

      return true;
    });
  }, [atletasEnriquecidos, filtros]);

  function abrirModal(mode, atleta = null, inscricao = null) {
    setModalMode(mode);
    setSelectedAtleta(atleta);
    setSelectedInscricao(inscricao);
    setMensagem("");

    if (mode === "editar" && atleta) {
      setFormState({
        nome: atleta.nome || "",
        data_nascimento: atleta.data_nascimento || "",
        municipio: atleta.municipio || "",
        escola_id: atleta.escola_id || "",
        categoria: atleta.categoria || "",
        naipe: atleta.naipe || "",
        provas: atleta.provas.map((prova) => prova.id) || [],
      });
    } else if (mode === "trocar_prova" && inscricao) {
      setFormState({
        nome: "",
        data_nascimento: "",
        municipio: "",
        escola_id: "",
        categoria: "",
        naipe: "",
        cpf: "",
        provas: [inscricao.prova_id],
      });
    } else {
      setFormState({
        nome: "",
        data_nascimento: "",
        municipio: "",
        escola_id: "",
        categoria: "",
        naipe: "",
        cpf: "",
        provas: [],
      });
    }

    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
    setSelectedAtleta(null);
    setSelectedInscricao(null);
    setReplacementAtletaId("");
    setMensagem("");
  }

  async function salvarAtleta() {
    const atletaPayload = {
      nome: formState.nome,
      data_nascimento: formState.data_nascimento || null,
      municipio: formState.municipio || null,
      escola_id: formState.escola_id || null,
      categoria: formState.categoria || null,
      naipe: formState.naipe || null,
    };

    if (modalMode === "editar" && selectedAtleta) {
      const { error } = await supabase
        .from("atletas")
        .update(atletaPayload)
        .eq("id", selectedAtleta.id);

      if (error) {
        setMensagem("Erro ao atualizar atleta: " + error.message);
        return;
      }

      setMensagem("Atleta atualizado com sucesso.");
      fecharModal();
      void carregarAtletas();
      return;
    }

    const { data: novoAtleta, error: erroAtleta } = await supabase
      .from("atletas")
      .insert(atletaPayload)
      .select("id")
      .single();

    if (erroAtleta) {
      setMensagem("Erro ao criar atleta: " + erroAtleta.message);
      return;
    }

    const inscricoesParaCriar = (formState.provas || []).map((provaId) => ({
      atleta_id: novoAtleta.id,
      prova_id: provaId,
    }));

    if (inscricoesParaCriar.length > 0) {
      const { error: erroInscricoes } = await supabase
        .from("inscricoes")
        .insert(inscricoesParaCriar);

      if (erroInscricoes) {
        setMensagem("Atleta salvo, mas erro ao adicionar provas: " + erroInscricoes.message);
        return;
      }
    }

    setMensagem("Atleta criado com sucesso.");
    fecharModal();
    void carregarAtletas();
  }

  async function adicionarProvas() {
    if (!selectedAtleta) return;
    const novasProvas = (formState.provas || []).filter(
      (provaId) =>
        !selectedAtleta.provas.some((prova) => prova.id === provaId)
    );

    if (novasProvas.length === 0) {
      setMensagem("Selecione provas diferentes para adicionar.");
      return;
    }

    const payload = novasProvas.map((provaId) => ({
      atleta_id: selectedAtleta.id,
      prova_id: provaId,
    }));

    const { error } = await supabase.from("inscricoes").insert(payload);

    if (error) {
      setMensagem("Erro ao adicionar provas: " + error.message);
      return;
    }

    setMensagem("Provas adicionadas com sucesso.");
    fecharModal();
    void carregarAtletas();
  }

  async function trocarProva() {
    if (!selectedInscricao || formState.provas.length !== 1) {
      setMensagem("Selecione a nova prova para a troca.");
      return;
    }

    const novaProvaId = formState.provas[0];
    const { error } = await supabase
      .from("inscricoes")
      .update({ prova_id: novaProvaId })
      .eq("id", selectedInscricao.id);

    if (error) {
      setMensagem("Erro ao trocar prova: " + error.message);
      return;
    }

    setMensagem("Prova trocada com sucesso.");
    fecharModal();
    void carregarAtletas();
  }

  async function removerProva(inscricao) {
    const confirmar = window.confirm(
      "Remover esta prova do atleta? Esta ação não pode ser desfeita."
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("inscricoes")
      .delete()
      .eq("id", inscricao.id);

    if (error) {
      setMensagem("Erro ao remover prova: " + error.message);
      return;
    }

    setMensagem("Prova removida com sucesso.");
    void carregarAtletas();
  }

  async function desativarAtleta(atleta) {
    const confirmar = window.confirm(
      "Excluir este atleta do fluxo ativo? Isso removerá o atleta da lista de gerenciamento. Deseja continuar?"
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("atletas")
      .delete()
      .eq("id", atleta.id);

    if (error) {
      setMensagem("Erro ao remover atleta: " + error.message);
      return;
    }

    setMensagem("Atleta removido com sucesso.");
    void carregarAtletas();
  }

  async function substituirAtleta() {
    if (!selectedInscricao || !replacementAtletaId) {
      setMensagem("Selecione o atleta substituto.");
      return;
    }

    const { error } = await supabase
      .from("inscricoes")
      .update({ atleta_id: replacementAtletaId })
      .eq("id", selectedInscricao.id);

    if (error) {
      setMensagem("Erro ao substituir atleta: " + error.message);
      return;
    }

    setMensagem("Atleta substituído com sucesso.");
    fecharModal();
    void carregarAtletas();
  }

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  return (
    <div>
      <h1>Secretaria Técnica</h1>
      <p className="muted">
        Gestão de inscrições, validação técnica e ajustes oficiais de competição.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="filter-grid">
          <input
            value={filtros.nome}
            onChange={(e) =>
              setFiltros((current) => ({ ...current, nome: e.target.value }))
            }
            placeholder="Nome"
          />
          <input
            value={filtros.numero}
            onChange={(e) =>
              setFiltros((current) => ({ ...current, numero: e.target.value }))
            }
            placeholder="Número"
          />
          <input
            value={filtros.escola}
            onChange={(e) =>
              setFiltros((current) => ({ ...current, escola: e.target.value }))
            }
            placeholder="Escola"
          />
          <input
            value={filtros.municipio}
            onChange={(e) =>
              setFiltros((current) => ({ ...current, municipio: e.target.value }))
            }
            placeholder="Município"
          />
          <input
            value={filtros.prova}
            onChange={(e) =>
              setFiltros((current) => ({ ...current, prova: e.target.value }))
            }
            placeholder="Prova"
          />
          <input
            value={filtros.categoria}
            onChange={(e) =>
              setFiltros((current) => ({ ...current, categoria: e.target.value }))
            }
            placeholder="Categoria"
          />
          <input
            value={filtros.naipe}
            onChange={(e) =>
              setFiltros((current) => ({ ...current, naipe: e.target.value }))
            }
            placeholder="Naipe"
          />
        </div>

        <div className="action-row" style={{ marginTop: 16, gap: 12 }}>
          <button onClick={() => abrirModal("novo")}>Novo Atleta</button>
          <button
            className="secondary-button"
            onClick={() => carregarAtletas()}
          >
            Atualizar
          </button>
          <button
            className="secondary-button"
            disabled={loading}
            onClick={() => setPageIndex(0)}
          >
            Ir para página 1
          </button>
        </div>
      </div>

      {mensagem && <div className="alert-info">{mensagem}</div>}

      <div className="card">
        <h2>Gerenciamento de Inscrições</h2>

        {loading ? (
          <p>Carregando atletismo oficial...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Nome</th>
                  <th>Escola</th>
                  <th>Categoria</th>
                  <th>Provas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {atletasFiltrados.map((atleta) => (
                  <tr key={atleta.id}>
                    <td>{atleta.numero || "-"}</td>
                    <td>{atleta.nome}</td>
                    <td>{atleta.escola}</td>
                    <td>{atleta.categoria || "-"}</td>
                    <td>
                      {atleta.provas.length > 0
                        ? atleta.provas.map((prova) => prova.nome).join(" / ")
                        : "Sem prova"}
                    </td>
                    <td className="table-actions">
                      <button
                        className="small-button"
                        onClick={() => abrirModal("editar", atleta)}
                      >
                        Editar
                      </button>
                      <button
                        className="small-button"
                        onClick={() => {
                          abrirModal("adicionar_prova", atleta);
                          setFormState((current) => ({ ...current, provas: [] }));
                        }}
                      >
                        Adicionar Prova
                      </button>
                      <button
                        className="small-button"
                        onClick={() => abrirModal("trocar_prova", atleta, atleta.inscricoes?.[0])}
                      >
                        Trocar Prova
                      </button>
                      <button
                        className="small-button"
                        onClick={() => desativarAtleta(atleta)}
                      >
                        Desativar
                      </button>
                    </td>
                  </tr>
                ))}

                {atletasFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="6" align="center">
                      Nenhum atleta encontrado para os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="action-row" style={{ marginTop: 16, justifyContent: "space-between" }}>
          <span>
            Página {pageIndex + 1} de {totalPages} — {totalRows} atletas carregados
          </span>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="secondary-button"
              disabled={pageIndex <= 0}
              onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
            >
              Anterior
            </button>
            <button
              className="secondary-button"
              disabled={pageIndex >= totalPages - 1}
              onClick={() => setPageIndex((prev) => Math.min(prev + 1, totalPages - 1))}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        titulo={
          modalMode === "novo"
            ? "Novo Atleta"
            : modalMode === "editar"
            ? "Editar Atleta"
            : modalMode === "adicionar_prova"
            ? "Adicionar Prova"
            : modalMode === "trocar_prova"
            ? "Trocar Prova"
            : "Operação"
        }
        onClose={fecharModal}
      >
        {(modalMode === "novo" || modalMode === "editar") && (
          <>
            <div className="field-grid">
              <div>
                <label>Nome</label>
                <input
                  value={formState.nome}
                  onChange={(e) =>
                    setFormState((current) => ({ ...current, nome: e.target.value }))
                  }
                />
              </div>
              <div>
                <label>Data Nascimento</label>
                <input
                  type="date"
                  value={formState.data_nascimento}
                  onChange={(e) =>
                    setFormState((current) => ({
                      ...current,
                      data_nascimento: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label>Município</label>
                <input
                  value={formState.municipio}
                  onChange={(e) =>
                    setFormState((current) => ({ ...current, municipio: e.target.value }))
                  }
                />
              </div>
              <div>
                <label>Categoria</label>
                <input
                  value={formState.categoria}
                  onChange={(e) =>
                    setFormState((current) => ({ ...current, categoria: e.target.value }))
                  }
                />
              </div>
              <div>
                <label>Naipe</label>
                <input
                  value={formState.naipe}
                  onChange={(e) =>
                    setFormState((current) => ({ ...current, naipe: e.target.value }))
                  }
                />
              </div>
              <div>
                <label>Escola</label>
                <select
                  value={formState.escola_id}
                  onChange={(e) =>
                    setFormState((current) => ({ ...current, escola_id: e.target.value }))
                  }
                >
                  <option value="">Selecione a escola</option>
                  {escolas.map((escola) => (
                    <option key={escola.id} value={escola.id}>
                      {escola.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label>Provas</label>
              <div className="tag-list">
                {provas.map((prova) => (
                  <button
                    key={prova.id}
                    type="button"
                    className={
                      formState.provas.includes(prova.id)
                        ? "tag-button selected"
                        : "tag-button"
                    }
                    onClick={() => {
                      setFormState((current) => {
                        const selecionadas = current.provas.includes(prova.id)
                          ? current.provas.filter((id) => id !== prova.id)
                          : [...current.provas, prova.id];
                        return { ...current, provas: selecionadas };
                      });
                    }}
                  >
                    {prova.nome} ({prova.categoria}/{prova.naipe})
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={salvarAtleta}>
                {modalMode === "editar" ? "Salvar alterações" : "Criar atleta"}
              </button>
            </div>
          </>
        )}

        {modalMode === "adicionar_prova" && selectedAtleta && (
          <>
            <p>
              Adicionando prova para <strong>{selectedAtleta.nome}</strong>.
            </p>
            <div className="field-grid">
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Provas</label>
                <div className="tag-list">
                  {provas.map((prova) => (
                    <button
                      key={prova.id}
                      type="button"
                      className={
                        formState.provas.includes(prova.id)
                          ? "tag-button selected"
                          : "tag-button"
                      }
                      onClick={() => {
                        setFormState((current) => {
                          const selecionadas = current.provas.includes(prova.id)
                            ? current.provas.filter((id) => id !== prova.id)
                            : [...current.provas, prova.id];
                          return { ...current, provas: selecionadas };
                        });
                      }}
                    >
                      {prova.nome}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={adicionarProvas}>Salvar provas</button>
            </div>
          </>
        )}

        {modalMode === "trocar_prova" && selectedInscricao && (
          <>
            <p>
              Trocar prova atual para atleta <strong>{selectedAtleta?.nome}</strong>.
            </p>
            <div className="field-grid">
              <div>
                <label>Prova atual</label>
                <input
                  readOnly
                  value={selectedInscricao.provas?.nome || "Sem prova"}
                />
              </div>
              <div>
                <label>Nova prova</label>
                <select
                  value={formState.provas[0] || ""}
                  onChange={(e) =>
                    setFormState((current) => ({
                      ...current,
                      provas: [Number(e.target.value)],
                    }))
                  }
                >
                  <option value="">Selecione</option>
                  {provas.map((prova) => (
                    <option key={prova.id} value={prova.id}>
                      {prova.nome} — {prova.categoria} / {prova.naipe}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={trocarProva}>Confirmar troca</button>
            </div>
          </>
        )}

        {modalMode === "substituir_atleta" && selectedInscricao && (
          <>
            <p>
              Substituir atleta em prova <strong>{selectedInscricao.provas?.nome}</strong>.
            </p>
            <div>
              <label>Atleta substituto</label>
              <select
                value={replacementAtletaId}
                onChange={(e) => setReplacementAtletaId(e.target.value)}
              >
                <option value="">Selecione um atleta</option>
                {atletasEnriquecidos.map((atleta) => (
                  <option key={atleta.id} value={atleta.id}>
                    {atleta.nome} — {atleta.escola}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-footer">
              <button onClick={substituirAtleta}>Confirmar substituição</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
