import React, { useCallback, useEffect, useState } from "react";
import API_BASE_URL from "../../config/api";
import TablaCortes from "./TablaCortes";
import ModalDetalleCorte from "./ModalDetalleCorte";

function GestionCortes({
  usuarioActivo,
  rol,
  negocioId,
  onSeleccionarTipo,
  onVolver,
  onEditarCorte,
}) {
  const [cortes, setCortes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const filtrosIniciales = {
  fecha_inicio: "",
  fecha_fin: "",
  folio: "",
  operador: "",
  estatus: "",
  diferencia_min: "",
  diferencia_max: "",
  venta_min: "",
  venta_max: "",
};

const [filtros, setFiltros] = useState(filtrosIniciales);
const [filtrosAplicados, setFiltrosAplicados] =
  useState(filtrosIniciales);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
const [corteSeleccionado, setCorteSeleccionado] = useState(null);

  const estiloBotonPrincipal = {
    padding: "14px 22px",
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  };

  const estiloBotonTipo = {
    width: "100%",
    padding: "18px",
    background: "#fff",
    color: "#111",
    border: "1px solid #dcdcdc",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "left",
  };

  const verDetalle = (corte) => {
  setCorteSeleccionado(corte);
  setDetalleAbierto(true);
};

const cancelarCorte = async (corte) => {
  const confirmar = window.confirm(
    `¿Cancelar el corte ${corte.folio}?`
  );

  if (!confirmar) return;

  try {
    const respuesta = await fetch(
      `${API_BASE_URL}/api/cortes/${corte.id}/cancelar`,
      {
        method: "PUT",
      }
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    await cargarCortes();

    alert("✅ Corte cancelado.");
  } catch (error) {
    alert(error.message);
  }
};

const reactivarCorte = async (corte) => {
  const confirmar = window.confirm(
    `¿Reactivar el corte ${corte.folio}?`
  );

  if (!confirmar) return;

  try {
    const respuesta = await fetch(
      `${API_BASE_URL}/api/cortes/${corte.id}/reactivar`,
      {
        method: "PUT",
      }
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    await cargarCortes();

    alert("✅ Corte reactivado.");
  } catch (error) {
    alert(error.message);
  }
};

const cargarCortes = useCallback(async () => {
  if (!negocioId) return;

  try {
    setCargando(true);
    setError("");

    const parametros = new URLSearchParams({
      negocio_id: String(negocioId),
    });

    if (filtrosAplicados.fecha_inicio) {
      parametros.append(
        "fecha_inicio",
        filtrosAplicados.fecha_inicio
      );
    }

    if (filtrosAplicados.fecha_fin) {
      parametros.append(
        "fecha_fin",
        filtrosAplicados.fecha_fin
      );
    }

    if (filtrosAplicados.folio.trim()) {
      parametros.append(
        "folio",
        filtrosAplicados.folio.trim()
      );
    }

    const respuesta = await fetch(
      `${API_BASE_URL}/api/cortes?${parametros.toString()}`
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok || !resultado.success) {
      throw new Error(
        resultado.error ||
          "No se pudieron cargar los cortes."
      );
    }

    let cortesFiltrados = resultado.cortes || [];

    if (filtrosAplicados.operador.trim()) {
      const operadorBuscado =
        filtrosAplicados.operador.trim().toLowerCase();

      cortesFiltrados = cortesFiltrados.filter((corte) =>
        String(corte.usuario_nombre || "")
          .toLowerCase()
          .includes(operadorBuscado)
      );
    }

    if (filtrosAplicados.estatus) {
      cortesFiltrados = cortesFiltrados.filter(
        (corte) =>
          (corte.estatus || "REGISTRADO") ===
          filtrosAplicados.estatus
      );
    }

    if (filtrosAplicados.diferencia_min !== "") {
      cortesFiltrados = cortesFiltrados.filter(
        (corte) =>
          Number(corte.diferencia || 0) >=
          Number(filtrosAplicados.diferencia_min)
      );
    }

    if (filtrosAplicados.diferencia_max !== "") {
      cortesFiltrados = cortesFiltrados.filter(
        (corte) =>
          Number(corte.diferencia || 0) <=
          Number(filtrosAplicados.diferencia_max)
      );
    }

    if (filtrosAplicados.venta_min !== "") {
      cortesFiltrados = cortesFiltrados.filter(
        (corte) =>
          Number(corte.venta_ticket || 0) >=
          Number(filtrosAplicados.venta_min)
      );
    }

    if (filtrosAplicados.venta_max !== "") {
      cortesFiltrados = cortesFiltrados.filter(
        (corte) =>
          Number(corte.venta_ticket || 0) <=
          Number(filtrosAplicados.venta_max)
      );
    }

    setCortes(cortesFiltrados);
  } catch (error) {
    console.error(error);
    setError(error.message);
  } finally {
    setCargando(false);
  }
}, [negocioId, filtrosAplicados]);

const buscarCortes = () => {
  setFiltrosAplicados({ ...filtros });
};

const limpiarFiltros = () => {
  setFiltros({ ...filtrosIniciales });
  setFiltrosAplicados({ ...filtrosIniciales });
};

useEffect(() => {
  cargarCortes();
}, [cargarCortes]);

    return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f7f5",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        padding: "28px",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: "600",
                color: "#111",
              }}
            >
              Gestión de cortes de caja
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#666",
                fontSize: "15px",
              }}
            >
              Usuario: {usuarioActivo || "Sin usuario"} | Rol:{" "}
              {rol || "Sin rol"}
            </p>
          </div>

          <button
            type="button"
            onClick={onVolver}
            style={{
              ...estiloBotonPrincipal,
              background: "#fff",
              color: "#111",
              border: "1px solid #111",
            }}
          >
            ← Volver al menú
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: "14px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
          }}
        >
          <h2>Registrar nuevo corte</h2>

          <button
            style={estiloBotonTipo}
            onClick={() => onSeleccionarTipo("caja_nuevo")}
          >
            Nuevo corte de caja
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
          }}
        >
          <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  }}
