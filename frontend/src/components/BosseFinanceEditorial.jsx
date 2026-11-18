import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, CartesianGrid,
  XAxis, YAxis, Tooltip, Legend, Cell
} from 'recharts';
import API_BASE_URL, { apiFetch } from '../config/api';
import './BosseFinanceEditorial.css';
import BosseFinanceExplorer, { EMPTY_EXPLORER_FILTERS, filterFinanceMovements } from './BosseFinanceExplorer';
import BosseFinanceCharts from './BosseFinanceCharts';
import BosseFinanceBorderBro from './BosseFinanceBorderBro';
import BosseFinanceIcon from './BosseFinanceIcon';
import { getBorderBroFindings, calculateBorderBroScenario } from './BosseFinanceBorderBroLogic';
import { rangoDeGrafica, filtrarMovimientosGrafica } from './BosseFinanceChartLogic';
import { summarizeMovementGroups } from './BosseFinanceChartPresentation';
import './BosseFinancePolish.css';
import './BosseFinanceFidelity.css';
import './BosseFinanceHeaderApproved.css';
import './BosseFinanceAuditStage3.css';
import './BosseFinanceResumenMockup.css';
import './BosseFinanceInsightsApproved.css';
import { buildSummaryInsights } from './BosseFinanceInsightsLogic';

// Las cifras contables se reciben de /api/analisis-financiero; esta capa no las recalcula.
const SUMMARY_PREVIEW_LIMIT = 4;
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const date = value => String(value || '').slice(0, 10);
const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num(value));
const compact = value => new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(num(value));
const percentage = value => `${num(value).toFixed(1)}%`;
const dateLabel = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? `${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}` : 'Sin fecha';
const shortTableDate = value => {
  const v = date(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Sin fecha';
  return `${v.slice(8, 10)} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(v.slice(5, 7)) - 1]} ${v.slice(0, 4)}`;
};
const safeExcelValue = value => typeof value === 'string' && /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeHttps = value => typeof value === 'string' && /^https:\/\/[^\s]+$/i.test(value) ? value : null;
const fridayOf = iso => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 2) % 7)); return d.toISOString().slice(0, 10); };

export function groupFinanceDays(rows = [], granularity = 'semana') {
  const grouped = new Map();
  (rows || []).forEach(row => {
    const f = date(row.fecha_financiera);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return;
    const key = granularity === 'anio' ? f.slice(0, 4) : granularity === 'mes' ? f.slice(0, 7) : granularity === 'dia' ? f : fridayOf(f);
    if (!grouped.has(key)) grouped.set(key, { key, ingresos: 0, egresos: 0, gm: 0 });
    const point = grouped.get(key);
    point.ingresos += num(row.ingresos);
    point.egresos += num(row.egresos);
    point.gm += row.gm == null ? num(row.ingresos) - num(row.egresos) : num(row.gm);
  });
  return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key)).map(p => ({
    ...p, label: granularity === 'anio' ? p.key : granularity === 'mes' ? `${p.key.slice(5)}/${p.key.slice(2, 4)}` : `${p.key.slice(8)}/${p.key.slice(5, 7)}`,
    gpm: p.ingresos ? p.gm / p.ingresos * 100 : null
  }));
}

function movementRows(analysis) {
  return [
    ...(analysis?.ingresos_detalle || []).map(r => ({
      key: `I${r.corte_id}`, type: 'Ingreso', id: r.corte_id, fecha: date(r.fecha_financiera),
      folio: r.folio || `Corte ${r.corte_id}`, concepto: r.concepto || 'Venta / Corte de caja',
      categoria: 'Corte de caja', proveedor: r.usuario_nombre || '—',
      source: 'Cortes de caja', responsable: r.usuario_nombre || '—', status: r.estatus || '—',
      monto: num(r.total_ingresos), raw: r
    })),
    ...(analysis?.egresos_detalle || []).map(r => ({
      key: `E${r.egreso_id}`, type: r.es_nomina ? 'Nómina' : 'Egreso', id: r.egreso_id,
      fecha: date(r.fecha_financiera), folio: r.folio || `Egreso ${r.egreso_id}`,
      concepto: r.concepto || 'Sin concepto', categoria: r.categoria || r.tipo_egreso || 'Sin categoría',
      proveedor: r.proveedor || '—', responsable: r.usuario_nombre || '—', status: r.estatus || '—',
      source: r.es_nomina ? 'Nómina' : r.tipo_egreso ? `Egresos · ${r.tipo_egreso}` : 'Egresos',
      monto: num(r.monto_mxn), raw: r
    }))
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));
}


