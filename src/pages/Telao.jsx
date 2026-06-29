import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Telao() {
  const [resultados, setResultados] = useState([]);
  const [medalhas, setMedalhas] = useState([]);
  const [mensagem, setMensagem] = useState("");

  const gerarMedalhas = useCallback((lista) => {
    const mapa = {};

    lista.forEach((r) => {
      const fase = r.provas?.fase || "";

      if (!["FINAL", "FINAL POR TEMPO"].includes(fase)) return;
      if (![1, 2, 3].includes(Number(r.colocacao))) return;

      const escola = r.inscricoes?.atletas?.escolas?.nome || "SEM ESCOLA";

      if (!mapa[escola]) {
        mapa[escola] = {
          escola,
          ouro: 0,
          prata: 0,
          bronze: 0,
          total: 0,
        };
      }

      if (Number(r.colocacao) === 1) mapa[escola].ouro += 1;
      if (Number(r.colocacao) === 2) mapa[escola].prata += 1;
      if (Number(r.colocacao) === 3) mapa[escola].bronze += 1;

      mapa[escola].total += 1;
    });

    const ranking = Object.values(mapa)
      .sort((a, b) => {
        if (b.ouro !== a.ouro) return b.ouro - a.ouro;
        if (b.prata !== a.prata) return b.prata - a.prata;
        if (b.bronze !== a.bronze) return b.bronze - a.bronze;
        return b.total - a.total;
      })
      .slice(0, 5);

    setMedalhas(ranking);
  }, []);

  const carregarDados = useCallback(async () => {
    setMensagem("Atualizando...");

    const { data, error } = await supabase
      .from("resultados")
      .select(`
        id,
        colocacao,
        tempo,
        melhor_marca,
        resultado_final,
        data_resultado,
        publicado,
        provas (
          nome,
          categoria,
          naipe,
          fase
        ),
        inscricoes (
          atletas (
            nome,
            municipio,
            escolas (
              nome
            )
          )
        )
      `)
      .eq("publicado", true)
      .order("data_resultado", { ascending: false })
      .order("colocacao", { ascending: true })
      .limit(30);

    if (error) {
      setMensagem("Erro ao carregar telão: " + error.message);
      return;
    }

    const lista = data || [];

    setResultados(lista.slice(0, 10));
    gerarMedalhas(lista);
    setMensagem("");
  }, [gerarMedalhas]);

  useEffect(() => {
    const timerInicial = window.setTimeout(() => {
      void carregarDados();
    }, 0);

    const timer = window.setInterval(() => {
      void carregarDados();
    }, 15000);

    return () => {
      window.clearTimeout(timerInicial);
      window.clearInterval(timer);
    };
  }, [carregarDados]);

  function resultadoFinal(r) {
    return r.tempo || r.melhor_marca || r.resultado_final || "-";
  }

  function medalha(pos) {
    if (Number(pos) === 1) return "🥇";
    if (Number(pos) === 2) return "🥈";
    if (Number(pos) === 3) return "🥉";
    return "";
  }

  return (
    <div style={pagina}>
      <header style={header}>
        <div>
          <h1 style={{ margin: 0 }}>JER 2026 - ATLETISMO</h1>
          <p style={{ margin: "8px 0 0" }}>TELÃO OFICIAL DE RESULTADOS</p>
        </div>

        <div style={status}>
          {mensagem || "Atualização automática a cada 15s"}
        </div>
      </header>

      <main style={grid}>
        <section style={cardGrande}>
          <h2 style={titulo}>Últimos Resultados</h2>

          {resultados.length === 0 ? (
            <p>Nenhum resultado publicado ainda.</p>
          ) : (
            resultados.map((r) => {
              const atleta = r.inscricoes?.atletas;

              return (
                <div key={r.id} style={resultadoCard}>
                  <div>
                    <h3 style={{ margin: 0 }}>
                      {medalha(r.colocacao)}{" "}
                      {r.colocacao ? `${r.colocacao}º` : ""}
                      {" - "}
                      {atleta?.nome}
                    </h3>

                    <p style={{ margin: "8px 0 0", opacity: 0.9 }}>
                      {r.provas?.nome} • {r.provas?.categoria} •{" "}
                      {r.provas?.naipe} • {r.provas?.fase || "QUALIFICAÇÃO"}
                    </p>

                    <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
                      {atleta?.escolas?.nome} - {atleta?.municipio}
                    </p>
                  </div>

                  <div style={resultadoNumero}>{resultadoFinal(r)}</div>
                </div>
              );
            })
          )}
        </section>

        <section style={card}>
          <h2 style={titulo}>Quadro de Medalhas</h2>

          {medalhas.length === 0 ? (
            <p>Aguardando finais publicadas.</p>
          ) : (
            medalhas.map((m, index) => (
              <div key={m.escola} style={medalhaLinha}>
                <strong>{index + 1}º</strong>

                <span style={{ flex: 1 }}>{m.escola}</span>

                <span>🥇 {m.ouro}</span>
                <span>🥈 {m.prata}</span>
                <span>🥉 {m.bronze}</span>
              </div>
            ))
          )}
        </section>

        <section style={card}>
          <h2 style={titulo}>Links Públicos</h2>

          <div style={linkBox}>/publico</div>
          <div style={linkBox}>/publico/medalhas</div>
          <div style={linkBox}>/telao</div>
        </section>
      </main>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: 28,
  fontFamily: "Arial, sans-serif",
};

const header = {
  background: "linear-gradient(90deg, #16a34a, #22c55e)",
  color: "#020617",
  padding: 28,
  borderRadius: 24,
  marginBottom: 24,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
};

const status = {
  background: "rgba(2, 6, 23, 0.15)",
  padding: "12px 18px",
  borderRadius: 14,
  fontWeight: "bold",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 24,
};

const cardGrande = {
  background: "#0f172a",
  padding: 24,
  borderRadius: 24,
  gridRow: "span 2",
};

const card = {
  background: "#0f172a",
  padding: 24,
  borderRadius: 24,
};

const titulo = {
  marginTop: 0,
  color: "#22c55e",
};

const resultadoCard = {
  background: "#020617",
  padding: 18,
  borderRadius: 18,
  marginBottom: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  border: "1px solid #1e293b",
};

const resultadoNumero = {
  fontSize: 34,
  fontWeight: "bold",
  color: "#22c55e",
  minWidth: 120,
  textAlign: "right",
};

const medalhaLinha = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  background: "#020617",
  border: "1px solid #1e293b",
  padding: 12,
  borderRadius: 14,
  marginBottom: 10,
};

const linkBox = {
  background: "#020617",
  border: "1px solid #334155",
  padding: 14,
  borderRadius: 12,
  marginBottom: 10,
  fontWeight: "bold",
};