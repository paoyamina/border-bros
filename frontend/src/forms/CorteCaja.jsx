import React, { useState } from "react";
import estilos from "../styles/estilos";
import { API_ENDPOINTS } from "../config/api";
import { generarFolio } from "../utils/folios";
import { exportarExcelCorte } from "../utils/exportExcel";

function CorteCaja({ usuarioActivo, onVolver }) {
  const denomMXN = [1000, 500, 200, 100, 50, 20, 10, 5];
  const denomUSD = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.25];

  const [secciones, setSecciones] = useState({
  mxn: false,
  usd: false,
  cover_mxn: false,
  cover_usd: false,
  vales: false,
  cxc: false,
});

  const [cantidades, setCantidades] = useState({});
  const [tc, setTc] = useState(17.5);
  const [fechaReporte, setFechaReporte] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [nombreReporte, setNombreReporte] = useState(generarFolio("CORTE"));
  const [iniciales, setIniciales] = useState("");

  const [valesRows, setValesRows] = useState([
    { id: Date.now(), concepto: "", monto: "" },
  ]);

  const [cxcRows, setCxcRows] = useState([
    { id: Date.now(), nombre: "", monto: "" },
  ]);

  const [fotosTicket, setFotosTicket] = useState([]);
  const [fotosOtros, setFotosOtros] = useState([]);

  const calcularMXN = () => {
    let total = 0;
    denomMXN.forEach((v) => {
      total += v * (parseInt(cantidades[`mxn_${v}`]) || 0);
    });
    total += parseFloat(cantidades.monedas_mxn) || 0;
    return total;
  };

  const calcularUSD = () => {
    let total = 0;
    denomUSD.forEach((v) => {
      total += v * (parseInt(cantidades[`usd_${v}`]) || 0);
    });
    total += parseFloat(cantidades.centavos_usd) || 0;
    total += parseFloat(cantidades.monedas_usd_extra) || 0;
    return total;
  };

const calcularCoverMXN = () => {
  let total = 0;

  denomMXN.forEach((v) => {
    total += v * (parseInt(cantidades[`cover_mxn_${v}`]) || 0);
  });

  total += parseFloat(cantidades.cover_monedas_mxn) || 0;

  return total;
};

const calcularCoverUSD = () => {
  let total = 0;

  denomUSD.forEach((v) => {
    total += v * (parseInt(cantidades[`cover_usd_${v}`]) || 0);
  });

  total += parseFloat(cantidades.cover_monedas_usd_extra) || 0;

  return total;
};

