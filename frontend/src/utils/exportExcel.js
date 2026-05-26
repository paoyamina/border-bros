import * as XLSX from "xlsx";

export function exportarExcelCorte({
  fechaReporte,
  nombreReporte,
  usuarioActivo,
  iniciales,
  calcularMXN,
  calcularUSD,
  tc,
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