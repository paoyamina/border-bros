// BOSSE: helpers de presentación. Nunca sustituyen cifras financieras oficiales.
const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const dateValid = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const shortDate = iso => {
  if (!dateValid(iso)) return iso || 'Sin fecha';
  const [year,month,day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', {day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,day))).replace(/\.$/, '');
};
export const periodLabel = (key, grouping, start, end) => {
  if (grouping === 'anio') return String(key);
  if (grouping === 'mes') {
    if (!/^\d{4}-\d{2}$/.test(key || '')) return String(key || '');
    return new Intl.DateTimeFormat('es-MX', {month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${key}-01T12:00:00Z`));
  }
  if (!dateValid(key)) return String(key || '');
  if (grouping !== 'semana') return shortDate(key);
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  let from = key;
  let to = d.toISOString().slice(0,10);
  if (dateValid(start) && start > from) from = start;
  if (dateValid(end) && end < to) to = end;
  return from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;
};
export const summarizeMovementGroups = (rows = [], grouping = 'categoria') => {
  const field = grouping === 'concepto' ? 'concepto' : 'categoria';
  const byName = new Map();
  for (const row of rows) {
    const name = String(row?.[field] || 'Sin dato').trim();
    const key = `${name}`;
    if (!byName.has(key)) byName.set(key, {key,label:name,ingresos:0,egresos:0,nomina:0,count:0});
    const group = byName.get(key);
    const amount = n(row?.monto);
    if (row?.type === 'Ingreso') group.ingresos += amount;
    else { group.egresos += amount; if (row?.type === 'Nómina') group.nomina += amount; }
    group.count++;
  }
  return Array.from(byName.values()).sort((a,b) => (b.ingresos+b.egresos)-(a.ingresos+a.egresos) || a.label.localeCompare(b.label,'es-MX'));
};
export const groupMovementSelection = (rows = [], grouping, name) => {
  if (!name || !['categoria','concepto'].includes(grouping)) return rows;
  return rows.filter(row => String(row?.[grouping] || 'Sin dato').trim() === name);
};
export const nominaForRange = (rows = [], range = null) => rows.reduce((total,row) =>
  total + (row?.type === 'Nómina' && (!range || (row.fecha >= range[0] && row.fecha <= range[1])) ? n(row?.monto) : 0), 0);
export const percentOf = (part,total) => total > 0 ? part / total * 100 : null;
export const ringPercent = value => Number.isFinite(Number(value)) ? Math.max(0,Math.min(100,Number(value))) : 0;
export const formatFinancialAmount = number => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n(number));
