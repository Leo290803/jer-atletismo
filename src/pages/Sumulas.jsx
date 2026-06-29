import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";


const CONFIG_PADRAO = {
  texto_cabecalho: "SÚMULA OFICIAL DE ATLETISMO - JER 2026",
  mostrar_municipio: true,
  mostrar_assinaturas: true,
  quantidade_raias: 8,
  atletas_por_serie_campo: 15,
  finalistas_campo: 8,
  alturas_salto_altura: [
    "1.15", "1.20", "1.25", "1.30", "1.35", "1.40",
    "1.45", "1.50", "1.55", "1.60", "1.65", "1.70",
    "1.75", "1.80"
  ],
};

function formatarNascimento(data) {
  if (!data) return "-";

  const dataFormatada = new Date(data);
  if (Number.isNaN(dataFormatada.getTime())) {
    return String(data);
  }

  return dataFormatada.toLocaleDateString("pt-BR");
}

export default function Sumulas() {
  const hoje = new Date().toISOString().slice(0, 10);

  const [config, setConfig] = useState(CONFIG_PADRAO);
  const [provas, setProvas] = useState([]);
  const [provaSelecionada, setProvaSelecionada] = useState("");
  const [dataProva, setDataProva] = useState(hoje);
  const [series, setSeries] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [mostrarProximaFase, setMostrarProximaFase] = useState(false);

  const [buscaProva, setBuscaProva] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroNaipe, setFiltroNaipe] = useState("");
  const [filtroFase, setFiltroFase] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const [tipoProximaFase, setTipoProximaFase] = useState("FINAL");
  const [criterioClassificacao, setCriterioClassificacao] = useState("q_q");
  const [quantidadeClassificados, setQuantidadeClassificados] = useState(8);
  const [raiasProximaFase, setRaiasProximaFase] = useState(8);
  const [qAutomaticos, setQAutomaticos] = useState(2);
  const [qTempos, setQTempos] = useState(2);

  const [mostrarGerenciarInscritos, setMostrarGerenciarInscritos] = useState(false);
  const [inscricoesProva, setInscricoesProva] = useState([]);
  const [buscaAtleta, setBuscaAtleta] = useState("");
  const [atletasEncontrados, setAtletasEncontrados] = useState([]);
  const [carregandoInscritos, setCarregandoInscritos] = useState(false);

  
  useEffect(() => {
    carregarConfiguracoes();
    carregarProvas();
  }, []);

  async function carregarConfiguracoes() {
    const { data } = await supabase
      .from("configuracoes")
      .select("*")
      .eq("chave", "atletismo_geral")
      .maybeSingle();

    if (data?.valor) {
      const novaConfig = {
        ...CONFIG_PADRAO,
        ...data.valor,
      };

      setConfig(novaConfig);

      if (novaConfig.finalistas_campo) {
        setQuantidadeClassificados(Number(novaConfig.finalistas_campo));
      }

      if (novaConfig.quantidade_raias) {
        setRaiasProximaFase(Number(novaConfig.quantidade_raias));
      }
    }
  }

  async function carregarProvas() {
    const { data, error } = await supabase
      .from("provas")
      .select("*")
      .order("nome");

    if (error) {
      setMensagem(error.message);
      return;
    }

    setProvas(data || []);
  }

  async function selecionarProva(id) {
    setProvaSelecionada(id);
    setInscricoesProva([]);
    setAtletasEncontrados([]);
    setBuscaAtleta("");
    await carregarSeries(id);
  }

  async function carregarInscricoesDaProva(provaId = provaSelecionada) {
    if (!provaId) {
      alert("Selecione uma prova primeiro.");
      return;
    }

    setCarregandoInscritos(true);
    setMensagem("Carregando inscritos da prova...");

    const { data, error } = await supabase
      .from("inscricoes")
      .select(`
        id,
        evento_id,
        prova_id,
        atleta_id,
        atletas (
          id,
          numero,
          nome,
          municipio,
          data_nascimento,
          categoria,
          naipe,
          escolas (
            id,
            nome
          )
        )
      `)
      .eq("prova_id", provaId)
      .order("id", { ascending: true });

    setCarregandoInscritos(false);

    if (error) {
      setMensagem("Erro ao carregar inscritos: " + error.message);
      return;
    }

    setInscricoesProva(data || []);
    setMensagem(`Inscritos carregados: ${(data || []).length}.`);
  }

  async function abrirGerenciarInscritos() {
    if (!provaSelecionada) {
      alert("Selecione uma prova primeiro.");
      return;
    }

    const novoValor = !mostrarGerenciarInscritos;
    setMostrarGerenciarInscritos(novoValor);

    if (novoValor) {
      await carregarInscricoesDaProva(provaSelecionada);
    }
  }

  async function buscarAtletas() {
    const termo = buscaAtleta.trim();

    if (termo.length < 2) {
      alert("Digite pelo menos 2 letras do nome do atleta.");
      return;
    }

    setMensagem("Buscando atletas...");

    const { data, error } = await supabase
      .from("atletas")
      .select(`
        id,
        numero,
        nome,
        municipio,
        data_nascimento,
        categoria,
        naipe,
        escolas (
          id,
          nome
        )
      `)
      .ilike("nome", `%${termo}%`)
      .order("nome")
      .limit(20);

    if (error) {
      setMensagem("Erro ao buscar atletas: " + error.message);
      return;
    }

    setAtletasEncontrados(data || []);
    setMensagem(`Atletas encontrados: ${(data || []).length}.`);
  }

  async function adicionarAtletaNaProva(atleta) {
    try {
      if (!provaSelecionada) {
        alert("Selecione uma prova primeiro.");
        return;
      }

      const provaAtual = provas.find((p) => p.id === provaSelecionada);

      if (!provaAtual) {
        alert("Prova não encontrada.");
        return;
      }

      const jaInscrito = inscricoesProva.some(
        (i) => i.atleta_id === atleta.id || i.atletas?.id === atleta.id
      );

      if (jaInscrito) {
        alert("Esse atleta já está inscrito nesta prova.");
        return;
      }

      const { error } = await supabase.from("inscricoes").insert({
        evento_id: provaAtual.evento_id,
        prova_id: provaSelecionada,
        atleta_id: atleta.id,
      });

      if (error) throw error;

      await carregarInscricoesDaProva(provaSelecionada);
      setMensagem("Atleta adicionado na prova. Se as séries já existirem, gere as séries novamente.");
    } catch (err) {
      setMensagem("Erro ao adicionar atleta: " + err.message);
    }
  }

  async function removerInscricaoDaProva(inscricao) {
    try {
      const nome = inscricao.atletas?.nome || "atleta";
      const confirmar = window.confirm(`Remover ${nome} desta prova?`);

      if (!confirmar) return;

      const { data: seriesExistentes } = await supabase
        .from("series")
        .select("id")
        .eq("prova_id", provaSelecionada);

      if (seriesExistentes && seriesExistentes.length > 0) {
        const confirmarSeries = window.confirm(
          "Essa prova já tem séries geradas. Ao remover o atleta, você deve gerar as séries novamente depois. Deseja continuar?"
        );

        if (!confirmarSeries) return;
      }

      await supabase
        .from("resultados")
        .delete()
        .eq("inscricao_id", inscricao.id);

      await supabase
        .from("raias")
        .delete()
        .eq("inscricao_id", inscricao.id);

      const { error } = await supabase
        .from("inscricoes")
        .delete()
        .eq("id", inscricao.id);

      if (error) throw error;

      await carregarInscricoesDaProva(provaSelecionada);
      await carregarSeries(provaSelecionada);

      setMensagem("Atleta removido da prova. Gere as séries novamente para reorganizar.");
    } catch (err) {
      setMensagem("Erro ao remover atleta: " + err.message);
    }
  }

  async function substituirInscricaoDaProva(inscricaoAntiga, atletaNovo) {
    try {
      if (!inscricaoAntiga?.id || !atletaNovo?.id) return;

      const nomeAntigo = inscricaoAntiga.atletas?.nome || "atleta antigo";
      const nomeNovo = atletaNovo.nome || "novo atleta";

      const confirmar = window.confirm(
        `Substituir ${nomeAntigo} por ${nomeNovo} nesta prova?`
      );

      if (!confirmar) return;

      const jaInscrito = inscricoesProva.some(
        (i) => i.id !== inscricaoAntiga.id && (i.atleta_id === atletaNovo.id || i.atletas?.id === atletaNovo.id)
      );

      if (jaInscrito) {
        alert("Esse novo atleta já está inscrito nesta prova.");
        return;
      }

      await supabase
        .from("resultados")
        .delete()
        .eq("inscricao_id", inscricaoAntiga.id);

      const { error } = await supabase
        .from("inscricoes")
        .update({ atleta_id: atletaNovo.id })
        .eq("id", inscricaoAntiga.id);

      if (error) throw error;

      await carregarInscricoesDaProva(provaSelecionada);
      await carregarSeries(provaSelecionada);

      setMensagem("Substituição realizada. Se as séries já existirem, gere as séries novamente.");
    } catch (err) {
      setMensagem("Erro ao substituir atleta: " + err.message);
    }
  }


  async function criarAtletaESubstituir(inscricaoAntiga, dadosNovoAtleta) {
    try {
      if (!inscricaoAntiga?.id) return;

      const nome = String(dadosNovoAtleta?.nome || "").trim().toUpperCase();
      const numero = String(dadosNovoAtleta?.numero || "").trim();

      if (nome.length < 3) {
        alert("Digite o nome completo do novo atleta.");
        return;
      }

      const atletaAntigo = inscricaoAntiga.atletas;
      const provaAtual = provas.find((p) => p.id === provaSelecionada);
      const nomeAntigo = atletaAntigo?.nome || "atleta antigo";
      const escolaId = atletaAntigo?.escolas?.id || null;
      const nomeEscola = atletaAntigo?.escolas?.nome || "mesma escola";
      const municipio = atletaAntigo?.municipio || null;
      const categoria = atletaAntigo?.categoria || provaAtual?.categoria || "SEM CATEGORIA";
      const naipe = atletaAntigo?.naipe || provaAtual?.naipe || "SEM NAIPE";

      const confirmar = window.confirm(
        `Criar ${nome} na ${nomeEscola} e substituir ${nomeAntigo} nesta prova?`
      );

      if (!confirmar) return;

      setMensagem("Criando novo atleta e realizando substituição...");

      const payloadBase = {
        nome,
        municipio,
        categoria,
        naipe,
      };

      if (numero) {
        payloadBase.numero = numero;
      }

      const tentativasPayload = [];

      if (escolaId) {
        tentativasPayload.push({ ...payloadBase, escola_id: escolaId });
        tentativasPayload.push({ ...payloadBase, instituicao_id: escolaId });
        tentativasPayload.push({ ...payloadBase, institution_id: escolaId });
      }

      tentativasPayload.push(payloadBase);

      let atletaCriado = null;
      let ultimoErro = null;

      for (const payload of tentativasPayload) {
        const { data, error } = await supabase
          .from("atletas")
          .insert(payload)
          .select(`
            id,
            numero,
            nome,
            municipio,
            categoria,
            naipe,
            escolas (
              id,
              nome
            )
          `)
          .single();

        if (!error && data) {
          atletaCriado = data;
          break;
        }

        ultimoErro = error;
      }

      if (!atletaCriado) {
        throw ultimoErro || new Error("Não foi possível criar o atleta.");
      }

      await supabase
        .from("resultados")
        .delete()
        .eq("inscricao_id", inscricaoAntiga.id);

      const { error: erroUpdate } = await supabase
        .from("inscricoes")
        .update({ atleta_id: atletaCriado.id })
        .eq("id", inscricaoAntiga.id);

      if (erroUpdate) throw erroUpdate;

      setBuscaAtleta("");
      setAtletasEncontrados([]);

      await carregarInscricoesDaProva(provaSelecionada);
      await carregarSeries(provaSelecionada);

      setMensagem(
        `Atleta ${atletaCriado.nome} criado e substituição realizada. Gere as séries novamente se elas já existirem.`
      );
    } catch (err) {
      setMensagem("Erro ao criar/substituir atleta: " + err.message);
    }
  }

  async function carregarSeries(provaId) {
    if (!provaId) {
      setSeries([]);
      return;
    }

    setMensagem("Carregando séries...");

    const { data, error } = await supabase
      .from("series")
      .select(`
        id,
        numero_serie,
        raias (
          id,
          raia,
          ordem,
          inscricoes (
            id,
            evento_id,
            atleta_id,
            atletas (
              id,
              numero,
              nome,
              municipio,
              data_nascimento,
              escolas (
                nome
              )
            )
          )
        )
      `)
      .eq("prova_id", provaId)
.order("numero_serie", { ascending: true })
    if (error) {
      setMensagem(error.message);
      return;
    }

    const { data: resultadosSalvos } = await supabase
      .from("resultados")
      .select("*")
      .eq("prova_id", provaId);

    const mapaResultados = {};

    (resultadosSalvos || []).forEach((r) => {
      mapaResultados[r.inscricao_id] = r;
    });

    const primeiroResultado = (resultadosSalvos || [])[0];

    if (primeiroResultado?.data_resultado) {
      setDataProva(primeiroResultado.data_resultado);
    }

    const seriesTratadas = (data || []).map((serie) => ({
      ...serie,
      raias: (serie.raias || []).map((r) => {
        const resultado = mapaResultados[r.inscricoes?.id];

        return {
          ...r,
          tempo: resultado?.tempo || "",
          colocacao: resultado?.colocacao || "",
          status: resultado?.status || "OK",
          tentativa1: resultado?.tentativa1 || "",
          tentativa2: resultado?.tentativa2 || "",
          tentativa3: resultado?.tentativa3 || "",
          tentativa4: resultado?.tentativa4 || "",
          tentativa5: resultado?.tentativa5 || "",
          tentativa6: resultado?.tentativa6 || "",
          melhor_marca: resultado?.melhor_marca || "",
          classificacao_parcial: resultado?.classificacao_parcial || "",
          classificacao_parcial_final: resultado?.classificacao_parcial_final || "",
          finalista: resultado?.finalista || false,
          alturas: resultado?.alturas || [],
          resultado_final: resultado?.resultado_final || "",
          publicado: resultado?.publicado || false,
          qualificacao: resultado?.qualificacao || "",
        };
      }),
    }));

    setSeries(seriesTratadas);
    setMensagem(
      seriesTratadas.length
        ? "Séries carregadas."
        : "Nenhuma série encontrada. Use o botão Gerar Séries desta Prova."
    );
  }

