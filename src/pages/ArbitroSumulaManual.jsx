import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const inputStyle = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 9px",
  background: "#fff",
};

const botaoBase = {
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 800,
  marginRight: 10,
  marginBottom: 10,
  padding: "12px 16px",
};

function tabelaInexistente(error, tabela) {
  if (!error) return false;
  const alvo = String(tabela || "").toLowerCase();
  const texto = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();
  return (
    error.code === "PGRST205" ||
    (texto.includes("not found") && texto.includes(alvo)) ||
    (texto.includes("could not find") && texto.includes(alvo))
  );
}

function numeroResultado(valor) {
  if (!valor && valor !== 0) return null;
  const texto = String(valor).trim().toUpperCase();
  if (["", "-", "X", "DNS", "DNF", "DQ", "NM"].includes(texto)) return null;

  const limpo = texto.replace(",", ".");
  if (limpo.includes(":")) {
    const partes = limpo.split(":").map(Number);
    if (partes.some(Number.isNaN)) return null;
    if (partes.length === 2) return partes[0] * 60 + partes[1];
    if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
  }

  const numero = Number(limpo);
  return Number.isNaN(numero) ? null : numero;
}

function melhorMarcaCampo(linha) {
  const valores = [linha.tentativa1, linha.tentativa2, linha.tentativa3, linha.resultado]
    .map(numeroResultado)
    .filter((valor) => valor !== null);

  return valores.length ? Math.max(...valores) : null;
}

function agruparPorSerie(linhas) {
  const mapa = {};
  [...(linhas || [])]
    .sort((a, b) => (Number(a.serie) || 0) - (Number(b.serie) || 0) || (Number(a.raia) || 0) - (Number(b.raia) || 0))
    .forEach((linha) => {
      const chave = linha.serie || 1;
      if (!mapa[chave]) mapa[chave] = [];
      mapa[chave].push(linha);
    });
  return Object.entries(mapa);
}

