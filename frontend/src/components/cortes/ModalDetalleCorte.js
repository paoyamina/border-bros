import React, { useEffect, useState } from "react";
import { obtenerHistorialCorte } from "../../services/cortesService.js";

function ModalDetalleCorte({ abierto, corte, onCerrar }) {
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");

  useEffect(() => {
    if (!abierto || !corte?.id) {
      setHistorial([]);
      setErrorHistorial("");
      return;
    }

    let componenteActivo = true;

    async function cargarHistorial() {
      setCargandoHistorial(true);
      setErrorHistorial("");

      try {
        const movimientos = await obtenerHistorialCorte(corte.id);

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
  }, [abierto, corte?.id]);

  if (!abierto || !corte) return null;

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

  const dinero = (valor) =>
  `$${Number(valor || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formatearFechaHora = (fecha) => {
    if (!fecha) return "—";

    return new Date(fecha).toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "medium",
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
        return "corte creado";
      case "EDITADO":
        return "corte editado";
      case "CANCELADO":
        return "corte cancelado";
      case "REACTIVADO":
        return "corte reactivado";
      default:
        return accion || "Movimiento";
    }
  };

  const camposHistorial = {
  fecha: "Fecha",
  tipo_corte: "Tipo",
  divisa: "Divisa",
  tipo_cambio: "Tipo de cambio",
  monto_original: "Monto original",
  monto_mxn: "Monto MXN",
  categoria_id: "Categoría",
  proveedor_id: "Proveedor",
  concepto: "Concepto",
  referencia: "Referencia",
  estatus: "Estatus",
};

const formatearValorHistorial = (campo, valor) => {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  if (campo === "monto_mxn" || campo === "monto_original") {
    return `$${Number(valor).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (campo === "fecha") {
    const fechaFormateada = new Date(valor);

    if (!Number.isNaN(fechaFormateada.getTime())) {
      return fechaFormateada.toLocaleDateString("es-MX");
    }
  }

  return String(valor);
};

const obtenerCambios = (movimiento) => {
  if (
    movimiento.accion !== "EDITADO" ||
    !movimiento.datos_anteriores ||
    !movimiento.datos_nuevos
  ) {
    return [];
  }

  return Object.keys(camposHistorial)
    .filter((campo) => {
      const anterior = movimiento.datos_anteriores[campo];
      const nuevo = movimiento.datos_nuevos[campo];

      return String(anterior ?? "") !== String(nuevo ?? "");
    })
    .map((campo) => ({
      campo,
      titulo: camposHistorial[campo],
      anterior: movimiento.datos_anteriores[campo],
      nuevo: movimiento.datos_nuevos[campo],
    }));
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
          <h2 style={{ margin: 0 }}>Detalle del corte</h2>

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


        {fila("Fecha", corte.fecha)}
        {fila("Folio", corte.folio)}
        {fila("Usuario", corte.usuario_nombre)}

        {fila("Venta tickets", dinero(corte.total_general))}
        {fila("Tarjetas", dinero(corte.total_tarjetas))}
        {fila("Efectivo MXN", dinero(corte.total_efectivo_mxn))}
        {fila("Efectivo USD", dinero(corte.total_efectivo_usd))}

        {fila("Cover efectivo", dinero(corte.cover_efectivo))}
        {fila("Cover TPV", dinero(corte.cover_tpv))}

        {fila("Gastos", dinero(corte.gastos_corte))}
        {fila("Reglamentos", dinero(corte.reglamentos))}
        {fila("Diferencia", dinero(corte.diferencia))}

        

        <div style={{ marginTop: 25 }}>
          {corte.drive_folder_url ? (
            <a
              href={corte.drive_folder_url}
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
                Este corte todavía no tiene movimientos registrados en el
                historial.
              </p>
            )}

          {!cargandoHistorial &&
            !errorHistorial &&
            historial.map((movimiento) => {
  const cambios = obtenerCambios(movimiento);

  return (
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

                    {cambios.length > 0 && (
  <div
    style={{
      marginTop: 12,
      padding: 12,
      background: "#f7f7f7",
      borderRadius: 8,
    }}
  >
    {cambios.map((cambio) => (
      <div
        key={cambio.campo}
        style={{
          padding: "8px 0",
          borderBottom: "1px solid #ddd",
        }}
      >
        <strong>{cambio.titulo}</strong>

        <div
          style={{
            marginTop: 4,
            fontSize: 14,
            color: "#666",
          }}
        >
          <span
            style={{
              textDecoration: "line-through",
            }}
          >
            {formatearValorHistorial(
              cambio.campo,
              cambio.anterior
            )}
          </span>

          <span style={{ margin: "0 8px" }}>→</span>

          <span>
            {formatearValorHistorial(
              cambio.campo,
              cambio.nuevo
            )}
          </span>
        </div>
      </div>
    ))}
  </div>
)}

                </div>
                            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ModalDetalleCorte;