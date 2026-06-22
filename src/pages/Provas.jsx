import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Provas() {
  const [provas, setProvas] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarProvas();
  }, []);

  async function carregarProvas() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("provas")
      .select(`
        id,
        nome,
        categoria,
        naipe,
        tipo,
        status,
        inscricoes(id)
      `)
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar provas: " + error.message);
      setCarregando(false);
      return;
    }

    setProvas(data || []);
    setCarregando(false);
  }

  const provasFiltradas = provas.filter((p) => {
    const texto = `${p.nome} ${p.categoria} ${p.naipe} ${p.tipo}`.toLowerCase();
    return texto.includes(busca.toLowerCase());
  });

  return (
    <div>
      <h1>Provas</h1>
      <p className="muted">
        Lista de provas criadas automaticamente pela importação.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por prova, categoria, naipe..."
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 10,
            border: "1px solid #334155",
            background: "#020617",
            color: "white",
            fontSize: 16,
          }}
        />
      </div>

      <div className="card">
        {carregando ? (
          <p>Carregando provas...</p>
        ) : (
          <table width="100%" cellPadding="12">
            <thead>
              <tr>
                <th align="left">Prova</th>
                <th align="left">Categoria</th>
                <th align="left">Naipe</th>
                <th align="left">Tipo</th>
                <th align="center">Atletas</th>
                <th align="left">Status</th>
              </tr>
            </thead>

            <tbody>
              {provasFiltradas.map((prova) => (
                <tr key={prova.id}>
                  <td>{prova.nome}</td>
                  <td>{prova.categoria}</td>
                  <td>{prova.naipe}</td>
                  <td>{prova.tipo}</td>
                  <td align="center">{prova.inscricoes?.length || 0}</td>
                  <td>{prova.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}