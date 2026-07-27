import React, { useEffect, useState } from "react";
import { obtenerHistorialEgreso } from "../../services/egresosService.js";

function ModalDetalleEgreso({ abierto, egreso, onCerrar }) {
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");

  useEffect(() => {
    if (!abierto || !egreso?.id) {
      setHistorial([]);
      setErrorHistorial("");
      return;
    }

    let componenteActivo = true;

    async function cargarHistorial() {
      setCargandoHistorial(true);
      setErrorHistorial("");

      try {
        const movimientos = await obtenerHistorialEgreso(egreso.id);

        if (componenteActivo) {
          setHistorial(movimientos);
        }
      } catch (error) {
        if (componenteActivo) {
          setHistorial([]);
          setErrorHistorial(
            error.message || "No se pudo cargar el historial."
          );
        }
      } finally {
        if (componenteActivo) {
          setCargandoHistorial(false);
        }
      }
    }

    cargarHistorial();

    return () => {
      componenteActivo = false;
    };
  }, [abierto, egreso?.id]);

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

  const formatearFechaHora = (fecha) => {
    if (!fecha) return "—";

    return new Date(fecha).toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const obtenerIconoAccion = (accion) => {
    switch (accion) {
      case "CREADO":
        return "🟢";
      case "EDITADO":
        return "✏️";
      case "CANCELADO":
        return "🚫";
      case "REACTIVADO":
        return "↩️";
      default:
        return "•";
    }
  };

  const obtenerTextoAccion = (accion) => {
    switch (accion) {
      case "CREADO":
        return "Egreso creado";
      case "EDITADO":
        return "Egreso editado";
      case "CANCELADO":
        return "Egreso cancelado";
      case "REACTIVADO":
        return "Egreso reactivado";
      default:
        return accion || "Movimiento";
    }
  };

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
          width: "min(750px, 100%)",
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
        {fila(
          "Monto MXN",
          `$${Number(egreso.monto_mxn || 0).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        )}
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

        <div
          style={{
            marginTop: 30,
            paddingTop: 22,
            borderTop: "2px solid #eee",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 18 }}>
            Historial
          </h3>

          {cargandoHistorial && (
            <p style={{ margin: 0 }}>Cargando historial...</p>
          )}

          {!cargandoHistorial && errorHistorial && (
            <div
              style={{
                padding: 12,
                background: "#fff4f4",
                border: "1px solid #f0b8b8",
                borderRadius: 8,
              }}
            >
              {errorHistorial}
            </div>
          )}

          {!cargandoHistorial &&
            !errorHistorial &&
            historial.length === 0 && (
              <p style={{ color: "#666" }}>
                Este egreso todavía no tiene movimientos registrados en el
                historial.
              </p>
            )}

          {!cargandoHistorial &&
            !errorHistorial &&
            historial.map((movimiento) => (
              <div
                key={movimiento.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px 1fr",
                  gap: 12,
                  padding: "14px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    textAlign: "center",
                  }}
                >
                  {obtenerIconoAccion(movimiento.accion)}
                </div>

                <div>
                  <strong>
                    {obtenerTextoAccion(movimiento.accion)}
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                      color: "#555",
                      fontSize: 14,
                    }}
                  >
                    {formatearFechaHora(movimiento.fecha)}
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      color: "#666",
                      fontSize: 14,
                    }}
                  >
                    Usuario: {movimiento.usuario || "No identificado"}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default ModalDetalleEgreso;