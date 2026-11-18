import { getBorderBroFindings, getBorderBroNextSteps, calculateBorderBroScenario, reconcileBorderBro } from './BosseFinanceBorderBroLogic';

const movements = [
  { key:'I1', id:1, type:'Ingreso', fecha:'2026-11-01', monto:100, categoria:'Corte de caja', raw:{ diferencia:7 } },
  { key:'E2', id:2, type:'Egreso', fecha:'2026-11-01', monto:40, categoria:'Servicios', proveedor:'Empresa X', raw:{ concepto:'' } },
  { key:'E3', id:3, type:'Nómina', fecha:'2026-11-01', monto:20, categoria:'Nómina', raw:{ concepto:'Pago semanal' } }
];
const data = { periodo:{ estado:'PROVISIONAL' }, resumen:{ total_ingresos:100,total_egresos:60,total_nomina:20,gm:40,gpm:40 },
  comparacion_nomina:{ nomina_real:20,prenomina_referencia:22 } };

test('cada hallazgo usa solo la evidencia recibida y se ordena por prioridad', () => {
  const findings = getBorderBroFindings(data, movements);
  expect(findings.find(f => f.id === 'diferencias-corte').evidence.map(r => r.key)).toEqual(['I1']);
  expect(findings.find(f => f.id === 'sin-concepto').evidence.map(r => r.key)).toEqual(['E2']);
  expect(findings.find(f => f.id === 'principal-categoria').evidence.map(r => r.key)).toEqual(['E2']);
  expect(findings.find(f => f.id === 'periodo-provisional').evidence).toHaveLength(0);
  expect(findings[0].status).toBe('Falta información');
  expect(findings.map(f => f.priority)).toEqual([...findings.map(f => f.priority)].sort((a,b)=>b-a));
});

test('la concentración no se presenta como gasto excesivo y la nómina no se duplica', () => {
  const findings = getBorderBroFindings(data, movements);
  expect(findings.find(f => f.id === 'principal-categoria').description).toMatch(/no demuestra un gasto excesivo/i);
  expect(findings.find(f => f.id === 'nomina-referencia').description).toMatch(/no debe sumarse otra vez/i);
});

test('hipótesis de recurrencia solo con al menos tres registros en varias fechas', () => {
  const expense = (key, date) => ({ key, type:'Egreso', fecha:date, monto:50, categoria:'Servicios', proveedor:'Proveedor X', raw:{concepto:'Servicio'} });
  expect(getBorderBroFindings(data,[expense('a','2026-11-01'),expense('b','2026-11-01')]).some(f=>f.status==='Hipótesis')).toBe(false);
  const result = getBorderBroFindings(data,[expense('a','2026-11-01'),expense('b','2026-11-02'),expense('c','2026-11-03')]);
  const possible = result.find(f=>f.id==='posible-recurrencia');
  expect(possible.status).toBe('Hipótesis');
  expect(possible.evidence.map(row=>row.key)).toEqual(['a','b','c']);
});

test('la falta de conciliación tiene advertencia sin afirmar que el registro sea incorrecto', () => {
  const findings = getBorderBroFindings(data,movements.slice(0,2));
  const issue = findings.find(f=>f.id==='diferencia-conciliacion');
  expect(issue.status).toBe('Falta información');
  expect(issue.evidence).toHaveLength(2);
  expect(issue.note).toMatch(/no demuestra/i);
});

test('escenarios separan egresos operativos y nómina y no alteran totales originales', () => {
  const result = calculateBorderBroScenario(data.resumen,10,-10,5);
  expect(result.income).toBeCloseTo(110);
  expect(result.expense).toBeCloseTo(57);
  expect(result.gm).toBeCloseTo(53);
  expect(result.gpm).toBeCloseTo(53/110*100);
  expect(result.validBaseline).toBe(true);
  expect(data.resumen.gm).toBe(40);
});

test('base inconsistente con nómina mayor que egresos queda marcada no válida', () => {
  expect(calculateBorderBroScenario({total_ingresos:10,total_egresos:5,total_nomina:9,gm:5},0,0,0).validBaseline).toBe(false);
});

test('conciliación contrasta los registros con los totales oficiales', () => {
  const balance = reconcileBorderBro(data,movements);
  expect(balance.incomes.listed).toBe(100);
  expect(balance.expenses.listed).toBe(60);
  expect(balance.expenses.count).toBe(2);
  expect(balance.expenses.available).toBe(true);
});

test('sin movimientos no se inventa conclusión favorable y los pasos son contextuales', () => {
  const findings = getBorderBroFindings({resumen:{}},[]);
  expect(findings[0].status).toBe('Falta información');
  expect(getBorderBroNextSteps(findings[0])[0].description).toBe(findings[0].action);
});
