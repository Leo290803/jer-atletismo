import { useState } from "react";
import {
  bloquearSumulaDigital as bloquearService,
  carregarSumulaDigital as carregarService,
  gerarSumulaDigital as gerarService,
  gerarTokenAcesso,
  linkArbitro,
  reabrirSumulaDigital as reabrirService,
  registrarHistoricoReabertura,
  sincronizarResultadosDaSumula,
  tabelaInexistente,
} from "../services/sumulaDigitalService";

export function useSumulaDigital({ provaSelecionada, setMensagem }) {
  const [sumulaDigital, setSumulaDigital] = useState(null);
  const [sumulasDigitais, setSumulasDigitais] = useState([]);
  const [tokenMensagem, setTokenMensagem] = useState("");

  async function carregarSumulaDigital() {
    if (!provaSelecionada) {
      setSumulaDigital(null);
      setSumulasDigitais([]);
      return;
    }

    const { data, error } = await carregarService(provaSelecionada);

    if (error) {
      if (tabelaInexistente(error, "sumulas_digitais")) {
        setTokenMensagem("Tabela sumulas_digitais nao encontrada no Supabase. Execute o script SQL de criacao.");
      } else {
        setTokenMensagem("Nao foi possivel carregar a sumula digital.");
      }
      setSumulaDigital(null);
      setSumulasDigitais([]);
      return;
    }

    setSumulasDigitais(data || []);
    setSumulaDigital((data || [])[0] || null);
    setTokenMensagem("");
  }

  async function gerarSumulaDigital() {
    if (!provaSelecionada) {
      window.alert("Selecione uma prova primeiro.");
      return;
    }

    const token = gerarTokenAcesso();
    const { data, error } = await gerarService({
      prova_id: provaSelecionada,
      token_acesso: token,
      status: "ABERTA",
      arbitro_nome: "",
    });

    if (error) {
      if (tabelaInexistente(error, "sumulas_digitais")) {
        setTokenMensagem("Tabela sumulas_digitais nao encontrada no Supabase. Execute o script SQL de criacao.");
        return;
      }
      setTokenMensagem("Erro ao criar sumula digital: " + error.message);
      return;
    }

    const sync = await sincronizarResultadosDaSumula(data.id, provaSelecionada);
    if (!sync.ok) {
      setTokenMensagem("Sumula criada, mas houve falha ao carregar atletas: " + sync.message);
    }

    await carregarSumulaDigital();
    setTokenMensagem(sync.message || "Sumula digital criada com sucesso.");
    setMensagem?.("Sumula digital atualizada.");
  }

  async function bloquearSumulaDigital() {
    if (!sumulaDigital) return;

    const { error } = await bloquearService(sumulaDigital.id);
    if (error) {
      if (tabelaInexistente(error, "sumulas_digitais")) {
        setTokenMensagem("Tabela sumulas_digitais nao encontrada no Supabase. Execute o script SQL de criacao.");
        return;
      }

      setTokenMensagem("Erro ao bloquear: " + error.message);
      return;
    }

    await carregarSumulaDigital();
    setTokenMensagem("Sumula bloqueada.");
  }

  async function reabrirSumulaDigital() {
    if (!sumulaDigital) return;

    const motivo = window.prompt("Informe o motivo da reabertura da sumula:");
    if (!motivo || !motivo.trim()) {
      setTokenMensagem("Reabertura cancelada. Informe um motivo valido.");
      return;
    }

    const { error } = await reabrirService(sumulaDigital.id);
    if (error) {
      if (tabelaInexistente(error, "sumulas_digitais")) {
        setTokenMensagem("Tabela sumulas_digitais nao encontrada no Supabase. Execute o script SQL de criacao.");
        return;
      }

      setTokenMensagem("Erro ao reabrir: " + error.message);
      return;
    }

    const { error: erroHistorico } = await registrarHistoricoReabertura(sumulaDigital.id, motivo.trim());
    if (erroHistorico && !tabelaInexistente(erroHistorico, "sumula_historico_acoes")) {
      setTokenMensagem("Sumula reaberta, mas falhou registro de historico: " + erroHistorico.message);
      await carregarSumulaDigital();
      return;
    }

    await carregarSumulaDigital();
    setTokenMensagem("Sumula reaberta para o arbitro com motivo registrado.");
  }

  return {
    sumulaDigital,
    sumulasDigitais,
    tokenMensagem,
    setTokenMensagem,
    carregarSumulaDigital,
    gerarSumulaDigital,
    bloquearSumulaDigital,
    reabrirSumulaDigital,
    linkArbitro,
  };
}
