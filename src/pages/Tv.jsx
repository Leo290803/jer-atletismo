import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const CONFIG_PADRAO = {
  titulo: "JER 2026 • ATLETISMO",
  subtitulo: "CENTRAL OFICIAL DE INFORMAÇÕES",
  aviso1: "Câmara de chamada aberta 15 minutos antes da prova",
  aviso2: "Acompanhe os resultados oficiais pelo QR Code",
  aviso3: "Delegações: procurem a Secretaria Geral em caso de dúvidas",
  rodape:
    "Resultados oficiais disponíveis em: /publico • Quadro de medalhas: /publico/medalhas",
  tempoAtualizacao: 8000,
  limiteResultados: 8,
  limiteMedalhas: 8,
};

export default function Tv() {
  const [resultados, setResultados] = useState([]);
  const [medalhas, setMedalhas] = useState([]);
  const [hora, setHora] = useState("");
  const [config, setConfig] = useState(CONFIG_PADRAO);

  const atualizarHora = useCallback(() => {
    setHora(new Date().toLocaleTimeString("pt-BR"));
  }, []);

  const carregarConfig = useCallback(async () => {
    const { data, error } = await supabase
      .from("tv_config")
      .select("valor")
      .eq("chave", "principal")
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    if (data?.valor) {
      setConfig({
        ...CONFIG_PADRAO,
        ...data.valor,
      });
    }
  }, []);

  const carregarResultados = useCallback(async () => {
    const limite = Number(config.limiteResultados) || 8;

    const { data, error } = await supabase
      .from("resultados")
      .select(`
        id,
        colocacao,
        tempo,
        melhor_marca,
        resultado_final,
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
      .order("id", { ascending: false })
      .limit(limite);

    if (error) {
      console.error(error);
      return;
    }

    setResultados(data || []);
  }, [config.limiteResultados]);

  const carregarMedalhas = useCallback(async () => {
    const limite = Number(config.limiteMedalhas) || 8;

    const { data, error } = await supabase
      .from("resultados")
      .select(`
        colocacao,
        publicado,
        provas (
          fase
        ),
        inscricoes (
          atletas (
            escolas (
              nome
            )
          )
        )
      `)
      .eq("publicado", true)
      .in("colocacao", [1, 2, 3]);

    if (error) {
      console.error(error);
      return;
    }

    const mapa = {};

    (data || []).forEach((r) => {
      const fase = r.provas?.fase || "";

      if (!["FINAL", "FINAL POR TEMPO"].includes(fase)) return;

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
      .slice(0, limite);

    setMedalhas(ranking);
  }, [config.limiteMedalhas]);

  const carregarTudo = useCallback(async () => {
    await carregarConfig();
    await carregarResultados();
    await carregarMedalhas();
  }, [carregarConfig, carregarResultados, carregarMedalhas]);

  useEffect(() => {
    const timerInicial = window.setTimeout(() => {
      void carregarTudo();
      atualizarHora();
    }, 0);

    const timerDados = window.setInterval(() => {
      void carregarTudo();
    }, Number(config.tempoAtualizacao) || 8000);
    const timerHora = window.setInterval(() => {
      atualizarHora();
    }, 1000);

    return () => {
      window.clearTimeout(timerInicial);
      window.clearInterval(timerDados);
      window.clearInterval(timerHora);
    };
  }, [config.tempoAtualizacao, carregarTudo, atualizarHora]);

  function resultadoFinal(r) {
    return r.tempo || r.melhor_marca || r.resultado_final || "-";
  }

  function medalha(pos) {
    if (Number(pos) === 1) return "🥇";
    if (Number(pos) === 2) return "🥈";
    if (Number(pos) === 3) return "🥉";
    return "";
  }

  const avisos = [config.aviso1, config.aviso2, config.aviso3].filter(Boolean);

  return (
    <div style={pagina}>
      <header style={topo}>
  <div style={topoEsquerda}>
    
    <img
      src="/logo-jer.png"
      alt="JER"
      style={logo}
    />

    <div>
      <h1 style={titulo}>{config.titulo}</h1>
      <p style={subtitulo}>{config.subtitulo}</p>
    </div>

  </div>

  <div style={horaBox}>{hora}</div>
</header>

      <main style={grid}>
        <section style={cardGrande}>
          <h2 style={secaoTitulo}>ÚLTIMOS RESULTADOS</h2>

          {resultados.length === 0 ? (
            <div style={vazio}>Aguardando resultados publicados</div>
          ) : (
            resultados.map((r) => {
              const atleta = r.inscricoes?.atletas;

              return (
                <div key={r.id} style={resultadoCard}>
                  <div>
                    <h3 style={nomeAtleta}>
                      {medalha(r.colocacao)}{" "}
                      {r.colocacao ? `${r.colocacao}º` : "-"} •{" "}
                      {atleta?.nome || "Atleta"}
                    </h3>

                    <p style={provaTexto}>
                      {r.provas?.nome} • {r.provas?.categoria} •{" "}
                      {r.provas?.naipe} • {r.provas?.fase || "QUALIFICAÇÃO"}
                    </p>

                    <p style={escolaTexto}>
                      {atleta?.escolas?.nome || "Sem escola"} •{" "}
                      {atleta?.municipio || "-"}
                    </p>
                  </div>

                  <div style={resultadoNumero}>{resultadoFinal(r)}</div>
                </div>
              );
            })
          )}
        </section>

        <aside style={lateral}>
          <section style={card}>
            <h2 style={secaoTituloPequeno}>QUADRO DE MEDALHAS</h2>

            {medalhas.length === 0 ? (
              <div style={vazioPequeno}>Aguardando finais publicadas</div>
            ) : (
              medalhas.map((m, index) => (
                <div key={m.escola} style={medalhaLinha}>
                  <div style={posicao}>{index + 1}º</div>

                  <div style={{ flex: 1 }}>
                    <strong>{m.escola}</strong>
                    <div style={medalhaNumeros}>
                      🥇 {m.ouro} &nbsp; 🥈 {m.prata} &nbsp; 🥉 {m.bronze}
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          <section style={card}>
            <h2 style={secaoTituloPequeno}>AVISOS</h2>

            {avisos.length === 0 ? (
              <div style={vazioPequeno}>Sem avisos no momento</div>
            ) : (
              avisos.map((aviso, index) => (
                <div key={index} style={avisoBox}>
                  {aviso}
                </div>
              ))
            )}
          </section>
        </aside>
      </main>

      <footer style={rodape}>{config.rodape}</footer>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: 28,
  fontFamily: "Arial, sans-serif",
  overflow: "hidden",
};

const topo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "linear-gradient(90deg, #16a34a, #22c55e)",
  color: "#020617",
  padding: "5px 32px",
  borderRadius: 100,
  marginBottom: 24,
};

const titulo = {
  margin: 0,
  fontSize: 44,
  fontWeight: "900",
  letterSpacing: 1,
};

const subtitulo = {
  margin: "6px 0 0",
  fontSize: 20,
  fontWeight: "bold",
};

const horaBox = {
  fontSize: 42,
  fontWeight: "900",
  background: "rgba(2, 6, 23, 0.12)",
  padding: "14px 22px",
  borderRadius: 18,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 24,
  height: "calc(100vh - 190px)",
};

const cardGrande = {
  background: "#0f172a",
  borderRadius: 26,
  padding: 24,
  overflow: "hidden",
  border: "1px solid #1e293b",
};

const lateral = {
  display: "grid",
  gridTemplateRows: "1fr auto",
  gap: 24,
  minHeight: 0,
};

const card = {
  background: "#0f172a",
  borderRadius: 26,
  padding: 22,
  border: "1px solid #1e293b",
  overflow: "hidden",
};

const secaoTitulo = {
  margin: "0 0 22px",
  fontSize: 34,
  color: "#22c55e",
  letterSpacing: 1,
};

const secaoTituloPequeno = {
  margin: "0 0 18px",
  fontSize: 26,
  color: "#22c55e",
  letterSpacing: 1,
};

const resultadoCard = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 20,
  padding: 18,
  marginBottom: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
};

const nomeAtleta = {
  margin: 0,
  fontSize: 26,
};

const provaTexto = {
  margin: "8px 0 0",
  fontSize: 18,
  opacity: 0.9,
};

const escolaTexto = {
  margin: "6px 0 0",
  fontSize: 16,
  opacity: 0.75,
};

const resultadoNumero = {
  minWidth: 130,
  textAlign: "right",
  fontSize: 34,
  fontWeight: "900",
  color: "#22c55e",
};

const medalhaLinha = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 16,
  padding: 13,
  marginBottom: 11,
  fontSize: 17,
};

const posicao = {
  width: 46,
  height: 46,
  borderRadius: 14,
  background: "#22c55e",
  color: "#020617",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontWeight: "900",
  fontSize: 18,
};

const medalhaNumeros = {
  marginTop: 4,
  fontSize: 16,
  opacity: 0.9,
};

const avisoBox = {
  background: "#16a34a",
  color: "#020617",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  fontSize: 20,
  fontWeight: "900",
};

const vazio = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 20,
  padding: 30,
  fontSize: 26,
  opacity: 0.8,
};

const vazioPequeno = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 16,
  padding: 18,
  fontSize: 18,
  opacity: 0.8,
};

const rodape = {
  marginTop: 16,
  textAlign: "center",
  fontSize: 18,
  opacity: 0.75,
};

const topoEsquerda = {
  display: "flex",
  alignItems: "center",
  gap: 22,
};

const logo = {
  width: 150,
  height: 150,
  objectFit: "contain",
};