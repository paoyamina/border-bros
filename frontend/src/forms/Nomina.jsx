import React, { useEffect, useState } from "react";
import estilos from "../styles/estilos";
import API_BASE_URL, { API_ENDPOINTS } from "../config/api";
import { validarNomina } from "../utils/validaciones";
import { exportarExcelNomina } from "../utils/exportExcel";

const estiloInputTabla = {
  width: "100%",
  border: "none",
  padding: "8px",
  outline: "none",
  fontSize: "13px",
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
  const [filas, setFilas] = useState([
    {
      id: 1,
      nombre: "",
      puesto: "",
      ingreso: "",
      cuenta: "",
      dias: 0,
      costo: 0,
      prima: 0,
      descuento: 0,
      total: 0,
      metodo: "Efectivo",
    },
  ]);

  const [statusNomina, setStatusNomina] = useState("CAPTURA");
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState([]);
  useEffect(() => {
  const cargarEmpleados = async () => {
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/empleados?activos=true`);
      const resultado = await respuesta.json();

      if (resultado.success) {
        setEmpleadosDisponibles(resultado.empleados);

        const filasIniciales = resultado.empleados.map((emp) => ({
          id: emp.id,
          empleado_id: emp.id,
          nombre: emp.nombre,
          puesto: emp.puesto || "",
          ingreso: emp.fecha_ingreso || "",
          cuenta: emp.cuenta_bancaria || "",
          dias: 0,
          costo: parseFloat(emp.sueldo_diario) || 0,
          prima: 0,
          descuento: 0,
          total: 0,
        }));

        setFilas(filasIniciales);
      }
    } catch (error) {
      console.error("Error cargando empleados:", error);
    }
  };

  cargarEmpleados();
}, []);

  const manejarCambioFila = (id, campo, valor) => {
    const nuevasFilas = filas.map((fila) => {
      if (fila.id === id) {
        const f = { ...fila, [campo]: valor };

        const subtotal =
          (parseFloat(f.dias) || 0) * (parseFloat(f.costo) || 0);

        f.total =
          subtotal +
          (parseFloat(f.prima) || 0) -
          (parseFloat(f.descuento) || 0);

        return f;
      }

      return fila;
    });

    setFilas(nuevasFilas);
  };

  const nombresOcupados = filas
    .map((f) => f.nombre.trim().toLowerCase())
    .filter((n) => n !== "");

  const hayDuplicados = nombresOcupados.some(
    (nombre, index) => nombresOcupados.indexOf(nombre) !== index
  );

  const totalGlobal = filas.reduce((acc, f) => acc + (parseFloat(f.total) || 0), 0);

  const enviarNominaADrive = async () => {
    const errorValidacion = validarNomina(filas);

    if (errorValidacion) {
      alert(`⚠️ ${errorValidacion}`);
      return;
    }

    const confirmar = window.confirm(`
¿DESEAS GUARDAR ESTA PRE-NÓMINA?

Empleados: ${filas.length}
Total a dispersar: $${totalGlobal.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}

Al aceptar, se guardará el registro y se descargará el Excel local.
`);

    if (!confirmar) return;

    try {
      exportarExcelNomina({
        filas,
        totalGlobal,
      });

      const formData = new FormData();

      formData.append(
        "nombreCarpeta",
        `NOMINA_${new Date().toISOString().split("T")[0]}`
      );

      formData.append("usuario", usuarioActivo);

      formData.append(
        "detalles",
        JSON.stringify({
          tipo: "NOMINA",
          usuario: usuarioActivo,
          fecha: new Date().toISOString().split("T")[0],
          status: "APROBADO",
          totalGlobal,
          empleados: filas,
        })
      );

      const respuesta = await fetch(API_ENDPOINTS.guardarReporte, {
        method: "POST",
        body: formData,
      });

      const resultado = await respuesta.json();

      if (!resultado.success) {
        throw new Error(resultado.error || "Error desconocido en servidor.");
      }

      const detallePrenomina = filas
  .filter((fila) => fila.empleado_id && parseFloat(fila.total) > 0)
  .map((fila) => ({
    empleado_id: fila.empleado_id,
    dias: parseFloat(fila.dias) || 0,
    costo_unitario: parseFloat(fila.costo) || 0,
    prima: parseFloat(fila.prima) || 0,
    descuento: parseFloat(fila.descuento) || 0,
    total: parseFloat(fila.total) || 0,
    nota: null,
  }));

const respuestaPrenomina = await fetch(`${API_BASE_URL}/api/prenomina`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    fecha_inicio: null,
    fecha_fin: null,
    total: totalGlobal,
    usuario_crea_id: usuarioId,
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

        <div style={{ overflowX: "auto", marginBottom: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #000" }}>
                <th style={thBosse}>EMPLEADO</th>
                <th style={thBosse}>DÍAS</th>
                <th style={thBosse}>COSTO U.</th>
                <th style={thBosse}>PRIMA (+)</th>
                <th style={thBosse}>DESC. (-)</th>
                <th style={{ ...thBosse, textAlign: "right" }}>TOTAL</th>
                <th style={thBosse}></th>
              </tr>
            </thead>

            <tbody>
              {filas.map((fila) => {
                return (
                  <tr key={fila.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "5px" }}>
                      <select
  value={fila.empleado_id || ""}
  onChange={(e) => {

    const empleado = empleadosDisponibles.find(
      (emp) => emp.id === parseInt(e.target.value)
    );

    if (!empleado) return;

    const nuevasFilas = filas.map((f) => {

      if (f.id === fila.id) {

        const dias = parseFloat(f.dias) || 0;
        const costo = parseFloat(empleado.sueldo_diario) || 0;

        return {
          ...f,
          empleado_id: empleado.id,
          nombre: empleado.nombre,
          puesto: empleado.puesto,
          ingreso: empleado.fecha_ingreso,
          cuenta: empleado.cuenta_bancaria,
          costo,
          total:
            (dias * costo) +
            (parseFloat(f.prima) || 0) -
            (parseFloat(f.descuento) || 0),
        };
      }

      return f;
    });

    setFilas(nuevasFilas);
  }}
  style={estiloInputTabla}
>

  <option value="">
    Seleccionar empleado
  </option>

  {empleadosDisponibles.map((emp) => (
    <option key={emp.id} value={emp.id}>
      {emp.nombre}
    </option>
  ))}

</select>
                    </td>

                    <td>
                      <input
                        type="number"
                        value={fila.dias}
                        onChange={(e) =>
                          manejarCambioFila(fila.id, "dias", e.target.value)
                        }
                        style={estiloInputTabla}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        value={fila.costo}
                        onChange={(e) =>
                          manejarCambioFila(fila.id, "costo", e.target.value)
                        }
                        style={estiloInputTabla}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        value={fila.prima}
                        onChange={(e) =>
                          manejarCambioFila(fila.id, "prima", e.target.value)
                        }
                        style={estiloInputTabla}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
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

                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: "600",
                        padding: "12px",
                        fontSize: "14px",
                      }}
                    >
                      $
                      {fila.total.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => {
                          if (filas.length === 1) {
                            alert("⚠️ Debe existir al menos una línea.");
                            return;
                          }

                          setFilas(filas.filter((f) => f.id !== fila.id));
                        }}
                        style={{
                          border: "none",
                          background: "none",
                          color: "#ccc",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={() =>
            setFilas([
              ...filas,
              {
                id: Date.now(),
                nombre: "",
                puesto: "",
                dias: 0,
                costo: 0,
                prima: 0,
                descuento: 0,
                total: 0,
              },
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
            {hayDuplicados ? "REVISAR ERRORES" : "GUARDAR Y DESCARGAR EXCEL"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Nomina;