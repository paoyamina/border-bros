// BorderBro: reglas financieras deterministas y evidencia autorizada por BOSSE.
// No adjudica causas, culpables, ahorros ni proyecciones sin datos que los sustenten.
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const exists = value => value !== null && value !== undefined && value !== '';
const sum = rows => (rows || []).reduce((total, row) => total + number(row.monto), 0);
const fmt = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(number(value));
const pct = value => `${number(value).toFixed(1)}%`;
const isIncome = row => row?.type === 'Ingreso';
const validSource = s => !!String(s || '').trim() && !['—', '-', 'sin dato', 'n/a', 'na'].includes(String(s).trim().toLowerCase());

export function reconcileBorderBro(analisis = {}, movements = []) {
  const incomeRows = movements.filter(isIncome);
  const expenseRows = movements.filter(r => r && !isIncome(r));
  const officialIncome = analisis?.resumen?.total_ingresos;
  const officialExpense = analisis?.resumen?.total_egresos;
  return {
    incomes: { official: number(officialIncome), listed: sum(incomeRows), count: incomeRows.length, available: exists(officialIncome) },
    expenses: { official: number(officialExpense), listed: sum(expenseRows), count: expenseRows.length, available: exists(officialExpense) }
  };
}

export function getBorderBroFindings(analisis = {}, movements = []) {
  const summary = analisis?.resumen || {};
  const expenses = movements.filter(r => r && !isIncome(r));
  const incomes = movements.filter(isIncome);
  const balance = reconcileBorderBro(analisis, movements);
  const balanceKnown = balance.incomes.available && balance.expenses.available;
  const reconciled = balanceKnown &&
    Math.abs(balance.incomes.official - balance.incomes.listed) < .011 &&
    Math.abs(balance.expenses.official - balance.expenses.listed) < .011;
  const findings = [];
  const add = finding => findings.push({
    priority: 0, status: 'Hecho', note: '', evidence: [], filterKind: 'Todos',
    action: 'Revisar movimientos y sus datos originales', ...finding
  });

  if (balanceKnown && !reconciled) add({
    id: 'diferencia-conciliacion', priority: 110, status: 'Falta información',
    title: 'El desglose necesita conciliación',
    description: `El detalle consultable suma ${fmt(balance.incomes.listed)} de ingresos y ${fmt(balance.expenses.listed)} de egresos, frente a ${fmt(balance.incomes.official)} y ${fmt(balance.expenses.official)} oficiales. Deben verificarse el alcance y los registros antes de sacar conclusiones.`,
    evidence: movements, action: 'Confirmar registros, periodo y criterios de inclusión',
    note: 'Una diferencia no demuestra por sí sola que haya registros incorrectos.'
  });

  if (String(analisis?.periodo?.estado || '').toUpperCase() === 'PROVISIONAL') add({
    id: 'periodo-provisional', priority: 100, status: 'Falta información',
    title: 'Periodo pendiente de consolidación',
    description: 'El backend indica que este periodo es provisional. Pueden quedar egresos o semanas por consolidar; las variaciones no deben tratarse como resultados definitivos.',
    action: 'Confirmar el cierre contable antes de comparar o decidir',
    note: 'El estado del periodo es un dato recibido del análisis financiero.'
  });

  const deltas = incomes.filter(r => exists(r.raw?.diferencia) && Math.abs(number(r.raw.diferencia)) >= .01);
  if (deltas.length) {
    const netDifference = deltas.reduce((n, r) => n + number(r.raw.diferencia), 0);
    add({
      id: 'diferencias-corte', priority: 95,
      title: `${deltas.length} corte${deltas.length === 1 ? '' : 's'} con diferencia registrada`,
      description: `Los campos «Diferencia» suman ${fmt(netDifference)} con signo en ${deltas.length} corte${deltas.length === 1 ? '' : 's'}. Este importe no es un ingreso nuevo y no determina su causa.`,
      evidence: deltas, filterKind: 'Ingreso', action: 'Revisar efectivo, tarjetas, vales y ajustes del corte',
      note: 'Diferencia neta con signo; importes positivos y negativos pueden compensarse.'
    });
  }

  const missingConcept = expenses.filter(r => !String(r.raw?.concepto ?? '').trim());
  if (missingConcept.length) add({
    id: 'sin-concepto', priority: 88, status: 'Falta información',
    title: `${missingConcept.length} egreso${missingConcept.length === 1 ? '' : 's'} sin concepto de origen`,
    description: `El registro original no aporta el concepto en ${missingConcept.length} egreso${missingConcept.length === 1 ? '' : 's'}. No es posible evaluar su finalidad únicamente con la información actual.`,
    evidence: missingConcept, filterKind: 'Egreso', action: 'Solicitar o comprobar la descripción de estos movimientos',
    note: 'El nombre de categoría o proveedor no sustituye un concepto de captura.'
  });

  const group = new Map();
  expenses.forEach(row => {
    const name = String(row.categoria || 'Sin categoría');
    if (!group.has(name)) group.set(name, []);
    group.get(name).push(row);
  });
  const sorted = [...group].map(([name, rows]) => ({ name, rows, total: sum(rows) }))
    .filter(g => g.total > 0).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es-MX'));
  if (sorted.length) {
    const first = sorted[0];
    const basis = reconciled ? number(summary.total_egresos) : sum(expenses);
    add({
      id: 'principal-categoria', priority: 65,
      title: `Principal categoría de egresos: ${first.name}`,
      description: `${fmt(first.total)} en ${first.rows.length} registro${first.rows.length === 1 ? '' : 's'}, equivalente al ${basis > 0 ? pct(first.total / basis * 100) : '—'} ${reconciled ? 'del total oficial de egresos' : 'del detalle de egresos disponible'}. La concentración no demuestra un gasto excesivo.`,
      evidence: first.rows, filterKind: 'Egreso', action: 'Revisar los conceptos que integran esta categoría',
      note: reconciled ? 'Importes conciliados con los egresos oficiales.' : 'Porcentaje respecto al detalle disponible; no al total oficial.'
    });
  }

  const payrollActual = analisis?.comparacion_nomina?.nomina_real;
  const payrollEstimate = analisis?.comparacion_nomina?.prenomina_referencia;
  if (exists(payrollActual) && exists(payrollEstimate) && (number(payrollActual) !== 0 || number(payrollEstimate) !== 0)) {
    const difference = number(payrollActual) - number(payrollEstimate);
    add({
      id: 'nomina-referencia', priority: Math.abs(difference) >= .01 ? 70 : 25,
      title: 'Prenómina comparada con nómina real',
      description: `La diferencia nómina real − prenómina es ${fmt(difference)}. La prenómina sirve de referencia y no debe sumarse otra vez como egreso.`,
      evidence: expenses.filter(r => r.type === 'Nómina'), filterKind: 'Egreso',
      action: 'Comprobar los pagos de nómina y su referencia presupuestal',
      note: 'La prenómina puede existir solo como total agregado, sin movimientos vinculados.'
    });
  }

  // Hipótesis condicional: varias fechas con un proveedor pueden justificar revisar
  // recurrencia, pero nunca permiten afirmar que se trate de un gasto periódico.
  const suppliers = new Map();
  expenses.forEach(row => {
    const name = String(row.proveedor || '').trim();
    if (!validSource(name)) return;
    const key = name.toLocaleLowerCase('es-MX');
    if (!suppliers.has(key)) suppliers.set(key, { name, rows: [] });
    suppliers.get(key).rows.push(row);
  });
  const recurring = [...suppliers.values()].filter(s => s.rows.length >= 3 &&
    new Set(s.rows.map(r => String(r.fecha || '').slice(0, 10)).filter(Boolean)).size >= 2)
    .sort((a, b) => sum(b.rows) - sum(a.rows))[0];
  if (recurring) add({
    id: 'posible-recurrencia', priority: 42, status: 'Hipótesis',
    title: `¿Pagos recurrentes a ${recurring.name}?`,
    description: `Se observan ${recurring.rows.length} egresos de ${recurring.name} en distintas fechas (${fmt(sum(recurring.rows))}). Podrían corresponder a pagos recurrentes, pero es necesario comprobar los conceptos y contratos.`,
    evidence: recurring.rows, filterKind: 'Egreso', action: 'Contrastar folios y contratos antes de considerarlos recurrentes',
    note: 'La repetición de un proveedor no demuestra periodicidad ni irregularidades.'
  });

  if (!findings.length) add({
    id: 'revision-general', priority: 5, status: 'Falta información',
    title: 'Sin alertas específicas en las reglas disponibles',
    description: movements.length ? 'Las reglas automáticas no identificaron sus condiciones de revisión. Esto no equivale a una auditoría completa.' : 'No hay movimientos disponibles para fundamentar un diagnóstico de este periodo.',
    evidence: movements, action: 'Verificar el periodo y examinar los movimientos disponibles',
    note: 'La ausencia de hallazgos automáticos no acredita ausencia de incidencias.'
  });
  return findings.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

export function getBorderBroNextSteps(finding) {
  return [
    { id: 'evidence', title: 'Comprueba el hallazgo seleccionado', description: finding?.action || 'Abre los registros y revisa sus componentes', action: 'evidence' },
    { id: 'charts', title: 'Contrasta otros periodos', description: 'Revisa la evolución de ingresos y egresos antes de atribuir una causa', action: 'charts' },
    { id: 'scenario', title: 'Evalúa una alternativa', description: 'Utiliza los escenarios como sensibilidad aritmética, no como predicción', action: 'scenario' }
  ];
}

export function calculateBorderBroScenario(resumen = {}, sales = 0, operating = 0, payroll = 0) {
  const originalIncome = number(resumen.total_ingresos);
  const originalExpense = number(resumen.total_egresos);
  const realPayroll = number(resumen.total_nomina);
  const validBaseline = originalIncome >= 0 && originalExpense >= 0 && realPayroll >= 0 && realPayroll <= originalExpense + .01;
  const operatingExpense = Math.max(0, originalExpense - realPayroll);
  const income = originalIncome * (1 + number(sales) / 100);
  const expense = operatingExpense * (1 + number(operating) / 100) + realPayroll * (1 + number(payroll) / 100);
  const gm = number(resumen.gm) + (income - originalIncome) - (expense - originalExpense);
  const gpm = income ? gm / income * 100 : null;
  return { income, expense, gm, gpm, deltaGm: gm - number(resumen.gm),
    deltaGpm: gpm != null && exists(resumen.gpm) ? gpm - number(resumen.gpm) : null,
    validBaseline };
}
