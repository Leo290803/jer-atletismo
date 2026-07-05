import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { FASES_PROVA_PADRAO, normalizarFaseProva } from "../data/fasesProvas";

export default function Provas() {
  const [provas, setProvas] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [fasesEdicao, setFasesEdicao] = useState({});
  const [salvandoFaseId, setSalvandoFaseId] = useState("");

  const carregarProvas = async () => {
    setCarregando(true);

    const { data, error } = await supabase
      .from("provas")
      .select(`
        id,
        nome,
        categoria,
        naipe,
        tipo,
        subtipo,
        fase,
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
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregarProvas();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const provasFiltradas = provas.filter((p) => {
    const texto = `${p.nome} ${p.categoria} ${p.naipe} ${p.fase} ${p.tipo} ${p.subtipo}`.toLowerCase();
    return texto.includes(busca.toLowerCase());
  });

  function alterarFaseProva(provaId, valor) {
    setFasesEdicao((atual) => ({
      ...atual,
      [provaId]: valor,
    }));
  }

  async function salvarFaseProva(prova) {
    const fase = normalizarFaseProva(fasesEdicao[prova.id] ?? prova.fase);

    setSalvandoFaseId(prova.id);

    const { error } = await supabase
      .from("provas")
      .update({ fase })
      .eq("id", prova.id);

    setSalvandoFaseId("");

    if (error) {
      alert("Erro ao salvar fase: " + error.message);
      return;
    }

    setProvas((atuais) =>
      atuais.map((item) => (item.id === prova.id ? { ...item, fase } : item))
    );
    setFasesEdicao((atual) => {
      const copia = { ...atual };
      delete copia[prova.id];
      return copia;
    });
  }

  return (
    <div>
      <h1>Provas</h1>
      <p className="muted">
        Lista de provas criadas automaticamente pela importação.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <datalist id="fases-provas-padrao">
          {FASES_PROVA_PADRAO.map((fase) => (
            <option key={fase} value={fase} />
          ))}
        </datalist>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por prova, categoria, naipe ou fase..."
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
                <th align="left">Fase</th>
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
                  <td>{prova.subtipo || prova.tipo}</td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <input
                        list="fases-provas-padrao"
                        value={fasesEdicao[prova.id] ?? prova.fase ?? "QUALIFICACAO"}
                        onChange={(e) => alterarFaseProva(prova.id, e.target.value)}
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          minWidth: 170,
                          padding: "8px 10px",
                        }}
                      />
                      <button
                        onClick={() => salvarFaseProva(prova)}
                        disabled={salvandoFaseId === prova.id}
                        style={{
                          background: "#22c55e",
                          border: "none",
                          borderRadius: 8,
                          color: "#020617",
                          cursor: salvandoFaseId === prova.id ? "not-allowed" : "pointer",
                          fontWeight: "bold",
                          padding: "8px 12px",
                        }}
                      >
                        {salvandoFaseId === prova.id ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </td>
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
