import React from "react";

function TablaCortes({
  cortes,
  cargando,
  onVer,
  onEditar,
}) {
  const formatearFecha = (fecha) => {
    if (!fecha) return "—";

    const [anio, mes, dia] = String(fecha)
      .split("T")[0]
      .split("-");

    if (!anio || !mes || !dia) return fecha;

    return `${dia}/${mes}/${anio}`;
  };

  const formatearMonto = (monto) =>
    Number(monto || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

  if (cargando) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          color: "#777",
        }}
      >
        Cargando cortes...
      </div>
    );
  }

  if (!cortes || cortes.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          background: "#fafafa",
          border: "1px dashed #ddd",
          borderRadius: "10px",
          color: "#777",
        }}
      >
        No se encontraron cortes con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid #e5e5e5",
        borderRadius: "10px",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "1150px",
          fontSize: "14px",
        }}
      >
        <thead>
          <tr style={{ background: "#f5f5f3" }}>
            {[
              "Fecha",
              "Folio",
              "Operador",
              "Venta ticket",
              "Total general",
              "Total cover",
              "Gastos de corte",
              "Reglamentos",
              "Diferencia",
              "Acciones",
            ].map((encabezado) => (
              <th
                key={encabezado}
                style={{
                  padding: "13px 12px",
                  textAlign:
                    [
                      "Venta ticket",
                      "Total general",
                      "Total cover",
                      "Gastos de corte",
                      "Reglamentos",
                      "Diferencia",
                    ].includes(encabezado)
                      ? "right"
                      : "left",
                  borderBottom: "1px solid #ddd",
                  whiteSpace: "nowrap",
                  color: "#333",
                }}
              >
                {encabezado}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {cortes.map((corte) => (
            <tr
              key={corte.id}
              style={{
                background: "#fff",
              }}
            >
              <td style={estiloCelda}>
                {formatearFecha(corte.fecha)}
              </td>

              <td
                style={{
                  ...estiloCelda,
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                }}
              >
                {corte.folio || "—"}
              </td>

              <td style={estiloCelda}>
                {corte.usuario_nombre || "Sin operador"}
              </td>

              <td style={estiloCeldaMonto}>
                {formatearMonto(corte.venta_ticket)}
              </td>

              <td style={estiloCeldaMonto}>
                {formatearMonto(corte.total_general)}
              </td>

              <td style={estiloCeldaMonto}>
                {formatearMonto(corte.total_cover)}
              </td>

              <td style={estiloCeldaMonto}>
                {formatearMonto(corte.gastos_corte)}
              </td>

              <td style={estiloCeldaMonto}>
                {formatearMonto(corte.reglamentos)}
              </td>

              <td style={estiloCeldaMonto}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "5px 9px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: "700",
                    background:
                      Number(corte.diferencia || 0) === 0
                        ? "#e8f5e9"
                        : "#fff3cd",
                    color:
                      Number(corte.diferencia || 0) === 0
                        ? "#256029"
                        : "#7a5a00",
                  }}
                >
                  {formatearMonto(corte.diferencia)}
                </span>
              </td>

              <td style={estiloCelda}>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <button
                    title="Ver detalle"
                    style={botonAccion}
                    onClick={() => onVer?.(corte)}
                  >
                    👁
                  </button>

                  <button
                    title="Editar corte"
                    style={botonAccion}
                    onClick={() => onEditar?.(corte)}
                  >
                    ✏
                  </button>

                  {corte.drive_folder_url && (
                    <button
                      title="Abrir Drive"
                      style={botonAccion}
                      onClick={() =>
                        window.open(
                          corte.drive_folder_url,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      📂
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const estiloCelda = {
  padding: "12px",
  borderBottom: "1px solid #eeeeee",
  verticalAlign: "top",
  color: "#333",
};

const estiloCeldaMonto = {
  ...estiloCelda,
  textAlign: "right",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const botonAccion = {
  width: 34,
  height: 34,
  border: "1px solid #ddd",
  background: "#fff",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
  transition: "0.15s",
};

export default TablaCortes;