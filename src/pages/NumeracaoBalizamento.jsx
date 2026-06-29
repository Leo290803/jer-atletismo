import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

function formatarDataBR(dataISO) {
  if (!dataISO) return "-";

  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return dataISO;

  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();

  return `${dia}/${mes}/${ano}`;
}

function formatarDataBanco(data) {
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function nomeDaEscola(atleta) {
  return atleta.escolas?.nome || "Sem escola";
}

function municipioDisplay(atleta) {
  return atleta.municipio?.trim() || "Sem município";
}

function chaveDeGrupo(atleta, modo) {
  const escola = nomeDaEscola(atleta);
  if (modo === "escola") {
    return escola;
  }

  const categoria = atleta.categoria || "Sem categoria";
  const naipe = atleta.naipe || "Sem naipe";
  return `${escola} | ${categoria} | ${naipe}`;
}

function construirNumeroPorAgrupamento(atletasList, modo) {
  const grupos = [...new Set(atletasList.map((atleta) => chaveDeGrupo(atleta, modo)))].sort();
  const numerosExistentes = new Set(
    atletasList
      .map((atleta) => Number(atleta.numero_competicao))
      .filter((n) => Number.isInteger(n) && n > 0)
  );

  const result = [];
  const blocos = grupos.reduce((acc, item, index) => {
    acc[item] = index * 1000 + 1;
    return acc;
  }, {});

  grupos.forEach((grupo) => {
    const lista = atletasList
      .filter(
        (atleta) => chaveDeGrupo(atleta, modo) === grupo && !atleta.numero_competicao
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    let atual = blocos[grupo];

    lista.forEach((atleta) => {
      while (numerosExistentes.has(atual)) {
        atual += 1;
      }

      result.push({ id: atleta.id, numero_competicao: atual });
      numerosExistentes.add(atual);
      atual += 1;
    });
  });

  return result;
}

function construirRegeracaoPorAgrupamento(atletasList, modo) {
  const grupos = [...new Set(atletasList.map((atleta) => chaveDeGrupo(atleta, modo)))].sort();
  const blocos = grupos.reduce((acc, item, index) => {
    acc[item] = index * 1000 + 1;
    return acc;
  }, {});

  const ordenados = [...atletasList].sort((a, b) => {
    const grupoA = chaveDeGrupo(a, modo);
    const grupoB = chaveDeGrupo(b, modo);

    if (grupoA !== grupoB) return grupoA.localeCompare(grupoB, "pt-BR");
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  const ultimaPosicao = {};
  const numerosExistentes = new Set();

  return ordenados.map((atleta) => {
    const grupo = chaveDeGrupo(atleta, modo);
    if (!ultimaPosicao[grupo]) {
      ultimaPosicao[grupo] = blocos[grupo];
    }

    let numero = ultimaPosicao[grupo];
    while (numerosExistentes.has(numero)) {
      numero += 1;
    }

    numerosExistentes.add(numero);
    ultimaPosicao[grupo] = numero + 1;

    return { id: atleta.id, numero_competicao: numero };
  });
}

export default function NumeracaoBalizamento() {
  const [atletas, setAtletas] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [provas, setProvas] = useState([]);
  const [municipioFiltro, setMunicipioFiltro] = useState("");
  const [escolaFiltro, setEscolaFiltro] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [naipeFiltro, setNaipeFiltro] = useState("");
  const [provaFiltro, setProvaFiltro] = useState("");
  const [numeroAgrupamento, setNumeroAgrupamento] = useState("escola");
  const [balizamentoMode, setBalizamentoMode] = useState("escola");
  const [confirmado, setConfirmado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const salvo = window.localStorage.getItem("numeracaoBalizamentoConfirmado");
    if (salvo === "true") setConfirmado(true);
    void carregarDados();
  }, []);

  useEffect(() => {
    window.localStorage.setItem("numeracaoBalizamentoConfirmado", String(confirmado));
  }, [confirmado]);

  async function carregarDados() {
    setCarregando(true);
    setMensagem("");

    const [atletasRes, provasRes, inscricoesRes] = await Promise.all([
      supabase
        .from("atletas")
        .select(
          `id,nome,municipio,categoria,naipe,numero,numero_competicao,numero_entregue,data_entrega_numero,escolas (nome)`
        )
        .order("municipio", { ascending: true })
        .order("nome", { ascending: true }),
      supabase.from("provas").select(`id,nome,categoria,naipe`).order("nome", { ascending: true }),
      supabase
        .from("inscricoes")
        .select(`id,atleta_id,prova_id,provas(id,nome,categoria,naipe)`),
    ]);

    if (atletasRes.error || provasRes.error || inscricoesRes.error) {
      const erro = atletasRes.error || provasRes.error || inscricoesRes.error;
      setMensagem("Erro ao carregar dados: " + erro.message);
      setCarregando(false);
      return;
    }

    setAtletas(atletasRes.data || []);
    setProvas(provasRes.data || []);
    setInscricoes(inscricoesRes.data || []);
    setCarregando(false);
  }

  const inscricoesPorAtleta = useMemo(() => {
    const mapa = new Map();

    inscricoes.forEach((inscricao) => {
      const atletaId = inscricao.atleta_id;
      if (!atletaId) return;

      const provasList = mapa.get(atletaId) || [];
      if (inscricao.provas) {
        provasList.push(inscricao.provas);
      }

      mapa.set(atletaId, provasList);
    });

    return mapa;
  }, [inscricoes]);

  const atletasComProvas = useMemo(
    () =>
      atletas.map((atleta) => ({
        ...atleta,
        provas: inscricoesPorAtleta.get(atleta.id) || [],
      })),
    [atletas, inscricoesPorAtleta]
  );

  const municipios = useMemo(
    () => [...new Set(atletas.map(municipioDisplay))].sort(),
    [atletas]
  );

  const escolas = useMemo(
    () =>
      [...new Set(atletas.map((atleta) => nomeDaEscola(atleta)))].sort(),
    [atletas]
  );

  const categorias = useMemo(
    () => [...new Set(atletas.map((atleta) => atleta.categoria || "Sem categoria"))].sort(),
    [atletas]
  );

  const naipes = useMemo(
    () => [...new Set(atletas.map((atleta) => atleta.naipe || "Sem naipe"))].sort(),
    [atletas]
  );

  const atletasFiltrados = useMemo(() => {
    return atletasComProvas.filter((atleta) => {
      if (municipioFiltro && municipioDisplay(atleta) !== municipioFiltro) {
        return false;
      }
      if (escolaFiltro && nomeDaEscola(atleta) !== escolaFiltro) {
        return false;
      }
      if (categoriaFiltro && (atleta.categoria || "Sem categoria") !== categoriaFiltro) {
        return false;
      }
      if (naipeFiltro && (atleta.naipe || "Sem naipe") !== naipeFiltro) {
        return false;
      }
      if (
        provaFiltro &&
        !atleta.provas.some((prova) => String(prova.id) === String(provaFiltro))
      ) {
        return false;
      }
      return true;
    });
  }, [atletasComProvas, municipioFiltro, escolaFiltro, categoriaFiltro, naipeFiltro, provaFiltro]);

  const balizamentoPorEscola = useMemo(() => {
    const mapa = new Map();
    atletasFiltrados.forEach((atleta) => {
      const escola = nomeDaEscola(atleta);
      const lista = mapa.get(escola) || [];
      lista.push(atleta);
      mapa.set(escola, lista);
    });
    return [...mapa.entries()].map(([escola, atletasDaEscola]) => ({
      escola,
      atletas: atletasDaEscola,
    }));
  }, [atletasFiltrados]);

  const balizamentoPorProva = useMemo(() => {
    const mapa = new Map();
    atletasFiltrados.forEach((atleta) => {
      (atleta.provas || []).forEach((prova) => {
        const lista = mapa.get(prova.id) || [];
        lista.push({ atleta, prova });
        mapa.set(prova.id, lista);
      });
    });
    return [...mapa.entries()].map(([provaId, itens]) => ({
      prova: itens[0]?.prova || { id: provaId, nome: "Prova" },
      atletas: itens.map((item) => item.atleta),
    }));
  }, [atletasFiltrados]);

  async function atualizarAtletas(atributos) {
    const atualizacoes = atributos.map((item) => {
      const dados = { numero_competicao: item.numero_competicao };
      if (item.numero_entregue !== undefined) {
        dados.numero_entregue = item.numero_entregue;
      }
      if (item.data_entrega_numero !== undefined) {
        dados.data_entrega_numero = item.data_entrega_numero;
      }

      return supabase.from("atletas").update(dados).eq("id", item.id);
    });

    const respostas = await Promise.all(atualizacoes);
    const erro = respostas.find((res) => res.error)?.error;
    if (erro) {
      setMensagem("Erro ao atualizar atletas: " + erro.message);
      return false;
    }

    return true;
  }

  async function gerarNumeracao() {
    if (confirmado) {
      setMensagem("Conferência confirmada. Alterações estão bloqueadas.");
      return;
    }

    const planejados = construirNumeroPorAgrupamento(atletas, numeroAgrupamento);
    if (planejados.length === 0) {
      setMensagem("Todos os atletas já têm numeração de competição.");
      return;
    }

    setMensagem(
      numeroAgrupamento === "escola"
        ? "Gerando numeração por escola..."
        : "Gerando numeração por escola/categoria/naipe..."
    );
    const sucesso = await atualizarAtletas(planejados);
    if (!sucesso) return;

    setAtletas((prev) =>
      prev.map((atleta) => {
        const item = planejados.find((numero) => numero.id === atleta.id);
        if (!item) return atleta;
        return { ...atleta, numero_competicao: item.numero_competicao };
      })
    );

    setMensagem("Numeração gerada com sucesso.");
  }

  async function regerarNumeracao() {
    if (confirmado) {
      setMensagem("Conferência confirmada. Alterações estão bloqueadas.");
      return;
    }

    const planejados = construirRegeracaoPorAgrupamento(atletas, numeroAgrupamento);
    if (planejados.length === 0) {
      setMensagem("Nenhuma numeração a ser gerada.");
      return;
    }

    setMensagem(
      numeroAgrupamento === "escola"
        ? "Regerando numeração por escola..."
        : "Regerando numeração por escola/categoria/naipe..."
    );
    const sucesso = await atualizarAtletas(planejados);
    if (!sucesso) return;

    setAtletas((prev) =>
      prev.map((atleta) => {
        const item = planejados.find((numero) => numero.id === atleta.id);
        if (!item) return atleta;
        return { ...atleta, numero_competicao: item.numero_competicao };
      })
    );

    setMensagem("Numeração regenerada com sucesso.");
  }

  async function marcarComoEntregue(atleta) {
    if (confirmado) {
      setMensagem("Conferência confirmada. Alterações estão bloqueadas.");
      return;
    }

    const hoje = formatarDataBanco(new Date());
    const { error } = await supabase
      .from("atletas")
      .update({ numero_entregue: true, data_entrega_numero: hoje })
      .eq("id", atleta.id);

    if (error) {
      setMensagem("Erro ao marcar como entregue: " + error.message);
      return;
    }

    setAtletas((prev) =>
      prev.map((item) =>
        item.id === atleta.id
          ? { ...item, numero_entregue: true, data_entrega_numero: hoje }
          : item
      )
    );

    setMensagem(`Número de ${atleta.nome} marcado como entregue.`);
  }

  function confirmarConferencia() {
    if (!window.confirm("Confirmar conferência de numeração e balizamento?")) {
      return;
    }

    setConfirmado(true);
    setMensagem("Conferência confirmada. A página está bloqueada para alterações.");
  }

  function desfazerConferencia() {
    setConfirmado(false);
    setMensagem("Conferência desbloqueada. Agora a numeração pode ser gerada novamente.");
  }

  function exportarExcel() {
    const linhas = atletasFiltrados.map((atleta) => ({
      "Número Competição": atleta.numero_competicao || "",
      Nome: atleta.nome,
      Município: municipioDisplay(atleta),
      Escola: nomeDaEscola(atleta),
      Categoria: atleta.categoria || "",
      Naipe: atleta.naipe || "",
      "Número Entregue": atleta.numero_entregue ? "Sim" : "Não",
      "Data Entrega": formatarDataBR(atleta.data_entrega_numero),
      "Provas Inscritas": atleta.provas.map((prova) => prova.nome).join(" | "),
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(linhas);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Numeração");
    XLSX.writeFile(workbook, `numeracao-balizamento-${Date.now()}.xlsx`);
    setMensagem("Exportação Excel concluída.");
  }

  function imprimirRelatorio() {
    window.print();
  }

  return (
    <div>
      <style>
        {`
          @media print {
            body { background:white !important; color:black !important; }
            .sidebar, .nao-imprimir { display:none !important; }
            .content { padding: 0 !important; }
            .card { border:none !important; background:white !important; box-shadow:none !important; }
            table { width:100% !important; border-collapse:collapse !important; }
            th, td { border:1px solid black !important; padding:8px !important; color:black !important; }
            .page-header, .toolbar, .action-row { display:none !important; }
          }
        `}
      </style>

      <div className="nao-imprimir">
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h1>Numeração e Balizamento</h1>
          <p className="muted">
            Controle de numeração por escola, entrega de materiais e relatórios de balizamento.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div>
              <label>Município</label>
              <select
                value={municipioFiltro}
                onChange={(e) => setMunicipioFiltro(e.target.value)}
              >
                <option value="">Todos</option>
                {municipios.map((municipio) => (
                  <option key={municipio} value={municipio}>
                    {municipio}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Escola</label>
              <select
                value={escolaFiltro}
                onChange={(e) => setEscolaFiltro(e.target.value)}
              >
                <option value="">Todas</option>
                {escolas.map((escola) => (
                  <option key={escola} value={escola}>
                    {escola}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Categoria</label>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
              >
                <option value="">Todas</option>
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Naipe</label>
              <select value={naipeFiltro} onChange={(e) => setNaipeFiltro(e.target.value)}>
                <option value="">Todos</option>
                {naipes.map((naipe) => (
                  <option key={naipe} value={naipe}>
                    {naipe}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Prova</label>
              <select value={provaFiltro} onChange={(e) => setProvaFiltro(e.target.value)}>
                <option value="">Todas</option>
                {provas.map((prova) => (
                  <option key={prova.id} value={prova.id}>
                    {prova.nome} - {prova.categoria} - {prova.naipe}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card nao-imprimir" style={{ marginBottom: 20 }}>
          <div
            className="toolbar"
            style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}
          >
            <button onClick={gerarNumeracao} disabled={carregando || confirmado}>
              Gerar Numeração
            </button>
            <button onClick={regerarNumeracao} disabled={carregando || confirmado}>
              Regerar Numeração
            </button>
            <button onClick={exportarExcel}>Exportar Excel</button>
            <button onClick={imprimirRelatorio}>Imprimir Relatório</button>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label>Sequência de numeração</label>
              <select
                value={numeroAgrupamento}
                onChange={(e) => setNumeroAgrupamento(e.target.value)}
                style={{ minWidth: 220 }}
              >
                <option value="escola">Por Escola</option>
                <option value="escola_categoria_naipe">Por Escola / Categoria / Naipe</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label>Balizamento por</label>
              <select
                value={balizamentoMode}
                onChange={(e) => setBalizamentoMode(e.target.value)}
                style={{ minWidth: 170 }}
              >
                <option value="escola">Escola</option>
                <option value="prova">Prova</option>
              </select>
            </div>
            <button onClick={confirmarConferencia} disabled={confirmado}>
              Confirmar Conferência
            </button>
            {confirmado && (
              <button
                className="secondary-button"
                onClick={desfazerConferencia}
                style={{ background: "#ffffff", color: "#0f766e" }}
              >
                Desbloquear Conferência
              </button>
            )}
          </div>
        </div>

        {confirmado && (
          <div className="alert-warning" style={{ marginBottom: 18 }}>
            Conferência confirmada. Você pode desbloquear para gerar ou regenerar numeração.
          </div>
        )}

        {mensagem && <div className="alert-info" style={{ marginBottom: 18 }}>{mensagem}</div>}

        <div className="card" style={{ marginBottom: 20 }}>
          <h2>Resumo</h2>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div>
              <strong>Total de atletas</strong>
              <p>{atletasFiltrados.length}</p>
            </div>
            <div>
              <strong>Atletas com numeração</strong>
              <p>{atletasFiltrados.filter((item) => item.numero_competicao).length}</p>
            </div>
            <div>
              <strong>Atletas pendentes</strong>
              <p>{atletasFiltrados.filter((item) => !item.numero_competicao).length}</p>
            </div>
            <div>
              <strong>Entrega confirmada</strong>
              <p>{atletasFiltrados.filter((item) => item.numero_entregue).length}</p>
            </div>
            <div>
              <strong>Conferência</strong>
              <p>{confirmado ? "Confirmado" : "Pendente"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Atletas e Numeração</h2>

        {carregando ? (
          <p>Carregando dados...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table width="100%" cellPadding="10">
              <thead>
                <tr>
                  <th align="left">Nº</th>
                  <th align="left">Nome</th>
                  <th align="left">Município</th>
                  <th align="left">Escola</th>
                  <th align="left">Categoria</th>
                  <th align="left">Naipe</th>
                  <th align="left">Provas</th>
                  <th align="left">Status entrega</th>
                  <th className="nao-imprimir" align="center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {atletasFiltrados.map((atleta) => (
                  <tr key={atleta.id}>
                    <td>{atleta.numero_competicao || "-"}</td>
                    <td>{atleta.nome}</td>
                    <td>{municipioDisplay(atleta)}</td>
                    <td>{nomeDaEscola(atleta)}</td>
                    <td>{atleta.categoria || "-"}</td>
                    <td>{atleta.naipe || "-"}</td>
                    <td>{atleta.provas.map((prova) => prova.nome).join(" / ") || "Sem prova"}</td>
                    <td>
                      {atleta.numero_entregue ? (
                        <span className="badge badge-success">Entrega confirmada</span>
                      ) : (
                        <span className="badge badge-warning">Pendente</span>
                      )}
                    </td>
                    <td className="nao-imprimir" align="center">
                      <button
                        onClick={() => marcarComoEntregue(atleta)}
                        disabled={atleta.numero_entregue || confirmado}
                      >
                        Marcar entregue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Balizamento {balizamentoMode === "escola" ? "por Escola" : "por Prova"}</h2>

        {balizamentoMode === "escola" ? (
          balizamentoPorEscola.map((grupo) => (
            <div key={grupo.escola} style={{ marginBottom: 18 }}>
              <h3>{grupo.escola}</h3>
              <p className="muted">{grupo.atletas.length} atletas</p>
              <div style={{ overflowX: "auto" }}>
                <table width="100%" cellPadding="8">
                  <thead>
                    <tr>
                      <th align="left">Nº</th>
                      <th align="left">Nome</th>
                      <th align="left">Município</th>
                      <th align="left">Provas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.atletas.map((atleta) => (
                      <tr key={atleta.id}>
                        <td>{atleta.numero_competicao || "-"}</td>
                        <td>{atleta.nome}</td>
                        <td>{municipioDisplay(atleta)}</td>
                        <td>{atleta.provas.map((prova) => prova.nome).join(" / ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          balizamentoPorProva.map((grupo) => (
            <div key={grupo.prova.id} style={{ marginBottom: 18 }}>
              <h3>{grupo.prova.nome}</h3>
              <p className="muted">{grupo.atletas.length} atletas</p>
              <div style={{ overflowX: "auto" }}>
                <table width="100%" cellPadding="8">
                  <thead>
                    <tr>
                      <th align="left">Nº</th>
                      <th align="left">Nome</th>
                      <th align="left">Escola</th>
                      <th align="left">Município</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.atletas.map((atleta) => (
                      <tr key={atleta.id}>
                        <td>{atleta.numero_competicao || "-"}</td>
                        <td>{atleta.nome}</td>
                        <td>{nomeDaEscola(atleta)}</td>
                        <td>{municipioDisplay(atleta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
