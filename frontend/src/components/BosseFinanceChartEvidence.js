// BorderBro contextual: observaciones comprobables únicamente a partir de
// los registros filtrados. No genera hipótesis, pronósticos ni nuevos totales.
const amountOf = value => Number.isFinite(Number(value)) ? Math.abs(Number(value)) : 0;
const dateOf = value => String(value || '').slice(0, 10);
const isIncome = row => row?.type === 'Ingreso';

export function summarizeChartEvidence(rows = []) {
  const incomeRows = rows.filter(isIncome);
  const expenseRows = rows.filter(row => row && !isIncome(row));
  const income = incomeRows.reduce((sum, row) => sum + amountOf(row.monto), 0);
  const expense = expenseRows.reduce((sum, row) => sum + amountOf(row.monto), 0);
  const categoryTotals = new Map();
  for (const row of expenseRows) {
    const name = String(row?.categoria || 'Sin categoría');
    categoryTotals.set(name, (categoryTotals.get(name) || 0) + amountOf(row.monto));
  }
  const [category, total] = [...categoryTotals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es-MX'))[0] || [];
  const topExpense = category && total > 0 && expense > 0 ? {
    category, amount: total, share: total / expense * 100
  } : null;
  const largest = list => list.reduce((best, row) =>
    (!best || amountOf(row?.monto) > amountOf(best?.monto)) ? row : best, null);
  const largestIncome = largest(incomeRows);
  const largestExpense = largest(expenseRows);
  const highlight = row => row ? {
    key: row.key, folio: String(row.folio || 'Sin folio'), fecha: dateOf(row.fecha),
    monto: amountOf(row.monto), categoria: String(row.categoria || 'Sin categoría')
  } : null;
  const title = !rows.length ? 'Sin movimientos para esta selección'
    : incomeRows.length && expenseRows.length ? '¿Qué explica esta selección?'
    : incomeRows.length ? '¿De dónde provienen los ingresos?'
    : '¿Qué concentra los egresos?';
  return {
    count: rows.length, income, expense, incomeCount: incomeRows.length,
    expenseCount: expenseRows.length, topExpense,
    largestIncome: highlight(largestIncome), largestExpense: highlight(largestExpense),
    distinctDates: new Set(rows.map(row => dateOf(row.fecha)).filter(Boolean)).size,
    title
  };
}