function DetailsDrawer({ record, hide, onClose, inline = false, resumen = {} }) {
  const [extra, setExtra] = useState(null);
  const [error, setError] = useState('');
  const [historial, setHistorial] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [auditExportError, setAuditExportError] = useState('');
  const dataRef = useRef(null);
  const contributionRef = useRef(null);
  const voucherRef = useRef(null);
  const historyRef = useRef(null);
  const relationsRef = useRef(null);

  // Se mantienen las mismas rutas, autenticación y comprobación de permisos.
  useEffect(() => {
    setExtra(null); setError(''); setAuditExportError('');
    if (!record || record.type !== 'Ingreso') return undefined;
    let valid = true;
    apiFetch(`${API_BASE_URL}/api/cortes/${record.id}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo abrir el corte');
        return data.corte;
      })
      .then(data => { if (valid) setExtra(data); })
      .catch(err => { if (valid) setError(err.message); });
    return () => { valid = false; };
  }, [record]);
  useEffect(() => {
    setHistorial([]); setHistoryError('');
    if (!record || !record.id) return undefined;
    let valid = true;
    setHistoryLoading(true);
    const endpoint = record.type === 'Ingreso' ? 'cortes' : 'egresos';
    apiFetch(`${API_BASE_URL}/api/${endpoint}/${record.id}/historial`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo consultar el historial');
        return data.historial || [];
      })
      .then(rows => { if (valid) setHistorial(rows); })
      .catch(err => { if (valid) setHistoryError(err.message); })
      .finally(() => { if (valid) setHistoryLoading(false); });
    return () => { valid = false; };
  }, [record]);
  // En Tabla completa Esc pertenece al diálogo exterior: solo se cierra la ficha,
  // sin borrar el movimiento seleccionado ni el estado de la tabla.
  useEffect(() => {
    if (!record || inline) return undefined;
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [record, onClose, inline]);
  if (!record) return null;

  const r = { ...record.raw, ...(extra || {}) };
  const typeName = record.type === 'Ingreso' ? 'Ingreso' : record.type === 'Nómina' ? 'Nómina' : 'Egreso';
  const fields = record.type === 'Ingreso' ? [
    ['Ingreso reconocido', r.total_ingresos, 'money'], ['Venta ticket', r.venta_ticket, 'money'], ['Cover', r.total_cover, 'money'],
    ['Total general', r.total_general, 'money'], ['Tarjetas', r.total_tarjetas, 'money'], ['TPV BBVA', r.tpv_desglose?.bbva, 'money'],
    ['TPV Plataforma', r.tpv_desglose?.plataforma, 'money'], ['Efectivo MXN', r.total_efectivo_mxn, 'money'],
    ['Efectivo USD', r.total_efectivo_usd, 'usd'], ['Tipo de cambio', r.tipo_cambio], ['Diferencia', r.diferencia, 'money'],
    ['Vales', r.total_vales, 'money'], ['Cuentas por cobrar', r.total_cxc, 'money'],
    ['Gastos del corte', r.gastos_corte, 'money'], ['Reglamentos', r.reglamentos, 'money'],
    ['Responsable', r.usuario_nombre], ['Estatus', r.estatus], ['Fecha de registro', r.fecha_registro],
    ['Semana financiera inicio', r.semana_inicio], ['Semana financiera fin', r.semana_fin]
  ] : [
    ['Importe MXN', r.monto_mxn, 'money'], ['Importe original', r.monto_original, 'amount'], ['Divisa', r.divisa],
    ['Tipo de cambio', r.tipo_cambio], ['Categoría', r.categoria], ['Proveedor', r.proveedor],
    ['Cuenta', r.cuenta], ['Referencia', r.referencia], ['Responsable', r.usuario_nombre], ['Estatus', r.estatus],
    ['Tipo de egreso', r.tipo_egreso], ['Fecha de registro', r.fecha_registro]
  ];
  const collections = record.type === 'Ingreso' && extra ? [
    ['Denominaciones de efectivo', extra.denominaciones || [], item => `${item.moneda || ''} ${item.valor ?? ''} × ${item.cantidad ?? '—'}`, item => item.monto_mxn],
    ['Vales', extra.vales || [], item => item.concepto || item.nombre || `Vale ${item.id}`, item => item.monto_mxn ?? item.monto],
    ['Cuentas por cobrar', extra.cxc || [], item => item.nombre || item.concepto || `Registro ${item.id}`, item => item.monto_mxn ?? item.monto],
    ['Gastos del corte', extra.gastos_corte_detalle || [], item => item.concepto || item.categoria_nombre || `Egreso ${item.id}`, item => item.monto_mxn],
    ['Reglamentos del corte', extra.reglamentos_detalle || [], item => item.concepto || item.categoria_nombre || `Egreso ${item.id}`, item => item.monto_mxn]
  ] : [];
  const sourceTotal = record.type === 'Ingreso' ? num(resumen.total_ingresos) : num(resumen.total_egresos);
  const sourceTitle = record.type === 'Ingreso' ? 'Ingresos del periodo' : 'Egresos del periodo';
  const voucherLink = safeHttps(r.comprobante_url) || safeHttps(r.drive_folder_url);
  const showField = (value, format) => value === null || value === undefined || value === '' ? 'Sin dato'
    : hide && ['money', 'usd', 'amount'].includes(format) ? '••••••'
    : format === 'money' ? money(value)
    : format === 'usd' ? `${num(value).toFixed(2)} USD`
    : format === 'amount' ? num(value).toLocaleString('es-MX', { maximumFractionDigits: 2 }) : String(value);

  const goTo = ref => {
    if (!ref.current) return;
    if (ref.current.tagName === 'DETAILS') ref.current.open = true;
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const exportOne = format => {
    if (hide) return;
    setAuditExportError('');
    const values = [
      ['BOSSE · Ficha del movimiento', record.folio],
      ['Tipo', typeName], ['Fecha financiera', record.fecha], ['Concepto', record.concepto],
      ['Módulo origen', record.source], ['Categoría', record.categoria],
      ['Proveedor / responsable', record.proveedor], ['Importe MXN', num(record.monto)],
      ['Estatus', record.status && record.status !== '—' ? record.status : 'Sin dato'],
      ['Contribuye a', sourceTitle], ['Total del periodo', sourceTotal],
      ...fields.map(([name, value, form]) => [name, showField(value, form)]),
      ...collections.flatMap(([title, rows, describe, getAmount]) =>
        rows.map(item => [title, describe(item), getAmount(item) == null ? 'Sin importe' : money(getAmount(item))])),
      ...historial.map(event => ['Historial', event.accion || 'Cambio registrado', event.fecha || '', event.usuario || ''])
    ];
    try {
      if (format === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet(values.map(row => row.map(safeExcelValue)));
        worksheet['!cols'] = [{ wch: 33 }, { wch: 46 }, { wch: 22 }, { wch: 22 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimiento');
        const safeFolio = String(record.folio || record.id || 'registro').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
        XLSX.writeFile(workbook, `BOSSE_Movimiento_${safeFolio}.xlsx`);
      } else {
        const page = window.open('', '_blank');
        if (!page) { setAuditExportError('Permite ventanas emergentes para imprimir o guardar como PDF.'); return; }
        const rows = values.map(row => `<tr>${row.map(value => `<td>${html(value)}</td>`).join('')}</tr>`).join('');
        page.document.open();
        page.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>BOSSE · ${html(record.folio)}</title><style>body{color:#191919;font:13px Arial,sans-serif;padding:26px}h1{font:28px Georgia,serif}table{border-collapse:collapse;width:100%;margin-top:14px}td{padding:8px;border-bottom:1px solid #d9d2c9;vertical-align:top;overflow-wrap:anywhere}td:first-child{font-weight:bold;width:33%}@page{size:A4;margin:14mm}</style></head><body><h1>Ficha de movimiento</h1><p>BOSSE · ${html(record.folio)} · ${html(record.fecha)}</p><table>${rows}</table><p>Consulta de solo lectura. Datos disponibles en Análisis Financiero.</p><script>window.onload=function(){window.print()};</script></body></html>`);
        page.document.close();
      }
    } catch (err) { setAuditExportError(`No se pudo exportar este movimiento: ${err.message}`); }
  };

  const drawer = <aside className={`be-drawer be-finance-audit ${inline ? 'be-drawer-inline' : ''}`} role={inline ? 'complementary' : 'dialog'} aria-modal={inline ? undefined : true} aria-label={`Ficha de auditoría: ${record.folio}`}>
    <header className="be-audit-heading">
      <div className="be-audit-heading-top">
        <div className="be-audit-heading-copy">
          <span className="be-audit-overline"><BosseFinanceIcon name="layers" size={17}/> FICHA DE AUDITORÍA · {typeName.toUpperCase()}</span>
          <h2>Movimiento: {record.folio}</h2>
        </div>
        <button type="button" className="be-audit-close" onClick={onClose} aria-label="Cerrar ficha de auditoría">×</button>
      </div>
      <div className="be-audit-breadcrumb"><BosseFinanceIcon name="chart" size={15}/> Visto desde: Análisis Financiero › Explorar movimientos</div>
      <div className="be-audit-main-amount">
        <div><small>{record.fecha ? dateLabel(record.fecha) : 'Sin fecha'} · {record.concepto}</small><strong>{hide ? '••••••' : money(record.monto)}</strong></div>
        <span className="be-audit-type">{typeName}</span>
      </div>
      <div className="be-audit-quick-actions" aria-label="Acciones del movimiento">
        {voucherLink && !hide ? <a className="be-audit-quick-primary" href={voucherLink} target="_blank" rel="noopener noreferrer"><BosseFinanceIcon name="file" size={16}/> Abrir comprobante ↗</a>
          : <span className="be-audit-unavailable" title="No existe un enlace de comprobante en este registro"><BosseFinanceIcon name="file" size={15}/> Sin comprobante adjunto</span>}
        <button type="button" onClick={() => goTo(historyRef)}><BosseFinanceIcon name="clock" size={16}/> Ver historial</button>
        <button type="button" onClick={() => goTo(contributionRef)}><BosseFinanceIcon name="layers" size={16}/> Ver en contexto</button>
      </div>
      <div className="be-audit-export-one" aria-label="Exportar este movimiento">
        <span>Exportar solo este movimiento:</span>
        <button type="button" disabled={hide} onClick={() => exportOne('pdf')}><BosseFinanceIcon name="pdf" size={16}/> PDF</button>
        <button type="button" disabled={hide} onClick={() => exportOne('excel')}><BosseFinanceIcon name="excel" size={16}/> Excel</button>
      </div>
      {auditExportError && <p className="be-error" role="alert">{auditExportError}</p>}
    </header>

    <div className="be-audit-content">
      {error && <p role="alert" className="be-error">No se pudo cargar el detalle completo: {error}</p>}
      <details ref={dataRef} open className="be-audit-details be-audit-section">
        <summary><BosseFinanceIcon name="receipt" size={18}/> Datos del movimiento</summary>
        <div className="be-audit-essential">
          <div><small>Fecha</small><strong>{dateLabel(record.fecha)}</strong></div>
          <div><small>Módulo origen</small><strong>{record.source || 'Sin dato'}</strong></div>
          <div><small>Categoría</small><strong>{record.categoria || 'Sin dato'}</strong></div>
          <div><small>Responsable / proveedor</small><strong>{record.proveedor && record.proveedor !== '—' ? record.proveedor : 'Sin dato'}</strong></div>
          <div><small>Estatus</small><strong>{record.status && record.status !== '—' ? record.status : 'Sin dato'}</strong></div>
          <div><small>Folio</small><strong>{record.folio}</strong></div>
        </div>
        <details className="be-audit-subdetail"><summary>Mostrar todos los campos originales ({fields.length})</summary>
          <dl className="be-detail-grid">{fields.map(([name, value, format]) => <div key={name}><dt>{name}</dt><dd>{showField(value, format)}</dd></div>)}</dl>
        </details>
      </details>

      <details ref={contributionRef} open className="be-audit-details be-audit-section">
        <summary><BosseFinanceIcon name="chart" size={18}/> ¿Qué número alimenta?</summary>
        <div className="be-drawer-contribution be-audit-contribution">
          <span>Este movimiento forma parte de:</span><strong>{sourceTitle}</strong>
          <b>{hide ? '••••••' : money(sourceTotal)}</b>
          <small>Aporta {hide ? '••••••' : sourceTotal ? `${(num(record.monto) / sourceTotal * 100).toFixed(2)}%` : 'una proporción no calculable'} al total del periodo consultado.</small>
          {record.type === 'Nómina' && <p>También forma parte de la nómina real: {hide ? '••••••' : money(resumen.total_nomina)}.</p>}
        </div>
        {record.type === 'Ingreso' && <p className="be-audit-warning">Conceptos de venta y métodos de pago son dos vistas del mismo corte: no se suman entre sí.</p>}
      </details>

      {record.type === 'Ingreso' && <details open className="be-audit-details be-audit-section">
        <summary><BosseFinanceIcon name="database" size={18}/> Desglose del corte de caja</summary>
        {!extra && !error && <p className="be-note">Cargando conceptos y componentes del corte…</p>}
        {error && <p className="be-note">No se pudo recuperar el detalle ampliado de este corte.</p>}
        {collections.map(([label, rows, describe, getAmount]) => <details className="be-audit-subdetail" key={label}>
          <summary>{label} ({rows.length})</summary>
          {rows.length ? <div className="be-audit-list">{rows.map((item, i) => <div key={item.id || i}><span>{describe(item)}</span><strong>{getAmount(item) == null ? 'Sin importe' : hide ? '••••••' : money(getAmount(item))}</strong></div>)}</div> : <p className="be-note">Sin registros en esta sección.</p>}
        </details>)}
      </details>}

      <details ref={voucherRef} open className="be-audit-details be-audit-section">
        <summary><BosseFinanceIcon name="file" size={18}/> Comprobante</summary>
        {voucherLink && !hide ? <p className="be-audit-link-line"><BosseFinanceIcon name="file" size={20}/><span>Enlace vinculado al registro original</span><a href={voucherLink} target="_blank" rel="noopener noreferrer">Abrir ↗</a></p>
          : <p className="be-note">No se ha registrado un enlace de comprobante para este movimiento. No se ha creado ningún archivo ficticio.</p>}
      </details>
      <details ref={historyRef} open className="be-audit-details be-audit-section">
        <summary><BosseFinanceIcon name="clock" size={18}/> Historial de cambios ({historial.length})</summary>
        {historyLoading ? <p className="be-note">Cargando historial…</p> : historyError ? <p className="be-note" role="alert">Historial no disponible: {historyError}</p> : historial.length ? <ol className="be-history-list">{historial.map((event, i) => <li key={event.id || i}>
          <strong>{event.accion || 'Cambio registrado'}</strong>
          <span>{event.fecha ? new Date(event.fecha).toLocaleString('es-MX') : 'Sin fecha'} · {event.usuario || 'Usuario no identificado'}</span>
          <details><summary>Ver valores registrados</summary><dl className="be-history-values">{Object.entries(hide ? {} : event.datos_nuevos || {}).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{hide && /(monto|total|importe)/i.test(name) ? '••••••' : typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</dd></div>)}</dl></details>
        </li>)}</ol> : <p className="be-note">No hay eventos de historial disponibles para este registro.</p>}
      </details>
      <details ref={relationsRef} className="be-audit-details be-audit-section">
        <summary><BosseFinanceIcon name="layers" size={18}/> Referencias y relaciones</summary>
        <dl className="be-audit-relations"><div><dt>Registro de origen</dt><dd>{record.type === 'Ingreso' ? 'Corte de caja' : 'Egreso'} #{record.id}</dd></div>
        {r.referencia && <div><dt>Referencia registrada</dt><dd>{r.referencia}</dd></div>}
        {record.type !== 'Ingreso' && r.corte_id && <div><dt>Corte vinculado</dt><dd>{r.corte_id}</dd></div>}
        </dl>
        <p className="be-note">Solo se muestran relaciones presentes en el registro; no se generan enlaces adicionales.</p>
      </details>
      <p className="be-audit-disclaimer"><BosseFinanceIcon name="shield" size={15}/> Consulta de solo lectura · Datos de Administración · Fecha financiera de Tijuana (cierre 05:00). Ningún dato fue modificado.</p>
    </div>
  </aside>;
  return inline ? drawer : <div className="be-overlay" onMouseDown={event => event.target === event.currentTarget && onClose()}>{drawer}</div>;
}

