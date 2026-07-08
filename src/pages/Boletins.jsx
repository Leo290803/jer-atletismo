import { useState } from "react";
import { supabase } from "../lib/supabase";
import { getNumeroAtleta } from "../utils/getNumeroAtleta";
import { agruparResultadosEquipe, ehRevezamento } from "./sumulas/utils/revezamento";

const COMITE_HONRA = [
  ["Francisco dos Santos Sampaio", "Governador do Estado de Roraima"],
  ["Marcio Oliveira Sousa", "Presidente do Instituto de Desporto, Juventude e Lazer do Estado de Roraima"],
  ["Lara Magalhaes Avelino", "Diretora de Esportes do IDJUV"],
  ["Fabiano Vieira da Silva", "Diretor Administrativo e Financeiro do IDJUV"],
  ["Brenno Luiz de Mello Carvalho", "Diretor de Juventude do IDJUV"],
];

const APOIADORES = [
  ["Ana Celia de Oliveira Paz", "Secretaria Estadual de Educacao e Desporto de Roraima"],
  ["Thiago Fernandes Amorim", "Secretaria de Estado das Cidades, Desenvolvimento Urbano e Gestao de Convenios"],
  ["Gregorio Almeida Junior", "Secretaria de Estado de Infraestrutura de Roraima"],
  ["Raimundo Nonato Carneiro de Mesquita", "Secretaria do Trabalho e Bem-Estar Social"],
  ["Katiana Queiroz de Magalhaes Prola", "Reitora do Instituto de Educacao de Roraima"],
  ["Joao Alfredo de Souza Cruz", "Secretario de Estado da Saude de Roraima"],
  ["Lilian Andreia Oliveira da Silva", "Secretaria de Estado da Cultura e Turismo de Roraima"],
  ["Valdeane Alves de Oliveira", "Comandante-Geral da Policia Militar de Roraima"],
  ["Anderson Carvalho de Matos", "Comandante-Geral do Corpo de Bombeiros Militar de Roraima"],
  ["Antonio Diego Parente Aragao", "Departamento Estadual de Transito de Roraima"],
  ["Roberto Pereira Angrizani", "General de Brigada Comandante da 1a Brigada de Infantaria de Selva"],
];

const COMISSAO_TECNICA = [
  ["Gean Carlos Menezes de Oliveira", "Coordenacao Geral JERs", "95 99114-0369"],
  ["Nelcivania Farias de Lima", "Coordenacao de Credenciamento", "95 99113-8857"],
  ["Enilson Ferreira Lima", "Gerencia Operacional", "95 99154-3034"],
  ["Leonardo Arthur Pereira", "Secretaria Geral", "95 99141-8880"],
  ["Rock James Silva de Oliveira", "Coordenacao de Apuracao e Divulgacao", "95 98112-8976"],
  ["Darlan Paulino da Silva Filho", "Coordenacao de Comunicacao", "61 99609-4795"],
  ["Ana Claudia Pereira Coelho", "Coordenacao de Alimentacao", "95 99119-3433"],
  ["Jovane Vieira de Almeida", "Coordenacao de Alojamento", "95 99144-6182"],
  ["Lucas Guilherme Ferreira", "Coordenacao de Cerimonial", "95 99147-2733"],
  ["Amaro de Lima Junior", "Coordenacao de Saude", "95 99971-3178"],
  ["Adeilton dos Santos Lopes", "Coordenacao de Transporte", "95 99111-6925"],
  ["Ronei de Lima Borges", "Coordenacao de Seguranca", "95 99116-4200"],
  ["Nedson Brito", "Coordenacao de Arbitragem", "95 99134-7794"],
];

const COMISSAO_DISCIPLINAR = [
  ["Jose Deodato de Aquino Junior", "Presidente", "95 99113-4444"],
  ["Sheffany Graziela Rodrigues de Brito", "Secretaria", "95 99150-7797"],
  ["Arnobio Gustavo Queiroz de Magalhaes", "Membro", "95 99146-1752"],
  ["Joao Vitor Loreto dos Santos", "Membro", "95 98124-2933"],
  ["Jonathas Augusto Apolonio Goncalves Vieira", "Membro", "95 98111-5343"],
  ["Josiel Vieira Leite", "Membro", "95 98801-3937"],
  ["Raphael Mendes de Matos", "Membro", "95 98118-2229"],
];

const COORDENADORES_ARBITRAGEM = [
  ["Edivaldo da Silva Pereira", "Atletismo Olimpico", "95 99134-6453"],
  ["Nelma Menezes de Oliveira Lima", "Atletismo Paralimpico", "92 8261-5704"],
  ["Ademir Soares de Oliveira", "Bocha Paralimpica", "95 99171-1064"],
  ["Raimundo Ribeiro de Moraes", "Badminton Olimpico", "95 99129-0560"],
  ["Raquel Maia Melo Nascimento", "Badminton Paralimpico", "95 99125-6100"],
  ["Lucas Vinicius Farias Silva", "Basquetebol", "95 98101-7946"],
  ["Adriano Paulino da Silva", "Ciclismo", "95 99142-3182"],
  ["Taizila Ramalho Pereira", "Futebol", "95 99123-1094"],
  ["Rafael Carvalho da Silva", "Futsal", "95 99114-2531"],
  ["Caroline Maduro", "Ginastica Ritmica", "95 98414-3003"],
  ["Marcos Antonio Lima Quadros", "Handebol", "95 99130-0917"],
  ["Jonathas Apolonio", "Judo", "95 98111-5343"],
  ["Dionnatan dos Santos Costa", "Karate", "95 9124-2430"],
  ["Astrea Marinho", "Natacao Olimpico", "95 98122-3410"],
  ["Mateus Lima Antony", "Natacao Paralimpico", "95 8125-1618"],
  ["Fernando Luiz Eiji de Lucena Imagawa", "Tenis de Mesa Olimpico", "95 99133-2934"],
  ["Joao Gabriel Magalhaes Araujo", "Tenis de Mesa Paralimpico", "95 99118-1662"],
  ["Sandro da Silva Araujo", "Taekwondo", "95 99963-6222"],
  ["Ronys Silva Batista", "Tiro com Arco", "95 98105-4582"],
  ["Nedson Silva de Brito", "Voleibol", "95 99134-7794"],
  ["Nedson Silva de Brito", "Volei de Praia", "95 99134-7794"],
  ["Jarbas Sousa Aguiar", "Xadrez", "95 99123-6761"],
  ["Anderson Rogerio Torres Braga", "Wrestling", "95 8415-6791"],
];


const LAYOUT_BOLETIM_PADRAO = {
  tituloJogos: "53º JOGOS ESCOLARES DE RORAIMA 2026",
  numeroPrefixo: "BOLETIM Nº",
  modalidade: "ATLETISMO",
  coordenador: "EDIVALDO PEREIRA DA SILVA",
  telefone: "(95) 99134-6453",
  local: "RORAIMA - 2026",
  mostrarPaginasIniciais: false,
  boletimCompactoImpressao: true,
  margemInternaMm: 8,
  fonteTabelaPx: 9.5,
  tituloCapaPx: 42,
  tituloJogosPx: 23,
  cabecalhoTitulo: "JOGOS ESCOLARES DE RORAIMA - JER 2026",
  cabecalhoSubtitulo: "BOLETIM OFICIAL DE RESULTADOS",
  cabecalhoModalidade: "Atletismo",
  instituicaoCabecalho: "Instituto de Desporto, Juventude e Lazer do Estado de Roraima - IDJUV-RR",
  rodapeEsquerda: "@IDJUVRORAIMA\nWWW.JOGOSESCOLARESDERORAIMA.COM",
  rodapeDireita: "IDJUV - GOVERNO DE RORAIMA",
  logoEsquerda: "/logo-idjuv.png",
  logoDireita: "/logo-jer.png",
  logoCabecalhoEsquerda: "/logo-jer.png",
  logoCabecalhoDireita: "/logo-idjuv.png",
  alturaLogoCapaPx: 78,
  alturaLogoCabecalhoPx: 76,
  alturaLogoResultadoPx: 38,
  rodapeFaixaImagem: "",
  alturaFaixaRodapePx: 92,
  usarModeloFundo: false,
  modeloCapaImagem: "",
  modeloPaginaImagem: "",
  modeloResultadosImagem: "",
  ocultarArtePadraoComModelo: true,
  modeloWordArquivo: "",
  modeloWordNome: "",
};

function carregarLayoutBoletimSalvo() {
  try {
    const salvo = window.localStorage.getItem("layout_boletim_atletismo");
    return salvo ? { ...LAYOUT_BOLETIM_PADRAO, ...JSON.parse(salvo) } : LAYOUT_BOLETIM_PADRAO;
  } catch {
    return LAYOUT_BOLETIM_PADRAO;
  }
}

