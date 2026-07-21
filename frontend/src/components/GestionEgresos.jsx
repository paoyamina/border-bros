import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config/api";
import FiltrosEgresos from "./egresos/FiltrosEgresos";
import TablaEgresos from "./egresos/TablaEgresos";
import { obtenerEgresos } from "../services/egresosService.js";
import ModalDetalleEgreso from "./egresos/ModalDetalleEgreso";

const filtrosIniciales = {
  fecha_inicio: "",
  fecha_fin: "",
  tipo_egreso: "",
  categoria_id: "",
  proveedor_id: "",
  concepto: "",
  referencia: "",
  estatus: "",
};

function GestionEgresos({
  usuarioActivo,
  rol,
  negocioId,
  onSeleccionarTipo,
  onVolver,
}) {

    console.log("DATOS GESTION EGRESOS:", {
  negocioId,
  usuarioActivo,
  rol,
});

  const [egresos, setEgresos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [detalleAbierto, setDetalleAbierto] = useState(false);
const [egresoSeleccionado, setEgresoSeleccionado] = useState(null);

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

  const cargarCatalogos = async () => {
    if (!negocioId) return;

    try {
      const [respuestaCategorias, respuestaProveedores] =
        await Promise.all([
          fetch(
            `${API_BASE_URL}/api/categorias?negocio_id=${negocioId}`
          ),
          fetch(
            `${API_BASE_URL}/api/proveedores?negocio_id=${negocioId}`
          ),
        ]);

      const resultadoCategorias =
        await respuestaCategorias.json();

      const resultadoProveedores =
        await respuestaProveedores.json();

      if (resultadoCategorias.success) {
        setCategorias(resultadoCategorias.categorias || []);
      }

      if (resultadoProveedores.success) {
        setProveedores(resultadoProveedores.proveedores || []);
      }
    } catch (errorCatalogos) {
      console.error(
        "Error cargando catálogos de egresos:",
        errorCatalogos
      );
    }
  };

  const cargarEgresos = async (filtrosAplicados = filtros) => {
    if (!negocioId) {
      setError("No se encontró el negocio activo.");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const movimientos = await obtenerEgresos(
        negocioId,
        filtrosAplicados
      );

      setEgresos(movimientos);
    } catch (errorCarga) {
      console.error("Error cargando egresos:", errorCarga);
      setError(errorCarga.message);
      setEgresos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!negocioId) return;

    cargarCatalogos();
    cargarEgresos(filtrosIniciales);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocioId]);

  useEffect(() => {
  const actualizarTabla = () => {
    cargarEgresos();
  };

  window.addEventListener("egresoActualizado", actualizarTabla);

  return () => {
    window.removeEventListener(
      "egresoActualizado",
      actualizarTabla
    );
  };
}, [negocioId]);

  const cambiarFiltro = (evento) => {
    const { name, value } = evento.target;

    setFiltros((anteriores) => ({
      ...anteriores,
      [name]: value,
    }));
  };

  const buscar = () => {
    cargarEgresos(filtros);
  };

  const limpiarFiltros = () => {
    setFiltros(filtrosIniciales);
    cargarEgresos(filtrosIniciales);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f7f5",
        fontFamily:
          '"Helvetica Neue", Helvetica, Arial, sans-serif',
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
              Gestión de egresos
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
          <div style={{ marginBottom: "20px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                color: "#111",
              }}
            >
              Registrar nuevo egreso
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#777",
                fontSize: "14px",
              }}
            >
              Selecciona el tipo de egreso que deseas capturar.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                onSeleccionarTipo("egresos_caja")
              }
              style={estiloBotonTipo}
            >
              <div
                style={{
                  fontSize: "17px",
                  marginBottom: "6px",
                }}
              >
                Efectivo
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#777",
                  fontWeight: "400",
                }}
              >
                Egresos pagados directamente desde caja.
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                onSeleccionarTipo("egresos_bancos")
              }
              style={estiloBotonTipo}
            >
              <div
                style={{
                  fontSize: "17px",
                  marginBottom: "6px",
                }}
              >
                Bancos
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#777",
                  fontWeight: "400",
                }}
              >
                Movimientos realizados desde cuentas bancarias.
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                onSeleccionarTipo("egresos_banca")
              }
              style={estiloBotonTipo}
            >
              <div
                style={{
                  fontSize: "17px",
                  marginBottom: "6px",
                }}
              >
                Banca
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#777",
                  fontWeight: "400",
                }}
              >
                Operaciones registradas desde banca electrónica.
              </div>
            </button>
          </div>
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
              alignItems: "flex-start",
              gap: "12px",
              marginBottom: "18px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: "20px",
                  color: "#111",
                }}
              >
                Movimientos registrados
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#777",
                  fontSize: "14px",
                }}
              >
                Consulta los egresos registrados para el negocio
                activo.
              </p>
            </div>

            <div
              style={{
                padding: "7px 11px",
                background: "#f3f3f1",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#444",
              }}
            >
              {egresos.length} movimiento
              {egresos.length === 1 ? "" : "s"}
            </div>
          </div>

          <FiltrosEgresos
            filtros={filtros}
            categorias={categorias}
            proveedores={proveedores}
            cargando={cargando}
            onCambiar={cambiarFiltro}
            onBuscar={buscar}
            onLimpiar={limpiarFiltros}
          />

          {error && (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px",
                background: "#fdeaea",
                border: "1px solid #f2bcbc",
                borderRadius: "8px",
                color: "#9d1c1c",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <TablaEgresos
  egresos={egresos}
  cargando={cargando}
  onVer={(egreso) => {
    setEgresoSeleccionado(egreso);
    setDetalleAbierto(true);
  }}
/>
        </div>
      </div>

      <ModalDetalleEgreso
  abierto={detalleAbierto}
  egreso={egresoSeleccionado}
  onCerrar={() => {
    setDetalleAbierto(false);
    setEgresoSeleccionado(null);
  }}
/>
    </div>
  );
}

export default GestionEgresos;