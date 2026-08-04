import React, { useCallback, useEffect, useState } from "react";
import API_BASE_URL from "../config/api";

const formularioInicial = {
  nombre: "",
  tipo_nomina: "Operativa",
  hoja_excel: "PRINCIPAL",
  seccion_nomina: "GENERAL",
  modalidad_pago: "DIARIO",
  tarifa_base: "",
  tarifa_viernes: "300",
  tarifa_sabado: "200",
};

function Puestos({ usuarioActivo, onVolver }) {
  const [puestos, setPuestos] = useState([]);
  const [filtro, setFiltro] = useState("activos");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [puestoEditando, setPuestoEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);

  const cargarPuestos = useCallback(async () => {
    try {
      setCargando(true);

      let url = `${API_BASE_URL}/api/puestos?negocio_id=1`;

      if (filtro === "activos") {
        url += "&activos=true";
      }

      if (filtro === "inactivos") {
        url += "&activos=false";
      }

      const respuesta = await fetch(url);
      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.success) {
        throw new Error(
          resultado.error || "No se pudieron cargar los puestos."
        );
      }

      setPuestos(resultado.puestos || []);
    } catch (error) {
      console.error("Error cargando puestos:", error);
      alert("🚨 Error cargando puestos: " + error.message);
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => {
    cargarPuestos();
  }, [cargarPuestos]);

  const limpiarFormulario = () => {
    setFormulario(formularioInicial);
    setPuestoEditando(null);
    setMostrarFormulario(false);
  };

  const guardarPuesto = async () => {
    if (!formulario.nombre.trim()) {
      alert("⚠️ El nombre del puesto es obligatorio.");
      return;
    }

    try {
      const esEdicion = Boolean(puestoEditando);

      const url = esEdicion
        ? `${API_BASE_URL}/api/puestos/${puestoEditando.id}`
        : `${API_BASE_URL}/api/puestos`;

      const respuesta = await fetch(url, {
        method: esEdicion ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formulario,
          negocio_id: 1,
          tarifa_base: Number(formulario.tarifa_base) || 0,
          tarifa_viernes: Number(formulario.tarifa_viernes) || 300,
          tarifa_sabado: Number(formulario.tarifa_sabado) || 200,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.success) {
        throw new Error(
          resultado.error ||
            `No se pudo ${esEdicion ? "actualizar" : "crear"} el puesto.`
        );
      }

      alert(
        esEdicion
          ? "✅ Puesto actualizado correctamente."
          : "✅ Puesto creado correctamente."
      );

      limpiarFormulario();
      cargarPuestos();
    } catch (error) {
      alert("🚨 Error guardando puesto: " + error.message);
    }
  };

  const editarPuesto = (puesto) => {
    setPuestoEditando(puesto);

    setFormulario({
      nombre: puesto.nombre || "",
      tipo_nomina: puesto.tipo_nomina || "Operativa",
      hoja_excel: puesto.hoja_excel || "PRINCIPAL",
      seccion_nomina: puesto.seccion_nomina || "GENERAL",
      modalidad_pago: puesto.modalidad_pago || "DIARIO",
      tarifa_base: puesto.tarifa_base ?? "",
      tarifa_viernes: puesto.tarifa_viernes ?? "300",
      tarifa_sabado: puesto.tarifa_sabado ?? "200",
    });

    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const desactivarPuesto = async (puesto) => {
    const confirmar = window.confirm(
      `¿Desactivar el puesto "${puesto.nombre}"?`
    );

    if (!confirmar) return;

    try {
      const respuesta = await fetch(
        `${API_BASE_URL}/api/puestos/${puesto.id}/desactivar`,
        {
          method: "PUT",
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.success) {
        throw new Error(
          resultado.error || "No se pudo desactivar el puesto."
        );
      }

      alert("✅ Puesto desactivado.");
      cargarPuestos();
    } catch (error) {
      alert("🚨 " + error.message);
    }
  };

  const reactivarPuesto = async (puesto) => {
    const confirmar = window.confirm(
      `¿Reactivar el puesto "${puesto.nombre}"?`
    );

    if (!confirmar) return;

    try {
      const respuesta = await fetch(
        `${API_BASE_URL}/api/puestos/${puesto.id}/reactivar`,
        {
          method: "PUT",
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.success) {
        throw new Error(
          resultado.error || "No se pudo reactivar el puesto."
        );
      }

      alert("✅ Puesto reactivado.");
      cargarPuestos();
    } catch (error) {
      alert("🚨 " + error.message);
    }
  };

  const puestosFiltrados = puestos.filter((puesto) => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return true;

    return [
      puesto.nombre,
      puesto.tipo_nomina,
      puesto.hoja_excel,
      puesto.seccion_nomina,
      puesto.modalidad_pago,
      puesto.activo ? "activo" : "inactivo",
    ]
      .join(" ")
      .toLowerCase()
      .includes(texto);
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f7f5",
        padding: "28px",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Catálogo de Puestos</h1>

            <p style={{ color: "#666" }}>
              Operador: {usuarioActivo || "Sin usuario"}
            </p>
          </div>

          <button type="button" onClick={onVolver} style={botonSecundario}>
            ← Volver al menú
          </button>
        </div>

        <div style={tarjeta}>
          <button
            type="button"
            onClick={() => {
              if (mostrarFormulario) {
                limpiarFormulario();
              } else {
                setMostrarFormulario(true);
              }
            }}
            style={botonPrincipal}
          >
            {mostrarFormulario ? "Cancelar" : "+ Nuevo puesto"}
          </button>

          {mostrarFormulario && (
            <div
              style={{
                marginTop: "20px",
                paddingTop: "20px",
                borderTop: "1px solid #e5e5e5",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                {puestoEditando ? "Editar puesto" : "Nuevo puesto"}
              </h2>

              <div style={gridFormulario}>
                <div>
                  <label style={etiqueta}>Nombre del puesto</label>
                  <input
                    value={formulario.nombre}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        nombre: e.target.value,
                      })
                    }
                    style={input}
                    placeholder="Ej. Mesero"
                  />
                </div>

                <div>
                  <label style={etiqueta}>Tipo de nómina</label>
                  <select
                    value={formulario.tipo_nomina}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        tipo_nomina: e.target.value,
                      })
                    }
                    style={input}
                  >
                    <option value="Operativa">Operativa</option>
                    <option value="Administrativa">Administrativa</option>
                  </select>
                </div>

                <div>
                  <label style={etiqueta}>Modalidad de cálculo</label>
                  <select
                    value={formulario.modalidad_pago}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        modalidad_pago: e.target.value,
                      })
                    }
                    style={input}
                  >
                    <option value="DIARIO">Diario</option>
                    <option value="SEMANAL">Semanal</option>
                    <option value="POR_MESA">Por mesa</option>
                  </select>
                </div>

                <div>
                  <label style={etiqueta}>Hoja del Excel</label>
                  <select
                    value={formulario.hoja_excel}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        hoja_excel: e.target.value,
                      })
                    }
                    style={input}
                  >
                    <option value="PRINCIPAL">Principal</option>
                    <option value="NOMINA_OP">Nómina Op.</option>
                    <option value="RP">RP</option>
                  </select>
                </div>

                <div>
                  <label style={etiqueta}>Sección de nómina</label>
                  <input
                    value={formulario.seccion_nomina}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        seccion_nomina: e.target.value.toUpperCase(),
                      })
                    }
                    style={input}
                    placeholder="Ej. MESEROS"
                  />
                </div>

                <div>
                  <label style={etiqueta}>Tarifa base sugerida</label>
                  <input
                    type="number"
                    value={formulario.tarifa_base}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        tarifa_base: e.target.value,
                      })
                    }
                    style={input}
                    placeholder="0"
                  />
                </div>

                {formulario.modalidad_pago === "POR_MESA" && (
                  <>
                    <div>
                      <label style={etiqueta}>Tarifa viernes</label>
                      <input
                        type="number"
                        value={formulario.tarifa_viernes}
                        onChange={(e) =>
                          setFormulario({
                            ...formulario,
                            tarifa_viernes: e.target.value,
                          })
                        }
                        style={input}
                      />
                    </div>

                    <div>
                      <label style={etiqueta}>Tarifa sábado</label>
                      <input
                        type="number"
                        value={formulario.tarifa_sabado}
                        onChange={(e) =>
                          setFormulario({
                            ...formulario,
                            tarifa_sabado: e.target.value,
                          })
                        }
                        style={input}
                      />
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={guardarPuesto}
                  style={botonPrincipal}
                >
                  {puestoEditando ? "Actualizar puesto" : "Guardar puesto"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={tarjeta}>
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar puesto, sección, modalidad..."
              style={{ ...input, flex: "1 1 300px" }}
            />

            <button
              type="button"
              onClick={() => setFiltro("activos")}
              style={
                filtro === "activos" ? botonPrincipal : botonSecundario
              }
            >
              Activos
            </button>

            <button
              type="button"
              onClick={() => setFiltro("inactivos")}
              style={
                filtro === "inactivos" ? botonPrincipal : botonSecundario
              }
            >
              Inactivos
            </button>

            <button
              type="button"
              onClick={() => setFiltro("todos")}
              style={filtro === "todos" ? botonPrincipal : botonSecundario}
            >
              Todos
            </button>
          </div>

          {cargando ? (
            <p>Cargando puestos...</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "950px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f5f5f3" }}>
                    <th style={th}>Puesto</th>
                    <th style={th}>Tipo nómina</th>
                    <th style={th}>Modalidad</th>
                    <th style={th}>Hoja</th>
                    <th style={th}>Sección</th>
                    <th style={th}>Tarifa base</th>
                    <th style={th}>Estatus</th>
                    <th style={th}>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {puestosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={td}>
                        No se encontraron puestos.
                      </td>
                    </tr>
                  ) : (
                    puestosFiltrados.map((puesto) => (
                      <tr key={puesto.id}>
                        <td style={{ ...td, fontWeight: "700" }}>
                          {puesto.nombre}
                        </td>
                        <td style={td}>{puesto.tipo_nomina}</td>
                        <td style={td}>{puesto.modalidad_pago}</td>
                        <td style={td}>{puesto.hoja_excel}</td>
                        <td style={td}>{puesto.seccion_nomina}</td>
                        <td style={td}>
                          ${Number(puesto.tarifa_base || 0).toLocaleString(
                            "es-MX",
                            {
                              minimumFractionDigits: 2,
                            }
                          )}
                        </td>
                        <td style={td}>
                          {puesto.activo ? "Activo" : "Inactivo"}
                        </td>
                        <td style={td}>
                          <button
                            type="button"
                            onClick={() => editarPuesto(puesto)}
                            style={botonAccion}
                          >
                            Editar
                          </button>

                          {puesto.activo ? (
                            <button
                              type="button"
                              onClick={() => desactivarPuesto(puesto)}
                              style={{
                                ...botonAccion,
                                marginLeft: "7px",
                              }}
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => reactivarPuesto(puesto)}
                              style={{
                                ...botonAccion,
                                marginLeft: "7px",
                              }}
                            >
                              Reactivar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const tarjeta = {
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: "14px",
  padding: "24px",
  marginBottom: "24px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
};

const gridFormulario = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "14px",
};

const etiqueta = {
  display: "block",
  fontSize: "12px",
  fontWeight: "700",
  color: "#555",
  marginBottom: "6px",
  textTransform: "uppercase",
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "42px",
  padding: "10px 12px",
  border: "1px solid #d7d7d7",
  borderRadius: "8px",
  background: "#fff",
};

const botonPrincipal = {
  padding: "11px 18px",
  background: "#111",
  color: "#fff",
  border: "1px solid #111",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700",
};

const botonSecundario = {
  padding: "11px 18px",
  background: "#fff",
  color: "#111",
  border: "1px solid #111",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "700",
};

const botonAccion = {
  padding: "7px 10px",
  background: "#fff",
  color: "#111",
  border: "1px solid #ccc",
  borderRadius: "6px",
  cursor: "pointer",
};

const th = {
  padding: "12px",
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #eee",
};

export default Puestos;