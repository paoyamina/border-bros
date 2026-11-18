import {
  rangoDeGrafica, filtrarMovimientosGrafica, totalesMovimientosGrafica
} from './BosseFinanceChartLogic';

const rows = [
  { key: 'I1', fecha: '2026-11-06', type: 'Ingreso', folio: 'CORTE-1', concepto: 'Venta del día', categoria: 'Corte de caja', monto: 1200 },
  { key: 'E2', fecha: '2026-11-07', type: 'Egreso', folio: 'EGR-2', concepto: 'Servicio de limpieza', categoria: 'Gastos generales', proveedor: 'Águila', monto: 250 },
  { key: 'N3', fecha: '2026-11-08', type: 'Nómina', folio: 'NOM-3', concepto: 'Nómina semanal', categoria: 'Nómina', monto: 310 },
  { key: 'I4', fecha: '2026-11-13', type: 'Ingreso', folio: 'CORTE-4', concepto: 'Venta', categoria: 'Corte de caja', monto: 900 }
];

test('semanas viernes-jueves, acotadas al periodo consultado', () => {
  expect(rangoDeGrafica('2026-11-06', 'semana', '2026-11-07', '2026-11-30')).toEqual(['2026-11-07','2026-11-12']);
});

test('rango mensual y anual', () => {
  expect(rangoDeGrafica('2028-02', 'mes', '2028-01-01', '2028-12-31')).toEqual(['2028-02-01','2028-02-29']);
  expect(rangoDeGrafica('2026', 'anio', '2026-10-01', '2026-11-12')).toEqual(['2026-10-01','2026-11-12']);
});

test('el filtro Egreso incluye Nómina y excluye Ingreso', () => {
  expect(filtrarMovimientosGrafica(rows, { tipo: 'Egreso' }).map(x => x.key)).toEqual(['E2','N3']);
});

test('la búsqueda ignora acentos y conserva periodos', () => {
  expect(filtrarMovimientosGrafica(rows, { rango: ['2026-11-06','2026-11-12'], buscar: 'aguila' }).map(x=>x.key)).toEqual(['E2']);
  expect(filtrarMovimientosGrafica(rows, { rango: ['2026-11-06','2026-11-12'] }).map(x=>x.key)).toEqual(['I1','E2','N3']);
});

test('el desglose suma ingresos y egresos sin excluir Nómina', () => {
  expect(totalesMovimientosGrafica(rows)).toEqual({ ingresos: 2100, egresos: 560 });
});
