import * as XLSX from "xlsx";

export function exportarExcelCorte({
  fechaReporte,
  nombreReporte,
  usuarioActivo,
  iniciales,
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
  valesRows = [],
  gastosCorteRows = [],
  reglamentosRows = [],
  cxcRows = [],
}) {
  const calcularMontoMXNMovimiento = (row) => {
    const monto = parseFloat(row.monto) || 0;
    const tipoCambio =
      row.divisa === "USD" ? parseFloat(row.tipo_cambio) || tc || 1 : 1;

    if (row.divisa === "USD") {
      return monto * tipoCambio;
    }

    return monto;
  };

  const filas = [
    ["CORTE DE CAJA DIARIO - BORDER BROTHERS"],
    [],
    ["Fecha:", fechaReporte],
    ["Folio:", nombreReporte],
    ["Cajero:", usuarioActivo],
    ["Responsable Firma:", iniciales],
    [],
    ["VENTAS NORMALES"],
    ["Efectivo MXN:", calcularMXN()],
    ["Efectivo USD:", calcularUSD()],
    ["Efectivo USD en MXN:", calcularUSD() * tc],
    ["TC Aplicado:", tc],
    ["Total Tarjetas:", totalTarjetas],
    ["Gastos de corte:", totalGastosCorte],
    ["Cuentas por cobrar:", totalCxC],
    ["TOTAL GENERAL SIN COVER:", totalGlobalMXN],
    [],
    ["COVER"],
    ["Cover efectivo MXN:", calcularCoverMXN()],
    ["Cover USD:", calcularCoverUSD()],
    ["Cover USD en MXN:", calcularCoverUSD() * tc],
    ["Cover TPV:", coverTPV],
    ["Reglamentos / Interventor:", totalReglamentos],
    ["TOTAL COVER:", totalCover],
    [],
    ["RESUMEN"],
    ["TOTAL INGRESOS:", totalIngresos],
    ["VENTA TICKET:", montoVentaMeta],
    ["DIFERENCIA TICKET VS TOTAL GENERAL:", diferencia],
    [],
    ["DESGLOSE DE GASTOS DE CORTE"],
    [
      "Categoría",
      "Proveedor",
      "Concepto",
      "Divisa",
      "Tipo de cambio",
      "Monto original",
      "Monto MXN",
    ],
  ];

  gastosCorteRows.forEach((gasto) => {
    const montoMXN = calcularMontoMXNMovimiento(gasto);

    if (montoMXN > 0) {
      filas.push([
        gasto.categoria || "Sin categoría",
        gasto.proveedor || "Sin proveedor",
        gasto.concepto || "Sin concepto",
        gasto.divisa || "MXN",
        gasto.divisa === "USD" ? gasto.tipo_cambio || tc : 1,
        parseFloat(gasto.monto) || 0,
        montoMXN,
      ]);
    }
  });

  filas.push([]);
  filas.push(["DESGLOSE DE REGLAMENTOS / INTERVENTOR"]);
  filas.push([
    "Categoría",
    "Proveedor",
    "Concepto",
    "Divisa",
    "Tipo de cambio",
    "Monto original",
    "Monto MXN",
  ]);

  reglamentosRows.forEach((reglamento) => {
    const montoMXN = calcularMontoMXNMovimiento(reglamento);

    if (montoMXN > 0) {
      filas.push([
        reglamento.categoria || "Reglamentos",
        reglamento.proveedor || "Interventor",
        reglamento.concepto || "Reglamentos / Interventor",
        reglamento.divisa || "MXN",
        reglamento.divisa === "USD" ? reglamento.tipo_cambio || tc : 1,
        parseFloat(reglamento.monto) || 0,
        montoMXN,
      ]);
    }
  });

  filas.push([]);
  filas.push(["DESGLOSE DE CUENTAS POR COBRAR"]);
  filas.push(["Nombre", "Monto"]);

  cxcRows.forEach((cxc) => {
    if (cxc.nombre || cxc.monto) {
      filas.push([
        cxc.nombre || "Sin nombre",
        parseFloat(cxc.monto) || 0,
      ]);
    }
  });

  if (valesRows.length > 0 && totalVales > 0) {
    filas.push([]);
    filas.push(["DESGLOSE LEGACY DE VALES"]);
    filas.push(["Concepto", "Monto"]);

    valesRows.forEach((vale) => {
      if (vale.concepto || vale.monto) {
        filas.push([
          vale.concepto || "Sin concepto",
          parseFloat(vale.monto) || 0,
        ]);
      }
    });
  }

  const hoja = XLSX.utils.aoa_to_sheet(filas);
  const libro = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(libro, hoja, "Corte");

  XLSX.writeFile(
    libro,
    `Corte_Border_Brothers_${fechaReporte}_${nombreReporte}.xlsx`
  );
}

export function exportarExcelNomina({ filas, totalGlobal }) {
  const data = [
    ["PRE-NÓMINA BOSSE"],
    [],
    ["Empleado", "Días", "Costo", "Prima", "Descuento", "Total"],
  ];

  filas.forEach((fila) => {
    data.push([
      fila.nombre,
      fila.dias,
      fila.costo,
      fila.prima,
      fila.descuento,
      fila.total,
    ]);
  });

  data.push([]);
  data.push(["TOTAL GLOBAL", totalGlobal]);

  const hoja = XLSX.utils.aoa_to_sheet(data);
  const libro = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(libro, hoja, "Nomina");

  XLSX.writeFile(libro, "Prenomina_BOSSE.xlsx");
}
export const exportarExcelAnalisisFinanciero = ({
  analisis,
  fechaInicio,
  fechaFin,
}) => {
  if (!analisis) {
    alert("No hay análisis para exportar.");
    return;
  }

  const XLSX = require("xlsx");

  const formatoNumero = (valor) => Number(valor || 0);

  const formatoPorcentaje = (valor) =>
    `${Number(valor || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;

  const workbook = XLSX.utils.book_new();

  const resumenRows = [
    ["ANÁLISIS FINANCIERO"],
    ["Fecha inicio", fechaInicio],
    ["Fecha fin", fechaFin],
    [],
    ["RESUMEN GENERAL"],
    ["Ingresos", formatoNumero(analisis.resumen.total_ingresos)],
    ["Egresos", formatoNumero(analisis.resumen.total_egresos)],
    ["Nómina", formatoNumero(analisis.resumen.total_nomina)],
    [
      "Egresos operativos",
      formatoNumero(analisis.resumen.total_egresos_operativos),
    ],
    [
      "Inversiones socios",
      formatoNumero(analisis.resumen.total_inversiones_socios),
    ],
    [
      "Utilidad operativa",
      formatoNumero(analisis.resumen.utilidad_operativa),
    ],
    [
      "Flujo con inversiones",
      formatoNumero(analisis.resumen.flujo_con_inversiones),
    ],
    [],
    ["PORCENTAJES"],
    ["Margen de ganancia", formatoPorcentaje(analisis.resumen.margen_ganancia)],
    [
      "% egresos sobre ingresos",
      formatoPorcentaje(analisis.resumen.porcentaje_egresos),
    ],
    [
      "% nómina sobre egresos",
      formatoPorcentaje(analisis.resumen.porcentaje_nomina_sobre_egresos),
    ],
    [
      "% egresos operativos sobre egresos",
      formatoPorcentaje(
        analisis.resumen.porcentaje_egresos_operativos_sobre_egresos
      ),
    ],
    [],
    ["DETALLE DE INGRESOS"],
        [
          "Total general sin cover",
          formatoNumero(analisis.ingresos.total_general_sin_cover),
        ],
        ["Cover", formatoNumero(analisis.ingresos.total_cover)],
        ["Gastos de corte", formatoNumero(analisis.ingresos.total_gastos_corte)],
        [
          "Reglamentos / Interventor",
          formatoNumero(analisis.ingresos.total_reglamentos),
        ],
        ["Tarjetas", formatoNumero(analisis.ingresos.total_tarjetas)],
        ["CxC", formatoNumero(analisis.ingresos.total_cxc)],
        ["Efectivo MXN", formatoNumero(analisis.ingresos.total_efectivo_mxn)],
        [
          "USD convertido a MXN",
          formatoNumero(analisis.ingresos.total_efectivo_usd_mxn),
        ],
        ["Venta ticket", formatoNumero(analisis.ingresos.total_venta_ticket)],
        ["Diferencia", formatoNumero(analisis.ingresos.total_diferencia)],
  ];

  const hojaResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  XLSX.utils.book_append_sheet(workbook, hojaResumen, "Resumen");

  const categoriasRows = [
    ["Categoría", "Total"],
    ...(analisis.egresos_por_categoria || []).map((item) => [
      item.categoria,
      formatoNumero(item.total),
    ]),
  ];

  const hojaCategorias = XLSX.utils.aoa_to_sheet(categoriasRows);
  XLSX.utils.book_append_sheet(workbook, hojaCategorias, "Egresos categoría");

  const tiposRows = [
    ["Tipo egreso", "Total"],
    ...(analisis.egresos_por_tipo || []).map((item) => [
      item.tipo_egreso,
      formatoNumero(item.total),
    ]),
  ];

  const hojaTipos = XLSX.utils.aoa_to_sheet(tiposRows);
  XLSX.utils.book_append_sheet(workbook, hojaTipos, "Egresos tipo");

  const sociosRows = [
    ["Socio", "Total invertido"],
    ...(analisis.inversiones_por_socio || []).map((item) => [
      item.socio || "Sin socio",
      formatoNumero(item.total),
    ]),
  ];

  const hojaSocios = XLSX.utils.aoa_to_sheet(sociosRows);
  XLSX.utils.book_append_sheet(workbook, hojaSocios, "Inversiones socios");

  const distribucionRows = [
    [
      "Socio",
      "% Participación",
      "Utilidad asignada",
      "Inversión aportada",
      "Resultado neto",
    ],
    ...(analisis.distribucion_socios || []).map((item) => [
      item.socio || "Sin socio",
      formatoPorcentaje(item.porcentaje_participacion),
      formatoNumero(item.utilidad_asignada),
      formatoNumero(item.inversion_aportada),
      formatoNumero(item.resultado_neto),
    ]),
  ];

  const hojaDistribucion = XLSX.utils.aoa_to_sheet(distribucionRows);
  XLSX.utils.book_append_sheet(workbook, hojaDistribucion, "Distribución socios");

  const nombreArchivo = `analisis_financiero_${fechaInicio}_a_${fechaFin}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);
};
export function exportarExcelEgresos({
  egresos = [],
  filtros = {},
  usuarioActivo = "",
}) {
  if (!Array.isArray(egresos) || egresos.length === 0) {
    alert("No hay egresos para exportar.");
    return;
  }

  const obtenerPrimerValor = (...valores) =>
    valores.find(
      (valor) =>
        valor !== undefined &&
        valor !== null &&
        valor !== ""
    );

  const convertirNumero = (...valores) => {
    const valor = obtenerPrimerValor(...valores);

    if (valor === undefined) return 0;

    const numero = Number(
      String(valor)
        .replace(/[$,\s]/g, "")
        .trim()
    );

    return Number.isFinite(numero) ? numero : 0;
  };

  const formatearFecha = (valor) => {
    if (!valor) return "";

    const texto = String(valor);

    // Evita que una fecha UTC cambie de día por la zona horaria
    const coincidencia = texto.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (coincidencia) {
      const [, anio, mes, dia] = coincidencia;
      return `${dia}/${mes}/${anio}`;
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return texto;
    }

    return fecha.toLocaleDateString("es-MX");
  };

  const formatearTexto = (valor) => {
    if (valor === undefined || valor === null) {
      return "";
    }

    return String(valor).trim();
  };

  const formatearTipoEgreso = (valor) => {
    const texto = formatearTexto(valor);

    if (!texto) return "";

    return texto.charAt(0).toUpperCase() + texto.slice(1);
  };

  const fechaGeneracion = new Date().toLocaleString("es-MX");

  const registros = egresos.map((egreso) => {
    /*
     * Se contemplan diferentes nombres porque el backend puede devolver
     * el monto con distintos alias.
     */
    const monto = convertirNumero(
      egreso.monto,
      egreso.monto_original,
      egreso.importe,
      egreso.total,
      egreso.cantidad,
      egreso.monto_egreso
    );

    const divisa = formatearTexto(
      obtenerPrimerValor(
        egreso.divisa,
        egreso.moneda,
        egreso.currency,
        "MXN"
      )
    ).toUpperCase();

    const tipoCambio =
      divisa === "USD"
        ? convertirNumero(
            egreso.tipo_cambio,
            egreso.tipoCambio,
            egreso.exchange_rate,
            egreso.tc,
            1
          ) || 1
        : 1;

    const montoMXN =
      divisa === "USD"
        ? monto * tipoCambio
        : convertirNumero(
            egreso.monto_mxn,
            egreso.total_mxn,
            monto
          );

    const usuario = obtenerPrimerValor(
      egreso.usuario_nombre,
      egreso.usuario_crea_nombre,
      egreso.nombre_usuario,
      egreso.usuario,
      egreso.created_by_nombre,
      egreso.creado_por,
      ""
    );

    return {
      id: egreso.id ?? "",
      fecha: formatearFecha(
        obtenerPrimerValor(
          egreso.fecha,
          egreso.fecha_egreso,
          egreso.created_at
        )
      ),
      tipoEgreso: formatearTipoEgreso(
        obtenerPrimerValor(
          egreso.tipo_egreso,
          egreso.tipo,
          ""
        )
      ),
      categoria: formatearTexto(
        obtenerPrimerValor(
          egreso.categoria_nombre,
          egreso.categoria,
          ""
        )
      ),
      proveedor: formatearTexto(
        obtenerPrimerValor(
          egreso.proveedor_nombre,
          egreso.proveedor,
          ""
        )
      ),
      concepto: formatearTexto(egreso.concepto),
      referencia: formatearTexto(egreso.referencia),
      monto,
      divisa,
      tipoCambio,
      montoMXN,
      usuario: formatearTexto(usuario),
      estatus: formatearTexto(egreso.estatus),
    };
  });

  const totalMXN = registros.reduce(
    (acumulado, registro) =>
      acumulado + registro.montoMXN,
    0
  );

  const filas = [
    ["REPORTE DE EGRESOS - BORDER BROTHERS"],
    [],
    ["Fecha de generación", fechaGeneracion],
    ["Usuario", usuarioActivo || "Sin usuario"],
    ["Total de registros", registros.length],
    [],
    ["FILTROS APLICADOS"],
    ["Fecha inicio", filtros.fecha_inicio || "Todas"],
    ["Fecha fin", filtros.fecha_fin || "Todas"],
    ["Tipo de egreso", filtros.tipo_egreso || "Todos"],
    ["Concepto", filtros.concepto || "Todos"],
    ["Referencia", filtros.referencia || "Todas"],
    ["Monto mínimo", filtros.monto_min || "Sin límite"],
    ["Monto máximo", filtros.monto_max || "Sin límite"],
    ["Divisa", filtros.divisa || "Todas"],
    ["Usuario", filtros.usuario_nombre || "Todos"],
    ["Estatus", filtros.estatus || "Todos"],
    [],
    ["DETALLE DE EGRESOS"],
    [
      "ID",
      "Fecha",
      "Tipo de egreso",
      "Categoría",
      "Proveedor",
      "Concepto",
      "Referencia",
      "Monto original",
      "Divisa",
      "Tipo de cambio",
      "Monto MXN",
      "Usuario",
      "Estatus",
    ],
  ];

  registros.forEach((registro) => {
    filas.push([
      registro.id,
      registro.fecha,
      registro.tipoEgreso,
      registro.categoria,
      registro.proveedor,
      registro.concepto,
      registro.referencia,
      registro.monto,
      registro.divisa,
      registro.tipoCambio,
      registro.montoMXN,
      registro.usuario,
      registro.estatus,
    ]);
  });

  filas.push([]);
  filas.push(["TOTAL EN MXN", totalMXN]);

  const hoja = XLSX.utils.aoa_to_sheet(filas);

  hoja["!cols"] = [
    { wch: 9 },
    { wch: 13 },
    { wch: 18 },
    { wch: 24 },
    { wch: 26 },
    { wch: 38 },
    { wch: 48 },
    { wch: 18 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
  ];

  // La fila 20 contiene los nombres de las columnas.
  const filaEncabezados = 20;
  const ultimaFilaDetalle =
    filaEncabezados + registros.length;

  hoja["!autofilter"] = {
    ref: `A${filaEncabezados}:M${ultimaFilaDetalle}`,
  };

  hoja["!freeze"] = {
    xSplit: 0,
    ySplit: filaEncabezados,
  };

  // Formato numérico para montos y tipo de cambio.
  for (
    let numeroFila = filaEncabezados + 1;
    numeroFila <= ultimaFilaDetalle;
    numeroFila += 1
  ) {
    const celdaMonto = hoja[`H${numeroFila}`];
    const celdaTipoCambio = hoja[`J${numeroFila}`];
    const celdaMontoMXN = hoja[`K${numeroFila}`];

    if (celdaMonto) {
      celdaMonto.z = '#,##0.00';
    }

    if (celdaTipoCambio) {
      celdaTipoCambio.z = '#,##0.0000';
    }

    if (celdaMontoMXN) {
      celdaMontoMXN.z = '$#,##0.00';
    }
  }

  const filaTotal = filas.length;
  const celdaTotal = hoja[`B${filaTotal}`];

  if (celdaTotal) {
    celdaTotal.z = '$#,##0.00';
  }

  const libro = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    libro,
    hoja,
    "Egresos"
  );

  const fechaArchivo = new Date()
    .toISOString()
    .slice(0, 10);

  XLSX.writeFile(
    libro,
    `egresos_${fechaArchivo}.xlsx`
  );
}