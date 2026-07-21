import React from "react";

function FiltrosEgresos({
  filtros,
  categorias,
  proveedores,
  cargando,
  onCambiar,
  onBuscar,
  onLimpiar,
}) {
  const estiloCampo = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #dcdcdc",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#fff",
    boxSizing: "border-box",
  };

  const estiloLabel = {
    display: "block",
    marginBottom: "6px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#444",
    textTransform: "uppercase",
  };

  return (
    <div
      style={{
        background: "#fafafa",
        border: "1px solid #e6e6e6",
        borderRadius: "12px",
        padding: "18px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "14px",
        }}
      >
        <div>
          <label style={estiloLabel}>Fecha inicial</label>
          <input
            type="date"
            name="fecha_inicio"
            value={filtros.fecha_inicio}
            onChange={onCambiar}
            style={estiloCampo}
          />
        </div>

        <div>
          <label style={estiloLabel}>Fecha final</label>
          <input
            type="date"
            name="fecha_fin"
            value={filtros.fecha_fin}
            onChange={onCambiar}
            style={estiloCampo}
          />
        </div>

        <div>
          <label style={estiloLabel}>Tipo</label>
          <select
            name="tipo_egreso"
            value={filtros.tipo_egreso}
            onChange={onCambiar}
            style={estiloCampo}
          >
            <option value="">Todos</option>
            <option value="efectivo">Efectivo</option>
            <option value="bancos">Bancos</option>
            <option value="banca">Banca</option>
          </select>
        </div>

        <div>
          <label style={estiloLabel}>Categoría</label>
          <select
            name="categoria_id"
            value={filtros.categoria_id}
            onChange={onCambiar}
            style={estiloCampo}
          >
            <option value="">Todas</option>

            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={estiloLabel}>Proveedor</label>
          <select
            name="proveedor_id"
            value={filtros.proveedor_id}
            onChange={onCambiar}
            style={estiloCampo}
          >
            <option value="">Todos</option>

            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={estiloLabel}>Concepto</label>
          <input
            type="text"
            name="concepto"
            value={filtros.concepto}
            onChange={onCambiar}
            placeholder="Buscar concepto"
            style={estiloCampo}
          />
        </div>

        <div>
          <label style={estiloLabel}>Referencia</label>
          <input
            type="text"
            name="referencia"
            value={filtros.referencia}
            onChange={onCambiar}
            placeholder="Buscar referencia"
            style={estiloCampo}
          />
        </div>

        <div>
          <label style={estiloLabel}>Estatus</label>
          <select
            name="estatus"
            value={filtros.estatus}
            onChange={onCambiar}
            style={estiloCampo}
          >
            <option value="">Todos</option>
            <option value="REGISTRADO">Registrado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginTop: "16px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onLimpiar}
          disabled={cargando}
          style={{
            padding: "10px 18px",
            background: "#fff",
            color: "#111",
            border: "1px solid #bbb",
            borderRadius: "8px",
            cursor: cargando ? "not-allowed" : "pointer",
            fontWeight: "600",
          }}
        >
          Limpiar filtros
        </button>

        <button
          type="button"
          onClick={onBuscar}
          disabled={cargando}
          style={{
            padding: "10px 22px",
            background: cargando ? "#999" : "#111",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: cargando ? "not-allowed" : "pointer",
            fontWeight: "600",
          }}
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>
      </div>
    </div>
  );
}

export default FiltrosEgresos;