import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function PistaAoVivo() {
  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [status, setStatus] = useState("aguardando");

  const publicar = async () => {
    const { data: existente } = await supabase
      .from("telao_pista_controle")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (existente) {
      await supabase
        .from("telao_pista_controle")
        .update({
          titulo,
          subtitulo,
          status,
          publicado: true,
          atualizado_em: new Date(),
        })
        .eq("id", existente.id);

      alert("Atualizado no telão!");
    } else {
      await supabase.from("telao_pista_controle").insert({
        titulo,
        subtitulo,
        status,
        publicado: true,
      });

      alert("Publicado no telão!");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Pista ao Vivo</h1>

      <div style={{ marginBottom: 20 }}>
        <label>Título</label>

        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginTop: 5,
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>Subtítulo</label>

        <input
          type="text"
          value={subtitulo}
          onChange={(e) => setSubtitulo(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginTop: 5,
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>Status</label>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginTop: 5,
          }}
        >
          <option value="aguardando">Aguardando</option>
          <option value="agora_na_pista">Agora na pista</option>
          <option value="resultado_serie">Resultado da série</option>
          <option value="resultado_final">Resultado final</option>
          <option value="proxima_serie">Próxima série</option>
          <option value="proxima_prova">Próxima prova</option>
        </select>
      </div>

      <button
        onClick={publicar}
        style={{
          padding: "12px 20px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Publicar no Telão
      </button>
    </div>
  );
}