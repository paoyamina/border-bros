import React, { useEffect, useState } from "react";
import estilos from "../styles/estilos";
import API_BASE_URL from "../config/api";

function InversionesSocios({ usuarioActivo, usuarioId, onVolver }) {
  const [socios, setSocios] = useState([]);
  const [inversiones, setInversiones] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const [formulario, setFormulario] = useState({
    socio_id: "",
    fecha: new Date().toISOString().split("T")[0],
    metodo_pago: "Banco",
    cuenta_origen: "",
    monto: "",
    comentario: "",
  });

  const [comprobante, setComprobante] = useState(null);

  const cargarSocios = async () => {
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/socios`);
      const resultado = await respuesta.json();

      if (resultado.success) {
        setSocios(resultado.socios);
      }
    } catch (error) {
      alert("Error cargando socios: " + error.message);
    }
  };

  const cargarInversiones = async () => {
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/inversiones-socios`);
      const resultado = await respuesta.json();

      if (resultado.success) {
        setInversiones(resultado.inversiones);
      }
    } catch (error) {
      alert("Error cargando inversiones: " + error.message);
    }
  };

  useEffect(() => {
    cargarSocios();
    cargarInversiones();
  }, []);

  const guardarInversion = async () => {
    if (!formulario.socio_id) {
      alert("⚠️ Selecciona un socio.");
      return;
    }

    if (!formulario.fecha) {
      alert("⚠️ La fecha es obligatoria.");
      return;
    }

    if (!formulario.monto || Number(formulario.monto) <= 0) {
      alert("⚠️ El monto debe ser mayor a cero.");
      return;
    }

    const confirmar = window.confirm(
      `¿Guardar inversión por $${Number(formulario.monto).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
      })}?`
    );

    if (!confirmar) return;

    try {
      setGuardando(true);

      const formData = new FormData();

      formData.append("socio_id", formulario.socio_id);
      formData.append("fecha", formulario.fecha);
      formData.append("metodo_pago", formulario.metodo_pago);
      formData.append("cuenta_origen", formulario.cuenta_origen);
      formData.append("monto", formulario.monto);
      formData.append("comentario", formulario.comentario);
      formData.append("usuario_crea_id", usuarioId || "");

      if (comprobante) {
        formData.append("comprobante", comprobante);
      }

      const respuesta = await fetch(`${API_BASE_URL}/api/inversiones-socios`, {
        method: "POST",
        body: formData,
      });

      const resultado = await respuesta.json();

      if (!resultado.success) {
        throw new Error(resultado.error || "Error al guardar inversión.");
      }

      alert("✅ Inversión guardada correctamente.");

      setFormulario({
        socio_id: "",
        fecha: new Date().toISOString().split("T")[0],
        metodo_pago: "Banco",
        cuenta_origen: "",
        monto: "",
        comentario: "",
      });

      setComprobante(null);

      const inputArchivo = document.getElementById("comprobante-inversion");
      if (inputArchivo) inputArchivo.value = "";

      cargarInversiones();
    } catch (error) {
      alert("🚨 Error: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={estilos.container}>
      <div style={{ ...estilos.card, maxWidth: "1100px", width: "95%" }}>
        <button onClick={onVolver}>← Volver</button>

        <h1>Inversiones de Socios</h1>

        <p>Operador: {usuarioActivo}</p>

        <div
          style={{
            border: "1px solid #ddd",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "25px",
            background: "#fafafa",
          }}
        >
          <h3>Nueva inversión</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <select
              value={formulario.socio_id}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  socio_id: e.target.value,
                })
              }
              style={estilos.input}
            >
              <option value="">Seleccionar socio</option>

              {socios.map((socio) => (
                <option key={socio.id} value={socio.id}>
                  {socio.nombre}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={formulario.fecha}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  fecha: e.target.value,
                })
              }
              style={estilos.input}
            />

            <select
              value={formulario.metodo_pago}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  metodo_pago: e.target.value,
                })
              }
              style={estilos.input}
            >
              <option value="Banco">Banco</option>
              <option value="Efectivo">Efectivo</option>
            </select>

            <input
              placeholder="Cuenta origen / referencia"
              value={formulario.cuenta_origen}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  cuenta_origen: e.target.value,
                })
              }
              style={estilos.input}
            />

            <input
              type="number"
              placeholder="Monto"
              value={formulario.monto}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  monto: e.target.value,
                })
              }
              style={estilos.input}
            />

            <input
              id="comprobante-inversion"
              type="file"
              accept="image/*,.pdf,.xlsx,.xls"
              onChange={(e) => setComprobante(e.target.files[0])}
              style={estilos.input}
            />
          </div>

          <textarea
            placeholder="Comentario"
            value={formulario.comentario}
            onChange={(e) =>
              setFormulario({
                ...formulario,
                comentario: e.target.value,
              })
            }
            style={{
              ...estilos.input,
              width: "100%",
              minHeight: "80px",
              marginTop: "12px",
              resize: "vertical",
            }}
          />

          <button
            onClick={guardarInversion}
            disabled={guardando}
            style={{
              marginTop: "15px",
              padding: "12px 25px",
              background: guardando ? "#999" : "#000",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: guardando ? "not-allowed" : "pointer",
            }}
          >
            {guardando ? "Guardando..." : "Guardar inversión"}
          </button>
        </div>

        <h3>Historial de inversiones</h3>

        <table
          border="1"
          cellPadding="8"
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Socio</th>
              <th>Método</th>
              <th>Cuenta / Ref.</th>
              <th>Monto</th>
              <th>Comentario</th>
              <th>Comprobante</th>
              <th>Capturó</th>
            </tr>
          </thead>

          <tbody>
            {inversiones.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center" }}>
                  No hay inversiones registradas.
                </td>
              </tr>
            ) : (
              inversiones.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.id}</td>
                  <td>{inv.fecha?.split("T")[0]}</td>
                  <td>{inv.socio}</td>
                  <td>{inv.metodo_pago}</td>
                  <td>{inv.cuenta_origen || "-"}</td>
                  <td>
                    ${Number(inv.monto || 0).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td>{inv.comentario || "-"}</td>
                  <td>
                    {inv.comprobante_url ? (
                      <a
                        href={inv.comprobante_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver archivo
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{inv.usuario_crea || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InversionesSocios;