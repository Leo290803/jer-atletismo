import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";
import { PROVAS_OFICIAIS } from "../data/provasOficiais";

export default function Importacao() {
  const [linhas, setLinhas] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [municipioDetectado, setMunicipioDetectado] = useState("");

  const EVENTO_PRINCIPAL = "JER 2026 - ATLETISMO";

  function dividirEmBlocos(lista, tamanho = 50) {
    const blocos = [];

    for (let i = 0; i < lista.length; i += tamanho) {
      blocos.push(lista.slice(i, i + tamanho));
    }

    return blocos;
  }

  function unicos(lista) {
    return [...new Set(lista.filter(Boolean))];
  }

  async function inserirEmBlocosComRetorno(tabela, registros, selectCampos = "*", tamanho = 500) {
    const todos = [];

    for (const bloco of dividirEmBlocos(registros, tamanho)) {
      const { data, error } = await supabase
        .from(tabela)
        .insert(bloco)
        .select(selectCampos);

      if (error) throw error;

      todos.push(...(data || []));
    }

    return todos;
  }

  async function inserirEmBlocosSemRetorno(tabela, registros, tamanho = 500) {
    for (const bloco of dividirEmBlocos(registros, tamanho)) {
      const { error } = await supabase.from(tabela).insert(bloco);

      if (error) throw error;
    }
  }

  function normalizarTexto(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor).trim().toUpperCase();
  }

  function limparAcentos(texto) {
    return normalizarTexto(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function normalizarChave(valor) {
    return limparAcentos(valor)
      .replace(/[^A-Z0-9]/g, "")
      .trim();
  }

  function limparProva(prova) {
    let p = normalizarTexto(prova);

    p = p.replace(" - MASCULINO", "");
    p = p.replace(" - FEMININO", "");
    p = p.replace(" MASCULINO", "");
    p = p.replace(" FEMININO", "");
    p = p.replace(" - MAS", "");
    p = p.replace(" - FEM", "");
    p = p.replace(" S/ BARREIRA", " COM BARREIRAS");
    p = p.replace(" S/BARREIRA", " COM BARREIRAS");
    p = p.replace(" C/ BARREIRA", " COM BARREIRAS");
    p = p.replace(" C/BARREIRA", " COM BARREIRAS");
    p = p.replace("→", "");
    p = p.replace("➔", "");
    p = p.replace(/[:;.]+$/g, "");
    p = p.replace(/\s+/g, " ");

    return p.trim();
  }

  function pegarValor(linha, nomes) {
    const mapa = {};

    Object.keys(linha || {}).forEach((chave) => {
      mapa[normalizarChave(chave)] = linha[chave];
    });

    for (const nome of nomes) {
      const valorDireto = linha?.[nome];

      if (valorDireto !== undefined && valorDireto !== null && valorDireto !== "") {
        return valorDireto;
      }

      const valorNormalizado = mapa[normalizarChave(nome)];

      if (
        valorNormalizado !== undefined &&
        valorNormalizado !== null &&
        valorNormalizado !== ""
      ) {
        return valorNormalizado;
      }
    }

    return "";
  }

  function excelSerialParaData(numero) {
    const utcDays = Math.floor(numero - 25569);
    const utcValue = utcDays * 86400;
    const data = new Date(utcValue * 1000);

    return new Date(
      data.getUTCFullYear(),
      data.getUTCMonth(),
      data.getUTCDate()
    );
  }

  function formatarDataISO(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return "";

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  function formatarDataBR(dataISO) {
    if (!dataISO) return "-";

    const texto = String(dataISO).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      const [ano, mes, dia] = texto.split("-");
      return `${dia}/${mes}/${ano}`;
    }

    return texto;
  }

  function formatarNascimentoParaBanco(dataNascimento) {
    if (!dataNascimento) return null;

    if (
      dataNascimento instanceof Date &&
      !Number.isNaN(dataNascimento.getTime())
    ) {
      return formatarDataISO(dataNascimento);
    }

    const valor = String(dataNascimento).trim();

    if (!valor || valor === "---" || valor === "-") return null;

    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(valor)) {
      const partes = valor.slice(0, 10).split("-");
      const ano = partes[0];
      const mes = String(partes[1]).padStart(2, "0");
      const dia = String(partes[2]).padStart(2, "0");
      return `${ano}-${mes}-${dia}`;
    }

    if (valor.includes("/") || valor.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const partes = valor.split(/[/-]/);

      if (partes.length === 3) {
        const dia = String(partes[0]).padStart(2, "0");
        const mes = String(partes[1]).padStart(2, "0");
        const ano = String(partes[2]).padStart(4, "0");

        if (Number(ano) >= 1900 && Number(ano) <= 2100) {
          return `${ano}-${mes}-${dia}`;
        }
      }
    }

    if (!Number.isNaN(Number(valor))) {
      const numero = Number(valor);

      if (numero > 20000) {
        return formatarDataISO(excelSerialParaData(numero));
      }

      if (numero >= 1900 && numero <= 2100) {
        return `${numero}-01-01`;
      }
    }

    return null;
  }

  function extrairAnoNascimento(dataNascimento) {
    const dataBanco = formatarNascimentoParaBanco(dataNascimento);

    if (dataBanco && /^\d{4}-/.test(dataBanco)) {
      return Number(dataBanco.slice(0, 4));
    }

    return null;
  }

  function identificarCategoria(competicao, dataNascimento) {
    const ano = extrairAnoNascimento(dataNascimento);

    if (ano >= 2012 && ano <= 2014) return "12 a 14 anos";
    if (ano >= 2009 && ano <= 2011) return "15 a 17 anos";

    const texto = normalizarTexto(competicao);

    if (texto.includes("12-14") || texto.includes("12 A 14")) {
      return "12 a 14 anos";
    }

    if (texto.includes("15-17") || texto.includes("15 A 17")) {
      return "15 a 17 anos";
    }

    return "Categoria não identificada";
  }

  function identificarNaipe(sexo, prova, competicao) {
    const texto = normalizarTexto(`${sexo} ${prova} ${competicao}`);

    if (texto.includes("MISTO") || texto.includes("MISTA")) return "Misto";
    if (texto.includes("FEMININO")) return "Feminino";
    if (texto.includes("MASCULINO")) return "Masculino";

    return "Naipe não identificado";
  }

  function identificarTipoProva(prova) {
    const p = limparAcentos(prova);

    if (
      p.includes("SALTO") ||
      p.includes("ARREMESSO") ||
      p.includes("ARREMESO") ||
      p.includes("LANCAMENTO") ||
      p.includes("DARDO") ||
      p.includes("DISCO") ||
      p.includes("MARTELO") ||
      p.includes("PESO")
    ) {
      return "campo";
    }

    if (p.includes("REVEZAMENTO")) return "revezamento";
    if (p.includes("COMBINADAS")) return "combinada";
    if (p.includes("PENTATLO")) return "combinada";
    if (p.includes("HEXATLO")) return "combinada";

    return "corrida";
  }

  function fallbackPadronizarNomeProva(nomeProva) {
    const p = limparAcentos(limparProva(nomeProva))
      .replace(/\s+/g, " ")
      .trim();

    if (p.includes("ARREM") && p.includes("PESO")) return "ARREMESSO DO PESO";
    if (p.includes("DARDO")) return "LANÇAMENTO DO DARDO";
    if (p.includes("DISCO")) return "LANÇAMENTO DO DISCO";
    if (p.includes("MARTELO")) return "LANÇAMENTO DO MARTELO";
    if (p.includes("MARCHA")) return "MARCHA ATLÉTICA";
    if (p.includes("5") && p.includes("80") && p.includes("REVEZ"))
      return "REVEZAMENTO 5X80M";
    if (p.includes("4") && p.includes("100") && p.includes("REVEZ"))
      return "REVEZAMENTO 4X100M";
    if (p.includes("4") && p.includes("400") && p.includes("REVEZ"))
      return "REVEZAMENTO 4X400M MISTO";
    if (p.includes("SALTO TRIPLO")) return "SALTO TRIPLO";
    if (p.includes("SALTO EM DISTANCIA")) return "SALTO EM DISTÂNCIA";
    if (p.includes("SALTO EM ALTURA")) return "SALTO EM ALTURA";

    return limparProva(nomeProva);
  }

  function padronizarProva(nomeProva, categoria, naipe) {
    const provaLimpa = limparProva(nomeProva);
    const chaveProva = limparAcentos(provaLimpa)
      .replace(/\s+/g, " ")
      .trim();

    const cat = normalizarTexto(categoria);
    const np = normalizarTexto(naipe);

    if (chaveProva.includes("BARREIRA")) {
      if (cat === "12 A 14 ANOS" && np === "FEMININO") {
        return {
          nome: "80 METROS COM BARREIRAS",
          tipo: "corrida",
          parametrizada: true,
          original: provaLimpa,
        };
      }

      if (cat === "12 A 14 ANOS" && np === "MASCULINO") {
        return {
          nome: "100 METROS COM BARREIRAS",
          tipo: "corrida",
          parametrizada: true,
          original: provaLimpa,
        };
      }

      if (cat === "15 A 17 ANOS" && np === "FEMININO") {
        return {
          nome: "100 METROS COM BARREIRAS",
          tipo: "corrida",
          parametrizada: true,
          original: provaLimpa,
        };
      }

      if (cat === "15 A 17 ANOS" && np === "MASCULINO") {
        return {
          nome: "110 METROS COM BARREIRAS",
          tipo: "corrida",
          parametrizada: true,
          original: provaLimpa,
        };
      }
    }

    if (
      chaveProva.includes("COMBINADAS") ||
      chaveProva.includes("PENTATLO") ||
      chaveProva.includes("HEXATLO")
    ) {
      if (cat === "12 A 14 ANOS" && np === "MASCULINO") {
        return {
          nome: "COMBINADAS HEXATLO",
          tipo: "combinada",
          parametrizada: true,
          original: provaLimpa,
        };
      }

      return {
        nome: "COMBINADAS PENTATLO",
        tipo: "combinada",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    if (chaveProva.includes("ARREM") && chaveProva.includes("PESO")) {
      return {
        nome: "ARREMESSO DO PESO",
        tipo: "campo",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    if (chaveProva.includes("DARDO")) {
      return {
        nome: "LANÇAMENTO DO DARDO",
        tipo: "campo",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    if (chaveProva.includes("DISCO")) {
      return {
        nome: "LANÇAMENTO DO DISCO",
        tipo: "campo",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    if (chaveProva.includes("MARTELO")) {
      return {
        nome: "LANÇAMENTO DO MARTELO",
        tipo: "campo",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    if (chaveProva.includes("SALTO TRIPLO")) {
      return {
        nome: "SALTO TRIPLO",
        tipo: "campo",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    if (chaveProva.includes("SALTO EM DISTANCIA")) {
      return {
        nome: "SALTO EM DISTÂNCIA",
        tipo: "campo",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    if (chaveProva.includes("SALTO EM ALTURA")) {
      return {
        nome: "SALTO EM ALTURA",
        tipo: "campo",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    if (chaveProva.includes("MARCHA")) {
      return {
        nome: "MARCHA ATLÉTICA",
        tipo: "corrida",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    if (
      chaveProva.includes("REVEZAMENTO") &&
      chaveProva.includes("5") &&
      chaveProva.includes("80")
    ) {
      return {
        nome: "REVEZAMENTO 5X80M",
        tipo: "revezamento",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    if (
      chaveProva.includes("REVEZAMENTO") &&
      chaveProva.includes("4") &&
      chaveProva.includes("100")
    ) {
      return {
        nome: "REVEZAMENTO 4X100M",
        tipo: "revezamento",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    if (
      chaveProva.includes("REVEZAMENTO") &&
      chaveProva.includes("4") &&
      chaveProva.includes("400")
    ) {
      return {
        nome: "REVEZAMENTO 4X400M MISTO",
        tipo: "revezamento",
        parametrizada: true,
        original: provaLimpa,
      };
    }

    const encontrada = PROVAS_OFICIAIS.find((p) => {
      const mesmaCategoria = normalizarTexto(p.categoria) === cat;
      const mesmoNaipe =
        normalizarTexto(p.naipe) === np ||
        normalizarTexto(p.naipe) === "MISTO" ||
        np === "MISTO";

      const nomesPossiveis = [p.nome, ...(p.apelidos || [])].map((x) =>
        limparAcentos(x)
      );

      return mesmaCategoria && mesmoNaipe && nomesPossiveis.includes(chaveProva);
    });

    if (encontrada) {
      return {
        nome: encontrada.nome,
        tipo: encontrada.tipo,
        parametrizada: true,
        original: provaLimpa,
      };
    }

    const fallback = fallbackPadronizarNomeProva(provaLimpa);

    return {
      nome: fallback,
      tipo: identificarTipoProva(fallback),
      parametrizada: false,
      original: provaLimpa,
    };
  }

  function montarResumo(lista) {
    const grupos = {};

    lista.forEach((item) => {
      const chave = `${item.prova} | ${item.categoria} | ${item.naipe}`;

      if (!grupos[chave]) {
        grupos[chave] = {
          prova: item.prova,
          categoria: item.categoria,
          naipe: item.naipe,
          tipo: item.tipo,
          total: 0,
          parametrizados: 0,
          naoParametrizados: 0,
        };
      }

      grupos[chave].total += 1;

      if (item.parametrizada) grupos[chave].parametrizados += 1;
      else grupos[chave].naoParametrizados += 1;
    });

    return Object.values(grupos).sort((a, b) =>
      `${a.categoria} ${a.naipe} ${a.prova}`.localeCompare(
        `${b.categoria} ${b.naipe} ${b.prova}`
      )
    );
  }

  function detectarMunicipio(lista) {
    const municipios = [...new Set(lista.map((l) => l.municipio).filter(Boolean))];

    if (municipios.length === 1) return municipios[0];
    if (municipios.length > 1) return "GERAL - VÁRIOS MUNICÍPIOS";

    return "MUNICÍPIO NÃO IDENTIFICADO";
  }

  function chaveAtleta(linha, escolaId) {
    return `${linha.nome}|${escolaId || "SEM_ESCOLA"}|${linha.categoria}`;
  }

  function chaveProva(linha) {
    return `${linha.prova}|${linha.categoria}|${linha.naipe}`;
  }

  function linhaEhAtleta(linha) {
    const tipoUsuario = normalizarTexto(
      pegarValor(linha, ["TIPO USUARIO", "TIPO USUÁRIO", "TIPO"])
    );

    const funcao = normalizarTexto(pegarValor(linha, ["FUNCAO", "FUNÇÃO"]));

    if (!tipoUsuario && !funcao) return true;

    return tipoUsuario === "ATLETA" || funcao === "ATLETA";
  }

  function linhaStatusValido(linha) {
    const status = normalizarTexto(
      pegarValor(linha, [
        "STATUS DA INSCRIÇÃO",
        "STATUS DA INSCRICAO",
        "VALIDAÇÃO",
        "VALIDACAO",
        "VALIDADE",
        "STATUS",
      ])
    );

    return status === "" || status.includes("VÁLIDA") || status.includes("VALIDA");
  }

  function linhaEhAtletismo(linha) {
    const modalidade = normalizarTexto(
      pegarValor(linha, ["MODALIDADE", "MODALIDA"])
    );

    if (!modalidade) return true;

    return modalidade.includes("ATLETISMO");
  }

  function lerTodasAbas(workbook) {
    const todas = [];

    workbook.SheetNames.forEach((nomeAba) => {
      const sheet = workbook.Sheets[nomeAba];

      const json = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
        cellDates: true,
      });

      json.forEach((linha) => {
        todas.push({
          ...linha,
          __aba: nomeAba,
        });
      });
    });

    return todas;
  }

  function lerPlanilha(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    setArquivoNome(arquivo.name);
    setLinhas([]);
    setResumo([]);
    setMunicipioDetectado("");

    const leitor = new FileReader();

    leitor.onload = async (evt) => {
      try {
        setMensagem("Lendo planilha geral e padronizando provas...");

        const dados = new Uint8Array(evt.target.result);

        const workbook = XLSX.read(dados, {
          type: "array",
          cellDates: true,
        });

        const json = lerTodasAbas(workbook);

        const tratados = json
          .filter(linhaEhAtleta)
          .filter(linhaStatusValido)
          .filter(linhaEhAtletismo)
          .map((linha, index) => {
            const provaOriginal = pegarValor(linha, ["PROVA", "MODALIDADE/PROVA"]);

            const competicao = pegarValor(linha, [
              "COMPETICAO",
              "COMPETIÇÃO",
              "CATEGORIA",
              "__aba",
            ]);

            const dataNascimento = pegarValor(linha, [
              "DATA NASCIMENTO",
              "DATA DE NASCIMENTO",
              "NASCIMENTO",
              "NASCIM",
              "DT NASCIMENTO",
              "DT. NASCIMENTO",
              "DATA_NASCIMENTO",
            ]);

            const categoria = identificarCategoria(competicao, dataNascimento);

            const naipe = identificarNaipe(
              pegarValor(linha, ["SEXO", "NAIPE"]),
              provaOriginal,
              competicao
            );

            const provaPadronizada = padronizarProva(
              provaOriginal,
              categoria,
              naipe
            );

            return {
              numero: String(
                pegarValor(linha, ["NÚMERO", "NUMERO", "Nº", "N°", "NO"]) ||
                  index + 1
              ),
              nome: normalizarTexto(
                pegarValor(linha, ["NOME", "ATLETA", "NOME COMPLETO"])
              ),
              escola: normalizarTexto(
                pegarValor(linha, [
                  "ESCOLA",
                  "INSTITUIÇÃO",
                  "INSTITUICAO",
                  "UNIDADE ESCOLAR",
                ])
              ),
              municipio: normalizarTexto(
                pegarValor(linha, ["CIDADE", "MUNICIPIO", "MUNICÍPIO", "MUNÍCIPIO"])
              ),
              data_nascimento: formatarNascimentoParaBanco(dataNascimento),
              sexo: normalizarTexto(pegarValor(linha, ["SEXO", "NAIPE"])),
              modalidade: "ATLETISMO",
              prova: provaPadronizada.nome,
              prova_original: provaPadronizada.original,
              parametrizada: provaPadronizada.parametrizada,
              categoria,
              naipe,
              tipo: provaPadronizada.tipo,
              competicao: normalizarTexto(competicao),
              evento: EVENTO_PRINCIPAL,
            };
          })
          .filter((linha) => linha.nome && linha.prova && linha.escola);

        const semNascimento = tratados.filter((l) => !l.data_nascimento).length;

        const semCategoria = tratados.filter((l) =>
          String(l.categoria).includes("não identificada")
        ).length;

        const semNaipe = tratados.filter((l) =>
          String(l.naipe).includes("não identificado")
        ).length;

        const municipio = detectarMunicipio(tratados);
        const naoParametrizadas = tratados.filter((l) => !l.parametrizada).length;

        setLinhas(tratados);
        setResumo(montarResumo(tratados));
        setMunicipioDetectado(municipio);

        setMensagem(
          `Planilha lida: ${tratados.length} inscrição(ões). Município: ${municipio}. Sem nascimento: ${semNascimento}. Sem categoria: ${semCategoria}. Sem naipe: ${semNaipe}. Sem padrão oficial exato: ${naoParametrizadas}.`
        );
      } catch (erro) {
        console.error(erro);
        setMensagem("Erro ao ler planilha: " + erro.message);
      }
    };

    leitor.readAsArrayBuffer(arquivo);
  }

  async function buscarOuCriarEvento() {
    const { data: existente, error: erroBusca } = await supabase
      .from("eventos")
      .select("*")
      .eq("nome", EVENTO_PRINCIPAL)
      .maybeSingle();

    if (erroBusca) throw erroBusca;
    if (existente) return existente;

    const { data: novo, error: erroNovo } = await supabase
      .from("eventos")
      .insert({ nome: EVENTO_PRINCIPAL, local: "Roraima" })
      .select()
      .single();

    if (erroNovo) throw erroNovo;

    return novo;
  }

  async function buscarEscolasExistentes(nomesEscolas) {
    const escolas = [];

    for (const bloco of dividirEmBlocos(nomesEscolas, 50)) {
      const { data, error } = await supabase
        .from("escolas")
        .select("*")
        .in("nome", bloco);

      if (error) {
        console.error("ERRO AO BUSCAR ESCOLAS:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          quantidade: bloco.length,
        });

        throw error;
      }

      escolas.push(...(data || []));
    }

    return escolas;
  }

  async function buscarAtletasExistentes(escolaIds, categorias) {
    const atletas = [];
    const escolaIdsUnicos = unicos(escolaIds);
    const categoriasUnicas = unicos(categorias);

    if (escolaIdsUnicos.length === 0) return atletas;

    for (const blocoEscolas of dividirEmBlocos(escolaIdsUnicos, 40)) {
      let query = supabase
        .from("atletas")
        .select("id,nome,numero,numero_competicao,municipio,categoria,naipe,escola_id")
        .in("escola_id", blocoEscolas);

      if (categoriasUnicas.length > 0 && categoriasUnicas.length <= 20) {
        query = query.in("categoria", categoriasUnicas);
      }

      let { data, error } = await query;

      if (error) {
        console.warn("Busca com numero_competicao falhou. Tentando fallback sem numero_competicao.", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        let queryFallback = supabase
          .from("atletas")
          .select("id,nome,numero,municipio,categoria,naipe,escola_id")
          .in("escola_id", blocoEscolas);

        if (categoriasUnicas.length > 0 && categoriasUnicas.length <= 20) {
          queryFallback = queryFallback.in("categoria", categoriasUnicas);
        }

        const fallback = await queryFallback;
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error("ERRO COMPLETO AO BUSCAR ATLETAS:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          blocoQuantidade: blocoEscolas.length,
          blocoEscolas,
        });

        throw new Error(
          error.details || error.message || "Erro ao buscar atletas existentes"
        );
      }

      atletas.push(...(data || []));
    }

    return atletas;
  }

  async function buscarInscricoesExistentes(eventoId, provaIds, atletaIds) {
    const inscricoes = [];
    const provaIdsUnicos = unicos(provaIds);
    const atletaIdsSet = new Set(unicos(atletaIds));

    if (provaIdsUnicos.length === 0 || atletaIdsSet.size === 0) return inscricoes;

    for (const blocoProvas of dividirEmBlocos(provaIdsUnicos, 40)) {
      const { data, error } = await supabase
        .from("inscricoes")
        .select("atleta_id, prova_id")
        .eq("evento_id", eventoId)
        .in("prova_id", blocoProvas);

      if (error) {
        console.error("ERRO AO BUSCAR INSCRIÇÕES EXISTENTES:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          blocoQuantidade: blocoProvas.length,
        });

        throw error;
      }

      const filtradas = (data || []).filter((item) =>
        atletaIdsSet.has(item.atleta_id)
      );

      inscricoes.push(...filtradas);
    }

    return inscricoes;
  }

  async function salvarNoSupabase() {
    try {
      if (linhas.length === 0) {
        alert("Importe uma planilha primeiro.");
        return;
      }

      setCarregando(true);
      setMensagem("Salvando planilha geral no Supabase...");

      const evento = await buscarOuCriarEvento();
      const municipio = municipioDetectado || detectarMunicipio(linhas);

      const nomesEscolas = unicos(linhas.map((l) => l.escola));

      setMensagem("Verificando escolas existentes...");

      const escolasExistentes = await buscarEscolasExistentes(nomesEscolas);

      const mapaEscolas = {};

      (escolasExistentes || []).forEach((e) => {
        mapaEscolas[e.nome] = e.id;
      });

      const escolasParaCriar = nomesEscolas
        .filter((nome) => !mapaEscolas[nome])
        .map((nome) => {
          const linha = linhas.find((l) => l.escola === nome);

          return {
            nome,
            municipio: linha?.municipio || municipio,
          };
        });

      let novasEscolas = [];

      if (escolasParaCriar.length > 0) {
        setMensagem(`Criando ${escolasParaCriar.length} escola(s)...`);

        novasEscolas = await inserirEmBlocosComRetorno(
          "escolas",
          escolasParaCriar,
          "*",
          300
        );

        novasEscolas.forEach((e) => {
          mapaEscolas[e.nome] = e.id;
        });
      }

      const linhasComEscolaId = linhas.map((l) => ({
        ...l,
        escola_id: mapaEscolas[l.escola],
      }));

      const atletasUnicos = [
        ...new Map(
          linhasComEscolaId.map((l) => [
            chaveAtleta(l, l.escola_id),
            {
              numero: l.numero,
              nome: l.nome,
              escola_id: l.escola_id,
              municipio: l.municipio || municipio,
              data_nascimento: l.data_nascimento || null,
              categoria: l.categoria,
              naipe: l.naipe,
            },
          ])
        ).values(),
      ];

      const categoriasAtletas = unicos(atletasUnicos.map((a) => a.categoria));
      const escolasAtletas = unicos(atletasUnicos.map((a) => a.escola_id));

      setMensagem("Verificando atletas existentes...");

      const atletasExistentes = await buscarAtletasExistentes(
        escolasAtletas,
        categoriasAtletas
      );

      const chavesAtletasDaImportacao = new Set(
        atletasUnicos.map(
          (a) => `${a.nome}|${a.escola_id || "SEM_ESCOLA"}|${a.categoria}`
        )
      );

      const mapaAtletas = {};

      (atletasExistentes || [])
        .filter((a) =>
          chavesAtletasDaImportacao.has(
            `${a.nome}|${a.escola_id || "SEM_ESCOLA"}|${a.categoria}`
          )
        )
        .forEach((a) => {
          const chave = `${a.nome}|${a.escola_id || "SEM_ESCOLA"}|${a.categoria}`;
          mapaAtletas[chave] = a.id;
        });

      const atletasParaCriar = atletasUnicos.filter(
        (a) => !mapaAtletas[`${a.nome}|${a.escola_id || "SEM_ESCOLA"}|${a.categoria}`]
      );

      let atletasCriados = [];

      if (atletasParaCriar.length > 0) {
        setMensagem(`Criando ${atletasParaCriar.length} atleta(s)...`);

        atletasCriados = await inserirEmBlocosComRetorno(
          "atletas",
          atletasParaCriar,
          "id,nome,escola_id,categoria",
          500
        );

        (atletasCriados || []).forEach((a) => {
          const chave = `${a.nome}|${a.escola_id || "SEM_ESCOLA"}|${a.categoria}`;
          mapaAtletas[chave] = a.id;
        });
      }

      const provasUnicas = [
        ...new Map(
          linhasComEscolaId.map((l) => [
            chaveProva(l),
            {
              evento_id: evento.id,
              nome: l.prova,
              categoria: l.categoria,
              naipe: l.naipe,
              tipo: l.tipo,
              status: "pendente",
              fase: "QUALIFICAÇÃO",
            },
          ])
        ).values(),
      ];

      setMensagem("Verificando provas existentes...");

      const { data: provasExistentes, error: erroProvasExistentes } =
        await supabase.from("provas").select("*").eq("evento_id", evento.id);

      if (erroProvasExistentes) throw erroProvasExistentes;

      const mapaProvas = {};

      (provasExistentes || []).forEach((p) => {
        mapaProvas[`${p.nome}|${p.categoria}|${p.naipe}`] = p.id;
      });

      const provasParaCriar = provasUnicas.filter(
        (p) => !mapaProvas[`${p.nome}|${p.categoria}|${p.naipe}`]
      );

      let novasProvas = [];

      if (provasParaCriar.length > 0) {
        setMensagem(`Criando ${provasParaCriar.length} prova(s)...`);

        novasProvas = await inserirEmBlocosComRetorno(
          "provas",
          provasParaCriar,
          "*",
          300
        );

        novasProvas.forEach((p) => {
          mapaProvas[`${p.nome}|${p.categoria}|${p.naipe}`] = p.id;
        });
      }

      const inscricoesMap = new Map();
      let duplicadasIgnoradas = 0;

      linhasComEscolaId.forEach((l) => {
        const atletaId = mapaAtletas[chaveAtleta(l, l.escola_id)];
        const provaId = mapaProvas[chaveProva(l)];

        if (!atletaId || !provaId) return;

        const chaveInscricao = `${atletaId}|${provaId}`;

        if (inscricoesMap.has(chaveInscricao)) {
          duplicadasIgnoradas += 1;
          return;
        }

        inscricoesMap.set(chaveInscricao, {
          evento_id: evento.id,
          atleta_id: atletaId,
          prova_id: provaId,
        });
      });

      const inscricoesParaSalvar = [...inscricoesMap.values()];

      const atletaIds = unicos(inscricoesParaSalvar.map((i) => i.atleta_id));
      const provaIds = unicos(inscricoesParaSalvar.map((i) => i.prova_id));

      let duplicadasBancoIgnoradas = 0;

      if (atletaIds.length > 0 && provaIds.length > 0) {
        setMensagem("Verificando inscrições já existentes...");

        const inscricoesExistentes = await buscarInscricoesExistentes(
          evento.id,
          provaIds,
          atletaIds
        );

        const chavesExistentes = new Set(
          (inscricoesExistentes || []).map((i) => `${i.atleta_id}|${i.prova_id}`)
        );

        for (const chaveExistente of chavesExistentes) {
          if (inscricoesMap.has(chaveExistente)) {
            inscricoesMap.delete(chaveExistente);
            duplicadasBancoIgnoradas += 1;
          }
        }
      }

      const inscricoesNovasParaSalvar = [...inscricoesMap.values()];

      if (inscricoesNovasParaSalvar.length > 0) {
        setMensagem(`Criando ${inscricoesNovasParaSalvar.length} inscrição(ões)...`);

        await inserirEmBlocosSemRetorno(
          "inscricoes",
          inscricoesNovasParaSalvar,
          700
        );
      }

      await supabase.from("importacoes").insert({
        evento_id: evento.id,
        municipio,
        arquivo_nome: arquivoNome,
        total_atletas: linhas.length,
      });

      setMensagem(
        `Importação finalizada: ${atletasParaCriar.length} atleta(s) novo(s), ${inscricoesNovasParaSalvar.length} inscrição(ões) nova(s), ${provasParaCriar.length} prova(s) nova(s). Duplicadas no arquivo: ${duplicadasIgnoradas}. Duplicadas no banco: ${duplicadasBancoIgnoradas}.`
      );
    } catch (erro) {
      console.error("ERRO COMPLETO AO SALVAR IMPORTACAO:", {
        message: erro?.message,
        code: erro?.code,
        details: erro?.details,
        hint: erro?.hint,
        raw: erro,
      });

      setMensagem(
        "Erro na importação: " +
          (erro?.details || erro?.message || JSON.stringify(erro))
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <h1>Importação de Planilha</h1>

      <p className="muted">
        Importe a planilha geral do atletismo. O sistema lê todas as abas,
        calcula categoria pela data de nascimento e padroniza as provas.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <input type="file" accept=".xlsx,.xls" onChange={lerPlanilha} />

        <button
          onClick={salvarNoSupabase}
          disabled={carregando || linhas.length === 0}
          style={{
            ...botaoSalvar,
            opacity: carregando || linhas.length === 0 ? 0.65 : 1,
            cursor: carregando || linhas.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {carregando ? "Salvando..." : "Salvar Importação"}
        </button>

        {arquivoNome && <p>Arquivo: {arquivoNome}</p>}
        {municipioDetectado && <p>Município detectado: {municipioDetectado}</p>}
        {mensagem && <p>{mensagem}</p>}
      </div>

      <h2>Resumo das provas encontradas</h2>

      <div className="card">
        <table width="100%" cellPadding="10">
          <thead>
            <tr>
              <th align="left">Prova padrão</th>
              <th align="left">Categoria</th>
              <th align="left">Naipe</th>
              <th align="left">Tipo</th>
              <th align="center">Inscrições</th>
              <th align="center">Padrão oficial</th>
              <th align="center">Sem padrão exato</th>
            </tr>
          </thead>

          <tbody>
            {resumo.map((item, index) => (
              <tr key={index}>
                <td>{item.prova}</td>
                <td>{item.categoria}</td>
                <td>{item.naipe}</td>
                <td>{item.tipo}</td>
                <td align="center">{item.total}</td>
                <td align="center">{item.parametrizados}</td>
                <td align="center">{item.naoParametrizados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {linhas.length > 0 && (
        <>
          <h2>Prévia dos primeiros atletas</h2>

          <div className="card">
            <table width="100%" cellPadding="10">
              <thead>
                <tr>
                  <th align="left">Nº</th>
                  <th align="left">Nome</th>
                  <th align="left">Nascimento</th>
                  <th align="left">Escola</th>
                  <th align="left">Município</th>
                  <th align="left">Prova original</th>
                  <th align="left">Prova padrão</th>
                  <th align="left">Categoria</th>
                  <th align="left">Naipe</th>
                </tr>
              </thead>

              <tbody>
                {linhas.slice(0, 50).map((item, index) => (
                  <tr key={index}>
                    <td>{item.numero}</td>
                    <td>{item.nome}</td>
                    <td>{formatarDataBR(item.data_nascimento)}</td>
                    <td>{item.escola}</td>
                    <td>{item.municipio || "-"}</td>
                    <td>{item.prova_original}</td>
                    <td>{item.prova}</td>
                    <td>{item.categoria}</td>
                    <td>{item.naipe}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {linhas.length > 50 && (
              <p className="muted">
                Mostrando os primeiros 50 registros de {linhas.length}.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const botaoSalvar = {
  marginLeft: 12,
  padding: "12px 18px",
  borderRadius: 10,
  border: "none",
  background: "#22c55e",
  color: "#020617",
  fontWeight: "bold",
  cursor: "pointer",
};