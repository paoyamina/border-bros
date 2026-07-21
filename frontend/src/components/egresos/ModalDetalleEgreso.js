import React from "react";

function ModalDetalleEgreso({ abierto, egreso, onCerrar }) {
  if (!abierto || !egreso) return null;

  const fila = (titulo, valor) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "170px 1fr",
        gap: "10px",
        padding: "10px 0",
        borderBottom: "1px solid #eee",
      }}
    >
      <strong>{titulo}</strong>
      <span>{valor || "—"}</span>
    </div>
  );

  return (
    <div
      onClick={onCerrar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(750px,100%)",
          maxHeight: "85vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 12,
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0 }}>Detalle del egreso</h2>

          <button
            onClick={onCerrar}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 24,
            }}
          >
            ×
          </button>
        </div>

        {fila("Fecha", egreso.fecha)}
        {fila("Tipo", egreso.tipo_egreso)}
        {fila("Proveedor", egreso.proveedor)}
        {fila("Categoría", egreso.categoria)}
        {fila("Concepto", egreso.concepto)}
        {fila("Referencia", egreso.referencia)}
        {fila("Monto MXN", `$${Number(egreso.monto_mxn).toLocaleString("es-MX")}`)}
        {fila("Usuario", egreso.usuario_crea)}
        {fila("Estatus", egreso.estatus)}

        <div style={{ marginTop: 25 }}>
          {egreso.drive_folder_url ? (
            <a
              href={egreso.drive_folder_url}
              target="_blank"
              rel="noreferrer"
            >
              📂 Abrir carpeta de Drive
            </a>
          ) : (
            <span>No existe carpeta en Drive.</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModalDetalleEgreso;