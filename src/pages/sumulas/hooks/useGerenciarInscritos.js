import { useState } from "react";
import {
  adicionarAtletaNaProva as adicionarService,
  buscarAtletas as buscarService,
  carregarInscricoesDaProva as carregarService,
  criarAtletaESubstituir as criarAtletaESubstituirService,
  removerInscricaoDaProva as removerService,
  substituirInscricaoDaProva as substituirService,
} from "../services/atletasService";

export function useGerenciarInscritos({
  provaSelecionada,
  provas,
  carregarSeries,
  setMensagem,
}) {
  const [mostrarGerenciarInscritos, setMostrarGerenciarInscritos] = useState(false);
  const [inscricoesProva, setInscricoesProva] = useState([]);
  const [buscaAtleta, setBuscaAtleta] = useState("");
  const [atletasEncontrados, setAtletasEncontrados] = useState([]);
  const [carregandoInscritos, setCarregandoInscritos] = useState(false);

  async function carregarInscricoesDaProva(provaId = provaSelecionada) {
    if (!provaId) {
      window.alert("Selecione uma prova primeiro.");
      return;
    }

    setCarregandoInscritos(true);
    setMensagem?.("Carregando inscritos da prova...");

    const { data, error } = await carregarService(provaId);

    setCarregandoInscritos(false);

    if (error) {
      setMensagem?.("Erro ao carregar inscritos: " + error.message);
      return;
    }

    setInscricoesProva(data || []);
    setMensagem?.(`Inscritos carregados: ${(data || []).length}.`);
  }

  async function abrirGerenciarInscritos() {
    if (!provaSelecionada) {
      window.alert("Selecione uma prova primeiro.");
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
      window.alert("Digite pelo menos 2 letras do nome do atleta.");
      return;
    }

    setMensagem?.("Buscando atletas...");

    const { data, error } = await buscarService(termo);
    if (error) {
      setMensagem?.("Erro ao buscar atletas: " + error.message);
      return;
    }

    setAtletasEncontrados(data || []);
    setMensagem?.(`Atletas encontrados: ${(data || []).length}.`);
  }

  async function adicionarAtletaNaProva(atleta) {
    if (!provaSelecionada) {
      window.alert("Selecione uma prova primeiro.");
      return;
    }

    const provaAtual = (provas || []).find((p) => p.id === provaSelecionada);
    if (!provaAtual) {
      window.alert("Prova nao encontrada.");
      return;
    }

    const jaInscrito = inscricoesProva.some(
      (i) => i.atleta_id === atleta.id || i.atletas?.id === atleta.id
    );
    if (jaInscrito) {
      window.alert("Esse atleta ja esta inscrito nesta prova.");
      return;
    }

    const { error } = await adicionarService({
      evento_id: provaAtual.evento_id,
      prova_id: provaSelecionada,
      atleta_id: atleta.id,
    });

    if (error) {
      setMensagem?.("Erro ao adicionar atleta: " + error.message);
      return;
    }

    await carregarInscricoesDaProva(provaSelecionada);
    setMensagem?.("Atleta adicionado na prova. Se as series ja existirem, gere as series novamente.");
  }

  async function removerInscricaoDaProva(inscricao) {
    const nome = inscricao.atletas?.nome || "atleta";
    const confirmar = window.confirm(`Remover ${nome} desta prova?`);
    if (!confirmar) return;

    const confirmarSeries = window.confirm(
      "Se as series ja existirem, voce deve gerar as series novamente depois. Deseja continuar?"
    );
    if (!confirmarSeries) return;

    const { error } = await removerService(inscricao.id);
    if (error) {
      setMensagem?.("Erro ao remover atleta: " + error.message);
      return;
    }

    await carregarInscricoesDaProva(provaSelecionada);
    await carregarSeries(provaSelecionada);
    setMensagem?.("Atleta removido da prova. Gere as series novamente para reorganizar.");
  }

  async function substituirInscricaoDaProva(inscricaoAntiga, atletaNovo) {
    if (!inscricaoAntiga?.id || !atletaNovo?.id) return;

    const nomeAntigo = inscricaoAntiga.atletas?.nome || "atleta antigo";
    const nomeNovo = atletaNovo.nome || "novo atleta";
    const confirmar = window.confirm(`Substituir ${nomeAntigo} por ${nomeNovo} nesta prova?`);
    if (!confirmar) return;

    const jaInscrito = inscricoesProva.some(
      (i) => i.id !== inscricaoAntiga.id && (i.atleta_id === atletaNovo.id || i.atletas?.id === atletaNovo.id)
    );
    if (jaInscrito) {
      window.alert("Esse novo atleta ja esta inscrito nesta prova.");
      return;
    }

    const { error } = await substituirService(inscricaoAntiga.id, atletaNovo.id);
    if (error) {
      setMensagem?.("Erro ao substituir atleta: " + error.message);
      return;
    }

    await carregarInscricoesDaProva(provaSelecionada);
    await carregarSeries(provaSelecionada);
    setMensagem?.("Substituicao realizada. Se as series ja existirem, gere as series novamente.");
  }

  async function criarAtletaESubstituir(inscricaoAntiga, dadosNovoAtleta) {
    const nome = String(dadosNovoAtleta?.nome || "").trim().toUpperCase();
    if (nome.length < 3) {
      window.alert("Digite o nome completo do novo atleta.");
      return;
    }

    const provaAtual = (provas || []).find((p) => p.id === provaSelecionada);
    const nomeAntigo = inscricaoAntiga?.atletas?.nome || "atleta antigo";
    const nomeEscola = inscricaoAntiga?.atletas?.escolas?.nome || "mesma escola";

    const confirmar = window.confirm(
      `Criar ${nome} na ${nomeEscola} e substituir ${nomeAntigo} nesta prova?`
    );
    if (!confirmar) return;

    setMensagem?.("Criando novo atleta e realizando substituicao...");

    const { data: atletaCriado, error } = await criarAtletaESubstituirService({
      inscricaoAntiga,
      dadosNovoAtleta,
      provaAtual,
    });

    if (error) {
      setMensagem?.("Erro ao criar/substituir atleta: " + error.message);
      return;
    }

    setBuscaAtleta("");
    setAtletasEncontrados([]);

    await carregarInscricoesDaProva(provaSelecionada);
    await carregarSeries(provaSelecionada);
    setMensagem?.(
      `Atleta ${atletaCriado.nome} criado e substituicao realizada. Gere as series novamente se elas ja existirem.`
    );
  }

  return {
    mostrarGerenciarInscritos,
    setMostrarGerenciarInscritos,
    inscricoesProva,
    buscaAtleta,
    setBuscaAtleta,
    atletasEncontrados,
    carregandoInscritos,
    abrirGerenciarInscritos,
    carregarInscricoesDaProva,
    buscarAtletas,
    adicionarAtletaNaProva,
    removerInscricaoDaProva,
    substituirInscricaoDaProva,
    criarAtletaESubstituir,
  };
}