function ExportButtons({ section, onExport, disabled = false }) {
  return <span className="be-exports"><button type="button" disabled={disabled} onClick={e => { e.stopPropagation(); onExport(section, 'pdf'); }} aria-label={`PDF de ${section}`}><BosseFinanceIcon name="pdf" size={16}/> PDF</button><button type="button" disabled={disabled} onClick={e => { e.stopPropagation(); onExport(section, 'excel'); }} aria-label={`Excel de ${section}`}><BosseFinanceIcon name="excel" size={16}/> Excel</button></span>;
}

function MovementTable({ rows, onOpen, hide, limit = 0 }) {
  const data = limit ? rows.slice(0, limit) : rows;
  if (!data.length) return <p className="be-note">No hay movimientos que coincidan con esta selección.</p>;
  return <div className="be-table-wrap be-summary-table-wrap"><table className="be-table be-summary-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto / Folio</th><th>Proveedor / Responsable</th><th className="be-right">Importe</th><th>Ver</th></tr></thead><tbody>{data.map(row => <tr key={row.key}>
    <td data-label="Fecha" className="be-summary-date">{shortTableDate(row.fecha)}</td><td data-label="Tipo"><span className={`be-type ${row.type === 'Ingreso' ? 'income' : 'expense'}`}>{row.type}</span></td>
    <td data-label="Categoría">{row.categoria}</td>
    <td data-label="Concepto"><strong>{row.concepto}</strong><small>{row.folio}</small></td><td data-label="Proveedor">{row.proveedor}</td>
    <td data-label="Importe" className={`be-right be-summary-amount ${row.type === 'Ingreso' ? 'be-positive' : 'be-negative'}`}><span>{hide ? '••••••' : `${row.type === 'Ingreso' ? '+' : '−'}${money(row.monto)}`}</span></td>
    <td data-label="Ver"><button type="button" className="be-eye" onClick={() => onOpen(row)} aria-label={`Ver detalle de ${row.folio}`}><BosseFinanceIcon name="eye" size={17}/> Ver</button></td>
  </tr>)}</tbody></table></div>;
}

// Tendencias solo cuando el backend provee el periodo comparable.
function Trend({ data, pp = false, hide = false }) {
  const value = pp ? data?.diferencia_pp : data?.porcentaje;
  if (hide) return <span className="be-trend-muted">Importes ocultos</span>;
  if (value == null || !Number.isFinite(Number(value))) return <span className="be-trend-muted">Sin comparación disponible</span>;
  const n = Number(value);
  return <span className={`be-trend ${n > 0 ? 'up' : n < 0 ? 'down' : 'neutral'}`}>{n > 0 ? '↑' : n < 0 ? '↓' : '•'} {n > 0 ? '+' : ''}{n.toFixed(2)}{pp ? ' pp' : '%'}</span>;
}

function SummaryInsights({ analisis, fechaInicio, fechaFin, moneyDisplay, onExplore, onDetailed, hide }) {
  const { items, estado, comparacion, descripcionComparacion } = buildSummaryInsights(analisis);
  const statusLabel = estado === 'PROVISIONAL' ? 'Provisional' : estado === 'CONSOLIDADO' ? 'Consolidado' : 'Sin confirmar';
  const statusDescription = estado === 'PROVISIONAL'
    ? 'Hay periodos pendientes de contabilización. Los indicadores todavía pueden cambiar.'
    : estado === 'CONSOLIDADO'
      ? 'Periodo marcado como consolidado por BOSSE.'
      : 'BOSSE no informó el estado de cierre de este periodo.';
  const renderVariation = (item) => {
    if (hide) return '••••••';
    const delta = item.comparisonMode === 'pp' ? item.change?.diferencia_pp : item.change?.porcentaje;
    if (delta === null || delta === undefined || !Number.isFinite(Number(delta))) return 'Sin comparación disponible';
    const value = Number(delta);
    return `${value > 0 ? '↑ +' : value < 0 ? '↓ ' : '• '}${value.toFixed(2)}${item.comparisonMode === 'pp' ? ' pp' : '%'}`;
  };
  return <aside className="be-summary-insights be-insights-approved" aria-label="Insights del periodo">
    <div className="be-summary-insights-head"><span className="be-gold-symbol" aria-hidden="true"><BosseFinanceIcon name="sparkles" size={25}/></span><div><h2>Insights del periodo</h2><p>Lectura automática de los principales hallazgos.</p></div></div>
    <div className={`be-insights-period ${estado === 'PROVISIONAL' ? 'is-provisional' : ''}`}>
      <div className="be-insights-period-header"><BosseFinanceIcon name="calendar" size={21}/><div className="be-insights-period-dates"><strong>Periodo analizado</strong><span>{dateLabel(fechaInicio)} — {dateLabel(fechaFin)}</span></div><span className="be-insights-status">{statusLabel}</span></div>
      <p>{statusDescription}</p>
    </div>
    <h3>¿Qué destaca?</h3>
    <div className="be-insights-list">{items.map(item => <button key={item.key} type="button" className="be-insights-finding" onClick={() => onExplore(item.target)} aria-label={`Abrir desglose de ${item.title}`}>
      <span aria-hidden="true" className={`be-insights-finding-icon is-${item.tone}`}><BosseFinanceIcon name={item.icon} size={19}/></span>
      <span className="be-insights-finding-body"><strong>{item.title}</strong><span className="be-insights-metric">{item.isPercent ? (hide ? '••••••' : item.value === null ? 'Sin dato' : percentage(item.value)) : moneyDisplay(item.value)} <span className={`be-insights-delta is-${item.tone}`}>{renderVariation(item)}</span></span><small>{item.detail}</small></span>
      <BosseFinanceIcon name="chevronRight" size={15}/>
    </button>)}</div>
    <p className="be-insights-comparison">{comparacion ? `Comparación: ${descripcionComparacion}.` : 'Sin periodo comparable disponible.'} Selecciona un hallazgo para abrir el desglose, sin regresar a Administración.</p>
    <button type="button" className="be-insights-detail-action" onClick={onDetailed}>Ver análisis detallado <BosseFinanceIcon name="chevronRight" size={17}/></button>
  </aside>;
}

