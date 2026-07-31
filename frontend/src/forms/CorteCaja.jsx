import React, { useEffect, useState } from "react";
import estilos from "../styles/estilos";
import API_BASE_URL, { API_ENDPOINTS } from "../config/api";
import { generarFolio } from "../utils/folios";
import { exportarExcelCorte } from "../utils/exportExcel";

function CorteCaja({
  usuarioActivo,
  usuarioId,
  negocioId,
  corteEditando,
  modoEdicion = false,
  onVolver,
}) {

  const denomMXN = [1000, 500, 200, 100, 50, 20, 10, 5];
  const denomUSD = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.25];

 const [secciones, setSecciones] = useState({
  mxn: false,
  usd: false,
  cover_mxn: false,
  cover_usd: false,
  gastos_corte: false,
  reglamentos: false,
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
  const [cargandoCorte, setCargandoCorte] = useState(false);

  const [valesRows, setValesRows] = useState([
    { id: Date.now(), concepto: "", monto: "" },
  ]);

  const [cxcRows, setCxcRows] = useState([
    { id: Date.now(), nombre: "", monto: "" },
  ]);

  const [proveedoresExistentes, setProveedoresExistentes] = useState([]);
const [categoriasExistentes, setCategoriasExistentes] = useState([]);
const [conceptosExistentes, setConceptosExistentes] = useState([]);

const [gastosCorteRows, setGastosCorteRows] = useState([
  {
    id: Date.now(),
    categoria: "",
    proveedor: "",
    concepto: "",
    divisa: "MXN",
    tipo_cambio: tc,
    monto: "",
  },
]);

const [reglamentosRows, setReglamentosRows] = useState([
  {
    id: Date.now() + 1,
    categoria: "Reglamentos",
    proveedor: "Interventor",
    concepto: "Reglamentos / Interventor",
    divisa: "MXN",
    tipo_cambio: tc,
    monto: "",
  },
]);

useEffect(() => {
  if (!negocioId) {
    console.warn("No se recibió negocioId en CorteCaja");
    return;
  }

  const cargarCatalogos = async () => {
    try {
      const [
        respuestaProveedores,
        respuestaCategorias,
        respuestaConceptos,
      ] = await Promise.all([
        fetch(
          `${API_ENDPOINTS.proveedores}?negocio_id=${negocioId}`
        ),
        fetch(
          `${API_ENDPOINTS.categorias}?negocio_id=${negocioId}`
        ),
        fetch(
          `${API_BASE_URL}/api/egresos/conceptos?negocio_id=${negocioId}`
        ),
      ]);

      const [
        resultadoProveedores,
        resultadoCategorias,
        resultadoConceptos,
      ] = await Promise.all([
        respuestaProveedores.json(),
        respuestaCategorias.json(),
        respuestaConceptos.json(),
      ]);

      if (!respuestaProveedores.ok) {
        throw new Error(
          resultadoProveedores.error ||
            "No fue posible cargar proveedores."
        );
      }

      if (!respuestaCategorias.ok) {
        throw new Error(
          resultadoCategorias.error ||
            "No fue posible cargar categorías."
        );
      }

      if (!respuestaConceptos.ok) {
        throw new Error(
          resultadoConceptos.error ||
            "No fue posible cargar conceptos."
        );
      }

      setProveedoresExistentes(
        resultadoProveedores.proveedores || []
      );

      setCategoriasExistentes(
        resultadoCategorias.categorias || []
      );

      setConceptosExistentes(
        resultadoConceptos.conceptos || []
      );
    } catch (error) {
      console.error(
        "Error cargando catálogos de Corte de caja:",
        error
      );
    }
  };

  cargarCatalogos();
}, [negocioId]);

useEffect(() => {
  if (!modoEdicion || !corteEditando?.id) return;

  let componenteActivo = true;

  const cargarCorteParaEditar = async () => {
    try {
      setCargandoCorte(true);

      const respuesta = await fetch(
        `${API_BASE_URL}/api/cortes/${corteEditando.id}`
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.success) {
        throw new Error(
          resultado.error || "No fue posible cargar el corte."
        );
      }

      if (!componenteActivo) return;

      const corte = resultado.corte;
      const cantidadesCargadas = {};

      setFechaReporte(
        corte.fecha
          ? String(corte.fecha).split("T")[0]
          : new Date().toISOString().split("T")[0]
      );

      setNombreReporte(corte.folio || "");
      setIniciales(corte.responsable_iniciales || "");
      setTc(Number(corte.tipo_cambio) || 17.5);

      cantidadesCargadas.tarjetas =
        corte.total_tarjetas ?? "";

      cantidadesCargadas.cover_tpv =
        corte.cover_tpv ?? "";

      cantidadesCargadas.monto_meta =
        corte.venta_ticket ?? "";

      const denominaciones = Array.isArray(corte.denominaciones)
        ? corte.denominaciones
        : [];

      denominaciones.forEach((item) => {
        const tipoIngreso = String(
          item.tipo_ingreso || "Normal"
        ).toLowerCase();

        const moneda = String(item.moneda || "").toUpperCase();
        const valor = Number(item.valor);
        const cantidad = Number(item.cantidad) || 0;
        const concepto = String(item.concepto || "").toLowerCase();
        const montoOriginal = Number(item.monto_original) || 0;

        if (valor > 0) {
          if (tipoIngreso === "cover" && moneda === "MXN") {
            cantidadesCargadas[`cover_mxn_${valor}`] = cantidad;
          } else if (
            tipoIngreso === "cover" &&
            moneda === "USD"
          ) {
            cantidadesCargadas[`cover_usd_${valor}`] = cantidad;
          } else if (moneda === "MXN") {
            cantidadesCargadas[`mxn_${valor}`] = cantidad;
          } else if (moneda === "USD") {
            cantidadesCargadas[`usd_${valor}`] = cantidad;
          }

          return;
        }

        if (
          tipoIngreso === "cover" &&
          moneda === "MXN"
        ) {
          cantidadesCargadas.cover_monedas_mxn = montoOriginal;
        } else if (
          tipoIngreso === "cover" &&
          moneda === "USD"
        ) {
          cantidadesCargadas.cover_monedas_usd_extra =
            montoOriginal;
        } else if (moneda === "MXN") {
          cantidadesCargadas.monedas_mxn = montoOriginal;
        } else if (moneda === "USD") {
          cantidadesCargadas.monedas_usd_extra = montoOriginal;
        }

        // Conservamos la variable para evitar advertencias si
        // posteriormente se ajusta el reconocimiento por concepto.
        void concepto;
      });

      setCantidades(cantidadesCargadas);

      const cxc = Array.isArray(corte.cxc) ? corte.cxc : [];

      setCxcRows(
        cxc.length > 0
          ? cxc.map((item, index) => ({
              id: item.id || Date.now() + index,
              nombre: item.nombre || "",
              monto: item.monto ?? "",
            }))
          : [{ id: Date.now(), nombre: "", monto: "" }]
      );

      const gastos = Array.isArray(
        corte.gastos_corte_detalle
      )
        ? corte.gastos_corte_detalle
        : [];

      setGastosCorteRows(
        gastos.length > 0
          ? gastos.map((item, index) => ({
              id: item.id || Date.now() + index,
              categoria:
                item.categoria_nombre ||
                item.categoria ||
                "",
              proveedor:
                item.proveedor_nombre ||
                item.proveedor ||
                "",
              concepto: item.concepto || "",
              divisa: item.divisa || "MXN",
              tipo_cambio:
                Number(item.tipo_cambio) || 1,
              monto:
                item.monto_original ??
                item.monto_mxn ??
                "",
            }))
          : [
              {
                id: Date.now(),
                categoria: "",
                proveedor: "",
                concepto: "",
                divisa: "MXN",
                tipo_cambio: 1,
                monto: "",
              },
            ]
      );

      const reglamentos = Array.isArray(
        corte.reglamentos_detalle
      )
        ? corte.reglamentos_detalle
        : [];

      setReglamentosRows(
        reglamentos.length > 0
          ? reglamentos.map((item, index) => ({
              id: item.id || Date.now() + index,
              categoria:
                item.categoria_nombre ||
                item.categoria ||
                "Reglamentos",
              proveedor:
                item.proveedor_nombre ||
                item.proveedor ||
                "Interventor",
              concepto:
                item.concepto ||
                "Reglamentos / Interventor",
              divisa: item.divisa || "MXN",
              tipo_cambio:
                Number(item.tipo_cambio) || 1,
              monto:
                item.monto_original ??
                item.monto_mxn ??
                "",
            }))
          : [
              {
                id: Date.now() + 1,
                categoria: "Reglamentos",
                proveedor: "Interventor",
                concepto: "Reglamentos / Interventor",
                divisa: "MXN",
                tipo_cambio: 1,
                monto: "",
              },
            ]
      );

setSecciones({
  mxn: denominaciones.some(
    (item) =>
      String(item.tipo_ingreso || "Normal").toLowerCase() !==
        "cover" &&
      String(item.moneda || "").toUpperCase() === "MXN"
  ),
  usd: denominaciones.some(
    (item) =>
      String(item.tipo_ingreso || "Normal").toLowerCase() !==
        "cover" &&
      String(item.moneda || "").toUpperCase() === "USD"
  ),
  cover_mxn: denominaciones.some(
    (item) =>
      String(item.tipo_ingreso || "").toLowerCase() ===
        "cover" &&
      String(item.moneda || "").toUpperCase() === "MXN"
  ),
  cover_usd: denominaciones.some(
    (item) =>
      String(item.tipo_ingreso || "").toLowerCase() ===
        "cover" &&
      String(item.moneda || "").toUpperCase() === "USD"
  ),
  gastos_corte: gastos.length > 0,
  reglamentos: reglamentos.length > 0,
  vales: false,
  cxc: cxc.length > 0,
});

    } catch (error) {
      console.error("Error cargando corte para editar:", error);
      alert(
        "🚨 Error cargando el corte: " +
          error.message
      );
    } finally {
      if (componenteActivo) {
        setCargandoCorte(false);
      }
    }
  };

  cargarCorteParaEditar();

  return () => {
    componenteActivo = false;
  };
}, [modoEdicion, corteEditando?.id]);

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

  const calcularMontoMXNMovimiento = (row) => {
  const monto = parseFloat(row.monto) || 0;
  const tipoCambio = parseFloat(row.tipo_cambio) || tc || 1;

  if (row.divisa === "USD") {
    return monto * tipoCambio;
  }

  return monto;
};

const totalGastosCorte = gastosCorteRows.reduce(
  (acc, row) => acc + calcularMontoMXNMovimiento(row),
  0
);

const totalReglamentos = reglamentosRows.reduce(
  (acc, row) => acc + calcularMontoMXNMovimiento(row),
  0
);

const prepararMovimientosCorte = (rows) => {
  return rows
    .map((row, index) => {
      const montoOriginal = parseFloat(row.monto) || 0;
      const tipoCambio =
        row.divisa === "USD" ? parseFloat(row.tipo_cambio) || tc || 1 : 1;

      return {
        numero: index + 1,
        categoria: String(row.categoria || "").trim(),
        proveedor: String(row.proveedor || "").trim(),
        concepto: String(row.concepto || "").trim(),
        divisa: row.divisa || "MXN",
        tipo_cambio: tipoCambio,
        monto_original: montoOriginal,
        monto_mxn: calcularMontoMXNMovimiento(row),
      };
    })
    .filter((row) => row.monto_mxn > 0);
};

const validarMovimientosCorte = (rows, nombreModulo) => {
  const movimientoIncompleto = rows.find((row) => {
    const monto = calcularMontoMXNMovimiento(row);

    if (monto <= 0) return false;

    return (
      !String(row.categoria || "").trim() ||
      !String(row.proveedor || "").trim() ||
      !String(row.concepto || "").trim()
    );
  });

  if (movimientoIncompleto) {
    return `Hay un registro incompleto en ${nombreModulo}. Si capturas monto, también debes seleccionar categoría, proveedor y concepto.`;
  }

  return null;
};

const totalTarjetas = parseFloat(cantidades.tarjetas) || 0;
const coverTPV = parseFloat(cantidades.cover_tpv) || 0;
const montoVentaMeta = parseFloat(cantidades.monto_meta) || 0;

const usdEnMxn = calcularUSD() * tc;
const coverUsdEnMxn = calcularCoverUSD() * tc;

const totalCover =
  calcularCoverMXN() +
  coverUsdEnMxn +
  coverTPV +
  totalReglamentos;

const totalGlobalMXN =
  calcularMXN() +
  usdEnMxn +
  totalTarjetas +
  totalGastosCorte +
  totalCxC;

const totalIngresos =
  totalGlobalMXN +
  totalCover;

const diferencia =
  montoVentaMeta -
  totalGlobalMXN;

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

  const agregarMovimientoCorte = (tipo) => {
  const nuevoMovimiento = {
    id: Date.now(),
    categoria: tipo === "reglamentos" ? "Reglamentos" : "",
    proveedor: tipo === "reglamentos" ? "Interventor" : "",
    concepto:
      tipo === "reglamentos" ? "Reglamentos / Interventor" : "",
    divisa: "MXN",
    tipo_cambio: 1,
    monto: "",
  };

  if (tipo === "gastos_corte") {
    setGastosCorteRows([...gastosCorteRows, nuevoMovimiento]);
  } else {
    setReglamentosRows([...reglamentosRows, nuevoMovimiento]);
  }
};

const actualizarMovimientoCorte = (tipo, id, campo, valor) => {
  const actualizarRows = (rows) =>
    rows.map((row) => {
      if (row.id !== id) return row;

      const rowActualizado = {
        ...row,
        [campo]: valor,
      };

      if (campo === "divisa" && valor === "MXN") {
        rowActualizado.tipo_cambio = 1;
      }

      if (campo === "divisa" && valor === "USD") {
        rowActualizado.tipo_cambio = tc;
      }

      return rowActualizado;
    });

  if (tipo === "gastos_corte") {
    setGastosCorteRows(actualizarRows(gastosCorteRows));
  } else {
    setReglamentosRows(actualizarRows(reglamentosRows));
  }
};

const eliminarMovimientoCorte = (tipo, id) => {
  if (tipo === "gastos_corte") {
    if (gastosCorteRows.length === 1) return;
    setGastosCorteRows(gastosCorteRows.filter((row) => row.id !== id));
  } else {
    if (reglamentosRows.length === 1) return;
    setReglamentosRows(reglamentosRows.filter((row) => row.id !== id));
  }
};

const renderMovimientoCorte = ({
  tipo,
  rows,
  total,
  textoAgregar,
}) => {
  return (
    <div
      style={{
        marginTop: "15px",
        padding: "15px",
        background: "#fafafa",
        borderRadius: "8px",
      }}
    >
      {rows.map((row, index) => (
        <div
          key={row.id}
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "10px",
            padding: "15px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <strong style={{ fontSize: "13px" }}>
              {tipo === "gastos_corte"
                ? `Gasto de corte #${index + 1}`
                : `Reglamento / Interventor #${index + 1}`}
            </strong>

            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => eliminarMovimientoCorte(tipo, row.id)}
                style={{
                  background: "#fff1f1",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Eliminar
              </button>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={estilos.panelLabel}>CATEGORÍA</label>
              <select
                value={row.categoria}
                onChange={(e) =>
                  actualizarMovimientoCorte(
                    tipo,
                    row.id,
                    "categoria",
                    e.target.value
                  )
                }
                style={{ ...estilos.input, width: "100%" }}
              >
                <option value="">-- Selecciona --</option>

                {categoriasExistentes.map((cat) => (
                  <option key={cat.id} value={cat.nombre}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={estilos.panelLabel}>PROVEEDOR</label>
              <select
                value={row.proveedor}
                onChange={(e) =>
                  actualizarMovimientoCorte(
                    tipo,
                    row.id,
                    "proveedor",
                    e.target.value
                  )
                }
                style={{ ...estilos.input, width: "100%" }}
              >
                <option value="">-- Selecciona proveedor --</option>

                {proveedoresExistentes.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.nombre}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={estilos.panelLabel}>DIVISA</label>
              <select
                value={row.divisa}
                onChange={(e) =>
                  actualizarMovimientoCorte(
                    tipo,
                    row.id,
                    "divisa",
                    e.target.value
                  )
                }
                style={{ ...estilos.input, width: "100%" }}
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </div>

            {row.divisa === "USD" && (
              <div>
                <label style={estilos.panelLabel}>TIPO DE CAMBIO</label>
                <input
                  type="number"
                  value={row.tipo_cambio}
                  onChange={(e) =>
                    actualizarMovimientoCorte(
                      tipo,
                      row.id,
                      "tipo_cambio",
                      e.target.value
                    )
                  }
                  style={{ ...estilos.input, width: "100%" }}
                />
              </div>
            )}

            <div>
              <label style={estilos.panelLabel}>MONTO</label>
              <input
                type="number"
                placeholder="$ 0.00"
                value={row.monto}
                onChange={(e) =>
                  actualizarMovimientoCorte(
                    tipo,
                    row.id,
                    "monto",
                    e.target.value
                  )
                }
                style={{ ...estilos.input, width: "100%" }}
              />
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <label style={estilos.panelLabel}>CONCEPTO</label>
            <input
              list={`conceptos-${tipo}`}
              type="text"
              placeholder="Concepto"
              value={row.concepto}
              onChange={(e) =>
                actualizarMovimientoCorte(
                  tipo,
                  row.id,
                  "concepto",
                  e.target.value
                )
              }
              style={{ ...estilos.input, width: "100%" }}
            />

            <datalist id={`conceptos-${tipo}`}>
              {conceptosExistentes.map((concepto) => (
                <option key={concepto} value={concepto} />
              ))}
            </datalist>
          </div>

          <div
            style={{
              marginTop: "10px",
              fontSize: "13px",
              color: "#555",
              textAlign: "right",
            }}
          >
            Monto MXN:{" "}
            <strong>
              $
              {calcularMontoMXNMovimiento(row).toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </strong>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => agregarMovimientoCorte(tipo)}
        style={estilos.btnAdd}
      >
        {textoAgregar}
      </button>

      <div
        style={{
          marginTop: "15px",
          padding: "12px",
          background: "#111",
          color: "#fff",
          borderRadius: "8px",
          textAlign: "right",
          fontWeight: "700",
        }}
      >
        Total:{" "}
        {total.toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
        })}
      </div>
    </div>
  );
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
  totalGastosCorte,
  totalReglamentos,
  totalCxC,
  totalGlobalMXN,
  totalIngresos,
  montoVentaMeta,
  diferencia,
  valesRows: [],
  gastosCorteRows,
  reglamentosRows,
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

    const errorGastosCorte = validarMovimientosCorte(
  gastosCorteRows,
  "Gastos de corte"
);

if (errorGastosCorte) {
  alert(`⚠️ ${errorGastosCorte}`);
  return;
}

const errorReglamentos = validarMovimientosCorte(
  reglamentosRows,
  "Reglamentos / Interventor"
);

if (errorReglamentos) {
  alert(`⚠️ ${errorReglamentos}`);
  return;
}

const gastosCorteParaGuardar =
  prepararMovimientosCorte(gastosCorteRows);

const reglamentosParaGuardar =
  prepararMovimientosCorte(reglamentosRows);

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
Total general sin cover: $${totalGlobalMXN.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
Gastos de corte: $${totalGastosCorte.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
Total cover: $${totalCover.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
Reglamentos / Interventor: $${totalReglamentos.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
Total ingresos: $${totalIngresos.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
Venta ticket: $${montoVentaMeta.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
Diferencia ticket vs total general: $${diferencia.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}

Al aceptar, se descargará el Excel local y se enviarán las fotos a Drive.
`);

    if (!confirmar) return;

    try {

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
          negocio_id: negocioId,
          usuario_id: usuarioId,
          efectivoMXN: calcularMXN(),
efectivoUSD: calcularUSD(),
tipoCambio: tc,

coverEfectivo: calcularCoverMXN(),
coverUSD: calcularCoverUSD(),
coverTPV,
totalCover,

totalTarjetas,
          totalVales: 0,
          gastosCorte: totalGastosCorte,
          reglamentos: totalReglamentos,
          totalCxC,
          totalGlobalMXN,
          totalIngresos,
          ventaTicket: montoVentaMeta,
          diferencia,
          denominaciones: obtenerDenominacionesCorte(),
          vales: [],
          gastosCorteDetalle: gastosCorteParaGuardar,
          reglamentosDetalle: reglamentosParaGuardar,
          cxc: cxcRows,
        })
      );

      const todasLasFotos = [...fotosTicket, ...fotosOtros];

      todasLasFotos.forEach((file) => {
        formData.append("fotos", file);
      });

      if (modoEdicion && corteEditando?.id) {
  const respuestaEdicion = await fetch(
    `${API_BASE_URL}/api/cortes/${corteEditando.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fecha: fechaReporte,
        folio: nombreReporte,
        negocio_id: negocioId,
        usuario_edita_id: usuarioId,
        tipoCambio: tc,
        totalTarjetas,
        efectivoMXN: calcularMXN(),
        efectivoUSD: calcularUSD(),
        totalGlobalMXN,
        coverTPV,
        coverEfectivo: calcularCoverMXN(),
        coverUSD: calcularCoverUSD(),
        totalCover,
        ventaTicket: montoVentaMeta,
        diferencia,
        totalVales: 0,
        gastosCorte: totalGastosCorte,
        reglamentos: totalReglamentos,
        totalCxC,
        responsable: iniciales.toUpperCase(),
        denominaciones: obtenerDenominacionesCorte(),
        vales: [],
        cxc: cxcRows,
      }),
    }
  );

  const resultadoEdicion = await respuestaEdicion.json();

  if (!respuestaEdicion.ok || !resultadoEdicion.success) {
    throw new Error(
      resultadoEdicion.error || "No se pudo actualizar el corte."
    );
  }

  descargarExcel();

  alert("✅ Corte actualizado correctamente y Excel descargado.");
  onVolver();
  return;
}

      const respuesta = await fetch(API_ENDPOINTS.guardarReporte, {
        method: "POST",
        body: formData,
      });

      const resultado = await respuesta.json();

      if (!resultado.success) {
  throw new Error(resultado.error || "Error desconocido en servidor.");
}

descargarExcel();

alert("✅ Corte guardado correctamente y Excel descargado.");
onVolver();

    } catch (error) {
      console.error("Error al guardar corte:", error);
      alert("🚨 Error al guardar corte: " + error.message);
    }
  };

  if (cargandoCorte) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          '"Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      Cargando corte...
    </div>
  );
}

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

          <h1 style={estilos.h1}>
  {modoEdicion
    ? "Editar corte de caja BOSSE"
    : "Corte de caja diario BOSSE"}
</h1>

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
              background: "#1a1a1a",
              color: "white",
              gridColumn: "span 2",
            }}
          >
            <span style={{ ...estilos.panelLabel, color: "#aaa" }}>
              VENTA TICKET {nombreReporte.toUpperCase()}
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
        ? "#f0fff4"
        : "#fff1f1",
    border:
      Math.abs(diferencia) < 0.1 && montoVentaMeta > 0
        ? "1px solid #2ecc71"
        : "1px solid #f5c2c2",
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
    {Math.abs(diferencia) < 0.1 && montoVentaMeta > 0
      ? "CORTE CUADRADO"
      : diferencia > 0
      ? "FALTANTE TICKET VS TOTAL GENERAL"
      : "SOBRANTE TICKET VS TOTAL GENERAL"}
  </span>

  <br />

  <strong
    style={{
      fontSize: "28px",
      color:
        Math.abs(diferencia) < 0.1 && montoVentaMeta > 0
          ? "#2ecc71"
          : "#e74c3c",
    }}
  >
    $
    {Math.abs(diferencia).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
  </strong>

  <div style={{ fontSize: "11px", color: "#777", marginTop: "6px" }}>
    Venta ticket - total general sin cover
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
    background: "#123d27",
    color: "white",
    gridColumn: "span 2",
  }}
>
  <span style={{ ...estilos.panelLabel, color: "#d7e8dc" }}>
    TOTAL INGRESOS
  </span>

  <div
    style={{
      fontSize: "26px",
      fontWeight: "700",
      color: "#fff",
    }}
  >
    $
    {totalIngresos.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
    })}
  </div>

  <div
    style={{
      fontSize: "11px",
      color: "#d7e8dc",
      marginTop: "6px",
    }}
  >
    Total general sin cover + total cover
  </div>
</div>

        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={estilos.section}>
            <label style={estilos.labelCheck}>
              <input
                type="checkbox"
                checked={secciones.mxn}
                onChange={() =>
                  setSecciones({
                    ...secciones,
                    mxn: !secciones.mxn,
                  })
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
                        value={cantidades[`mxn_${v}`] ?? ""}
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
                    value={cantidades.monedas_mxn ?? ""}
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
                checked={secciones.usd}
                onChange={() =>
                  setSecciones({
                    ...secciones,
                    usd: !secciones.usd,
                  })
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
                        value={cantidades[`usd_${v}`] ?? ""}
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
                    value={cantidades.monedas_usd_extra ?? ""}
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
                  checked={secciones.cover_mxn}
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
  value={cantidades[`cover_mxn_${v}`] ?? ""}
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
              value={cantidades.cover_monedas_mxn ?? ""}
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
  checked={secciones.cover_usd}
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
    style={{
      display: "flex",
      alignItems: "center",
      gap: "5px",
    }}
  >
    <small style={{ width: "50px", color: "#666" }}>
      USD {v}
    </small>

    <input
      type="number"
      placeholder="0"
      value={cantidades[`cover_usd_${v}`] ?? ""}
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
            value={cantidades.cover_monedas_usd_extra ?? ""}
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
  value={cantidades.cover_tpv ?? ""}
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
  checked={secciones.reglamentos}
  onChange={() =>
    setSecciones({
      ...secciones,
      reglamentos: !secciones.reglamentos,
    })
  }
/>{" "}
    6. REGLAMENTOS / INTERVENTOR
  </label>

  {secciones.reglamentos &&
    renderMovimientoCorte({
      tipo: "reglamentos",
      rows: reglamentosRows,
      total: totalReglamentos,
      textoAgregar: "+ Añadir reglamento",
    })}
</div>

<div style={estilos.section}>
<label style={estilos.labelCheck}>
  <input
    type="checkbox"
    checked={secciones.gastos_corte}
    onChange={() =>
      setSecciones({
        ...secciones,
        gastos_corte: !secciones.gastos_corte,
      })
    }
  />{" "}
  7. GASTOS DE CORTE
</label>

  {secciones.gastos_corte &&
    renderMovimientoCorte({
      tipo: "gastos_corte",
      rows: gastosCorteRows,
      total: totalGastosCorte,
      textoAgregar: "+ Añadir gasto de corte",
    })}
</div>

          <div style={estilos.section}>
            <label style={estilos.labelCheck}>
  <input
    type="checkbox"
    checked={secciones.cxc}
    onChange={() =>
      setSecciones({
        ...secciones,
        cxc: !secciones.cxc,
      })
    }
  />{" "}
  8. CUENTAS POR COBRAR
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
  value={cantidades.tarjetas ?? ""}
  onChange={(e) =>
    setCantidades({
      ...cantidades,
      tarjetas: e.target.value,
    })
  }
  style={{
    ...estilos.input,
    width: "95%",
    fontSize: "16px",
  }}
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
              value={cantidades.monto_meta ?? ""}
              onChange={(e) =>
                setCantidades({
                  ...cantidades,
                  monto_meta: e.target.value,
                })
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
              {diferencia > 0
                ? `🚨 Faltante: $${Math.abs(diferencia).toLocaleString("es-MX")}`
                : `⚠️ Sobrante: $${Math.abs(diferencia).toLocaleString("es-MX")}`}
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