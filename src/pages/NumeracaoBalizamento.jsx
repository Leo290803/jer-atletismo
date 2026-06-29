import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

const NUMERO_INICIAL = 1;
const TAMANHO_NUMERO_VISUAL = 4;

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatarNumeroCompeticao(numero) {
  if (!numero) return "-";

  const numeroLimpo = String(numero).replace(/\D/g, "");
  if (!numeroLimpo) return "-";

  return numeroLimpo.padStart(TAMANHO_NUMERO_VISUAL, "0");
}

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

function nomeOrdenacao(valor) {
  return normalizarTexto(valor || "");
}

function compararAtletasParaNumeracao(a, b, modo) {
  const municipioA = nomeOrdenacao(municipioDisplay(a));
  const municipioB = nomeOrdenacao(municipioDisplay(b));

  if (municipioA !== municipioB) {
    return municipioA.localeCompare(municipioB, "pt-BR");
  }

  const escolaA = nomeOrdenacao(nomeDaEscola(a));
  const escolaB = nomeOrdenacao(nomeDaEscola(b));

  if (escolaA !== escolaB) {
    return escolaA.localeCompare(escolaB, "pt-BR");
  }

  if (modo === "escola_categoria_naipe") {
    const categoriaA = nomeOrdenacao(a.categoria || "Sem categoria");
    const categoriaB = nomeOrdenacao(b.categoria || "Sem categoria");

    if (categoriaA !== categoriaB) {
      return categoriaA.localeCompare(categoriaB, "pt-BR");
    }

    const naipeA = nomeOrdenacao(a.naipe || "Sem naipe");
    const naipeB = nomeOrdenacao(b.naipe || "Sem naipe");

    if (naipeA !== naipeB) {
      return naipeA.localeCompare(naipeB, "pt-BR");
    }
  }

  return nomeOrdenacao(a.nome).localeCompare(nomeOrdenacao(b.nome), "pt-BR");
}

function proximoNumeroLivre(numerosUsados, inicio = NUMERO_INICIAL) {
  let numero = inicio;

  while (numerosUsados.has(numero)) {
    numero += 1;
  }

  return numero;
}

function construirNumeracaoSequencial(atletasList, modo) {
  const numerosUsados = new Set(
    atletasList
      .map((atleta) => Number(atleta.numero_competicao))
      .filter((numero) => Number.isInteger(numero) && numero > 0)
  );

  let proximoNumero = proximoNumeroLivre(numerosUsados);

  return [...atletasList]
    .filter((atleta) => !atleta.numero_competicao)
    .sort((a, b) => compararAtletasParaNumeracao(a, b, modo))
    .map((atleta) => {
      const numero = proximoNumero;

      numerosUsados.add(numero);
      proximoNumero = proximoNumeroLivre(numerosUsados, numero + 1);

      return {
        id: atleta.id,
        numero_competicao: numero,
      };
    });
}

function construirRegeracaoSequencial(atletasList, modo) {
  let numeroAtual = NUMERO_INICIAL;

  return [...atletasList]
    .sort((a, b) => compararAtletasParaNumeracao(a, b, modo))
    .map((atleta) => {
      const numero = numeroAtual;
      numeroAtual += 1;

      return {
        id: atleta.id,
        numero_competicao: numero,
        numero_entregue: false,
        data_entrega_numero: null,
      };
    });
}

