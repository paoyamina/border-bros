import React, { useEffect, useState } from "react";
import estilos from "../styles/estilos";
import API_BASE_URL from "../config/api";

function HistorialNomina({ usuarioActivo, onVolver }) {
  const [prenominas, setPrenominas] = useState([]);
  const [detalleAbierto, setDetalleAbierto] = useState(null);
  const [detallesPrenomina, setDetallesPrenomina] = useState({});
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const formatoMoneda = (valor) => {
    return Number(valor || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    });
  };

  const formatoFecha = (fecha) => {
    if (!fecha) return "—";

    return new Date(fecha).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const cargarHistorial = async () => {
    const respuesta = await fetch(`${API_BASE_URL}/api/prenomina`);
    const resultado = await respuesta.json();

    if (resultado.success) {
      setPrenominas(resultado.prenominas);
    }
  };

  const toggleDetalle = async (prenominaId) => {
    if (detalleAbierto === prenominaId) {
      setDetalleAbierto(null);
      return;
    }

    setDetalleAbierto(prenominaId);

    if (detallesPrenomina[prenominaId]) {
      return;
    }

    try {
      setCargandoDetalle(true);

      const respuesta = await fetch(
        `${API_BASE_URL}/api/prenomina/${prenominaId}/detalle`
      );

      const resultado = await respuesta.json();

      if (!resultado.success) {
        throw new Error(resultado.error || "Error cargando desglose.");
      }

      setDetallesPrenomina((prev) => ({
        ...prev,
        [prenominaId]: resultado,
      }));
    } catch (error) {
      alert("🚨 Error cargando desglose de nómina: " + error.message);
    } finally {
      setCargandoDetalle(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  return (
    <div style={estilos.container}>
      <div style={{ ...estilos.card, maxWidth: "1200px", width: "95%" }}>
        <button onClick={onVolver}>← Volver</button>

        <h1>Historial de Nómina</h1>
        <p>Operador: {usuarioActivo}</p>

        <div style={{ overflowX: "auto" }}>
          <table
            border="1"
            cellPadding="8"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "1000px",
            }}
          >
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha creación</th>
                <th>Total</th>
                <th>Estatus</th>
                <th>Creó</th>
                <th>Aprobó/Rechazó</th>
                <th>Fecha aprobación</th>
                <th>Desglose</th>
              </tr>
            </thead>

            <tbody>
              {prenominas.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center" }}>
                    Sin registros de nómina.
                  </td>
                </tr>
              ) : (
                prenominas.map((p) => (
                  <React.Fragment key={p.id}>
                    <tr>
                      <td>{p.id}</td>
                      <td>{formatoFecha(p.fecha_creacion)}</td>
                      <td>{formatoMoneda(p.total)}</td>
                      <td>{p.estatus}</td>
                      <td>{p.usuario_crea || "—"}</td>
                      <td>{p.usuario_aprueba || "—"}</td>
                      <td>{formatoFecha(p.fecha_aprobacion)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleDetalle(p.id)}
                          style={{
                            padding: "7px 12px",
                            background:
                              detalleAbierto === p.id ? "#fff" : "#111",
                            color: detalleAbierto === p.id ? "#111" : "#fff",
                            border: "1px solid #111",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          {detalleAbierto === p.id
                            ? "Ocultar"
                            : "Ver desglose"}
                        </button>
                      </td>
                    </tr>

                    {detalleAbierto === p.id && (
                      <tr>
                        <td colSpan="8">
                          {cargandoDetalle && !detallesPrenomina[p.id] ? (
                            <p>Cargando desglose...</p>
                          ) : (
                            <div
                              style={{
                                padding: "18px",
                                background: "#FAFAF9",
                                borderRadius: "12px",
                              }}
                            >
                              <h3 style={{ marginTop: 0 }}>
                                Desglose nómina #{p.id}
                              </h3>

                              <p style={{ color: "#777" }}>
                                Total: {formatoMoneda(p.total)}
                              </p>

                              <div style={{ overflowX: "auto" }}>
                                <table
                                  border="1"
                                  cellPadding="8"
                                  style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    minWidth: "1000px",
                                    background: "#fff",
                                  }}
                                >
                                  <thead>
                                    <tr>
                                      <th>Empleado</th>
                                      <th>Puesto</th>
                                      <th>Tipo nómina</th>
                                      <th>Método pago</th>
                                      <th>Comentario pago</th>
                                      <th>Días</th>
                                      <th>Costo unitario</th>
                                      <th>Prima</th>
                                      <th>Descuento</th>
                                      <th>Total</th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {(
                                      detallesPrenomina[p.id]?.detalle || []
                                    ).length === 0 ? (
                                      <tr>
                                        <td
                                          colSpan="10"
                                          style={{ textAlign: "center" }}
                                        >
                                          Sin detalle de empleados.
                                        </td>
                                      </tr>
                                    ) : (
                                      detallesPrenomina[p.id].detalle.map(
                                        (item) => (
                                          <tr key={item.id}>
                                            <td>
                                              {item.empleado || "Sin empleado"}
                                            </td>
                                            <td>{item.puesto || "—"}</td>
                                            <td>{item.tipo_nomina || "—"}</td>
                                            <td>
                                              {item.metodo_pago_nomina || "—"}
                                            </td>
                                            <td>
                                              {item.comentario_pago || "—"}
                                            </td>
                                            <td>{item.dias}</td>
                                            <td>
                                              {formatoMoneda(
                                                item.costo_unitario
                                              )}
                                            </td>
                                            <td>
                                              {formatoMoneda(item.prima)}
                                            </td>
                                            <td>
                                              {formatoMoneda(item.descuento)}
                                            </td>
                                            <td>
                                              {formatoMoneda(item.total)}
                                            </td>
                                          </tr>
                                        )
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default HistorialNomina;