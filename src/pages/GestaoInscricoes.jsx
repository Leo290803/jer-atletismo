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

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function idsIguais(a, b) {
  return String(a) === String(b);
}

function getEscolaNome(atleta) {
  return atleta?.escolas?.nome || atleta?.escola || "Sem escola";
}

function getProvasUnicas(inscricoes = []) {
  const mapa = new Map();

  inscricoes.forEach((inscricao) => {
    const prova = inscricao?.provas;
    if (!prova?.id) return;

    if (!mapa.has(String(prova.id))) {
      mapa.set(String(prova.id), prova);
    }
  });

  return [...mapa.values()];
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
  const [salvando, setSalvando] = useState(false);
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
  const [replacementAtletaId, setReplacementAtletaId] = useState("");

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

  const carregarProvas = useCallback(async () => {
    const { data, error } = await supabase
      .from("provas")
      .select("id,nome,categoria,naipe,status")
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
      .select("id,nome,municipio")
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

    const { data: atletasData, error: atletasError, count } = await supabase
      .from("atletas")
      .select(
        `
        id,
        nome,
        numero,
        numero_competicao,
        municipio,
        categoria,
        naipe,
        data_nascimento,
        escola_id,
        escolas (
          id,
          nome
        )
      `,
        { count: "exact" }
      )
      .order("nome", { ascending: true })
      .range(start, end);

    if (atletasError) {
      setMensagem("Erro ao carregar atletas: " + atletasError.message);
      setLoading(false);
      return;
    }

    const atletasPagina = atletasData || [];
    const atletaIds = atletasPagina.map((atleta) => atleta.id).filter(Boolean);
    let inscricoesData = [];

    if (atletaIds.length > 0) {
      const { data, error } = await supabase
        .from("inscricoes")
        .select(
          `
          id,
          atleta_id,
          prova_id,
          provas (
            id,
            nome,
            categoria,
            naipe,
            status
          )
        `
        )
        .in("atleta_id", atletaIds)
        .order("id", { ascending: true });

      if (error) {
        setMensagem("Erro ao carregar inscrições: " + error.message);
        setLoading(false);
        return;
      }

      inscricoesData = data || [];
    }

    const inscricoesPorAtleta = new Map();

    inscricoesData.forEach((inscricao) => {
      const chave = String(inscricao.atleta_id);
      const lista = inscricoesPorAtleta.get(chave) || [];
      lista.push(inscricao);
      inscricoesPorAtleta.set(chave, lista);
    });

    const atletasComInscricoes = atletasPagina.map((atleta) => ({
      ...atleta,
      inscricoes: inscricoesPorAtleta.get(String(atleta.id)) || [],
    }));

    setAtletas(atletasComInscricoes);
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
      escola: getEscolaNome(atleta),
      provas: getProvasUnicas(atleta.inscricoes || []),
    }));
  }, [atletas]);

  const atletasFiltrados = useMemo(() => {
    return atletasEnriquecidos.filter((atleta) => {
      if (filtros.nome && !normalizarTexto(atleta.nome).includes(normalizarTexto(filtros.nome))) {
        return false;
      }

      if (filtros.numero && !String(atleta.numero || atleta.numero_competicao || "").includes(String(filtros.numero))) {
        return false;
      }

      if (filtros.escola && !normalizarTexto(atleta.escola).includes(normalizarTexto(filtros.escola))) {
        return false;
      }

      if (filtros.municipio && !normalizarTexto(atleta.municipio).includes(normalizarTexto(filtros.municipio))) {
        return false;
      }

      if (filtros.categoria && !normalizarTexto(atleta.categoria).includes(normalizarTexto(filtros.categoria))) {
        return false;
      }

      if (filtros.naipe && !normalizarTexto(atleta.naipe).includes(normalizarTexto(filtros.naipe))) {
        return false;
      }

      if (filtros.prova) {
        const provaFiltro = normalizarTexto(filtros.prova);
        return atleta.provas.some((prova) => normalizarTexto(prova.nome).includes(provaFiltro));
      }

      return true;
    });
  }, [atletasEnriquecidos, filtros]);

  function resetForm() {
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

  function abrirModal(mode, atleta = null, inscricao = null) {
    setModalMode(mode);
    setSelectedAtleta(atleta);
    setSelectedInscricao(inscricao);
    setReplacementAtletaId("");
    setMensagem("");

    if (mode === "editar" && atleta) {
      setFormState({
        nome: atleta.nome || "",
        data_nascimento: atleta.data_nascimento || "",
        municipio: atleta.municipio || "",
        escola_id: atleta.escola_id || "",
        categoria: atleta.categoria || "",
        naipe: atleta.naipe || "",
        cpf: atleta.cpf || "",
        provas: (atleta.provas || []).map((prova) => prova.id),
      });
    } else if (mode === "adicionar_prova") {
      resetForm();
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
      resetForm();
    }

    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
    setSelectedAtleta(null);
    setSelectedInscricao(null);
    setReplacementAtletaId("");
    resetForm();
  }

  async function sincronizarInscricoesDoAtleta(atletaId, inscricoesAtuais = [], provasSelecionadas = []) {
    const provasAtuais = new Map();

    inscricoesAtuais.forEach((inscricao) => {
      if (!inscricao.prova_id) return;
      provasAtuais.set(String(inscricao.prova_id), inscricao);
    });

    const provasFinal = [...new Set((provasSelecionadas || []).map((provaId) => String(provaId)).filter(Boolean))];
    const provasFinalSet = new Set(provasFinal);

    const inscricoesParaRemover = inscricoesAtuais.filter(
      (inscricao) => inscricao.prova_id && !provasFinalSet.has(String(inscricao.prova_id))
    );

    const provasParaAdicionar = provasFinal.filter((provaId) => !provasAtuais.has(String(provaId)));

    if (inscricoesParaRemover.length > 0) {
      const idsRemover = inscricoesParaRemover.map((inscricao) => inscricao.id);
      const { error } = await supabase.from("inscricoes").delete().in("id", idsRemover);

      if (error) throw new Error("Erro ao remover provas antigas: " + error.message);
    }

    if (provasParaAdicionar.length > 0) {
      const payload = provasParaAdicionar.map((provaId) => ({
        atleta_id: atletaId,
        prova_id: provaId,
      }));

      const { error } = await supabase.from("inscricoes").insert(payload);

      if (error) throw new Error("Erro ao adicionar novas provas: " + error.message);
    }
  }

  async function salvarAtleta() {
    try {
      setSalvando(true);
      setMensagem("");

      if (!formState.nome.trim()) {
        setMensagem("Informe o nome do atleta.");
        setSalvando(false);
        return;
      }

      const atletaPayload = {
        nome: formState.nome.trim().toUpperCase(),
        data_nascimento: formState.data_nascimento || null,
        municipio: formState.municipio?.trim().toUpperCase() || null,
        escola_id: formState.escola_id || null,
        categoria: formState.categoria || null,
        naipe: formState.naipe || null,
      };

      if (modalMode === "editar" && selectedAtleta) {
        const { error } = await supabase
          .from("atletas")
          .update(atletaPayload)
          .eq("id", selectedAtleta.id);

        if (error) throw new Error("Erro ao atualizar atleta: " + error.message);

        await sincronizarInscricoesDoAtleta(
          selectedAtleta.id,
          selectedAtleta.inscricoes || [],
          formState.provas || []
        );

        setMensagem("Atleta e provas atualizados com sucesso.");
        fecharModal();
        await carregarAtletas();
        return;
      }

      const { data: novoAtleta, error: erroAtleta } = await supabase
        .from("atletas")
        .insert(atletaPayload)
        .select("id")
        .single();

      if (erroAtleta) throw new Error("Erro ao criar atleta: " + erroAtleta.message);

      const provasSelecionadas = [...new Set((formState.provas || []).map((id) => String(id)).filter(Boolean))];

      if (provasSelecionadas.length > 0) {
        const inscricoesParaCriar = provasSelecionadas.map((provaId) => ({
          atleta_id: novoAtleta.id,
          prova_id: provaId,
        }));

        const { error: erroInscricoes } = await supabase.from("inscricoes").insert(inscricoesParaCriar);

        if (erroInscricoes) {
          throw new Error("Atleta salvo, mas erro ao adicionar provas: " + erroInscricoes.message);
        }
      }

      setMensagem("Atleta criado com sucesso.");
      fecharModal();
      await carregarAtletas();
    } catch (erro) {
      setMensagem(erro.message || "Erro ao salvar atleta.");
    } finally {
      setSalvando(false);
    }
  }

  async function adicionarProvas() {
    try {
      if (!selectedAtleta) return;

      setSalvando(true);
      setMensagem("");

      const provasAtuais = new Set((selectedAtleta.provas || []).map((prova) => String(prova.id)));
      const novasProvas = [...new Set((formState.provas || []).map((provaId) => String(provaId)).filter(Boolean))].filter(
        (provaId) => !provasAtuais.has(provaId)
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

      if (error) throw new Error("Erro ao adicionar provas: " + error.message);

      setMensagem("Provas adicionadas com sucesso.");
      fecharModal();
      await carregarAtletas();
    } catch (erro) {
      setMensagem(erro.message || "Erro ao adicionar provas.");
    } finally {
      setSalvando(false);
    }
  }

  async function trocarProva() {
    try {
      if (!selectedInscricao || formState.provas.length !== 1 || !formState.provas[0]) {
        setMensagem("Selecione a nova prova para a troca.");
        return;
      }

      setSalvando(true);
      setMensagem("");

      const novaProvaId = formState.provas[0];
      const { error } = await supabase
        .from("inscricoes")
        .update({ prova_id: novaProvaId })
        .eq("id", selectedInscricao.id);

      if (error) throw new Error("Erro ao trocar prova: " + error.message);

      setMensagem("Prova trocada com sucesso.");
      fecharModal();
      await carregarAtletas();
    } catch (erro) {
      setMensagem(erro.message || "Erro ao trocar prova.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerProva(inscricao) {
    const confirmar = window.confirm("Remover esta prova do atleta? Esta ação não pode ser desfeita.");
    if (!confirmar) return;

    const { error } = await supabase.from("inscricoes").delete().eq("id", inscricao.id);

    if (error) {
      setMensagem("Erro ao remover prova: " + error.message);
      return;
    }

    setMensagem("Prova removida com sucesso.");
    void carregarAtletas();
  }

  async function desativarAtleta(atleta) {
    const confirmar = window.confirm(
      "Remover este atleta do fluxo ativo? Isso apaga o atleta e suas inscrições. Deseja continuar?"
    );
    if (!confirmar) return;

    const { error } = await supabase.from("atletas").delete().eq("id", atleta.id);

    if (error) {
      setMensagem("Erro ao remover atleta: " + error.message);
      return;
    }

    setMensagem("Atleta removido com sucesso.");
    void carregarAtletas();
  }

  async function substituirAtleta() {
    try {
      if (!selectedInscricao || !replacementAtletaId) {
        setMensagem("Selecione o atleta substituto.");
        return;
      }

      setSalvando(true);
      setMensagem("");

      const { error } = await supabase
        .from("inscricoes")
        .update({ atleta_id: replacementAtletaId })
        .eq("id", selectedInscricao.id);

      if (error) throw new Error("Erro ao substituir atleta: " + error.message);

      setMensagem("Atleta substituído com sucesso.");
      fecharModal();
      await carregarAtletas();
    } catch (erro) {
      setMensagem(erro.message || "Erro ao substituir atleta.");
    } finally {
      setSalvando(false);
    }
  }

  function selecionarProva(provaId, permitirMultiplas = true) {
    setFormState((current) => {
      const id = String(provaId);

      if (!permitirMultiplas) {
        return { ...current, provas: [id] };
      }

      const atuais = (current.provas || []).map((item) => String(item));
      const selecionadas = atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id];

      return { ...current, provas: selecionadas };
    });
  }

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  return (
    <div>
      <h1>Secretaria Técnica</h1>
      <p className="muted">Gestão de inscrições, validação técnica e ajustes oficiais de competição.</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="filter-grid">
          <input
            value={filtros.nome}
            onChange={(e) => setFiltros((current) => ({ ...current, nome: e.target.value }))}
            placeholder="Nome"
          />
          <input
            value={filtros.numero}
            onChange={(e) => setFiltros((current) => ({ ...current, numero: e.target.value }))}
            placeholder="Número"
          />
          <input
            value={filtros.escola}
            onChange={(e) => setFiltros((current) => ({ ...current, escola: e.target.value }))}
            placeholder="Escola"
          />
          <input
            value={filtros.municipio}
            onChange={(e) => setFiltros((current) => ({ ...current, municipio: e.target.value }))}
            placeholder="Município"
          />
          <input
            value={filtros.prova}
            onChange={(e) => setFiltros((current) => ({ ...current, prova: e.target.value }))}
            placeholder="Prova"
          />
          <input
            value={filtros.categoria}
            onChange={(e) => setFiltros((current) => ({ ...current, categoria: e.target.value }))}
            placeholder="Categoria"
          />
          <input
            value={filtros.naipe}
            onChange={(e) => setFiltros((current) => ({ ...current, naipe: e.target.value }))}
            placeholder="Naipe"
          />
        </div>

        <div className="action-row" style={{ marginTop: 16, gap: 12 }}>
          <button onClick={() => abrirModal("novo")}>Novo Atleta</button>
          <button className="secondary-button" onClick={() => carregarAtletas()}>
            Atualizar
          </button>
          <button className="secondary-button" disabled={loading} onClick={() => setPageIndex(0)}>
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
                    <td>{atleta.numero || atleta.numero_competicao || "-"}</td>
                    <td>{atleta.nome}</td>
                    <td>{atleta.escola}</td>
                    <td>{atleta.categoria || "-"}</td>
                    <td>
                      {atleta.provas.length > 0
                        ? atleta.provas.map((prova) => prova.nome).join(" / ")
                        : "Sem prova"}
                    </td>
                    <td className="table-actions">
                      <button className="small-button" onClick={() => abrirModal("editar", atleta)}>
                        Editar
                      </button>
                      <button
                        className="small-button"
                        onClick={() => abrirModal("adicionar_prova", atleta)}
                      >
                        Adicionar Prova
                      </button>
                      <button
                        className="small-button"
                        disabled={!atleta.inscricoes?.length}
                        onClick={() => abrirModal("trocar_prova", atleta, atleta.inscricoes?.[0])}
                      >
                        Trocar Prova
                      </button>
                      <button className="small-button" onClick={() => desativarAtleta(atleta)}>
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
            Página {pageIndex + 1} de {totalPages} — {totalRows} atletas no banco
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
            : modalMode === "substituir_atleta"
            ? "Substituir Atleta"
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
                  onChange={(e) => setFormState((current) => ({ ...current, nome: e.target.value }))}
                />
              </div>
              <div>
                <label>Data Nascimento</label>
                <input
                  type="date"
                  value={formState.data_nascimento}
                  onChange={(e) =>
                    setFormState((current) => ({ ...current, data_nascimento: e.target.value }))
                  }
                />
              </div>
              <div>
                <label>Município</label>
                <input
                  value={formState.municipio}
                  onChange={(e) => setFormState((current) => ({ ...current, municipio: e.target.value }))}
                />
              </div>
              <div>
                <label>Categoria</label>
                <input
                  value={formState.categoria}
                  onChange={(e) => setFormState((current) => ({ ...current, categoria: e.target.value }))}
                />
              </div>
              <div>
                <label>Naipe</label>
                <input
                  value={formState.naipe}
                  onChange={(e) => setFormState((current) => ({ ...current, naipe: e.target.value }))}
                />
              </div>
              <div>
                <label>Escola</label>
                <select
                  value={formState.escola_id}
                  onChange={(e) => setFormState((current) => ({ ...current, escola_id: e.target.value }))}
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
              <label>Provas do atleta</label>
              <div className="tag-list">
                {provas.map((prova) => (
                  <button
                    key={prova.id}
                    type="button"
                    className={formState.provas.map(String).includes(String(prova.id)) ? "tag-button selected" : "tag-button"}
                    onClick={() => selecionarProva(prova.id, true)}
                  >
                    {prova.nome} ({prova.categoria}/{prova.naipe})
                  </button>
                ))}
              </div>
            </div>

            {modalMode === "editar" && selectedAtleta?.inscricoes?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <label>Remoção rápida</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {selectedAtleta.inscricoes.map((inscricao) => (
                    <div
                      key={inscricao.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: 8,
                      }}
                    >
                      <span>{inscricao.provas?.nome || "Prova não encontrada"}</span>
                      <button className="small-button" onClick={() => removerProva(inscricao)}>
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button onClick={salvarAtleta} disabled={salvando}>
                {salvando ? "Salvando..." : modalMode === "editar" ? "Salvar alterações" : "Criar atleta"}
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
                      className={formState.provas.map(String).includes(String(prova.id)) ? "tag-button selected" : "tag-button"}
                      onClick={() => selecionarProva(prova.id, true)}
                    >
                      {prova.nome} ({prova.categoria}/{prova.naipe})
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={adicionarProvas} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar provas"}
              </button>
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
                <input readOnly value={selectedInscricao.provas?.nome || "Sem prova"} />
              </div>
              <div>
                <label>Nova prova</label>
                <select
                  value={formState.provas[0] || ""}
                  onChange={(e) => selecionarProva(e.target.value, false)}
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
              <button onClick={trocarProva} disabled={salvando}>
                {salvando ? "Salvando..." : "Confirmar troca"}
              </button>
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
              <select value={replacementAtletaId} onChange={(e) => setReplacementAtletaId(e.target.value)}>
                <option value="">Selecione um atleta</option>
                {atletasEnriquecidos.map((atleta) => (
                  <option key={atleta.id} value={atleta.id}>
                    {atleta.nome} — {atleta.escola}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-footer">
              <button onClick={substituirAtleta} disabled={salvando}>
                {salvando ? "Salvando..." : "Confirmar substituição"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
