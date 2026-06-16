import React, { useEffect, useState, useCallback } from "react";
import API_BASE_URL from "../config/api";

function Empleados({ usuarioActivo, usuarioId, onVolver }) {

  const [empleados, setEmpleados] = useState([]);
  const [filtro, setFiltro] = useState("activos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busqueda, setBusqueda] = useState("");
const [ordenCampo, setOrdenCampo] = useState("id");
const [ordenDireccion, setOrdenDireccion] = useState("desc");
const [empleadoEditando, setEmpleadoEditando] = useState(null);

const [nuevoEmpleado, setNuevoEmpleado] = useState({
  nombre: "",
  puesto: "",
  fecha_ingreso: "",
  cuenta_bancaria: "",
  sueldo_diario: "",
  sueldo_base: "",
  tipo_nomina: "Operativa",
  metodo_pago_nomina: "Efectivo",
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
  tipo_nomina: "Operativa",
  metodo_pago_nomina: "Efectivo",
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
    tipo_nomina: empleado.tipo_nomina || "Operativa",
    metodo_pago_nomina: empleado.metodo_pago_nomina || "Efectivo",
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
  tipo_nomina: "Operativa",
  metodo_pago_nomina: "Efectivo",
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
  const empleadosFiltradosOrdenados = empleados
  .filter((emp) => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return true;

    return [
      emp.id,
      emp.nombre,
      emp.puesto,
      emp.fecha_ingreso,
      emp.cuenta_bancaria,
      emp.sueldo_diario,
      emp.sueldo_base,
      emp.tipo_nomina,
      emp.metodo_pago_nomina,
      emp.activo ? "Activo" : "Baja",
    ]
      .join(" ")
      .toLowerCase()
      .includes(texto);
  })
  .sort((a, b) => {
    let valorA = a[ordenCampo];
    let valorB = b[ordenCampo];

    if (ordenCampo === "id" || ordenCampo === "sueldo_diario") {
      valorA = Number(valorA) || 0;
      valorB = Number(valorB) || 0;
    } else {
      valorA = String(valorA || "").toLowerCase();
      valorB = String(valorB || "").toLowerCase();
    }

    if (valorA < valorB) {
      return ordenDireccion === "asc" ? -1 : 1;
    }

    if (valorA > valorB) {
      return ordenDireccion === "asc" ? 1 : -1;
    }

    return 0;
  });
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
<select
  value={nuevoEmpleado.tipo_nomina}
  onChange={(e) =>
    setNuevoEmpleado({
      ...nuevoEmpleado,
      tipo_nomina: e.target.value,
    })
  }
  style={{ marginLeft: "10px" }}
>
  <option value="Operativa">Operativa</option>
  <option value="Banco">Banco</option>
  <option value="Administrativa">Administrativa</option>
</select>

<select
  value={nuevoEmpleado.metodo_pago_nomina}
  onChange={(e) =>
    setNuevoEmpleado({
      ...nuevoEmpleado,
      metodo_pago_nomina: e.target.value,
    })
  }
  style={{ marginLeft: "10px" }}
>
  <option value="Efectivo">Efectivo</option>
  <option value="Banco">Banco</option>
</select>

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

<div
  style={{
    marginBottom: "20px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  }}
>
  <input
    placeholder="Buscar por nombre, puesto, tipo, método, sueldo, estatus..."
    value={busqueda}
    onChange={(e) => setBusqueda(e.target.value)}
    style={{
      padding: "8px",
      minWidth: "360px",
    }}
  />

  <select
    value={ordenCampo}
    onChange={(e) => setOrdenCampo(e.target.value)}
    style={{ padding: "8px" }}
  >
    <option value="id">Número de empleado</option>
    <option value="nombre">Nombre</option>
    <option value="puesto">Puesto</option>
    <option value="tipo_nomina">Tipo nómina</option>
    <option value="metodo_pago_nomina">Método pago</option>
    <option value="sueldo_diario">Sueldo diario</option>
  </select>

  <select
    value={ordenDireccion}
    onChange={(e) => setOrdenDireccion(e.target.value)}
    style={{ padding: "8px" }}
  >
    <option value="asc">Ascendente</option>
    <option value="desc">Descendente</option>
  </select>

  <span>
    Mostrando: <strong>{empleadosFiltradosOrdenados.length}</strong>
  </span>
</div>

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
            <th>Tipo nómina</th>
            <th>Método pago</th>
            <th>Estatus</th>
            <th>Acciones</th>
          </tr>

        </thead>

        <tbody>

          {empleadosFiltradosOrdenados.map((emp) => (
<tr key={emp.id}>

  <td>{emp.id}</td>

  <td>{emp.nombre}</td>

  <td>{emp.puesto}</td>

  <td>{emp.fecha_ingreso?.split("T")[0]}</td>

  <td>${emp.sueldo_diario || 0}</td>

  <td>{emp.tipo_nomina || "Operativa"}</td>

  <td>{emp.metodo_pago_nomina || "Efectivo"}</td>

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