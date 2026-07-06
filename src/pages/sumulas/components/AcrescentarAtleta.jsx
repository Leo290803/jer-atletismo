import { useState } from "react";

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const modal = {
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: 16,
  padding: 22,
  width: "100%",
  maxWidth: 560,
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.35)",
};

const campo = {
  display: "block",
  width: "100%",
  padding: 11,
  marginTop: 6,
  marginBottom: 12,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  background: "#ffffff",
  boxSizing: "border-box",
};

const label = { fontWeight: 700, fontSize: 14 };

const botaoVerde = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 10,
  background: "#22c55e",
  color: "#052e16",
  fontWeight: "bold",
  cursor: "pointer",
};

const botaoCinza = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 10,
  background: "#e2e8f0",
  color: "#0f172a",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: 10,
};

const linhaEscola = {
  padding: "8px 10px",
  border: "1px solid #dbe3ee",
  borderRadius: 8,
  marginBottom: 6,
  cursor: "pointer",
  background: "#f8fafc",
};

export default function AcrescentarAtleta({
  series = [],
  escolasEncontradas = [],
  buscarEscolas,
  acrescentarAtletaNaSerie,
  onFechar,
}) {
  const [nome, setNome] = useState("");
  const [numero, setNumero] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [buscaEscola, setBuscaEscola] = useState("");
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [serieId, setSerieId] = useState(series[0]?.id || "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) {
      window.alert("Informe o nome do atleta.");
      return;
    }
    if (!serieId) {
      window.alert("Escolha a serie.");
      return;
    }

    const serie = series.find((s) => s.id === serieId);
    setSalvando(true);

    const ok = await acrescentarAtletaNaSerie({
      dadosAtleta: {
        nome,
        numero,
        municipio,
        data_nascimento: dataNascimento,
        escola_id: escolaSelecionada?.id || null,
      },
      serie,
    });

    setSalvando(false);
    if (ok) onFechar?.();
  }

  return (
    <div style={overlay} onClick={onFechar}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Acrescentar atleta na súmula</h3>
        <p style={{ marginTop: 0, color: "#475569", fontSize: 14 }}>
          Cria um atleta novo e adiciona direto na série escolhida, na próxima raia livre.
        </p>

        <label style={label}>Nome do atleta *</label>
        <input
          style={campo}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome completo"
        />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Número</label>
            <input
              style={campo}
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ex: 123"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Nascimento</label>
            <input
              style={campo}
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />
          </div>
        </div>

        <label style={label}>Município</label>
        <input
          style={campo}
          value={municipio}
          onChange={(e) => setMunicipio(e.target.value)}
          placeholder="Ex: Boa Vista"
        />

        <label style={label}>Escola</label>
        {escolaSelecionada ? (
          <div style={{ ...linhaEscola, background: "#ecfdf5", borderColor: "#22c55e" }}>
            {escolaSelecionada.nome}{" "}
            <button
              style={{ ...botaoCinza, padding: "4px 10px", marginLeft: 8 }}
              onClick={() => setEscolaSelecionada(null)}
            >
              Trocar
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...campo, marginBottom: 8 }}
                value={buscaEscola}
                onChange={(e) => setBuscaEscola(e.target.value)}
                placeholder="Buscar escola (2+ letras)"
              />
              <button
                style={{ ...botaoCinza, marginRight: 0, height: 44 }}
                onClick={() => buscarEscolas?.(buscaEscola)}
              >
                Buscar
              </button>
            </div>
            {escolasEncontradas.length > 0 && (
              <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 12 }}>
                {escolasEncontradas.map((esc) => (
                  <div
                    key={esc.id}
                    style={linhaEscola}
                    onClick={() => {
                      setEscolaSelecionada(esc);
                      setBuscaEscola("");
                    }}
                  >
                    {esc.nome}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <label style={label}>Série *</label>
        <select style={campo} value={serieId} onChange={(e) => setSerieId(e.target.value)}>
          <option value="">Escolha a série</option>
          {series.map((s) => (
            <option key={s.id} value={s.id}>
              Série {s.numero_serie} ({(s.raias || []).length} atletas)
            </option>
          ))}
        </select>

        <div style={{ marginTop: 12, textAlign: "right" }}>
          <button style={botaoCinza} onClick={onFechar} disabled={salvando}>
            Cancelar
          </button>
          <button style={botaoVerde} onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Adicionar na súmula"}
          </button>
        </div>
      </div>
    </div>
  );
}