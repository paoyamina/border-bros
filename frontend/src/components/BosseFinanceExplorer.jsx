import React, { useEffect, useMemo, useState } from 'react';
import BosseFinanceIcon from './BosseFinanceIcon';
import './BosseFinanceExplorerFiltersApproved.css';
import './BosseFinanceExplorerStage2.css';
import './BosseFinanceExplorerViews.css';

// Esta pantalla utiliza exclusivamente los movimientos incluidos por el servidor
// en el análisis financiero del negocio y periodo autorizados.
export const EMPTY_EXPLORER_FILTERS = Object.freeze({
  search: '', kind: 'Todos', source: 'Todos', category: 'Todas',
  concept: 'Todos', party: 'Todos', user: 'Todos', status: 'Todos',
  dateFrom: '', dateTo: '', minAmount: '', maxAmount: '', recordKeys: []
});

const asText = value => String(value ?? '').trim();
const normalize = value => asText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');
const amount = value => Number(value) || 0;
const fmt = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount(value));
const collation = (a, b) => asText(a).localeCompare(asText(b), 'es-MX', { numeric: true, sensitivity: 'base' });
const displayDate = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso || '')
  ? `${iso.slice(8, 10)} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
  : asText(iso) || 'Sin dato';

// Las columnas obligatorias mantienen identificable cada movimiento.
// Las restantes se muestran por defecto; el contador puede ocultarlas sin alterar los datos.
export const EXPLORER_TABLE_COLUMNS = Object.freeze([
  { key: 'date', title: 'Fecha', width: 114, fixed: true },
  { key: 'folio', title: 'Folio', width: 172, fixed: true },
  { key: 'type', title: 'Tipo', width: 92 },
  { key: 'source', title: 'Módulo origen', width: 162 },
  { key: 'category', title: 'Categoría', width: 132 },
  { key: 'concept', title: 'Concepto', width: 205 },
  { key: 'party', title: 'Proveedor / responsable', width: 164 },
  { key: 'amount', title: 'Importe', width: 143, fixed: true },
  { key: 'status', title: 'Estado', width: 100 },
  { key: 'action', title: 'Ver', width: 80, fixed: true }
]);
const OPTIONAL_COLUMNS = EXPLORER_TABLE_COLUMNS.filter(column => !column.fixed);

// En vista dividida el contador debe ver Importe y Ver sin desplazarse lateralmente.
// En tabla completa se respetan las columnas elegidas por el usuario.
export const EXPLORER_SPLIT_COLUMNS = Object.freeze(['date', 'folio', 'type', 'concept', 'amount', 'action']);
const SPLIT_COLUMN_WIDTHS = Object.freeze({
  date: '14%', folio: '20%', type: '11%', concept: '27%', amount: '18%', action: '10%'
});
export function getExplorerVisibleColumns(mode, optionalKeys = OPTIONAL_COLUMNS.map(c => c.key)) {
  return mode === 'split'
    ? EXPLORER_TABLE_COLUMNS.filter(column => EXPLORER_SPLIT_COLUMNS.includes(column.key))
    : EXPLORER_TABLE_COLUMNS.filter(column => column.fixed || optionalKeys.includes(column.key));
}



export function filterFinanceMovements(rows = [], filters = EMPTY_EXPLORER_FILTERS) {
  const f = { ...EMPTY_EXPLORER_FILTERS, ...filters };
  const text = normalize(f.search);
  const from = f.minAmount === '' ? null : Number(f.minAmount);
  const to = f.maxAmount === '' ? null : Number(f.maxAmount);
  const selectedKeys = Array.isArray(f.recordKeys) && f.recordKeys.length ? new Set(f.recordKeys) : null;
  return rows.filter(row => {
    if (selectedKeys && !selectedKeys.has(row.key)) return false;
    if (f.dateFrom && row.fecha < f.dateFrom) return false;
    if (f.dateTo && row.fecha > f.dateTo) return false;
    if (f.kind !== 'Todos' && !(f.kind === 'Egreso' && ['Egreso', 'Nómina'].includes(row.type)) && row.type !== f.kind) return false;
    if (f.source !== 'Todos' && row.source !== f.source) return false;
    if (f.category !== 'Todas' && row.categoria !== f.category) return false;
    if (f.concept !== 'Todos' && row.concepto !== f.concept) return false;
    if (f.party !== 'Todos' && row.proveedor !== f.party) return false;
    if (f.user !== 'Todos' && row.responsable !== f.user) return false;
    if (f.status !== 'Todos' && row.status !== f.status) return false;
    if (from !== null && Number.isFinite(from) && amount(row.monto) < from) return false;
    if (to !== null && Number.isFinite(to) && amount(row.monto) > to) return false;
    if (text && ![row.fecha, row.folio, row.id, row.type, row.source, row.categoria,
      row.concepto, row.proveedor, row.responsable, row.status, row.raw?.referencia]
      .some(v => normalize(v).includes(text))) return false;
    return true;
  });
}

export function sortFinanceMovements(rows = [], order = 'fecha-desc') {
  const compare = {
    'fecha-desc': (a, b) => collation(b.fecha, a.fecha) || collation(b.folio, a.folio),
    'fecha-asc': (a, b) => collation(a.fecha, b.fecha) || collation(a.folio, b.folio),
    'monto-desc': (a, b) => amount(b.monto) - amount(a.monto),
    'monto-asc': (a, b) => amount(a.monto) - amount(b.monto),
    'concepto-asc': (a, b) => collation(a.concepto, b.concepto)
  }[order] || ((a, b) => collation(b.fecha, a.fecha));
  return [...rows].sort(compare);
}

function choices(rows, key) {
  return [...new Set(rows.map(row => asText(row[key])).filter(Boolean))].sort(collation);
}

function SelectFilter({ title, value, onChange, items, allValue = 'Todos', icon, className = '' }) {
  return <label className={`be-x-filter ${className}`}>
    <span className="be-x-filter-label">{icon && <BosseFinanceIcon name={icon} size={16}/>} {title}</span>
    <select aria-label={title} value={value} onChange={e => onChange(e.target.value)}>
      <option value={allValue}>{allValue}</option>{items.map(item => <option key={item} value={item}>{item}</option>)}
    </select>
  </label>;
}

const activeFilterNames = {
  search: 'Buscar', kind: 'Tipo', source: 'Módulo origen', category: 'Categoría',
  concept: 'Concepto', party: 'Proveedor / responsable', user: 'Usuario', status: 'Estatus',
  dateFrom: 'Desde', dateTo: 'Hasta', minAmount: 'Importe desde', maxAmount: 'Importe hasta', recordKeys: 'Evidencia de BorderBro'
};

export default function BosseFinanceExplorer({
  rows = [], filteredRows = [], filters = EMPTY_EXPLORER_FILTERS, onFiltersChange,
  onReset, hide = false, selected, onOpen, detailSlot,
  onExport, fechaInicio = '', fechaFin = '', totalOficial = {}
}) {
  const [sort, setSort] = useState('fecha-desc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState('split');
  const [fullDetailOpen, setFullDetailOpen] = useState(false);
  const lastFullOpenButton = React.useRef(null);
  const hadFullModal = React.useRef(false);
  const [optionalColumnKeys, setOptionalColumnKeys] = useState(() => OPTIONAL_COLUMNS.map(column => column.key));
  const visibleColumns = getExplorerVisibleColumns(viewMode, optionalColumnKeys);
  const showColumn = key => visibleColumns.some(column => column.key === key);
  const toggleColumn = key => setOptionalColumnKeys(previous => previous.includes(key)
    ? previous.filter(value => value !== key)
    : [...previous, key]);
  const tableMinWidth = viewMode === 'full'
    ? visibleColumns.reduce((total, column) => total + column.width, 0)
    : 0;
  const switchViewMode = nextMode => {
    setViewMode(nextMode);
    setColumnMenuOpen(false);
    setFullDetailOpen(false);
  };
  const openRecord = (row, trigger) => {
    onOpen(row);
    if (viewMode === 'full') {
      lastFullOpenButton.current = trigger || null;
      setFullDetailOpen(true);
    }
  };
  const closeFullDetail = () => setFullDetailOpen(false);
  const sorted = useMemo(() => sortFinanceMovements(filteredRows, sort), [filteredRows, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  const incomes = filteredRows.filter(row => row.type === 'Ingreso').reduce((n, row) => n + amount(row.monto), 0);
  const expenses = filteredRows.filter(row => row.type !== 'Ingreso').reduce((n, row) => n + amount(row.monto), 0);
  const categories = useMemo(() => choices(rows, 'categoria'), [rows]);
  const sources = useMemo(() => choices(rows, 'source'), [rows]);
  const concepts = useMemo(() => choices(rows, 'concepto'), [rows]);
  const parties = useMemo(() => choices(rows, 'proveedor').filter(v => v !== '—'), [rows]);
  const users = useMemo(() => choices(rows, 'responsable').filter(v => v !== '—'), [rows]);
  const statuses = useMemo(() => choices(rows, 'status').filter(v => v !== '—'), [rows]);
  const applied = Object.entries(filters).filter(([k, v]) => k === 'recordKeys' ? Array.isArray(v) && v.length > 0 : String(v ?? '') !== String(EMPTY_EXPLORER_FILTERS[k] ?? ''));
  const isCompletePeriod = !applied.length;
  const differenceIncome = amount(totalOficial.total_ingresos) - incomes;
  const differenceExpense = amount(totalOficial.total_egresos) - expenses;
  const discrepancy = isCompletePeriod && (Math.abs(differenceIncome) > 0.011 || Math.abs(differenceExpense) > 0.011);
  const update = (field, value) => onFiltersChange({ ...filters, [field]: value });
  useEffect(() => setPage(1), [filters, pageSize, sort]);
  // En vista dividida, Esc cierra el inspector como antes.
  // En tabla completa, Esc solo cierra la ficha superpuesta y conserva la selección.
  useEffect(() => {
    if (viewMode !== 'split' || !selected) return undefined;
    const onKeyDown = event => { if (event.key === 'Escape') onOpen(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, selected, onOpen]);
  // Esc cierra la ficha superpuesta de la tabla completa, sin perder los filtros.
  useEffect(() => {
    if (!fullDetailOpen || viewMode !== 'full') return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') setFullDetailOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullDetailOpen, viewMode]);
  useEffect(() => {
    if (!selected) setFullDetailOpen(false);
  }, [selected]);
  useEffect(() => {
    if (fullDetailOpen) hadFullModal.current = true;
    else if (hadFullModal.current) {
      hadFullModal.current = false;
      lastFullOpenButton.current?.focus();
    }
  }, [fullDetailOpen]);
  const keepDialogFocus = event => {
    if (event.key !== 'Tab') return;
    const elements = [...event.currentTarget.querySelectorAll(
      'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'
    )].filter(el => el.getClientRects().length > 0);
    if (!elements.length) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const showValue = value => hide ? '••••••' : fmt(value);
  return <div className="be-x-screen be-x-stage2">

    <section className="be-x-filter-card be-x-filters-approved" aria-label="Filtros de movimientos">
      <div className="be-x-filters-grid" role="group" aria-label="Filtros principales">
        <SelectFilter title="Tipo" icon="exchange" className="be-x-f-cell-kind" value={filters.kind} onChange={v => update('kind', v)} items={['Ingreso', 'Egreso', 'Nómina']} />
        <SelectFilter title="Módulo origen" icon="layers" className="be-x-f-cell-source" value={filters.source} onChange={v => update('source', v)} items={sources}/>
        <SelectFilter title="Categoría" icon="database" className="be-x-f-cell-category" value={filters.category} onChange={v => update('category', v)} items={categories} allValue="Todas"/>
        <SelectFilter title="Concepto" icon="receipt" className="be-x-f-cell-concept" value={filters.concept} onChange={v => update('concept', v)} items={concepts}/>
        <SelectFilter title="Proveedor / responsable" icon="people" className="be-x-f-cell-party" value={filters.party} onChange={v => update('party', v)} items={parties}/>
        <SelectFilter title="Usuario" icon="people" className="be-x-f-cell-user" value={filters.user} onChange={v => update('user', v)} items={users}/>
        <SelectFilter title="Estatus" icon="shield" className="be-x-f-cell-status" value={filters.status} onChange={v => update('status', v)} items={statuses}/>
        <label className="be-x-filter be-x-f-cell-min"><span className="be-x-filter-label"><BosseFinanceIcon name="coins" size={18}/> Importe desde</span>
          <input type="number" min="0" step="0.01" aria-label="Importe desde, MXN" value={filters.minAmount} onChange={e => update('minAmount', e.target.value)} placeholder="Sin mínimo" /></label>
        <label className="be-x-filter be-x-f-cell-max"><span className="be-x-filter-label"><BosseFinanceIcon name="coins" size={18}/> Importe hasta</span>
          <input type="number" min="0" step="0.01" aria-label="Importe hasta, MXN" value={filters.maxAmount} onChange={e => update('maxAmount', e.target.value)} placeholder="Sin máximo" /></label>
        <label className="be-x-filter be-x-f-cell-search"><span className="be-x-filter-label"><BosseFinanceIcon name="search" size={18}/> Buscar folio o texto</span>
          <input type="search" value={filters.search} onChange={e => update('search', e.target.value)} placeholder="Ej. corte, renta, proveedor…" /></label>
      </div>
      <div className="be-x-filters-actions be-x-approved-actions">
        <span className="be-x-auto-note"><BosseFinanceIcon name="check" size={15}/> Actualización automática</span>
        <button type="button" aria-expanded={showAdvanced} aria-controls="be-x-subperiod-filters" onClick={() => setShowAdvanced(x => !x)}>
          <BosseFinanceIcon name="calendar" size={15}/> {showAdvanced ? 'Ocultar fechas específicas' : 'Fechas específicas'}
        </button>
        <button type="button" onClick={onReset}><BosseFinanceIcon name="filter" size={16}/> Limpiar filtros</button>
      </div>
      {showAdvanced && <div className="be-x-subperiod" id="be-x-subperiod-filters" aria-label="Subperiodo dentro del periodo seleccionado">
        <p>Acota la búsqueda dentro del periodo seleccionado arriba. No cambia el periodo general.</p>
        <label className="be-x-filter"><span>Desde</span><input aria-label="Desde (subperiodo)" type="date" min={fechaInicio} max={filters.dateTo || fechaFin} value={filters.dateFrom} onChange={e => update('dateFrom', e.target.value)} /></label>
        <label className="be-x-filter"><span>Hasta</span><input aria-label="Hasta (subperiodo)" type="date" min={filters.dateFrom || fechaInicio} max={fechaFin} value={filters.dateTo} onChange={e => update('dateTo', e.target.value)} /></label>
      </div>}
      {applied.length > 0 && <div className="be-x-active-filters" aria-label="Filtros activos"><strong>Filtros activos:</strong>{applied.map(([key, value]) => <button type="button" key={key} onClick={() => update(key, EMPTY_EXPLORER_FILTERS[key])} title={`Quitar filtro ${activeFilterNames[key]}`} aria-label={`Quitar filtro ${activeFilterNames[key]}`}>{activeFilterNames[key]}: {key === 'recordKeys' ? `${value.length} registros exactos` : value} ×</button>)}</div>}
    </section>
    <div className="be-x-stats be-x-stage2-stats" aria-label="Resumen de movimientos filtrados" aria-live="polite">
      <div className="be-x-stage2-stat">
        <div className="be-x-stage2-stat-head"><BosseFinanceIcon name="layers" size={25}/><span>Registros</span></div>
        <strong>{filteredRows.length.toLocaleString('es-MX')}</strong><small>Movimientos de esta selección</small>
      </div>
      <div className="be-x-stage2-stat">
        <div className="be-x-stage2-stat-head"><BosseFinanceIcon name="coins" size={25}/><span>Ingresos</span></div>
        <strong>{showValue(incomes)}</strong><small>Cortes de caja que cumplen los filtros</small>
      </div>
      <div className="be-x-stage2-stat">
        <div className="be-x-stage2-stat-head"><BosseFinanceIcon name="wallet" size={25}/><span>Egresos</span></div>
        <strong>{showValue(expenses)}</strong><small>Incluye nómina real contabilizada</small>
      </div>
      <div className="be-x-stage2-stat be-x-stats-net">
        <div className="be-x-stage2-stat-head"><BosseFinanceIcon name="chart" size={25}/><span>Ingresos menos egresos</span></div>
        <strong>{showValue(incomes - expenses)}</strong><small>No incluye resultado cambiario</small>
      </div>
    </div>
    {discrepancy && <div className="be-x-warning" role="status">⚠ Los movimientos de la consulta completa no coinciden con el resumen oficial: ingresos {showValue(differenceIncome)}; egresos {showValue(differenceExpense)}. Revisa el origen de los datos.</div>}
    <div className="be-x-helper" role="note">ⓘ Para ver todos los datos de un movimiento, haz clic en <strong>Ver detalle</strong>. Los filtros y las exportaciones respetan el periodo y negocio seleccionados.</div>
    <div className={`be-x-workspace be-x-has-detail be-x-mode-${viewMode} ${viewMode === 'split' && selected ? 'be-x-selected-open' : ''}`}>
      <section className="be-x-results" aria-label="Movimientos del periodo">
        <div className="be-x-table-toolbar">
          <div className="be-x-table-title">
            <h3 className="be-inline-icon"><BosseFinanceIcon name="receipt" size={23}/> Movimientos del periodo</h3>
            <p>{filteredRows.length.toLocaleString('es-MX')} resultados · Registros incluidos en el análisis financiero</p>
          </div>
          <div className="be-x-view-switch" role="group" aria-label="Modo de visualización de movimientos">
            <button type="button" className={viewMode === 'split' ? 'active' : ''} aria-pressed={viewMode === 'split'} onClick={() => switchViewMode('split')}>
              <BosseFinanceIcon name="layers" size={16}/> Vista dividida
            </button>
            <button type="button" className={viewMode === 'full' ? 'active' : ''} aria-pressed={viewMode === 'full'} onClick={() => switchViewMode('full')}>
              <BosseFinanceIcon name="receipt" size={16}/> Tabla completa
            </button>
          </div>
          <div className="be-x-table-actions">
            <button type="button" className="be-x-column-button" aria-expanded={columnMenuOpen} aria-controls="be-x-column-settings" onClick={() => {
              if (viewMode === 'split') { setViewMode('full'); setFullDetailOpen(false); setColumnMenuOpen(true); }
              else setColumnMenuOpen(open => !open);
            }}>
              <BosseFinanceIcon name="sliders" size={17}/> Personalizar columnas
            </button>
            <button type="button" onClick={() => onExport('pdf')} disabled={hide}><BosseFinanceIcon name="pdf" size={17}/> PDF filtrado</button>
            <button type="button" onClick={() => onExport('excel')} disabled={hide}><BosseFinanceIcon name="excel" size={17}/> Excel filtrado</button>
          </div>
          <label className="be-x-stage2-sort">Ordenar por
            <select aria-label="Ordenar por" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="fecha-desc">Fecha más reciente</option>
              <option value="fecha-asc">Fecha más antigua</option>
              <option value="monto-desc">Importe mayor</option>
              <option value="monto-asc">Importe menor</option>
              <option value="concepto-asc">Concepto A-Z</option>
            </select>
          </label>
        </div>
        {viewMode === 'full' && columnMenuOpen && <div className="be-x-column-settings" id="be-x-column-settings" aria-label="Personalizar columnas de movimientos">
          <div className="be-x-column-info">
            <strong>Columnas visibles ({visibleColumns.length} de {EXPLORER_TABLE_COLUMNS.length})</strong>
            <span>Fecha, folio, importe y Ver permanecen siempre visibles.</span>
          </div>
          <div className="be-x-column-options" role="group" aria-label="Columnas opcionales">
            {OPTIONAL_COLUMNS.map(column => <label key={column.key}>
              <input type="checkbox" checked={optionalColumnKeys.includes(column.key)} onChange={() => toggleColumn(column.key)}/>
              {column.title}
            </label>)}
          </div>
          <button type="button" className="be-x-restore-columns" onClick={() => setOptionalColumnKeys(OPTIONAL_COLUMNS.map(column => column.key))}>Mostrar todas las columnas</button>
        </div>}
        {visible.length ? <>
          {viewMode === 'full' && <div className="be-x-table-scroll-help"><BosseFinanceIcon name="exchange" size={14}/> Tabla completa: si no caben las diez columnas, desplázala horizontalmente. «Importe» y «Ver» siguen disponibles en Vista dividida.</div>}
          <div className="be-x-table-wrap" role="region" tabIndex="0" aria-label="Tabla de movimientos; desplazamiento horizontal disponible">
            <table className="be-x-table be-x-stage2-table" style={viewMode === 'full' ? { minWidth: `${tableMinWidth}px` } : { width: '100%', minWidth: 0 }}>
              <colgroup>{visibleColumns.map(column => <col key={column.key} style={{ width: viewMode === 'split' ? SPLIT_COLUMN_WIDTHS[column.key] : `${column.width}px` }}/>)}</colgroup>
              <thead><tr>
                {showColumn('date') && <th scope="col" aria-sort={sort.startsWith('fecha-') ? sort.endsWith('asc') ? 'ascending' : 'descending' : 'none'}><button type="button" className="be-x-sort-th" onClick={() => setSort(value => value === 'fecha-asc' ? 'fecha-desc' : 'fecha-asc')}>Fecha <span aria-hidden="true">↕</span></button></th>}
                {showColumn('folio') && <th scope="col">Folio</th>}
                {showColumn('type') && <th scope="col">Tipo</th>}
                {showColumn('source') && <th scope="col">Módulo origen</th>}
                {showColumn('category') && <th scope="col">Categoría</th>}
                {showColumn('concept') && <th scope="col">Concepto</th>}
                {showColumn('party') && <th scope="col">Proveedor / responsable</th>}
                {showColumn('amount') && <th scope="col" className="be-x-amount" aria-sort={sort.startsWith('monto-') ? sort.endsWith('asc') ? 'ascending' : 'descending' : 'none'}><button type="button" className="be-x-sort-th" onClick={() => setSort(value => value === 'monto-asc' ? 'monto-desc' : 'monto-asc')}>Importe <span aria-hidden="true">↕</span></button></th>}
                {showColumn('status') && <th scope="col">Estado</th>}
                {showColumn('action') && <th scope="col">Ver</th>}
              </tr></thead>
              <tbody>{visible.map(row => <tr key={row.key} className={selected?.key === row.key ? 'be-x-selected' : ''}>
                {showColumn('date') && <td data-label="Fecha" className="be-x-cell-date" title={row.fecha}>{displayDate(row.fecha)}</td>}
                {showColumn('folio') && <td data-label="Folio" className="be-x-cell-folio"><strong title={row.folio}>{row.folio}</strong></td>}
                {showColumn('type') && <td data-label="Tipo"><span className={`be-type ${row.type === 'Ingreso' ? 'income' : 'expense'}`}>{row.type}</span></td>}
                {showColumn('source') && <td data-label="Módulo origen" title={row.source}>{row.source || 'Sin dato'}</td>}
                {showColumn('category') && <td data-label="Categoría" title={row.categoria}>{row.categoria || 'Sin dato'}</td>}
                {showColumn('concept') && <td data-label="Concepto" className="be-x-cell-concept"><strong title={row.concepto}>{row.concepto || 'Sin concepto'}</strong></td>}
                {showColumn('party') && <td data-label="Proveedor / responsable" title={row.proveedor}>{row.proveedor && row.proveedor !== '—' ? row.proveedor : 'Sin dato'}</td>}
                {showColumn('amount') && <td data-label="Importe" className={`be-x-amount ${row.type === 'Ingreso' ? 'be-positive' : 'be-negative'}`}>{hide ? '••••••' : `${row.type === 'Ingreso' ? '+' : '−'}${fmt(row.monto)}`}</td>}
                {showColumn('status') && <td data-label="Estado"><span className={`be-x-status ${row.status && row.status !== '—' ? 'be-x-has-status' : ''}`}>{row.status && row.status !== '—' ? row.status : 'Sin dato'}</span></td>}
                {showColumn('action') && <td data-label="Ver"><button type="button" className="be-x-open" aria-label={`Ver detalle de ${row.folio}`} onClick={e => openRecord(row, e.currentTarget)}><BosseFinanceIcon name="eye" size={17}/> Ver</button></td>}
              </tr>)}</tbody>
            </table>
          </div>
        </> : <div className="be-x-empty"><strong>Sin resultados con estos filtros.</strong><p>Prueba otro concepto o elimina alguno de los filtros seleccionados.</p><button type="button" onClick={onReset}>Mostrar todos los movimientos</button></div>}
        <div className="be-x-pagination">
          <span>Mostrando {sorted.length ? (Math.min(page, pages) - 1) * pageSize + 1 : 0}–{Math.min(Math.min(page, pages) * pageSize, sorted.length)} de {sorted.length.toLocaleString('es-MX')}</span>
          <div><button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Página anterior">‹</button><span>Página {Math.min(page, pages)} de {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage(p => p + 1)} aria-label="Página siguiente">›</button></div>
          <label>Filas por página <select aria-label="Filas por página" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
        </div>
      </section>
      {viewMode === 'split' && <div className="be-x-detail-panel">{selected ? detailSlot : <aside className="be-x-inspector-empty" aria-label="Panel de inspección">
        <span className="be-x-inspector-icon"><BosseFinanceIcon name="eye" size={30}/></span>
        <h3>Detalle del movimiento</h3>
        <p>Selecciona <strong>Ver detalle</strong> en cualquier fila para comprobar aquí todos sus datos, el origen de la cifra, el historial y los comprobantes disponibles.</p>
        <div className="be-x-inspector-steps"><span><BosseFinanceIcon name="receipt" size={19}/> 1. Elige un registro</span><span><BosseFinanceIcon name="database" size={19}/> 2. Revisa el desglose</span><span><BosseFinanceIcon name="file" size={19}/> 3. Consulta su evidencia</span></div>
        <p className="be-x-inspector-foot">No necesitas volver a Administración. Esta consulta es de solo lectura.</p>
      </aside>}</div>}
    </div>
    {viewMode === 'full' && fullDetailOpen && selected && <div className="be-x-inspector-modal" role="presentation">
      <button type="button" className="be-x-inspector-backdrop" aria-label="Cerrar ficha y volver a la tabla completa" onClick={closeFullDetail}/>
      <section className="be-x-full-inspector" role="dialog" aria-modal="true" aria-label={`Detalle del movimiento ${selected.folio}`} onKeyDown={keepDialogFocus}>
        <div className="be-x-full-inspector-header">
          <div><span>ANÁLISIS FINANCIERO · AUDITORÍA</span><strong>{selected.folio}</strong></div>
          <button type="button" autoFocus onClick={closeFullDetail}><BosseFinanceIcon name="back" size={17}/> Volver a tabla completa</button>
        </div>
        <div className="be-x-full-inspector-body">{detailSlot}</div>
      </section>
    </div>}
    <p className="be-x-footnote">Los cortes de caja se muestran como un ingreso reconocido por corte; sus métodos de pago no se duplican. Este listado no incluye operaciones excluidas del cálculo financiero ni el resultado cambiario como movimiento de caja.</p>
  </div>;
}
