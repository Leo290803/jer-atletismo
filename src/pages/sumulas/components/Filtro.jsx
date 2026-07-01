const selectFiltro = {
  display: "block",
  width: "100%",
  padding: 10,
  borderRadius: 8,
  marginTop: 6,
};

export default function Filtro({ label, value, setValue, itens }) {
  return (
    <div>
      <label>{label}</label>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={selectFiltro}
      >
        <option value="">Todos</option>
        {itens.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}
