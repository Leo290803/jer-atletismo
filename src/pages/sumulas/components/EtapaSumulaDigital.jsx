const baseBotao = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 10,
  color: "#020617",
  fontWeight: "bold",
  marginRight: 10,
  marginBottom: 10,
  cursor: "pointer",
};

const botaoVerde = { ...baseBotao, background: "#22c55e" };
const botaoAzul = { ...baseBotao, background: "#38bdf8" };
const botaoMiniVermelho = {
  border: "none",
  borderRadius: 8,
  padding: "8px 10px",
  fontWeight: "bold",
  cursor: "pointer",
  background: "#ef4444",
  color: "white",
};

export default function EtapaSumulaDigital({
  sumulaDigital,
  sumulasDigitais,
  tokenMensagem,
  linkArbitro,
  gerarSumulaDigital,
  bloquearSumulaDigital,
  reabrirSumulaDigital,
  setTokenMensagem,
}) {
  return (
    <div
      style={{
        marginTop: 18,
        borderRadius: 18,
        background: "#eef2ff",
        padding: 18,
        border: "1px solid #c7d2fe",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <strong style={{ fontSize: 16 }}>Sumula Digital do Arbitro</strong>
          <p style={{ margin: "8px 0 0", color: "#475569" }}>
            Gere o token e o QR para que o arbitro lance resultados sem acessar o painel administrativo.
          </p>
        </div>

        <button onClick={gerarSumulaDigital} style={botaoVerde}>
          {sumulaDigital ? "Recriar Sumula" : "Gerar Sumula Digital"}
        </button>
      </div>

      {tokenMensagem && <p style={{ marginTop: 12, color: "#1d4ed8" }}>{tokenMensagem}</p>}

      {sumulaDigital && (
        <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 700 }}>Link do arbitro</label>
            <div
              style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
            >
              <input
                type="text"
                readOnly
                value={linkArbitro(sumulaDigital.token_acesso)}
                style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(linkArbitro(sumulaDigital.token_acesso));
                  setTokenMensagem("Link copiado.");
                }}
                style={botaoAzul}
              >
                Copiar link
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>QR Code</label>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code?size=160x160&data=${encodeURIComponent(
                  linkArbitro(sumulaDigital.token_acesso)
                )}`}
                alt="QR Code da sumula"
                style={{ borderRadius: 12, border: "1px solid #cbd5e1" }}
              />
            </div>

            <div style={{ minWidth: 260 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 700 }}>Status</div>
                <div style={{ color: "#1e293b" }}>{sumulaDigital.status.replaceAll("_", " ")}</div>
              </div>

              <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
                <button
                  onClick={bloquearSumulaDigital}
                  style={botaoMiniVermelho}
                  disabled={sumulaDigital.status === "BLOQUEADA"}
                >
                  Bloquear acesso
                </button>
                <button
                  onClick={reabrirSumulaDigital}
                  style={botaoAzul}
                  disabled={sumulaDigital.status !== "BLOQUEADA"}
                >
                  Reabrir sumula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sumulasDigitais.length > 0 && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #cbd5e1",
          }}
        >
          <h4 style={{ margin: "0 0 12px", fontSize: 16 }}>Sumulas geradas para esta prova</h4>
          <div style={{ display: "grid", gap: 12 }}>
            {sumulasDigitais.map((sd) => (
              <div
                key={sd.id}
                style={{ display: "grid", gap: 8, padding: 12, borderRadius: 14, background: "#f8fafc" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700 }}>Token: {sd.token_acesso}</span>
                  <span style={{ color: "#475569" }}>Status: {sd.status.replaceAll("_", " ")}</span>
                </div>
                <div style={{ display: "grid", gap: 6, color: "#334155" }}>
                  <div>Criada em: {sd.criada_em ? new Date(sd.criada_em).toLocaleString("pt-BR") : "-"}</div>
                  <div>Expira em: {sd.expires_at ? new Date(sd.expires_at).toLocaleString("pt-BR") : "-"}</div>
                  <div>Link: {linkArbitro(sd.token_acesso)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
