import React, { useEffect, useState } from "react";
import estilos from "../styles/estilos";
import API_BASE_URL from "../config/api";

function AprobacionesNomina({ usuarioActivo, usuarioId, onVolver }) {
  const [prenominas, setPrenominas] = useState([]);
  const [detalleAbierto, setDetalleAbierto] = useState(null);
const [detallesPrenomina, setDetallesPrenomina] = useState({});

  const cargarPendientes = async () => {
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/prenomina/pendientes`);
      const resultado = await respuesta.json();

      if (resultado.success) {
        setPrenominas(resultado.prenominas);
      }
    } catch (error) {
      alert("Error cargando prenóminas: " + error.message);
    }
  };

  const toggleDetalle = async (prenominaId) => {
  if (detalleAbierto === prenominaId) {
    setDetalleAbierto(null);
    return;
  }

  try {
    const respuesta = await fetch(
      `${API_BASE_URL}/api/prenomina/${prenominaId}/detalle`
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(resultado.error || "Error al cargar detalle.");
    }

    setDetallesPrenomina({
      ...detallesPrenomina,
      [prenominaId]: resultado,
    });

    setDetalleAbierto(prenominaId);
  } catch (error) {
    alert("🚨 Error cargando detalle: " + error.message);
  }
};

  const aprobarPrenomina = async (prenomina) => {

  const confirmar = window.confirm(
    `¿Aprobar prenómina #${prenomina.id}?`
  );

  if (!confirmar) return;

  try {

    const respuesta = await fetch(
      `${API_BASE_URL}/api/prenomina/${prenomina.id}/aprobar`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario_aprueba_id: usuarioId,
          comentario: "Prenómina aprobada desde BOSSE",
        }),
      }
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(resultado.error || "Error al aprobar.");
    }

    alert("✅ Prenómina aprobada.");

    cargarPendientes();

  } catch (error) {

    alert("🚨 Error: " + error.message);
  }
};

const rechazarPrenomina = async (prenomina) => {

  const comentario = prompt(
    `Motivo de rechazo para prenómina #${prenomina.id}:`
  );

  if (comentario === null) return;

  try {

    const respuesta = await fetch(
      `${API_BASE_URL}/api/prenomina/${prenomina.id}/rechazar`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario_aprueba_id: usuarioId,
          comentario,
        }),
      }
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(resultado.error || "Error al rechazar.");
    }

    alert("✅ Prenómina rechazada.");

    cargarPendientes();

  } catch (error) {

    alert("🚨 Error: " + error.message);
  }
};

  useEffect(() => {
    cargarPendientes();
  }, []);

  return (
  <div style={estilos.container}>
    <div style={{ ...estilos.card, maxWidth: "900px" }}>
      <button onClick={onVolver}>← Volver</button>

      <h1>Aprobaciones de Nómina</h1>
      <p>Operador: {usuarioActivo}</p>

      {prenominas.length === 0 ? (
        <p>No hay prenóminas pendientes.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th></th>
              <th>ID</th>
              <th>Fecha creación</th>
              <th>Creador</th>
              <th>Total</th>
              <th>Estatus</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {prenominas.map((p) => (
              <React.Fragment key={p.id}>
                <tr>
                  <td>
                    <button onClick={() => toggleDetalle(p.id)}>
                      {detalleAbierto === p.id ? "−" : "+"}
                    </button>
                  </td>

                  <td>{p.id}</td>
                  <td>{p.fecha_creacion?.split("T")[0]}</td>
                  <td>{p.usuario_crea || "Sin usuario"}</td>
                  <td>
                    ${Number(p.total || 0).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td>{p.estatus}</td>
                  <td>
                    <button
                      onClick={() => aprobarPrenomina(p)}
                      style={{ marginRight: "8px" }}
                    >
                      Aprobar
                    </button>

                    <button onClick={() => rechazarPrenomina(p)}>
                      Rechazar
                    </button>
                  </td>
                </tr>

                {detalleAbierto === p.id && (
                  <tr>
                    <td colSpan="7">
                      <div style={{ background: "#f9f9f9", padding: "15px", borderRadius: "8px" }}>
                        <h4>Detalle de prenómina</h4>

                        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th>Empleado</th>
                              <th>Días</th>
                              <th>Costo</th>
                              <th>Prima</th>
                              <th>Descuento</th>
                              <th>Total</th>
                            </tr>
                          </thead>

                          <tbody>
                            {(detallesPrenomina[p.id]?.detalle || []).map((d, index) => (
                              <tr key={index}>
                                <td>{d.empleado}</td>
                                <td>{d.dias}</td>
                                <td>${Number(d.costo_unitario || 0).toLocaleString()}</td>
                                <td>${Number(d.prima || 0).toLocaleString()}</td>
                                <td>${Number(d.descuento || 0).toLocaleString()}</td>
                                <td>${Number(d.total || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {detallesPrenomina[p.id]?.prenomina?.comentarios_extraordinarios && (
                          <div style={{ marginTop: "15px" }}>
                            <strong>Comentarios extraordinarios:</strong>
                            <div style={{ marginTop: "5px", padding: "10px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px" }}>
                              {detallesPrenomina[p.id].prenomina.comentarios_extraordinarios}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);
}

export default AprobacionesNomina;