const obtenerDenominacionesCorte = () => {
  const detalle = [];

  denomMXN.forEach((valor) => {
    const cantidad = parseInt(cantidades[`mxn_${valor}`]) || 0;

    if (cantidad > 0) {
      detalle.push({
        moneda: "MXN",
        valor,
        cantidad,
        tipo_ingreso: "Normal",
        concepto: `MXN ${valor}`,
        monto_original: valor * cantidad,
        monto_mxn: valor * cantidad,
      });
    }
  });

  denomUSD.forEach((valor) => {
    const cantidad = parseInt(cantidades[`usd_${valor}`]) || 0;

    if (cantidad > 0) {
      detalle.push({
        moneda: "USD",
        valor,
        cantidad,
        tipo_ingreso: "Normal",
        concepto: `USD ${valor}`,
        monto_original: valor * cantidad,
        monto_mxn: valor * cantidad * tc,
      });
    }
  });

  denomMXN.forEach((valor) => {
    const cantidad = parseInt(cantidades[`cover_mxn_${valor}`]) || 0;

    if (cantidad > 0) {
      detalle.push({
        moneda: "MXN",
        valor,
        cantidad,
        tipo_ingreso: "Cover",
        concepto: `Cover MXN ${valor}`,
        monto_original: valor * cantidad,
        monto_mxn: valor * cantidad,
      });
    }
  });

  denomUSD.forEach((valor) => {
    const cantidad = parseInt(cantidades[`cover_usd_${valor}`]) || 0;

    if (cantidad > 0) {
      detalle.push({
        moneda: "USD",
        valor,
        cantidad,
        tipo_ingreso: "Cover",
        concepto: `Cover USD ${valor}`,
        monto_original: valor * cantidad,
        monto_mxn: valor * cantidad * tc,
      });
    }
  });

  const otrosMXN = parseFloat(cantidades.monedas_mxn) || 0;

  if (otrosMXN > 0) {
    detalle.push({
      moneda: "MXN",
      valor: 0,
      cantidad: 1,
      tipo_ingreso: "Normal",
      concepto: "Monedas pequeñas / otros MXN",
      monto_original: otrosMXN,
      monto_mxn: otrosMXN,
    });
  }

  const otrosUSD = parseFloat(cantidades.monedas_usd_extra) || 0;

  if (otrosUSD > 0) {
    detalle.push({
      moneda: "USD",
      valor: 0,
      cantidad: 1,
      tipo_ingreso: "Normal",
      concepto: "Monedas pequeñas / otros USD",
      monto_original: otrosUSD,
      monto_mxn: otrosUSD * tc,
    });
  }

  const otrosCoverMXN = parseFloat(cantidades.cover_monedas_mxn) || 0;

  if (otrosCoverMXN > 0) {
    detalle.push({
      moneda: "MXN",
      valor: 0,
      cantidad: 1,
      tipo_ingreso: "Cover",
      concepto: "Monedas pequeñas / otros cover MXN",
      monto_original: otrosCoverMXN,
      monto_mxn: otrosCoverMXN,
    });
  }

  const otrosCoverUSD =
    parseFloat(cantidades.cover_monedas_usd_extra) || 0;

  if (otrosCoverUSD > 0) {
    detalle.push({
      moneda: "USD",
      valor: 0,
      cantidad: 1,
      tipo_ingreso: "Cover",
      concepto: "Monedas pequeñas / otros cover USD",
      monto_original: otrosCoverUSD,
      monto_mxn: otrosCoverUSD * tc,
    });
  }

  return detalle;
};

  const totalVales = valesRows.reduce(
    (acc, row) => acc + (parseFloat(row.monto) || 0),
    0
  );

  const totalCxC = cxcRows.reduce(
    (acc, row) => acc + (parseFloat(row.monto) || 0),
    0
  );

const totalTarjetas = parseFloat(cantidades.tarjetas) || 0;
const coverTPV = parseFloat(cantidades.cover_tpv) || 0;
const montoVentaMeta = parseFloat(cantidades.monto_meta) || 0;

const usdEnMxn = calcularUSD() * tc;
const coverUsdEnMxn = calcularCoverUSD() * tc;

const totalCover =
  calcularCoverMXN() + coverUsdEnMxn + coverTPV;

const totalGlobalMXN =
  calcularMXN() +
  usdEnMxn +
  calcularCoverMXN() +
  coverUsdEnMxn +
  coverTPV +
  totalTarjetas +
  totalVales +
  totalCxC;

