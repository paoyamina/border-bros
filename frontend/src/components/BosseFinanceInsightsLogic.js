// Datos exclusivamente derivados de la respuesta /api/analisis-financiero.
// No se inventan causas ni se interpretan escenarios como cifras contables.
const value = raw => raw === null || raw === undefined || raw === '' || !Number.isFinite(Number(raw)) ? null : Number(raw);
const changeValue = change => value(change?.porcentaje);

export function buildSummaryInsights(analisis = {}) {
  const summary = analisis?.resumen || {};
  const comparison = analisis?.comparacion || {};
  const estado = ['PROVISIONAL', 'CONSOLIDADO'].includes(analisis?.periodo?.estado) ? analisis.periodo.estado : null;
  const descripcionComparacion = comparison.descripcion || 'periodo comparable';
  const hasComparison = Boolean(comparison.ingresos || comparison.egresos || comparison.gpm);
  const incomeDelta = changeValue(comparison.ingresos);
  const expenseDelta = changeValue(comparison.egresos);
  const marginDelta = value(comparison.gpm?.diferencia_pp);
  const payrollAmount = value(summary.total_nomina);
  const statusHint = estado === 'PROVISIONAL' ? ' Los datos aún pueden cambiar.' : '';
  const incomeTitle = incomeDelta === null || incomeDelta === 0 ? 'Ingresos del periodo' : incomeDelta > 0 ? 'Crecimiento de ingresos' : 'Reducción de ingresos';
  const expenseTitle = expenseDelta === null || expenseDelta === 0 ? 'Egresos del periodo' : expenseDelta < 0 ? 'Reducción de egresos' : 'Aumento de egresos';
  return {
    estado,
    comparacion: hasComparison,
    descripcionComparacion,
    items: [
      { key: 'income', target: 'ingresos', title: incomeTitle, value: value(summary.total_ingresos), change: comparison.ingresos, icon: incomeDelta !== null && incomeDelta < 0 ? 'exchange' : 'trend', tone: incomeDelta === null ? 'neutral' : incomeDelta >= 0 ? 'favorable' : 'caution', detail: `Cortes de caja incluidos en el resumen financiero.${statusHint}` },
      { key: 'margin', target: 'rentabilidad', title: 'Margen de ganancia', value: value(summary.gpm), isPercent: true, change: comparison.gpm, comparisonMode: 'pp', icon: 'percent', tone: marginDelta === null ? 'neutral' : marginDelta >= 0 ? 'favorable' : 'caution', detail: 'GPM calculado por BOSSE; abre el desglose para comprobar GM, ingresos y ajustes.' },
      { key: 'expenses', target: 'egresos', title: expenseTitle, value: value(summary.total_egresos), change: comparison.egresos, icon: 'wallet', tone: expenseDelta === null ? 'neutral' : expenseDelta <= 0 ? 'favorable' : 'caution', detail: `Incluye egresos y nómina contabilizados. Una reducción no demuestra por sí sola un ahorro.${statusHint}` },
      { key: 'payroll', target: 'prenomina', title: payrollAmount === 0 ? 'Nómina sin movimientos' : 'Nómina contabilizada', value: payrollAmount, change: comparison.nomina, icon: 'people', tone: 'neutral', detail: payrollAmount === 0 ? 'No se contabilizó nómina en el periodo consultado; la prenómina no es un gasto adicional.' : 'Importe de nómina real, sin sumar la prenómina por segunda vez.' }
    ]
  };
}
