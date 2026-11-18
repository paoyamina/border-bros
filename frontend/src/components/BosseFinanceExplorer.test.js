import { EMPTY_EXPLORER_FILTERS, filterFinanceMovements, sortFinanceMovements } from './BosseFinanceExplorer';

const base = [
  { key: 'I1', type: 'Ingreso', fecha: '2026-11-04', folio: 'CORTE-1', concepto: 'Venta del día', categoria: 'Corte de caja', source: 'Cortes de caja', proveedor: 'Pao', responsable: 'Pao', status: 'REGISTRADO', monto: 1000 },
  { key: 'E2', type: 'Egreso', fecha: '2026-11-05', folio: 'Egreso 2', concepto: 'Servicio de limpieza', categoria: 'Gastos Generales', source: 'Egresos · efectivo', proveedor: 'Proveedor Águila', responsable: 'Contador', status: 'REGISTRADO', monto: 200 },
  { key: 'E3', type: 'Nómina', fecha: '2026-11-07', folio: 'Egreso 3', concepto: 'Nómina semanal', categoria: 'Nómina', source: 'Nómina', proveedor: '—', responsable: 'Contador', status: 'REGISTRADO', monto: 300 }
];

test('filtros avanzados: texto sin acentos, tipo y fechas conservan registros originales', () => {
  expect(filterFinanceMovements(base, { ...EMPTY_EXPLORER_FILTERS, search: 'aguila' }).map(r => r.key)).toEqual(['E2']);
  expect(filterFinanceMovements(base, { ...EMPTY_EXPLORER_FILTERS, kind: 'Egreso' }).map(r => r.key)).toEqual(['E2', 'E3']);
  expect(filterFinanceMovements(base, { ...EMPTY_EXPLORER_FILTERS, kind: 'Nómina' }).map(r => r.key)).toEqual(['E3']);
  expect(filterFinanceMovements(base, { ...EMPTY_EXPLORER_FILTERS, dateFrom: '2026-11-05', dateTo: '2026-11-05' }).map(r => r.key)).toEqual(['E2']);
});

test('filtros por concepto, origen y montos se combinan sin alterar los importes', () => {
  const filtered = filterFinanceMovements(base, { ...EMPTY_EXPLORER_FILTERS, source: 'Egresos · efectivo', category: 'Gastos Generales', concept: 'Servicio de limpieza', minAmount: '199.99', maxAmount: '200' });
  expect(filtered).toHaveLength(1);
  expect(filtered[0].monto).toBe(200);
  expect(base).toHaveLength(3);
});

test('ordenación no muta el arreglo original', () => {
  const sorted = sortFinanceMovements(base, 'monto-desc');
  expect(sorted.map(r => r.key)).toEqual(['I1', 'E3', 'E2']);
  expect(base.map(r => r.key)).toEqual(['I1', 'E2', 'E3']);
});
