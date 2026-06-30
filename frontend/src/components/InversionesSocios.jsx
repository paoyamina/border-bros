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
    tipo_movimiento: "Adelanto",
    metodo_pago: "Banco",
    cuenta_origen: "",
    monto: "",
    comentario: "",
  });

  const [comprobante, setComprobante] = useState(null);

  const formatoMoneda = (valor) => {
    return Number(valor || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    });
  };

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
      alert("Error cargando adelantos/devoluciones: " + error.message);
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
      `¿Guardar ${formulario.tipo_movimiento.toLowerCase()} por ${formatoMoneda(
        formulario.monto
      )}?`
    );

    if (!confirmar) return;

    try {
      setGuardando(true);

      const formData = new FormData();

      formData.append("socio_id", formulario.socio_id);
      formData.append("fecha", formulario.fecha);
      formData.append("tipo_movimiento", formulario.tipo_movimiento);
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
        throw new Error(
          resultado.error || "Error al guardar adelanto/devolución."
        );
      }

      alert("✅ Movimiento guardado correctamente.");

      setFormulario({
        socio_id: "",
        fecha: new Date().toISOString().split("T")[0],
        tipo_movimiento: "Adelanto",
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

        <h1>Adelantos Socios</h1>

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
          <h3>Nuevo movimiento</h3>

          <p
            style={{
              marginTop: "-5px",
              marginBottom: "18px",
              color: "#666",
              fontSize: "14px",
            }}
          >
            Registra adelantos entregados a socios o devoluciones realizadas por
            ellos.
          </p>

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
              value={formulario.tipo_movimiento}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  tipo_movimiento: e.target.value,
                })
              }
              style={estilos.input}
            >
              <option value="Adelanto">Adelanto</option>
              <option value="Devolución">Devolución</option>
            </select>

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
            {guardando ? "Guardando..." : "Guardar movimiento"}
          </button>
        </div>

        <h3>Historial de adelantos y devoluciones</h3>

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
                <th>Fecha</th>
                <th>Socio</th>
                <th>Tipo</th>
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
                  <td colSpan="10" style={{ textAlign: "center" }}>
                    No hay adelantos ni devoluciones registradas.
                  </td>
                </tr>
              ) : (
                inversiones.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.id}</td>
                    <td>{inv.fecha?.split("T")[0]}</td>
                    <td>{inv.socio}</td>
                    <td>
                      <span
                        style={{
                          padding: "4px 9px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background:
                            inv.tipo_movimiento === "Devolución"
                              ? "#f2fff4"
                              : "#fff7ed",
                          color:
                            inv.tipo_movimiento === "Devolución"
                              ? "#166534"
                              : "#9a3412",
                          border:
                            inv.tipo_movimiento === "Devolución"
                              ? "1px solid #bbf7d0"
                              : "1px solid #fed7aa",
                        }}
                      >
                        {inv.tipo_movimiento || "Adelanto"}
                      </span>
                    </td>
                    <td>{inv.metodo_pago}</td>
                    <td>{inv.cuenta_origen || "-"}</td>
                    <td>{formatoMoneda(inv.monto)}</td>
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
    </div>
  );
}

export default InversionesSocios;