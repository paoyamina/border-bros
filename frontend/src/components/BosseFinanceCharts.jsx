import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip,
  Bar, Line, Cell, LabelList, PieChart, Pie } from 'recharts';
import { rangoDeGrafica, filtrarMovimientosGrafica, totalesMovimientosGrafica } from './BosseFinanceChartLogic';
import { periodLabel, summarizeMovementGroups, groupMovementSelection,
  nominaForRange, percentOf, ringPercent } from './BosseFinanceChartPresentation';
import BosseFinanceIcon from './BosseFinanceIcon';
import { summarizeChartEvidence } from './BosseFinanceChartEvidence';
import './BosseFinanceCharts.css';

const fmt = value => new Intl.NumberFormat('es-MX', {style:'currency',currency:'MXN'}).format(Number(value)||0);
const compact = value => new Intl.NumberFormat('es-MX', {notation:'compact',maximumFractionDigits:1}).format(Number(value)||0);
const asPercent = value => value == null || !Number.isFinite(Number(value)) ? 'Sin dato' : `${Number(value).toFixed(2)}%`;
const labelType = value => value === 'Ingreso' ? 'Ingresos' : value === 'Egreso' ? 'Egresos (incluye nómina)' : 'Todos los movimientos';
const metricNames = {'ingresos-egresos':'Ingresos y egresos',ingresos:'Solo ingresos',egresos:'Solo egresos',gm:'GM · Ganancia',gpm:'GPM · Rentabilidad (%)',nomina:'Nómina real'};
const timeNames = {dia:'Día',semana:'Semana',mes:'Mes',anio:'Año'};
const groupNames = {...timeNames,categoria:'Categoría',concepto:'Concepto'};
const viewNames = {'barras-linea':'Barras y línea','solo-barras':'Barras agrupadas','solo-linea':'Línea de tendencia',horizontal:'Barras horizontales',dona:'Gráfica de dona'};
const donutPalette = ['#171717','#A18258','#D4BDA0','#514942','#8D8172','#E6D9C8','#B1A397','#735A3D'];
const isCategoryDimension = value => value === 'categoria' || value === 'concepto';
function allowedViews(metric,dimension,pointCount) {
  if (isCategoryDimension(dimension)) return metric === 'ingresos-egresos' ? ['solo-barras','horizontal'] : ['solo-barras','horizontal','dona'];
  if (metric === 'ingresos-egresos') return pointCount >= 2 ? ['barras-linea','solo-barras','solo-linea'] : ['barras-linea','solo-barras'];
  if (metric === 'gm' || metric === 'gpm') return pointCount >= 2 ? ['solo-linea','solo-barras'] : ['solo-barras'];
  return pointCount >= 2 ? ['solo-barras','solo-linea'] : ['solo-barras'];
}
function safeView(metric,dimension,view,pointCount) {
  const choices = allowedViews(metric,dimension,pointCount);
  return choices.includes(view) ? view : choices[0];
}
export default function BosseFinanceCharts({
  chart=[],rows=[],resumen={},fechaInicio='',fechaFin='',agrupacion='semana',onAgrupacionChange,
  dimension='semana',onDimensionChange,metrica='ingresos-egresos',onMetricaChange,
  estilo='barras-linea',onEstiloChange,selectedPeriod,onPeriodChange,
  tipo='Todos',onTipoChange,categoria='Todas',onCategoriaChange,
  buscar='',onBuscarChange,onClear,onOpen,onExplore,onExport,
  onSaveView,savedViews=[],onLoadView,hide=false
}) {
  const [page,setPage] = useState(1);
  const [pageSize,setPageSize] = useState(10);
  const [expandedExplanation,setExpandedExplanation] = useState(false);
  const [notice,setNotice] = useState('');
  const [activeGroup,setActiveGroup] = useState(null);
  const [nominaFocus,setNominaFocus] = useState(false);
  const [filtersExpanded,setFiltersExpanded] = useState(false);
  const isCategorical = isCategoryDimension(dimension);
  const selectedPoint = !isCategorical ? chart.find(point=>point.key === selectedPeriod?.key) || null : null;
  const range = useMemo(()=>rangoDeGrafica(selectedPoint?.key,agrupacion,fechaInicio,fechaFin),
    [selectedPoint?.key,agrupacion,fechaInicio,fechaFin]);
  const categories = useMemo(()=>[...new Set(rows.map(row=>row.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es-MX')),[rows]);
  const timePoints = useMemo(()=>chart.map(point=>({
    ...point,label:periodLabel(point.key,agrupacion,fechaInicio,fechaFin),
    nomina:nominaForRange(rows,rangoDeGrafica(point.key,agrupacion,fechaInicio,fechaFin))
  })),[chart,agrupacion,fechaInicio,fechaFin,rows]);
  const groupedPoints = useMemo(()=>summarizeMovementGroups(rows,dimension),[rows,dimension]);
  const displayPoints = isCategorical ? groupedPoints : timePoints;
  const [draft,setDraft] = useState(()=>({metrica,dimension,estilo:safeView(metrica,dimension,estilo,displayPoints.length)}));
  useEffect(()=>setDraft({metrica,dimension,estilo:safeView(metrica,dimension,estilo,displayPoints.length)}),[metrica,dimension,estilo,displayPoints.length]);
  const effectiveView = safeView(metrica,dimension,estilo,displayPoints.length);
  const draftChanged = draft.metrica!==metrica || draft.dimension!==dimension || draft.estilo!==estilo;
  const changeDraftMetric = value => setDraft(prev=>{
    const dim = ['gm','gpm'].includes(value) && isCategoryDimension(prev.dimension) ? agrupacion : prev.dimension;
    const count = isCategoryDimension(dim) ? groupedPoints.length : timePoints.length;
    return {metrica:value,dimension:dim,estilo:safeView(value,dim,prev.estilo,count)};
  });
  const changeDraftDimension = value => setDraft(prev=>{
    const count = isCategoryDimension(value) ? groupedPoints.length : timePoints.length;
    return {...prev,dimension:value,estilo:safeView(prev.metrica,value,prev.estilo,count)};
  });
  const applyDraft = () => {
    onMetricaChange?.(draft.metrica);
    onEstiloChange?.(safeView(draft.metrica,draft.dimension,draft.estilo,isCategoryDimension(draft.dimension)?groupedPoints.length:timePoints.length));
    onDimensionChange?.(draft.dimension);
    if (!isCategoryDimension(draft.dimension) && draft.dimension !== agrupacion) onAgrupacionChange?.(draft.dimension);
    if (draft.dimension !== dimension) {onPeriodChange?.(null);setActiveGroup(null);setNominaFocus(false);onTipoChange?.('Todos');onCategoriaChange?.('Todas');onBuscarChange?.('');}
    setNotice('Vista aplicada a los datos del periodo; ninguna cifra contable fue modificada.');
  };
  // Al seleccionar una categoría o concepto, la tabla muestra exactamente ese grupo.
  const baseRows = useMemo(()=>filtrarMovimientosGrafica(rows,{rango:range,tipo,categoria,buscar}),[rows,range,tipo,categoria,buscar]);
  const filteredRows = useMemo(()=>{
    const grouped = groupMovementSelection(baseRows,dimension,activeGroup);
    return nominaFocus ? grouped.filter(row=>row.type==='Nómina') : grouped;
  },[baseRows,dimension,activeGroup,nominaFocus]);
  const summedRows = useMemo(()=>totalesMovimientosGrafica(filteredRows),[filteredRows]);
  const evidence = useMemo(()=>summarizeChartEvidence(filteredRows),[filteredRows]);
  const periodRows = useMemo(()=>filtrarMovimientosGrafica(rows,{rango:range}),[rows,range]);
  const periodTotal = useMemo(()=>totalesMovimientosGrafica(periodRows),[periodRows]);
  const periodIncome = Number(selectedPoint ? selectedPoint.ingresos : resumen.total_ingresos)||0;
  const periodExpense = Number(selectedPoint ? selectedPoint.egresos : resumen.total_egresos)||0;
  const periodGm = Number(selectedPoint ? selectedPoint.gm : resumen.gm)||0;
  const periodGpm = selectedPoint ? selectedPoint.gpm : resumen.gpm;
  const isSubset = tipo!=='Todos' || categoria!=='Todas' || Boolean(buscar.trim()) || Boolean(activeGroup) || nominaFocus;
  const differs = Math.abs(periodIncome-periodTotal.ingresos)>.011 || Math.abs(periodExpense-periodTotal.egresos)>.011;
  const pages = Math.max(1,Math.ceil(filteredRows.length/pageSize));
  const safePage = Math.min(page,pages);
  const visible = filteredRows.slice((safePage-1)*pageSize,safePage*pageSize);
  const selectionTitle = selectedPoint ? `${range?.[0]||fechaInicio} — ${range?.[1]||fechaFin}` : `${fechaInicio} — ${fechaFin}`;
  const showMoney = value => hide ? '••••••' : fmt(value);
  const denominator = Math.max(1,Number(displayPoints[0]?.ingresos)||0,Number(displayPoints[0]?.egresos)||0,Number(displayPoints[0]?.nomina)||0);
  const showIncome = ['ingresos-egresos','ingresos'].includes(metrica);
  const showExpense = ['ingresos-egresos','egresos'].includes(metrica);
  const showMoneyAxis = metrica!=='gpm';
  const showPercentAxis = metrica==='gpm'||(metrica==='ingresos-egresos'&&effectiveView==='barras-linea');
  const showGpmLine = showPercentAxis && timePoints.length>=2;
  const singleMetricKey = metrica==='ingresos' ? 'ingresos' : metrica==='egresos' ? 'egresos' : metrica==='nomina' ? 'nomina' : null;
  const percentages = timePoints.map(point=>point.gpm).filter(value=>value!=null&&Number.isFinite(Number(value))).map(Number);
  const percentDomain = percentages.length ? [Math.min(0,Math.floor(Math.min(...percentages)/10)*10),Math.max(100,Math.ceil(Math.max(...percentages)/10)*10)] : [0,100];
  useEffect(()=>setPage(1),[range,tipo,categoria,buscar,pageSize,activeGroup,nominaFocus]);
  useEffect(()=>{setActiveGroup(null);setNominaFocus(false);},[dimension,fechaInicio,fechaFin]);
  const pickPoint = (point,nextType='Todos',focusNomina=false) => {
    if(!point?.key) return;
    onPeriodChange?.(selectedPeriod?.key===point.key && tipo===nextType && nominaFocus===focusNomina ? null : point);
    onTipoChange?.(nextType);
    setNominaFocus(focusNomina);
  };
  const pickGroup = (name,nextType='Todos',focusNomina=false) => {
    if(!name) return;
    setActiveGroup(previous=>previous===name&&tipo===nextType&&nominaFocus===focusNomina?null:name);
    onTipoChange?.(nextType);
    setNominaFocus(focusNomina);
    onPeriodChange?.(null);
  };
  const chooseType = value=>{onTipoChange?.(value);onCategoriaChange?.('Todas');setNominaFocus(false);};

  return <div className="bc-screen" aria-label="Gráficas y movimientos financieros">
    <div className="bc-upper">
      <section className="bc-graph-card" aria-label="Gráfica financiera interactiva">
        <div className="bc-graph-title">
          <div><h3 className="be-inline-icon"><BosseFinanceIcon name="chart" size={27}/> Ingresos, egresos y rentabilidad</h3>
          <p>Comparación financiera · Haz clic en una cifra para consultar sus movimientos.</p></div>
          <div className="bc-time-tabs" role="group" aria-label="Agrupar por periodo">
            {Object.entries(timeNames).map(([key,label]) => <button key={key} type="button" aria-pressed={dimension === key} className={dimension === key ? 'is-active' : ''}
              onClick={() => { onDimensionChange?.(key);onAgrupacionChange?.(key);onPeriodChange?.(null);setActiveGroup(null);setDraft(previous=>({...previous,dimension:key}));setNotice(''); }}>{label}</button>)}
          </div>
        </div>
        <div className="bc-guide"><BosseFinanceIcon name="info" size={18}/>
          <span>{isCategorical ? 'Distribución por movimientos disponibles. Selecciona una barra o segmento para inspeccionar los registros exactos.' :
            'Los montos se comparan en MXN; GPM tiene escala porcentual propia. Selecciona un periodo para ver sus registros.'}</span>
        </div>
        {hide ? <div className="bc-graph-empty" role="status">El modo Privacidad oculta la visualización y los importes. Desactívalo para consultar la gráfica.</div> :
          displayPoints.length === 0 ? <div className="bc-graph-empty" role="status">No hay registros para esta combinación de fechas y filtros. Prueba otro periodo o agrupación.</div> :
          !isCategorical && displayPoints.length === 1 ? <div className="bc-one-period" aria-label="Cifras de un solo periodo">
            <div className="bc-one-period-head"><div><span className="bc-graph-eyebrow">UN PERIODO DISPONIBLE</span><h4>{displayPoints[0].label}</h4><p>Sin comparación temporal: todas las cifras provienen de los registros reales.</p></div>
              <span className="bc-one-period-tag"><BosseFinanceIcon name="calendar" size={17}/> {periodLabel(displayPoints[0].key,agrupacion,fechaInicio,fechaFin)}</span>
            </div>
            <div className="bc-one-period-grid">
              <div className="bc-one-money">
                {metrica !== 'gpm' && metrica !== 'gm' && <>
                  {showIncome && <button type="button" aria-pressed={selectedPoint?.key === displayPoints[0].key && tipo === 'Ingreso'} className="bc-one-money-row" onClick={() => pickPoint(chart[0],'Ingreso')}>
                    <span className="bc-one-money-label"><BosseFinanceIcon name="coins" size={20}/> Ingresos</span><strong>{showMoney(displayPoints[0].ingresos)}</strong>
                    <span className="bc-scale-bar"><i className="income" style={{width:`${Math.max(0,Math.min(100,100 * Number(displayPoints[0].ingresos || 0) / denominator))}%`}}/></span>
                  </button>}
                  {showExpense && <button type="button" aria-pressed={selectedPoint?.key === displayPoints[0].key && tipo === 'Egreso'} className="bc-one-money-row" onClick={() => pickPoint(chart[0],'Egreso')}>
                    <span className="bc-one-money-label"><BosseFinanceIcon name="wallet" size={20}/> Egresos</span><strong>{showMoney(displayPoints[0].egresos)}</strong>
                    <span className="bc-scale-bar"><i className="expense" style={{width:`${Math.max(0,Math.min(100,100 * Number(displayPoints[0].egresos || 0) / denominator))}%`}}/></span>
                  </button>}
                  {metrica === 'nomina' && <button type="button" className="bc-one-money-row" onClick={() => pickPoint(chart[0],'Egreso',true)}>
                    <span className="bc-one-money-label"><BosseFinanceIcon name="people" size={20}/> Nómina real</span><strong>{showMoney(displayPoints[0].nomina)}</strong>
                    <span className="bc-scale-bar"><i className="expense" style={{width:`${Math.max(0,Math.min(100,100 * Number(displayPoints[0].nomina || 0) / denominator))}%`}}/></span>
                  </button>}
                </>}
                {metrica === 'gm' && <div className="bc-one-gm"><span>GM · Ganancia en MXN</span><strong>{showMoney(displayPoints[0].gm)}</strong><small>Dato oficial del periodo, no una proyección.</small></div>}
                {metrica === 'gpm' && <div className="bc-one-gm"><span>GPM · Margen porcentual</span><strong>{asPercent(displayPoints[0].gpm)}</strong><small>GM ÷ Ingresos × 100; no hay línea temporal con una observación.</small></div>}
                {metrica === 'ingresos-egresos' && <p className="bc-one-footnote">Los egresos equivalen al <strong>{asPercent(percentOf(displayPoints[0].egresos,displayPoints[0].ingresos))}</strong> de los ingresos. Las barras comparten la misma escala.</p>}
                <button className="bc-one-inspect" type="button" onClick={() => pickPoint(chart[0],'Todos')}><BosseFinanceIcon name="eye" size={17}/> Ver movimientos de este periodo</button>
              </div>
              <button type="button" className="bc-gpm-gauge" onClick={() => pickPoint(chart[0],'Todos')} aria-label={`Consultar movimientos de GPM: ${asPercent(displayPoints[0].gpm)}`}>
                <svg viewBox="0 0 178 178" role="img" aria-label={`GPM ${asPercent(displayPoints[0].gpm)}`}>
                  <circle cx="89" cy="89" r="68" fill="none" stroke="var(--be-border)" strokeWidth="13"/>
                  <circle cx="89" cy="89" r="68" fill="none" stroke="#171717" strokeWidth="13" strokeDasharray={`${2*Math.PI*68*ringPercent(displayPoints[0].gpm)/100} ${2*Math.PI*68}`} strokeLinecap="round" transform="rotate(-90 89 89)"/>
                  <text x="89" y="86" textAnchor="middle" fill="var(--be-ink)" fontSize="24" fontWeight="800">{asPercent(displayPoints[0].gpm)}</text>
                  <text x="89" y="106" textAnchor="middle" fill="var(--be-muted)" fontSize="13">GPM</text>
                </svg>
                <strong>Margen del periodo</strong>
                <small>{Number(displayPoints[0].gpm) > 100 || Number(displayPoints[0].gpm) < 0 ? 'El margen está fuera de 0–100%; el aro se limita a esta escala visual.' : 'Abre los movimientos que forman la cifra.'}</small>
              </button>
            </div>
            {estilo === 'solo-linea' && <p role="status" className="bc-trend-note">Una línea necesita al menos dos periodos. Se muestra el comparativo real en su lugar.</p>}
          </div> : isCategorical ? <div className="bc-category-visual">
            <div className="bc-category-caption"><span><BosseFinanceIcon name="layers" size={18}/> Desglose por {dimension === 'categoria' ? 'categoría' : 'concepto'}</span>
              <small>Estas sumas provienen de los movimientos disponibles y pueden diferir de ajustes oficiales no desglosados.</small></div>
            {effectiveView === 'dona' && singleMetricKey ? <div className="bc-donut-layout">
              <div className="bc-donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart>
                <Pie data={displayPoints.filter(point=>Number(point[singleMetricKey])>0)} dataKey={singleMetricKey} nameKey="label" innerRadius="54%" outerRadius="79%" paddingAngle={2}
                  onClick={entry=>pickGroup(entry?.key || entry?.payload?.key,metrica==='ingresos'?'Ingreso':'Egreso',metrica==='nomina')}>{displayPoints.filter(point=>Number(point[singleMetricKey])>0).map((point,i)=><Cell key={point.key} fill={donutPalette[i%donutPalette.length]}/>)}</Pie>
                <Tooltip formatter={value=>fmt(value)}/>
              </PieChart></ResponsiveContainer></div>
              <div className="bc-donut-legend">{displayPoints.map((point,i)=><button type="button" key={point.key} onClick={()=>pickGroup(point.key,metrica==='ingresos'?'Ingreso':'Egreso',metrica==='nomina')} aria-pressed={activeGroup===point.key}>
                <span><i style={{background:donutPalette[i%donutPalette.length]}}/> {point.label}</span><strong>{showMoney(point[singleMetricKey])}</strong></button>)}</div>
            </div> : <div className="bc-chart-scroll"><div className={`bc-chart-area ${effectiveView === 'horizontal' ? 'bc-horizontal-chart' : ''}`} style={{height:Math.min(630,Math.max(298,effectiveView==='horizontal' ? displayPoints.length*44+72 : 316))}}>
              <ResponsiveContainer width="100%" height="100%"><ComposedChart data={displayPoints} layout={effectiveView === 'horizontal' ? 'vertical' : 'horizontal'} margin={{top:20,right:18,bottom:24,left:effectiveView==='horizontal'?35:0}} barGap={6}>
                <CartesianGrid stroke="#E6DED3" vertical={effectiveView!=='horizontal'} horizontal={effectiveView==='horizontal'}/>
                {effectiveView==='horizontal' ? <><XAxis type="number" tickFormatter={compact}/><YAxis type="category" dataKey="label" width={120} tick={{fontSize:11}}/></> : <><XAxis dataKey="label" interval={0} tickFormatter={value=>String(value).length>14?`${String(value).slice(0,12)}…`:value} tick={{fontSize:11}} tickLine={false}/><YAxis tickFormatter={compact} width={66}/></>}
                <Tooltip formatter={value=>fmt(value)}/>
                {showIncome && <Bar dataKey="ingresos" name="Ingresos" fill="#171717" maxBarSize={46} radius={effectiveView==='horizontal'?[0,4,4,0]:[4,4,0,0]} onClick={entry=>pickGroup(entry?.payload?.key || entry?.key,'Ingreso')}>{displayPoints.map(point=><Cell key={point.key} fill={activeGroup===point.key?'#70573B':'#171717'}/>)}</Bar>}
                {showExpense && <Bar dataKey="egresos" name="Egresos" fill="#A18258" maxBarSize={46} radius={effectiveView==='horizontal'?[0,4,4,0]:[4,4,0,0]} onClick={entry=>pickGroup(entry?.payload?.key || entry?.key,'Egreso')}/>}
                {metrica==='nomina' && <Bar dataKey="nomina" name="Nómina" fill="#A18258" maxBarSize={46} onClick={entry=>pickGroup(entry?.payload?.key || entry?.key,'Egreso',true)}/>}
              </ComposedChart></ResponsiveContainer>
            </div></div>}
            {activeGroup && <button type="button" className="bc-clear-visual" onClick={()=>{setActiveGroup(null);setNominaFocus(false);onTipoChange?.('Todos');}}>Quitar selección: {activeGroup} ×</button>}
          </div> : <div className="bc-chart-scroll"><div className="bc-chart-area bc-time-chart">
            <ResponsiveContainer width="100%" height="100%"><ComposedChart data={displayPoints} margin={{top:36,right:14,bottom:17,left:4}} barGap={5}>
              <CartesianGrid strokeDasharray="3 5" stroke="#E4DCD2" vertical={false}/>
              <XAxis dataKey="label" tick={{fontSize:11,fill:'#5D564F'}} tickLine={false} axisLine={false} interval={0}/>
              {showMoneyAxis && <YAxis yAxisId="value" tickFormatter={compact} tick={{fontSize:11,fill:'#625B54'}} width={69} axisLine={false} tickLine={false}/>}
              {showPercentAxis && <YAxis yAxisId="percent" orientation={showMoneyAxis?'right':'left'} domain={percentDomain} tickFormatter={value=>`${value}%`} width={54} tick={{fontSize:11,fill:'#625B54'}} axisLine={false} tickLine={false}/>}
              <Tooltip formatter={(value,name)=>name==='GPM'?asPercent(value):fmt(value)} labelFormatter={label=>`Periodo: ${label}`}/>
              {showIncome && (effectiveView === 'solo-barras' || effectiveView==='barras-linea') && <Bar yAxisId="value" dataKey="ingresos" name="Ingresos" fill="#171717" maxBarSize={56} radius={[5,5,0,0]} onClick={entry=>pickPoint(entry?.payload||entry,'Ingreso')}>{displayPoints.map(point=><Cell key={point.key} fill={selectedPoint?.key===point.key?'#7C6041':'#171717'}/>)}</Bar>}
              {showExpense && (effectiveView === 'solo-barras' || effectiveView==='barras-linea') && <Bar yAxisId="value" dataKey="egresos" name="Egresos" fill="#A18258" maxBarSize={56} radius={[5,5,0,0]} onClick={entry=>pickPoint(entry?.payload||entry,'Egreso')}/>}
              {metrica==='nomina' && effectiveView!=='solo-linea' && <Bar yAxisId="value" dataKey="nomina" name="Nómina real" fill="#A18258" maxBarSize={54} onClick={entry=>pickPoint(entry?.payload||entry,'Egreso',true)}/>}
              {metrica==='gm' && effectiveView!=='solo-linea' && <Bar yAxisId="value" dataKey="gm" name="GM" fill="#171717" maxBarSize={54} onClick={entry=>pickPoint(entry?.payload||entry,'Todos')}/>}
              {effectiveView==='solo-linea' && showIncome && <Line yAxisId="value" dataKey="ingresos" name="Ingresos" type="monotone" stroke="#171717" strokeWidth={3} dot={{r:4}} activeDot={{r:7}} onClick={entry=>pickPoint(entry?.payload||entry,'Ingreso')}/>}
              {effectiveView==='solo-linea' && showExpense && <Line yAxisId="value" dataKey="egresos" name="Egresos" type="monotone" stroke="#A18258" strokeWidth={3} dot={{r:4}} activeDot={{r:7}} onClick={entry=>pickPoint(entry?.payload||entry,'Egreso')}/>}
              {effectiveView==='solo-linea' && metrica==='nomina' && <Line yAxisId="value" dataKey="nomina" name="Nómina real" type="monotone" stroke="#A18258" strokeWidth={3} dot={{r:4}} activeDot={{r:7}} onClick={entry=>pickPoint(entry?.payload||entry,'Egreso',true)}/>}
              {effectiveView==='solo-linea' && metrica==='gm' && <Line yAxisId="value" dataKey="gm" name="GM" type="monotone" stroke="#171717" strokeWidth={3} dot={{r:4}} activeDot={{r:7}} onClick={entry=>pickPoint(entry?.payload||entry,'Todos')}/>}
              {showGpmLine && <Line yAxisId="percent" dataKey="gpm" name="GPM" type="monotone" stroke="#7D674C" strokeWidth={3} dot={{r:4,strokeWidth:2,fill:'#fff'}} activeDot={{r:7}} connectNulls={false} onClick={entry=>pickPoint(entry?.payload||entry,'Todos')}>
                {displayPoints.length<=7 && <LabelList dataKey="gpm" position="top" offset={11} formatter={asPercent} style={{fontSize:11,fill:'#37312B',fontWeight:700}}/>}
              </Line>}
            </ComposedChart></ResponsiveContainer>
          </div></div>}
        {!hide && displayPoints.length>0 && <div className="bc-legend-note" aria-label="Leyenda de la gráfica">
          {showIncome && <span><i className="bc-legend-income"/> Ingresos</span>}
          {showExpense && <span><i className="bc-legend-expense"/> Egresos</span>}
          {metrica==='nomina' && <span><i className="bc-legend-expense"/> Nómina real</span>}
          {metrica==='gm' && <span><i className="bc-legend-income"/> GM (MXN)</span>}
          {showGpmLine && <span><i className="bc-legend-gpm"/> GPM (%) · margen</span>}
        </div>}
        <div className="bc-period-pick"><label htmlFor="bc-period-picker">Periodo para inspeccionar
          <select id="bc-period-picker" value={selectedPoint?.key||''} disabled={isCategorical} onChange={event=>onPeriodChange(chart.find(point=>point.key===event.target.value)||null)}>
            <option value="">Todos los periodos consultados</option>
            {chart.map(point=><option key={point.key} value={point.key}>{periodLabel(point.key,agrupacion,fechaInicio,fechaFin)}</option>)}
          </select></label>
          {selectedPoint && <button type="button" onClick={()=>onPeriodChange(null)}>Quitar periodo ×</button>}
          <span className="bc-period-summary">Periodo analizado: <strong>{selectionTitle}</strong> · Fecha financiera de Tijuana, cierre 05:00</span>
        </div>
        <div className="bc-metrics" aria-label="Indicadores financieros de la selección">
          <div><BosseFinanceIcon name="coins" size={21}/><span>Ingresos</span><strong>{showMoney(periodIncome)}</strong><small>{isCategorical?'Cifra oficial del periodo':'Cifra oficial de la selección'}</small></div>
          <div><BosseFinanceIcon name="wallet" size={21}/><span>Egresos</span><strong>{showMoney(periodExpense)}</strong><small>Incluye nómina contabilizada</small></div>
          <div className="bc-metric-highlight"><BosseFinanceIcon name="chart" size={21}/><span>GM · Ganancia</span><strong>{showMoney(periodGm)}</strong><small>Importe oficial en MXN</small></div>
          <div><BosseFinanceIcon name="percent" size={21}/><span>GPM · Margen</span><strong>{hide?'••••••':asPercent(periodGpm)}</strong><small>Porcentaje, no importe</small></div>
        </div>
      </section>
      <aside className="bc-constructor" aria-label="Constructor de gráficas">
        <h3 className="be-inline-icon"><BosseFinanceIcon name="sliders" size={24}/> Constructor</h3>
        <p>Tres decisiones para explorar los mismos registros financieros.</p>
        <label htmlFor="bc-metric">Métrica<select id="bc-metric" value={draft.metrica} onChange={event=>changeDraftMetric(event.target.value)}>
          {Object.entries(metricNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select></label>
        <label htmlFor="bc-group">Agrupar por<select id="bc-group" value={draft.dimension} onChange={event=>changeDraftDimension(event.target.value)}>
          {Object.entries(groupNames).map(([value,label])=><option key={value} value={value} disabled={['gm','gpm'].includes(draft.metrica)&&['categoria','concepto'].includes(value)}>{label}</option>)}
        </select></label>
        <label htmlFor="bc-view">Visualización<select id="bc-view" value={draft.estilo} onChange={event=>setDraft(previous=>({...previous,estilo:event.target.value}))}>
          {allowedViews(draft.metrica,draft.dimension,isCategoryDimension(draft.dimension)?groupedPoints.length:timePoints.length).map(value=><option key={value} value={value}>{viewNames[value]}</option>)}
        </select></label>
        <button type="button" className="bc-apply" onClick={applyDraft} disabled={!draftChanged}><BosseFinanceIcon name="check" size={18}/> Aplicar</button>
        <button type="button" className="bc-save" onClick={onSaveView} disabled={draftChanged} title={draftChanged?'Primero aplica la configuración':'Guardar configuración actual'}><BosseFinanceIcon name="layers" size={17}/> Guardar vista</button>
        {draftChanged && <p className="bc-draft-status" role="status">Configuración pendiente de aplicar.</p>}
        {!draftChanged && notice && <p className="bc-applied-status" role="status">{notice}</p>}
        {savedViews.length>0 && <label htmlFor="bc-saved-view">Vistas guardadas<select id="bc-saved-view" value="" onChange={event=>{if(event.target.value!=='')onLoadView(savedViews[Number(event.target.value)]);}}>
          <option value="">Seleccionar vista…</option>{savedViews.map((view,i)=><option key={`${view.name}-${i}`} value={i}>{view.name}</option>)}
        </select></label>}
        <div className="bc-constructor-help"><strong><BosseFinanceIcon name="info" size={16}/> Cómo interpretar esta vista</strong>
          <p>{isCategorical?'Categorías y conceptos se suman desde movimientos. Los KPIs superiores conservan las cifras oficiales y pueden incluir otros ajustes.':'Los importes están en MXN. La rentabilidad GPM utiliza porcentajes; la línea temporal necesita dos o más periodos.'}</p>
        </div>
      </aside>
    </div>

    <section className="bc-records bc-records-compact" aria-label="Movimientos que conforman la selección">
      <div className="bc-records-head"><div><h3 className="be-inline-icon"><BosseFinanceIcon name="receipt" size={23}/> Movimientos de la selección</h3><p>Cada fila forma parte de la cifra o del grupo seleccionado en la gráfica.</p></div>
        <div className="bc-records-actions"><button type="button" disabled={hide} onClick={() => onExport?.('graficas-seleccion', 'pdf', {recordKeys: filteredRows.map(row=>row.key)})}><BosseFinanceIcon name="pdf" size={17}/> PDF filtrado</button><button type="button" disabled={hide} onClick={() => onExport?.('graficas-seleccion', 'excel', {recordKeys: filteredRows.map(row=>row.key)})}><BosseFinanceIcon name="excel" size={17}/> Excel filtrado</button><button type="button" disabled={!filteredRows.length} onClick={() => onExplore?.({ recordKeys: filteredRows.map(row=>row.key) })}>Ver todo en Explorar →</button></div>
      </div>
      <div className="bc-selection-toolbar" aria-label="Contexto y filtros de selección">
        <div className="bc-active-selection">
          <span className="bc-chip bc-chip-period"><BosseFinanceIcon name="calendar" size={14}/>{selectedPoint ? selectionTitle : `${fechaInicio} — ${fechaFin}`}</span>
          <span className="bc-chip">Métrica: {metricNames[metrica] || metrica}</span>
          <span className="bc-chip">Agrupación: {groupNames[dimension] || dimension}</span>
          {nominaFocus && <span className="bc-chip">Solo nómina real</span>}
          {activeGroup && <span className="bc-chip">{dimension==='concepto'?'Concepto':'Categoría'}: {activeGroup}</span>}
          {tipo !== 'Todos' && <span className="bc-chip">{labelType(tipo)}</span>}
          {categoria !== 'Todas' && <span className="bc-chip">Categoría: {categoria}</span>}
          {buscar && <span className="bc-chip">Búsqueda: {buscar}</span>}
        </div>
        <div className="bc-toolbar-buttons">
          <button type="button" aria-expanded={filtersExpanded} aria-controls="bc-chart-record-filters" onClick={()=>setFiltersExpanded(v=>!v)}><BosseFinanceIcon name="sliders" size={16}/> {filtersExpanded?'Ocultar filtros':'Editar filtros'}</button>
          {(selectedPoint || activeGroup || nominaFocus || tipo !== 'Todos' || categoria !== 'Todas' || buscar) && <button type="button" onClick={() => {setActiveGroup(null);setNominaFocus(false);onClear?.();}}>Limpiar selección ×</button>}
        </div>
      </div>
      {filtersExpanded && <div id="bc-chart-record-filters" className="bc-records-filters">
        <label>Tipo de movimiento
          <select value={tipo} onChange={e => chooseType(e.target.value)}><option value="Todos">Ingresos y egresos</option><option value="Ingreso">Ingresos</option><option value="Egreso">Egresos (incluye nómina)</option></select>
        </label><label>Categoría<select value={categoria} onChange={e => onCategoriaChange?.(e.target.value)}><option value="Todas">Todas</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <label className="bc-search">Buscar folio, concepto o proveedor<input type="search" value={buscar} onChange={e => onBuscarChange?.(e.target.value)} placeholder="Escribe para filtrar…"/></label>
      </div>}
      <div className="bc-selection-summary" aria-live="polite">
        <span><strong>{filteredRows.length}</strong> {filteredRows.length===1?'movimiento':'movimientos'}</span>
        <span>Ingresos: <strong>{showMoney(summedRows.ingresos)}</strong></span>
        <span>Egresos: <strong>{showMoney(summedRows.egresos)}</strong></span>
        {isSubset ? <span className="bc-summary-note">Subtotal filtrado · No sustituye el indicador oficial</span> : differs ?
          <span className="bc-summary-warning" role="status">Diferencia con el total oficial; consulta los ajustes</span> :
          <span className="bc-summary-ok">✓ Detalle conciliado con el periodo</span>}
        <div className="bc-explanation bc-explanation-inline"><button type="button" aria-expanded={expandedExplanation} onClick={() => setExpandedExplanation(v => !v)}>¿Cómo se calcula GM/GPM? {expandedExplanation ? '▴' : '▾'}</button></div>
      </div>
      {expandedExplanation && <div className="bc-inline-explanation"><p>GM y GPM provienen del cálculo oficial del backend. Los cortes de caja y sus medios de pago son vistas del mismo ingreso: los medios de pago no se suman como ingresos adicionales. La nómina contabilizada está incluida en egresos; los ajustes cambiarios no son movimientos de caja adicionales.</p>
        {differs && !isSubset && <p>La suma del desglose difiere de los indicadores oficiales en {showMoney(periodIncome-periodTotal.ingresos)} de ingresos y {showMoney(periodExpense-periodTotal.egresos)} de egresos. Revisa los registros o ajustes no disponibles antes de conciliar.</p>}</div>}
      {visible.length ? <div className="bc-table-scroll"><table className="bc-table"><thead><tr><th>Fecha</th><th>Folio</th><th>Tipo</th><th>Origen / Categoría</th><th>Concepto</th><th>Proveedor / Responsable</th><th className="bc-amount">Importe</th><th>Ver</th></tr></thead><tbody>
        {visible.map(row => <tr key={row.key}><td data-label="Fecha">{periodLabel(row.fecha,'dia')}</td><td data-label="Folio">{row.folio}</td><td data-label="Tipo"><span className={`bc-type ${row.type === 'Ingreso' ? 'income' : 'expense'}`}>{row.type}</span></td>
          <td data-label="Origen / Categoría"><strong>{row.categoria}</strong><small>{row.source}</small></td><td data-label="Concepto">{row.concepto}</td><td data-label="Proveedor">{row.proveedor}</td>
          <td data-label="Importe" className="bc-amount">{showMoney(row.monto)}</td><td data-label="Ver"><button type="button" onClick={() => onOpen?.(row)} aria-label={`Ver detalle del movimiento ${row.folio || row.key}`}>Ver detalle</button></td></tr>)}
        </tbody></table></div> : <div className="bc-no-data"><strong>No hay movimientos con estos filtros.</strong><p>Prueba quitar la búsqueda o seleccionar otro periodo.</p><button type="button" onClick={() => {setActiveGroup(null);setNominaFocus(false);onClear?.();}}>Mostrar todos</button></div>}
      <div className="bc-pagination"><span>Mostrando {visible.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filteredRows.length)} de {filteredRows.length}</span>
        <div><button type="button" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><strong>Página {safePage} de {pages}</strong><button type="button" disabled={safePage >= pages} onClick={() => setPage(p => p + 1)}>Siguiente</button></div>
        <label>Filas <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label></div>
    </section>
    <aside className="bc-borderbro-strip bc-borderbro-context" aria-label="BorderBro: explicación comprobable de la selección">
      <div className="bc-borderbro-mark"><BosseFinanceIcon name="sparkles" size={23}/><strong>BorderBro</strong><small>Lectura de los registros seleccionados</small></div>
      <div className="bc-borderbro-insight" aria-live="polite">
        <strong>{evidence.title}</strong>
        {!evidence.count ? <p>Los filtros actuales no contienen movimientos. Amplía el periodo o limpia la selección para obtener una lectura.</p> : <>
          <p>Esta selección abarca <b>{evidence.count} {evidence.count === 1 ? 'movimiento' : 'movimientos'}</b> en <b>{evidence.distinctDates} {evidence.distinctDates === 1 ? 'fecha' : 'fechas'}</b>:
            {evidence.incomeCount > 0 && <> <b>{evidence.incomeCount} {evidence.incomeCount === 1 ? 'ingreso' : 'ingresos'}</b> por <b>{showMoney(evidence.income)}</b>.</>}
            {evidence.expenseCount > 0 && <> <b>{evidence.expenseCount} {evidence.expenseCount === 1 ? 'egreso' : 'egresos'}</b> por <b>{showMoney(evidence.expense)}</b>.</>}
          </p>
          {evidence.largestIncome && <p>El ingreso individual más alto es <b>{hide ? 'un movimiento' : evidence.largestIncome.folio}</b>, por <b>{showMoney(evidence.largestIncome.monto)}</b>{evidence.income > 0 && !hide ? ` (${(100 * evidence.largestIncome.monto / evidence.income).toFixed(1)}% de los ingresos filtrados)` : ''}.</p>}
          {evidence.topExpense && <p>El rubro de egresos con mayor importe es <b>{evidence.topExpense.category}</b>: <b>{showMoney(evidence.topExpense.amount)}</b>, equivalente al <b>{hide ? '••••' : `${evidence.topExpense.share.toFixed(1)}%`}</b> de los egresos filtrados.</p>}
          {evidence.incomeCount > 0 && evidence.expenseCount > 0 && <p>La diferencia entre ingresos y egresos de esta selección es <b>{showMoney(evidence.income-evidence.expense)}</b>. Es una resta del filtro, no necesariamente el GM oficial.</p>}
        </>}
        <small>Conclusiones descriptivas basadas en movimientos verificables. No se atribuyen causas ni tendencias sin datos comparables.</small>
      </div>
      <button type="button" disabled={!filteredRows.length} onClick={() => onExplore?.({ recordKeys: filteredRows.map(row=>row.key) })}>Ver evidencia ({filteredRows.length}) →</button>
    </aside>
  </div>;
}