const diferencia = totalGlobalMXN - montoVentaMeta;

  const addRow = (tipo) => {
    const newRow = {
      id: Date.now(),
      [tipo === "vales" ? "concepto" : "nombre"]: "",
      monto: "",
    };

    if (tipo === "vales") {
      setValesRows([...valesRows, newRow]);
    } else {
      setCxcRows([...cxcRows, newRow]);
    }
  };

  const updateRow = (id, tipo, field, value) => {
    if (tipo === "vales") {
      setValesRows(
        valesRows.map((row) =>
          row.id === id ? { ...row, [field]: value } : row
        )
      );
    } else {
      setCxcRows(
        cxcRows.map((row) =>
          row.id === id ? { ...row, [field]: value } : row
        )
      );
    }
  };

  const handlePhotoUpload = (e, tipo) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (tipo === "ticket") {
      setFotosTicket((prev) => [...prev, ...files]);
    } else {
      setFotosOtros((prev) => [...prev, ...files]);
    }
  };

  const descargarExcel = () => {
  exportarExcelCorte({
    fechaReporte,
    nombreReporte,
    usuarioActivo,
    iniciales: iniciales.toUpperCase(),

    calcularMXN,
    calcularUSD,
    calcularCoverMXN,
    calcularCoverUSD,

    tc,
    coverTPV,
    totalCover,

    totalTarjetas,
    totalVales,
    totalCxC,
    totalGlobalMXN,
    montoVentaMeta,
    diferencia,
    valesRows,
    cxcRows,
  });
};

  const enviarADriveYExcel = async () => {
    if (montoVentaMeta <= 0) {
      alert("⚠️ Debes ingresar el total del ticket.");
      return;
    }

    if (diferencia !== 0 && !iniciales.trim()) {
      alert("⚠️ Debes confirmar la diferencia con tus iniciales.");
      return;
    }

    if (fotosTicket.length === 0) {
      const continuarSinTicket = window.confirm(
        "⚠️ No agregaste foto del ticket. ¿Deseas continuar de todos modos?"
      );

      if (!continuarSinTicket) return;
    }

    const confirmar = window.confirm(`
¿DESEAS GUARDAR ESTE CORTE?

Folio: ${nombreReporte}
Operador: ${usuarioActivo}
Total en caja: $${totalGlobalMXN.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
Venta ticket: $${montoVentaMeta.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
Diferencia: $${diferencia.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}

Al aceptar, se descargará el Excel local y se enviarán las fotos a Drive.
`);

    if (!confirmar) return;

    try {
      descargarExcel();

      const formData = new FormData();

      formData.append("nombreCarpeta", `Corte_${fechaReporte}_${nombreReporte}`);
      formData.append("usuario", usuarioActivo);

      formData.append(
        "detalles",
        JSON.stringify({
          tipo: "CORTE_CAJA",
          fecha: fechaReporte,
          folio: nombreReporte,
          cajero: usuarioActivo,
          responsable: iniciales.toUpperCase(),
          efectivoMXN: calcularMXN(),
efectivoUSD: calcularUSD(),
tipoCambio: tc,

coverEfectivo: calcularCoverMXN(),
coverUSD: calcularCoverUSD(),
coverTPV,
totalCover,

totalTarjetas,
          totalVales,
          totalCxC,
          totalGlobalMXN,
          ventaTicket: montoVentaMeta,
          diferencia,
          denominaciones: obtenerDenominacionesCorte(),
          vales: valesRows,
          cxc: cxcRows,
        })
      );

      const todasLasFotos = [...fotosTicket, ...fotosOtros];

      todasLasFotos.forEach((file) => {
        formData.append("fotos", file);
      });

      const respuesta = await fetch(API_ENDPOINTS.guardarReporte, {
        method: "POST",
        body: formData,
      });

      const resultado = await respuesta.json();

      if (!resultado.success) {
        throw new Error(resultado.error || "Error desconocido en servidor.");
      }

      alert("✅ Corte guardado correctamente.");
      onVolver();
    } catch (error) {
      console.error("Error al guardar corte:", error);
      alert("🚨 Error al guardar corte: " + error.message);
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <button
          onClick={onVolver}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            marginBottom: "20px",
            fontSize: "12px",
            textTransform: "uppercase",
          }}
        >
          ← Volver al menú
        </button>

        <div style={estilos.logoSpace}>
          <img
            src="/Logo_BOSSE.png"
            alt="BOSSE"
            style={{
              maxHeight: "150px",
              marginBottom: "25px",
              display: "block",
              margin: "0 auto",
            }}
          />

          <h1 style={estilos.h1}>Corte de caja diario BOSSE</h1>

          <div
            style={{
              marginTop: "10px",
              fontSize: "10px",
              color: "#000",
              fontWeight: "700",
              letterSpacing: "1px",
            }}
          >
            OPERADOR: {usuarioActivo}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "30px",
            padding: "15px",
            background: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <div>
            <label style={estilos.panelLabel}>FECHA</label>
            <input
              type="date"
              value={fechaReporte}
              onChange={(e) => setFechaReporte(e.target.value)}
              style={{ ...estilos.input, width: "95%" }}
            />
          </div>

          <div>
            <label style={estilos.panelLabel}>FOLIO AUTOMÁTICO EDITABLE</label>
            <input
              type="text"
              value={nombreReporte}
              onChange={(e) => setNombreReporte(e.target.value || "Reporte")}
              style={{ ...estilos.input, width: "95%" }}
            />
          </div>
        </div>

        <div style={estilos.panelGrid}>
          <div
            style={{
              ...estilos.panelItem,
              border: "1px solid #2ecc71",
              background: "#f0fff4",
            }}
          >
            <span style={{ ...estilos.panelLabel, color: "#27ae60" }}>
              EFECTIVO MXN
            </span>
            <div
              style={{
                ...estilos.panelMonto,
                color: "#27ae60",
                fontSize: "22px",
              }}
            >
              $
              {calcularMXN().toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div
            style={{
              ...estilos.panelItem,
              border: "1px solid #2ecc71",
              background: "#f0fff4",
            }}
          >
            <span style={{ ...estilos.panelLabel, color: "#27ae60" }}>
              DÓLARES (USD)
            </span>

            <div
              style={{
                ...estilos.panelMonto,
                color: "#27ae60",
                fontSize: "20px",
              }}
            >
              ${calcularUSD().toLocaleString()} USD
            </div>

            <div style={{ fontSize: "10px", color: "#27ae60", marginTop: "5px" }}>
              TC: <strong>{tc}</strong> |{" "}
              <strong>
                $
                {usdEnMxn.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}{" "}
                MXN
              </strong>
            </div>
          </div>

          <div style={{ ...estilos.panelItem, gridColumn: "span 2" }}>
            <span style={estilos.panelLabel}>TOTAL TARJETAS (TPV)</span>
            <div style={{ ...estilos.panelMonto }}>
              ${totalTarjetas.toLocaleString()}
            </div>
          </div>

          <div
  style={{
    ...estilos.panelItem,
    border: "1px solid #3498db",
    background: "#eef7ff",
  }}
>
  <span style={{ ...estilos.panelLabel, color: "#2980b9" }}>
    COVER EFECTIVO MXN
  </span>
  <div
    style={{
      ...estilos.panelMonto,
      color: "#2980b9",
      fontSize: "22px",
    }}
  >
    $
    {calcularCoverMXN().toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
  </div>
</div>

<div
  style={{
    ...estilos.panelItem,
    border: "1px solid #3498db",
    background: "#eef7ff",
  }}
>
  <span style={{ ...estilos.panelLabel, color: "#2980b9" }}>
    COVER DÓLARES (USD)
  </span>

  <div
    style={{
      ...estilos.panelMonto,
      color: "#2980b9",
      fontSize: "20px",
    }}
  >
    ${calcularCoverUSD().toLocaleString()} USD
  </div>

  <div style={{ fontSize: "10px", color: "#2980b9", marginTop: "5px" }}>
    TC: <strong>{tc}</strong> |{" "}
    <strong>
      $
      {coverUsdEnMxn.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
      })}{" "}
      MXN
    </strong>
  </div>