function Reconciliation({ expected, rows, hide, label }) {
  const actual = rows.reduce((sum, r) => sum + num(r.monto), 0);
  const diff = num(expected) - actual;
  return <div className={`be-reconciliation ${Math.abs(diff) > 0.011 ? 'warning' : ''}`} role="status">
    <span><strong>{rows.length}</strong> registros del {label}</span>
    <span>Total de registros: <strong>{hide ? '••••••' : money(actual)}</strong></span>
    {Math.abs(diff) > 0.011 ? <span className="be-reconciliation-note">⚠ Diferencia con el resumen oficial: {hide ? '••••••' : money(diff)}. Revisar filtros y origen de datos.</span> : <span className="be-reconciliation-ok">✓ Coincide con el total oficial</span>}
  </div>;
}

function CategoryComposition({ rows, categories, selectedCategory, selectedConcept, setCategory, setConcept, moneyDisplay, expected }) {
  const [showConcepts, setShowConcepts] = useState(false);
  // Las barras expresan parte del total oficial, no parte de la categoría mayor.
  const chartTotal = Math.max(0, num(expected));
  const filteredForConcepts = rows.filter(r => selectedCategory === 'Todas' || r.categoria === selectedCategory);
  const concepts = new Map();
  filteredForConcepts.forEach(r => concepts.set(r.concepto, (concepts.get(r.concepto) || 0) + num(r.monto)));
  const conceptTotals = [...concepts].sort((a, b) => b[1] - a[1]);
  return <div className="be-category-composition">
    <div className="be-category-heading"><h3>Por categoría</h3><small>{categories.length} categorías</small></div>
    <div className="be-category-options"><button type="button" aria-pressed={selectedCategory === 'Todas'} className={selectedCategory === 'Todas' ? 'selected' : ''} onClick={() => { setCategory('Todas'); setConcept('Todos'); setShowConcepts(false); }}>
      <span className="be-cat-line"><strong>Todas las categorías</strong><b>{moneyDisplay(expected)}</b></span>
    </button>
      {categories.map(c => <button type="button" key={c.nombre} aria-pressed={selectedCategory === c.nombre} className={selectedCategory === c.nombre ? 'selected' : ''} onClick={() => { setCategory(c.nombre); setConcept('Todos'); setShowConcepts(true); }}>
        <span className="be-cat-line"><strong>{c.nombre}</strong><b>{moneyDisplay(c.monto)}</b></span>
        <span className="be-cat-track"><span style={{ width: `${chartTotal ? Math.max(0, Math.min(100, num(c.monto) / chartTotal * 100)) : 0}%` }} /></span>
        <small>{expected ? `${(num(c.monto) / expected * 100).toFixed(1)}% de egresos` : '0% de egresos'} · Ver conceptos</small>
      </button>)}
    </div>
    <button type="button" className="be-concepts-disclosure" aria-expanded={showConcepts} onClick={() => setShowConcepts(x => !x)}><span>Conceptos ({conceptTotals.length})</span><span aria-hidden="true">{showConcepts ? '−' : '+'}</span></button>
    {showConcepts && <><div className="be-concepts">{conceptTotals.map(([name, amount]) => <button type="button" key={name} aria-pressed={selectedConcept === name} className={selectedConcept === name ? 'selected' : ''} onClick={() => setConcept(selectedConcept === name ? 'Todos' : name)}><span>{name}</span><strong>{moneyDisplay(amount)}</strong></button>)}</div>
    {!conceptTotals.length && <p className="be-note">No hay conceptos para esta categoría.</p>}</>}
  </div>;
}

const accordionItems = [
  ['ingresos', 'coins', 'Ingresos', 'Todos los cortes de caja que forman el ingreso reconocido'],
  ['egresos', 'wallet', 'Egresos', 'Categorías, conceptos y cada gasto individual'],
  ['rentabilidad', 'percent', 'Cómo se calcula la ganancia (GM y GPM)', 'Ingresos − egresos + resultado cambiario'],
  ['socios', 'people', 'Distribución por socio', 'Participación, ganancia y adelantos registrados'],
  ['cambiario', 'exchange', 'Resultado cambiario', 'Conversiones de divisa con folio de corte'],
  ['prenomina', 'calendar', 'Prenómina vs nómina real', 'Referencia de prenómina frente al gasto real'],
  ['movimientos', 'layers', 'Movimientos del periodo', 'Lista completa de ingresos y egresos'],
  ['evolucion', 'trend', 'Evolución financiera', 'Comparación por día, semana, mes o año']
];

