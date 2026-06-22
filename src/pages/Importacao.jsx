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

  function normalizarTexto(valor) {
    if (!valor) return "";
    return String(valor).trim().toUpperCase();
  }

  function limparAcentos(texto) {
    return normalizarTexto(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function limparProva(prova) {
    let p = normalizarTexto(prova);

    p = p.replace(" - MASCULINO", "");
    p = p.replace(" - FEMININO", "");
    p = p.replace(" MASCULINO", "");
    p = p.replace(" FEMININO", "");
    p = p.replace(" - MAS", "");
    p = p.replace(" - FEM", "");
    p = p.replace("→", "");
    p = p.replace("➔", "");
    p = p.replace(/[:;.]+$/g, "");
    p = p.replace(/\s+/g, " ");

    return p.trim();
  }

  function pegarValor(linha, nomes) {
    for (const nome of nomes) {
      if (linha[nome] !== undefined && linha[nome] !== "") {
        return linha[nome];
      }
    }

    return "";
  }

  function extrairAnoNascimento(dataNascimento) {
    if (!dataNascimento) return null;

    if (
      dataNascimento instanceof Date &&
      !Number.isNaN(dataNascimento.getTime())
    ) {
      return dataNascimento.getFullYear();
    }

    const valor = String(dataNascimento).trim();
    if (!valor) return null;

    if (valor.includes("/") || valor.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const partes = valor.split(/[/-]/);
      const ano = Number(partes[2]);
      return Number.isFinite(ano) ? ano : null;
    }

    if (valor.match(/^\d{4}-\d{1,2}-\d{1,2}/)) {
      const ano = Number(valor.slice(0, 4));
      return Number.isFinite(ano) ? ano : null;
    }

    if (!Number.isNaN(Number(valor))) {
      const numero = Number(valor);

      if (numero > 20000) {
        const jsDate = new Date((numero - 25569) * 86400 * 1000);
        const ano = jsDate.getUTCFullYear();
        return Number.isFinite(ano) ? ano : null;
      }

      if (numero >= 1900 && numero <= 2100) return numero;
    }

    const matchAno = valor.match(/(19|20)\d{2}/);
    if (matchAno) return Number(matchAno[0]);

    return null;
  }

  function formatarNascimentoParaTela(dataNascimento) {
    if (!dataNascimento) return "";

    if (
      dataNascimento instanceof Date &&
      !Number.isNaN(dataNascimento.getTime())
    ) {
      return dataNascimento.toLocaleDateString("pt-BR");
    }

    return String(dataNascimento);
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
    if (municipios.length > 0) return municipios[0];
    return "MUNICÍPIO NÃO IDENTIFICADO";
  }

  function chaveAtleta(linha, escolaId) {
    return `${linha.nome}|${escolaId || "SEM_ESCOLA"}|${linha.categoria}`;
  }

  function chaveProva(linha) {
    return `${linha.prova}|${linha.categoria}|${linha.naipe}`;
  }

  function lerPlanilha(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    setArquivoNome(arquivo.name);

    const leitor = new FileReader();

    leitor.onload = async (evt) => {
      try {
        setMensagem("Lendo planilha e padronizando provas pelo regulamento oficial...");

        const dados = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(dados, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const tratados = json
          .filter(
            (linha) =>
              normalizarTexto(pegarValor(linha, ["TIPO USUARIO", "TIPO USUÁRIO"])) ===
              "ATLETA"
          )
          .filter((linha) => {
            const status = normalizarTexto(
              pegarValor(linha, ["STATUS DA INSCRIÇÃO", "VALIDAÇÃO", "VALIDADE"])
            );

            return status === "" || status.includes("VÁLIDA") || status.includes("VALIDA");
          })
          .filter(
            (linha) =>
              normalizarTexto(pegarValor(linha, ["MODALIDADE", "MODALIDA"])) ===
              "ATLETISMO"
          )
          .map((linha, index) => {
            const provaOriginal = pegarValor(linha, ["PROVA"]);
            const competicao = pegarValor(linha, ["COMPETICAO", "COMPETIÇÃO"]);
            const dataNascimento = pegarValor(linha, [
              "DATA NASCIMENTO",
              "DATA DE NASCIMENTO",
              "NASCIMENTO",
              "NASCIM",
              "DT NASCIMENTO",
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
              numero: String(pegarValor(linha, ["NÚMERO", "NUMERO", "Nº"]) || index + 1),
              nome: normalizarTexto(pegarValor(linha, ["NOME", "ATLETA"])),
              escola: normalizarTexto(
                pegarValor(linha, ["ESCOLA", "INSTITUIÇÃO", "INSTITUICAO"])
              ),
              municipio: normalizarTexto(
                pegarValor(linha, ["CIDADE", "MUNICIPIO", "MUNICÍPIO"])
              ),
              data_nascimento: formatarNascimentoParaTela(dataNascimento),
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

        const municipio = detectarMunicipio(tratados);
        const naoParametrizadas = tratados.filter((l) => !l.parametrizada).length;

        setLinhas(tratados);
        setResumo(montarResumo(tratados));
        setMunicipioDetectado(municipio);

        setMensagem(
          `Planilha lida: ${tratados.length} inscrição(ões). Município: ${municipio}. ${naoParametrizadas} registro(s) sem padrão oficial exato.`
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

  async function verificarMunicipioImportado(eventoId, municipio) {
    const { data, error } = await supabase
      .from("importacoes")
      .select("*")
      .eq("evento_id", eventoId)
      .eq("municipio", municipio)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async function salvarNoSupabase() {
    try {
      if (linhas.length === 0) {
        alert("Importe uma planilha primeiro.");
        return;
      }

      setCarregando(true);
      setMensagem("Verificando município e salvando no evento principal...");

      const evento = await buscarOuCriarEvento();
      const municipio = municipioDetectado || detectarMunicipio(linhas);

      const importacaoExistente = await verificarMunicipioImportado(evento.id, municipio);

      if (importacaoExistente) {
        setMensagem(`Atenção: o município ${municipio} já foi importado neste evento.`);
        setCarregando(false);
        return;
      }

      const nomesEscolas = [...new Set(linhas.map((l) => l.escola).filter(Boolean))];

      const { data: escolasExistentes, error: erroEscolasExistentes } = await supabase
        .from("escolas")
        .select("*")
        .in("nome", nomesEscolas);

      if (erroEscolasExistentes) throw erroEscolasExistentes;

      const mapaEscolas = {};

      (escolasExistentes || []).forEach((e) => {
        mapaEscolas[e.nome] = e.id;
      });

      const escolasParaCriar = nomesEscolas
        .filter((nome) => !mapaEscolas[nome])
        .map((nome) => {
          const linha = linhas.find((l) => l.escola === nome);
          return { nome, municipio: linha?.municipio || municipio };
        });

      if (escolasParaCriar.length > 0) {
        const { data: novasEscolas, error: erroNovasEscolas } = await supabase
          .from("escolas")
          .insert(escolasParaCriar)
          .select();

        if (erroNovasEscolas) throw erroNovasEscolas;

        novasEscolas.forEach((e) => {
          mapaEscolas[e.nome] = e.id;
        });
      }

      const linhasComEscolaId = linhas.map((l) => ({
        ...l,
        escola_id: mapaEscolas[l.escola],
      }));

      const mapaAtletas = {};

      const atletasUnicos = [
        ...new Map(
          linhasComEscolaId.map((l) => [
            chaveAtleta(l, l.escola_id),
            {
              numero: l.numero,
              nome: l.nome,
              escola_id: l.escola_id,
              municipio: l.municipio || municipio,
              categoria: l.categoria,
              naipe: l.naipe,
            },
          ])
        ).values(),
      ];

      const atletasParaCriar = atletasUnicos;

      if (atletasParaCriar.length > 0) {
        const { data: atletasCriados, error: erroAtletas } = await supabase
          .from("atletas")
          .insert(atletasParaCriar)
          .select("id, nome, escola_id, categoria");

        if (erroAtletas) throw erroAtletas;

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

      const { data: provasExistentes, error: erroProvasExistentes } = await supabase
        .from("provas")
        .select("*")
        .eq("evento_id", evento.id);

      if (erroProvasExistentes) throw erroProvasExistentes;

      const mapaProvas = {};

      (provasExistentes || []).forEach((p) => {
        mapaProvas[`${p.nome}|${p.categoria}|${p.naipe}`] = p.id;
      });

      const provasParaCriar = provasUnicas.filter(
        (p) => !mapaProvas[`${p.nome}|${p.categoria}|${p.naipe}`]
      );

      if (provasParaCriar.length > 0) {
        const { data: novasProvas, error: erroNovasProvas } = await supabase
          .from("provas")
          .insert(provasParaCriar)
          .select();

        if (erroNovasProvas) throw erroNovasProvas;

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

      if (inscricoesParaSalvar.length > 0) {
        const { error: erroInscricoes } = await supabase
          .from("inscricoes")
          .insert(inscricoesParaSalvar);

        if (erroInscricoes) throw erroInscricoes;
      }

      const { error: erroImportacao } = await supabase.from("importacoes").insert({
        evento_id: evento.id,
        municipio,
        arquivo_nome: arquivoNome,
        total_atletas: linhas.length,
      });

      if (erroImportacao) throw erroImportacao;

      setMensagem(
        `Importação finalizada: ${municipio}. ${atletasParaCriar.length} atleta(s) novo(s), ${inscricoesParaSalvar.length} inscrição(ões), ${provasParaCriar.length} prova(s) nova(s). Duplicadas ignoradas: ${duplicadasIgnoradas}.`
      );
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro na importação: " + (erro.message || JSON.stringify(erro)));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <h1>Importação de Planilha</h1>

      <p className="muted">
        Importe os municípios. O sistema calcula a categoria pela data de nascimento e usa o regulamento oficial para padronizar as provas.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <input type="file" accept=".xlsx,.xls" onChange={lerPlanilha} />

        <button
          onClick={salvarNoSupabase}
          disabled={carregando || linhas.length === 0}
          style={botaoSalvar}
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
                  <th align="left">Prova original</th>
                  <th align="left">Prova padrão</th>
                  <th align="left">Categoria</th>
                  <th align="left">Naipe</th>
                </tr>
              </thead>

              <tbody>
                {linhas.slice(0, 30).map((item, index) => (
                  <tr key={index}>
                    <td>{item.numero}</td>
                    <td>{item.nome}</td>
                    <td>{item.data_nascimento || "-"}</td>
                    <td>{item.escola}</td>
                    <td>{item.prova_original}</td>
                    <td>{item.prova}</td>
                    <td>{item.categoria}</td>
                    <td>{item.naipe}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {linhas.length > 30 && (
              <p className="muted">
                Mostrando os primeiros 30 registros de {linhas.length}.
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