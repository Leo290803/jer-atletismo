export default function Etapa({ numero, titulo, children }) {
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <h3 style={{ marginTop: 0 }}>
        Etapa {numero} - {titulo}
      </h3>
      {children}
    </div>
  );
}