export default function Boletins() {
  const hoje = new Date().toISOString().slice(0, 10);

  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  const [numeroBoletim, setNumeroBoletim] = useState("0001");
  const [layoutBoletim, setLayoutBoletim] = useState(carregarLayoutBoletimSalvo);
  const [mostrarEditorLayout, setMostrarEditorLayout] = useState(false);
  const [editarNoDocumento, setEditarNoDocumento] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [fasesSelecionadas, setFasesSelecionadas] = useState([]); // vazio = todas
  const [proximasFasesPorOrigem, setProximasFasesPorOrigem] = useState({});
  const [mensagem, setMensagem] = useState("");

  function atualizarLayoutBoletim(campo, valor) {
    setLayoutBoletim((atual) => ({ ...atual, [campo]: valor }));
  }

  function atualizarTextoLayout(campo, valor) {
    atualizarLayoutBoletim(campo, valor.replace(/\u00a0/g, " ").trim());
  }

  function arquivoParaDataUrl(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = reject;
      leitor.readAsDataURL(arquivo);
    });
  }

  async function trocarImagemLayout(campo, arquivo) {
    if (!arquivo) return;

    const imagem = await arquivoParaDataUrl(arquivo);
    atualizarLayoutBoletim(campo, imagem);
  }

  function restaurarImagemLayout(campo, valorPadrao) {
    atualizarLayoutBoletim(campo, valorPadrao);
  }

  async function anexarModeloWord(arquivo) {
    if (!arquivo) return;

    const dados = await arquivoParaDataUrl(arquivo);
    const novoLayout = {
      ...layoutBoletim,
      modeloWordArquivo: dados,
      modeloWordNome: arquivo.name,
    };

    setLayoutBoletim(novoLayout);

    try {
      window.localStorage.setItem("layout_boletim_atletismo", JSON.stringify(novoLayout));
      setMensagem("Modelo Word anexado e salvo neste computador.");
    } catch {
      setMensagem("Modelo Word anexado nesta tela, mas o arquivo e grande demais para salvar no navegador.");
    }
  }

  function limparModeloWord() {
    setLayoutBoletim((atual) => ({
      ...atual,
      modeloWordArquivo: "",
      modeloWordNome: "",
    }));
    setMensagem("Modelo Word removido.");
  }

  function baixarModeloWord() {
    if (!layoutBoletim.modeloWordArquivo) return;

    const link = document.createElement("a");
    link.href = layoutBoletim.modeloWordArquivo;
    link.download = layoutBoletim.modeloWordNome || "modelo-boletim.docx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function salvarLayoutBoletim() {
    window.localStorage.setItem("layout_boletim_atletismo", JSON.stringify(layoutBoletim));
    setMensagem("Layout do boletim salvo neste computador.");
  }

  function alternarEdicaoDocumento() {
    if (editarNoDocumento) {
      window.localStorage.setItem("layout_boletim_atletismo", JSON.stringify(layoutBoletim));
      setMensagem("Edicao do documento concluida e layout salvo.");
    }

    setEditarNoDocumento((valor) => !valor);
  }

  function restaurarLayoutBoletim() {
    setLayoutBoletim(LAYOUT_BOLETIM_PADRAO);
    window.localStorage.removeItem("layout_boletim_atletismo");
    setMensagem("Layout padrao restaurado.");
  }

  async function carregarBoletim() {
    setMensagem("Carregando boletim do período...");

    const { data, error } = await supabase
      .from("resultados")
      .select(`
        *,
        series (
          numero_serie
        ),
        provas (
          id,
          nome,
          categoria,
          naipe,
          fase,
          tipo,
          subtipo
        ),
        inscricoes (
          atletas (
            numero,
            numero_competicao,
            nome,
            municipio,
            escolas (
              nome
            )
          )
        )
      `)
      .gte("data_resultado", dataInicio)
      .lte("data_resultado", dataFim)
      .eq("publicado", true)
      .order("data_resultado", { ascending: true })
      .order("colocacao", { ascending: true });

    if (error) {
      setMensagem("Erro ao carregar boletim: " + error.message);
      return;
    }

    const resultadosCarregados = deduplicarResultadosBoletim(data || []);

    // Para cada PROVA presente no boletim, buscar TODAS as series e raias
    // (com atleta), para (1) preencher o numero da raia e (2) incluir atletas
    // da serie que ainda nao tem resultado lancado — assim a serie aparece
    // completa no boletim, igual a sumula.
    const idsProvasParaSeries = [...new Set(resultadosCarregados.map((r) => r.prova_id || r.provas?.id).filter(Boolean))];

    if (idsProvasParaSeries.length > 0) {
      const { data: seriesData, error: erroSeries } = await supabase
        .from("series")
        .select(
          "id,numero_serie,prova_id,raias(id,raia,ordem,inscricao_id,inscricoes(id,atletas(numero,numero_competicao,nome,municipio,escolas(nome))))"
        )
        .in("prova_id", idsProvasParaSeries);

      if (!erroSeries && seriesData) {
        // Mapa de resultados existentes por serie+inscricao (para nao duplicar)
        const chavesComResultado = new Set(
          resultadosCarregados.map((r) => `${r.serie_id}|${r.inscricao_id}`)
        );

        // Dados da prova, por id, para preencher os registros virtuais
        const provaPorId = {};
        // Data do resultado real por prova: o virtual DEVE herdar a mesma data,
        // senao o boletim cria um grupo separado (fantasma) com a data do filtro.
        const dataResultadoPorProva = {};
        resultadosCarregados.forEach((r) => {
          const pid = r.prova_id || r.provas?.id;
          if (pid && r.provas && !provaPorId[pid]) provaPorId[pid] = r.provas;
          if (pid && r.data_resultado && !dataResultadoPorProva[pid]) {
            dataResultadoPorProva[pid] = r.data_resultado;
          }
        });

        // Mapa de raia por serie+inscricao (para preencher r.raia dos resultados existentes)
        const mapaRaia = {};

        seriesData.forEach((serie) => {
          (serie.raias || []).forEach((raia) => {
            const chave = `${serie.id}|${raia.inscricao_id}`;
            mapaRaia[chave] = raia.raia;

            // Se este atleta ainda nao tem resultado, cria registro virtual
            if (!chavesComResultado.has(chave) && raia.inscricao_id) {
              resultadosCarregados.push({
                id: `virtual-${raia.id}`,
                virtual: true,
                prova_id: serie.prova_id,
                serie_id: serie.id,
                inscricao_id: raia.inscricao_id,
                data_resultado: dataResultadoPorProva[serie.prova_id] || dataInicio,
                publicado: true,
                colocacao: null,
                qualificacao: null,
                tempo: null,
                melhor_marca: null,
                resultado_final: null,
                raia: raia.raia,
                series: { numero_serie: serie.numero_serie },
                provas: provaPorId[serie.prova_id] || null,
                inscricoes: { atletas: raia.inscricoes?.atletas },
              });
            }
          });
        });

        // Preenche o numero da raia nos resultados reais
        resultadosCarregados.forEach((r) => {
          const chave = `${r.serie_id}|${r.inscricao_id}`;
          if (r.raia === undefined || r.raia === null) {
            r.raia = mapaRaia[chave] ?? null;
          }
        });
      }
    }

    const idsProvas = [...new Set(resultadosCarregados.map((r) => r.provas?.id).filter(Boolean))];
    const mapaProximasFases = {};

    if (idsProvas.length > 0) {
      const { data: proximasFases } = await supabase
        .from("provas")
        .select("id, prova_origem_id, fase")
        .in("prova_origem_id", idsProvas);

      (proximasFases || []).forEach((prova) => {
        if (!prova.prova_origem_id || mapaProximasFases[prova.prova_origem_id]) return;
        mapaProximasFases[prova.prova_origem_id] = prova.fase || "PROXIMA FASE";
      });
    }

    setProximasFasesPorOrigem(mapaProximasFases);
    setResultados(resultadosCarregados);

    if (!resultadosCarregados.length) {
      setMensagem("Nenhum resultado publicado encontrado nesse período.");
    } else {
      setMensagem(`Boletim carregado com ${resultadosCarregados.length} resultado(s) publicado(s).`);
    }
  }

  // Boletim de LARGADA (start list): monta a partir de provas + series + raias,
  // sem depender de resultados. Mostra todos os atletas com resultado vazio.
  async function carregarStartList() {
    setMensagem("Gerando boletim de largada (start list)...");

    const { data: provasData, error: erroProvas } = await supabase
      .from("provas")
      .select("id,nome,categoria,naipe,fase,tipo,subtipo");

    if (erroProvas) {
      setMensagem("Erro ao carregar provas: " + erroProvas.message);
      return;
    }

    const provaPorId = {};
    (provasData || []).forEach((p) => {
      provaPorId[p.id] = p;
    });

    const idsProvas = (provasData || []).map((p) => p.id);
    if (idsProvas.length === 0) {
      setResultados([]);
      setMensagem("Nenhuma prova cadastrada.");
      return;
    }

    const { data: seriesData, error: erroSeries } = await supabase
      .from("series")
      .select(
        "id,numero_serie,prova_id,raias(id,raia,ordem,inscricao_id,inscricoes(id,atletas(numero,numero_competicao,nome,municipio,escolas(nome))))"
      )
      .in("prova_id", idsProvas);

    if (erroSeries) {
      setMensagem("Erro ao carregar séries: " + erroSeries.message);
      return;
    }

    const registros = [];

    (seriesData || []).forEach((serie) => {
      const prova = provaPorId[serie.prova_id];
      if (!prova) return;

      (serie.raias || []).forEach((raia) => {
        if (!raia.inscricao_id) return;

        registros.push({
          id: `startlist-${raia.id}`,
          virtual: true,
          prova_id: serie.prova_id,
          serie_id: serie.id,
          inscricao_id: raia.inscricao_id,
          data_resultado: dataInicio,
          publicado: true,
          colocacao: null,
          qualificacao: null,
          tempo: null,
          melhor_marca: null,
          resultado_final: null,
          raia: raia.raia,
          series: { numero_serie: serie.numero_serie },
          provas: prova,
          inscricoes: { atletas: raia.inscricoes?.atletas },
        });
      });
    });

    setProximasFasesPorOrigem({});
    setResultados(registros);

    if (!registros.length) {
      setMensagem("Nenhuma série com atletas encontrada. Gere as séries das provas primeiro.");
    } else {
      setMensagem(`Boletim de largada gerado com ${registros.length} atleta(s) em ${seriesData.length} série(s).`);
    }
  }

  async function publicarTudoDoPeriodo() {
    const confirmar = window.confirm(
      `Deseja publicar todos os resultados de ${dataInicio} até ${dataFim}?`
    );

    if (!confirmar) return;

    setMensagem("Publicando todos os resultados do período...");

    const { error } = await supabase
      .from("resultados")
      .update({ publicado: true })
      .gte("data_resultado", dataInicio)
      .lte("data_resultado", dataFim);

    if (error) {
      setMensagem("Erro ao publicar tudo: " + error.message);
      return;
    }

    setMensagem("Todos os resultados do período foram publicados.");
    carregarBoletim();
  }

  async function despublicarTudoDoPeriodo() {
    const confirmar = window.confirm(
      `Deseja DESPUBLICAR todos os resultados de ${dataInicio} até ${dataFim}? Eles sairão do boletim, mas não serão apagados.`
    );

    if (!confirmar) return;

    setMensagem("Despublicando resultados do período...");

    const { error } = await supabase
      .from("resultados")
      .update({ publicado: false })
      .gte("data_resultado", dataInicio)
      .lte("data_resultado", dataFim);

    if (error) {
      setMensagem("Erro ao despublicar: " + error.message);
      return;
    }

    setResultados([]);
    setProximasFasesPorOrigem({});
    setMensagem("Resultados despublicados com sucesso.");
  }

  async function excluirResultadosDoPeriodo() {
    const confirmacao = window.prompt(
      `ATENÇÃO: isso vai EXCLUIR os resultados de ${dataInicio} até ${dataFim}. Digite EXCLUIR para confirmar.`
    );

    if (confirmacao !== "EXCLUIR") {
      setMensagem("Exclusão cancelada.");
      return;
    }

    setMensagem("Excluindo resultados do período...");

    const { error } = await supabase
      .from("resultados")
      .delete()
      .gte("data_resultado", dataInicio)
      .lte("data_resultado", dataFim);

    if (error) {
      setMensagem("Erro ao excluir: " + error.message);
      return;
    }

    setResultados([]);
    setProximasFasesPorOrigem({});
    setMensagem("Resultados excluídos com sucesso.");
  }

  function resultadoFinal(r) {
    return r.tempo || r.melhor_marca || r.resultado_final || r.marca || "-";
  }

  // Resultado esportivo REAL: tempo, marca ou tentativas lancadas.
  // Colocacao e qualificacao sozinhas NAO contam — evita mostrar serie
  // "classificada" no boletim antes de existir tempo/marca de verdade.
  function temResultadoReal(r) {
    return [
      r.tempo,
      r.melhor_marca,
      r.resultado_final,
      r.marca,
      r.tentativa1,
      r.tentativa2,
      r.tentativa3,
      r.tentativa4,
      r.tentativa5,
      r.tentativa6,
    ].some((valor) => valor !== null && valor !== undefined && String(valor).trim() !== "" && String(valor).trim() !== "-");
  }

  function serieTemResultadoReal(serie) {
    return (serie?.resultados || []).some(temResultadoReal);
  }

  // Prova de campo (salto/arremesso) => tem tentativas para exibir.
  function ehProvaDeCampo(prova) {
    return (
      prova?.tipo === "campo" ||
      prova?.subtipo === "campo_tentativas" ||
      prova?.subtipo === "salto_altura"
    );
  }

  // Linha das tentativas numeradas: "1ª: 5.20 · 2ª: 5.45 · 3ª: X · 4ª: 5.51"
  // Detecta se a prova e salto em altura (formato de alturas O/X, diferente
  // do arremesso/lancamento que usa marcas nas tentativas).
  function ehSaltoAltura(prova) {
    const subtipo = String(prova?.subtipo || "").toLowerCase();
    const nome = String(prova?.nome || "").toLowerCase();
    return subtipo.includes("salto_altura") || nome.includes("salto em altura");
  }

  // Monta a linha de alturas do salto em altura: "1,15: O · 1,20: XO · 1,25: XXX"
  // Aceita os dois formatos de dados usados no sistema:
  //  - objeto: { "1.15": ["O","X",""], "1.20": [...] }  (sumula digital)
  //  - array:  [ { altura: "1.15", valor: "O" }, ... ]  (sumula de lancamento)
  function alturasCompactas(r) {
    const dados = r?.alturas;
    if (!dados) return "";

    const porAltura = {}; // { "1.15": "O", "1.20": "XO", ... }

    if (Array.isArray(dados)) {
      // Formato array: cada item tem { altura, valor }
      dados.forEach((item) => {
        const alt = String(item?.altura ?? "").trim();
        const val = String(item?.valor ?? "").trim().toUpperCase();
        if (!alt || !val) return;
        porAltura[alt] = (porAltura[alt] || "") + val;
      });
    } else if (typeof dados === "object") {
      // Formato objeto: { "1.15": ["O","X",""] }
      Object.keys(dados).forEach((alt) => {
        const tentativas = Array.isArray(dados[alt]) ? dados[alt] : [];
        const seq = tentativas
          .map((t) => String(t ?? "").trim().toUpperCase())
          .filter((t) => t !== "")
          .join("");
        if (seq) porAltura[alt.trim()] = seq;
      });
    }

    const alturas = Object.keys(porAltura);
    if (!alturas.length) return "";

    // Ordena por altura crescente e formata (ponto -> virgula)
    alturas.sort((a, b) => parseFloat(a) - parseFloat(b));
    return alturas
      .map((alt) => `${String(alt).replace(".", ",")}: ${porAltura[alt]}`)
      .join("  ·  ");
  }

  function tentativasCompactas(r) {
    const brutas = [r.tentativa1, r.tentativa2, r.tentativa3, r.tentativa4, r.tentativa5, r.tentativa6];

    // Descobre ate qual tentativa vale a pena mostrar (ultima preenchida)
    let ultimaComValor = -1;
    brutas.forEach((v, i) => {
      if (String(v ?? "").trim() !== "") ultimaComValor = i;
    });

    if (ultimaComValor < 0) return ""; // nenhuma tentativa preenchida

    const ordinais = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª"];
    const partes = [];
    for (let i = 0; i <= ultimaComValor; i += 1) {
      const t = String(brutas[i] ?? "").trim();
      partes.push(`${ordinais[i]}: ${t === "" ? "-" : t}`);
    }

    return partes.join("  ·  ");
  }

  function medalha(pos) {
    if (pos === 1) return "OURO";
    if (pos === 2) return "PRATA";
    if (pos === 3) return "BRONZE";
    return "";
  }

  function ehFinalDaProva(fase) {
    return ["FINAL", "FINAL POR TEMPO"].includes(fase || "");
  }

  function formatarData(data) {
    if (!data) return "";
    const [ano, mes, dia] = String(data).split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function periodoFormatado() {
    const inicio = formatarData(dataInicio);
    const fim = formatarData(dataFim);
    return inicio === fim ? inicio : `${inicio} ate ${fim}`;
  }

  function resultadoTemValor(r) {
    return [
      r.tempo,
      r.melhor_marca,
      r.resultado_final,
      r.marca,
      r.colocacao,
      r.qualificacao,
      r.tentativa1,
      r.tentativa2,
      r.tentativa3,
      r.tentativa4,
      r.tentativa5,
      r.tentativa6,
      r.status && r.status !== "OK" ? r.status : "",
    ].filter((valor) => valor !== null && valor !== undefined && valor !== "").length;
  }

  function deduplicarResultadosBoletim(lista) {
    const mapa = new Map();

    (lista || []).forEach((r) => {
      const atleta = r.inscricoes?.atletas;
      const chave = [
        r.prova_id || r.provas?.id || "sem-prova",
        r.serie_id || r.series?.numero_serie || "sem-serie",
        r.inscricao_id || getNumeroAtleta(atleta) || atleta?.nome || "sem-atleta",
        r.data_resultado || "sem-data",
      ].join("|");

      const atual = mapa.get(chave);

      if (!atual || resultadoTemValor(r) >= resultadoTemValor(atual)) {
        mapa.set(chave, r);
      }
    });

    return Array.from(mapa.values());
  }

  function agruparPorProva(lista) {
    const grupos = {};

    lista.forEach((r) => {
      const p = r.provas;
      const idProva = p?.id || r.prova_id || "sem-prova";

      const chave = `${r.data_resultado} | ${idProva} | ${p?.nome} | ${p?.categoria} | ${p?.naipe} | ${
        p?.fase || "QUALIFICAÇÃO"
      }`;

      if (!grupos[chave]) {
        grupos[chave] = {
          data: r.data_resultado,
          prova: p,
          resultados: [],
        };
      }

      grupos[chave].resultados.push(r);
    });

    return Object.values(grupos)
      .map((grupo) =>
        ehRevezamento(grupo.prova)
          ? { ...grupo, resultados: agruparResultadosEquipe(grupo.resultados) }
          : grupo
      )
      .sort((a, b) => {
        if (a.data !== b.data) {
          return String(a.data).localeCompare(String(b.data));
        }

        return String(a.prova?.nome || "").localeCompare(
          String(b.prova?.nome || "")
        );
      });
  }

  function agruparPorSerieBoletim(lista) {
    const grupos = {};

    lista.forEach((r) => {
      const numeroSerie = r.series?.numero_serie || "Sem serie";
      const chave = String(numeroSerie);

      if (!grupos[chave]) {
        grupos[chave] = {
          numeroSerie,
          resultados: [],
        };
      }

      grupos[chave].resultados.push(r);
    });

    return Object.values(grupos).sort((a, b) => {
      const serieA = Number(a.numeroSerie);
      const serieB = Number(b.numeroSerie);

      if (Number.isFinite(serieA) && Number.isFinite(serieB)) {
        return serieA - serieB;
      }

      return String(a.numeroSerie).localeCompare(String(b.numeroSerie));
    });
  }

  function ordenarResultados(lista, final) {
    return [...lista].sort((a, b) => {
      if (final) {
        const ca = a.colocacao || 9999;
        const cb = b.colocacao || 9999;
        if (ca !== cb) return ca - cb;
        return (Number(a.raia) || 9999) - (Number(b.raia) || 9999);
      }

      const sa = a.series?.numero_serie || 1;
      const sb = b.series?.numero_serie || 1;

      if (sa !== sb) return sa - sb;

      // Dentro da serie: se ha colocacao lancada, usa a colocacao;
      // senao, ordena pela raia (igual a sumula: 1,2,3...).
      const ca = a.colocacao || null;
      const cb = b.colocacao || null;

      if (ca && cb) return ca - cb;
      if (ca && !cb) return -1;
      if (!ca && cb) return 1;

      return (Number(a.raia) || 9999) - (Number(b.raia) || 9999);
    });
  }

  function ordemQualificacao(valor) {
    if (valor === "Q") return 1;
    if (valor === "q") return 2;
    return 3;
  }

  function obterClassificadosProximaFase(lista) {
    return [...(lista || [])]
      .filter((r) => r.qualificacao)
      .sort((a, b) => {
        const ordemA = ordemQualificacao(a.qualificacao);
        const ordemB = ordemQualificacao(b.qualificacao);
        if (ordemA !== ordemB) return ordemA - ordemB;

        const serieA = Number(a.series?.numero_serie || 9999);
        const serieB = Number(b.series?.numero_serie || 9999);
        if (serieA !== serieB) return serieA - serieB;

        const colocacaoA = Number(a.colocacao || 9999);
        const colocacaoB = Number(b.colocacao || 9999);
        if (colocacaoA !== colocacaoB) return colocacaoA - colocacaoB;

        return String(a.inscricoes?.atletas?.nome || "").localeCompare(
          String(b.inscricoes?.atletas?.nome || "")
        );
      });
  }

  function formatarFaseClassificados(fase) {
    const texto = String(fase || "PROXIMA FASE").toUpperCase();
    if (texto.includes("SEMI")) return "SEMI-FINAL";
    return texto;
  }

  function tituloClassificadosProximaFase(grupo) {
    const faseDestino = formatarFaseClassificados(proximasFasesPorOrigem[grupo.prova?.id]);
    const prova = grupo.prova || {};
    const dadosProva = [prova.nome, prova.categoria, prova.naipe].filter(Boolean).join(" - ");
    return `ATLETAS QUALIFICADOS PARA ${faseDestino} - PROVA ${dadosProva}`;
  }


  function escaparHtml(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function htmlListaAtletasEquipe(r) {
    const titulares = (r.equipeAtletas || []).map(
      (a) => `${escaparHtml(getNumeroAtleta(a))} - ${escaparHtml(a?.nome || "")}`
    );
    const reservas = (r.equipeReservas || []).map(
      (a) =>
        `<span style="font-style:italic">${escaparHtml(getNumeroAtleta(a))} - ${escaparHtml(a?.nome || "")} (reserva)</span>`
    );

    return [...titulares, ...reservas].join("<br/>");
  }

  function campoPaginaWord() {
    return '<span style="mso-element:field-begin"></span>' +
      '<span style="mso-spacerun:yes"> </span>PAGE' +
      '<span style="mso-element:field-separator"></span>' +
      '<span>1</span>' +
      '<span style="mso-element:field-end"></span>';
  }

  function gerarWord() {
    const estilos = [
      '@page WordSection1 { size: 21cm 29.7cm; margin: 1cm 0.65cm 1.15cm 0.65cm; mso-footer: f1; }',
      'body { font-family: Arial, sans-serif; color: #111827; font-size: 7.8pt; }',
      'div.WordSection1 { page: WordSection1; }',
      '.word-footer { mso-element: footer; id: f1; text-align: center; color: #64748b; font-size: 7pt; border-top: 1px solid #cbd5e1; padding-top: 3px; }',
      'h1 { margin: 0 0 1px; text-align: center; font-size: 12.5pt; color: #003b73; }',
      'h2 { margin: 0 0 4px; text-align: center; font-size: 9pt; color: #111827; }',
      'h3 { margin: 6px 0 3px; font-size: 8.2pt; color: #003b73; }',
      'h4 { margin: 3px 0 2px; font-size: 7.5pt; color: #111827; }',
      'p { margin: 0 0 2px; }',
      '.cabecalho-documento { margin-bottom: 5px; padding-bottom: 3px; border-bottom: 1px solid #003b73; }',
      '.meta { text-align: center; font-size: 7.2pt; color: #334155; }',
      '.secao { margin-top: 4px; }',
      '.serie-bloco { page-break-inside: avoid; break-inside: avoid; margin-bottom: 3px; }',
      '.classificados-bloco { page-break-inside: avoid; break-inside: avoid; margin: 12px 0 4px; }',
      '.titulo-classificados-word { width: 82%; margin: 8px auto 9px; padding: 2px 4px; background: #d9d9d9; color: #111827; text-align: center; font-size: 7.8pt; font-weight: bold; text-transform: uppercase; }',
      'table { width: 100%; border-collapse: collapse; margin: 2px 0 4px; table-layout: fixed; }',
      '.resultados-word { page-break-inside: avoid; break-inside: avoid; }',
      '.resultados-word tr { page-break-inside: avoid; break-inside: avoid; }',
      'th, td { border: 0.6px solid #334155; padding: 1px 2px; vertical-align: middle; word-wrap: break-word; line-height: 1.02; }',
      'th { background: #e5edf7; color: #0f172a; font-size: 6.8pt; font-weight: bold; text-transform: uppercase; }',
      'td { font-size: 7pt; }',
      '.col-pos { width: 7%; text-align: center; }',
      '.col-raia { width: 6%; text-align: center; }',
      '.col-num { width: 7%; text-align: center; }',
      '.col-atleta { width: 28%; }',
      '.col-escola { width: 27%; }',
      '.col-municipio { width: 13%; }',
      '.col-resultado { width: 10%; text-align: center; }',
      '.linha-tentativas-word { font-size: 0.95em; color: #334155; margin-top: 2px; font-weight: 600; }',
      '.col-extra { width: 10%; text-align: center; }',
      '.classificados-word .col-num { width: 8%; }',
      '.classificados-word .col-atleta { width: 37%; }',
      '.classificados-word .col-escola { width: 42%; }',
      '.classificados-word .col-tempo { width: 13%; text-align: center; }',
      '.resultado-nao-publicado { margin: 2px 0 4px; padding: 3px 5px; border: 0.6px dashed #64748b; font-size: 7pt; color: #334155; }'
    ].join('\n');

    const rodapeWord = '<div class="word-footer">Pagina ' + campoPaginaWord() + '</div>';

    const secoes = grupos.map((grupo) => {
      const fase = grupo.prova?.fase || 'QUALIFICACAO';
      const final = ehFinalDaProva(fase);
      const resultadosOrdenados = ordenarResultados(grupo.resultados, final);
      const seriesDaProva = agruparPorSerieBoletim(resultadosOrdenados);
      const titulo = formatarData(grupo.data) + ' - ' +
        (grupo.prova?.nome || '') + ' - ' +
        (grupo.prova?.categoria || '') + ' - ' +
        (grupo.prova?.naipe || '') + ' - ' + fase;

      const conteudoSeries = seriesDaProva.map((serie) => (
        '<div class="serie-bloco">' +
          '<h4>Serie ' + serie.numeroSerie + '</h4>' +
          gerarTabelaResultados(serie.resultados, serieTemResultadoReal(serie), ehProvaDeCampo(grupo.prova), ehSaltoAltura(grupo.prova)) +
        '</div>'
      )).join('');
      const classificadosProximaFase = obterClassificadosProximaFase(resultadosOrdenados);
      const conteudoClassificados = !final && classificadosProximaFase.length && resultadosOrdenados.some(temResultadoReal)
        ? '<div class="classificados-bloco"><div class="titulo-classificados-word">' +
          escaparHtml(tituloClassificadosProximaFase(grupo)) +
          '</div>' +
          gerarTabelaClassificados(classificadosProximaFase) +
          '</div>'
        : '';
      const conteudo = final
        ? '<h4>Classificacao geral</h4>' + gerarTabelaResultados(resultadosOrdenados, true, ehProvaDeCampo(grupo.prova), ehSaltoAltura(grupo.prova))
        : conteudoSeries + conteudoClassificados;

      return '<div class="secao"><h3>' + escaparHtml(titulo) + '</h3>' + conteudo + '</div>';
    }).join('');

    const html = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
      '<head><meta charset="utf-8"><title>Boletim Oficial de Resultados</title><style>', estilos, '</style></head>',
      '<body><div class="WordSection1">',
      rodapeWord,
      '<div class="cabecalho-documento">',
      '<h1>' + escaparHtml(layoutBoletim.cabecalhoTitulo || 'JOGOS ESCOLARES DE RORAIMA - JER 2026') + '</h1>',
      '<h2>' + escaparHtml(layoutBoletim.cabecalhoSubtitulo || 'BOLETIM OFICIAL DE RESULTADOS') + '</h2>',
      '<p class="meta"><strong>Modalidade:</strong> ' + escaparHtml(layoutBoletim.cabecalhoModalidade || 'Atletismo') +
        ' &nbsp; | &nbsp; <strong>Periodo:</strong> ' + escaparHtml(periodoFormatado()) +
        ' &nbsp; | &nbsp; <strong>Boletim:</strong> ' + escaparHtml(numeroBoletim || '0001') + '</p>',
      '</div>',
      secoes,
      '</div></body></html>'
    ].join('');

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Boletim-Resultados-' + (numeroBoletim || '0001') + '-' + dataInicio + '-a-' + dataFim + '.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMensagem('Word com resultados gerado sem capa e com numeracao de paginas.');
  }

  function gerarTabelaResultados(resultadosTabela, mostrarColocacao = true, provaDeCampo = false, ehSaltoAlturaProva = false) {
    if (!resultadosTabela.length) {
      return '<div class="resultado-nao-publicado">Resultado ainda nao publicado.</div>';
    }

    return `
      <table class="resultados-word">
        <thead>
          <tr>
            <th class="col-pos">Colocacao</th>
            ${provaDeCampo ? "" : '<th class="col-raia">Raia</th>'}
            <th class="col-num">N&ordm;</th>
            <th class="col-atleta">Atleta / Equipe</th>
            <th class="col-escola">Escola</th>
            <th class="col-municipio">Municipio</th>
            <th class="col-resultado">Resultado</th>
          </tr>
        </thead>
        <tbody>
          ${resultadosTabela
            .map((r, i) => {
              const atleta = r.inscricoes?.atletas;
              const ehEquipe = !!r.equipe;
              const colocacao = mostrarColocacao
                ? (r.colocacao ? `${r.colocacao}&ordm;` : `${i + 1}&ordm;`)
                : "-";
              const classificacao = mostrarColocacao && r.qualificacao ? ` <strong>${escaparHtml(r.qualificacao)}</strong>` : "";
              const nomeCol = ehEquipe ? htmlListaAtletasEquipe(r) : escaparHtml(atleta?.nome || "");
              const tentativas = ehSaltoAlturaProva ? alturasCompactas(r) : (provaDeCampo ? tentativasCompactas(r) : "");
              const nomeComTentativas = tentativas
                ? nomeCol + '<div class="linha-tentativas-word">' + escaparHtml(tentativas) + '</div>'
                : nomeCol;
              const raiaValor = (r.raia === null || r.raia === undefined) ? "-" : r.raia;
              return `
                <tr>
                  <td class="col-pos">${colocacao}${classificacao}</td>
                  ${provaDeCampo ? "" : `<td class="col-raia">${raiaValor}</td>`}
                  <td class="col-num">${ehEquipe ? "" : getNumeroAtleta(atleta)}</td>
                  <td class="col-atleta">${nomeComTentativas}</td>
                  <td class="col-escola">${escaparHtml(atleta?.escolas?.nome || "")}</td>
                  <td class="col-municipio">${escaparHtml(atleta?.municipio || "")}</td>
                  <td class="col-resultado">${resultadoFinal(r)}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  function gerarTabelaClassificados(classificados) {
    return `
      <table class="resultados-word classificados-word">
        <thead>
          <tr>
            <th class="col-num">N&ordm;</th>
            <th class="col-atleta">Nome</th>
            <th class="col-escola">Escola</th>
            <th class="col-tempo">Tempo/Marca</th>
          </tr>
        </thead>
        <tbody>
          ${classificados
            .map((r) => {
              const atleta = r.inscricoes?.atletas;
              const ehEquipe = !!r.equipe;
              const tempoMarca = r.tempo || r.melhor_marca || r.marca || r.resultado_final || "";
              return `
                <tr>
                  <td class="col-num">${ehEquipe ? "" : escaparHtml(getNumeroAtleta(atleta))}</td>
                  <td class="col-atleta">${ehEquipe ? htmlListaAtletasEquipe(r) : escaparHtml(atleta?.nome || "")}</td>
                  <td class="col-escola">${escaparHtml(atleta?.escolas?.nome || "")}</td>
                  <td class="col-tempo">${escaparHtml(String(tempoMarca))}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  function imprimir() {
    document.body.classList.add("imprimindo-boletim-oficial");

    if (layoutBoletim.boletimCompactoImpressao) {
      document.body.classList.add("boletim-compacto-impressao");
    } else {
      document.body.classList.remove("boletim-compacto-impressao");
    }

    const limparClasse = () => {
      document.body.classList.remove("imprimindo-boletim-oficial");
      document.body.classList.remove("boletim-compacto-impressao");
      window.removeEventListener("afterprint", limparClasse);
    };

    window.addEventListener("afterprint", limparClasse);

    window.setTimeout(() => {
      window.print();
    }, 150);
  }

  const gruposTodos = agruparPorProva(resultados);

  // Normaliza a fase para agrupar variacoes (ex.: "SEMI-FINAL"/"SEMI FINAL")
  function normalizarFaseBoletim(fase) {
    const f = String(fase || "QUALIFICACAO")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim();
    if (f.includes("SEMI")) return "SEMI-FINAL";
    if (f.startsWith("FINAL") || f === "FINAL POR TEMPO" || f === "FINAL DIRETA") return "FINAL";
    if (f.includes("QUALIF")) return "QUALIFICACAO";
    return f;
  }

  // Rotulo amigavel para exibir no filtro
  const rotuloFase = (f) =>
    ({ "SEMI-FINAL": "Semifinais", FINAL: "Finais", QUALIFICACAO: "Qualificatórias" }[f] || f);

  // Fases realmente presentes nos resultados carregados
  const fasesDisponiveis = [
    ...new Set(gruposTodos.map((g) => normalizarFaseBoletim(g.prova?.fase))),
  ].sort();

  // Aplica o filtro: se nenhuma fase marcada, mostra todas.
  const grupos =
    fasesSelecionadas.length === 0
      ? gruposTodos
      : gruposTodos.filter((g) => fasesSelecionadas.includes(normalizarFaseBoletim(g.prova?.fase)));

  function alternarFase(fase) {
    setFasesSelecionadas((atual) =>
      atual.includes(fase) ? atual.filter((f) => f !== fase) : [...atual, fase]
    );
  }

  // Fonte de tabela na impressão: nunca abaixo de 9px (~6.8pt) para manter legibilidade no papel.
  const fonteTabelaImpressao = Math.max(9, Number(layoutBoletim.fonteTabelaPx) || 9.5);

  return (
    <div className={`boletim-pagina ${layoutBoletim.boletimCompactoImpressao ? "boletim-compacto" : ""}`}>
      <style>
        {`
          .boletim-pagina {
            max-width: 1120px;
            margin: 0 auto;
            padding: 20px 18px 40px;
            color: #0f172a;
            font-family: Inter, system-ui, sans-serif;
          }

          .boletim-pagina .card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
          }


          .pagina-inicial,
          .pagina-institucional {
            min-height: 980px;
            position: relative;
            overflow: hidden;
            padding: 48px 64px 96px;
            margin-bottom: 12px;
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 0;
            page-break-after: always;
          }

          .pagina-modelo-fundo {
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
          }

          .pagina-modelo-fundo .conteudo-modelo {
            position: relative;
            z-index: 2;
          }

          .pagina-modelo-fundo.ocultar-arte-padrao .logos-capa-modelo,
          .pagina-modelo-fundo.ocultar-arte-padrao .faixa-atletismo,
          .pagina-modelo-fundo.ocultar-arte-padrao .silhuetas-atletismo,
          .pagina-modelo-fundo.ocultar-arte-padrao .rodape-azul-modelo,
          .pagina-modelo-fundo.ocultar-arte-padrao .cabecalho-institucional,
          .pagina-modelo-fundo.ocultar-arte-padrao .linha-azul-institucional {
            display: none !important;
          }

          .pagina-inicial {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .logos-capa-modelo {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 82px;
            width: 100%;
            margin-top: 18px;
          }

          .logos-capa-modelo img {
            max-width: 190px;
            max-height: 78px;
            object-fit: contain;
          }

          .titulo-jogos-modelo {
            margin-top: 76px;
            font-family: Impact, Haettenschweiler, 'Arial Black', sans-serif;
            font-size: 31px;
            line-height: 1.1;
            color: #050505;
            letter-spacing: 0.01em;
          }

          .boletim-modelo-numero {
            margin-top: 88px;
            font-family: Impact, Haettenschweiler, 'Arial Black', sans-serif;
            font-size: 58px;
            line-height: 1;
            color: #0000ff;
            letter-spacing: 0.02em;
          }

          .boletim-modelo-modalidade {
            margin-top: 24px;
            font-family: Impact, Haettenschweiler, 'Arial Black', sans-serif;
            font-size: 42px;
            color: #050505;
            letter-spacing: 0.02em;
          }

          .coordenador-capa {
            margin-top: 50px;
            width: 320px;
            text-align: left;
            font-family: 'Times New Roman', serif;
            font-size: 16px;
            color: #050505;
          }

          .coordenador-capa p {
            margin: 0 0 9px;
          }

          .local-capa {
            margin-top: auto;
            margin-bottom: 74px;
            font-family: 'Times New Roman', serif;
            font-size: 18px;
            font-weight: 700;
          }

          .faixa-atletismo {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 58px;
            height: 92px;
            background:
              linear-gradient(165deg, transparent 0 16%, #facc15 17% 22%, transparent 23%),
              linear-gradient(170deg, transparent 0 26%, #ef4444 27% 32%, transparent 33%),
              linear-gradient(164deg, transparent 0 38%, #22c55e 39% 52%, transparent 53%),
              linear-gradient(170deg, transparent 0 52%, #84cc16 53% 66%, transparent 67%),
              linear-gradient(90deg, #ffffff 0%, #fef3c7 22%, #bbf7d0 52%, #d9f99d 74%, #0ea5e9 100%);
            border-top: 1px solid #e2e8f0;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          }

          .faixa-atletismo-customizada {
            border-top: none;
          }

          .botao-rodape-documento {
            position: absolute;
            right: 10px;
            top: 10px;
            z-index: 8;
            border: 0;
            border-radius: 999px;
            padding: 5px 10px;
            background: #f59e0b;
            color: #111827;
            font-size: 11px;
            font-weight: 800;
            cursor: pointer;
          }

          .silhuetas-atletismo {
            position: absolute;
            right: 42px;
            bottom: 72px;
            display: flex;
            align-items: flex-end;
            gap: 18px;
          }

          .silhueta {
            width: 58px;
            height: 42px;
            border-radius: 50% 50% 38% 38%;
            background: #083344;
            transform: skewX(-18deg) rotate(-8deg);
          }

          .silhueta:nth-child(2) {
            width: 72px;
            height: 52px;
          }

          .rodape-azul-modelo {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 58px;
            display: grid;
            grid-template-columns: 1fr 70px 1fr;
            align-items: center;
            padding: 0 28px;
            background: #0067b1;
            color: #ffffff;
            font-size: 12px;
            font-weight: 800;
          }

          .rodape-azul-modelo strong {
            justify-self: center;
            font-size: 20px;
            font-style: italic;
          }

          .rodape-azul-modelo span:last-child {
            justify-self: end;
          }

          .cabecalho-institucional {
            display: grid;
            grid-template-columns: 120px 1fr 120px;
            align-items: center;
            gap: 18px;
            text-align: center;
          }

          .cabecalho-institucional img {
            max-height: 76px;
            max-width: 120px;
            object-fit: contain;
          }

          .cabecalho-institucional strong {
            display: block;
            font-size: 12px;
            color: #0f172a;
          }

          .cabecalho-institucional span {
            display: block;
            margin-top: 3px;
            font-size: 10px;
            color: #111827;
          }

          .linha-azul-institucional {
            height: 2px;
            background: #0000ff;
            margin: 10px 0 14px;
          }

          .titulo-institucional {
            margin: 0 0 20px;
            text-align: center;
            font-size: 15px;
            color: #111827;
            font-weight: 800;
          }

          .subtitulo-institucional {
            margin: 22px 0 14px;
            text-align: center;
            font-size: 14px;
            color: #111827;
            font-weight: 800;
          }

          .lista-pessoas {
            display: grid;
            gap: 10px;
            text-align: center;
            font-size: 13px;
            color: #111827;
          }

          .lista-pessoas strong {
            display: block;
            font-weight: 800;
          }

          .lista-pessoas span {
            display: block;
          }

          .tabela-institucional {
            width: 100%;
            border-collapse: collapse;
            margin-top: 18px;
            font-size: 12.5px;
          }

          .tabela-institucional td {
            padding: 5px 8px;
            border: none;
            vertical-align: top;
          }

          .tabela-institucional td:first-child {
            width: 38%;
            font-weight: 700;
          }

          .tabela-institucional td:nth-child(2) {
            width: 40%;
          }

          .tabela-institucional td:last-child {
            width: 22%;
            text-align: right;
          }

          .capa-boletim {
            min-height: 980px;
            position: relative;
            overflow: hidden;
            padding: 42px 46px;
            margin-bottom: 28px;
            border: 1px solid #bfdbfe;
            border-radius: 20px;
            background:
              linear-gradient(135deg, rgba(14, 165, 233, 0.16), rgba(34, 197, 94, 0.08) 36%, rgba(255, 255, 255, 0.96) 37%),
              #ffffff;
            page-break-after: always;
          }

          .capa-boletim::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 12px;
            background: linear-gradient(90deg, #0f3f7f, #0ea5e9, #22c55e, #facc15);
          }

          .capa-topo {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 24px;
          }

          .capa-topo img {
            height: 82px;
            width: auto;
            object-fit: contain;
          }

          .capa-centro {
            min-height: 620px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }

          .capa-evento {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.12em;
            color: #0f3f7f;
          }

          .capa-titulo {
            margin: 18px 0 0;
            font-size: 58px;
            line-height: 1;
            letter-spacing: 0.04em;
            color: #0f172a;
          }

          .capa-numero {
            margin-top: 14px;
            font-size: 32px;
            font-weight: 900;
            color: #1d4ed8;
          }

          .capa-modalidade-app {
            margin-top: 34px;
            padding: 16px 34px;
            border: 2px solid #0f3f7f;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.82);
            color: #0f3f7f;
            font-size: 34px;
            font-weight: 900;
            letter-spacing: 0.08em;
          }

          .capa-dados {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-top: 34px;
            width: 100%;
          }

          .capa-dado {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 14px;
            background: rgba(255, 255, 255, 0.88);
          }

          .capa-dado span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .capa-dado strong {
            display: block;
            margin-top: 8px;
            color: #0f172a;
            font-size: 18px;
          }

          .capa-rodape-app {
            position: absolute;
            left: 46px;
            right: 46px;
            bottom: 34px;
            display: flex;
            justify-content: space-between;
            gap: 18px;
            color: #334155;
            font-weight: 800;
          }

          .cabecalho-boletim {
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            padding: 22px 24px;
            margin-bottom: 28px;
            background: #ffffff;
          }

          .cabecalho-logos {
            display: grid;
            grid-template-columns: 1fr minmax(320px, 2.7fr) 1fr;
            align-items: center;
            gap: 12px;
            margin-bottom: 18px;
          }

          .cabecalho-logos img {
            width: auto;
            height: 66px;
            object-fit: contain;
          }

          .boletim-titulo {
            text-align: center;
          }

          .boletim-titulo h2,
          .boletim-titulo h3 {
            margin: 0;
          }

          .boletim-titulo h2 {
            font-size: 22px;
            letter-spacing: 0.02em;
            line-height: 1.2;
          }

          .boletim-titulo h3 {
            margin-top: 6px;
            font-size: 16px;
            color: #334155;
          }

          .boletim-titulo {
            text-align: center;
            margin: 0 auto;
            max-width: 640px;
          }

          .boletim-titulo h2 {
            margin: 0;
            font-size: 24px;
            letter-spacing: 0.04em;
          }

          .boletim-titulo h3 {
            margin: 10px 0 0;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.03em;
          }

          .linha-rodape {
            display: flex;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 14px;
            color: #475569;
            font-size: 14px;
          }

          .linha-rodape span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          .boletim-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 14px;
            background: white;
          }

          .boletim-table th,
          .boletim-table td {
            border: 1px solid #cbd5e1;
            padding: 12px 10px;
            text-align: left;
          }

          .boletim-table th {
            background: #f1f5f9;
            color: #0f172a;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 13px;
            letter-spacing: 0.04em;
          }

          .boletim-table tbody tr:nth-child(even) {
            background: #f8fafc;
          }

          .titulo-classificados {
            width: min(860px, 82%);
            margin: 30px auto 16px;
            padding: 6px 10px;
            background: #d9d9d9;
            color: #111827;
            text-align: center;
            font-size: 15px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .boletim-classificados {
            margin-top: 0;
          }

          .boletim-classificados th:first-child,
          .boletim-classificados td:first-child {
            width: 90px;
            text-align: center;
          }

          .subtitulo {
            margin: 28px 0 12px;
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
          }

          .resumo-titulo {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 20px;
            font-weight: 700;
          }

          .boletim-table th:first-child,
          .boletim-table td:first-child {
            width: 120px;
          }

          .boletim-resumo-compacto {
            margin: 8px 0 10px;
          }

          .resumo-faixa {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 6px;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            font-size: 12px;
          }

          .resumo-faixa strong {
            color: #0f172a;
          }

          .boletim-compacto .cabecalho-boletim {
            padding: 12px 14px;
            margin-bottom: 10px;
            border-radius: 10px;
          }

          .boletim-compacto .cabecalho-logos {
            grid-template-columns: 76px 1fr 76px;
            margin-bottom: 6px;
            gap: 8px;
          }

          .boletim-compacto .cabecalho-logos img {
            height: 38px;
          }

          .boletim-compacto .boletim-titulo h2 {
            font-size: 16px;
            line-height: 1.08;
          }

          .boletim-compacto .boletim-titulo h3 {
            margin-top: 3px;
            font-size: 12px;
            line-height: 1.08;
          }

          .boletim-compacto .linha-rodape {
            margin-top: 5px;
            font-size: 11px;
            gap: 6px;
          }

          .boletim-compacto .resumo-titulo {
            margin: 6px 0 4px;
            font-size: 13px;
          }

          .boletim-compacto .quebra-pagina {
            padding: 0;
            margin: 0 0 10px;
          }

          .boletim-compacto .subtitulo {
            margin: 10px 0 5px;
            padding: 4px 6px;
            background: #eef2ff;
            border-left: 3px solid #1d4ed8;
            font-size: 13px;
            line-height: 1.15;
          }

          .boletim-compacto h4 {
            margin: 6px 0 3px;
            font-size: 12px;
            line-height: 1.15;
          }

          .boletim-compacto .boletim-table {
            margin-top: 4px;
            font-size: 11px;
          }

          .boletim-compacto .boletim-table th,
          .boletim-compacto .boletim-table td {
            padding: 4px 5px;
            line-height: 1.12;
          }

          .boletim-compacto .boletim-table th {
            font-size: 10px;
            letter-spacing: 0.01em;
          }

          .boletim-compacto .titulo-classificados {
            margin: 8px auto 5px;
            padding: 3px 6px;
            font-size: 11px;
          }

          .qualificacao-inline {
            margin-left: 4px;
            font-weight: 900;
          }

          .linha-tentativas {
            margin-top: 4px;
            font-size: 0.95em;
            color: #334155;
            font-weight: 600;
            letter-spacing: 0.01em;
          }

          .resultado-nao-publicado {
            margin: 4px 0 8px;
            padding: 5px 7px;
            border: 1px dashed #94a3b8;
            background: #f8fafc;
            color: #475569;
            font-size: 12px;
            font-weight: 700;
          }

          .editor-layout-boletim {
            margin-top: 16px;
            padding: 14px;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            background: #f8fafc;
          }

          .editor-layout-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 12px;
            margin-top: 10px;
          }

          .editor-layout-grid label,
          .editor-layout-check label {
            display: block;
            font-weight: 700;
            margin-bottom: 5px;
          }

          .editor-layout-grid input {
            width: 100%;
          }

          .editor-layout-check {
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .editor-imagem-linha {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            padding: 8px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #ffffff;
          }

          .editor-imagem-preview {
            width: 64px;
            height: 42px;
            object-fit: contain;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
          }

          .imagem-editavel-wrap {
            display: inline-flex;
            position: relative;
            align-items: center;
            justify-content: center;
          }

          .documento-editavel-ativo .imagem-editavel-wrap {
            outline: 2px dashed #f59e0b;
            outline-offset: 4px;
            border-radius: 6px;
          }

          .botao-imagem-documento {
            position: absolute;
            right: -8px;
            bottom: -18px;
            z-index: 5;
            border: 0;
            border-radius: 999px;
            padding: 4px 8px;
            background: #f59e0b;
            color: #111827;
            font-size: 10px;
            font-weight: 800;
            cursor: pointer;
          }

          .documento-editavel-ativo .editavel-documento {
            outline: 2px dashed #2563eb;
            outline-offset: 3px;
            border-radius: 4px;
            cursor: text;
          }

          .documento-editavel-ativo .editavel-documento:focus {
            outline: 3px solid #22c55e;
            background: #eff6ff;
          }

          .aviso-edicao-documento {
            margin: 12px 0;
            padding: 10px 12px;
            border: 1px solid #93c5fd;
            border-radius: 8px;
            background: #eff6ff;
            color: #1e3a8a;
            font-weight: 700;
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }

            .sidebar,
            .topbar,
            .nao-imprimir {
              display: none !important;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
            }

            .content {
              padding: 0 !important;
              margin: 0 !important;
            }

            .card {
              box-shadow: none !important;
              border: none !important;
            }

            .boletim-pagina {
              margin: 0;
              padding: 0;
              max-width: none !important;
            }

            .pagina-inicial,
            .pagina-institucional {
              width: 210mm !important;
              height: 297mm !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 18mm ${layoutBoletim.margemInternaMm || 16}mm 20mm !important;
              box-sizing: border-box !important;
              border: none !important;
              overflow: hidden !important;
              break-after: page;
              page-break-after: always;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .logos-capa-modelo {
              margin-top: 6mm !important;
            }

            .titulo-jogos-modelo {
              margin-top: 24mm !important;
              font-size: ${layoutBoletim.tituloJogosPx || 23}px !important;
            }

            .boletim-modelo-numero {
              margin-top: 30mm !important;
              font-size: ${layoutBoletim.tituloCapaPx || 42}px !important;
            }

            .boletim-modelo-modalidade {
              font-size: 32px !important;
            }

            .coordenador-capa {
              margin-top: 22mm !important;
              font-size: 13px !important;
            }

            .local-capa {
              margin-bottom: 24mm !important;
            }

            .faixa-atletismo {
              bottom: 14mm !important;
              height: 22mm !important;
            }

            .silhuetas-atletismo {
              bottom: 18mm !important;
            }

            .rodape-azul-modelo {
              height: 14mm !important;
              font-size: 8px !important;
            }

            .pagina-institucional {
              font-size: 9.4px !important;
              line-height: 1.18 !important;
            }

            .pagina-institucional .lista-pessoas {
              gap: 5px !important;
              font-size: 10px !important;
            }

            .pagina-institucional .subtitulo-institucional {
              margin: 12px 0 8px !important;
              font-size: 11px !important;
            }

            .pagina-institucional .titulo-institucional {
              margin-bottom: 12px !important;
              font-size: 12px !important;
            }

            .pagina-institucional .tabela-institucional {
              margin-top: 8px !important;
              font-size: 9px !important;
              line-height: 1.15 !important;
            }

            .pagina-institucional .tabela-institucional td {
              padding: 2.7px 5px !important;
            }

            .boletim-table {
              font-size: ${fonteTabelaImpressao}px !important;
              table-layout: fixed;
              width: 100% !important;
            }

            .boletim-table th,
            .boletim-table td {
              border: 1px solid black !important;
              padding: 3px !important;
              color: black !important;
              word-break: break-word;
            }

            .boletim-table th {
              background: #e2e8f0 !important;
              font-size: 8px !important;
              letter-spacing: 0 !important;
            }

            .titulo-classificados {
              width: 82% !important;
              margin: 12px auto 9px !important;
              padding: 3px 6px !important;
              background: #d9d9d9 !important;
              color: black !important;
              font-size: 8px !important;
              line-height: 1.15 !important;
            }

            .quebra-pagina {
              width: 210mm !important;
              box-sizing: border-box !important;
              padding: 7mm 8mm 10mm !important;
              page-break-after: always;
              break-after: page;
            }

            .evitar-quebra,
            .quebra-pagina {
              page-break-inside: avoid;
            }

            .cabecalho-boletim {
              border-color: black !important;
              border-radius: 0 !important;
              padding: 10px !important;
              margin-bottom: 12px !important;
            }

            .cabecalho-logos {
              grid-template-columns: 80px 1fr 80px !important;
            }

            .cabecalho-logos img {
              height: ${layoutBoletim.alturaLogoResultadoPx || 42}px !important;
            }

            .boletim-titulo h2 {
              font-size: 15px !important;
            }

            .boletim-titulo h3 {
              font-size: 12px !important;
            }

            .linha-rodape {
              font-size: 10px !important;
              gap: 6px !important;
            }

            .editavel-documento,
            .imagem-editavel-wrap {
              outline: none !important;
              background: transparent !important;
            }

            .botao-imagem-documento,
            .botao-rodape-documento {
              display: none !important;
            }
          }
        

          /* ============================================================
             CORREÇÃO FINAL - IMPRESSÃO DO BOLETIM OFICIAL
             Isola o boletim oficial das regras de impressão das súmulas
             ============================================================ */

          @media print {
            body.imprimindo-boletim-oficial {
              background: white !important;
              color: black !important;
            }

            body.imprimindo-boletim-oficial .sidebar,
            body.imprimindo-boletim-oficial .topbar,
            body.imprimindo-boletim-oficial .nao-imprimir {
              display: none !important;
              visibility: hidden !important;
            }

            body.imprimindo-boletim-oficial .app,
            body.imprimindo-boletim-oficial .content,
            body.imprimindo-boletim-oficial .boletim-pagina,
            body.imprimindo-boletim-oficial .boletim-pagina > .card {
              display: block !important;
              visibility: visible !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
              overflow: visible !important;
              box-shadow: none !important;
              border: none !important;
            }

            body.imprimindo-boletim-oficial .boletim-pagina * {
              visibility: visible !important;
            }

            body.imprimindo-boletim-oficial .pagina-inicial,
            body.imprimindo-boletim-oficial .pagina-institucional {
              display: flex !important;
              visibility: visible !important;
              width: 210mm !important;
              height: 297mm !important;
              min-height: 297mm !important;
              margin: 0 !important;
              padding: 18mm ${layoutBoletim.margemInternaMm || 16}mm 20mm !important;
              box-sizing: border-box !important;
              background-color: white !important;
              color: black !important;
              overflow: hidden !important;
              break-after: page !important;
              page-break-after: always !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body.imprimindo-boletim-oficial .pagina-institucional {
              display: block !important;
            }

            body.imprimindo-boletim-oficial .cabecalho-boletim,
            body.imprimindo-boletim-oficial .boletim-resumo,
            body.imprimindo-boletim-oficial .quebra-pagina {
              display: block !important;
              visibility: visible !important;
              background-color: white !important;
              color: black !important;
            }

            body.imprimindo-boletim-oficial .cabecalho-boletim {
              width: 210mm !important;
              box-sizing: border-box !important;
              border: 1px solid black !important;
              border-radius: 0 !important;
              padding: 10px !important;
              margin: 0 0 8px 0 !important;
            }

            body.imprimindo-boletim-oficial .resumo-titulo,
            body.imprimindo-boletim-oficial .boletim-resumo {
              display: block !important;
              visibility: visible !important;
            }

            body.imprimindo-boletim-oficial .quebra-pagina {
              width: 210mm !important;
              min-height: 297mm !important;
              box-sizing: border-box !important;
              padding: 7mm 8mm 10mm !important;
              page-break-after: always !important;
              break-after: page !important;
            }

            body.imprimindo-boletim-oficial .quebra-pagina:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }

            body.imprimindo-boletim-oficial table,
            body.imprimindo-boletim-oficial .boletim-table {
              display: table !important;
              visibility: visible !important;
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: fixed !important;
              background: white !important;
              color: black !important;
            }

            body.imprimindo-boletim-oficial thead {
              display: table-header-group !important;
            }

            body.imprimindo-boletim-oficial tbody {
              display: table-row-group !important;
            }

            body.imprimindo-boletim-oficial tr {
              display: table-row !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            body.imprimindo-boletim-oficial th,
            body.imprimindo-boletim-oficial td {
              display: table-cell !important;
              visibility: visible !important;
              border: 1px solid black !important;
              color: black !important;
              padding: 3px !important;
              font-size: ${fonteTabelaImpressao}px !important;
              line-height: 1.15 !important;
              word-break: break-word !important;
            }

            body.imprimindo-boletim-oficial th {
              background: #e2e8f0 !important;
              font-weight: 900 !important;
              text-transform: uppercase !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body.imprimindo-boletim-oficial .sumula-print,
            body.imprimindo-boletim-oficial .boletim-manual-print,
            body.imprimindo-boletim-oficial .area-impressao-manual {
              display: none !important;
              visibility: hidden !important;
            }
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 6mm;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .boletim-pagina,
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .boletim-pagina > .card {
              width: auto !important;
              max-width: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .cabecalho-boletim {
              width: auto !important;
              padding: 4mm 5mm !important;
              margin: 0 0 3mm !important;
              border: 0.7px solid #111 !important;
              border-radius: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .cabecalho-logos {
              grid-template-columns: 24mm 1fr 24mm !important;
              gap: 3mm !important;
              margin-bottom: 1.5mm !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .cabecalho-logos img {
              height: 9mm !important;
              max-width: 24mm !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .boletim-titulo h2 {
              font-size: 10.5pt !important;
              line-height: 1.05 !important;
              margin: 0 !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .boletim-titulo h3 {
              font-size: 8pt !important;
              line-height: 1.05 !important;
              margin: 1mm 0 0 !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .linha-rodape {
              margin-top: 1.5mm !important;
              font-size: 7.5pt !important;
              line-height: 1.05 !important;
              gap: 2mm !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .resumo-titulo {
              margin: 0 0 1.5mm !important;
              font-size: 9pt !important;
              line-height: 1.05 !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .resumo-faixa {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 1.5mm !important;
              padding: 2mm !important;
              margin: 0 0 2.5mm !important;
              border: 0.7px solid #111 !important;
              background: #f8fafc !important;
              font-size: 7.2pt !important;
              line-height: 1.08 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .boletim-resumo {
              display: none !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .quebra-pagina {
              width: auto !important;
              min-height: 0 !important;
              padding: 0 !important;
              margin: 0 0 2.2mm !important;
              page-break-after: auto !important;
              break-after: auto !important;
              page-break-inside: auto !important;
              break-inside: auto !important;
              overflow: visible !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .evitar-quebra {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-top: 1.8mm !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .subtitulo {
              margin: 2.2mm 0 1.2mm !important;
              padding: 1.2mm 1.8mm !important;
              background: #eef2ff !important;
              border-left: 1.2mm solid #111 !important;
              color: #111 !important;
              font-size: 8.2pt !important;
              line-height: 1.08 !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao h4 {
              margin: 1.4mm 0 0.8mm !important;
              font-size: 7.8pt !important;
              line-height: 1.05 !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao table,
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .boletim-table {
              margin: 0 0 1.6mm !important;
              table-layout: fixed !important;
              font-size: ${fonteTabelaImpressao}px !important;
              page-break-inside: auto !important;
              break-inside: auto !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao thead {
              display: table-header-group !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao tbody {
              display: table-row-group !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao th,
            body.imprimindo-boletim-oficial.boletim-compacto-impressao td {
              padding: 1.2mm 1.3mm !important;
              font-size: ${fonteTabelaImpressao}px !important;
              line-height: 1.06 !important;
              border: 0.6px solid #111 !important;
              vertical-align: middle !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao th {
              font-size: ${Math.max(8.2, fonteTabelaImpressao - 0.6)}px !important;
              padding-top: 1mm !important;
              padding-bottom: 1mm !important;
              letter-spacing: 0 !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full th:nth-child(1),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full td:nth-child(1) { width: 12mm !important; text-align: center !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full th:nth-child(2),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full td:nth-child(2) { width: 8mm !important; text-align: center !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full th:nth-child(3),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full td:nth-child(3) { width: 9mm !important; text-align: center !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full th:nth-child(4),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full td:nth-child(4) { width: 37% !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full th:nth-child(5),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full td:nth-child(5) { width: 30% !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full th:nth-child(6),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full td:nth-child(6) { width: 18mm !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full th:nth-child(7),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-resultados-full td:nth-child(7) { width: 18mm !important; text-align: center !important; }

            /* Medalhistas: 7 colunas (Medalha + colunas padrão) */
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas th:nth-child(1),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas td:nth-child(1) { width: 12mm !important; text-align: center !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas th:nth-child(2),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas td:nth-child(2) { width: 13mm !important; text-align: center !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas th:nth-child(3),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas td:nth-child(3) { width: 10mm !important; text-align: center !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas th:nth-child(4),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas td:nth-child(4) { width: 35% !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas th:nth-child(5),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas td:nth-child(5) { width: 29% !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas th:nth-child(6),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas td:nth-child(6) { width: 18mm !important; }
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas th:nth-child(7),
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-medalhistas td:nth-child(7) { width: 18mm !important; text-align: center !important; }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .titulo-classificados {
              width: auto !important;
              margin: 2mm 0 1mm !important;
              padding: 1mm 1.4mm !important;
              font-size: 7.2pt !important;
              line-height: 1.05 !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .pagina-inicial,
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .pagina-institucional {
              page-break-after: always !important;
              break-after: page !important;
            }
          }

          /* ============================================================
             TABELA-WRAPPER DE FLUXO: cabeçalho essencial repetido por página
             ============================================================ */

          .tabela-fluxo-impressao {
            width: 100%;
            border-collapse: collapse;
          }

          .tabela-fluxo-impressao > thead {
            display: none;
          }

          .tabela-fluxo-impressao > thead > tr > td,
          .tabela-fluxo-impressao > tbody > tr > td {
            border: none;
            padding: 0;
          }

          @media print {
            .tabela-fluxo-impressao,
            body.imprimindo-boletim-oficial .tabela-fluxo-impressao,
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-fluxo-impressao {
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: auto !important;
              margin: 0 !important;
              background: white !important;
            }

            .tabela-fluxo-impressao > thead > tr > td,
            .tabela-fluxo-impressao > tbody > tr > td,
            body.imprimindo-boletim-oficial .tabela-fluxo-impressao > thead > tr > td,
            body.imprimindo-boletim-oficial .tabela-fluxo-impressao > tbody > tr > td,
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-fluxo-impressao > thead > tr > td,
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-fluxo-impressao > tbody > tr > td {
              display: table-cell !important;
              border: none !important;
              padding: 0 !important;
              background: white !important;
              font-size: inherit !important;
              line-height: inherit !important;
            }

            .tabela-fluxo-impressao > tbody > tr,
            body.imprimindo-boletim-oficial .tabela-fluxo-impressao > tbody > tr,
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-fluxo-impressao > tbody > tr {
              page-break-inside: auto !important;
              break-inside: auto !important;
            }

            /* Fora do modo compacto o cabeçalho grande continua no fluxo; o mini some */
            body.imprimindo-boletim-oficial:not(.boletim-compacto-impressao) .tabela-fluxo-impressao > thead {
              display: none !important;
            }

            /* Modo compacto: mini cabeçalho repetido em toda página, cabeçalho grande oculto */
            body.imprimindo-boletim-oficial.boletim-compacto-impressao .tabela-fluxo-impressao > thead {
              display: table-header-group !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .cabecalho-boletim {
              display: none !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .cabecalho-fluxo {
              display: flex !important;
              visibility: visible !important;
              align-items: center !important;
              justify-content: space-between !important;
              gap: 4mm !important;
              border: 0.7px solid #111 !important;
              background: white !important;
              padding: 1.6mm 3mm !important;
              margin: 0 0 2mm !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .cabecalho-fluxo img {
              height: 8mm !important;
              width: auto !important;
              max-width: 26mm !important;
              object-fit: contain !important;
              visibility: visible !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .cabecalho-fluxo-texto {
              flex: 1 !important;
              text-align: center !important;
              line-height: 1.12 !important;
              visibility: visible !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .cabecalho-fluxo-texto strong {
              display: block !important;
              font-size: 9pt !important;
              text-transform: uppercase !important;
              color: #111 !important;
            }

            body.imprimindo-boletim-oficial.boletim-compacto-impressao .cabecalho-fluxo-texto span {
              display: block !important;
              margin-top: 0.6mm !important;
              font-size: 7pt !important;
              color: #111 !important;
            }
          }

        `}
      </style>

      <div className="nao-imprimir">
        <h1>Boletins</h1>

        <p className="muted">
          Gere, publique, despublique ou exclua resultados do boletim por período.
        </p>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div>
              <label>Data inicial</label>

              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={inputData}
              />
            </div>

            <div>
              <label>Data final</label>

              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={inputData}
              />
            </div>

            <div>
              <label>N&ordm; do boletim</label>

              <input
                value={numeroBoletim}
                onChange={(e) => setNumeroBoletim(e.target.value)}
                style={{ ...inputData, width: 150 }}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 28, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={layoutBoletim.boletimCompactoImpressao}
                onChange={(e) => atualizarLayoutBoletim("boletimCompactoImpressao", e.target.checked)}
              />
              Boletim Compacto para Impressão
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 28, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={layoutBoletim.mostrarPaginasIniciais}
                onChange={(e) => atualizarLayoutBoletim("mostrarPaginasIniciais", e.target.checked)}
              />
              Incluir capa e páginas institucionais
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setMostrarEditorLayout((valor) => !valor)}
              style={botaoCinza}
            >
              {mostrarEditorLayout ? "Ocultar layout" : "Editar layout"}
            </button>

            <button
              type="button"
              onClick={alternarEdicaoDocumento}
              disabled={resultados.length === 0}
              style={editarNoDocumento ? botaoAmarelo : botaoAzul}
            >
              {editarNoDocumento ? "Concluir edicao" : "Editar no documento"}
            </button>

            {editarNoDocumento && (
              <button type="button" onClick={salvarLayoutBoletim} style={botaoVerde}>
                Salvar edicao visual
              </button>
            )}
          </div>

          {mostrarEditorLayout && (
            <div className="editor-layout-boletim">
              <strong>Layout do PDF/boletim</strong>

              <div className="editor-layout-grid">
                <div>
                  <label>Titulo dos jogos</label>
                  <input value={layoutBoletim.tituloJogos} onChange={(e) => atualizarLayoutBoletim("tituloJogos", e.target.value)} style={inputData} />
                </div>
                <div>
                  <label>Texto do boletim</label>
                  <input value={layoutBoletim.numeroPrefixo} onChange={(e) => atualizarLayoutBoletim("numeroPrefixo", e.target.value)} style={inputData} />
                </div>
                <div>
                  <label>Modalidade</label>
                  <input value={layoutBoletim.modalidade} onChange={(e) => atualizarLayoutBoletim("modalidade", e.target.value)} style={inputData} />
                </div>
                <div>
                  <label>Coordenador</label>
                  <input value={layoutBoletim.coordenador} onChange={(e) => atualizarLayoutBoletim("coordenador", e.target.value)} style={inputData} />
                </div>
                <div>
                  <label>Telefone</label>
                  <input value={layoutBoletim.telefone} onChange={(e) => atualizarLayoutBoletim("telefone", e.target.value)} style={inputData} />
                </div>
                <div>
                  <label>Local e ano</label>
                  <input value={layoutBoletim.local} onChange={(e) => atualizarLayoutBoletim("local", e.target.value)} style={inputData} />
                </div>
                <div>
                  <label>Titulo dos resultados</label>
                  <input value={layoutBoletim.cabecalhoTitulo} onChange={(e) => atualizarLayoutBoletim("cabecalhoTitulo", e.target.value)} style={inputData} />
                </div>
                <div>
                  <label>Subtitulo dos resultados</label>
                  <input value={layoutBoletim.cabecalhoSubtitulo} onChange={(e) => atualizarLayoutBoletim("cabecalhoSubtitulo", e.target.value)} style={inputData} />
                </div>
                <div>
                  <label>Nome no rodape esquerdo</label>
                  <input value={layoutBoletim.rodapeEsquerda} onChange={(e) => atualizarLayoutBoletim("rodapeEsquerda", e.target.value)} style={inputData} />
                </div>
                <div>
                  <label>Nome no rodape direito</label>
                  <input value={layoutBoletim.rodapeDireita} onChange={(e) => atualizarLayoutBoletim("rodapeDireita", e.target.value)} style={inputData} />
                </div>
                <div className="editor-layout-check">
                  <input
                    id="usar-modelo-fundo"
                    type="checkbox"
                    checked={layoutBoletim.usarModeloFundo}
                    onChange={(e) => atualizarLayoutBoletim("usarModeloFundo", e.target.checked)}
                  />
                  <label htmlFor="usar-modelo-fundo">Usar boletim modelo como fundo</label>
                </div>
                <div className="editor-layout-check">
                  <input
                    id="ocultar-arte-padrao"
                    type="checkbox"
                    checked={layoutBoletim.ocultarArtePadraoComModelo}
                    onChange={(e) => atualizarLayoutBoletim("ocultarArtePadraoComModelo", e.target.checked)}
                  />
                  <label htmlFor="ocultar-arte-padrao">Ocultar desenhos/logos padrao quando usar modelo</label>
                </div>
                <div>
                  <label>Modelo Word pronto</label>
                  <div className="editor-imagem-linha">
                    <strong>{layoutBoletim.modeloWordNome || "Nenhum Word anexado"}</strong>
                    <input
                      type="file"
                      accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => anexarModeloWord(e.target.files?.[0])}
                    />
                    {layoutBoletim.modeloWordArquivo && (
                      <button type="button" onClick={baixarModeloWord} style={botaoAzul}>Baixar</button>
                    )}
                    {layoutBoletim.modeloWordArquivo && (
                      <button type="button" onClick={limparModeloWord} style={botaoCinza}>Limpar</button>
                    )}
                  </div>
                </div>
                <div>
                  <label>Modelo da capa</label>
                  <div className="editor-imagem-linha">
                    {layoutBoletim.modeloCapaImagem ? (
                      <img className="editor-imagem-preview" src={layoutBoletim.modeloCapaImagem} alt="Modelo da capa" />
                    ) : (
                      <span>Sem modelo</span>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => trocarImagemLayout("modeloCapaImagem", e.target.files?.[0])} />
                    <button type="button" onClick={() => restaurarImagemLayout("modeloCapaImagem", "")} style={botaoCinza}>Limpar</button>
                  </div>
                </div>
                <div>
                  <label>Modelo das paginas iniciais</label>
                  <div className="editor-imagem-linha">
                    {layoutBoletim.modeloPaginaImagem ? (
                      <img className="editor-imagem-preview" src={layoutBoletim.modeloPaginaImagem} alt="Modelo das paginas" />
                    ) : (
                      <span>Sem modelo</span>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => trocarImagemLayout("modeloPaginaImagem", e.target.files?.[0])} />
                    <button type="button" onClick={() => restaurarImagemLayout("modeloPaginaImagem", "")} style={botaoCinza}>Limpar</button>
                  </div>
                </div>
                <div>
                  <label>Modelo das paginas de resultados</label>
                  <div className="editor-imagem-linha">
                    {layoutBoletim.modeloResultadosImagem ? (
                      <img className="editor-imagem-preview" src={layoutBoletim.modeloResultadosImagem} alt="Modelo dos resultados" />
                    ) : (
                      <span>Sem modelo</span>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => trocarImagemLayout("modeloResultadosImagem", e.target.files?.[0])} />
                    <button type="button" onClick={() => restaurarImagemLayout("modeloResultadosImagem", "")} style={botaoCinza}>Limpar</button>
                  </div>
                </div>
                <div>
                  <label>Logo capa esquerda</label>
                  <div className="editor-imagem-linha">
                    <img className="editor-imagem-preview" src={layoutBoletim.logoEsquerda} alt="Logo capa esquerda" />
                    <input type="file" accept="image/*" onChange={(e) => trocarImagemLayout("logoEsquerda", e.target.files?.[0])} />
                    <button type="button" onClick={() => restaurarImagemLayout("logoEsquerda", LAYOUT_BOLETIM_PADRAO.logoEsquerda)} style={botaoCinza}>Padrao</button>
                  </div>
                </div>
                <div>
                  <label>Logo capa direita</label>
                  <div className="editor-imagem-linha">
                    <img className="editor-imagem-preview" src={layoutBoletim.logoDireita} alt="Logo capa direita" />
                    <input type="file" accept="image/*" onChange={(e) => trocarImagemLayout("logoDireita", e.target.files?.[0])} />
                    <button type="button" onClick={() => restaurarImagemLayout("logoDireita", LAYOUT_BOLETIM_PADRAO.logoDireita)} style={botaoCinza}>Padrao</button>
                  </div>
                </div>
                <div>
                  <label>Logo cabecalho esquerda</label>
                  <div className="editor-imagem-linha">
                    <img className="editor-imagem-preview" src={layoutBoletim.logoCabecalhoEsquerda} alt="Logo cabecalho esquerda" />
                    <input type="file" accept="image/*" onChange={(e) => trocarImagemLayout("logoCabecalhoEsquerda", e.target.files?.[0])} />
                    <button type="button" onClick={() => restaurarImagemLayout("logoCabecalhoEsquerda", LAYOUT_BOLETIM_PADRAO.logoCabecalhoEsquerda)} style={botaoCinza}>Padrao</button>
                  </div>
                </div>
                <div>
                  <label>Logo cabecalho direita</label>
                  <div className="editor-imagem-linha">
                    <img className="editor-imagem-preview" src={layoutBoletim.logoCabecalhoDireita} alt="Logo cabecalho direita" />
                    <input type="file" accept="image/*" onChange={(e) => trocarImagemLayout("logoCabecalhoDireita", e.target.files?.[0])} />
                    <button type="button" onClick={() => restaurarImagemLayout("logoCabecalhoDireita", LAYOUT_BOLETIM_PADRAO.logoCabecalhoDireita)} style={botaoCinza}>Padrao</button>
                  </div>
                </div>
                <div>
                  <label>Tamanho logo capa</label>
                  <input type="number" min="36" max="130" value={layoutBoletim.alturaLogoCapaPx} onChange={(e) => atualizarLayoutBoletim("alturaLogoCapaPx", Number(e.target.value))} style={inputData} />
                </div>
                <div>
                  <label>Tamanho logo cabecalho</label>
                  <input type="number" min="28" max="110" value={layoutBoletim.alturaLogoCabecalhoPx} onChange={(e) => atualizarLayoutBoletim("alturaLogoCabecalhoPx", Number(e.target.value))} style={inputData} />
                </div>
                <div>
                  <label>Tamanho logo resultados</label>
                  <input type="number" min="24" max="100" value={layoutBoletim.alturaLogoResultadoPx} onChange={(e) => atualizarLayoutBoletim("alturaLogoResultadoPx", Number(e.target.value))} style={inputData} />
                </div>
                <div>
                  <label>Imagem da faixa do rodape</label>
                  <div className="editor-imagem-linha">
                    {layoutBoletim.rodapeFaixaImagem ? (
                      <img className="editor-imagem-preview" src={layoutBoletim.rodapeFaixaImagem} alt="Faixa do rodape" />
                    ) : (
                      <span>Padrao colorido</span>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => trocarImagemLayout("rodapeFaixaImagem", e.target.files?.[0])} />
                    <button type="button" onClick={() => restaurarImagemLayout("rodapeFaixaImagem", "")} style={botaoCinza}>Padrao</button>
                  </div>
                </div>
                <div>
                  <label>Altura da faixa do rodape</label>
                  <input type="number" min="40" max="180" value={layoutBoletim.alturaFaixaRodapePx} onChange={(e) => atualizarLayoutBoletim("alturaFaixaRodapePx", Number(e.target.value))} style={inputData} />
                </div>
                <div>
                  <label>Margem lateral da capa</label>
                  <input type="number" min="8" max="28" value={layoutBoletim.margemInternaMm} onChange={(e) => atualizarLayoutBoletim("margemInternaMm", Number(e.target.value))} style={inputData} />
                </div>
                <div>
                  <label>Fonte das tabelas</label>
                  <input type="number" min="6" max="12" step="0.5" value={layoutBoletim.fonteTabelaPx} onChange={(e) => atualizarLayoutBoletim("fonteTabelaPx", Number(e.target.value))} style={inputData} />
                </div>
                <div>
                  <label>Tamanho BOLETIM</label>
                  <input type="number" min="30" max="58" value={layoutBoletim.tituloCapaPx} onChange={(e) => atualizarLayoutBoletim("tituloCapaPx", Number(e.target.value))} style={inputData} />
                </div>
                <div>
                  <label>Tamanho titulo jogos</label>
                  <input type="number" min="18" max="34" value={layoutBoletim.tituloJogosPx} onChange={(e) => atualizarLayoutBoletim("tituloJogosPx", Number(e.target.value))} style={inputData} />
                </div>
              </div>

              <div className="editor-layout-check">
                <input
                  id="mostrar-paginas-iniciais"
                  type="checkbox"
                  checked={layoutBoletim.mostrarPaginasIniciais}
                  onChange={(e) => atualizarLayoutBoletim("mostrarPaginasIniciais", e.target.checked)}
                />
                <label htmlFor="mostrar-paginas-iniciais">Mostrar capa e paginas iniciais</label>
              </div>

              <div className="editor-layout-check">
                <input
                  id="boletim-compacto-impressao"
                  type="checkbox"
                  checked={layoutBoletim.boletimCompactoImpressao}
                  onChange={(e) => atualizarLayoutBoletim("boletimCompactoImpressao", e.target.checked)}
                />
                <label htmlFor="boletim-compacto-impressao">Boletim compacto para impressao</label>
              </div>

              <div style={{ marginTop: 12 }}>
                <button type="button" onClick={salvarLayoutBoletim} style={botaoVerde}>Salvar layout</button>
                <button type="button" onClick={restaurarLayoutBoletim} style={botaoCinza}>Restaurar padrao</button>
              </div>
            </div>
          )}

          <div className="editor-imagem-linha" style={{ marginTop: 14 }}>
            <strong>{layoutBoletim.modeloWordNome || "Nenhum Word modelo anexado"}</strong>
            <span>O modelo anexado nao recebe resultados automaticamente; use Gerar Word com resultados para criar o boletim preenchido.</span>
            <label style={botaoAzul}>
              Anexar Word modelo
              <input
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: "none" }}
                onChange={(e) => anexarModeloWord(e.target.files?.[0])}
              />
            </label>
            {layoutBoletim.modeloWordArquivo && (
              <button type="button" onClick={baixarModeloWord} style={botaoVerde}>Baixar modelo</button>
            )}
            {layoutBoletim.modeloWordArquivo && (
              <button type="button" onClick={limparModeloWord} style={botaoCinza}>Limpar Word</button>
            )}
          </div>

          {fasesDisponiveis.length > 1 && (
            <div style={{ marginTop: 16, padding: "12px 14px", background: "#f1f5f9", borderRadius: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>
                Filtrar por fase{" "}
                <span style={{ fontWeight: 400, color: "#64748b", fontSize: 13 }}>
                  (marque uma ou mais; vazio = todas)
                </span>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {fasesDisponiveis.map((fase) => (
                  <label key={fase} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={fasesSelecionadas.includes(fase)}
                      onChange={() => alternarFase(fase)}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                    {rotuloFase(fase)}
                  </label>
                ))}
                {fasesSelecionadas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFasesSelecionadas([])}
                    style={{ background: "#e2e8f0", border: "none", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontWeight: 600 }}
                  >
                    Limpar filtro
                  </button>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>
                Mostrando {grupos.length} de {gruposTodos.length} prova(s).
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button onClick={carregarBoletim} style={botaoVerde}>
              Gerar Boletim
            </button>

            <button
              onClick={carregarStartList}
              style={{ ...botaoVerde, background: "#8b5cf6", marginLeft: 10 }}
            >
              Gerar Start List (largada)
            </button>

            <button onClick={publicarTudoDoPeriodo} style={botaoAmarelo}>
              Publicar Tudo
            </button>

            <button onClick={despublicarTudoDoPeriodo} style={botaoCinza}>
              Despublicar Tudo
            </button>

            <button onClick={excluirResultadosDoPeriodo} style={botaoVermelho}>
              Excluir Resultados
            </button>

            <button
              onClick={imprimir}
              disabled={resultados.length === 0}
              style={botaoAzul}
            >
              Imprimir
            </button>

            <button
              onClick={gerarWord}
              disabled={resultados.length === 0}
              style={{
                ...botaoBase,
                background: "#2563eb",
                color: "white",
              }}
            >
              Gerar Word com resultados
            </button>

            {layoutBoletim.modeloWordArquivo && (
              <button
                type="button"
                onClick={baixarModeloWord}
                style={{
                  ...botaoBase,
                  background: "#0f766e",
                  color: "white",
                }}
              >
                Baixar modelo anexado
              </button>
            )}
          </div>

          {mensagem && <p>{mensagem}</p>}
        </div>
      </div>

      {resultados.length > 0 && (
        <div className="card">
          {layoutBoletim.mostrarPaginasIniciais && (
            <>
              <CapaBoletim numeroBoletim={numeroBoletim} layout={layoutBoletim} editando={editarNoDocumento} onTexto={atualizarTextoLayout} onImagem={trocarImagemLayout} />
              <PaginaInstitucional numero="1" titulo="COMITE DE HONRA" layout={layoutBoletim} editando={editarNoDocumento} onTexto={atualizarTextoLayout} onImagem={trocarImagemLayout}>
            <ListaPessoas itens={COMITE_HONRA} />
            <h3 className="subtitulo-institucional">APOIADORES</h3>
            <ListaPessoas itens={APOIADORES} />
          </PaginaInstitucional>
          <PaginaInstitucional numero="2" titulo="COMITE ORGANIZADOR" layout={layoutBoletim} editando={editarNoDocumento} onTexto={atualizarTextoLayout} onImagem={trocarImagemLayout}>
            <h3 className="subtitulo-institucional">COMISSAO TECNICA E OPERACIONAL</h3>
            <TabelaInstitucional itens={COMISSAO_TECNICA} />
            <h3 className="subtitulo-institucional">COMISSAO DISCIPLINAR ESPECIAL</h3>
            <TabelaInstitucional itens={COMISSAO_DISCIPLINAR} />
          </PaginaInstitucional>
              <PaginaInstitucional numero="3" titulo="COORDENADORES DE ARBITRAGEM" layout={layoutBoletim} editando={editarNoDocumento} onTexto={atualizarTextoLayout} onImagem={trocarImagemLayout}>
                <TabelaInstitucional itens={COORDENADORES_ARBITRAGEM} />
              </PaginaInstitucional>
            </>
          )}

          {/* Tabela-wrapper: o thead repete o cabeçalho essencial em toda página impressa (modo compacto) */}
          <table className="tabela-fluxo-impressao">
            <thead>
              <tr>
                <td>
                  <div className="cabecalho-fluxo">
                    <img src={layoutBoletim.logoCabecalhoEsquerda} alt="" />
                    <div className="cabecalho-fluxo-texto">
                      <strong>{layoutBoletim.cabecalhoTitulo}</strong>
                      <span>
                        {layoutBoletim.cabecalhoSubtitulo} • {layoutBoletim.numeroPrefixo} {numeroBoletim || "0001"} • {layoutBoletim.cabecalhoModalidade} • {periodoFormatado()}
                      </span>
                    </div>
                    <img src={layoutBoletim.logoCabecalhoDireita} alt="" />
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>

          <div className="cabecalho-boletim">
            <div className="cabecalho-logos">
              <EditableImage src={layoutBoletim.logoCabecalhoEsquerda} campo="logoCabecalhoEsquerda" alt="Jogos Escolares" editando={editarNoDocumento} onImagem={trocarImagemLayout} altura={layoutBoletim.alturaLogoResultadoPx} />
              <div className="boletim-titulo">
                <h2>JOGOS ESCOLARES DE RORAIMA - JER 2026</h2>
                <h3>BOLETIM OFICIAL DE RESULTADOS</h3>
              </div>
              <EditableImage src={layoutBoletim.logoCabecalhoDireita} campo="logoCabecalhoDireita" alt="IDJUV" editando={editarNoDocumento} onImagem={trocarImagemLayout} altura={layoutBoletim.alturaLogoResultadoPx} />
            </div>

            <div className="linha-rodape">
              <span>
                <strong>Modalidade:</strong> Atletismo
              </span>
              <span>•</span>
              <span>
                <strong>Período:</strong> {periodoFormatado()}
              </span>
            </div>
          </div>

          <h3 className="resumo-titulo">Resumo do Período</h3>

          <div className="resumo-faixa boletim-resumo-compacto">
            <span><strong>Modalidade:</strong> Atletismo</span>
            <span><strong>Boletim:</strong> {numeroBoletim || "0001"}</span>
            <span><strong>Período:</strong> {periodoFormatado()}</span>
            <span><strong>Provas:</strong> {grupos.length} &nbsp; <strong>Registros:</strong> {resultados.length}</span>
          </div>

          <table className="boletim-table boletim-resumo" width="100%" cellPadding="10">
            <thead>
              <tr>
                <th>Total de provas com resultado publicado</th>
                <th>Total de registros publicados</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>{grupos.length}</td>
                <td>{resultados.length}</td>
              </tr>
            </tbody>
          </table>

          {grupos.map((grupo, index) => {
            const fase = grupo.prova?.fase || "QUALIFICAÇÃO";
            const final = ehFinalDaProva(fase);
            const resultadosOrdenados = ordenarResultados(grupo.resultados, final);
            const seriesDaProva = agruparPorSerieBoletim(resultadosOrdenados);
            const classificadosProximaFase = obterClassificadosProximaFase(resultadosOrdenados);

            return (
              <div
                key={index}
                className={`quebra-pagina ${layoutBoletim.usarModeloFundo && layoutBoletim.modeloResultadosImagem ? "pagina-modelo-fundo" : ""}`}
                style={layoutBoletim.usarModeloFundo && layoutBoletim.modeloResultadosImagem ? { backgroundImage: `url(${layoutBoletim.modeloResultadosImagem})` } : undefined}
              >
                <h3 className="subtitulo">
                  {formatarData(grupo.data)} — {grupo.prova?.nome} - {grupo.prova?.categoria} - {grupo.prova?.naipe} - {fase}
                </h3>

                {final && (
                  <>
                    <h4>Medalhistas</h4>

                    <table className="boletim-table tabela-medalhistas" width="100%" cellPadding="10">
                      <thead>
                        <tr>
                          <th>Medalha</th>
                          <th>Colocação</th>
                          <th>N&ordm;</th>
                          <th>Atleta</th>
                          <th>Escola</th>
                          <th>Município</th>
                          <th>Resultado</th>
                        </tr>
                      </thead>

                      <tbody>
                        {resultadosOrdenados
                          .filter((r) => r.colocacao >= 1 && r.colocacao <= 3)
                          .map((r) => {
                            const atleta = r.inscricoes?.atletas;
                            const ehEquipe = !!r.equipe;

                            return (
                              <tr key={r.id}>
                                <td>{medalha(r.colocacao)}</td>
                                <td>{r.colocacao}º</td>
                                <td>{ehEquipe ? "" : getNumeroAtleta(atleta)}</td>
                                <td>{ehEquipe ? <ListaAtletasEquipe resultado={r} /> : atleta?.nome}</td>
                                <td>{atleta?.escolas?.nome}</td>
                                <td>{atleta?.municipio}</td>
                                <td>{resultadoFinal(r)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </>
                )}

                {final ? (
                  <>
                    <h4>Classificação Geral</h4>

                    <TabelaResultados
                      resultados={resultadosOrdenados}
                      resultadoFinal={resultadoFinal}
                      provaDeCampo={ehProvaDeCampo(grupo.prova)}
                      formatarTentativas={ehSaltoAltura(grupo.prova) ? alturasCompactas : tentativasCompactas}
                    />
                  </>
                ) : (
                  <>
                    <h4>Resultados por Série</h4>

                    {seriesDaProva.map((serie) => (
                      <div
                        key={serie.numeroSerie}
                        className="evitar-quebra"
                        style={{ marginTop: layoutBoletim.boletimCompactoImpressao ? 6 : 18 }}
                      >
                        <h4>Série {serie.numeroSerie}</h4>

                        <TabelaResultados
                          resultados={serie.resultados}
                          resultadoFinal={resultadoFinal}
                          mostrarColocacao={serieTemResultadoReal(serie)}
                          provaDeCampo={ehProvaDeCampo(grupo.prova)}
                          formatarTentativas={ehSaltoAltura(grupo.prova) ? alturasCompactas : tentativasCompactas}
                        />
                      </div>
                    ))}

                    {classificadosProximaFase.length > 0 && resultadosOrdenados.some(temResultadoReal) && (
                      <div className="evitar-quebra" style={{ marginTop: layoutBoletim.boletimCompactoImpressao ? 6 : 18 }}>
                        <div className="titulo-classificados">
                          {tituloClassificadosProximaFase(grupo)}
                        </div>

                        <TabelaClassificadosProximaFase
                          classificados={classificadosProximaFase}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


function EditableText({ valor, campo, editando, onTexto, multiline = false }) {
  if (!editando) {
    return multiline
      ? String(valor || "").split("\n").map((linha, index) => (
          <span key={index}>{linha}{index < String(valor || "").split("\n").length - 1 ? <br /> : null}</span>
        ))
      : <>{valor}</>;
  }

  return (
    <span
      className="editavel-documento"
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onTexto(campo, e.currentTarget.innerText)}
    >
      {valor}
    </span>
  );
}

function EditableImage({ src, campo, alt, editando, onImagem, altura }) {
  return (
    <span className="imagem-editavel-wrap">
      <img src={src} alt={alt} style={{ height: altura, width: "auto", objectFit: "contain" }} />
      {editando && (
        <label className="botao-imagem-documento">
          Trocar
          <input
            className="nao-imprimir"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => onImagem?.(campo, e.target.files?.[0])}
          />
        </label>
      )}
    </span>
  );
}

function CapaBoletim({ numeroBoletim, layout, editando, onTexto, onImagem }) {
  return (
    <section
      className={`pagina-inicial ${layout.usarModeloFundo && layout.modeloCapaImagem ? "pagina-modelo-fundo" : ""} ${layout.usarModeloFundo && layout.ocultarArtePadraoComModelo ? "ocultar-arte-padrao" : ""}`}
      style={layout.usarModeloFundo && layout.modeloCapaImagem ? { backgroundImage: `url(${layout.modeloCapaImagem})` } : undefined}
    >
      <div className="logos-capa-modelo">
        <EditableImage src={layout.logoEsquerda} campo="logoEsquerda" alt="IDJUV" editando={editando} onImagem={onImagem} altura={layout.alturaLogoCapaPx} />
        <EditableImage src={layout.logoDireita} campo="logoDireita" alt="Governo de Roraima" editando={editando} onImagem={onImagem} altura={layout.alturaLogoCapaPx} />
      </div>

      <div className="titulo-jogos-modelo"><EditableText valor={layout.tituloJogos} campo="tituloJogos" editando={editando} onTexto={onTexto} /></div>
      <div className="boletim-modelo-numero"><EditableText valor={`${layout.numeroPrefixo} ${numeroBoletim || "0001"}`} campo="numeroPrefixo" editando={editando} onTexto={(campo, valor) => onTexto(campo, valor.replace(numeroBoletim || "0001", "").trim())} /></div>
      <div className="boletim-modelo-modalidade"><EditableText valor={layout.modalidade} campo="modalidade" editando={editando} onTexto={onTexto} /></div>

      <div className="coordenador-capa">
        <p><strong>Coordenador:</strong></p>
        <p><EditableText valor={layout.coordenador} campo="coordenador" editando={editando} onTexto={onTexto} /></p>
        <p><strong>Fone:</strong></p>
        <p><EditableText valor={layout.telefone} campo="telefone" editando={editando} onTexto={onTexto} /></p>
      </div>

      <div className="local-capa"><EditableText valor={layout.local} campo="local" editando={editando} onTexto={onTexto} /></div>
      <div
        className={`faixa-atletismo ${layout.rodapeFaixaImagem ? "faixa-atletismo-customizada" : ""}`}
        style={{
          height: layout.alturaFaixaRodapePx || 92,
          backgroundImage: layout.rodapeFaixaImagem ? `url(${layout.rodapeFaixaImagem})` : undefined,
        }}
      >
        {editando && (
          <label className="botao-rodape-documento">
            Trocar rodape
            <input
              className="nao-imprimir"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => onImagem?.("rodapeFaixaImagem", e.target.files?.[0])}
            />
          </label>
        )}
      </div>
      {!layout.rodapeFaixaImagem && (
        <div className="silhuetas-atletismo" aria-hidden="true">
          <span className="silhueta" />
          <span className="silhueta" />
          <span className="silhueta" />
        </div>
      )}
      <RodapeAzul numero="" layout={layout} editando={editando} onTexto={onTexto} />
    </section>
  );
}

function PaginaInstitucional({ numero, titulo, layout, editando, onTexto, onImagem, children }) {
  return (
    <section
      className={`pagina-institucional ${layout.usarModeloFundo && layout.modeloPaginaImagem ? "pagina-modelo-fundo" : ""} ${layout.usarModeloFundo && layout.ocultarArtePadraoComModelo ? "ocultar-arte-padrao" : ""}`}
      style={layout.usarModeloFundo && layout.modeloPaginaImagem ? { backgroundImage: `url(${layout.modeloPaginaImagem})` } : undefined}
    >
      <CabecalhoInstitucional layout={layout} editando={editando} onTexto={onTexto} onImagem={onImagem} />
      <h2 className="titulo-institucional">{titulo}</h2>
      {children}
      <RodapeAzul numero={numero} layout={layout} editando={editando} onTexto={onTexto} />
    </section>
  );
}

function CabecalhoInstitucional({ layout, editando, onTexto, onImagem }) {
  return (
    <>
      <div className="cabecalho-institucional">
        <EditableImage src={layout.logoCabecalhoEsquerda} campo="logoCabecalhoEsquerda" alt="Jogos Escolares" editando={editando} onImagem={onImagem} altura={layout.alturaLogoCabecalhoPx} />
        <div>
          <strong>Governo de Roraima</strong>
          <span><EditableText valor={layout.instituicaoCabecalho} campo="instituicaoCabecalho" editando={editando} onTexto={onTexto} /></span>
        </div>
        <EditableImage src={layout.logoCabecalhoDireita} campo="logoCabecalhoDireita" alt="IDJUV" editando={editando} onImagem={onImagem} altura={layout.alturaLogoCabecalhoPx} />
      </div>
      <div className="linha-azul-institucional" />
    </>
  );
}

function RodapeAzul({ numero, layout, editando, onTexto }) {
  return (
    <div className="rodape-azul-modelo">
      <span><EditableText valor={layout.rodapeEsquerda} campo="rodapeEsquerda" editando={editando} onTexto={onTexto} multiline /></span>
      <strong>{numero}</strong>
      <span><EditableText valor={layout.rodapeDireita} campo="rodapeDireita" editando={editando} onTexto={onTexto} /></span>
    </div>
  );
}

function ListaPessoas({ itens }) {
  return (
    <div className="lista-pessoas">
      {itens.map(([nome, cargo]) => (
        <div key={nome + "-" + cargo}>
          <strong>{nome}</strong>
          <span>{cargo}</span>
        </div>
      ))}
    </div>
  );
}

function TabelaInstitucional({ itens }) {
  return (
    <table className="tabela-institucional">
      <tbody>
        {itens.map(([nome, funcao, telefone]) => (
          <tr key={nome + "-" + funcao}>
            <td>{nome}</td>
            <td>{funcao}</td>
            <td>{telefone}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabelaClassificadosProximaFase({ classificados }) {
  return (
    <table className="boletim-table boletim-classificados" width="100%" cellPadding="10">
      <thead>
        <tr>
          <th>N&ordm;</th>
          <th>Nome</th>
          <th>Escola</th>
          <th>Tempo/Marca</th>
        </tr>
      </thead>

      <tbody>
        {classificados.map((r) => {
          const atleta = r.inscricoes?.atletas;
          const ehEquipe = !!r.equipe;
          const tempoMarca = r.tempo || r.melhor_marca || r.marca || r.resultado_final || "";

          return (
            <tr key={r.id}>
              <td>{ehEquipe ? "" : getNumeroAtleta(atleta)}</td>
              <td>{ehEquipe ? <ListaAtletasEquipe resultado={r} /> : atleta?.nome}</td>
              <td>{atleta?.escolas?.nome}</td>
              <td>{tempoMarca}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ListaAtletasEquipe({ resultado }) {
  return (
    <div style={{ textAlign: "left" }}>
      {(resultado.equipeAtletas || []).map((a, i) => (
        <div key={i}>
          {getNumeroAtleta(a)} - {a?.nome}
        </div>
      ))}

      {(resultado.equipeReservas || []).map((a, i) => (
        <div key={`res-${i}`} style={{ fontStyle: "italic", opacity: 0.8 }}>
          {getNumeroAtleta(a)} - {a?.nome} (reserva)
        </div>
      ))}
    </div>
  );
}

function TabelaResultados({ resultados, resultadoFinal, mostrarColocacao = true, provaDeCampo = false, formatarTentativas }) {
  if (!resultados.length) {
    return <div className="resultado-nao-publicado">Resultado ainda não publicado.</div>;
  }

  return (
    <table className="boletim-table tabela-resultados-full" width="100%" cellPadding="10">
      <thead>
        <tr>
          <th>Colocação</th>
          {!provaDeCampo && <th>Raia</th>}
          <th>N&ordm;</th>
          <th>Atleta / Equipe</th>
          <th>Escola</th>
          <th>Município</th>
          <th>Resultado</th>
        </tr>
      </thead>

      <tbody>
        {resultados.map((r, i) => {
          const atleta = r.inscricoes?.atletas;
          const ehEquipe = !!r.equipe;
          const linhaTentativas = provaDeCampo && formatarTentativas ? formatarTentativas(r) : "";

          return (
            <tr key={r.id}>
              <td>
                {mostrarColocacao ? (
                  <>
                    {r.colocacao ? `${r.colocacao}º` : `${i + 1}º`}
                    {r.qualificacao && <span className="qualificacao-inline">{r.qualificacao}</span>}
                  </>
                ) : (
                  "-"
                )}
              </td>
              {!provaDeCampo && <td style={{ textAlign: "center" }}>{r.raia ?? "-"}</td>}
              <td>{ehEquipe ? "" : getNumeroAtleta(atleta)}</td>
              <td>
                {ehEquipe ? <ListaAtletasEquipe resultado={r} /> : atleta?.nome}
                {linhaTentativas && (
                  <div className="linha-tentativas">{linhaTentativas}</div>
                )}
              </td>
              <td>{atleta?.escolas?.nome}</td>
              <td>{atleta?.municipio}</td>
              <td>{resultadoFinal(r)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const botaoBase = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "none",
  color: "#020617",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: 10,
  marginBottom: 10,
};

const botaoVerde = { ...botaoBase, background: "#22c55e" };
const botaoAmarelo = { ...botaoBase, background: "#facc15" };
const botaoAzul = { ...botaoBase, background: "#38bdf8" };
const botaoCinza = { ...botaoBase, background: "#94a3b8" };
const botaoVermelho = { ...botaoBase, background: "#ef4444", color: "white" };

const inputData = {
  display: "block",
  padding: 12,
  marginTop: 8,
  borderRadius: 10,
  width: 220,
};