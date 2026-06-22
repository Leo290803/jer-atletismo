import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function MedalhasPublico() {
  const [linhas, setLinhas] = useState([]);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarMedalhas();
  }, []);

  async function carregarMedalhas() {
    setMensagem("Carregando quadro de medalhas...");

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
            municipio,
            escolas (
              nome
            )
          )
        )
      `)
      .eq("publicado", true)
      .in("colocacao", [1, 2, 3]);

    if (error) {
      setMensagem("Erro ao carregar medalhas: " + error.message);
      return;
    }

    const mapa = {};

    (data || []).forEach((r) => {
      const fase = r.provas?.fase || "";

      if (!["FINAL", "FINAL POR TEMPO"].includes(fase)) return;

      const escola = r.inscricoes?.atletas?.escolas?.nome || "SEM ESCOLA";
      const municipio = r.inscricoes?.atletas?.municipio || "-";
      const chave = `${escola}||${municipio}`;

      if (!mapa[chave]) {
        mapa[chave] = {
          escola,
          municipio,
          ouro: 0,
          prata: 0,
          bronze: 0,
          total: 0,
        };
      }

      if (r.colocacao === 1) mapa[chave].ouro += 1;
      if (r.colocacao === 2) mapa[chave].prata += 1;
      if (r.colocacao === 3) mapa[chave].bronze += 1;

      mapa[chave].total += 1;
    });

    const lista = Object.values(mapa).sort((a, b) => {
      if (b.ouro !== a.ouro) return b.ouro - a.ouro;
      if (b.prata !== a.prata) return b.prata - a.prata;
      if (b.bronze !== a.bronze) return b.bronze - a.bronze;
      return b.total - a.total;
    });

    setLinhas(lista);
    setMensagem("");
  }

  return (
    <div style={pagina}>
      <header style={header}>
        <h1 style={{ margin: 0 }}>JER 2026 - Atletismo</h1>
        <p style={{ margin: "6px 0 0" }}>Quadro de medalhas oficial</p>
      </header>

      <section style={card}>
        <div style={topo}>
          <h2 style={{ margin: 0 }}>Quadro de Medalhas</h2>

          <button onClick={carregarMedalhas} style={botao}>
            Atualizar
          </button>
        </div>

        {mensagem && <p>{mensagem}</p>}

        {linhas.length === 0 ? (
          <p>Nenhuma medalha publicada até o momento.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tabela}>
              <thead>
                <tr>
                  <th style={th}>Pos.</th>
                  <th style={th}>Escola</th>
                  <th style={th}>Município</th>
                  <th style={th}>🥇 Ouro</th>
                  <th style={th}>🥈 Prata</th>
                  <th style={th}>🥉 Bronze</th>
                  <th style={th}>Total</th>
                </tr>
              </thead>

              <tbody>
                {linhas.map((linha, index) => (
                  <tr key={`${linha.escola}-${linha.municipio}`}>
                    <td style={td}>{index + 1}º</td>
                    <td style={td}>{linha.escola}</td>
                    <td style={td}>{linha.municipio}</td>
                    <td style={tdCentro}>{linha.ouro}</td>
                    <td style={tdCentro}>{linha.prata}</td>
                    <td style={tdCentro}>{linha.bronze}</td>
                    <td style={tdCentro}>
                      <strong>{linha.total}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: 24,
};

const header = {
  background: "#16a34a",
  padding: 24,
  borderRadius: 18,
  marginBottom: 20,
  textAlign: "center",
};

const card = {
  background: "#0f172a",
  padding: 20,
  borderRadius: 18,
};

const topo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16,
};

const botao = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 10,
  background: "#22c55e",
  color: "#020617",
  fontWeight: "bold",
  cursor: "pointer",
};

const tabela = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#020617",
};

const th = {
  border: "1px solid #334155",
  padding: 10,
  textAlign: "left",
  background: "#1e293b",
};

const td = {
  border: "1px solid #334155",
  padding: 10,
};

const tdCentro = {
  ...td,
  textAlign: "center",
};