function dataParaTexto(data) {
  if (!data) return "";
  const [ano, mes, dia] = String(data).split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

export default function ArbitroSumulaManual() {
  const { token } = useParams();
  const [sumula, setSumula] = useState(null);
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const ehCampo = sumula?.tipo === "campo";
  const grupos = useMemo(() => agruparPorSerie(linhas), [linhas]);

  const carregarSumula = useCallback(async () => {
    setCarregando(true);

    const { data, error } = await supabase
      .from("sumulas_manuais")
      .select("*, linhas:sumula_manual_linhas(*)")
      .eq("token_acesso", token)
      .single();

    if (error) {
      if (tabelaInexistente(error, "sumulas_manuais")) {
        setMensagem("Tabela da sumula manual nao encontrada. Execute o SQL no Supabase.");
      } else {
        setMensagem("Nao foi possivel carregar a sumula manual.");
      }
      setCarregando(false);
      return;
    }

    setSumula(data);
    setLinhas(data?.linhas || []);
    setMensagem("");
    setCarregando(false);
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void carregarSumula(), 0);
    return () => window.clearTimeout(timer);
  }, [carregarSumula]);

  function alterarLinha(id, campo, valor) {
    setLinhas((atuais) =>
      atuais.map((linha) => (linha.id === id ? { ...linha, [campo]: valor } : linha))
    );
  }

  function classificarAutomaticamente() {
    const validos = linhas
      .map((linha, ordemOriginal) => {
        const status = String(linha.status || "OK").toUpperCase();
        const valor = ehCampo ? melhorMarcaCampo(linha) : numeroResultado(linha.resultado);
        return {
          ...linha,
          ordemOriginal,
          valorClassificacao: valor,
          valido: status === "OK" && valor !== null,
        };
      })
      .filter((linha) => linha.valido)
      .sort((a, b) => {
        if (a.valorClassificacao !== b.valorClassificacao) {
          return ehCampo
            ? b.valorClassificacao - a.valorClassificacao
            : a.valorClassificacao - b.valorClassificacao;
        }
        return a.ordemOriginal - b.ordemOriginal;
      });

    const mapa = new Map();
    validos.forEach((linha, index) => mapa.set(linha.id, index + 1));

    setLinhas((atuais) =>
      atuais.map((linha) => ({
        ...linha,
        colocacao: mapa.get(linha.id) || null,
        resultado: ehCampo && !linha.resultado && melhorMarcaCampo(linha) !== null
          ? String(melhorMarcaCampo(linha)).replace(".", ",")
          : linha.resultado,
      }))
    );
    setMensagem("Classificacao calculada. Confira antes de enviar.");
  }

  async function salvar(status = "EM_ANDAMENTO") {
    setSalvando(true);
    setMensagem("Salvando resultados...");

    const payload = linhas.map((linha) => ({
      id: linha.id,
      tentativa1: linha.tentativa1 || "",
      tentativa2: linha.tentativa2 || "",
      tentativa3: linha.tentativa3 || "",
      resultado: linha.resultado || "",
      colocacao: linha.colocacao || null,
      status: linha.status || "OK",
    }));

    const { error } = await supabase.rpc("gravar_sumula_manual_por_token", {
      p_token_acesso: token,
      p_linhas: payload,
      p_status: status,
    });

    setSalvando(false);

    if (error) {
      setMensagem("Erro ao salvar. Verifique se o SQL da sumula manual foi executado. " + error.message);
      return;
    }

    setMensagem(status === "ENVIADA" ? "Resultados enviados." : "Resultados salvos.");
    await carregarSumula();
  }

  if (carregando) {
    return <div style={{ padding: 24 }}>Carregando sumula manual...</div>;
  }

  if (!sumula) {
    return <div style={{ padding: 24 }}>{mensagem || "Sumula manual nao encontrada."}</div>;
  }

  const bloqueada = sumula.status === "BLOQUEADA";

  return (
    <div style={{ minHeight: "100vh", background: "#eef2f7", padding: 18 }}>
      <main style={{ maxWidth: 1180, margin: "0 auto" }}>
        <section className="card" style={{ marginBottom: 16 }}>
          <h1 style={{ marginTop: 0 }}>{sumula.nome_evento || "Sumula Manual"}</h1>
          <p style={{ color: "#475569", fontWeight: 700 }}>
            {sumula.prova || "Prova manual"} | {sumula.categoria} | {sumula.naipe} | {sumula.fase} | {dataParaTexto(sumula.data_prova)}
          </p>
          <p>Status: <strong>{String(sumula.status || "").replaceAll("_", " ")}</strong></p>

          <button onClick={classificarAutomaticamente} style={{ ...botaoBase, background: "#facc15" }} disabled={bloqueada || salvando}>
            Classificar automatico
          </button>
          <button onClick={() => void salvar("EM_ANDAMENTO")} style={{ ...botaoBase, background: "#38bdf8" }} disabled={bloqueada || salvando}>
            Salvar
          </button>
          <button onClick={() => void salvar("ENVIADA")} style={{ ...botaoBase, background: "#22c55e" }} disabled={bloqueada || salvando}>
            Enviar ao coordenador
          </button>

          {mensagem && <p style={{ color: "#0f2744", fontWeight: 700 }}>{mensagem}</p>}
        </section>

        {grupos.map(([numeroSerie, itens]) => (
          <section className="card" style={{ marginBottom: 16, overflowX: "auto" }} key={numeroSerie}>
            <h2>{ehCampo ? "Ordem de tentativa" : `Serie ${numeroSerie}`}</h2>
            <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse", minWidth: 880 }}>
              <thead>
                <tr>
                  <th>{ehCampo ? "Ordem" : "Raia"}</th>
                  <th>No</th>
                  <th>Atleta</th>
                  <th>Escola</th>
                  {ehCampo && <th>1a</th>}
                  {ehCampo && <th>2a</th>}
                  {ehCampo && <th>3a</th>}
                  <th>{ehCampo ? "Melhor" : "Resultado"}</th>
                  <th>Colocacao</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {itens.map((linha) => (
                  <tr key={linha.id}>
                    <td>{linha.raia}</td>
                    <td>{linha.numero}</td>
                    <td>{linha.atleta_nome}</td>
                    <td>{linha.escola_nome}</td>
                    {ehCampo && (
                      <td>
                        <input style={inputStyle} value={linha.tentativa1 || ""} onChange={(e) => alterarLinha(linha.id, "tentativa1", e.target.value)} />
                      </td>
                    )}
                    {ehCampo && (
                      <td>
                        <input style={inputStyle} value={linha.tentativa2 || ""} onChange={(e) => alterarLinha(linha.id, "tentativa2", e.target.value)} />
                      </td>
                    )}
                    {ehCampo && (
                      <td>
                        <input style={inputStyle} value={linha.tentativa3 || ""} onChange={(e) => alterarLinha(linha.id, "tentativa3", e.target.value)} />
                      </td>
                    )}
                    <td>
                      <input style={inputStyle} value={linha.resultado || ""} onChange={(e) => alterarLinha(linha.id, "resultado", e.target.value)} />
                    </td>
                    <td>
                      <input style={inputStyle} value={linha.colocacao || ""} onChange={(e) => alterarLinha(linha.id, "colocacao", e.target.value)} />
                    </td>
                    <td>
                      <select style={inputStyle} value={linha.status || "OK"} onChange={(e) => alterarLinha(linha.id, "status", e.target.value)}>
                        <option>OK</option>
                        <option>DNS</option>
                        <option>DNF</option>
                        <option>DQ</option>
                        <option>NM</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </main>
    </div>
  );

}
