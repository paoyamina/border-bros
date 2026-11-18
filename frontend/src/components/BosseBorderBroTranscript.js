/**
 * Presentación y exportación local de la conversación de BorderBro.
 * Sin llamadas nuevas al servidor, sin dependencias y sin almacenar datos en el navegador.
 * Solo las herramientas reales del backend cuentan como fuentes consultadas.
 */
const SOURCE_NAMES = {
  resumen_financiero: 'Resumen financiero',
  comparar_periodos: 'Comparación de periodos',
  egresos_por_categoria: 'Egresos por categoría',
  egresos_por_usuario: 'Egresos por usuario',
  egresos_sin_concepto: 'Egresos sin concepto',
  detalle_egresos: 'Detalle de egresos',
  egresos_por_proveedor: 'Egresos por proveedor',
  anomalias_egresos: 'Revisión de movimientos inusuales',
  conciliar_nomina: 'Conciliación de nómina',
  analizar_ingresos: 'Análisis de ingresos',
  analizar_cortes: 'Análisis de cortes de caja',
  detectar_anomalias_cortes: 'Revisión de diferencias de caja'
};
const numberFormat = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const number = value => typeof value === 'number' && Number.isFinite(value);
const asDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ?
  `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : null;
const periodText = periodo => {
  const start = asDate(periodo?.fecha_inicio || periodo?.start);
  const end = asDate(periodo?.fecha_fin || periodo?.end);
  return start && end ? `${start} — ${end}` : null;
};
const plainName = name => SOURCE_NAMES[name] || (String(name || 'Consulta de datos').replace(/_/g, ' '));
const getData = source => source && typeof source === 'object' && !Array.isArray(source) ? source.datos : null;

export function sourceTitle(source) { return plainName(source?.herramienta); }
export function sourcePeriod(source) { return periodText(source?.periodo); }
export function sourceSummary(source) {
  const data = getData(source);
  if (!data || typeof data !== 'object') return 'Se utilizó esta consulta para fundamentar la respuesta.';
  if (source?.herramienta === 'resumen_financiero') {
    const totals = [];
    if (number(data.total_ingresos)) totals.push(`Ingresos ${numberFormat.format(data.total_ingresos)}`);
    if (number(data.total_egresos)) totals.push(`Egresos ${numberFormat.format(data.total_egresos)}`);
    if (number(data.gm)) totals.push(`GM ${numberFormat.format(data.gm)}`);
    if (number(data.gpm)) totals.push(`GPM ${data.gpm.toFixed(2)}%`);
    return totals.length ? totals.join(' · ') : 'Se consultó el resumen del periodo.';
  }
  if (source?.herramienta === 'comparar_periodos') {
    const previous = periodText(data.periodo_anterior);
    return previous ? `Comparación con el periodo ${previous}.` : 'Se comparó el periodo seleccionado con el periodo de referencia.';
  }
  if (source?.herramienta === 'detalle_egresos') {
    return 'Consulta de movimientos individuales de egresos; revisa el detalle original para auditar cada folio.';
  }
  return 'Consulta utilizada en la respuesta. Las fuentes no equivalen necesariamente a movimientos individuales.';
}

/** Solo cuenta filas individuales verificables, nunca filas agregadas por categoría. */
export function individualMovements(source) {
  if (!['detalle_egresos', 'anomalias_egresos', 'analizar_cortes', 'detectar_anomalias_cortes'].includes(source?.herramienta)) return [];
  const items = getData(source)?.movimientos;
  if (!Array.isArray(items)) return [];
  return items.filter(record => record && typeof record === 'object' && !Array.isArray(record) &&
    (record.egreso_id != null || record.folio || record.referencia) &&
    (record.monto_mxn != null || record.importe != null));
}
export function movementLabel(movement) {
  const ref = movement.referencia || movement.folio || (movement.egreso_id != null ? `Egreso ${movement.egreso_id}` : 'Movimiento');
  const amount = movement.monto_mxn ?? movement.importe;
  return `${ref} · ${number(Number(amount)) ? numberFormat.format(Number(amount)) : String(amount ?? '—')}`;
}

export function isToolSource(source) {
  return !!source && typeof source === 'object' && !Array.isArray(source) && typeof source.herramienta === 'string' && !!source.herramienta;
}
export function splitEvidence(evidence) {
  const items = Array.isArray(evidence) ? evidence : [];
  // Este backend devuelve {herramienta, negocio_id, periodo, datos} por cada llamada.
  const tools = items.filter(isToolSource);
  const records = items.filter(item => !isToolSource(item));
  return { tools, records };
}

const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
function htmlText(raw) {
  // Escapar SIEMPRE antes de dar formato; jamás insertar HTML del modelo.
  const safe = escapeHtml(raw);
  return safe.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .split(/\r?\n/).map(line => {
      const heading = line.match(/^\s*#{1,4}\s+(.*)/);
      if (heading) return `<h3>${heading[1]}</h3>`;
      const bullet = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)/);
      if (bullet) return `<p class="bullet">• ${bullet[1]}</p>`;
      return line.trim() ? `<p>${line}</p>` : '<div class="spacer"></div>';
    }).join('');
}

export function conversationEntries(messages) {
  return (Array.isArray(messages) ? messages : []).filter(item => !item.greeting &&
    (item.rol === 'user' || item.rol === 'assistant'));
}

export function transcriptContent({ businessName, messages, exportDate }) {
  const entries = conversationEntries(messages);
  const today = exportDate || new Date().toLocaleString('es-MX');
  const header = `BORDERBRO · TRANSCRIPCIÓN DE CONVERSACIÓN\nNegocio: ${businessName || 'BOSSE'}\nExportado: ${today}\n${entries.length} mensajes\n\n`;
  const body = entries.map((message, index) => {
    const role = message.rol === 'user' ? 'PREGUNTA' : 'RESPUESTA DE BORDERBRO';
    const period = message.periodKey ? `\nPeriodo consultado: ${message.periodKey.replace(':', ' — ')}` : '';
    const { tools, records } = splitEvidence(message.evidencia);
    const sources = tools.length ? `\nFuentes consultadas (${tools.length}):\n${tools.map((source, n) =>
      `  ${n + 1}. ${sourceTitle(source)}${sourcePeriod(source) ? ` · ${sourcePeriod(source)}` : ''}\n     ${sourceSummary(source)}`).join('\n')}` : '';
    const individual = tools.flatMap(source => individualMovements(source));
    const movements = individual.length ? `\nMovimientos individuales identificados (${individual.length}):\n${individual.slice(0, 20).map((row, n) => `  ${n + 1}. ${movementLabel(row)}`).join('\n')}${individual.length > 20 ? `\n  …y ${individual.length - 20} adicionales; consúltalos en BOSSE.` : ''}` : '';
    const other = records.length ? `\nOtros elementos de evidencia: ${records.length} (consultar en BOSSE).` : '';
    return `[${index + 1}] ${role}${period}\n${String(message.texto || '')}${sources}${movements}${other}\n`;
  }).join('\n------------------------------------------------------------\n\n');
  return `${header}${body}\n\nNota: Las fuentes consultadas no equivalen necesariamente a movimientos financieros. Esta transcripción es una referencia de trabajo y puede requerir validación contable.\n`;
}
function fileStem(businessName) {
  const safe = String(businessName || 'BOSSE').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'BOSSE';
  return `BorderBro_${safe}_${new Date().toISOString().slice(0, 10)}`;
}
function saveBlob(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const css = `
  body{font:14px/1.58 Arial,sans-serif;color:#1c1a17;padding:38px;max-width:840px;margin:auto}
  h1,h2{font-family:Georgia,serif}h1{font-size:30px;margin:0}h2{font-size:21px;margin:35px 0 10px}
  .logo{color:#987348;font-size:11px;letter-spacing:1.5px;font-weight:bold}.meta{color:#63584d;font-size:12px}
  .message{padding:15px 0;border-bottom:1px solid #ddd1c1;break-inside:avoid-page}
  .text p{margin:0 0 10px}.text h3{font-size:16px;margin:14px 0 7px}.bullet{padding-left:12px}
  .sources{background:#f6f1e9;border-radius:9px;padding:13px 17px;margin:14px 0}
  .sources li{margin:6px 0}.small{font-size:11px;color:#76695b}.spacer{height:8px}
  .printbar{display:flex;justify-content:space-between;align-items:center;margin:0 0 28px}
  button{border:0;border-radius:8px;background:#171717;color:#fff;padding:11px 19px;font-weight:bold;cursor:pointer}
  @media print{body{padding:12mm}.printbar{display:none}h2{break-after:avoid}.message{break-inside:auto}}
`;
function reportHtml({ businessName, messages, exportDate, printable = false }) {
  const entries = conversationEntries(messages);
  const date = exportDate || new Date().toLocaleString('es-MX');
  const conversations = entries.map((message, idx) => {
    const { tools, records } = splitEvidence(message.evidencia);
    const sources = tools.length ? `<div class="sources"><strong>Fuentes consultadas (${tools.length})</strong><ol>${tools.map(source =>
      `<li><strong>${escapeHtml(sourceTitle(source))}</strong>${sourcePeriod(source) ? ` · ${escapeHtml(sourcePeriod(source))}` : ''}<div class="small">${escapeHtml(sourceSummary(source))}</div></li>`).join('')}</ol></div>` : '';
    const movements = tools.flatMap(source => individualMovements(source));
    return `<section class="message"><h2>${idx + 1}. ${message.rol === 'user' ? 'Pregunta' : 'BorderBro'}</h2>
      ${message.periodKey ? `<p class="meta">Periodo: ${escapeHtml(message.periodKey.replace(':', ' — '))}</p>` : ''}
      <div class="text">${htmlText(message.texto || '')}</div>${sources}
      ${movements.length ? `<div class="sources"><strong>Movimientos individuales identificados (${movements.length})</strong><ol>${movements.slice(0, 20).map(item => `<li>${escapeHtml(movementLabel(item))}</li>`).join('')}</ol>${movements.length > 20 ? `<p class="small">Y ${movements.length - 20} más; consúltalos en BOSSE.</p>` : ''}</div>` : ''}
      ${records.length ? `<p class="small">Otros elementos de evidencia: ${records.length}. Consúltalos en BOSSE.</p>` : ''}</section>`;
  }).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Conversación BorderBro</title><style>${css}</style></head><body>
    ${printable ? '<div class="printbar"><div class="logo">BOSSE · BORDERBRO</div><button type="button" onclick="window.print()">Imprimir / Guardar como PDF</button></div>' : ''}
    <div class="logo">BOSSE · INTELIGENCIA FINANCIERA</div><h1>Conversación con BorderBro</h1>
    <p class="meta">Negocio: ${escapeHtml(businessName || 'BOSSE')} · Exportado: ${escapeHtml(date)} · ${entries.length} mensajes</p>
    ${conversations}<p class="small">Las fuentes consultadas no equivalen necesariamente a movimientos financieros. Verifica las cifras con los registros originales de BOSSE.</p>
    </body></html>`;
}
function rtfEsc(text) {
  return String(text ?? '').replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}')
    .replace(/\r\n?/g, '\n').replace(/[^\x00-\x7f]/g, char => {
      const units = [];
      for (let i = 0; i < char.length; i++) { let code = char.charCodeAt(i); if (code > 32767) code -= 65536; units.push(`\\u${code}?`); }
      return units.join('');
    }).replace(/\n/g, '\\par\n');
}
export function exportConversation(kind, state) {
  const entries = conversationEntries(state.messages);
  if (!entries.length) return false;
  const businessName = state.businessName || 'BOSSE';
  const date = new Date().toLocaleString('es-MX');
  const stem = fileStem(businessName);
  if (kind === 'txt') {
    saveBlob('\uFEFF' + transcriptContent({ businessName, messages: entries, exportDate: date }), `${stem}.txt`, 'text/plain;charset=utf-8');
    return true;
  }
  if (kind === 'word') {
    const text = transcriptContent({ businessName, messages: entries, exportDate: date });
    const pieces = text.split('\n');
    const body = pieces.map(line => {
      const bold = line.startsWith('[') || line.startsWith('BORDERBRO') || line.startsWith('Fuentes consultadas');
      return `${bold ? '\\b ' : ''}${rtfEsc(line)}${bold ? '\\b0' : ''}\\par\n`;
    }).join('');
    const rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}{\\f1 Georgia;}}\\fs22\n${body}}`;
    saveBlob(rtf, `${stem}.rtf`, 'application/rtf');
    return true;
  }
  if (kind === 'pdf') {
    // Vista de impresión: elegir "Guardar como PDF" en el diálogo del navegador.
    const tab = window.open('', '_blank');
    if (!tab) return false;
    tab.document.open();
    tab.document.write(reportHtml({ businessName, messages: entries, exportDate: date, printable: true }));
    tab.document.close();
    tab.focus();
    return true;
  }
  return false;
}