export default function BosseFinanceEditorial({
  analisis, fechaInicio = '', fechaFin = '', setFechaInicio = () => {}, setFechaFin = () => {},
  onActualizar = () => {}, cargando = false, error = '',
  onExcel = () => {}, onPDF = () => {}, onBorderBro = () => {}, onPrivacyChange = () => {},
  borderBroAbierto = false, chat = null, activeSection = 'resumen', onActiveSectionChange = () => {},
  negocioNombre = 'BOSSE', negocioId, usuarioNombre = '', usuarioRol = ''
}) {
  const [open, setOpen] = useState('egresos');
  useEffect(() => { if (activeSection === 'resumen') setOpen(current => current ?? 'egresos'); }, [activeSection]);
  const [summaryCategory, setSummaryCategory] = useState('Todas');
  const [summaryConcept, setSummaryConcept] = useState('Todos');
  const [summaryAllRows, setSummaryAllRows] = useState(false);
  const [hide, setHide] = useState(false);
  useEffect(() => { onPrivacyChange(hide); }, [hide, onPrivacyChange]);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('bosse-editorial-theme') || 'light'; } catch { return 'light'; } });
  const [granularity, setGranularity] = useState('semana');
  const [chartDimension, setChartDimension] = useState('semana');
  const [chartMetric, setChartMetric] = useState('ingresos-egresos');
  const [chartStyle, setChartStyle] = useState('barras-linea');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('Todos');
  const [category, setCategory] = useState('Todas');
  const [exploreFilters, setExploreFilters] = useState({ ...EMPTY_EXPLORER_FILTERS });
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selected, setSelected] = useState(null);
  const explorerInitialSelection = useRef(null);
  useEffect(() => { explorerInitialSelection.current = null; setSelected(null); }, [activeSection, negocioId, fechaInicio, fechaFin, analisis]);
  useEffect(() => { setExploreFilters({ ...EMPTY_EXPLORER_FILTERS }); }, [negocioId, fechaInicio, fechaFin]);
  const [exportError, setExportError] = useState('');
  const [savedViews, setSavedViews] = useState([]);
  const summary = analisis?.resumen || {};
  const socios = analisis?.distribucion_socios || [];
  const divisas = analisis?.resultado_cambiario_detalle || [];
  const prenominas = analisis?.prenomina_referencia || [];
  const comparacionNomina = analisis?.comparacion_nomina || {};
  const movements = useMemo(() => movementRows(analisis), [analisis]);
  const rawChart = useMemo(() => groupFinanceDays(
    (analisis?.evolucion_diaria || []).filter(r => date(r.fecha_financiera) >= fechaInicio && date(r.fecha_financiera) <= fechaFin), granularity
  ), [analisis, fechaInicio, fechaFin, granularity]);
  const chart = rawChart;
  const categories = useMemo(() => {
    // La agrupación oficial proviene de la misma vista SQL que el total de egresos.
    if (Array.isArray(analisis?.egresos_por_categoria)) {
      return analisis.egresos_por_categoria.map(r => ({ nombre: r.categoria || 'Sin categoría', monto: num(r.total) }))
        .sort((a, b) => b.monto - a.monto);
    }
    const totals = new Map();
    (analisis?.egresos_detalle || []).forEach(r => { const c = r.categoria || r.tipo_egreso || 'Sin categoría'; totals.set(c, (totals.get(c) || 0) + num(r.monto_mxn)); });
    return [...totals].map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto);
  }, [analisis]);
  const range = useMemo(() => rangoDeGrafica(selectedPeriod?.key, granularity, fechaInicio, fechaFin),
    [selectedPeriod?.key, granularity, fechaInicio, fechaFin]);
  const exploreFiltered = useMemo(() => filterFinanceMovements(movements, exploreFilters), [movements, exploreFilters]);
  useEffect(() => {
    if (activeSection !== 'explorar') { explorerInitialSelection.current = null; return; }
    const firstRealRecord = exploreFiltered[0];
    if (!firstRealRecord) return;
    const selectionToken = [negocioId, fechaInicio, fechaFin, JSON.stringify(exploreFilters)].join('|');
    if (explorerInitialSelection.current === selectionToken) return;
    explorerInitialSelection.current = selectionToken;
    setSelected(firstRealRecord);
  }, [activeSection, exploreFiltered, negocioId, fechaInicio, fechaFin, exploreFilters]);

  const filtered = useMemo(() => filtrarMovimientosGrafica(movements, {
    rango: range, tipo: kind, categoria: category, buscar: search
  }), [movements, range, kind, category, search]);
  const moneyDisplay = v => hide ? '••••••' : v == null ? 'Sin dato' : money(v);
  const amount = value => hide ? '••••••' : money(value);
  const total = num(summary.total_ingresos);
  const expense = num(summary.total_egresos);
  const gm = num(summary.gm);
  const comparison = analisis?.comparacion || {};
  const incomeRows = useMemo(() => movements.filter(r => r.type === 'Ingreso'), [movements]);
  const expenseRows = useMemo(() => movements.filter(r => r.type !== 'Ingreso'), [movements]);
  const summaryExpenseRows = expenseRows.filter(r =>
    (summaryCategory === 'Todas' || r.categoria === summaryCategory) &&
    (summaryConcept === 'Todos' || r.concepto === summaryConcept)
  );
  const summaryPreviewRows = summaryAllRows ? summaryExpenseRows : summaryExpenseRows.slice(0, SUMMARY_PREVIEW_LIMIT);
  const summaryMoney = value => hide ? '••••••' : money(value);
  const summaryOpen = key => { setOpen(key); setSummaryAllRows(false); };
  const seeSummaryInExplorer = (key, filters = {}) => {
    setSelectedPeriod(null);
    setCategory(filters.category || 'Todas');
    setKind(key === 'ingresos' ? 'Ingreso' : key === 'egresos' ? 'Egreso' : 'Todos');
    setSearch(filters.concept || '');
    setExploreFilters({ ...EMPTY_EXPLORER_FILTERS,
      kind: key === 'ingresos' ? 'Ingreso' : key === 'egresos' ? 'Egreso' : 'Todos',
      category: filters.category || 'Todas', concept: filters.concept || 'Todos' });
    setSelected(null);
    changeSection('explorar');
  };
  const borderBroFindings = useMemo(() => getBorderBroFindings(analisis, movements), [analisis, movements]);
  const segmentTitle = { resumen: 'Análisis Financiero', explorar: 'Explorar movimientos', graficas: 'Gráficas', borderbro: 'BorderBro' }[activeSection] || 'Resumen financiero';

  const changeSection = next => { onActiveSectionChange(next); setOpen(next === 'resumen' ? 'egresos' : null); };
  const resetFilters = () => { setSearch(''); setKind('Todos'); setCategory('Todas'); setSelectedPeriod(null); };
  const exploreExactEvidence = finding => {
    const keys = (finding?.evidence || []).map(r => r.key);
    if (!keys.length) return;
    setExploreFilters({ ...EMPTY_EXPLORER_FILTERS, recordKeys: keys });
    setSelected(null);
    changeSection('explorar');
  };
  const exploreFromChart = ({ rango, tipo, categoria, buscar, recordKeys }) => {
    // Selecciones por concepto/categoría deben conservar los IDs exactos.
    setExploreFilters(Array.isArray(recordKeys) ? { ...EMPTY_EXPLORER_FILTERS, recordKeys } :
      { ...EMPTY_EXPLORER_FILTERS, kind: tipo, category: categoria, search: buscar,
        dateFrom: rango?.[0] || '', dateTo: rango?.[1] || '' });
    setSelected(null);
    changeSection('explorar');
  };
  const rangeLabel = range ? `${range[0]} — ${range[1]}` : `${fechaInicio} — ${fechaFin}`;
  const exportRows = (section, options = {}) => {
    const simOptions = section === 'borderbro' ? options : {};
    const scenarioSales = Number(simOptions.salesChange) || 0;
    const scenarioOps = Number(simOptions.operatingChange) || 0;
    const scenarioPayroll = Number(simOptions.payrollChange) || 0;
    const currentScenario = calculateBorderBroScenario(summary, scenarioSales, scenarioOps, scenarioPayroll);
    const heading = { evolucion: 'Evolución financiera', ingresos: 'Ingresos', egresos: 'Egresos', socios: 'Distribución por socio', cambiario: 'Resultado cambiario', prenomina: 'Prenómina vs nómina real', movimientos: 'Movimientos', graficas: 'Datos de la gráfica', 'graficas-seleccion': 'Movimientos de la selección de la gráfica', borderbro: 'BorderBro' }[section] || segmentTitle;
    const metadata = (section === 'graficas' || section === 'graficas-seleccion') ?
      [['BOSSE · ' + heading], ['Negocio', negocioNombre], ['Periodo consultado', fechaInicio, fechaFin],
        ['Rango seleccionado', rangeLabel], ['Agrupar por', chartDimension], ['Métrica', chartMetric],
        ['Tipo de movimientos', kind], ['Categoría', category], ['Búsqueda', search],
        ['Movimientos de la selección', Array.isArray(options.recordKeys) ? options.recordKeys.length : filtered.length], []] : section === 'borderbro' ? [['BOSSE · BorderBro'], ['Negocio', negocioNombre], ['Periodo consultado', fechaInicio, fechaFin], ['Alcance', 'Hallazgos deterministas basados en movimientos disponibles; simulaciones no son registros reales'], ['Escenario: ventas (%)', scenarioSales], ['Escenario: gastos operativos (%)', scenarioOps], ['Escenario: nómina (%)', scenarioPayroll], []] : section === 'explorar' ? [ ['BOSSE · Explorar movimientos'], ['Negocio', negocioNombre], ['Periodo consultado', fechaInicio, fechaFin], ['Alcance', 'Solo movimientos incluidos en el análisis financiero'], ...Object.entries(exploreFilters).filter(([k,v]) => k === 'recordKeys' ? Array.isArray(v) && v.length > 0 : String(v ?? '') !== String(EMPTY_EXPLORER_FILTERS[k] ?? '')).map(([k,v]) => [`Filtro: ${k}`, k === 'recordKeys' ? `${v.length} registros exactos del hallazgo` : v]), ['Número de registros exportados', exploreFiltered.length], []] : [['BOSSE · ' + heading], ['Negocio', negocioNombre], ['Periodo consultado', fechaInicio, fechaFin], ['Filtro de movimientos', kind], ['Categoría', category], ['Periodo seleccionado', rangeLabel], ['Categoría en resumen', section === 'egresos' ? summaryCategory : 'Todas'], ['Concepto en resumen', section === 'egresos' ? summaryConcept : 'Todos'], []];
    const rows = section === 'graficas' && ['categoria', 'concepto'].includes(chartDimension) ?
      [ [chartDimension === 'categoria' ? 'Categoría' : 'Concepto', 'Ingresos por movimientos', 'Egresos por movimientos', 'Nómina incluida', 'Registros'],
        ...summarizeMovementGroups(movements, chartDimension).map(r => [r.label, r.ingresos, r.egresos, r.nomina, r.count]) ] :
      (section === 'evolucion' || section === 'graficas') ? [ ['Periodo', 'Ingresos', 'Egresos', 'GM', 'GPM'], ...chart.map(r => [r.key, r.ingresos, r.egresos, r.gm, r.gpm])] :
      section === 'socios' ? [['Socio', 'Participación (%)', 'Ganancia del GM', 'Adelantos', 'Devoluciones', 'Saldo de adelantos'], ...socios.map(s => [s.socio, s.porcentaje_participacion, s.participacion_gm, s.adelantos, s.devoluciones, s.saldo_adelantos])] :
      section === 'cambiario' ? [['Folio', 'Monto USD', 'Tipo de cambio', 'Resultado MXN'], ...divisas.map(d => [d.corte_folio || `Corte ${d.corte_id}`, d.monto_usd, d.tipo_cambio_realizado, d.resultado_cambiario_mxn])] :
      section === 'prenomina' ? [['Indicador', 'Importe MXN'], ['Prenómina estimada', comparacionNomina.prenomina_referencia], ['Nómina real', comparacionNomina.nomina_real], ['Diferencia', comparacionNomina.diferencia], ...prenominas.map(p => [`Prenómina ${p.id ?? ''}`, p.monto_total ?? p.total ?? p.importe ?? null])] :
      section === 'rentabilidad' ? [['Indicador', 'Valor MXN'], ['Ingresos', total], ['Egresos', expense], ['Resultado cambiario', summary.resultado_cambiario], ['GM', gm], ['GPM (%)', summary.gpm]] :
      section === 'borderbro' ? [['Hallazgo', 'Estado', 'Explicación', 'Cantidad de movimientos', 'Folios vinculados'], ...borderBroFindings.map(f => [f.title, f.status, f.description, f.evidence.length, f.evidence.map(r => r.folio).join(', ')]), [], ['Valores base del escenario (sin modificar)', 'Importe MXN'], ['Ingresos oficiales', total], ['Egresos oficiales', expense], ['GM oficial', summary.gm], ['GPM oficial (%)', summary.gpm], [], ['Escenario simulado', 'Importe MXN'], ['Ingresos simulados', currentScenario.income], ['Egresos simulados', currentScenario.expense], ['GM simulado', currentScenario.gm], ['GPM simulado (%)', currentScenario.gpm]] :
      section === 'ingresos' || section === 'egresos' || section === 'movimientos' || section === 'explorar' || section === 'graficas-seleccion' ?
        [['Fecha', 'Tipo', 'Folio', 'Concepto', 'Categoría', 'Origen', 'Proveedor', 'Responsable', 'Estatus', 'Monto MXN'], ...(section === 'ingresos' ? incomeRows : section === 'egresos' ? summaryExpenseRows : section === 'movimientos' ? movements : section === 'graficas-seleccion' ? (Array.isArray(options.recordKeys) ? movements.filter(m => options.recordKeys.includes(m.key)) : filtered) : exploreFiltered).map(r => [r.fecha, r.type, r.folio, r.concepto, r.categoria, r.source, r.proveedor, r.responsable, r.status, r.monto])] :
      [['Métrica', 'Importe'], ['Ingresos', total], ['Egresos', expense], ['GM', gm], ['GPM', summary.gpm], ...socios.map(s => [s.socio, s.participacion_gm])];
    return { heading, rows: [...metadata, ...rows].map(r => r.map(safeExcelValue)) };
  };
  const exportSection = (section, format, options = {}) => {
    if (hide || !analisis) return;
    setExportError('');
    const { heading, rows } = exportRows(section, options);
    try {
      if (format === 'excel') {
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 25 }, { wch: 30 }, { wch: 23 }, { wch: 22 }, { wch: 18 }];
        const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'BOSSE');
        XLSX.writeFile(book, `BOSSE_${section}_${fechaInicio}_${fechaFin}.xlsx`);
      } else {
        // El diálogo nativo permite "Guardar como PDF" sin trasladar datos a un servicio externo.
        const printable = rows.map(r => `<tr>${r.map(c => `<td>${html(c)}</td>`).join('')}</tr>`).join('');
        const pane = window.open('', '_blank');
        if (!pane) { setExportError('Permite ventanas emergentes para abrir la impresión y guardar como PDF.'); return; }
        pane.document.open();
        pane.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>BOSSE · ${html(heading)}</title><style>body{font:12px Arial,sans-serif;color:#27231e;padding:35px}h1{font:normal 28px Georgia,serif}table{border-collapse:collapse;width:100%;margin-top:20px}td{border-bottom:1px solid #ddd;padding:8px;vertical-align:top;overflow-wrap:anywhere}tr:first-child{font-weight:bold;background:#f1ece4}@page{size:A4 landscape;margin:15mm}</style></head><body><h1>${html(heading)}</h1><p>BOSSE · ${html(negocioNombre)} · ${html(fechaInicio)} a ${html(fechaFin)}</p><table>${printable}</table><script>window.onload=function(){window.print();};</script></body></html>`);
        pane.document.close();
      }
    } catch (e) { setExportError(`No se pudo exportar ${heading}: ${e.message}`); }
  };
  const saveView = () => {
    const name = window.prompt('Nombre de esta vista:', `Gráfica ${granularity}`);
    if (!name || !name.trim()) return;
    const key = `bosse-finance-views-${negocioId || 'default'}`;
    try { const all = JSON.parse(localStorage.getItem(key) || '[]'); all.push({ name: name.trim(), granularity, chartDimension, chartMetric, chartStyle }); localStorage.setItem(key, JSON.stringify(all.slice(-20))); setSavedViews(all.slice(-20)); } catch { setExportError('No fue posible guardar esta preferencia local.'); }
  };
  useEffect(() => {
    try { setSavedViews(JSON.parse(localStorage.getItem(`bosse-finance-views-${negocioId || 'default'}`) || '[]')); }
    catch { setSavedViews([]); }
  }, [negocioId]);
  const chartPanel = <section className="be-card be-chart-card"><div className="be-card-title"><div><h2>Ingresos, egresos y rentabilidad</h2><p>Selecciona una barra para consultar los registros que explican su importe.</p></div><div className="be-segmented">{[['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']].map(([key, name]) => <button key={key} type="button" className={granularity === key ? 'active' : ''} onClick={() => { setGranularity(key); setSelectedPeriod(null); }}>{name}</button>)}</div></div>
    <div className="be-chart-area">{chart.length ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart} margin={{ top: 12, right: 8, bottom: 4, left: 2 }}>
      <CartesianGrid vertical={false} stroke="#dfd8ce" strokeDasharray="3 5"/><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#635e56' }} tickLine={false} axisLine={false}/>
      <YAxis yAxisId="money" tickFormatter={compact} tick={{ fontSize: 10 }} width={55} tickLine={false} axisLine={false}/><YAxis yAxisId="percent" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} width={39} tickLine={false} axisLine={false}/>
      <Tooltip formatter={(v, name) => name === 'GPM' ? percentage(v) : money(v)} /><Legend wrapperStyle={{ fontSize: 11 }}/>
      {(chartMetric === 'ingresos-egresos' || chartMetric === 'ingresos') && <Bar name="Ingresos" dataKey="ingresos" fill="#376a60" yAxisId="money" maxBarSize={42} onClick={r => { const p = r?.payload || r; if (p?.key) setSelectedPeriod(x => x?.key === p.key ? null : p); }}>{chart.map(p => <Cell key={p.key} fill={selectedPeriod?.key === p.key ? '#224e49' : '#4d8177'}/>)}</Bar>}
      {(chartMetric === 'ingresos-egresos' || chartMetric === 'egresos') && <Bar name="Egresos" dataKey="egresos" fill="#b68d61" yAxisId="money" maxBarSize={42} onClick={r => { const p = r?.payload || r; if (p?.key) setSelectedPeriod(x => x?.key === p.key ? null : p); }}/>}
      {chartStyle !== 'solo-barras' && <Line name="GPM" type="monotone" dataKey="gpm" stroke="#195c55" strokeWidth={2.5} yAxisId="percent" connectNulls dot={{ r: 3, fill: '#fff' }}/>}
      {chartMetric === 'gm' && <Line name="GM" type="monotone" dataKey="gm" stroke="#947045" strokeWidth={2.5} yAxisId="money" dot={{ r: 3 }}/>}
    </ComposedChart></ResponsiveContainer> : <p className="be-note">No hay evolución diaria disponible en el periodo seleccionado.</p>}</div>
    <div className="be-chart-bottom"><span>{selectedPeriod ? `Seleccionado: ${rangeLabel}` : 'Datos del periodo seleccionado · Tijuana, cierre 05:00'}</span>{selectedPeriod && <button type="button" onClick={() => { setExploreFilters({ ...EMPTY_EXPLORER_FILTERS, dateFrom: range ? (range[0] < fechaInicio ? fechaInicio : range[0]) : '', dateTo: range ? (range[1] > fechaFin ? fechaFin : range[1]) : '' }); changeSection('explorar'); }}>Ver movimientos seleccionados</button>}</div></section>;
  const wagesExpected = comparacionNomina.prenomina_referencia;
  const wagesActual = comparacionNomina.nomina_real;
  const wagesDiff = comparacionNomina.diferencia;
  const bridge = total - expense + num(summary.resultado_cambiario);
  const content = {
    evolucion: chartPanel,
    rentabilidad: <div className="be-summary-detail">
      <div className="be-summary-detail-top"><div><h3>De dónde sale el margen</h3><p>Los indicadores provienen de los importes oficiales calculados en el servidor.</p></div></div>
      <div className="be-margin-bridge">
        <button type="button" onClick={() => summaryOpen('ingresos')}><span>＋ Ingresos reconocidos</span><strong>{moneyDisplay(total)}</strong></button>
        <button type="button" onClick={() => summaryOpen('egresos')}><span>－ Egresos contabilizados (incluye nómina)</span><strong>{moneyDisplay(expense)}</strong></button>
        <button type="button" onClick={() => summaryOpen('cambiario')}><span>＋ Resultado cambiario realizado</span><strong>{moneyDisplay(summary.resultado_cambiario)}</strong></button>
        <div className="be-margin-result"><span>GM · Ganancia calculada por BOSSE</span><strong>{moneyDisplay(gm)}</strong></div>
        <div className="be-margin-result"><span>GPM · GM / Ingresos × 100</span><strong>{hide ? '••••••' : percentage(summary.gpm)}</strong></div>
      </div>
      {Math.abs(bridge - gm) > 0.011 ? <p className="be-reconciliation-note">⚠ La fórmula simplificada difiere del GM del servidor en {hide ? '••••••' : money(gm - bridge)}. Revisa las clasificaciones del periodo; el total oficial no se reemplaza.</p> : <p className="be-reconciliation-ok">✓ La fórmula concuerda con el GM oficial del periodo.</p>}
      <p className="be-note">Otros egresos: {moneyDisplay(summary.total_egresos_operativos)} = egresos totales menos nómina real ({moneyDisplay(summary.total_nomina)}). La prenómina no se cuenta como egreso adicional.</p>
    </div>,
    ingresos: <div className="be-summary-detail">
      <div className="be-summary-detail-top"><div><h3>Ingresos registrados en cortes de caja</h3><p>Abre un corte para ver ventas, métodos de pago, denominaciones, vales, cuentas por cobrar y gastos relacionados.</p></div><button type="button" className="be-plain-cta" onClick={() => seeSummaryInExplorer('ingresos')}>Ver todos los ingresos →</button></div>
      <div className="be-summary-total-strip"><span>Total de ingresos reconocido</span><strong>{moneyDisplay(total)}</strong></div>
      <Reconciliation expected={total} rows={incomeRows} label="periodo" hide={hide}/>
      <MovementTable rows={incomeRows} hide={hide} onOpen={setSelected} limit={summaryAllRows ? 0 : SUMMARY_PREVIEW_LIMIT}/>
      {incomeRows.length > SUMMARY_PREVIEW_LIMIT && <button type="button" className="be-plain-cta be-show-more" onClick={() => setSummaryAllRows(x => !x)}>{summaryAllRows ? 'Mostrar los primeros cortes' : `Mostrar los ${incomeRows.length} cortes de caja`}</button>}
      <p className="be-note">Los métodos de pago son otra forma de ver el mismo corte; no se suman dos veces como ingresos.</p>
    </div>,
    egresos: <div className="be-summary-detail">
      <div className="be-summary-detail-top"><div><h3>Distribución de egresos</h3><p>Consulta categorías y primeros movimientos en esta misma vista. Selecciona una categoría para filtrar ambos.</p></div><button type="button" className="be-plain-cta" onClick={() => seeSummaryInExplorer('egresos', { category: summaryCategory, concept: summaryConcept === 'Todos' ? '' : summaryConcept })}>Ver todos los movimientos →</button></div>
      <div className="be-expense-split"><CategoryComposition rows={expenseRows} categories={categories} selectedCategory={summaryCategory} selectedConcept={summaryConcept} setCategory={next => { setSummaryCategory(next); setSummaryAllRows(false); }} setConcept={next => { setSummaryConcept(next); setSummaryAllRows(false); }} moneyDisplay={moneyDisplay} expected={expense}/>
        <section className="be-expense-movements" aria-label="Movimientos de egresos"><div className="be-category-heading"><h3>Movimientos del desglose</h3><small>{summaryExpenseRows.length ? `${summaryAllRows ? summaryExpenseRows.length : Math.min(SUMMARY_PREVIEW_LIMIT, summaryExpenseRows.length)} de ${summaryExpenseRows.length}` : '0'} registros</small></div>
          <p className="be-selection-hint">{summaryCategory === 'Todas' ? 'Todas las categorías' : summaryCategory}{summaryConcept !== 'Todos' ? ` › ${summaryConcept}` : ''}</p>
          <MovementTable rows={summaryPreviewRows} hide={hide} onOpen={setSelected}/>
          {summaryExpenseRows.length > SUMMARY_PREVIEW_LIMIT && <button type="button" className="be-plain-cta be-show-more" onClick={() => setSummaryAllRows(x => !x)}>{summaryAllRows ? 'Mostrar los primeros movimientos' : `Mostrar los ${summaryExpenseRows.length} movimientos aquí`}</button>}
          <div className="be-summary-total-strip"><span>Total de esta selección</span><strong>{summaryMoney(summaryExpenseRows.reduce((n, r) => n + num(r.monto), 0))}</strong></div>
        </section>
      </div>
      <Reconciliation expected={expense} rows={expenseRows} label="periodo completo" hide={hide}/>
    </div>,
    socios: <><p className="be-note">Las participaciones provienen de Administración. Los adelantos no modifican GM ni GPM y deben asignarse al mes correspondiente antes de determinar el pago final.</p><div className="be-table-wrap"><table className="be-table"><thead><tr><th>Socio</th><th>Participación</th><th>Ganancia del GM</th><th>Adelantos</th><th>Devoluciones</th><th>Saldo de adelantos</th></tr></thead><tbody>{socios.map(s => <tr key={s.id}><td data-label="Socio">{s.socio}</td><td data-label="Participación">{percentage(s.porcentaje_participacion)}</td><td data-label="Ganancia">{moneyDisplay(s.participacion_gm)}</td><td data-label="Adelantos">{moneyDisplay(s.adelantos)}</td><td data-label="Devoluciones">{moneyDisplay(s.devoluciones)}</td><td data-label="Saldo">{moneyDisplay(s.saldo_adelantos)}</td></tr>)}</tbody></table></div>{!socios.length && <p className="be-note">No hay participaciones disponibles para este periodo.</p>}<p className="be-note">Pendiente por pagar: requiere conciliación de adelantos asignados al mes; no se estima a partir del saldo histórico.</p></>,
    cambiario: <><div className="be-big-number">Resultado realizado: {moneyDisplay(summary.resultado_cambiario)}</div><div className="be-table-wrap"><table className="be-table"><thead><tr><th>Corte</th><th>USD convertido</th><th>Tipo de cambio</th><th>Resultado MXN</th><th>Origen</th></tr></thead><tbody>{divisas.map((d, i) => <tr key={d.detalle_id || i}><td data-label="Corte">{d.corte_folio || `Corte ${d.corte_id}`}</td><td data-label="USD">{hide ? '••••••' : d.monto_usd}</td><td data-label="TC">{d.tipo_cambio_realizado}</td><td data-label="Resultado">{moneyDisplay(d.resultado_cambiario_mxn)}</td><td data-label="Ver">{movements.some(r => r.type === 'Ingreso' && String(r.id) === String(d.corte_id)) ? <button type="button" onClick={() => setSelected(movements.find(r => r.type === 'Ingreso' && String(r.id) === String(d.corte_id)))}>Ver corte</button> : '—'}</td></tr>)}</tbody></table></div>{!divisas.length && <p className="be-note">Sin conversiones realizadas durante el periodo.</p>}</>,
    prenomina: <><div className="be-mini-stats"><div><span>Prenómina estimada</span><strong>{moneyDisplay(wagesExpected)}</strong></div><div><span>Nómina real</span><strong>{moneyDisplay(wagesActual)}</strong></div><div><span>Diferencia</span><strong>{moneyDisplay(wagesDiff)}</strong></div></div><p className="be-note">La prenómina es referencia, no un egreso adicional. La contabilidad usa exclusivamente la nómina real registrada.</p><div className="be-table-wrap"><table className="be-table"><thead><tr><th>Referencia</th><th>Periodo</th><th>Importe</th></tr></thead><tbody>{prenominas.map((p, i) => <tr key={p.id || i}><td data-label="Referencia">Prenómina {p.id || i + 1}</td><td data-label="Periodo">{date(p.fecha_inicio || p.fecha)}</td><td data-label="Importe">{moneyDisplay(p.monto_total ?? p.total ?? p.importe)}</td></tr>)}</tbody></table></div></>,
    movimientos: <MovementTable rows={filtered} hide={hide} onOpen={setSelected}/>
  };
  return <div className="be-page" data-theme={theme}>
    <header className="be-unified-header">
      <div className="be-unified-identity">
        <p className="be-breadcrumb">BOSSE <span aria-hidden="true">›</span> Análisis Financiero{activeSection !== 'resumen' ? ` › ${segmentTitle}` : ''}</p>
        <h1>{activeSection === 'resumen' ? 'Análisis Financiero' : segmentTitle}</h1>
        <p className="be-unified-subtitle">{negocioNombre}{usuarioNombre ? ` · ${usuarioNombre}` : ''}{usuarioRol ? ` · ${usuarioRol}` : ''}</p>
      </div>
      <div className="be-unified-controls">
        <div className="be-header-primary-actions">
          <details className="be-period-picker" id="bosse-finance-period">
            <summary aria-label={`Periodo analizado: ${dateLabel(fechaInicio)} a ${dateLabel(fechaFin)}. Cambiar fechas`}>
              <BosseFinanceIcon name="calendar" size={21}/>
              <span><small>Periodo analizado</small><strong>{dateLabel(fechaInicio)} — {dateLabel(fechaFin)}</strong></span>
              <BosseFinanceIcon name="chevronRight" size={15}/>
            </summary>
            <div className="be-period-popup" aria-label="Cambiar periodo analizado">
              <label>Desde <input aria-label="Desde" type="date" value={fechaInicio} max={fechaFin} onChange={e => {setFechaInicio(e.target.value); setSelectedPeriod(null);}}/></label>
              <label>Hasta <input aria-label="Hasta" type="date" value={fechaFin} min={fechaInicio} onChange={e => {setFechaFin(e.target.value); setSelectedPeriod(null);}}/></label>
              <button type="button" className="be-unified-update" onClick={onActualizar} disabled={cargando}>{cargando ? 'Actualizando…' : 'Aplicar periodo'}</button>
            </div>
          </details>
          <button type="button" onClick={onPDF} disabled={!analisis || hide}><BosseFinanceIcon name="pdf" size={18}/> PDF</button>
          <button type="button" onClick={onExcel} disabled={!analisis || hide}><BosseFinanceIcon name="excel" size={18}/> Excel</button>
        </div>
        <div className="be-unified-actions">
          {activeSection !== 'resumen' && <button type="button" className="be-back-summary" onClick={() => changeSection('resumen')}><BosseFinanceIcon name="back" size={16}/> Volver a Resumen</button>}
          <button type="button" onClick={() => setHide(x => !x)} aria-pressed={hide}><BosseFinanceIcon name="eye" size={16}/> {hide ? 'Mostrar importes' : 'Privacidad'}</button>
          <button type="button" onClick={() => { const next = theme === 'light' ? 'dark' : 'light'; setTheme(next); try { localStorage.setItem('bosse-editorial-theme', next); } catch {} }}><BosseFinanceIcon name="settings" size={16}/> {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</button>
        </div>
      </div>
    </header>
    <nav className="be-finance-primary-tabs" aria-label="Modos de Análisis Financiero">
      {[
        ['resumen','layers','Resumen ejecutivo'],
        ['explorar','chart','Análisis detallado'],
        ['graficas','layers','Constructor']
      ].map(([key,icon,label]) => <button key={key} type="button" className={activeSection===key?'active':''} aria-current={activeSection===key?'page':undefined} onClick={() => changeSection(key)}><BosseFinanceIcon name={icon} size={18}/>{label}</button>)}
    </nav>
    <nav className="be-mobile-tabs" aria-label="Secciones financieras">{[['resumen', 'Resumen'], ['explorar', 'Explorar'], ['graficas', 'Gráficas'], ['borderbro', 'BorderBro']].map(([key, name]) => <button key={key} type="button" className={activeSection === key ? 'active' : ''} onClick={() => changeSection(key)}>{name}</button>)}</nav>
    {error && <p className="be-error" role="alert">{error}</p>}{exportError && <p className="be-error" role="alert">{exportError}</p>}
    {analisis?.tpv_aviso && <p role="status" className="be-note">{analisis.tpv_aviso}</p>}
    {activeSection === 'resumen' && <>
      <div className="be-overview-kpis" aria-label="Indicadores del periodo">
        {[
          { key: 'ingresos', icon: 'coins', title: 'Ingresos', value: total, variation: comparison.ingresos },
          { key: 'egresos', icon: 'wallet', title: 'Egresos', value: expense, variation: comparison.egresos },
          { key: 'rentabilidad', icon: 'chart', title: 'GM · Margen de ganancia', value: gm, variation: comparison.gm, highlight: true },
          { key: 'rentabilidad', icon: 'percent', title: 'GPM · % Margen', value: summary.gpm, variation: comparison.gpm, percent: true },
          { key: 'prenomina', icon: 'people', title: 'Nómina', value: summary.total_nomina, variation: comparison.nomina },
          { key: 'egresos', icon: 'layers', title: 'Otros egresos', value: summary.total_egresos_operativos, caption: 'Egresos sin nómina' }
        ].map((item, index) => <button key={`${item.title}-${index}`} type="button" className={`be-overview-kpi ${item.highlight ? 'highlight' : ''} ${open === item.key ? 'selected' : ''}`} onClick={() => summaryOpen(item.key)} aria-label={`Ver desglose de ${item.title}`}>
          <span className="be-overview-kpi-label"><span aria-hidden="true" className="be-overview-kpi-icon"><BosseFinanceIcon name={item.icon} size={23}/></span>{item.title}</span>
          <strong>{item.percent ? (hide ? '••••••' : percentage(item.value)) : moneyDisplay(item.value)}</strong>
          {item.caption ? <small className="be-kpi-caption">{item.caption}</small> : <><Trend data={item.variation} pp={item.percent} hide={hide}/><small className="be-kpi-comparison">vs. periodo anterior</small></>}
          <span className="be-kpi-instruction">Ver desglose ↗</span>
        </button>)}
      </div>
      <div className="be-summary-columns">
        <main className="be-summary-main">
          <div className="be-summary-intro"><div><span aria-hidden="true" className="be-gold-symbol"><BosseFinanceIcon name="layers" size={27}/></span><div><h2>¿Qué conforma estos números?</h2><p>Haz clic en una sección para ver cada concepto y movimiento, aquí mismo.</p></div></div><span className="be-summary-tip">ⓘ Cada cifra tiene su desglose</span></div>
          <div className="be-overview-accordion">{accordionItems.map(([key, icon, label, description]) => <section className={`be-overview-section ${open === key ? 'open' : ''}`} key={key}>
            <div className="be-overview-section-head"><button type="button" className="be-overview-section-toggle" aria-expanded={open === key} aria-controls={`be-detail-${key}`} onClick={() => { setOpen(x => x === key ? null : key); setSummaryAllRows(false); }}>
              <span className="be-toggle-arrow" aria-hidden="true">{open === key ? '⌄' : '›'}</span>
              <span className="be-overview-section-icon" aria-hidden="true"><BosseFinanceIcon name={icon} size={23}/></span>
              <span className="be-overview-section-titles"><strong>{label}</strong><small>{description}</small></span>
              <span className="be-overview-section-total">{key === 'ingresos' ? moneyDisplay(total) : key === 'egresos' ? moneyDisplay(expense) : key === 'cambiario' ? moneyDisplay(summary.resultado_cambiario) : key === 'socios' ? `${socios.length} socios` : key === 'prenomina' ? moneyDisplay(comparacionNomina.prenomina_referencia) : key === 'movimientos' ? `${movements.length} registros` : key === 'rentabilidad' ? moneyDisplay(gm) : 'Ver evolución'}</span>
            </button><span className="be-accordion-action"><ExportButtons section={key} disabled={hide || !analisis} onExport={exportSection}/></span></div>
            {open === key && <div className="be-overview-section-body" id={`be-detail-${key}`}>{content[key]}{key !== 'ingresos' && key !== 'egresos' && <div className="be-section-after"><button type="button" onClick={() => seeSummaryInExplorer('movimientos')}>Consultar movimientos del periodo →</button></div>}</div>}
          </section>)}</div>
        </main>
        <SummaryInsights analisis={analisis} fechaInicio={fechaInicio} fechaFin={fechaFin} moneyDisplay={moneyDisplay} hide={hide} onExplore={summaryOpen} onDetailed={() => seeSummaryInExplorer('movimientos')}/>
      </div>
      <div className="be-insight-bar"><div><strong className="be-inline-icon"><BosseFinanceIcon name="sparkles" size={22}/> BorderBro · Lectura del periodo</strong><p>Consulta diagnósticos, explicaciones y evidencia sin salir de Análisis Financiero.</p></div><button type="button" onClick={() => changeSection('borderbro')}>Ver diagnóstico →</button></div>
    </>}
    {activeSection === 'explorar' && <BosseFinanceExplorer
      rows={movements} filteredRows={exploreFiltered} filters={exploreFilters}
      onFiltersChange={setExploreFilters} onReset={() => { setExploreFilters({ ...EMPTY_EXPLORER_FILTERS }); setSelected(null); }}
      hide={hide} selected={selected} onOpen={setSelected} onClose={() => setSelected(null)}
      fechaInicio={fechaInicio} fechaFin={fechaFin} totalOficial={summary}
      onExport={format => exportSection('explorar', format)}
      onRequestPeriod={() => {
        const picker = document.getElementById('bosse-finance-period');
        if (!picker) return;
        picker.open = true;
        picker.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        picker.querySelector('summary')?.focus({ preventScroll: true });
      }}
      detailSlot={<DetailsDrawer key={selected?.key || 'none'} record={selected} resumen={summary} inline hide={hide} onClose={() => setSelected(null)}/>}
    />}
    {activeSection === 'graficas' && <BosseFinanceCharts
      chart={chart} rows={movements} resumen={summary}
      fechaInicio={fechaInicio} fechaFin={fechaFin} agrupacion={granularity}
      onAgrupacionChange={setGranularity} dimension={chartDimension} onDimensionChange={setChartDimension}
      metrica={chartMetric} onMetricaChange={setChartMetric}
      estilo={chartStyle} onEstiloChange={setChartStyle}
      selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod}
      tipo={kind} onTipoChange={setKind} categoria={category} onCategoriaChange={setCategory}
      buscar={search} onBuscarChange={setSearch} onClear={resetFilters}
      onOpen={setSelected} onExplore={exploreFromChart} onExport={exportSection}
      onSaveView={saveView} savedViews={savedViews}
      onLoadView={saved => { setGranularity(saved.granularity); setChartDimension(saved.chartDimension || saved.granularity || 'semana'); setChartMetric(saved.chartMetric);
        setChartStyle(saved.chartStyle); resetFilters(); }} hide={hide}
    />}
    {activeSection === 'borderbro' && <BosseFinanceBorderBro
      analisis={analisis} movements={movements} hide={hide}
      fechaInicio={fechaInicio} fechaFin={fechaFin} negocioNombre={negocioNombre}
      onOpenRecord={setSelected} onExploreExact={exploreExactEvidence}
      onGoCharts={() => changeSection('graficas')} onExport={exportSection}
      borderBroAbierto={borderBroAbierto} onBorderBro={onBorderBro} chat={chat}
    />}
    {activeSection !== 'resumen' && <div className="be-footer-links"><button type="button" onClick={() => changeSection('resumen')}><BosseFinanceIcon name="back" size={16}/> Volver a Resumen</button></div>}
    <DetailsDrawer key={selected?.key || "none"} record={activeSection === 'explorar' ? null : selected} resumen={summary} hide={hide} onClose={() => setSelected(null)}/>
  </div>;
}
