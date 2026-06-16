import React, { useCallback, useEffect, useState } from "react";
import estilos from "../styles/estilos";
import API_BASE_URL from "../config/api";
import { exportarExcelAnalisisFinanciero } from "../utils/exportExcel";

function AnalisisFinanciero({ usuarioActivo, onVolver }) {
  const hoy = new Date().toISOString().split("T")[0];

  const primerDiaMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
    .toISOString()
    .split("T")[0];

  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [analisis, setAnalisis] = useState(null);
  const [cargando, setCargando] = useState(false);

  const formatoMoneda = (valor) => {
    return Number(valor || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    });
  };

  const formatoPorcentaje = (valor) => {
  return `${Number(valor || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
};

  const cargarAnalisis = useCallback(async () => {
  try {
    setCargando(true);

    const respuesta = await fetch(
      `${API_BASE_URL}/api/analisis-financiero?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(resultado.error || "Error al cargar análisis.");
    }

    setAnalisis(resultado);
  } catch (error) {
    alert("🚨 Error cargando análisis: " + error.message);
  } finally {
    setCargando(false);
  }
}, [fechaInicio, fechaFin]);

  useEffect(() => {
  cargarAnalisis();
}, [cargarAnalisis]);

  const resumen = analisis?.resumen || {};
  const ingresos = analisis?.ingresos || {};

  const descargarExcel = () => {
  exportarExcelAnalisisFinanciero({
    analisis,
    fechaInicio,
    fechaFin,
  });
};

  const tarjeta = (titulo, valor, subtitulo, fondo = "#f9f9f9") => (
    <div
      style={{
        background: fondo,
        border: "1px solid #e5e5e5",
        borderRadius: "12px",
        padding: "18px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: "#777",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "8px",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          fontSize: "26px",
          fontWeight: "600",
          color: "#000",
        }}
      >
        {formatoMoneda(valor)}
      </div>

      {subtitulo && (
        <div
          style={{
            fontSize: "12px",
            color: "#777",
            marginTop: "6px",
          }}
        >
          {subtitulo}
        </div>
      )}
    </div>
  );

  return (
    <div style={estilos.container}>
      <div style={{ ...estilos.card, maxWidth: "1200px", width: "95%" }}>
        <button onClick={onVolver}>← Volver</button>

        <h1>Análisis Financiero</h1>

        <p>Operador: {usuarioActivo}</p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "25px",
            padding: "15px",
            background: "#fafafa",
            borderRadius: "10px",
            border: "1px solid #eee",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: "12px" }}>
              Fecha inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={estilos.input}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px" }}>
              Fecha fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={estilos.input}
            />
          </div>

          <button
            onClick={cargarAnalisis}
            disabled={cargando}
            style={{
              padding: "12px 24px",
              marginTop: "18px",
              background: cargando ? "#999" : "#000",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: cargando ? "not-allowed" : "pointer",
            }}
          >
            {cargando ? "Cargando..." : "Actualizar análisis"}
          </button>

<button
  onClick={descargarExcel}
  disabled={!analisis}
  style={{
    padding: "12px 24px",
    marginTop: "18px",
    background: "#fff",
    color: "#000",
    border: "1px solid #000",
    borderRadius: "8px",
    cursor: !analisis ? "not-allowed" : "pointer",
  }}
>
  Descargar Excel
</button>
          
        </div>

        {!analisis ? (
          <p>Cargando análisis...</p>
        ) : (
          <>
            <h3>Resumen general</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "15px",
                marginBottom: "30px",
              }}
            >
              {tarjeta(
                "Ingresos",
                resumen.total_ingresos,
                "Cortes de caja registrados"
              )}

              {tarjeta(
                "Egresos",
                resumen.total_egresos,
                "Todos los egresos registrados"
              )}

              {tarjeta(
                "Nómina",
                resumen.total_nomina,
                "Egresos generados por prenómina"
              )}

              {tarjeta(
                "Egresos operativos",
                resumen.total_egresos_operativos,
                "Egresos sin nómina"
              )}

              {tarjeta(
                "Inversiones socios",
                resumen.total_inversiones_socios,
                "Capital ingresado por socios",
                "#eef7ff"
              )}

              {tarjeta(
                "Utilidad operativa",
                resumen.utilidad_operativa,
                "Ingresos menos egresos",
                resumen.utilidad_operativa >= 0 ? "#f2fff4" : "#fff4f4"
              )}

              {tarjeta(
                "Flujo con inversiones",
                resumen.flujo_con_inversiones,
                "Utilidad operativa + inversiones",
                "#f6f6ff"
              )}

<div
  style={{
    background: "#fffaf0",
    border: "1px solid #e5e5e5",
    borderRadius: "12px",
    padding: "18px",
  }}
>
  <div
    style={{
      fontSize: "10px",
      color: "#777",
      textTransform: "uppercase",
      letterSpacing: "1px",
      marginBottom: "8px",
    }}
  >
    Margen de ganancia
  </div>

  <div
    style={{
      fontSize: "26px",
      fontWeight: "600",
      color: "#000",
    }}
  >
    {formatoPorcentaje(resumen.margen_ganancia)}
  </div>

  <div style={{ fontSize: "12px", color: "#777", marginTop: "6px" }}>
    Utilidad operativa / ingresos
  </div>