>
  <div>
    <h2 style={{ margin: 0 }}>
      Historial de cortes
    </h2>

    <p
      style={{
        margin: "6px 0 0",
        color: "#666",
        fontSize: "14px",
      }}
    >
      Consulta los cortes registrados para el negocio activo.
    </p>
  </div>

  <div
    style={{
      padding: "7px 12px",
      background: "#f2f2f0",
      borderRadius: "999px",
      fontSize: "13px",
      fontWeight: "700",
      whiteSpace: "nowrap",
    }}
  >
    {cortes.length}{" "}
    {cortes.length === 1 ? "corte" : "cortes"}
  </div>
</div>

          <div
  style={{
    marginBottom: "20px",
    padding: "16px",
    background: "#fafafa",
    border: "1px solid #e5e5e5",
    borderRadius: "10px",
  }}
>
  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(145px, 1fr))",
      gap: "12px",
    }}
  >
    <div>
      <label style={estiloEtiquetaFiltro}>Fecha inicial</label>
      <input
        type="date"
        value={filtros.fecha_inicio}
        onChange={(e) =>
          setFiltros({
            ...filtros,
            fecha_inicio: e.target.value,
          })
        }
        style={estiloInputFiltro}
      />
    </div>

    <div>
      <label style={estiloEtiquetaFiltro}>Fecha final</label>
      <input
        type="date"
        value={filtros.fecha_fin}
        onChange={(e) =>
          setFiltros({
            ...filtros,
            fecha_fin: e.target.value,
          })
        }
        style={estiloInputFiltro}
      />
    </div>

    <div>
      <label style={estiloEtiquetaFiltro}>Folio</label>
      <input
        type="text"
        placeholder="Buscar folio"
        value={filtros.folio}
        onChange={(e) =>
          setFiltros({
            ...filtros,
            folio: e.target.value,
          })
        }
        style={estiloInputFiltro}
      />
    </div>

    <div>
      <label style={estiloEtiquetaFiltro}>Operador</label>
      <input
        type="text"
        placeholder="Buscar operador"
        value={filtros.operador}
        onChange={(e) =>
          setFiltros({
            ...filtros,
            operador: e.target.value,
          })
        }
        style={estiloInputFiltro}
      />
    </div>

    <div>
      <label style={estiloEtiquetaFiltro}>Estatus</label>
      <select
        value={filtros.estatus}
        onChange={(e) =>
          setFiltros({
            ...filtros,
            estatus: e.target.value,
          })
        }
        style={estiloInputFiltro}
      >
        <option value="">Todos</option>
        <option value="REGISTRADO">Registrado</option>
        <option value="CANCELADO">Cancelado</option>
      </select>
    </div>

    <div>
      <label style={estiloEtiquetaFiltro}>Diferencia mínima</label>
      <input
        type="number"
        placeholder="0.00"
        value={filtros.diferencia_min}
        onChange={(e) =>
          setFiltros({
            ...filtros,
            diferencia_min: e.target.value,
          })
        }
        style={estiloInputFiltro}
      />
    </div>

    <div>
      <label style={estiloEtiquetaFiltro}>Diferencia máxima</label>
      <input
        type="number"
        placeholder="0.00"
        value={filtros.diferencia_max}
        onChange={(e) =>
          setFiltros({
            ...filtros,
            diferencia_max: e.target.value,
          })
        }
        style={estiloInputFiltro}
      />
    </div>

    <div>
      <label style={estiloEtiquetaFiltro}>Venta mínima</label>
      <input
        type="number"
        placeholder="0.00"
        value={filtros.venta_min}
        onChange={(e) =>
          setFiltros({
            ...filtros,
            venta_min: e.target.value,
          })
        }
        style={estiloInputFiltro}
      />
    </div>

    <div>
      <label style={estiloEtiquetaFiltro}>Venta máxima</label>
      <input
        type="number"
        placeholder="0.00"
        value={filtros.venta_max}
        onChange={(e) =>
          setFiltros({
            ...filtros,
            venta_max: e.target.value,
          })
        }
        style={estiloInputFiltro}
      />
    </div>
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      marginTop: "14px",
    }}
  >
    <button
      type="button"
      onClick={limpiarFiltros}
      style={{
        minHeight: "42px",
        padding: "0 22px",
        background: "#fff",
        border: "1px solid #bbb",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
      }}
    >
      Limpiar filtros
    </button>

    <button
      type="button"
      onClick={buscarCortes}
      style={{
        minHeight: "42px",
        padding: "0 26px",
        background: "#111",
        color: "#fff",
        border: "1px solid #111",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
      }}
    >
      Buscar
    </button>
  </div>
</div>

          {error && (
            <div
              style={{
                marginBottom: 15,
                color: "#b00020",
              }}
            >
              {error}
            </div>
          )}

          <TablaCortes
  cortes={cortes}
  cargando={cargando}
  onVer={verDetalle}
  onEditar={onEditarCorte}
  onCancelar={cancelarCorte}
  onReactivar={reactivarCorte}
/>
        </div>
      </div>

          <ModalDetalleCorte
    abierto={detalleAbierto}
    corte={corteSeleccionado}
    onCerrar={() => {
        setDetalleAbierto(false);
        setCorteSeleccionado(null);
    }}
/>

    </div>
  );
}

const estiloEtiquetaFiltro = {
  display: "block",
  marginBottom: "6px",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase",
  color: "#555",
};

const estiloInputFiltro = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "42px",
  padding: "10px 12px",
  border: "1px solid #d7d7d7",
  borderRadius: "8px",
  background: "#fff",
  fontSize: "14px",
};

export default GestionCortes;

