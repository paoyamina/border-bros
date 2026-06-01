import React, { useEffect, useState } from "react";
import estilos from "../styles/estilos";

function HistorialNomina({ usuarioActivo, onVolver }) {
  const [prenominas, setPrenominas] = useState([]);

  const cargarHistorial = async () => {
    const respuesta = await fetch("API_BASE_URL/api/prenomina");
    const resultado = await respuesta.json();

    if (resultado.success) {
      setPrenominas(resultado.prenominas);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  return (
    <div style={estilos.container}>
      <div style={{ ...estilos.card, maxWidth: "1000px" }}>
        <button onClick={onVolver}>← Volver</button>

        <h1>Historial de Nómina</h1>
        <p>Operador: {usuarioActivo}</p>

        <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha creación</th>
              <th>Total</th>
              <th>Estatus</th>
              <th>Creó</th>
              <th>Aprobó/Rechazó</th>
              <th>Fecha aprobación</th>
            </tr>
          </thead>

          <tbody>
            {prenominas.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.fecha_creacion?.split("T")[0]}</td>
                <td>${Number(p.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                <td>{p.estatus}</td>
                <td>{p.usuario_crea || "—"}</td>
                <td>{p.usuario_aprueba || "—"}</td>
                <td>{p.fecha_aprobacion?.split("T")[0] || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HistorialNomina;