</div>

<div
  style={{
    ...estilos.panelItem,
    border: "1px solid #3498db",
    background: "#eef7ff",
  }}
>
  <span style={{ ...estilos.panelLabel, color: "#2980b9" }}>
    COVER TPV
  </span>
  <div
    style={{
      ...estilos.panelMonto,
      color: "#2980b9",
      fontSize: "22px",
    }}
  >
    $
    {coverTPV.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
  </div>
</div>

<div
  style={{
    ...estilos.panelItem,
    border: "1px solid #3498db",
    background: "#eef7ff",
  }}
>
  <span style={{ ...estilos.panelLabel, color: "#2980b9" }}>
    TOTAL COVER
  </span>
  <div
    style={{
      ...estilos.panelMonto,
      color: "#2980b9",
      fontSize: "22px",
    }}
  >
    $
    {totalCover.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
  </div>
</div>

          <div
            style={{
              ...estilos.panelItem,
              background: "#1a1a1a",
              color: "white",
              gridColumn: "span 2",
            }}
          >
            <span style={{ ...estilos.panelLabel, color: "#aaa" }}>
              TOTAL TICKET {nombreReporte.toUpperCase()}
            </span>

            <div style={{ fontSize: "24px", fontWeight: "700", color: "#fff" }}>
              ${montoVentaMeta.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              gridColumn: "span 2",
              background:
                Math.abs(diferencia) < 0.1 && montoVentaMeta > 0
                  ? "#fafafa"
                  : "#fff1f1",
              border: "1px solid #eee",
              padding: "15px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                color: "#888",
              }}
            >
              DIFERENCIA FINAL
            </span>
            <br />
            <strong
              style={{
                fontSize: "28px",
                color: Math.abs(diferencia) < 0.1 ? "#2ecc71" : "#e74c3c",
              }}
            >
              ${diferencia.toLocaleString("es-MX")}
            </strong>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={estilos.section}>
            <label style={estilos.labelCheck}>
              <input
                type="checkbox"
                onChange={() =>
                  setSecciones({ ...secciones, mxn: !secciones.mxn })
                }
              />{" "}
              1. EFECTIVO MONEDA NACIONAL
            </label>

            {secciones.mxn && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "15px",
                  background: "#fafafa",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {denomMXN.map((v) => (
                    <div
                      key={v}
                      style={{ display: "flex", alignItems: "center", gap: "5px" }}
                    >
                      <small style={{ width: "40px", color: "#666" }}>${v}</small>
                      <input
                        type="number"
                        placeholder="0"
                        onChange={(e) =>
                          setCantidades({
                            ...cantidades,
                            [`mxn_${v}`]: e.target.value,
                          })
                        }
                        style={estilos.inputNumber}
                      />
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "15px",
                    borderTop: "1px dashed #ccc",
                    paddingTop: "10px",
                  }}
                >
                  <label style={estilos.panelLabel}>
                    MONEDAS PEQUEÑAS / OTROS (MXN)
                  </label>
                  <input
                    type="number"
                    placeholder="$ 0.00"
                    onChange={(e) =>
                      setCantidades({
                        ...cantidades,
                        monedas_mxn: e.target.value,
                      })
                    }
                    style={{ ...estilos.input, width: "95%" }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={estilos.section}>
            <label style={estilos.labelCheck}>
              <input
                type="checkbox"
                onChange={() =>
                  setSecciones({ ...secciones, usd: !secciones.usd })
                }
              />{" "}
              2. INGRESO DÓLARES (USD)
            </label>

            {secciones.usd && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "15px",
                  background: "#fafafa",
                  borderRadius: "8px",
                }}
              >
                <div style={{ marginBottom: "10px", fontSize: "13px" }}>
                  T.Cambio:{" "}
                  <input
                    type="number"
                    value={tc}
                    onChange={(e) => setTc(parseFloat(e.target.value))}
                    style={estilos.inputNumber}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                    gap: "8px",
                  }}
                >
                  {denomUSD.map((v) => (
                    <div
                      key={v}
                      style={{ display: "flex", alignItems: "center", gap: "5px" }}
                    >
                      <small style={{ width: "50px", color: "#666" }}>
                        USD {v}
                      </small>
                      <input
                        type="number"
                        placeholder="0"
                        onChange={(e) =>
                          setCantidades({
                            ...cantidades,
                            [`usd_${v}`]: e.target.value,
                          })
                        }
                        style={estilos.inputNumber}
                      />
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "15px",
                    borderTop: "1px dashed #ccc",
                    paddingTop: "10px",
                  }}
                >
                  <label style={estilos.panelLabel}>
                    MONEDAS PEQUEÑAS / OTROS (USD)
                  </label>
                  <input
                    type="number"
                    placeholder="USD $ 0.00"
                    onChange={(e) =>
                      setCantidades({
                        ...cantidades,
                        monedas_usd_extra: e.target.value,
                      })
                    }
                    style={{ ...estilos.input, width: "95%" }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={estilos.section}>
  <label style={estilos.labelCheck}>
    <input
      type="checkbox"
      onChange={() =>
        setSecciones({
          ...secciones,
          cover_mxn: !secciones.cover_mxn,
        })
      }
    />{" "}
    3. COVER EFECTIVO MONEDA NACIONAL
  </label>

  {secciones.cover_mxn && (
    <div
      style={{
        marginTop: "15px",
        padding: "15px",
        background: "#fafafa",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "10px",
        }}
      >
        {denomMXN.map((v) => (
          <div
            key={`cover_mxn_${v}`}
            style={{ display: "flex", alignItems: "center", gap: "5px" }}
          >
            <small style={{ width: "40px", color: "#666" }}>${v}</small>
            <input
              type="number"
              placeholder="0"
              onChange={(e) =>
                setCantidades({
                  ...cantidades,
                  [`cover_mxn_${v}`]: e.target.value,
                })
              }
              style={estilos.inputNumber}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "15px",
          borderTop: "1px dashed #ccc",
          paddingTop: "10px",
        }}
      >
        <label style={estilos.panelLabel}>
          MONEDAS PEQUEÑAS / OTROS COVER (MXN)
        </label>
        <input
          type="number"
          placeholder="$ 0.00"
          onChange={(e) =>
            setCantidades({
              ...cantidades,
              cover_monedas_mxn: e.target.value,
            })
          }
          style={{ ...estilos.input, width: "95%" }}
        />
      </div>
    </div>
  )}
</div>

<div style={estilos.section}>
  <label style={estilos.labelCheck}>
    <input
      type="checkbox"
      onChange={() =>
        setSecciones({
          ...secciones,
          cover_usd: !secciones.cover_usd,
        })
      }
    />{" "}
    4. COVER INGRESO DÓLARES (USD)
  </label>

  {secciones.cover_usd && (
    <div
      style={{
        marginTop: "15px",
        padding: "15px",
        background: "#fafafa",
        borderRadius: "8px",
      }}
    >
      <div style={{ marginBottom: "10px", fontSize: "13px" }}>
        T.Cambio: <strong>{tc}</strong>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: "8px",
        }}
      >
        {denomUSD.map((v) => (
          <div
            key={`cover_usd_${v}`}
            style={{ display: "flex", alignItems: "center", gap: "5px" }}
          >
            <small style={{ width: "50px", color: "#666" }}>USD {v}</small>
            <input
              type="number"
              placeholder="0"
              onChange={(e) =>
                setCantidades({
                  ...cantidades,
                  [`cover_usd_${v}`]: e.target.value,
                })
              }
              style={estilos.inputNumber}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "15px",
          borderTop: "1px dashed #ccc",
          paddingTop: "10px",
        }}
      >
        <label style={estilos.panelLabel}>
          MONEDAS PEQUEÑAS / OTROS COVER (USD)
        </label>
        <input
          type="number"
          placeholder="USD $ 0.00"
          onChange={(e) =>
            setCantidades({
              ...cantidades,
              cover_monedas_usd_extra: e.target.value,
            })
          }
          style={{ ...estilos.input, width: "95%" }}
        />
      </div>
    </div>
  )}
</div>

<div
  style={{
    background: "#fff",
    padding: "15px",
    borderRadius: "8px",
    border: "1px solid #eee",
  }}
>
  <label style={estilos.panelLabel}>5. COVER TPV</label>
  <input
    type="number"
    placeholder="$ 0.00"
    onChange={(e) =>
      setCantidades({
        ...cantidades,
        cover_tpv: e.target.value,
      })
    }
    style={{ ...estilos.input, width: "95%", fontSize: "16px" }}
  />
</div>

<div style={estilos.section}>
  <label style={estilos.labelCheck}>
    <input
      type="checkbox"
      onChange={() =>
        setSecciones({ ...secciones, vales: !secciones.vales })
      }
    />{" "}
    6. VALES DE GASTOS
  </label>

  {secciones.vales && (
    <div
      style={{
        marginTop: "15px",
        padding: "15px",
        background: "#fafafa",
        borderRadius: "8px",
      }}
    >
      {valesRows.map((row) => (
        <div
          key={row.id}
          style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
        >
          <input
            type="text"
            placeholder="Concepto"
            value={row.concepto}
            onChange={(e) =>
              updateRow(row.id, "vales", "concepto", e.target.value)
            }
            style={{ ...estilos.input, flex: 2 }}
          />
          <input
            type="number"
            placeholder="$"
            value={row.monto}
            onChange={(e) =>
              updateRow(row.id, "vales", "monto", e.target.value)
            }
            style={{ ...estilos.input, flex: 1 }}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() => addRow("vales")}
        style={estilos.btnAdd}
      >
        + Añadir vale
      </button>
    </div>
  )}
</div>
          <div style={estilos.section}>
            <label style={estilos.labelCheck}>
              <input
                type="checkbox"
                onChange={() =>
                  setSecciones({ ...secciones, cxc: !secciones.cxc })
                }
              />{" "}

              7. CUENTAS POR COBRAR
            </label>

            {secciones.cxc && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "15px",
                  background: "#fafafa",
                  borderRadius: "8px",
                }}
              >
                {cxcRows.map((row) => (
                  <div
                    key={row.id}
                    style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
                  >
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={row.nombre}
                      onChange={(e) =>
                        updateRow(row.id, "cxc", "nombre", e.target.value)
                      }
                      style={{ ...estilos.input, flex: 2 }}
                    />
                    <input
                      type="number"
                      placeholder="$"
                      value={row.monto}
                      onChange={(e) =>
                        updateRow(row.id, "cxc", "monto", e.target.value)
                      }
                      style={{ ...estilos.input, flex: 1 }}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addRow("cxc")}
                  style={estilos.btnAdd}
                >
                  + Añadir cuenta
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              background: "#fff",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid #eee",
            }}
          >
            <label style={estilos.panelLabel}>TOTAL VENTAS TARJETA (TPV)</label>
            <input
              type="number"
              placeholder="$ 0.00"
              onChange={(e) =>
                setCantidades({ ...cantidades, tarjetas: e.target.value })
              }
              style={{ ...estilos.input, width: "95%", fontSize: "16px" }}
            />
          </div>

          <div
            style={{
              background: "#fff",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid #eee",
            }}
          >
            <label style={estilos.panelLabel}>
              FOTOS TICKET DE CAJA: {nombreReporte.toUpperCase()}
            </label>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handlePhotoUpload(e, "ticket")}
              style={{ fontSize: "12px" }}
            />

            <div style={estilos.photoContainer}>
              {fotosTicket.map((file, i) => (
                <img
                  key={i}
                  src={URL.createObjectURL(file)}
                  alt="ticket"
                  style={estilos.photoThumb}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid #eee",
            }}
          >
            <label style={estilos.panelLabel}>FOTOS OTROS GASTOS</label>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handlePhotoUpload(e, "otros")}
              style={{ fontSize: "12px" }}
            />

            <div style={estilos.photoContainer}>
              {fotosOtros.map((file, i) => (
                <img
                  key={i}
                  src={URL.createObjectURL(file)}
                  alt="otros"
                  style={estilos.photoThumb}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              background: "#fafafa",
              border: "1px solid #eee",
              padding: "20px",
              borderRadius: "8px",
            }}
          >
            <label style={{ ...estilos.panelLabel, color: "#333" }}>
              TOTAL DE TICKET {nombreReporte.toUpperCase()}
            </label>

            <input
              type="number"
              placeholder="$ 0.00"
              onChange={(e) =>
                setCantidades({ ...cantidades, monto_meta: e.target.value })
              }
              style={{
                ...estilos.input,
                width: "95%",
                fontSize: "22px",
                fontWeight: "700",
                background: "none",
                border: "none",
              }}
            />
          </div>

          {montoVentaMeta > 0 && diferencia !== 0 && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e74c3c",
                padding: "20px",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <strong style={{ color: "#e74c3c" }}>
                {diferencia < 0
                  ? `🚨 Faltante: $${Math.abs(diferencia).toLocaleString()}`
                  : `⚠️ Sobrante: $${diferencia.toLocaleString()}`}
              </strong>
              <br />

              <p
                style={{
                  fontSize: "10px",
                  color: "#e74c3c",
                  marginTop: "5px",
                }}
              >
                Para continuar, confirma la diferencia con tus iniciales:
              </p>

              <input
                type="text"
                maxLength="3"
                placeholder="INI"
                value={iniciales}
                onChange={(e) => setIniciales(e.target.value.toUpperCase())}
                style={{
                  ...estilos.input,
                  width: "60px",
                  textAlign: "center",
                  marginTop: "10px",
                  border: "1px solid #e74c3c",
                  textTransform: "uppercase",
                }}
              />
            </div>
          )}

          <button
            onClick={enviarADriveYExcel}
            disabled={montoVentaMeta > 0 && diferencia !== 0 && !iniciales}
            style={{
              ...estilos.btnSubmit,
              background:
                montoVentaMeta > 0 && diferencia !== 0 && !iniciales
                  ? "#ccc"
                  : "#000",
              cursor:
                montoVentaMeta > 0 && diferencia !== 0 && !iniciales
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            GUARDAR REPORTE FINAL BOSSE
          </button>
        </div>
      </div>
    </div>
  );
}

export default CorteCaja;