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
  const [vista, setVista] = useState("analisis");

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

  const coloresGraficas = [
  "#111111",
  "#8B7355",
  "#B08968",
  "#6B7280",
  "#D6CCC2",
  "#3F3F46",
];

const graficaBarras = ({
  titulo,
  descripcion,
  datos,
  etiquetaKey,
  valorKey,
  formatoValor = formatoMoneda,
}) => {
  const datosLimpios = Array.isArray(datos) ? datos : [];

  const maximo = Math.max(
    ...datosLimpios.map((item) => Number(item[valorKey]) || 0),
    1
  );

  return (
    <div
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: "14px",
        padding: "22px",
        background: "#fff",
        boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "4px" }}>{titulo}</h3>

      {descripcion && (
        <p style={{ marginTop: 0, color: "#777", fontSize: "13px" }}>
          {descripcion}
        </p>
      )}

      {datosLimpios.length === 0 ? (
        <p style={{ color: "#999" }}>Sin datos para graficar.</p>
      ) : (
        datosLimpios.map((item, index) => {
          const valor = Number(item[valorKey]) || 0;
          const ancho = maximo > 0 ? (valor / maximo) * 100 : 0;
          const color = coloresGraficas[index % coloresGraficas.length];

          return (
            <div key={index} style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "6px",
                  fontSize: "13px",
                }}
              >
                <strong>{item[etiquetaKey] || "Sin dato"}</strong>
                <span>{formatoValor(valor)}</span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: "14px",
                  background: "#f1f1f1",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${ancho}%`,
                    minWidth: valor > 0 ? "6px" : "0",
                    height: "100%",
                    background: color,
                    borderRadius: "999px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

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
          <div
  style={{
    display: "flex",
    gap: "8px",
    marginTop: "18px",
  }}
>
  <button
    onClick={() => setVista("analisis")}
    style={{
      padding: "12px 20px",
      background: vista === "analisis" ? "#000" : "#fff",
      color: vista === "analisis" ? "#fff" : "#000",
      border: "1px solid #000",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    Análisis escrito
  </button>

  <button
    onClick={() => setVista("graficas")}
    style={{
      padding: "12px 20px",
      background: vista === "graficas" ? "#000" : "#fff",
      color: vista === "graficas" ? "#fff" : "#000",
      border: "1px solid #000",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    Gráficas
  </button>
</div>
        </div>

       {!analisis ? (
  <p>Cargando análisis...</p>
) : vista === "graficas" ? (
  <>
    <h3>Gráficas financieras</h3>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
        gap: "22px",
        marginBottom: "30px",
      }}
    >
      {graficaBarras({
        titulo: "Egresos por categoría",
        descripcion: "Distribución de gastos agrupados por categoría.",
        datos: analisis.egresos_por_categoria,
        etiquetaKey: "categoria",
        valorKey: "total",
      })}

      {graficaBarras({
        titulo: "Egresos por tipo",
        descripcion: "Comparación entre efectivo, banco y banca.",
        datos: analisis.egresos_por_tipo,
        etiquetaKey: "tipo_egreso",
        valorKey: "total",
      })}

      {graficaBarras({
        titulo: "Inversiones por socio",
        descripcion: "Capital aportado por cada socio en el periodo.",
        datos: analisis.inversiones_por_socio,
        etiquetaKey: "socio",
        valorKey: "total",
      })}

      {graficaBarras({
        titulo: "Resultado neto por socio",
        descripcion:
          "Utilidad asignada más inversión aportada por cada socio.",
        datos: analisis.distribucion_socios,
        etiquetaKey: "socio",
        valorKey: "resultado_neto",
      })}
    </div>
  </>
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