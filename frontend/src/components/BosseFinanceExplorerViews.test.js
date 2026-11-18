import { EXPLORER_SPLIT_COLUMNS, EXPLORER_TABLE_COLUMNS, getExplorerVisibleColumns } from './BosseFinanceExplorer';

test('vista dividida mantiene fecha, folio, tipo, concepto, importe y Ver', () => {
  expect(getExplorerVisibleColumns('split').map(c => c.key)).toEqual(EXPLORER_SPLIT_COLUMNS);
  expect(getExplorerVisibleColumns('split', [])).toHaveLength(6);
});

test('tabla completa muestra las diez columnas y respeta su personalización', () => {
  expect(getExplorerVisibleColumns('full')).toHaveLength(10);
  expect(getExplorerVisibleColumns('full', ['concept', 'party']).map(c => c.key))
    .toEqual(['date', 'folio', 'concept', 'party', 'amount', 'action']);
  expect(EXPLORER_TABLE_COLUMNS.filter(c => c.fixed).map(c => c.key))
    .toEqual(['date', 'folio', 'amount', 'action']);
});
