import React, { useEffect, useState, useCallback } from "react";
import API_BASE_URL from "../config/api";

function Empleados({ usuarioActivo, usuarioId, onVolver }) {

  const [empleados, setEmpleados] = useState([]);
  const [filtro, setFiltro] = useState("activos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
const [empleadoEditando, setEmpleadoEditando] = useState(null);

const [nuevoEmpleado, setNuevoEmpleado] = useState({
  nombre: "",
  puesto: "",
  fecha_ingreso: "",
  cuenta_bancaria: "",
  sueldo_diario: "",
  sueldo_base: "",
});

  const cargarEmpleados = useCallback(async () => {

    try {

      let url = `${API_BASE_URL}/api/empleados`;

      if (filtro === "activos") {
        url += "?activos=true";
      }

      if (filtro === "baja") {
        url += "?activos=false";
      }

      const respuesta = await fetch(url);

      const resultado = await respuesta.json();

      if (resultado.success) {
        setEmpleados(resultado.empleados);
      }

    } catch (error) {
      console.error("Error cargando empleados:", error);
    }
  }, [filtro]);

const crearEmpleado = async () => {
  if (!nuevoEmpleado.nombre.trim()) {
    alert("⚠️ El nombre es obligatorio.");
    return;
  }

  try {
    const respuesta = await fetch(`${API_BASE_URL}/api/empleados`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...nuevoEmpleado,
        usuario_id: usuarioId,
      }),
    });

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(resultado.error || "Error al crear empleado.");
    }

    alert("✅ Empleado creado correctamente.");

  setNuevoEmpleado({
  nombre: "",
  puesto: "",
  fecha_ingreso: "",
  cuenta_bancaria: "",
  sueldo_diario: "",
  sueldo_base: "",
});

    setMostrarFormulario(false);
    cargarEmpleados();
  } catch (error) {
    alert("🚨 Error al crear empleado: " + error.message);
  }
};

const empezarEditar = (empleado) => {
  setEmpleadoEditando(empleado);

 setNuevoEmpleado({
  nombre: empleado.nombre || "",
  puesto: empleado.puesto || "",
  fecha_ingreso: empleado.fecha_ingreso
    ? empleado.fecha_ingreso.split("T")[0]
    : "",
  cuenta_bancaria: empleado.cuenta_bancaria || "",
  sueldo_diario: empleado.sueldo_diario || "",
  sueldo_base: empleado.sueldo_base || "",
});

  setMostrarFormulario(true);
};