async function gerarSeriesDaProva() {
  try {
    if (!provaSelecionada) {
      alert("Selecione uma prova primeiro.");
      return;
    }

    const provaAtual = provas.find((p) => p.id === provaSelecionada);

    if (!provaAtual) {
      alert("Prova não encontrada.");
      return;
    }

    setMensagem("Buscando inscrições da prova...");

    const { data: inscricoes, error: erroInscricoes } = await supabase
      .from("inscricoes")
      .select(`
        id,
        evento_id,
        prova_id,
        atleta_id,
        atletas (
          id,
          nome,
          numero,
          municipio,
          data_nascimento,
          escolas (
            id,
            nome
          )
        )
      `)
      .eq("prova_id", provaSelecionada)
      .order("id", { ascending: true });

    if (erroInscricoes) throw erroInscricoes;

    if (!inscricoes || inscricoes.length === 0) {
      alert("Essa prova não tem atletas inscritos.");
      return;
    }

    const { data: seriesExistentes, error: erroSeriesExistentes } = await supabase
      .from("series")
      .select("id")
      .eq("prova_id", provaSelecionada);

    if (erroSeriesExistentes) throw erroSeriesExistentes;

    if (seriesExistentes && seriesExistentes.length > 0) {
      const confirmar = window.confirm(
        "Essa prova já possui séries. Deseja apagar as séries/raias antigas, resultados e gerar novamente?"
      );

      if (!confirmar) return;

      setMensagem("Apagando séries, raias e resultados antigos...");

      const idsSeries = seriesExistentes.map((s) => s.id);

      const { error: erroApagarResultados } = await supabase
        .from("resultados")
        .delete()
        .eq("prova_id", provaSelecionada);

      if (erroApagarResultados) throw erroApagarResultados;

      if (idsSeries.length > 0) {
        const { error: erroApagarRaias } = await supabase
          .from("raias")
          .delete()
          .in("serie_id", idsSeries);

        if (erroApagarRaias) throw erroApagarRaias;
      }

      const { error: erroApagarSeries } = await supabase
        .from("series")
        .delete()
        .eq("prova_id", provaSelecionada);

      if (erroApagarSeries) throw erroApagarSeries;

      setSeries([]);
    }

    const ehCampo =
      provaAtual.tipo === "campo" ||
      provaAtual.subtipo === "campo_tentativas" ||
      provaAtual.subtipo === "salto_altura";

    const limiteFinalDireta = ehCampo
      ? Number(config.finalistas_campo || 8)
      : Number(config.quantidade_raias || 8);

    const faseAutomatica =
      inscricoes.length <= limiteFinalDireta ? "FINAL" : "QUALIFICAÇÃO";

    const { error: erroAtualizarFase } = await supabase
      .from("provas")
      .update({
        fase: faseAutomatica,
      })
      .eq("id", provaSelecionada);

    if (erroAtualizarFase) throw erroAtualizarFase;

    const quantidadePorSerie = ehCampo
      ? Number(config.atletas_por_serie_campo || 15)
      : Number(config.quantidade_raias || 8);

    const totalSeries = Math.ceil(inscricoes.length / quantidadePorSerie);
    const novasSeries = [];

    setMensagem("Gerando novas séries...");

    for (let i = 1; i <= totalSeries; i++) {
      const { data, error } = await supabase
        .from("series")
        .insert({
          prova_id: provaSelecionada,
          numero_serie: i,
        })
        .select()
        .single();

      if (error) throw error;

      novasSeries.push(data);
    }

    function escolaDaInscricao(inscricao) {
      return (
        inscricao?.atletas?.escolas?.id ||
        inscricao?.atletas?.escolas?.nome ||
        "SEM_ESCOLA"
      );
    }

    function contarConflitosEscola(grupos) {
      let conflitos = 0;

      grupos.forEach((grupo) => {
        const contagem = {};

        grupo.forEach((inscricao) => {
          const escola = escolaDaInscricao(inscricao);
          contagem[escola] = (contagem[escola] || 0) + 1;
        });

        Object.values(contagem).forEach((qtd) => {
          if (qtd > 1) conflitos += qtd - 1;
        });
      });

      return conflitos;
    }

    function grupoTemEscola(grupo, escola) {
      return grupo.some((inscricao) => escolaDaInscricao(inscricao) === escola);
    }

    function distribuirSemRepetirEscola(listaInscricoes) {
      const grupos = Array.from({ length: totalSeries }, () => []);

      const frequenciaEscola = {};

      listaInscricoes.forEach((inscricao) => {
        const escola = escolaDaInscricao(inscricao);
        frequenciaEscola[escola] = (frequenciaEscola[escola] || 0) + 1;
      });

      const ordenadas = [...listaInscricoes].sort((a, b) => {
        const escolaA = escolaDaInscricao(a);
        const escolaB = escolaDaInscricao(b);

        const diff = (frequenciaEscola[escolaB] || 0) - (frequenciaEscola[escolaA] || 0);
        if (diff !== 0) return diff;

        return String(a.atletas?.nome || "").localeCompare(String(b.atletas?.nome || ""));
      });

      ordenadas.forEach((inscricao) => {
        const escola = escolaDaInscricao(inscricao);

        let candidatas = grupos
          .map((grupo, index) => ({
            index,
            grupo,
            tamanho: grupo.length,
            temMesmaEscola: grupoTemEscola(grupo, escola),
          }))
          .filter((item) => item.tamanho < quantidadePorSerie);

        let melhores = candidatas.filter((item) => !item.temMesmaEscola);

        if (melhores.length === 0) {
          melhores = candidatas;
        }

        melhores.sort((a, b) => {
          if (a.tamanho !== b.tamanho) return a.tamanho - b.tamanho;
          return a.index - b.index;
        });

        const escolhida = melhores[0] || candidatas[0];

        if (escolhida) {
          grupos[escolhida.index].push(inscricao);
        }
      });

      return melhorarDistribuicaoPorEscola(grupos);
    }

    function melhorarDistribuicaoPorEscola(gruposOriginais) {
      const grupos = gruposOriginais.map((grupo) => [...grupo]);
      let conflitosAtuais = contarConflitosEscola(grupos);

      if (conflitosAtuais === 0) return grupos;

      let melhorou = true;
      let tentativas = 0;

      while (melhorou && conflitosAtuais > 0 && tentativas < 300) {
        melhorou = false;
        tentativas += 1;

        for (let i = 0; i < grupos.length; i++) {
          for (let a = 0; a < grupos[i].length; a++) {
            const atletaA = grupos[i][a];

            for (let j = 0; j < grupos.length; j++) {
              if (i === j) continue;

              for (let b = 0; b < grupos[j].length; b++) {
                const atletaB = grupos[j][b];

                const novosGrupos = grupos.map((grupo) => [...grupo]);
                novosGrupos[i][a] = atletaB;
                novosGrupos[j][b] = atletaA;

                const novosConflitos = contarConflitosEscola(novosGrupos);

                if (novosConflitos < conflitosAtuais) {
                  grupos[i][a] = atletaB;
                  grupos[j][b] = atletaA;
                  conflitosAtuais = novosConflitos;
                  melhorou = true;
                  break;
                }
              }

              if (melhorou) break;
            }

            if (melhorou) break;
          }

          if (melhorou) break;
        }
      }

      return grupos;
    }

    function distribuirSimples(listaInscricoes) {
      const grupos = Array.from({ length: totalSeries }, () => []);

      listaInscricoes.forEach((inscricao, index) => {
        const serieIndex = Math.floor(index / quantidadePorSerie);
        grupos[serieIndex].push(inscricao);
      });

      return grupos;
    }

    const deveEvitarMesmaEscola =
      faseAutomatica !== "FINAL" &&
      totalSeries > 1;

    const distribuicaoPorSerie = deveEvitarMesmaEscola
  ? distribuirSemRepetirEscola(embaralhar(inscricoes))
  : distribuirSimples(embaralhar(inscricoes));

function embaralhar(lista) {
  const array = [...lista];

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

    const conflitosRestantes = contarConflitosEscola(distribuicaoPorSerie);

    const ordemRaias = embaralhar([1,2,3,4,5,6,7,8,9,10]);
    const raiasParaCriar = [];

    distribuicaoPorSerie.forEach((grupo, serieIndex) => {
      const serieCriada = novasSeries[serieIndex];

      grupo.forEach((inscricao, posicaoNaSerie) => {
        const raia = ehCampo
          ? posicaoNaSerie + 1
          : ordemRaias[posicaoNaSerie] || posicaoNaSerie + 1;

        raiasParaCriar.push({
          serie_id: serieCriada.id,
          inscricao_id: inscricao.id,
          raia,
          ordem: posicaoNaSerie + 1,
        });
      });
    });

    const { error: erroRaias } = await supabase
      .from("raias")
      .insert(raiasParaCriar);

    if (erroRaias) throw erroRaias;

    await carregarProvas();
    await carregarSeries(provaSelecionada);

    setMensagem(
      `Séries geradas com sucesso: ${totalSeries} série(s), ${inscricoes.length} atleta(s). Fase definida automaticamente como ${faseAutomatica}. ${
        deveEvitarMesmaEscola
          ? conflitosRestantes === 0
            ? "Distribuição feita sem repetir escola na mesma série."
            : `Distribuição tentou evitar escolas repetidas. Conflitos restantes: ${conflitosRestantes}.`
          : ""
      }`
    );
  } catch (err) {
    setMensagem("Erro ao gerar séries: " + (err.message || JSON.stringify(err)));
  }
}

  function mudarCampo(serieId, raiaId, campo, valor) {
    setSeries((old) =>
      old.map((serie) => {
        if (serie.id !== serieId) return serie;

        return {
          ...serie,
          raias: serie.raias.map((r) => {
            if (r.id !== raiaId) return r;
            return { ...r, [campo]: valor };
          }),
        };
      })
    );
  }

  function mudarAltura(serieId, raiaId, altura, valor) {
    setSeries((old) =>
      old.map((serie) => {
        if (serie.id !== serieId) return serie;

        return {
          ...serie,
          raias: serie.raias.map((r) => {
            if (r.id !== raiaId) return r;

            const alturasAtuais = Array.isArray(r.alturas) ? r.alturas : [];
            const semAltura = alturasAtuais.filter((a) => a.altura !== altura);

            return {
              ...r,
              alturas: [
                ...semAltura,
                {
                  altura,
                  valor: String(valor).toUpperCase(),
                },
              ],
            };
          }),
        };
      })
    );
  }

  function pegarValorAltura(r, altura) {
    const item = (r.alturas || []).find((a) => a.altura === altura);
    return item?.valor || "";
  }

  function mudarTentativaAltura(serieId, raiaId, altura, indiceTentativa, valorDigitado) {
    const atual = String(
      series
        .find((serie) => serie.id === serieId)
        ?.raias
        ?.find((raia) => raia.id === raiaId)
        ?.alturas
        ?.find((item) => item.altura === altura)
        ?.valor || ""
    )
      .toUpperCase()
      .padEnd(3, " ");

    const caracteres = atual.split("");
    caracteres[indiceTentativa] = String(valorDigitado || "")
      .toUpperCase()
      .slice(-1);

    const novoValor = caracteres.join("").trimEnd();

    mudarAltura(serieId, raiaId, altura, novoValor);
  }

  function tempoParaNumero(tempo) {
    if (!tempo) return 999999;

    const limpo = String(tempo).replace(",", ".").trim();

    if (limpo.includes(":")) {
      const partes = limpo.split(":").map(Number);
      if (partes.length === 2) return partes[0] * 60 + partes[1];
      if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
    }

    return Number(limpo) || 999999;
  }

  function marcaParaNumero(valor) {
    if (!valor) return null;

    const texto = String(valor).trim().toUpperCase();

    if (["X", "-", "DNS", "DQ", "ABD", "DNF", "NM"].includes(texto)) return null;

    const numero = Number(texto.replace(",", "."));

    if (Number.isNaN(numero)) return null;

    return numero;
  }

  function melhorDasTentativas(r) {
    const marcas = [
      marcaParaNumero(r.tentativa1),
      marcaParaNumero(r.tentativa2),
      marcaParaNumero(r.tentativa3),
      marcaParaNumero(r.tentativa4),
      marcaParaNumero(r.tentativa5),
      marcaParaNumero(r.tentativa6),
    ].filter((v) => v !== null);

    if (marcas.length === 0) return "";

    return Math.max(...marcas).toFixed(2).replace(".", ",");
  }

  function melhorDasTresPrimeiras(r) {
    const marcas = [
      marcaParaNumero(r.tentativa1),
      marcaParaNumero(r.tentativa2),
      marcaParaNumero(r.tentativa3),
    ].filter((v) => v !== null);

    if (marcas.length === 0) return "";

    return Math.max(...marcas).toFixed(2).replace(".", ",");
  }

  function marcasValidasCampo(r) {
    return [
      marcaParaNumero(r.tentativa1),
      marcaParaNumero(r.tentativa2),
      marcaParaNumero(r.tentativa3),
      marcaParaNumero(r.tentativa4),
      marcaParaNumero(r.tentativa5),
      marcaParaNumero(r.tentativa6),
    ]
      .filter((v) => v !== null)
      .sort((a, b) => b - a);
  }

  function formatarMarca(valor) {
    if (valor === null || valor === undefined) return "";
    return Number(valor).toFixed(2).replace(".", ",");
  }

  function compararCampoOficial(a, b) {
    const marcasA = marcasValidasCampo(a);
    const marcasB = marcasValidasCampo(b);

    const maiorTamanho = Math.max(marcasA.length, marcasB.length);

    for (let i = 0; i < maiorTamanho; i++) {
      const valorA = marcasA[i] ?? -1;
      const valorB = marcasB[i] ?? -1;

      if (valorA !== valorB) {
        return valorB - valorA;
      }
    }

    return String(a.inscricoes?.atletas?.nome || "").localeCompare(
      String(b.inscricoes?.atletas?.nome || "")
    );
  }

  function calcularResultadoAltura(r) {
    let melhor = "";

    for (const altura of config.alturas_salto_altura) {
      const valor = pegarValorAltura(r, altura).toUpperCase();

      if (["O", "XO", "XXO"].includes(valor)) {
        melhor = altura;
      }

      if (valor === "XXX") break;
    }

    return melhor;
  }

  function classificarAutomaticamente() {
    const provaAtual = provas.find((p) => p.id === provaSelecionada);

    if (!provaAtual) {
      alert("Selecione uma prova.");
      return;
    }

    if (provaAtual.subtipo === "salto_altura") {
      classificarSaltoAltura();
      return;
    }

    if (provaAtual.subtipo === "campo_tentativas") {
      classificarCampo();
      return;
    }

    classificarPista();
  }

  function classificarPista() {
    setSeries((old) =>
      old.map((serie) => {
        const validos = [...serie.raias]
          .filter((r) => r.status === "OK" && r.tempo)
          .sort((a, b) => tempoParaNumero(a.tempo) - tempoParaNumero(b.tempo));

        const mapaColocacao = {};

        validos.forEach((r, index) => {
          mapaColocacao[r.id] = index + 1;
        });

        return {
          ...serie,
          raias: serie.raias.map((r) => ({
            ...r,
            colocacao: mapaColocacao[r.id] || "",
            qualificacao: "",
          })),
        };
      })
    );

    setMensagem("Classificação por série aplicada.");
  }

  function classificarCampo() {
    const todos = [];

    series.forEach((serie) => {
      serie.raias.forEach((raia) => {
        const marcasPrimeiras = [
          marcaParaNumero(raia.tentativa1),
          marcaParaNumero(raia.tentativa2),
          marcaParaNumero(raia.tentativa3),
        ]
          .filter((v) => v !== null)
          .sort((a, b) => b - a);

        const marcasTodas = marcasValidasCampo(raia);

        todos.push({
          ...raia,
          marcasPrimeiras,
          marcasTodas,
          melhorParcialNumero: marcasPrimeiras[0] ?? null,
          melhorFinalNumero: marcasTodas[0] ?? null,
        });
      });
    });

    const rankingParcial = [...todos]
      .filter((r) => r.melhorParcialNumero !== null)
      .sort((a, b) => {
        const marcasA = a.marcasPrimeiras || [];
        const marcasB = b.marcasPrimeiras || [];
        const maiorTamanho = Math.max(marcasA.length, marcasB.length);

        for (let i = 0; i < maiorTamanho; i++) {
          const valorA = marcasA[i] ?? -1;
          const valorB = marcasB[i] ?? -1;

          if (valorA !== valorB) {
            return valorB - valorA;
          }
        }

        return String(a.inscricoes?.atletas?.nome || "").localeCompare(
          String(b.inscricoes?.atletas?.nome || "")
        );
      });

    const rankingCincoTentativas = [...todos]
      .map((r) => {
        const marcasCinco = [
          marcaParaNumero(r.tentativa1),
          marcaParaNumero(r.tentativa2),
          marcaParaNumero(r.tentativa3),
          marcaParaNumero(r.tentativa4),
          marcaParaNumero(r.tentativa5),
        ]
          .filter((v) => v !== null)
          .sort((a, b) => b - a);

        return {
          ...r,
          marcasCinco,
          melhorCincoNumero: marcasCinco[0] ?? null,
        };
      })
      .filter((r) => r.melhorCincoNumero !== null)
      .sort((a, b) => {
        const marcasA = a.marcasCinco || [];
        const marcasB = b.marcasCinco || [];
        const maiorTamanho = Math.max(marcasA.length, marcasB.length);

        for (let i = 0; i < maiorTamanho; i++) {
          const valorA = marcasA[i] ?? -1;
          const valorB = marcasB[i] ?? -1;

          if (valorA !== valorB) {
            return valorB - valorA;
          }
        }

        return String(a.inscricoes?.atletas?.nome || "").localeCompare(
          String(b.inscricoes?.atletas?.nome || "")
        );
      });

    const rankingFinal = [...todos]
      .filter((r) => r.melhorFinalNumero !== null)
      .sort(compararCampoOficial);

    const mapa = {};

    rankingParcial.forEach((r, index) => {
      if (!mapa[r.id]) mapa[r.id] = {};

      mapa[r.id].classificacao_parcial = index + 1;
      mapa[r.id].finalista = index < Number(config.finalistas_campo || 8);
    });

    rankingCincoTentativas.forEach((r, index) => {
      if (!mapa[r.id]) mapa[r.id] = {};

      mapa[r.id].classificacao_parcial_final = index + 1;
    });

    rankingFinal.forEach((r, index) => {
      if (!mapa[r.id]) mapa[r.id] = {};

      mapa[r.id].colocacao = index + 1;
      mapa[r.id].melhor_marca = formatarMarca(r.melhorFinalNumero);
      mapa[r.id].status = "OK";
    });

    todos.forEach((r) => {
      if (!mapa[r.id]) mapa[r.id] = {};

      if (r.melhorFinalNumero === null) {
        mapa[r.id].melhor_marca = "";
        mapa[r.id].colocacao = "";
        mapa[r.id].status = "NM";
      }
    });

    setSeries((old) =>
      old.map((serie) => ({
        ...serie,
        raias: serie.raias.map((r) => ({
          ...r,
          melhor_marca: mapa[r.id]?.melhor_marca || "",
          classificacao_parcial: mapa[r.id]?.classificacao_parcial || "",
          classificacao_parcial_final: mapa[r.id]?.classificacao_parcial_final || "",
          finalista: mapa[r.id]?.finalista || false,
          colocacao: mapa[r.id]?.colocacao || "",
          status: mapa[r.id]?.status || r.status || "OK",
          qualificacao: "",
        })),
      }))
    );

    setMensagem(
      "Classificação de campo aplicada: parcial após 3ª tentativa, parcial após 5ª tentativa, resultado final e desempates oficiais."
    );
  }

function classificarSaltoAltura() {
  function contarErros(valor) {
    return (String(valor || "").toUpperCase().match(/X/g) || []).length;
  }

  const todos = [];

  series.forEach((serie) => {
    serie.raias.forEach((raia) => {
      let melhorAltura = null;
      let melhorAlturaTexto = "";
      let errosNaMelhorAltura = 0;
      let errosTotais = 0;

      config.alturas_salto_altura.forEach((altura) => {
        const valor = pegarValorAltura(raia, altura).toUpperCase();

        errosTotais += contarErros(valor);

        if (valor.includes("O")) {
          melhorAltura = Number(String(altura).replace(",", "."));
          melhorAlturaTexto = altura;
          errosNaMelhorAltura = contarErros(valor);
        }
      });

      todos.push({
        ...raia,
        melhorAltura,
        melhorAlturaTexto,
        errosNaMelhorAltura,
        errosTotais,
      });
    });
  });

  const ranking = [...todos]
    .filter((r) => r.melhorAltura !== null)
    .sort((a, b) => {
      if (b.melhorAltura !== a.melhorAltura) {
        return b.melhorAltura - a.melhorAltura;
      }

      if (a.errosNaMelhorAltura !== b.errosNaMelhorAltura) {
        return a.errosNaMelhorAltura - b.errosNaMelhorAltura;
      }

      if (a.errosTotais !== b.errosTotais) {
        return a.errosTotais - b.errosTotais;
      }

      return String(a.inscricoes?.atletas?.nome || "").localeCompare(
        String(b.inscricoes?.atletas?.nome || "")
      );
    });

  const mapa = {};

  ranking.forEach((r, index) => {
    mapa[r.id] = {
      resultado_final: r.melhorAlturaTexto,
      colocacao: index + 1,
    };
  });

  setSeries((old) =>
    old.map((serie) => ({
      ...serie,
      raias: serie.raias.map((r) => ({
        ...r,
        resultado_final: mapa[r.id]?.resultado_final || calcularResultadoAltura(r),
        colocacao: mapa[r.id]?.colocacao || "",
      })),
    }))
  );

  setMensagem("Classificação oficial do salto em altura aplicada.");
}

  function obterRankingParaProximaFase() {
    const provaAtual = provas.find((p) => p.id === provaSelecionada);
    const todos = [];

    series.forEach((serie) => {
      serie.raias.forEach((r) => {
        if (!r.inscricoes?.id || !r.inscricoes?.atleta_id) return;

        let valor;

        if (provaAtual?.subtipo === "campo_tentativas") {
          valor = marcaParaNumero(r.melhor_marca || melhorDasTentativas(r));
        } else if (provaAtual?.subtipo === "salto_altura") {
          valor = marcaParaNumero(r.resultado_final || calcularResultadoAltura(r));
        } else {
          if (r.status !== "OK") return;
          valor = r.tempo ? tempoParaNumero(r.tempo) : null;
        }

        if (valor === null || valor === 999999) return;

        todos.push({
          ...r,
          valorClassificacao: valor,
          serieNumero: serie.numero_serie,
        });
      });
    });

    if (provaAtual?.tipo === "corrida" || provaAtual?.subtipo === "pista") {
      return todos.sort((a, b) => a.valorClassificacao - b.valorClassificacao);
    }

    return todos.sort((a, b) => b.valorClassificacao - a.valorClassificacao);
  }

  function selecionarClassificados(ranking) {
    const qtdTotal = Number(quantidadeClassificados) || 0;
    const qtdQ = Number(qAutomaticos) || 0;
    const qtdq = Number(qTempos) || 0;

    if (!ranking || ranking.length === 0) return [];

    const provaAtual = provas.find((p) => p.id === provaSelecionada);
    const ehPista = provaAtual?.tipo === "corrida" || provaAtual?.subtipo === "pista";

    if (criterioClassificacao === "melhores_gerais") {
      return ranking.slice(0, qtdTotal).map((r) => ({
        ...r,
        qualificacao: "q",
      }));
    }

    const classificados = [];
    const restantes = [];
    const porSerie = {};

    ranking.forEach((r) => {
      if (!porSerie[r.serieNumero]) {
        porSerie[r.serieNumero] = [];
      }

      porSerie[r.serieNumero].push(r);
    });

    Object.values(porSerie).forEach((listaSerie) => {
      const ordenadosDaSerie = [...listaSerie].sort((a, b) => {
        const ca = Number(a.colocacao || 9999);
        const cb = Number(b.colocacao || 9999);

        if (ca !== cb) return ca - cb;

        return ehPista
          ? a.valorClassificacao - b.valorClassificacao
          : b.valorClassificacao - a.valorClassificacao;
      });

      ordenadosDaSerie.forEach((r, index) => {
        if (index < qtdQ) {
          classificados.push({
            ...r,
            qualificacao: "Q",
          });
        } else {
          restantes.push(r);
        }
      });
    });

    restantes
      .sort((a, b) =>
        ehPista
          ? a.valorClassificacao - b.valorClassificacao
          : b.valorClassificacao - a.valorClassificacao
      )
      .slice(0, qtdq)
      .forEach((r) => {
        classificados.push({
          ...r,
          qualificacao: "q",
        });
      });

    return classificados.slice(0, qtdTotal || classificados.length);
  }

  function aplicarQualificacao(classificados) {
    const mapa = {};

    classificados.forEach((c) => {
      mapa[c.id] = c.qualificacao;
    });

    setSeries((old) =>
      old.map((serie) => ({
        ...serie,
        raias: serie.raias.map((r) => ({
          ...r,
          qualificacao: mapa[r.id] || "",
        })),
      }))
    );
  }


  function provaEhPista(prova) {
    return prova?.tipo === "corrida" || prova?.subtipo === "pista";
  }

  function ordenarClassificadosParaRaias(classificados, provaAtual) {
    const ehPista = provaEhPista(provaAtual);

    return [...classificados].sort((a, b) => {
      if (a.qualificacao !== b.qualificacao) {
        if (a.qualificacao === "Q") return -1;
        if (b.qualificacao === "Q") return 1;
      }

      const valorA = Number(a.valorClassificacao || 999999);
      const valorB = Number(b.valorClassificacao || 999999);

      if (valorA !== valorB) {
        return ehPista ? valorA - valorB : valorB - valorA;
      }

      const colocacaoA = Number(a.colocacao || 9999);
      const colocacaoB = Number(b.colocacao || 9999);

      return colocacaoA - colocacaoB;
    });
  }

  function raiaOficialPorSeed(posicao, totalRaias) {
    const ordem8 = [4, 5, 3, 6, 2, 7, 1, 8];
    const ordem9 = [5, 6, 4, 7, 3, 8, 2, 9, 1];
    const ordem10 = [5, 6, 4, 7, 3, 8, 2, 9, 1, 10];

    if (Number(totalRaias) === 8) return ordem8[posicao] || posicao + 1;
    if (Number(totalRaias) === 9) return ordem9[posicao] || posicao + 1;
    if (Number(totalRaias) === 10) return ordem10[posicao] || posicao + 1;

    return posicao + 1;
  }

  function distribuirEmSeriesBalanceadas(classificadosOrdenados, totalSeries) {
    const grupos = Array.from({ length: totalSeries }, () => []);

    classificadosOrdenados.forEach((atleta, index) => {
      const bloco = Math.floor(index / totalSeries);
      const posicaoNoBloco = index % totalSeries;
      const serieIndex = bloco % 2 === 0
        ? posicaoNoBloco
        : totalSeries - 1 - posicaoNoBloco;

      grupos[serieIndex].push(atleta);
    });

    return grupos;
  }

  async function gerarProximaFase() {
    try {
      const provaAtual = provas.find((p) => p.id === provaSelecionada);

      if (!provaAtual) {
        alert("Selecione uma prova.");
        return;
      }

      const ranking = obterRankingParaProximaFase();
      const classificados = selecionarClassificados(ranking);

      if (classificados.length === 0) {
        alert("Nenhum classificado encontrado.");
        return;
      }

      aplicarQualificacao(classificados);

      const classificadosOrdenados = ordenarClassificadosParaRaias(
        classificados,
        provaAtual
      );

      const fase = tipoProximaFase.toUpperCase();

      const { data: provaExistente } = await supabase
        .from("provas")
        .select("*")
        .eq("evento_id", provaAtual.evento_id)
        .eq("nome", provaAtual.nome)
        .eq("categoria", provaAtual.categoria)
        .eq("naipe", provaAtual.naipe)
        .eq("fase", fase)
        .maybeSingle();

      let novaProva = provaExistente;

      if (!novaProva) {
        const { data, error } = await supabase
          .from("provas")
          .insert({
            evento_id: provaAtual.evento_id,
            nome: provaAtual.nome,
            categoria: provaAtual.categoria,
            naipe: provaAtual.naipe,
            tipo: provaAtual.tipo,
            subtipo: provaAtual.subtipo,
            status: "pendente",
            fase,
            prova_origem_id: provaAtual.id,
            criterio_classificacao: criterioClassificacao,
            total_classificados: classificadosOrdenados.length,
          })
          .select()
          .single();

        if (error) throw error;
        novaProva = data;
      }

      await supabase.from("inscricoes").delete().eq("prova_id", novaProva.id);
      await supabase.from("series").delete().eq("prova_id", novaProva.id);

      const inscricoesParaCriar = classificadosOrdenados.map((c) => ({
        evento_id: provaAtual.evento_id,
        prova_id: novaProva.id,
        atleta_id: c.inscricoes.atleta_id,
      }));

      const { data: novasInscricoes, error: erroInscricoes } = await supabase
        .from("inscricoes")
        .insert(inscricoesParaCriar)
        .select();

      if (erroInscricoes) throw erroInscricoes;

      const inscricaoPorAtleta = {};

      (novasInscricoes || []).forEach((inscricao) => {
        inscricaoPorAtleta[inscricao.atleta_id] = inscricao;
      });

      const totalSeries = Math.ceil(classificadosOrdenados.length / raiasProximaFase);
      const novasSeries = [];

      for (let i = 1; i <= totalSeries; i++) {
        const { data, error } = await supabase
          .from("series")
          .insert({
            prova_id: novaProva.id,
            numero_serie: i,
          })
          .select()
          .single();

        if (error) throw error;
        novasSeries.push(data);
      }

      const distribuicaoPorSerie = distribuirEmSeriesBalanceadas(
        classificadosOrdenados,
        totalSeries
      );

      const raiasParaCriar = [];

      distribuicaoPorSerie.forEach((listaSerie, serieIndex) => {
        const serieCriada = novasSeries[serieIndex];

        listaSerie.forEach((classificado, posicaoNaSerie) => {
          const inscricao = inscricaoPorAtleta[classificado.inscricoes.atleta_id];

          if (!inscricao) return;

          raiasParaCriar.push({
            serie_id: serieCriada.id,
            inscricao_id: inscricao.id,
            raia: raiaOficialPorSeed(posicaoNaSerie, raiasProximaFase),
            ordem: posicaoNaSerie + 1,
          });
        });
      });

      const { error: erroRaias } = await supabase.from("raias").insert(raiasParaCriar);

      if (erroRaias) throw erroRaias;

      await carregarProvas();

      setMensagem(
        `${fase} gerada com sucesso com sorteio oficial de raias. Clique em Publicar no Boletim para salvar Q/q.`
      );
    } catch (err) {
      setMensagem("Erro ao gerar próxima fase: " + err.message);
    }
  }

  async function salvarResultados(publicar = false) {
    try {
      if (!provaSelecionada) {
        alert("Selecione uma prova.");
        return;
      }

      const resultados = [];

      series.forEach((serie) => {
        serie.raias.forEach((r) => {
          resultados.push({
  prova_id: provaSelecionada,
  serie_id: r.serie_id || serie.id,
  inscricao_id: r.inscricoes.id,
            data_resultado: dataProva,
            tempo: r.tempo || null,
            colocacao: r.colocacao ? Number(r.colocacao) : null,
            status: r.status || "OK",
            tentativa1: r.tentativa1 || null,
            tentativa2: r.tentativa2 || null,
            tentativa3: r.tentativa3 || null,
            tentativa4: r.tentativa4 || null,
            tentativa5: r.tentativa5 || null,
            tentativa6: r.tentativa6 || null,
            melhor_marca: r.melhor_marca || null,
            classificacao_parcial: r.classificacao_parcial
              ? Number(r.classificacao_parcial)
              : null,
            classificacao_parcial_final: r.classificacao_parcial_final
              ? Number(r.classificacao_parcial_final)
              : null,
            finalista: !!r.finalista,
            alturas: r.alturas || [],
            resultado_final: r.resultado_final || null,
            publicado: publicar,
            qualificacao: r.qualificacao || null,
          });
        });
      });

      await supabase.from("resultados").delete().eq("prova_id", provaSelecionada);

      const { error } = await supabase.from("resultados").insert(resultados);

      if (error) {
        setMensagem(error.message);
        return;
      }

      setMensagem(
        publicar
          ? "Resultados publicados no boletim com sucesso."
          : "Rascunho salvo."
      );
    } catch (err) {
      setMensagem(err.message);
    }
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

  const provaAtual = provas.find((p) => p.id === provaSelecionada);
  const nomeProvaAtual = String(provaAtual?.nome || "").toUpperCase();
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
  const ehCampoTentativas = provaAtual?.subtipo === "campo_tentativas";
  const ehSaltoAltura = provaAtual?.subtipo === "salto_altura";

  const categorias = [...new Set(provas.map((p) => p.categoria).filter(Boolean))];
  const naipes = [...new Set(provas.map((p) => p.naipe).filter(Boolean))];
  const fases = [...new Set(provas.map((p) => p.fase || "QUALIFICAÇÃO"))];
  const tipos = [...new Set(provas.map((p) => p.subtipo || p.tipo).filter(Boolean))];

  const provasFiltradas = provas.filter((p) => {
    const fase = p.fase || "QUALIFICAÇÃO";
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
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 6mm;
            }

            html, body {
              zoom: 1.05 !important;
            }

            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .sidebar,
            .nao-imprimir,
            .topbar {
              display: none !important;
            }

            html,
            body {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }

            .app,
            .content {
              display: block !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              overflow: visible !important;
            }

            .card,
            .sumula-print {
              background: white !important;
              color: black !important;
              border: none !important;
              box-shadow: none !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              transform: none !important;
            }

            .sumula-print h2 {
              font-size: 17px !important;
              line-height: 1.05 !important;
              margin: 0 0 4px 0 !important;
              text-align: center !important;
              font-weight: 800 !important;
            }

            .sumula-print h3 {
              font-size: 13px !important;
              line-height: 1.05 !important;
              margin: 5px 0 5px 0 !important;
              font-weight: 800 !important;
            }

            .sumula-print p {
              font-size: 10.8px !important;
              line-height: 1.1 !important;
              margin: 0 0 5px 0 !important;
            }

            table {
              width: 100% !important;
              border-collapse: collapse !important;
              background: white !important;
              color: black !important;
            }

            th,
            td {
              border: 1px solid black !important;
              color: black !important;
              vertical-align: middle !important;
              white-space: normal !important;
              word-break: normal !important;
              overflow-wrap: anywhere !important;
            }

            input,
            select {
              border: none !important;
              background: transparent !important;
              color: black !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              font-family: Arial, sans-serif !important;
            }

            input::placeholder {
              color: transparent !important;
            }

            h1,
            h2,
            h3,
            p {
              color: black !important;
            }

            .quebra-pagina {
              break-after: page;
              page-break-after: always;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .quebra-pagina:last-child {
              break-after: auto;
              page-break-after: auto;
            }

            /* PISTA / CORRIDAS */
            .sumula-pista table {
              table-layout: fixed !important;
              font-size: 13.5px !important;
            }

            .sumula-pista th,
            .sumula-pista td {
              padding: 7px 7px !important;
              line-height: 1.3 !important;
            }

            .sumula-pista th:nth-child(1),
            .sumula-pista td:nth-child(1) {
              width: 5% !important;
              text-align: center !important;
            }

            .sumula-pista th:nth-child(2),
            .sumula-pista td:nth-child(2) {
              width: 7% !important;
              text-align: center !important;
            }

            .sumula-pista th:nth-child(3),
            .sumula-pista td:nth-child(3) {
              width: 30% !important;
            }

            .sumula-pista th:nth-child(4),
            .sumula-pista td:nth-child(4) {
              width: 29% !important;
            }

            .sumula-pista th:nth-child(5),
            .sumula-pista td:nth-child(5) {
              width: 12% !important;
            }

            .sumula-pista th:nth-child(6),
            .sumula-pista td:nth-child(6) {
              width: 9% !important;
              text-align: center !important;
            }

            .sumula-pista th:nth-child(7),
            .sumula-pista td:nth-child(7) {
              width: 8% !important;
              text-align: center !important;
            }

            .sumula-pista input,
            .sumula-pista select {
              font-size: 12.2px !important;
              text-align: center !important;
            }

            /* CAMPO: arremesso, lançamentos, distância e triplo */
            .sumula-campo table {
              table-layout: fixed !important;
              font-size: 11.5px !important;
            }

            .sumula-campo th,
            .sumula-campo td {
              padding: 5px 5px !important;
              line-height: 1.2 !important;
            }

            .sumula-campo th:nth-child(1),
            .sumula-campo td:nth-child(1) {
              width: 5% !important;
              text-align: center !important;
            }

            .sumula-campo th:nth-child(2),
            .sumula-campo td:nth-child(2) {
              width: 18% !important;
            }

            .sumula-campo th:nth-child(3),
            .sumula-campo td:nth-child(3) {
              width: 18% !important;
            }

            .sumula-campo input,
            .sumula-campo select {
              font-size: 10px !important;
              text-align: center !important;
            }

            /* REVEZAMENTO */
            .sumula-revezamento table {
              table-layout: fixed !important;
              font-size: 13px !important;
            }

            .sumula-revezamento th,
            .sumula-revezamento td {
              padding: 7px 6px !important;
              line-height: 1.25 !important;
            }

            .sumula-revezamento th:nth-child(1),
            .sumula-revezamento td:nth-child(1) {
              width: 6% !important;
              text-align: center !important;
              font-weight: bold !important;
            }

            .sumula-revezamento th:nth-child(2),
            .sumula-revezamento td:nth-child(2) {
              width: 28% !important;
            }

            .sumula-revezamento th:nth-child(3),
            .sumula-revezamento td:nth-child(3) {
              width: 30% !important;
            }

            .sumula-revezamento th:nth-child(4),
            .sumula-revezamento td:nth-child(4) {
              width: 12% !important;
              text-align: center !important;
              font-weight: bold !important;
            }

            .sumula-revezamento th:nth-child(5),
            .sumula-revezamento td:nth-child(5) {
              width: 8% !important;
              text-align: center !important;
              font-weight: bold !important;
            }

            .sumula-revezamento th:nth-child(6),
            .sumula-revezamento td:nth-child(6) {
              width: 16% !important;
              text-align: center !important;
              font-weight: bold !important;
            }

            .sumula-revezamento input,
            .sumula-revezamento select {
              font-size: 12px !important;
              text-align: center !important;
              font-weight: bold !important;
            }

            /* SALTO EM ALTURA */
            .sumula-salto-altura table {
              table-layout: fixed !important;
              font-size: 8.5px !important;
            }

            .sumula-salto-altura th,
            .sumula-salto-altura td {
              padding: 3px 2px !important;
              line-height: 1.05 !important;
              text-align: center !important;
            }

            .sumula-salto-altura th:nth-child(1),
            .sumula-salto-altura td:nth-child(1) {
              width: 5% !important;
            }

            .sumula-salto-altura th:nth-child(2),
            .sumula-salto-altura td:nth-child(2) {
              width: 18% !important;
              text-align: left !important;
            }

            .sumula-salto-altura th:nth-child(3),
            .sumula-salto-altura td:nth-child(3) {
              width: 17% !important;
              text-align: left !important;
            }

            .sumula-salto-altura th:nth-child(4),
            .sumula-salto-altura td:nth-child(4) {
              width: 9% !important;
              text-align: left !important;
            }

            .sumula-salto-altura input,
            .sumula-salto-altura select {
              font-size: 7.2px !important;
              text-align: center !important;
            }
          }
        `}
      </style>

      <div className="nao-imprimir">
        <h1>Súmulas</h1>
        <p className="muted">Controle completo da prova em uma única tela.</p>

        <Etapa numero="1" titulo="Escolher prova, gerar séries e data">
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
            Limpar Fsiltros
          </button>

          <p style={{ marginTop: 12 }}>
            Provas enconassasatradas: <strong>{provasFiltradas.length}</strong>
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
                    {p.categoria} • {p.naipe} • {p.fase || "QUALIFICAÇÃO"}
                  </p>

                  <p style={{ margin: "8px 0", opacity: 0.8 }}>
                    Tipo: {p.subtipo || p.tipo || "-"}
                  </p>

                  <button
                    onClick={() => selecionarProva(p.id)}
                    style={selecionada ? botaoVerde : botaoAzul}
                  >
                    {selecionada ? "Selecionada" : "Selecionar"}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 15 }}>
            <button onClick={gerarSeriesDaProva} style={botaoRoxo}>
              Gerar Séries desta Prova
            </button>

            <button
              onClick={() => carregarSeries(provaSelecionada)}
              style={botaoAzul}
            >
              Recarregar Séries
            </button>

            <button onClick={abrirGerenciarInscritos} style={botaoAmarelo}>
              {mostrarGerenciarInscritos ? "Ocultar Inscritos" : "Gerenciar Inscritos"}
            </button>
          </div>

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

        <Etapa numero="2" titulo="Lançar, classificar e publicar">
          <button onClick={() => salvarResultados(false)} style={botaoCinza}>
            Salvar Rascunho
          </button>

          <button onClick={classificarAutomaticamente} style={botaoAmarelo}>
            Classificar
          </button>

          <button onClick={() => salvarResultados(true)} style={botaoVerde}>
            Publicar no Boletim
          </button>

          <button onClick={imprimir} style={botaoAzul}>
            Imprimir Súmula
          </button>
        </Etapa>

        <Etapa numero="3" titulo="Próxima fase">
          <button
            onClick={() => setMostrarProximaFase(!mostrarProximaFase)}
            style={botaoRoxo}
          >
            {mostrarProximaFase ? "Ocultar opções" : "Mostrar opções de próxima fase"}
          </button>

          {mostrarProximaFase && (
            <div style={{ marginTop: 15 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <label>Próxima fase</label>
                  <select
                    value={tipoProximaFase}
                    onChange={(e) => setTipoProximaFase(e.target.value)}
                    style={selectPequeno}
                  >
                    <option value="QUARTAS DE FINAL">Quartas de final</option>
                    <option value="SEMIFINAL">Semifinal</option>
                    <option value="FINAL">Final</option>
                    <option value="FINAL POR TEMPO">Final por tempo</option>
                  </select>
                </div>

                <div>
                  <label>Critério</label>
                  <select
                    value={criterioClassificacao}
                    onChange={(e) => setCriterioClassificacao(e.target.value)}
                    style={selectPequeno}
                  >
                    <option value="q_q">Q por série + q por tempo/marca</option>
                    <option value="melhores_gerais">Melhores tempos/marcas gerais</option>
                  </select>
                </div>

                <div>
                  <label>Classificados por série (Q)</label>
                  <input
                    type="number"
                    value={qAutomaticos}
                    onChange={(e) => setQAutomaticos(Number(e.target.value))}
                    min="0"
                    style={inputPequeno}
                  />
                </div>

                <div>
                  <label>Melhores tempos/marcas (q)</label>
                  <input
                    type="number"
                    value={qTempos}
                    onChange={(e) => setQTempos(Number(e.target.value))}
                    min="0"
                    style={inputPequeno}
                  />
                </div>

                <div>
                  <label>Total classificados</label>
                  <input
                    type="number"
                    value={quantidadeClassificados}
                    onChange={(e) => setQuantidadeClassificados(Number(e.target.value))}
                    min="1"
                    style={inputPequeno}
                  />
                </div>

                <div>
                  <label>Raias</label>
                  <input
                    type="number"
                    value={raiasProximaFase}
                    onChange={(e) => setRaiasProximaFase(Number(e.target.value))}
                    min="1"
                    max="10"
                    style={inputPequeno}
                  />
                </div>
              </div>

              <button onClick={gerarProximaFase} style={botaoRoxo}>
                Gerar Próxima Fase
              </button>
            </div>
          )}
        </Etapa>

        {mensagem && (
          <div className="card" style={{ marginBottom: 20 }}>
            {mensagem}
          </div>
        )}
      </div>

      {series.map((serie) => (
        <div
          className={`card quebra-pagina sumula-print ${
            ehSaltoAltura
              ? "sumula-salto-altura"
              : ehCampoTentativas
              ? "sumula-campo"
              : ehRevezamento
              ? "sumula-revezamento"
              : "sumula-pista"
          }`}
          key={serie.id}
          style={{ marginBottom: 20 }}
        >
          <h2 style={{ textAlign: "center" }}>{config.texto_cabecalho}</h2>

          {provaAtual && (
            <p style={{ textAlign: "center" }}>
              <strong>Prova:</strong> {provaAtual.nome}
              &nbsp; | &nbsp;
              <strong>Categoria:</strong> {provaAtual.categoria}
              &nbsp; | &nbsp;
              <strong>Naipe:</strong> {provaAtual.naipe}
              &nbsp; | &nbsp;
              <strong>Fase:</strong> {provaAtual.fase || "QUALIFICAÇÃO"}
              &nbsp; | &nbsp;
              <strong>Data:</strong> {dataProva}
            </p>
          )}

          {ehSaltoAltura && (
            <>
              <h3>Salto em Altura</h3>

              <div style={{ overflowX: "auto" }}>
                <table width="100%" cellPadding="10">
                  <thead>
                    <tr>
                      <th rowSpan="2">Nº</th>
                      <th rowSpan="2">Atleta</th>
                      <th rowSpan="2">Escola</th>
                              <th rowSpan="2">Nascimento</th>

                      {config.alturas_salto_altura.map((altura) => (
                        <th key={altura} colSpan="3">
                          {altura}
                        </th>
                      ))}

                      <th rowSpan="2">Resultado</th>
                      <th rowSpan="2">Colocação</th>
                      <th rowSpan="2">Q</th>
                    </tr>

                    <tr>
                      {config.alturas_salto_altura.flatMap((altura) => [
                        <th key={`${altura}-t1`}></th>,
                        <th key={`${altura}-t2`}></th>,
                        <th key={`${altura}-t3`}></th>,
                      ])}
                    </tr>
                  </thead>

                  <tbody>
                    {serie.raias
                      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                      .map((r) => {
                        const atleta = r.inscricoes?.atletas;

                        return (
                          <tr key={r.id}>
                            <td>{atleta?.numero}</td>
                            <td>{atleta?.nome}</td>
                            <td>{atleta?.escolas?.nome}</td>
                            <td>{formatarNascimento(atleta?.data_nascimento)}</td>

                            {config.alturas_salto_altura.flatMap((altura) => {
                              const valor = String(pegarValorAltura(r, altura) || "")
                                .toUpperCase()
                                .padEnd(3, " ");

                              return [
                                <td key={`${r.id}-${altura}-1`}>
                                  <input
                                    value={valor[0].trim()}
                                    onChange={(e) =>
                                      mudarTentativaAltura(
                                        serie.id,
                                        r.id,
                                        altura,
                                        0,
                                        e.target.value
                                      )
                                    }
                                    placeholder=""
                                    style={inputMiniAltura}
                                  />
                                </td>,

                                <td key={`${r.id}-${altura}-2`}>
                                  <input
                                    value={valor[1].trim()}
                                    onChange={(e) =>
                                      mudarTentativaAltura(
                                        serie.id,
                                        r.id,
                                        altura,
                                        1,
                                        e.target.value
                                      )
                                    }
                                    placeholder=""
                                    style={inputMiniAltura}
                                  />
                                </td>,

                                <td key={`${r.id}-${altura}-3`}>
                                  <input
                                    value={valor[2].trim()}
                                    onChange={(e) =>
                                      mudarTentativaAltura(
                                        serie.id,
                                        r.id,
                                        altura,
                                        2,
                                        e.target.value
                                      )
                                    }
                                    placeholder=""
                                    style={inputMiniAltura}
                                  />
                                </td>,
                              ];
                            })}

                            <td>
                              <input
                                value={r.resultado_final || calcularResultadoAltura(r)}
                                onChange={(e) =>
                                  mudarCampo(serie.id, r.id, "resultado_final", e.target.value)
                                }
                                style={inputMini}
                              />
                            </td>

                            <td>
                              <input
                                value={r.colocacao}
                                onChange={(e) =>
                                  mudarCampo(serie.id, r.id, "colocacao", e.target.value)
                                }
                                style={inputMini}
                              />
                            </td>

                            <td style={{ fontWeight: "bold", textAlign: "center" }}>
                              {r.qualificacao || ""}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {ehCampoTentativas && !ehSaltoAltura && !ehRevezamento && (
            <>
              <h3>Classificação / Qualificação</h3>

              <TabelaCampo
                serie={serie}
                mudarCampo={mudarCampo}
                melhorDasTresPrimeiras={melhorDasTresPrimeiras}
                melhorDasTentativas={melhorDasTentativas}
              />
            </>
          )}

          {ehRevezamento && !ehSaltoAltura && (
            <>
              <h3>Revezamento - Série {serie.numero_serie}</h3>

              <TabelaRevezamento
                serie={serie}
                mudarCampo={mudarCampo}
              />
            </>
          )}

          {!ehCampoTentativas && !ehSaltoAltura && !ehRevezamento && (
            <>
              <h3>Série {serie.numero_serie}</h3>

              <TabelaPista
                serie={serie}
                mudarCampo={mudarCampo}
              />
            </>
          )}

          {config.mostrar_assinaturas && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 50, gap: 40 }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ borderTop: "1px solid black", paddingTop: 8 }}>
                  Árbitro da Prova
                </div>
              </div>

              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ borderTop: "1px solid black", paddingTop: 8 }}>
                  Coordenação de Atletismo
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function GerenciarInscritos({
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
        Use esta área antes de gerar as séries. Se a prova já tiver séries, depois da troca clique em Gerar Séries desta Prova novamente.
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
                        Nº {atleta?.numero || "-"} • {atleta?.escolas?.nome || "Sem escola"} • {atleta?.municipio || "-"}
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
              <button
                onClick={limparSubstituicao}
                style={botaoMiniCinza}
              >
                Cancelar
              </button>
            </div>
          )}

          {inscricaoParaSubstituir && (
            <div style={boxCriarSubstituto}>
              <h4 style={{ marginTop: 0 }}>Substituto não está cadastrado?</h4>

              <p style={{ fontSize: 13, opacity: 0.85 }}>
                Cadastre rapidamente o novo atleta usando a mesma escola e município do atleta substituído.
              </p>

              <label>Nome do novo atleta</label>
              <input
                value={nomeNovoAtleta}
                onChange={(e) => setNomeNovoAtleta(e.target.value)}
                placeholder="Digite o nome completo"
                style={{ ...inputPesquisa, marginTop: 6 }}
              />

              <label>Número do atleta (opcional)</label>
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
                      Nº {atleta.numero || "-"} • {atleta.escolas?.nome || "Sem escola"} • {atleta.municipio || "-"}
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

function Filtro({ label, value, setValue, itens }) {
  return (
    <div>
      <label>{label}</label>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={selectFiltro}
      >
        <option value="">Todos</option>
        {itens.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </div>
  );
}

function Etapa({ numero, titulo, children }) {
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <h3 style={{ marginTop: 0 }}>
        Etapa {numero} — {titulo}
      </h3>

      {children}
    </div>
  );
}


function TabelaRevezamento({ serie, mudarCampo }) {
  function chaveEscola(raia) {
    return raia.inscricoes?.atletas?.escolas?.nome || "SEM ESCOLA";
  }

  const gruposPorEscola = {};

  [...(serie.raias || [])]
    .sort((a, b) => (a.raia || 0) - (b.raia || 0))
    .forEach((raia) => {
      const escola = chaveEscola(raia);

      if (!gruposPorEscola[escola]) {
        gruposPorEscola[escola] = [];
      }

      gruposPorEscola[escola].push(raia);
    });

  const grupos = Object.entries(gruposPorEscola).map(([escola, raias]) => ({
    escola,
    raias: raias.slice(0, 8),
    representante: raias[0],
  }));

  return (
    <table width="100%" cellPadding="10">
      <thead>
        <tr>
          <th>Nº</th>
          <th>Nome</th>
          <th>Escola</th>
          <th>Tempo</th>
          <th>Raia</th>
          <th>Classificação</th>
        </tr>
      </thead>

      <tbody>
        {grupos.map((grupo, grupoIndex) => {
          const representante = grupo.representante;
          const quantidadeLinhas = Math.max(grupo.raias.length, 4);
          const linhas = Array.from({ length: quantidadeLinhas }, (_, index) => grupo.raias[index] || null);

          return linhas.map((r, index) => {
            const atleta = r?.inscricoes?.atletas;
            const chaveLinha = r?.id || `${grupo.escola}-${grupoIndex}-${index}`;

            return (
              <tr key={chaveLinha}>
                <td>{atleta?.numero || ""}</td>
                <td>{atleta?.nome || ""}</td>

                {index === 0 && (
                  <td rowSpan={quantidadeLinhas} style={{ fontWeight: "bold", textAlign: "center" }}>
                    {grupo.escola}
                  </td>
                )}

                {index === 0 && (
                  <td rowSpan={quantidadeLinhas}>
                    <input
                      value={representante?.tempo || ""}
                      onChange={(e) =>
                        mudarCampo(serie.id, representante.id, "tempo", e.target.value)
                      }
                      placeholder=""
                      style={inputTabela}
                    />
                  </td>
                )}

                {index === 0 && (
                  <td rowSpan={quantidadeLinhas}>
                    <input
                      value={representante?.raia || ""}
                      onChange={(e) =>
                        mudarCampo(serie.id, representante.id, "raia", e.target.value)
                      }
                      placeholder=""
                      style={inputTabela}
                    />
                  </td>
                )}

                {index === 0 && (
                  <td rowSpan={quantidadeLinhas}>
                    <input
                      value={representante?.colocacao || ""}
                      onChange={(e) =>
                        mudarCampo(serie.id, representante.id, "colocacao", e.target.value)
                      }
                      placeholder=""
                      style={inputTabela}
                    />
                  </td>
                )}
              </tr>
            );
          });
        })}
      </tbody>
    </table>
  );
}

function TabelaPista({ serie, mudarCampo }) {
  return (
    <table width="100%" cellPadding="10">
      <thead>
        <tr>
          <th>Raia</th>
          <th>Nº</th>
          <th>Atleta</th>
          <th>Escola</th>
          <th>Nascimento</th>
          <th>Tempo</th>
          <th>Colocação</th>
          <th>Q</th>
          <th className="nao-imprimir">Status</th>
        </tr>
      </thead>

      <tbody>
        {serie.raias
          .sort((a, b) => a.raia - b.raia)
          .map((r) => {
            const atleta = r.inscricoes?.atletas;

            return (
              <tr key={r.id}>
                <td>{r.raia}</td>
                <td>{atleta?.numero}</td>
                <td>{atleta?.nome}</td>
                <td>{atleta?.escolas?.nome}</td>
                <td>{formatarNascimento(atleta?.data_nascimento)}</td>

                <td>
                  <input
                    value={r.tempo}
                    onChange={(e) => mudarCampo(serie.id, r.id, "tempo", e.target.value)}
                    placeholder=""
                    style={inputTabela}
                  />
                </td>

                <td>
                  <input
                    value={r.colocacao}
                    onChange={(e) => mudarCampo(serie.id, r.id, "colocacao", e.target.value)}
                    style={inputTabela}
                  />
                </td>

                <td style={{ fontWeight: "bold", textAlign: "center" }}>
                  {r.qualificacao || ""}
                </td>

                <td className="nao-imprimir">
                  <select
                    value={r.status}
                    onChange={(e) => mudarCampo(serie.id, r.id, "status", e.target.value)}
                  >
                    <option value="OK">OK</option>
                    <option value="DQ">DQ</option>
                    <option value="DNS">DNS</option>
                    <option value="ABD">ABD</option>
                    <option value="DNF">DNF</option>
                    <option value="NM">NM</option>
                  </select>
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}

function TabelaCampo({
  serie,
  mudarCampo,
  melhorDasTresPrimeiras,
  melhorDasTentativas,
}) {
  return (
    <table width="100%" cellPadding="10">
      <thead>
        <tr>
          <th>Nº</th>
          <th>Atleta</th>
          <th>Escola</th>
          <th>Nascimento</th>
          <th>1ª</th>
          <th>2ª</th>
          <th>3ª</th>
          <th>Parcial</th>
          <th>Class.</th>
          <th>4ª</th>
          <th>5ª</th>
          <th>Classs. Parcial</th>
          <th>6ª</th>
          <th>Resultado Final</th>
          <th>Colocação</th>
          <th>Q</th>
        </tr>
      </thead>

      <tbody>
        {serie.raias
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
          .map((r) => {
            const atleta = r.inscricoes?.atletas;

            return (
              <tr key={r.id}>
                <td>{atleta?.numero}</td>
                <td>{atleta?.nome}</td>
                <td>{atleta?.escolas?.nome}</td>
                <td>{formatarNascimento(atleta?.data_nascimento)}</td>

                {["tentativa1", "tentativa2", "tentativa3"].map((campo) => (
                  <td key={campo}>
                    <input
                      value={r[campo]}
                      onChange={(e) => mudarCampo(serie.id, r.id, campo, e.target.value)}
                      style={inputTabela}
                    />
                  </td>
                ))}

                <td>{melhorDasTresPrimeiras(r)}</td>

                <td>
                  <input
                    value={r.classificacao_parcial}
                    onChange={(e) =>
                      mudarCampo(serie.id, r.id, "classificacao_parcial", e.target.value)
                    }
                    style={inputTabela}
                  />
                </td>

                <td>
  <input
    value={r.tentativa4}
    disabled={!r.finalista}
    onChange={(e) => mudarCampo(serie.id, r.id, "tentativa4", e.target.value)}
    style={{
      ...inputTabela,
      opacity: r.finalista ? 1 : 0.35,
    }}
  />
</td>

<td>
  <input
    value={r.tentativa5}
    disabled={!r.finalista}
    onChange={(e) => mudarCampo(serie.id, r.id, "tentativa5", e.target.value)}
    style={{
      ...inputTabela,
      opacity: r.finalista ? 1 : 0.35,
    }}
  />
</td>

<td>
  <input
    value={r.classificacao_parcial_final || ""}
    onChange={(e) =>
      mudarCampo(serie.id, r.id, "classificacao_parcial_final", e.target.value)
    }
    style={inputTabela}
  />
</td>

<td>
  <input
    value={r.tentativa6}
    disabled={!r.finalista}
    onChange={(e) => mudarCampo(serie.id, r.id, "tentativa6", e.target.value)}
    style={{
      ...inputTabela,
      opacity: r.finalista ? 1 : 0.35,
    }}
  />
</td>

                <td>
                  <input
                    value={r.melhor_marca || melhorDasTentativas(r)}
                    onChange={(e) => mudarCampo(serie.id, r.id, "melhor_marca", e.target.value)}
                    style={inputTabela}
                  />
                </td>

                <td>
                  <input
                    value={r.colocacao}
                    onChange={(e) => mudarCampo(serie.id, r.id, "colocacao", e.target.value)}
                    style={inputTabela}
                  />
                </td>

                <td style={{ fontWeight: "bold", textAlign: "center" }}>
                  {r.qualificacao || ""}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}

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

const selectFiltro = {
  display: "block",
  width: "100%",
  padding: 10,
  borderRadius: 8,
  marginTop: 6,
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

const selectPequeno = {
  display: "block",
  padding: 10,
  borderRadius: 8,
  marginTop: 6,
};

const inputPequeno = {
  display: "block",
  width: 120,
  padding: 10,
  borderRadius: 8,
  marginTop: 6,
};

const inputTabela = {
  width: 80,
  padding: 6,
};

const inputMini = {
  width: 55,
  padding: 5,
  textAlign: "center",
};


const inputMiniAltura = {
  width: 18,
  padding: 2,
  textAlign: "center",
};
