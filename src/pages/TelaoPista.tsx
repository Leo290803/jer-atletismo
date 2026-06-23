import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type TelaoData = {
  titulo: string;
  subtitulo: string;
  status: string;
};

export default function TelaoPista() {
  const [dados, setDados] = useState<TelaoData | null>(null);

  const carregar = async () => {
    const { data } = await supabase
      .from("telao_pista_controle")
      .select("*")
      .eq("publicado", true)
      .order("atualizado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setDados(data);
    }
  };

  useEffect(() => {
    carregar();

    const interval = setInterval(() => {
      carregar();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 40,
      }}
    >
      <h2
        style={{
          fontSize: 30,
          marginBottom: 20,
          color: "#facc15",
        }}
      >
        JER ATLETISMO
      </h2>

      <h1
        style={{
          fontSize: 70,
          marginBottom: 20,
        }}
      >
        {dados?.titulo || "AGUARDANDO"}
      </h1>

      <h3
        style={{
          fontSize: 40,
          marginBottom: 30,
        }}
      >
        {dados?.subtitulo || ""}
      </h3>

      <div
        style={{
          fontSize: 28,
          background: "#2563eb",
          padding: "12px 24px",
          borderRadius: 10,
        }}
      >
        {dados?.status?.replaceAll("_", " ").toUpperCase()}
      </div>
    </div>
  );
}