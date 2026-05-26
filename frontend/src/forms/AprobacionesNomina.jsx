import React, { useEffect, useState } from "react";
import estilos from "../styles/estilos";

function AprobacionesNomina({ usuarioActivo, usuarioId, onVolver }) {
  const [prenominas, setPrenominas] = useState([]);

  const cargarPendientes = async () => {
    try {
      const respuesta = await fetch("http://127.0.0.1:5000/api/prenomina/pendientes");
      const resultado = await respuesta.json();

      if (resultado.success) {
        setPrenominas(resultado.prenominas);
      }
    } catch (error) {
      alert("Error cargando prenóminas: " + error.message);
    }
  };

  const aprobarPrenomina = async (prenomina) => {

  const confirmar = window.confirm(
    `¿Aprobar prenómina #${prenomina.id}?`
  );

  if (!confirmar) return;

  try {

    const respuesta = await fetch(
      `http://127.0.0.1:5000/api/prenomina/${prenomina.id}/aprobar`,
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
      `http://127.0.0.1:5000/api/prenomina/${prenomina.id}/rechazar`,
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
        <button onClick={onVolver}>
          ← Volver
        </button>

        <h1>Aprobaciones de Nómina</h1>
        <p>Operador: {usuarioActivo}</p>

        {prenominas.length === 0 ? (
          <p>No hay prenóminas pendientes.</p>
        ) : (
          <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
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
                <tr key={p.id}>
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

  <button
    onClick={() => rechazarPrenomina(p)}
  >
    Rechazar
  </button>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AprobacionesNomina;