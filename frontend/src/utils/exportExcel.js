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
  totalCxC,
  totalGlobalMXN,
  montoVentaMeta,
  diferencia,
  valesRows,
  cxcRows,
}) {
  const filas = [
    ["CORTE DE CAJA DIARIO - BOSSE"],
    [],
    ["Fecha:", fechaReporte],
    ["Folio:", nombreReporte],
    ["Cajero:", usuarioActivo],
    ["Responsable Firma:", iniciales],
    [],
    ["Efectivo MXN:", calcularMXN()],
    ["Efectivo USD:", calcularUSD()],
    ["TC Aplicado:", tc],
    [],
    ["Cover efectivo MXN:", calcularCoverMXN()],
    ["Cover USD:", calcularCoverUSD()],
    ["Cover USD en MXN:", calcularCoverUSD() * tc],
    ["Cover TPV:", coverTPV],
    ["Total Cover:", totalCover],
    [],
    ["Total Tarjetas:", totalTarjetas],
    ["Total Vales:", totalVales],
    ["Total CxC:", totalCxC],
    ["TOTAL EN CAJA (MXN):", totalGlobalMXN],
    ["VENTA TICKET:", montoVentaMeta],
    ["DIFERENCIA:", diferencia],
    [],
    ["DESGLOSE DE VALES"],
    ["Concepto", "Monto"],
  ];

  valesRows.forEach((vale) => {
    if (vale.concepto || vale.monto) {
      filas.push([
        vale.concepto || "Sin concepto",
        parseFloat(vale.monto) || 0,
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

  const hoja = XLSX.utils.aoa_to_sheet(filas);
  const libro = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(libro, hoja, "Corte");

  XLSX.writeFile(
    libro,
    `Corte_BOSSE_${fechaReporte}_${nombreReporte}.xlsx`
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
    ["Cover", formatoNumero(analisis.ingresos.total_cover)],
    ["Tarjetas", formatoNumero(analisis.ingresos.total_tarjetas)],
    ["Vales", formatoNumero(analisis.ingresos.total_vales)],
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