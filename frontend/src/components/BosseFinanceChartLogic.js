// Utilidades puras para que una selección del gráfico y su tabla consulten
// exactamente el mismo negocio, rango financiero y tipo de movimiento.
const numero = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export function rangoDeGrafica(key, agrupacion, fechaInicio, fechaFin) {
  if (!key) return null;
  let desde = key;
  let hasta = key;
  if (agrupacion === 'semana') {
    const fin = new Date(`${key}T12:00:00Z`);
    if (Number.isNaN(fin.getTime())) return null;
    fin.setUTCDate(fin.getUTCDate() + 6);
    hasta = fin.toISOString().slice(0, 10);
  } else if (agrupacion === 'mes') {
    if (!/^\d{4}-\d{2}$/.test(key)) return null;
    const [anio, mes] = key.split('-').map(Number);
    desde = `${key}-01`;
    hasta = new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
  } else if (agrupacion === 'anio') {
    if (!/^\d{4}$/.test(key)) return null;
    desde = `${key}-01-01`;
    hasta = `${key}-12-31`;
  }
  if (fechaInicio && desde < fechaInicio) desde = fechaInicio;
  if (fechaFin && hasta > fechaFin) hasta = fechaFin;
  return desde <= hasta ? [desde, hasta] : null;
}

export function filtrarMovimientosGrafica(rows = [], {
  rango = null, tipo = 'Todos', categoria = 'Todas', buscar = ''
} = {}) {
  const term = String(buscar || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return (rows || []).filter(row => {
    if (rango && (!row.fecha || row.fecha < rango[0] || row.fecha > rango[1])) return false;
    if (tipo === 'Ingreso' && row.type !== 'Ingreso') return false;
    if (tipo === 'Egreso' && row.type === 'Ingreso') return false; // Incluye Nómina.
    if (categoria !== 'Todas' && row.categoria !== categoria) return false;
    if (term) {
      const fields = [row.folio, row.id, row.fecha, row.type, row.concepto,
        row.categoria, row.proveedor, row.responsable, row.source, row.status];
      if (!fields.some(v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(term))) return false;
    }
    return true;
  });
}

export function totalesMovimientosGrafica(rows = []) {
  return rows.reduce((totales, row) => {
    if (row.type === 'Ingreso') totales.ingresos += numero(row.monto);
    else totales.egresos += numero(row.monto);
    return totales;
  }, { ingresos: 0, egresos: 0 });
}
