import React, { useEffect, useState } from "react";
import estilos from "../styles/estilos";
import API_BASE_URL from "../config/api";
import { validarNomina } from "../utils/validaciones";

const estiloInputTabla = {
  width: "100%",
  border: "none",
  padding: "8px",
  outline: "none",
  fontSize: "13px",
};

const estiloInputMesa = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "38px",
  padding: "8px 10px",
  border: "1px solid #d7d7d7",
  borderRadius: "6px",
  background: "#fff",
  fontSize: "12px",
};

const thBosse = {
  padding: "12px",
  fontSize: "10px",
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: "1px",
  fontWeight: "600",
};

function Nomina({ usuarioActivo, usuarioId, onVolver }) {
  const crearFilaVacia = (id = Date.now()) => ({
  id,
  empleado_id: "",
  nombre: "",
  puesto: "",
  puesto_id: "",
  ingreso: "",
  cuenta: "",

  tipo_nomina: "Operativa",
  metodo_pago_nomina: "Efectivo",

  modalidad_pago: "DIARIO",
  hoja_excel: "PRINCIPAL",
  seccion_nomina: "GENERAL",

  cantidad: 0,
  tarifa: 0,
  prima: 0,
  descuento: 0,
  total: 0,

  comentario_pago: "",
  mesas: [],
});

const [filas, setFilas] = useState([
  crearFilaVacia(1),
]);

  const [statusNomina, setStatusNomina] = useState("CAPTURA");
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState([]);
  const [comentariosExtraordinarios, setComentariosExtraordinarios] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
const [fechaFin, setFechaFin] = useState("");
  useEffect(() => {
  const cargarEmpleados = async () => {
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/empleados?activos=true`);
      const resultado = await respuesta.json();

      if (resultado.success) {
        setEmpleadosDisponibles(resultado.empleados);

        const filasIniciales = resultado.empleados.map((emp) => ({
  ...crearFilaVacia(emp.id),

  id: emp.id,
  empleado_id: emp.id,
  nombre: emp.nombre || "",

  puesto_id: emp.puesto_id || "",
  puesto:
    emp.puesto_nombre ||
    emp.puesto_catalogo ||
    emp.puesto ||
    "",

  ingreso: emp.fecha_ingreso || "",
  cuenta: emp.cuenta_bancaria || "",

  tipo_nomina:
    emp.tipo_nomina_puesto ||
    emp.tipo_nomina ||
    "Operativa",

  metodo_pago_nomina:
    emp.metodo_pago_nomina ||
    "Efectivo",

  modalidad_pago:
    emp.modalidad_pago ||
    "DIARIO",

  hoja_excel:
    emp.hoja_excel ||
    "PRINCIPAL",

  seccion_nomina:
    emp.seccion_nomina ||
    "GENERAL",

  cantidad: 0,

  tarifa:
    Number(emp.sueldo_diario) ||
    Number(emp.sueldo_base) ||
    0,

  prima: 0,
  descuento: 0,
  total: 0,
  comentario_pago: "",
  mesas: [],
}));

        setFilas(filasIniciales);
      }
    } catch (error) {
      console.error("Error cargando empleados:", error);
    }
  };

  cargarEmpleados();
}, []);

  const calcularTotalFila = (fila) => {
  const prima = Number(fila.prima) || 0;
  const descuento = Number(fila.descuento) || 0;

  if (fila.modalidad_pago === "POR_MESA") {
    const subtotalMesas = (fila.mesas || []).reduce(
      (acumulado, mesa) =>
        acumulado +
        (Number(mesa.cantidad_mesas) || 0) *
          (Number(mesa.tarifa_mesa) || 0),
      0
    );

    return subtotalMesas + prima - descuento;
  }

  const cantidad = Number(fila.cantidad) || 0;
  const tarifa = Number(fila.tarifa) || 0;

  return cantidad * tarifa + prima - descuento;
};

const manejarCambioFila = (id, campo, valor) => {
  setFilas((filasActuales) =>
    filasActuales.map((fila) => {
      if (fila.id !== id) return fila;

      const filaActualizada = {
        ...fila,
        [campo]: valor,
      };

      return {
        ...filaActualizada,
        total: calcularTotalFila(filaActualizada),
      };
    })
  );
};

const obtenerTarifaMesaSugerida = (fecha) => {
  if (!fecha) return 0;

  const fechaLocal = new Date(`${fecha}T12:00:00`);
  const diaSemana = fechaLocal.getDay();

  // Viernes
  if (diaSemana === 5) return 300;

  // Sábado
  if (diaSemana === 6) return 200;

  return 0;
};

const crearMesasIniciales = () => {
  const fechas = [];

  if (fechaInicio) {
    fechas.push(fechaInicio);
  }

  if (fechaFin && fechaFin !== fechaInicio) {
    fechas.push(fechaFin);
  }

  return fechas.map((fecha) => ({
    id: `${Date.now()}-${fecha}`,
    fecha,
    cantidad_mesas: 0,
    tarifa_mesa: obtenerTarifaMesaSugerida(fecha),
  }));
};

const seleccionarEmpleado = (filaId, empleadoId) => {
  const empleado = empleadosDisponibles.find(
    (item) => item.id === Number(empleadoId)
  );

  if (!empleado) return;

  setFilas((filasActuales) =>
    filasActuales.map((fila) => {
      if (fila.id !== filaId) return fila;

      const modalidad =
        empleado.modalidad_pago || "DIARIO";

      const tarifaEmpleado =
        modalidad === "SEMANAL"
          ? Number(empleado.sueldo_base) ||
            Number(empleado.sueldo_diario) ||
            0
          : Number(empleado.sueldo_diario) ||
            Number(empleado.sueldo_base) ||
            0;

      const filaActualizada = {
        ...fila,
        empleado_id: empleado.id,
        nombre: empleado.nombre || "",

        puesto_id: empleado.puesto_id || "",
        puesto:
          empleado.puesto_nombre ||
          empleado.puesto_catalogo ||
          empleado.puesto ||
          "",

        ingreso: empleado.fecha_ingreso || "",
        cuenta: empleado.cuenta_bancaria || "",

        tipo_nomina:
          empleado.tipo_nomina_puesto ||
          empleado.tipo_nomina ||
          "Operativa",

        metodo_pago_nomina:
          empleado.metodo_pago_nomina ||
          "Efectivo",

        modalidad_pago: modalidad,

        hoja_excel:
          empleado.hoja_excel ||
          "PRINCIPAL",

        seccion_nomina:
          empleado.seccion_nomina ||
          "GENERAL",

        tarifa: tarifaEmpleado,

        mesas:
          modalidad === "POR_MESA"
            ? crearMesasIniciales()
            : [],
      };

      return {
        ...filaActualizada,
        total: calcularTotalFila(filaActualizada),
      };
    })
  );
};

const agregarMesa = (filaId) => {
  setFilas((filasActuales) =>
    filasActuales.map((fila) => {
      if (fila.id !== filaId) return fila;

      const filaActualizada = {
        ...fila,
        mesas: [
          ...(fila.mesas || []),
          {
            id: Date.now(),
            fecha: "",
            cantidad_mesas: 0,
            tarifa_mesa: 0,
          },
        ],
      };

      return {
        ...filaActualizada,
        total: calcularTotalFila(filaActualizada),
      };
    })
  );
};

const cambiarMesa = (
  filaId,
  mesaId,
  campo,
  valor
) => {
  setFilas((filasActuales) =>
    filasActuales.map((fila) => {
      if (fila.id !== filaId) return fila;

      const mesasActualizadas = (fila.mesas || []).map(
        (mesa) => {
          if (mesa.id !== mesaId) return mesa;

          const mesaActualizada = {
            ...mesa,
            [campo]: valor,
          };

          if (
            campo === "fecha" &&
            !Number(mesa.tarifa_mesa)
          ) {
            mesaActualizada.tarifa_mesa =
              obtenerTarifaMesaSugerida(valor);
          }

          return mesaActualizada;
        }
      );

      const filaActualizada = {
        ...fila,
        mesas: mesasActualizadas,
      };

      return {
        ...filaActualizada,
        total: calcularTotalFila(filaActualizada),
      };
    })
  );
};

const eliminarMesa = (filaId, mesaId) => {
  setFilas((filasActuales) =>
    filasActuales.map((fila) => {
      if (fila.id !== filaId) return fila;

      const filaActualizada = {
        ...fila,
        mesas: (fila.mesas || []).filter(
          (mesa) => mesa.id !== mesaId
        ),
      };

      return {
        ...filaActualizada,
        total: calcularTotalFila(filaActualizada),
      };
    })
  );
};

  const nombresOcupados = filas
    .map((f) => f.nombre.trim().toLowerCase())
    .filter((n) => n !== "");

  const hayDuplicados = nombresOcupados.some(
    (nombre, index) => nombresOcupados.indexOf(nombre) !== index
  );

  const totalGlobal = filas.reduce(
  (acumulado, fila) =>
    acumulado + (Number(fila.total) || 0),
  0
);

  const enviarNominaADrive = async () => {
    if (!fechaInicio || !fechaFin) {
  alert("⚠️ Debes seleccionar la fecha inicial y final de la nómina.");
  return;
}

if (fechaInicio > fechaFin) {
  alert("⚠️ La fecha inicial no puede ser posterior a la fecha final.");
  return;
}
    const errorValidacion = validarNomina(filas);

    if (errorValidacion) {
      alert(`⚠️ ${errorValidacion}`);
      return;
    }

const confirmar = window.confirm(`
¿DESEAS ENVIAR ESTA PRE-NÓMINA A APROBACIÓN?

Empleados: ${filas.filter((fila) => Number(fila.total) !== 0).length}
Total: $${totalGlobal.toLocaleString("es-MX", {
  minimumFractionDigits: 2,
})}

Al aceptar, la prenómina quedará pendiente de aprobación.
`);

    if (!confirmar) return;

    try {
const detallePrenomina = filas
  .filter((fila) => fila.empleado_id)
  .map((fila) => ({
    empleado_id: fila.empleado_id,

    dias:
      fila.modalidad_pago === "DIARIO"
        ? Number(fila.cantidad) || 0
        : fila.modalidad_pago === "SEMANAL"
        ? Number(fila.cantidad) || 0
        : 0,

    costo_unitario:
      Number(fila.tarifa) || 0,

    prima:
      Number(fila.prima) || 0,

    descuento:
      Number(fila.descuento) || 0,

    total:
      Number(fila.total) || 0,

    tipo_nomina:
      fila.tipo_nomina || "Operativa",

    metodo_pago_nomina:
      fila.metodo_pago_nomina || "Efectivo",

    comentario_pago:
      fila.comentario_pago || null,

    nota: null,

    mesas:
      fila.modalidad_pago === "POR_MESA"
        ? fila.mesas || []
        : [],
  }));

const respuestaPrenomina = await fetch(`${API_BASE_URL}/api/prenomina`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    fecha_inicio: fechaInicio,
fecha_fin: fechaFin,
    total: totalGlobal,
    usuario_crea_id: usuarioId,
    comentarios_extraordinarios: comentariosExtraordinarios,
    comentarios: "Prenómina enviada a aprobación desde módulo BOSSE",
    detalle: detallePrenomina,
  }),
});

const resultadoPrenomina = await respuestaPrenomina.json();

if (!resultadoPrenomina.success) {
  throw new Error(
    resultadoPrenomina.error || "Error al guardar prenómina en base de datos."
  );
}

setStatusNomina("PENDIENTE");

alert("✅ Prenómina enviada a aprobación correctamente.");
onVolver();
    } catch (error) {
      console.error("Error en nómina:", error);
      alert("🚨 Error al guardar nómina: " + error.message);
    }
  };

  return (
    <div style={estilos.container}>
      <div style={{ ...estilos.card, maxWidth: "1100px", width: "95%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "30px",
          }}
        >
          <button
            onClick={onVolver}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: "12px",
              textTransform: "uppercase",
            }}
          >
            ← Volver
          </button>

          <div style={{ textAlign: "right" }}>
            <h1 style={{ ...estilos.h1, margin: 0 }}>Pre-Nómina</h1>
            <p style={{ ...estilos.p, margin: 0 }}>Gestión Semanal de Staff</p>
            <p style={{ ...estilos.p, marginTop: "6px" }}>
              Estado: {statusNomina}
            </p>
          </div>
        </div>
            
            <div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "14px",
    padding: "18px",
    marginBottom: "22px",
    background: "#fafafa",
    border: "1px solid #e5e5e5",
    borderRadius: "10px",
  }}
>
  <div>
    <label style={estilos.panelLabel}>
      Fecha inicial
    </label>

    <input
      type="date"
      value={fechaInicio}
      onChange={(e) => setFechaInicio(e.target.value)}
      style={{
        ...estilos.input,
        width: "100%",
        boxSizing: "border-box",
        marginTop: "7px",
      }}
    />
  </div>

  <div>
    <label style={estilos.panelLabel}>
      Fecha final
    </label>

    <input
      type="date"
      value={fechaFin}
      onChange={(e) => setFechaFin(e.target.value)}
      style={{
        ...estilos.input,
        width: "100%",
        boxSizing: "border-box",
        marginTop: "7px",
      }}
    />
  </div>
</div>

        <div style={{ overflowX: "auto", marginBottom: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
  <tr style={{ borderBottom: "1px solid #000" }}>
    <th style={thBosse}>Empleado</th>
    <th style={thBosse}>Puesto</th>
    <th style={thBosse}>Modalidad</th>
    <th style={thBosse}>Método pago</th>
    <th style={thBosse}>Cantidad / mesas</th>
    <th style={thBosse}>Tarifa</th>
    <th style={thBosse}>Prima (+)</th>
    <th style={thBosse}>Desc. (-)</th>
    <th style={thBosse}>Comentario</th>
    <th
      style={{
        ...thBosse,
        textAlign: "right",
      }}
    >
      Total
    </th>
    <th style={thBosse}></th>
  </tr>
</thead>

<tbody>
  {filas.map((fila) => {
    const esPorMesa =
      fila.modalidad_pago === "POR_MESA";

    const etiquetaCantidad =
      fila.modalidad_pago === "SEMANAL"
        ? "Semanas"
        : "Días";

    return (
      <React.Fragment key={fila.id}>
        <tr
          style={{
            borderBottom: esPorMesa
              ? "none"
              : "1px solid #eee",
          }}
        >
          <td style={{ padding: "5px", minWidth: 190 }}>
            <select
              value={fila.empleado_id || ""}
              onChange={(e) =>
                seleccionarEmpleado(
                  fila.id,
                  e.target.value
                )
              }
              style={estiloInputTabla}
            >
              <option value="">
                Seleccionar empleado
              </option>

              {empleadosDisponibles.map((empleado) => (
                <option
                  key={empleado.id}
                  value={empleado.id}
                >
                  {empleado.nombre}
                </option>
              ))}
            </select>
          </td>

          <td
            style={{
              padding: "10px",
              minWidth: 130,
              fontSize: "13px",
            }}
          >
            <div style={{ fontWeight: 600 }}>
              {fila.puesto || "Sin puesto"}
            </div>

            <div
              style={{
                color: "#888",
                fontSize: "11px",
                marginTop: "4px",
              }}
            >
              {fila.tipo_nomina || "Operativa"}
            </div>
          </td>

          <td
            style={{
              padding: "10px",
              minWidth: 105,
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {fila.modalidad_pago === "POR_MESA"
              ? "Por mesa"
              : fila.modalidad_pago === "SEMANAL"
              ? "Semanal"
              : "Diario"}
          </td>

          <td style={{ minWidth: 110 }}>
            <select
              value={
                fila.metodo_pago_nomina ||
                "Efectivo"
              }
              onChange={(e) =>
                manejarCambioFila(
                  fila.id,
                  "metodo_pago_nomina",
                  e.target.value
                )
              }
              style={estiloInputTabla}
            >
              <option value="Efectivo">
                Efectivo
              </option>
              <option value="Banco">Banco</option>
              <option value="Banca">Banca</option>
            </select>
          </td>

          <td
            style={{
              minWidth: esPorMesa ? 130 : 90,
              padding: "5px",
            }}
          >
            {esPorMesa ? (
              <span
                style={{
                  fontSize: "12px",
                  color: "#666",
                }}
              >
                {(fila.mesas || []).length} fecha(s)
              </span>
            ) : (
              <input
                type="number"
                min="0"
                step={
                  fila.modalidad_pago === "SEMANAL"
                    ? "0.01"
                    : "1"
                }
                placeholder={etiquetaCantidad}
                value={fila.cantidad}
                onChange={(e) =>
                  manejarCambioFila(
                    fila.id,
                    "cantidad",
                    e.target.value
                  )
                }
                style={estiloInputTabla}
              />
            )}
          </td>

          <td style={{ minWidth: 95 }}>
            {esPorMesa ? (
              <span
                style={{
                  fontSize: "12px",
                  color: "#777",
                }}
              >
                Por fecha
              </span>
            ) : (
              <input
                type="number"
                min="0"
                step="0.01"
                value={fila.tarifa}
                onChange={(e) =>
                  manejarCambioFila(
                    fila.id,
                    "tarifa",
                    e.target.value
                  )
                }
                style={estiloInputTabla}
              />
            )}
          </td>

          <td style={{ minWidth: 90 }}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={fila.prima}
              onChange={(e) =>
                manejarCambioFila(
                  fila.id,
                  "prima",
                  e.target.value
                )
              }
              style={estiloInputTabla}
            />
          </td>

          <td style={{ minWidth: 90 }}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={fila.descuento}
              onChange={(e) =>
                manejarCambioFila(
                  fila.id,
                  "descuento",
                  e.target.value
                )
              }
              style={estiloInputTabla}
            />
          </td>

          <td style={{ minWidth: 150 }}>
            <input
              placeholder="Comentario"
              value={fila.comentario_pago || ""}
              onChange={(e) =>
                manejarCambioFila(
                  fila.id,
                  "comentario_pago",
                  e.target.value
                )
              }
              style={estiloInputTabla}
            />
          </td>

          <td
            style={{
              textAlign: "right",
              fontWeight: "700",
              padding: "12px",
              whiteSpace: "nowrap",
            }}
          >
            {Number(fila.total || 0).toLocaleString(
              "es-MX",
              {
                style: "currency",
                currency: "MXN",
              }
            )}
          </td>

          <td style={{ textAlign: "center" }}>
            <button
              type="button"
              title="Eliminar línea"
              onClick={() => {
                if (filas.length === 1) {
                  alert(
                    "⚠️ Debe existir al menos una línea."
                  );
                  return;
                }

                setFilas((filasActuales) =>
                  filasActuales.filter(
                    (item) => item.id !== fila.id
                  )
                );
              }}
              style={{
                border: "none",
                background: "none",
                color: "#999",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </td>
        </tr>

        {esPorMesa && (
          <tr style={{ borderBottom: "1px solid #eee" }}>
            <td colSpan="11" style={{ padding: "0 12px 18px" }}>
              <div
                style={{
                  padding: "14px",
                  background: "#fafafa",
                  border: "1px solid #e5e5e5",
                  borderRadius: "9px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "12px",
                      textTransform: "uppercase",
                    }}
                  >
                    Mesas de {fila.nombre || "RP"}
                  </strong>

                  <button
                    type="button"
                    onClick={() => agregarMesa(fila.id)}
                    style={{
                      border: "1px solid #111",
                      background: "#fff",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    + Agregar fecha
                  </button>
                </div>

                {(fila.mesas || []).length === 0 ? (
                  <p
                    style={{
                      color: "#777",
                      fontSize: "12px",
                      margin: 0,
                    }}
                  >
                    Agrega al menos una fecha para registrar
                    las mesas.
                  </p>
                ) : (
                  (fila.mesas || []).map((mesa) => {
                    const subtotal =
                      (Number(mesa.cantidad_mesas) || 0) *
                      (Number(mesa.tarifa_mesa) || 0);

                    return (
                      <div
                        key={mesa.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(150px, 1fr) minmax(110px, 1fr) minmax(110px, 1fr) minmax(120px, 1fr) 40px",
                          gap: "10px",
                          alignItems: "center",
                          marginTop: "8px",
                        }}
                      >
                        <input
                          type="date"
                          value={mesa.fecha || ""}
                          onChange={(e) =>
                            cambiarMesa(
                              fila.id,
                              mesa.id,
                              "fecha",
                              e.target.value
                            )
                          }
                          style={estiloInputMesa}
                        />

                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Mesas"
                          value={mesa.cantidad_mesas}
                          onChange={(e) =>
                            cambiarMesa(
                              fila.id,
                              mesa.id,
                              "cantidad_mesas",
                              e.target.value
                            )
                          }
                          style={estiloInputMesa}
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Tarifa"
                          value={mesa.tarifa_mesa}
                          onChange={(e) =>
                            cambiarMesa(
                              fila.id,
                              mesa.id,
                              "tarifa_mesa",
                              e.target.value
                            )
                          }
                          style={estiloInputMesa}
                        />

                        <div
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            fontSize: "13px",
                          }}
                        >
                          {subtotal.toLocaleString("es-MX", {
                            style: "currency",
                            currency: "MXN",
                          })}
                        </div>

                        <button
                          type="button"
                          title="Eliminar fecha"
                          onClick={() =>
                            eliminarMesa(
                              fila.id,
                              mesa.id
                            )
                          }
                          style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  })}
</tbody>

          </table>
        </div>

        <div style={{ marginBottom: "20px" }}>
  <label style={estilos.panelLabel}>
    Comentarios extraordinarios
  </label>

  <textarea
    placeholder="Ej. Bono especial, aclaraciones, ajustes extraordinarios..."
    value={comentariosExtraordinarios}
    onChange={(e) => setComentariosExtraordinarios(e.target.value)}
    style={{
      ...estilos.input,
      width: "100%",
      minHeight: "90px",
      resize: "vertical",
      marginTop: "8px",
    }}
  />
</div>

<button
  type="button"
  onClick={() =>
    setFilas((filasActuales) => [
      ...filasActuales,
      crearFilaVacia(),
    ])
  }
  style={{
    background: "none",
    border: "1px dashed #ccc",
    width: "100%",
    padding: "10px",
    color: "#888",
    cursor: "pointer",
    borderRadius: "8px",
    marginBottom: "30px",
  }}
>
  + AGREGAR NUEVA LÍNEA
</button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f9f9f9",
            padding: "25px",
            borderRadius: "12px",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "10px",
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Total a Dispersar
            </span>

            <div
              style={{
                fontSize: "32px",
                fontWeight: "200",
                color: "#000",
              }}
            >
              $
              {totalGlobal.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <button
            onClick={enviarNominaADrive}
            style={{
              backgroundColor: hayDuplicados ? "#eee" : "#000",
              color: hayDuplicados ? "#999" : "#fff",
              padding: "18px 35px",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              letterSpacing: "1px",
              cursor: hayDuplicados ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
            }}
          >
            {hayDuplicados
  ? "REVISAR ERRORES"
  : "ENVIAR A APROBACIÓN"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Nomina;