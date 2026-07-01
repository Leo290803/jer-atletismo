import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getNumeroAtleta } from "../utils/getNumeroAtleta";

export default function Resultados() {
  const [provas, setProvas] = useState([]);
  const [provaSelecionada, setProvaSelecionada] = useState("");
  const [resultados, setResultados] = useState([]);
  const [mensagem, setMensagem] = useState("");

  const carregarProvas = async () => {
    const { data, error } = await supabase
      .from("provas")
      .select("*")
      .order("nome");

    if (error) {
      setMensagem(error.message);
      return;
    }

    setProvas(data || []);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregarProvas();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function carregarResultados(provaId) {
    const { data, error } = await supabase
      .from("resultados")
      .select(`
        *,
        inscricoes (
          atletas (
            numero,
            numero_competicao,
            nome,
            municipio,
            escolas (
              nome
            )
          )
        )
      `)
      .eq("prova_id", provaId);

    if (error) {
      setMensagem(error.message);
      return;
    }

    const ordenados = [...(data || [])].sort((a, b) => {
      if (a.colocacao && b.colocacao) {
        return a.colocacao - b.colocacao;
      }

      return 0;
    });

    setResultados(ordenados);
  }

  function medalha(posicao) {
    if (posicao === 1) return "🥇";
    if (posicao === 2) return "🥈";
    if (posicao === 3) return "🥉";
    return "";
  }

  function imprimir() {
    window.print();
  }

  return (
    <div>
      <style>
        {`
          @media print {

            .nao-imprimir {
              display:none !important;
            }

            body {
              background:white !important;
              color:black !important;
            }

            table {
              width:100%;
              border-collapse:collapse;
            }

            th, td {
              border:1px solid black;
              padding:8px;
              color:black !important;
            }

          }
        `}
      </style>

      <div className="nao-imprimir">
        <h1>Resultados</h1>

        <p className="muted">
          Classificação geral das provas.
        </p>

        <div className="card" style={{ marginBottom: 20 }}>
          <label>Selecione a prova</label>

          <select
            value={provaSelecionada}
            onChange={(e) => {
              setProvaSelecionada(e.target.value);
              carregarResultados(e.target.value);
            }}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              marginTop: 10,
            }}
          >
            <option value="">Selecione...</option>

            {provas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} - {p.categoria} - {p.naipe} - {p.fase}
              </option>
            ))}
          </select>

          <button
            onClick={imprimir}
            style={{
              marginTop: 15,
              padding: "12px 18px",
              borderRadius: 10,
              border: "none",
              background: "#38bdf8",
              color: "#020617",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Imprimir Resultado
          </button>

          {mensagem && (
            <p style={{ marginTop: 15 }}>
              {mensagem}
            </p>
          )}
        </div>
      </div>

      {resultados.length > 0 && (
        <div className="card">
          <h2>Classificação Final</h2>

          <table width="100%" cellPadding="10">
            <thead>
              <tr>
                <th>Pos.</th>
                <th></th>
                <th>Nº</th>
                <th>Atleta</th>
                <th>Escola</th>
                <th>Município</th>
                <th>Resultado</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {resultados.map((r, index) => {
                const atleta = r.inscricoes?.atletas;

                return (
                  <tr key={r.id}>
                    <td>
                      {r.colocacao || index + 1}º
                    </td>

                    <td style={{ fontSize: 22 }}>
                      {medalha(r.colocacao)}
                    </td>

                    <td>{getNumeroAtleta(atleta)}</td>

                    <td>{atleta?.nome}</td>

                    <td>{atleta?.escolas?.nome}</td>

                    <td>{atleta?.municipio}</td>

                    <td>
                      {r.tempo ||
                        r.marca ||
                        r.resultado ||
                        "-"}
                    </td>

                    <td>{r.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}