const actualizarEmpleado = async () => {
  if (!nuevoEmpleado.nombre.trim()) {
    alert("⚠️ El nombre es obligatorio.");
    return;
  }

  try {
    const respuesta = await fetch(
      `${API_BASE_URL}/api/empleados/${empleadoEditando.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...nuevoEmpleado,
          usuario_id: usuarioId,
        }),
      }
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(resultado.error || "Error al actualizar empleado.");
    }

    alert("✅ Empleado actualizado correctamente.");

    setEmpleadoEditando(null);
    setMostrarFormulario(false);

   setNuevoEmpleado({
  nombre: "",
  puesto: "",
  fecha_ingreso: "",
  cuenta_bancaria: "",
  sueldo_diario: "",
  sueldo_base: "",
});

    cargarEmpleados();
  } catch (error) {
    alert("🚨 Error al actualizar empleado: " + error.message);
  }
};

const darDeBaja = async (empleado) => {
  const motivo = prompt(`Motivo de baja para ${empleado.nombre}:`);

  if (motivo === null) return;

  const confirmar = window.confirm(
    `¿Dar de baja a ${empleado.nombre}?`
  );

  if (!confirmar) return;

  try {
    const respuesta = await fetch(
      `${API_BASE_URL}/api/empleados/${empleado.id}/baja`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motivo_baja: motivo,
          usuario_id: usuarioId,
        }),
      }
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(resultado.error || "Error al dar de baja.");
    }

    alert("✅ Empleado dado de baja.");
    cargarEmpleados();
  } catch (error) {
    alert("🚨 Error: " + error.message);
  }
};

const reactivarEmpleado = async (empleado) => {
  const confirmar = window.confirm(
    `¿Reactivar a ${empleado.nombre}?`
  );

  if (!confirmar) return;

  try {
    const respuesta = await fetch(
      `${API_BASE_URL}/api/empleados/${empleado.id}/reactivar`,
      {
        method: "PUT",
      }
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(resultado.error || "Error al reactivar.");
    }

    alert("✅ Empleado reactivado.");
    cargarEmpleados();
  } catch (error) {
    alert("🚨 Error: " + error.message);
  }
};

  useEffect(() => {
  cargarEmpleados();
}, [cargarEmpleados]);

  return (
    <div style={{ padding: "40px" }}>

      <button onClick={onVolver}>
        ← Volver
      </button>

      <h1>Gestión de Empleados</h1>

      <p>
        Operador: {usuarioActivo}
      </p>

        <button
  onClick={() => setMostrarFormulario(!mostrarFormulario)}
  style={{ marginBottom: "20px" }}
>
  + Nuevo empleado
</button>

{mostrarFormulario && (
  <div
    style={{
      border: "1px solid #ccc",
      padding: "20px",
      marginBottom: "20px",
    }}
  >
    <input
      placeholder="Nombre"
      value={nuevoEmpleado.nombre}
      onChange={(e) =>
        setNuevoEmpleado({ ...nuevoEmpleado, nombre: e.target.value })
      }
    />

    <input
      placeholder="Puesto"
      value={nuevoEmpleado.puesto}
      onChange={(e) =>
        setNuevoEmpleado({ ...nuevoEmpleado, puesto: e.target.value })
      }
      style={{ marginLeft: "10px" }}
    />

    <input
      type="date"
      value={nuevoEmpleado.fecha_ingreso}
      onChange={(e) =>
        setNuevoEmpleado({ ...nuevoEmpleado, fecha_ingreso: e.target.value })
      }
      style={{ marginLeft: "10px" }}
    />

    <input
      placeholder="Cuenta bancaria"
      value={nuevoEmpleado.cuenta_bancaria}
      onChange={(e) =>
        setNuevoEmpleado({ ...nuevoEmpleado, cuenta_bancaria: e.target.value })
      }
      style={{ marginLeft: "10px" }}
    />

    <input
  type="number"
  placeholder="Sueldo diario"
  value={nuevoEmpleado.sueldo_diario}
  onChange={(e) =>
    setNuevoEmpleado({
      ...nuevoEmpleado,
      sueldo_diario: e.target.value
    })
  }
  style={{ marginLeft: "10px" }}
/>

<input
  type="number"
  placeholder="Sueldo base"
  value={nuevoEmpleado.sueldo_base}
  onChange={(e) =>
    setNuevoEmpleado({
      ...nuevoEmpleado,
      sueldo_base: e.target.value
    })
  }
  style={{ marginLeft: "10px" }}
/>

    <button
  onClick={
    empleadoEditando
      ? actualizarEmpleado
      : crearEmpleado
  }
  style={{ marginLeft: "10px" }}
>
  {empleadoEditando ? "Actualizar" : "Guardar"}
</button>
  </div>
)}

      <div style={{ marginBottom: "20px" }}>

        <button onClick={() => setFiltro("activos")}>
          Activos
        </button>

        <button
          onClick={() => setFiltro("baja")}
          style={{ marginLeft: "10px" }}
        >
          Baja
        </button>

        <button
          onClick={() => setFiltro("todos")}
          style={{ marginLeft: "10px" }}
        >
          Todos
        </button>

      </div>

      <table
        border="1"
        cellPadding="8"
        style={{
          borderCollapse: "collapse",
          width: "100%"
        }}
      >

        <thead>

          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Puesto</th>
            <th>Ingreso</th>
            <th>Sueldo Diario</th>
            <th>Estatus</th>
            <th>Acciones</th>
          </tr>

        </thead>

        <tbody>

          {empleados.map((emp) => (

            <tr key={emp.id}>

              <td>{emp.id}</td>

              <td>{emp.nombre}</td>

              <td>{emp.puesto}</td>

              <td>{emp.fecha_ingreso?.split("T")[0]}</td>
              <td>${emp.sueldo_diario || 0}</td>

              <td>
                {emp.activo ? "Activo" : "Baja"}
              </td>

              <td>

  <button
    onClick={() => empezarEditar(emp)}
  >
    Editar
  </button>

  {emp.activo ? (

    <button
      onClick={() => darDeBaja(emp)}
      style={{ marginLeft: "5px" }}
    >
      Dar baja
    </button>

  ) : (

    <button
      onClick={() => reactivarEmpleado(emp)}
      style={{ marginLeft: "5px" }}
    >
      Reactivar
    </button>

  )}

</td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

export default Empleados;