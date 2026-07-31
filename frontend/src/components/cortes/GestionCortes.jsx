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

    const respuesta = await fetch(
      `${API_BASE_URL}/api/cortes?negocio_id=${negocioId}`
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    setCortes(resultado.cortes || []);
  } catch (error) {
    console.error(error);
    setError(error.message);
  } finally {
    setCargando(false);
  }
}, [negocioId]);

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
          <h2>Historial de cortes</h2>

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

export default GestionCortes;