function gerarLinhaProvas(atleta) {
  return atleta.provas?.map((prova) => prova.nome).join(" / ") || "Sem prova";
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
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setMensagem("");

    const [atletasRes, provasRes] = await Promise.all([
      supabase
        .from("atletas")
        .select(
          `id,nome,municipio,categoria,naipe,numero,numero_competicao,numero_entregue,data_entrega_numero,escolas (nome)`
        )
        .order("municipio", { ascending: true })
        .order("nome", { ascending: true }),
      supabase
        .from("provas")
        .select(`id,nome,categoria,naipe`)
        .order("nome", { ascending: true }),
    ]);

    if (atletasRes.error || provasRes.error) {
      const erro = atletasRes.error || provasRes.error;
      setMensagem("Erro ao carregar dados: " + erro.message);
      setCarregando(false);
      return;
    }

    let todasInscricoes = [];
    let from = 0;
    const limite = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("inscricoes")
        .select(`
          id,
          atleta_id,
          prova_id,
          provas (
            id,
            nome,
            categoria,
            naipe
          )
        `)
        .range(from, from + limite - 1);

      if (error) {
        setMensagem("Erro ao carregar inscrições: " + error.message);
        setCarregando(false);
        return;
      }

      todasInscricoes = [...todasInscricoes, ...(data || [])];

      if (!data || data.length < limite) {
        break;
      }

      from += limite;
    }

    setAtletas(atletasRes.data || []);
    setProvas(provasRes.data || []);
    setInscricoes(todasInscricoes);
    setCarregando(false);
  }, []);

  useEffect(() => {
    const salvo = window.localStorage.getItem("numeracaoBalizamentoConfirmado");
    setConfirmado(salvo === "true");
    void carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    window.localStorage.setItem("numeracaoBalizamentoConfirmado", String(confirmado));
  }, [confirmado]);

  const provasMap = useMemo(
    () => new Map(provas.map((prova) => [String(prova.id), prova])),
    [provas]
  );

  const inscricoesPorAtleta = useMemo(() => {
    const mapa = new Map();

    inscricoes.forEach((inscricao) => {
      const atletaId = inscricao.atleta_id;
      if (!atletaId) return;

      const provasList = mapa.get(atletaId) || [];
      const prova = inscricao.provas || provasMap.get(String(inscricao.prova_id));
      if (prova) {
        provasList.push(prova);
      }

      mapa.set(atletaId, provasList);
    });

    return mapa;
  }, [inscricoes, provasMap]);

  const atletasComProvas = useMemo(
    () =>
      atletas.map((atleta) => ({
        ...atleta,
        provas: inscricoesPorAtleta.get(atleta.id) || [],
      })),
    [atletas, inscricoesPorAtleta]
  );

  const municipios = useMemo(
    () => [...new Set(atletas.map(municipioDisplay))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [atletas]
  );

  const escolas = useMemo(
    () =>
      [...new Set(atletas.map((atleta) => nomeDaEscola(atleta)))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [atletas]
  );

  const categorias = useMemo(
    () =>
      [...new Set(atletas.map((atleta) => atleta.categoria || "Sem categoria"))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [atletas]
  );

  const naipes = useMemo(
    () =>
      [...new Set(atletas.map((atleta) => atleta.naipe || "Sem naipe"))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
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

  const atletasOrdenados = useMemo(
    () => [...atletasFiltrados].sort((a, b) => compararAtletasParaNumeracao(a, b, numeroAgrupamento)),
    [atletasFiltrados, numeroAgrupamento]
  );

  const balizamentoPorEscola = useMemo(() => {
    const mapa = new Map();

    atletasOrdenados.forEach((atleta) => {
      const chave = `${municipioDisplay(atleta)} | ${nomeDaEscola(atleta)}`;
      const registro = mapa.get(chave) || {
        municipio: municipioDisplay(atleta),
        escola: nomeDaEscola(atleta),
        atletas: [],
      };

      registro.atletas.push(atleta);
      mapa.set(chave, registro);
    });

    return [...mapa.values()];
  }, [atletasOrdenados]);

  const balizamentoPorProva = useMemo(() => {
    const mapa = new Map();

    atletasOrdenados.forEach((atleta) => {
      (atleta.provas || []).forEach((prova) => {
        const chave = `${prova.nome}|${prova.categoria}|${prova.naipe}`;
        const registro = mapa.get(chave) || {
          prova,
          atletas: [],
        };

        registro.atletas.push(atleta);
        mapa.set(chave, registro);
      });
    });

    return [...mapa.values()].sort((a, b) =>
      `${a.prova.nome} ${a.prova.categoria} ${a.prova.naipe}`.localeCompare(
        `${b.prova.nome} ${b.prova.categoria} ${b.prova.naipe}`,
        "pt-BR"
      )
    );
  }, [atletasOrdenados]);

  const numerosDuplicados = useMemo(() => {
    const mapa = new Map();

    atletas.forEach((atleta) => {
      if (!atleta.numero_competicao) return;

      const numero = Number(atleta.numero_competicao);
      if (!Number.isInteger(numero) || numero <= 0) return;

      const lista = mapa.get(numero) || [];
      lista.push(atleta);
      mapa.set(numero, lista);
    });

    return [...mapa.entries()]
      .filter(([, lista]) => lista.length > 1)
      .map(([numero, lista]) => ({
        numero,
        atletas: lista,
      }));
  }, [atletas]);

  async function atualizarAtletas(atributos) {
    if (atributos.length === 0) return true;

    setSalvando(true);

    const atualizacoes = atributos.map((item) => {
      const dados = {
        numero_competicao: item.numero_competicao,
      };

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

    setSalvando(false);

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

    const planejados = construirNumeracaoSequencial(atletas, numeroAgrupamento);

    if (planejados.length === 0) {
      setMensagem("Todos os atletas já têm numeração de competição.");
      return;
    }

    setMensagem("Gerando numeração sequencial para atletas sem número...");

    const sucesso = await atualizarAtletas(planejados);
    if (!sucesso) return;

    setAtletas((prev) =>
      prev.map((atleta) => {
        const item = planejados.find((numero) => numero.id === atleta.id);
        if (!item) return atleta;

        return {
          ...atleta,
          numero_competicao: item.numero_competicao,
        };
      })
    );

    setMensagem(
      `Numeração gerada com sucesso. ${planejados.length} atleta(s) receberam número.`
    );
  }

  async function regerarNumeracao() {
    if (confirmado) {
      setMensagem("Conferência confirmada. Alterações estão bloqueadas.");
      return;
    }

    const confirmar = window.confirm(
      "Regerar a numeração vai substituir TODOS os números atuais e limpar o status de entrega. Deseja continuar?"
    );

    if (!confirmar) return;

    const planejados = construirRegeracaoSequencial(atletas, numeroAgrupamento);

    if (planejados.length === 0) {
      setMensagem("Nenhuma numeração a ser gerada.");
      return;
    }

    setMensagem("Regerando numeração sequencial geral...");

    const sucesso = await atualizarAtletas(planejados);
    if (!sucesso) return;

    setAtletas((prev) =>
      prev.map((atleta) => {
        const item = planejados.find((numero) => numero.id === atleta.id);
        if (!item) return atleta;

        return {
          ...atleta,
          numero_competicao: item.numero_competicao,
          numero_entregue: false,
          data_entrega_numero: null,
        };
      })
    );

    setMensagem(
      `Numeração regenerada com sucesso. Agora os números vão de ${formatarNumeroCompeticao(
        NUMERO_INICIAL
      )} até ${formatarNumeroCompeticao(planejados.length)}.`
    );
  }

  async function marcarComoEntregue(atleta) {
    if (confirmado) {
      setMensagem("Conferência confirmada. Alterações estão bloqueadas.");
      return;
    }

    const hoje = formatarDataBanco(new Date());

    const { error } = await supabase
      .from("atletas")
      .update({
        numero_entregue: true,
        data_entrega_numero: hoje,
      })
      .eq("id", atleta.id);

    if (error) {
      setMensagem("Erro ao marcar como entregue: " + error.message);
      return;
    }

    setAtletas((prev) =>
      prev.map((item) =>
        item.id === atleta.id
          ? {
              ...item,
              numero_entregue: true,
              data_entrega_numero: hoje,
            }
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

  function limparFiltros() {
    setMunicipioFiltro("");
    setEscolaFiltro("");
    setCategoriaFiltro("");
    setNaipeFiltro("");
    setProvaFiltro("");
  }

  function exportarExcel() {
    const linhas = atletasOrdenados.map((atleta) => ({
      "Número Competição": formatarNumeroCompeticao(atleta.numero_competicao),
      Nome: atleta.nome,
      Município: municipioDisplay(atleta),
      Escola: nomeDaEscola(atleta),
      Categoria: atleta.categoria || "",
      Naipe: atleta.naipe || "",
      "Número Entregue": atleta.numero_entregue ? "Sim" : "Não",
      "Data Entrega": formatarDataBR(atleta.data_entrega_numero),
      "Provas Inscritas": gerarLinhaProvas(atleta),
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(linhas);

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 36 },
      { wch: 20 },
      { wch: 42 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 60 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Numeração");
    XLSX.writeFile(workbook, `numeracao-balizamento-${Date.now()}.xlsx`);
    setMensagem("Exportação Excel concluída.");
  }

  function imprimirRelatorio() {
    window.print();
  }

  const totalComNumeracao = atletasFiltrados.filter((item) => item.numero_competicao).length;
  const totalSemNumeracao = atletasFiltrados.filter((item) => !item.numero_competicao).length;
  const totalEntregaConfirmada = atletasFiltrados.filter((item) => item.numero_entregue).length;

  return (
    <div>
      <style>
        {`
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          @media print {
            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            html,
            body {
              width: 100% !important;
              min-height: 100% !important;
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              font-size: 10pt !important;
              -webkit-print-color-adjust: exact !important;
            }

            .sidebar,
            .nao-imprimir,
            .topbar,
            .toolbar,
            .action-row {
              display: none !important;
            }

            .content {
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: none !important;
            }

            .page-header {
              display: block !important;
              margin: 0 0 12px 0 !important;
              page-break-after: avoid !important;
            }

            .card {
              border: none !important;
              background: white !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 0 16px 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 9pt !important;
              page-break-inside: auto !important;
              break-inside: auto !important;
            }

            thead {
              display: table-header-group !important;
            }

            tfoot {
              display: table-footer-group !important;
            }

            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            th,
            td {
              border: 1px solid black !important;
              padding: 4px 6px !important;
              color: black !important;
              vertical-align: middle !important;
            }

            th {
              background: #f3f4f6 !important;
              color: black !important;
              font-weight: 700 !important;
              -webkit-print-color-adjust: exact !important;
            }

            h1,
            h2,
            h3,
            p {
              color: black !important;
            }

            .quebra-pagina {
              break-after: page !important;
              page-break-after: always !important;
            }

            .quebra-pagina:last-child {
              break-after: auto !important;
              page-break-after: auto !important;
            }
          }

          .print-only {
            display: none;
          }

          .print-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 16px;
          }

          .print-logos {
            display: flex;
            align-items: center;
            gap: 24px;
          }

          .print-logos img {
            max-height: 70px;
            object-fit: contain;
          }

          .print-title {
            flex: 1;
            min-width: 280px;
          }

          .print-title h1 {
            margin: 0 0 8px 0;
            font-size: 22px;
          }

          .print-title p {
            margin: 0;
            font-size: 11pt;
          }

          .print-group {
            margin-bottom: 24px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .school-header {
            font-weight: 700;
            margin-bottom: 10px;
          }

          .print-only table {
            width: 100%;
            border-collapse: collapse;
          }

          .nao-imprimir {
            display: block;
          }

          @media print {
            .print-only {
              display: block !important;
            }

            .nao-imprimir {
              display: none !important;
            }

            .page-header {
              display: none !important;
            }
          }

          .numeracao-status {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 88px;
            border-radius: 999px;
            padding: 5px 10px;
            font-size: 11px;
            font-weight: 800;
          }

          .numeracao-status.ok {
            background: #dcfce7;
            color: #166534;
          }

          .numeracao-status.pending {
            background: #fef3c7;
            color: #92400e;
          }

          .numero-competicao {
            font-weight: 900;
            letter-spacing: 0.08em;
            color: #0f172a;
          }
        `}
      </style>

      <div className="print-only">
        <div className="print-header">
          <div className="print-logos">
            <img src="/logo-jer.png" alt="Jogos Escolares" />
            <img
              src="/logo-idjuv.png"
              alt="IDJUV"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div className="print-title">
            <h1>Relatório de Balizamento por Escola</h1>
            <p>Instituto de Desporto, Juventude e Lazer do Estado de Roraima</p>
          </div>
        </div>

        {balizamentoPorEscola.map((grupo, index) => (
          <section key={`${grupo.municipio}-${grupo.escola}`} className="print-group">
            <div className="school-header">
              <strong>{grupo.escola}</strong> • {grupo.municipio} • {grupo.atletas.length} atleta(s)
            </div>
            <table>
              <thead>
                <tr>
                  <th align="left">Nº</th>
                  <th align="left">Nome</th>
                  <th align="left">Categoria</th>
                  <th align="left">Naipe</th>
                  <th align="left">Provas</th>
                </tr>
              </thead>
              <tbody>
                {grupo.atletas.map((atleta) => (
                  <tr key={atleta.id}>
                    <td className="numero-competicao">
                      {formatarNumeroCompeticao(atleta.numero_competicao)}
                    </td>
                    <td>{atleta.nome}</td>
                    <td>{atleta.categoria || "-"}</td>
                    <td>{atleta.naipe || "-"}</td>
                    <td>{gerarLinhaProvas(atleta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <div className="nao-imprimir">
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h1>Numeração e Balizamento</h1>
          <p className="muted">
            Controle de numeração sequencial, entrega de materiais e relatórios de balizamento.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            <div>
              <label>Município</label>
              <select value={municipioFiltro} onChange={(e) => setMunicipioFiltro(e.target.value)}>
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
              <select value={escolaFiltro} onChange={(e) => setEscolaFiltro(e.target.value)}>
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

          <div style={{ marginTop: 14 }}>
            <button onClick={limparFiltros} style={{ background: "#e2e8f0", color: "#0f172a" }}>
              Limpar Filtros
            </button>
          </div>
        </div>

        <div className="card nao-imprimir" style={{ marginBottom: 20 }}>
          <div
            className="toolbar"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <button onClick={gerarNumeracao} disabled={carregando || salvando || confirmado}>
              {salvando ? "Salvando..." : "Gerar Numeração"}
            </button>

            <button onClick={regerarNumeracao} disabled={carregando || salvando || confirmado}>
              Regerar Numeração
            </button>

            <button onClick={exportarExcel} disabled={carregando}>
              Exportar Excel
            </button>

            <button onClick={imprimirRelatorio}>
              Imprimir Relatório
            </button>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label>Ordenar numeração por</label>
              <select
                value={numeroAgrupamento}
                onChange={(e) => setNumeroAgrupamento(e.target.value)}
                style={{ minWidth: 240 }}
              >
                <option value="escola">Município / Escola / Nome</option>
                <option value="escola_categoria_naipe">
                  Município / Escola / Categoria / Naipe / Nome
                </option>
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

        {numerosDuplicados.length > 0 && (
          <div className="alert-warning" style={{ marginBottom: 18 }}>
            Existem {numerosDuplicados.length} número(s) duplicado(s). Use “Regerar Numeração”
            para corrigir automaticamente.
          </div>
        )}

        {mensagem && (
          <div className="alert-info" style={{ marginBottom: 18 }}>
            {mensagem}
          </div>
        )}

        <div className="card" style={{ marginBottom: 20 }}>
          <h2>Resumo</h2>

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <div>
              <strong>Total de atletas</strong>
              <p>{atletasFiltrados.length}</p>
            </div>

            <div>
              <strong>Atletas com numeração</strong>
              <p>{totalComNumeracao}</p>
            </div>

            <div>
              <strong>Atletas pendentes</strong>
              <p>{totalSemNumeracao}</p>
            </div>

            <div>
              <strong>Entrega confirmada</strong>
              <p>{totalEntregaConfirmada}</p>
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
                  <th className="nao-imprimir" align="center">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {atletasOrdenados.map((atleta) => (
                  <tr key={atleta.id}>
                    <td className="numero-competicao">
                      {formatarNumeroCompeticao(atleta.numero_competicao)}
                    </td>
                    <td>{atleta.nome}</td>
                    <td>{municipioDisplay(atleta)}</td>
                    <td>{nomeDaEscola(atleta)}</td>
                    <td>{atleta.categoria || "-"}</td>
                    <td>{atleta.naipe || "-"}</td>
                    <td>{gerarLinhaProvas(atleta)}</td>
                    <td>
                      {atleta.numero_entregue ? (
                        <span className="numeracao-status ok">
                          Entregue {formatarDataBR(atleta.data_entrega_numero)}
                        </span>
                      ) : (
                        <span className="numeracao-status pending">Pendente</span>
                      )}
                    </td>
                    <td className="nao-imprimir" align="center">
                      <button
                        onClick={() => marcarComoEntregue(atleta)}
                        disabled={atleta.numero_entregue || confirmado || salvando}
                      >
                        Marcar entregue
                      </button>
                    </td>
                  </tr>
                ))}

                {atletasOrdenados.length === 0 && (
                  <tr>
                    <td colSpan="9" align="center">
                      Nenhum atleta encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Balizamento {balizamentoMode === "escola" ? "por Escola" : "por Prova"}</h2>

        {balizamentoMode === "escola" ? (
          balizamentoPorEscola.map((grupo) => (
            <div key={`${grupo.municipio}-${grupo.escola}`} className="quebra-pagina" style={{ marginBottom: 18 }}>
              <h3>{grupo.escola}</h3>
              <p className="muted">
                Município: {grupo.municipio} • {grupo.atletas.length} atleta(s)
              </p>

              <div style={{ overflowX: "auto" }}>
                <table width="100%" cellPadding="8">
                  <thead>
                    <tr>
                      <th align="left">Nº</th>
                      <th align="left">Nome</th>
                      <th align="left">Categoria</th>
                      <th align="left">Naipe</th>
                      <th align="left">Provas</th>
                    </tr>
                  </thead>

                  <tbody>
                    {grupo.atletas.map((atleta) => (
                      <tr key={atleta.id}>
                        <td className="numero-competicao">
                          {formatarNumeroCompeticao(atleta.numero_competicao)}
                        </td>
                        <td>{atleta.nome}</td>
                        <td>{atleta.categoria || "-"}</td>
                        <td>{atleta.naipe || "-"}</td>
                        <td>{gerarLinhaProvas(atleta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          balizamentoPorProva.map((grupo) => (
            <div
              key={`${grupo.prova.nome}-${grupo.prova.categoria}-${grupo.prova.naipe}`}
              className="quebra-pagina"
              style={{ marginBottom: 18 }}
            >
              <h3>{grupo.prova.nome}</h3>
              <p className="muted">
                Categoria: {grupo.prova.categoria} • Naipe: {grupo.prova.naipe} •{" "}
                {grupo.atletas.length} atleta(s)
              </p>

              <div style={{ overflowX: "auto" }}>
                <table width="100%" cellPadding="8">
                  <thead>
                    <tr>
                      <th align="left">Nº</th>
                      <th align="left">Nome</th>
                      <th align="left">Escola</th>
                      <th align="left">Município</th>
                      <th align="left">Categoria</th>
                      <th align="left">Naipe</th>
                    </tr>
                  </thead>

                  <tbody>
                    {grupo.atletas.map((atleta) => (
                      <tr key={atleta.id}>
                        <td className="numero-competicao">
                          {formatarNumeroCompeticao(atleta.numero_competicao)}
                        </td>
                        <td>{atleta.nome}</td>
                        <td>{nomeDaEscola(atleta)}</td>
                        <td>{municipioDisplay(atleta)}</td>
                        <td>{atleta.categoria || "-"}</td>
                        <td>{atleta.naipe || "-"}</td>
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
