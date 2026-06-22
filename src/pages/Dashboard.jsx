import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [dados, setDados] = useState({
    atletas: 0,
    provas: 0,
    escolas: 0,
    andamento: 0,
    resultados: 0,
  });

  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarDashboard();
  }, []);

  async function carregarDashboard() {
    try {
      const [
        atletasRes,
        provasRes,
        escolasRes,
        andamentoRes,
        resultadosRes,
      ] = await Promise.all([
        supabase.from("atletas").select("*", { count: "exact", head: true }),

        supabase.from("provas").select("*", { count: "exact", head: true }),

        supabase.from("escolas").select("*", { count: "exact", head: true }),

        supabase
          .from("provas")
          .select("*", { count: "exact", head: true })
          .eq("status", "em_andamento"),

        supabase
          .from("resultados")
          .select("*", { count: "exact", head: true }),
      ]);

      setDados({
        atletas: atletasRes.count || 0,
        provas: provasRes.count || 0,
        escolas: escolasRes.count || 0,
        andamento: andamentoRes.count || 0,
        resultados: resultadosRes.count || 0,
      });
    } catch (err) {
      setMensagem(err.message);
    }
  }

  return (
    <div>
      <h1>Dashboard</h1>

      <p className="muted">
        Resumo geral da competição de atletismo
      </p>

      {mensagem && (
        <p style={{ marginBottom: 20 }}>
          {mensagem}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 20,
        }}
      >
        <Card
          titulo="Total de Atletas"
          valor={dados.atletas}
        />

        <Card
          titulo="Total de Provas"
          valor={dados.provas}
        />

        <Card
          titulo="Total de Escolas"
          valor={dados.escolas}
        />

        <Card
          titulo="Em andamento"
          valor={dados.andamento}
        />

        <Card
          titulo="Resultados"
          valor={dados.resultados}
        />
      </div>
    </div>
  );
}

function Card({ titulo, valor }) {
  return (
    <div
      className="card"
      style={{
        padding: 24,
        borderRadius: 18,
      }}
    >
      <p
        style={{
          opacity: 0.7,
          marginBottom: 10,
        }}
      >
        {titulo}
      </p>

      <h2
        style={{
          fontSize: 42,
          color: "#22c55e",
        }}
      >
        {valor}
      </h2>
    </div>
  );
}