</div>

<div
  style={{
    background: "#fffaf0",
    border: "1px solid #e5e5e5",
    borderRadius: "12px",
    padding: "18px",
  }}
>
  <div
    style={{
      fontSize: "10px",
      color: "#777",
      textTransform: "uppercase",
      letterSpacing: "1px",
      marginBottom: "8px",
    }}
  >
    % egresos sobre ingresos
  </div>

  <div
    style={{
      fontSize: "26px",
      fontWeight: "600",
      color: "#000",
    }}
  >
    {formatoPorcentaje(resumen.porcentaje_egresos)}
  </div>

  <div style={{ fontSize: "12px", color: "#777", marginTop: "6px" }}>
    Egresos / ingresos
  </div>
</div>

<div
  style={{
    background: "#fffaf0",
    border: "1px solid #e5e5e5",
    borderRadius: "12px",
    padding: "18px",
  }}
>
  <div
    style={{
      fontSize: "10px",
      color: "#777",
      textTransform: "uppercase",
      letterSpacing: "1px",
      marginBottom: "8px",
    }}
  >
    % nómina sobre egresos
  </div>

  <div
    style={{
      fontSize: "26px",
      fontWeight: "600",
      color: "#000",
    }}
  >
    {formatoPorcentaje(resumen.porcentaje_nomina_sobre_egresos)}
  </div>

  <div style={{ fontSize: "12px", color: "#777", marginTop: "6px" }}>
    Nómina / egresos
  </div>
</div>

<div
  style={{
    background: "#fffaf0",
    border: "1px solid #e5e5e5",
    borderRadius: "12px",
    padding: "18px",
  }}
>
  <div
    style={{
      fontSize: "10px",
      color: "#777",
      textTransform: "uppercase",
      letterSpacing: "1px",
      marginBottom: "8px",
    }}
  >
    % egresos operativos
  </div>

  <div
    style={{
      fontSize: "26px",
      fontWeight: "600",
      color: "#000",
    }}
  >
    {formatoPorcentaje(
      resumen.porcentaje_egresos_operativos_sobre_egresos
    )}
  </div>

  <div style={{ fontSize: "12px", color: "#777", marginTop: "6px" }}>
    Egresos operativos / egresos
  </div>
</div>

            </div>

            <h3>Detalle de ingresos</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
                marginBottom: "30px",
              }}
            >
              {tarjeta("Cover", ingresos.total_cover)}
              {tarjeta("Tarjetas", ingresos.total_tarjetas)}
              {tarjeta("Vales", ingresos.total_vales)}
              {tarjeta("CxC", ingresos.total_cxc)}
              {tarjeta("Efectivo MXN", ingresos.total_efectivo_mxn)}
              {tarjeta("USD convertido a MXN", ingresos.total_efectivo_usd_mxn)}
              {tarjeta("Venta ticket", ingresos.total_venta_ticket)}
              {tarjeta("Diferencia", ingresos.total_diferencia)}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "25px",
              }}
            >
              <div>
                <h3>Egresos por categoría</h3>

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
                      <th>Categoría</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {analisis.egresos_por_categoria.length === 0 ? (
                      <tr>
                        <td colSpan="2" style={{ textAlign: "center" }}>
                          Sin egresos.
                        </td>
                      </tr>
                    ) : (
                      analisis.egresos_por_categoria.map((item, index) => (
                        <tr key={index}>
                          <td>{item.categoria}</td>
                          <td>{formatoMoneda(item.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <h3>Egresos por tipo</h3>

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
                      <th>Tipo</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {analisis.egresos_por_tipo.length === 0 ? (
                      <tr>
                        <td colSpan="2" style={{ textAlign: "center" }}>
                          Sin egresos.
                        </td>
                      </tr>
                    ) : (
                      analisis.egresos_por_tipo.map((item, index) => (
                        <tr key={index}>
                          <td>{item.tipo_egreso}</td>
                          <td>{formatoMoneda(item.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <h3>Inversiones por socio</h3>

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
                      <th>Socio</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {analisis.inversiones_por_socio.length === 0 ? (
                      <tr>
                        <td colSpan="2" style={{ textAlign: "center" }}>
                          Sin inversiones.
                        </td>
                      </tr>
                    ) : (
                      analisis.inversiones_por_socio.map((item, index) => (
                        <tr key={index}>
                          <td>{item.socio || "Sin socio"}</td>
                          <td>{formatoMoneda(item.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                           </div>

              <div>
                <h3>Distribución por socio</h3>

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
                      <th>Socio</th>
                      <th>% Participación</th>
                      <th>Utilidad asignada</th>
                      <th>Inversión aportada</th>
                      <th>Resultado neto</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(analisis.distribucion_socios || []).length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center" }}>
                          Sin distribución de socios.
                        </td>
                      </tr>
                    ) : (
                      (analisis.distribucion_socios || []).map((item, index) => (
                        <tr key={index}>
                          <td>{item.socio}</td>
                          <td>{formatoPorcentaje(item.porcentaje_participacion)}</td>
                          <td>{formatoMoneda(item.utilidad_asignada)}</td>
                          <td>{formatoMoneda(item.inversion_aportada)}</td>
                          <td>{formatoMoneda(item.resultado_neto)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AnalisisFinanciero;