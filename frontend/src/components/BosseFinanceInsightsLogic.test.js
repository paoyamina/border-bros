import { buildSummaryInsights } from './BosseFinanceInsightsLogic';

test('deriva cuatro hallazgos contables sin duplicar nómina', () => {
  const result = buildSummaryInsights({
    periodo: { estado: 'PROVISIONAL' },
    comparacion: { ingresos: { porcentaje: 139.39 }, egresos: { porcentaje: -95.83 }, gpm: { diferencia_pp: 62.43 } },
    resumen: { total_ingresos: 997178, total_egresos: 11040, total_nomina: 0, gpm: 98.89 }
  });
  expect(result.items.map(item => item.target)).toEqual(['ingresos', 'rentabilidad', 'egresos', 'prenomina']);
  expect(result.items.map(item => item.title)).toEqual(['Crecimiento de ingresos', 'Margen de ganancia', 'Reducción de egresos', 'Nómina sin movimientos']);
  expect(result.estado).toBe('PROVISIONAL');
});

test('cuando no hay comparacion no inventa variaciones', () => {
  const result = buildSummaryInsights({ resumen: { total_nomina: 25 } });
  expect(result.comparacion).toBe(false);
  expect(result.estado).toBeNull();
  expect(result.items[0].change).toBeUndefined();
  expect(result.items[3].title).toBe('Nómina contabilizada');
});

test('nunca describe una subida de egresos como reduccion', () => {
  const result = buildSummaryInsights({
    periodo: { estado: 'CONSOLIDADO' },
    comparacion: { ingresos: { porcentaje: -12 }, egresos: { porcentaje: 14 }, gpm: { diferencia_pp: -4 } },
    resumen: { total_ingresos: 100, total_egresos: 80, total_nomina: 5, gpm: 20 }
  });
  expect(result.items[0].title).toBe('Reducción de ingresos');
  expect(result.items[2].title).toBe('Aumento de egresos');
  expect(result.items[1].tone).toBe('caution');
});
