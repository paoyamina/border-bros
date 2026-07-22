import React from "react";

function TablaEgresos({
  egresos,
  cargando,
  onVer,
  onEditar,
}) {
  const formatearFecha = (fecha) => {
    if (!fecha) return "—";

    const [anio, mes, dia] = String(fecha).split("T")[0].split("-");

    if (!anio || !mes || !dia) return fecha;

    return `${dia}/${mes}/${anio}`;
  };

  const formatearMonto = (monto) =>
    Number(monto || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

  const formatearTipo = (tipo) => {
    const tipos = {
      efectivo: "Efectivo",
      bancos: "Bancos",
      banca: "Banca",
    };

    return tipos[tipo] || tipo || "Sin tipo";
  };

  const obtenerEstiloTipo = (tipo) => {
    const estilos = {
      efectivo: {
        background: "#e8f5e9",
        color: "#256029",
      },
      bancos: {
        background: "#e8f1ff",
        color: "#1f4f91",
      },
      banca: {
        background: "#f3e8ff",
        color: "#6941a5",
      },
    };

    return estilos[tipo] || {
      background: "#eeeeee",
      color: "#555",
    };
  };

  if (cargando) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          color: "#777",
        }}
      >
        Cargando movimientos...
      </div>
    );
  }

  if (egresos.length === 0) {
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
        No se encontraron egresos con los filtros seleccionados.
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
          minWidth: "1050px",
          fontSize: "14px",
        }}
      >
        <thead>
          <tr style={{ background: "#f5f5f3" }}>
            {
            [
                "Fecha",
                "Tipo",
                "Categoría",
                "Proveedor",
                "Concepto",
                "Referencia",
                "Monto",
                "Estatus",
                "Acciones",
                ]
            .map((encabezado) => (
              <th
                key={encabezado}
                style={{
                  padding: "13px 12px",
                  textAlign:
                    encabezado === "Monto" ? "right" : "left",
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
          {egresos.map((egreso) => {
            const cancelado = egreso.estatus === "CANCELADO";

            return (
              <tr
                key={egreso.id}
                style={{
                  opacity: cancelado ? 0.55 : 1,
                  background: "#fff",
                }}
              >
                <td style={estiloCelda}>
                  {formatearFecha(egreso.fecha)}
                </td>

                <td style={estiloCelda}>
                  <span
                    style={{
                      ...obtenerEstiloTipo(egreso.tipo_egreso),
                      display: "inline-block",
                      padding: "5px 9px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    {formatearTipo(egreso.tipo_egreso)}
                  </span>
                </td>

                <td style={estiloCelda}>
                  {egreso.categoria || "Sin categoría"}
                </td>

                <td style={estiloCelda}>
                  {egreso.proveedor || "Sin proveedor"}
                </td>

                <td
                  style={{
                    ...estiloCelda,
                    maxWidth: "260px",
                  }}
                >
                  {egreso.concepto || "—"}
                </td>

                <td style={estiloCelda}>
                  {egreso.referencia || "—"}
                </td>

                <td
                  style={{
                    ...estiloCelda,
                    textAlign: "right",
                    fontWeight: "700",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatearMonto(egreso.monto_mxn)}
                </td>

                <td style={estiloCelda}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "5px 9px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: cancelado ? "#fdeaea" : "#e8f5e9",
                      color: cancelado ? "#a02020" : "#256029",
                    }}
                  >
                    {egreso.estatus || "REGISTRADO"}
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
      onClick={() => onVer?.(egreso)}
    >
      👁
    </button>

    <button
  title={cancelado ? "No se puede editar un egreso cancelado" : "Editar"}
  style={{
    ...botonAccion,
    cursor: cancelado ? "not-allowed" : "pointer",
    opacity: cancelado ? 0.4 : 1,
  }}
  disabled={cancelado}
  onClick={() => onEditar?.(egreso)}
>
  ✏
</button>

    <button
      title="Cancelar"
      style={botonAccion}
      onClick={() => {
        console.log("Cancelar", egreso);
      }}
    >
      🚫
    </button>

    {egreso.drive_folder_url && (
      <button
        title="Abrir Drive"
        style={botonAccion}
        onClick={() =>
          window.open(egreso.drive_folder_url, "_blank")
        }
      >
        📂
      </button>
    )}
  </div>
</td>
              </tr>
            );
          })}
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

export default TablaEgresos;