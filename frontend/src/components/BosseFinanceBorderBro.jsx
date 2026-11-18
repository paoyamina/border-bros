import React, { useEffect, useMemo, useRef, useState } from 'react';
import { calculateBorderBroScenario, getBorderBroFindings, getBorderBroNextSteps, reconcileBorderBro } from './BosseFinanceBorderBroLogic';
import BosseFinanceIcon from './BosseFinanceIcon';
import { BosseBorderBroInline } from './BosseBorderBroChat';
import './BosseFinanceBorderBro.css';

const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(number(value));
const visibleMoney = (value, hide) => hide ? '••••••' : money(value);
const percentage = value => `${number(value).toFixed(2)}%`;
const shortDate = value => {
  const str = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? `${str.slice(8)} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][Number(str.slice(5,7))-1]} ${str.slice(0,4)}` : 'Sin fecha';
};
const evidenceTotal = rows => rows.reduce((n, row) => n + number(row.monto), 0);
const badgeTone = status => status === 'Hecho' ? 'bbi-status-fact' : status === 'Hipótesis' ? 'bbi-status-hypothesis' : 'bbi-status-insufficient';

export default function BosseFinanceBorderBro({
  analisis, movements = [], hide = false, fechaInicio = '', fechaFin = '', negocioNombre = 'BOSSE',
  onOpenRecord, onExploreExact, onGoCharts, onExport, onBorderBro, chat
}) {
  const findings = useMemo(() => getBorderBroFindings(analisis, movements), [analisis, movements]);
  const balance = useMemo(() => reconcileBorderBro(analisis, movements), [analisis, movements]);
  const [selectedId, setSelectedId] = useState(null);
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const [salesChange, setSalesChange] = useState(0);
  const [operatingChange, setOperatingChange] = useState(0);
  const [payrollChange, setPayrollChange] = useState(0);
  const [showMethod, setShowMethod] = useState(false);
  const [contextCollapsed, setContextCollapsed] = useState(false);
  const evidenceRef = useRef(null);
  const scenarioRef = useRef(null);
  const diagnosisRef = useRef(null);
  const nextRef = useRef(null);
  const toolsDetailsRef = useRef(null);
  const selected = findings.find(f => f.id === selectedId) || findings[0];
  const evidence = selected?.evidence || [];
  const visibleEvidence = showAllEvidence ? evidence : evidence.slice(0, 4);
  const scenario = useMemo(() => calculateBorderBroScenario(analisis?.resumen || {}, salesChange, operatingChange, payrollChange),
    [analisis, salesChange, operatingChange, payrollChange]);
  const reconciled = balance.incomes.available && balance.expenses.available &&
    Math.abs(balance.incomes.official - balance.incomes.listed) < .011 &&
    Math.abs(balance.expenses.official - balance.expenses.listed) < .011;
  const hasBaseline = !!analisis?.resumen && balance.incomes.available && balance.expenses.available &&
    analisis.resumen.gm != null && analisis.resumen.gpm != null && scenario.validBaseline;
  const hasScenarioChange = salesChange !== 0 || operatingChange !== 0 || payrollChange !== 0;
  const steps = getBorderBroNextSteps(selected);

  useEffect(() => {
    setSelectedId(null); setShowAllEvidence(false);
    setSalesChange(0); setOperatingChange(0); setPayrollChange(0);
    setShowMethod(false);
  }, [analisis, fechaInicio, fechaFin]);

  const revealTool = target => {
    if (toolsDetailsRef.current) toolsDetailsRef.current.open = true;
    requestAnimationFrame(() => target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const chooseFinding = (id, scroll = false) => {
    setSelectedId(id); setShowAllEvidence(false);
    if (scroll) revealTool(evidenceRef);
  };
  const openRecords = finding => {
    if (!hide && finding?.evidence?.length) onExploreExact?.(finding);
  };
  const simulate = () => revealTool(scenarioRef);
  const reset = () => { setSalesChange(0); setOperatingChange(0); setPayrollChange(0); };
  const dates = `${shortDate(fechaInicio)} — ${shortDate(fechaFin)}`;
  const officialSummary = analisis?.resumen || {};
  const periodStatus = String(analisis?.periodo?.estado || 'Sin estado informado');
  const jumpTo = ref => revealTool(ref);
  const exportReport = format => onExport?.('borderbro', format, { salesChange, operatingChange, payrollChange });

  return <div className="bbi-screen" aria-label="BorderBro, diagnóstico financiero">
    <div className={`bbi-copilot-grid ${contextCollapsed ? 'bbi-context-collapsed' : ''}`}>
      <div className="bbi-copilot-chat">
        {chat && (React.isValidElement(chat) && chat.type === BosseBorderBroInline ? React.cloneElement(chat, {
          copilot: true,
          suggestedQuestions: findings.slice(0, 2).map(finding => `Explícame el hallazgo: ${finding.title}. ¿Qué registros lo respaldan?`),
          forcePrivacy: hide
        }) : chat)}
      </div>
      <aside className="bbi-copilot-aside bbi-panel" aria-label="Contexto financiero de la conversación">
        <div className="bbi-focus-aside-heading">
          {!contextCollapsed && <div><h3><BosseFinanceIcon name="chart" size={23}/> Contexto financiero</h3><p>Periodo: {dates}</p></div>}
          <button type="button" className="bbi-context-collapse" onClick={() => setContextCollapsed(value => !value)} aria-label={contextCollapsed ? 'Mostrar contexto financiero' : 'Ocultar contexto financiero'} aria-expanded={!contextCollapsed} title={contextCollapsed ? 'Mostrar contexto financiero' : 'Ocultar contexto financiero'}><BosseFinanceIcon name={contextCollapsed ? 'chevronRight' : 'back'} size={20}/></button>
        </div>
        {!contextCollapsed && <>
          <div className="bbi-focus-kpis" aria-label="Indicadores oficiales del periodo">
            <div><BosseFinanceIcon name="coins" size={20}/><span>Ingresos</span><strong>{analisis?.resumen?.total_ingresos == null ? 'No disponible' : visibleMoney(officialSummary.total_ingresos, hide)}</strong></div>
            <div><BosseFinanceIcon name="wallet" size={20}/><span>Egresos</span><strong>{analisis?.resumen?.total_egresos == null ? 'No disponible' : visibleMoney(officialSummary.total_egresos, hide)}</strong></div>
            <div><BosseFinanceIcon name="percent" size={20}/><span>GPM</span><strong>{analisis?.resumen?.gpm == null ? 'No disponible' : hide ? '••••' : percentage(officialSummary.gpm)}</strong></div>
          </div>
          <div className="bbi-focus-finding">
            <h4><BosseFinanceIcon name="sparkles" size={21}/> Hallazgo principal</h4>
            {selected ? <div className="bbi-focus-finding-card">
              <strong>{hide ? 'Hallazgo protegido' : selected.title}</strong>
              <p>{hide ? 'Desactiva Privacidad para consultar este hallazgo.' : selected.description}</p>
              <div className="bbi-focus-finding-actions">
                <span className={`bbi-status ${badgeTone(selected.status)}`}>{selected.status}</span>
                {evidence.length > 0 && <button type="button" onClick={() => chooseFinding(selected.id, true)} disabled={hide}><BosseFinanceIcon name="eye" size={16}/> Ver evidencia ({evidence.length}) <BosseFinanceIcon name="chevronRight" size={14}/></button>}
              </div>
            </div> : <p className="bbi-focus-no-finding">Todavía no hay hallazgos disponibles para el periodo consultado.</p>}
          </div>
          <div className="bbi-focus-links" aria-label="Herramientas financieras">
            <button type="button" onClick={() => jumpTo(diagnosisRef)}><BosseFinanceIcon name="layers" size={19}/> Diagnósticos del periodo <BosseFinanceIcon name="chevronRight" size={17}/></button>
            <button type="button" onClick={() => jumpTo(scenarioRef)}><BosseFinanceIcon name="sliders" size={19}/> Escenarios financieros <BosseFinanceIcon name="chevronRight" size={17}/></button>
            <button type="button" onClick={() => jumpTo(nextRef)}><BosseFinanceIcon name="trend" size={19}/> Próximos pasos <BosseFinanceIcon name="chevronRight" size={17}/></button>
          </div>
          <div className="bbi-focus-reconciliation"><BosseFinanceIcon name="info" size={15}/>{negocioNombre} · {periodStatus} · {reconciled ? 'Desglose conciliado' : 'Conciliación por verificar'}</div>
        </>}
      </aside>
    </div>
    <details className="bbi-tools-details" ref={toolsDetailsRef}>
      <summary className="bbi-tools-intro"><div><span className="bbi-eyebrow">EXPLORACIÓN CON EVIDENCIA</span><h3>Profundiza en tus resultados</h3><p>Diagnósticos, escenarios, movimientos y recomendaciones: disponibles cuando los necesites.</p></div><span className="bbi-tools-summary-action"><BosseFinanceIcon name="layers" size={18}/> <span>Mostrar herramientas</span> <BosseFinanceIcon name="chevronRight" size={17}/></span></summary>
      <div className="bbi-tools-content">
    <div className="bbi-top-grid">
      <section className="bbi-panel bbi-diagnosis" ref={diagnosisRef} aria-labelledby="bbi-diagnosis-title">
        <header className="bbi-panel-header">
          <div><h3 id="bbi-diagnosis-title">Diagnóstico del periodo</h3><p>Hallazgos ordenados por prioridad, con evidencia y límites claros.</p></div>
          <span className="bbi-count">{findings.length} hallazgo{findings.length === 1 ? '' : 's'}</span>
        </header>
        <div className="bbi-finding-list">
          {findings.map((finding, index) => <article key={finding.id} className={`bbi-finding ${selected?.id === finding.id ? 'bbi-selected' : ''}`}>
            <span className="bbi-number">{String(index + 1).padStart(2, '0')}</span>
            <div className="bbi-finding-content">
              <div className="bbi-finding-heading"><h4>{finding.title}</h4><span className={`bbi-status ${badgeTone(finding.status)}`}>{finding.status}</span></div>
              <p>{hide ? 'La descripción cuantitativa está oculta por el modo Privacidad.' : finding.description}</p>
              <div className="bbi-finding-actions">
                <button type="button" className={selected?.id === finding.id ? 'bbi-button-main' : ''} aria-pressed={selected?.id === finding.id} onClick={() => chooseFinding(finding.id, true)}>
                  <BosseFinanceIcon name="eye" size={15}/> Ver evidencia{finding.evidence.length ? ` (${finding.evidence.length})` : ''}
                </button>
                <button type="button" onClick={() => openRecords(finding)} disabled={!finding.evidence.length || hide}>
                  Ver movimientos <BosseFinanceIcon name="chevronRight" size={15}/>
                </button>
              </div>
            </div>
          </article>)}
        </div>
      </section>

      <aside className="bbi-panel bbi-sources" aria-labelledby="bbi-sources-title">
        <header className="bbi-panel-header"><div><h3 id="bbi-sources-title">Fuentes y alcance</h3><p>De dónde vienen los datos y qué se puede concluir.</p></div></header>
        <div className="bbi-source"><BosseFinanceIcon name="database" size={24}/><div><strong>Origen de los datos</strong><p>Registros que Administración entrega a Análisis Financiero, autorizados para {negocioNombre}. Consulta de solo lectura.</p></div></div>
        <div className="bbi-source"><BosseFinanceIcon name="calendar" size={24}/><div><strong>Periodo financiero</strong><p>{dates} · Tijuana · cierre 05:00.</p><span className="bbi-source-label">Estado: {analisis?.periodo?.estado || 'No informado'}</span></div></div>
        <div className="bbi-source"><BosseFinanceIcon name="receipt" size={24}/><div><strong>Evidencia directa</strong><p>{balance.incomes.count} ingreso{balance.incomes.count === 1 ? '' : 's'} y {balance.expenses.count} egreso{balance.expenses.count === 1 ? '' : 's'} disponibles para comprobar folios y conceptos.</p></div></div>
        <div className={`bbi-reconciliation ${reconciled ? 'bbi-ok' : 'bbi-attention'}`} role="status">
          <BosseFinanceIcon name={reconciled ? 'check' : 'info'} size={18}/>
          <div><strong>{reconciled ? 'Desglose conciliado' : 'Conciliación por verificar'}</strong>
            <p>{reconciled ? 'Los movimientos disponibles coinciden con los totales oficiales del periodo.' : 'El detalle no coincide con los importes oficiales o estos no están disponibles; verifica el alcance antes de concluir.'}</p></div>
        </div>
        <div className="bbi-source"><BosseFinanceIcon name="shield" size={24}/><div><strong>Interpretación responsable</strong><p>«Hecho» es comprobable; «Hipótesis» requiere confirmación; «Falta información» no es una conclusión contable.</p></div></div>
        <div className="bbi-downloads"><button type="button" onClick={() => exportReport('pdf')} disabled={hide || !analisis}><BosseFinanceIcon name="pdf" size={16}/> PDF del diagnóstico</button><button type="button" onClick={() => exportReport('excel')} disabled={hide || !analisis}><BosseFinanceIcon name="excel" size={16}/> Excel del diagnóstico</button></div>
      </aside>
    </div>

    <div className="bbi-work-grid">
      <section className="bbi-panel bbi-scenario" ref={scenarioRef} aria-labelledby="bbi-scenario-title">
        <header className="bbi-panel-header"><div><h3 id="bbi-scenario-title" className="bbi-with-icon"><BosseFinanceIcon name="sliders" size={23}/> Escenarios</h3><p>Simula cambios de importes. No modifica registros.</p></div><span className="bbi-tag">SIMULACIÓN</span></header>
        {(!hasBaseline || !reconciled) && <p className="bbi-caution" role="status"><BosseFinanceIcon name="info" size={17}/> {(!hasBaseline ? 'La base financiera no permite una simulación fiable.' : 'El detalle y el total oficial difieren. Interpreta la simulación con precaución.')}</p>}
        <div className="bbi-sliders">
          {[
            {label:'Ventas', value:salesChange, setter:setSalesChange},
            {label:'Gastos operativos', value:operatingChange, setter:setOperatingChange},
            {label:'Nómina', value:payrollChange, setter:setPayrollChange}
          ].map(item => <label key={item.label} className="bbi-slider">
            <span className="bbi-slider-heading"><strong>Variación de {item.label.toLowerCase()}</strong><output>{item.value > 0 ? '+' : ''}{item.value}%</output></span>
            <input type="range" min="-20" max="20" step="1" value={item.value} onChange={e => item.setter(Number(e.target.value))} disabled={hide || !hasBaseline} aria-label={`Variación de ${item.label.toLowerCase()}`}/>
            <span className="bbi-slider-scale"><small>−20%</small><small>0%</small><small>+20%</small></span>
          </label>)}
        </div>
        <div className="bbi-scenario-result">
          <div><small>Ingresos simulados</small><strong>{hasBaseline ? visibleMoney(scenario.income, hide) : 'No calculable'}</strong></div>
          <div><small>Egresos simulados</small><strong>{hasBaseline ? visibleMoney(scenario.expense, hide) : 'No calculable'}</strong></div>
          <div className="bbi-scenario-gm"><small>GM simulado</small><strong>{hasBaseline ? visibleMoney(scenario.gm, hide) : 'No calculable'}</strong><span>{hasBaseline && !hide ? `${scenario.deltaGm >= 0 ? '+' : '−'}${money(Math.abs(scenario.deltaGm))} vs. GM oficial` : ' '}</span></div>
        </div>
        <div className="bbi-scenario-foot"><div><small>GPM simulado</small><strong>{hasBaseline && !hide && scenario.gpm != null ? percentage(scenario.gpm) : 'No disponible'}</strong>{hasBaseline && hasScenarioChange && !hide && scenario.deltaGpm != null && <span className="bbi-pp">{scenario.deltaGpm >= 0 ? '+' : ''}{scenario.deltaGpm.toFixed(2)} pp</span>}</div><button type="button" disabled={!hasScenarioChange} onClick={reset}>Restablecer</button></div>
        <button type="button" className="bbi-method-toggle" aria-expanded={showMethod} onClick={() => setShowMethod(value => !value)}><BosseFinanceIcon name="info" size={17}/> {showMethod ? 'Ocultar metodología' : '¿Cómo se calcula?'}</button>
        {showMethod && <p className="bbi-method">GM simulado = GM oficial + variación de ingresos − variación de gastos operativos − variación de nómina. GPM = GM simulado / ingresos simulados × 100. La nómina ya está incluida en los egresos: no se suma dos veces. No incluye impuestos, cambios de divisa, capacidad ni cambios de comportamiento. Es una sensibilidad aritmética, no una predicción.</p>}
      </section>

      <section className="bbi-panel bbi-evidence" ref={evidenceRef} aria-labelledby="bbi-evidence-title">
        <header className="bbi-panel-header bbi-evidence-heading"><div><h3 id="bbi-evidence-title" className="bbi-with-icon"><BosseFinanceIcon name="layers" size={23}/> Movimientos que sustentan el hallazgo</h3><p>{selected?.title} · {evidence.length} registro{evidence.length === 1 ? '' : 's'} vinculado{evidence.length === 1 ? '' : 's'}.</p></div>
          <button type="button" onClick={() => openRecords(selected)} disabled={!evidence.length || hide}>Ver todos en Explorar <BosseFinanceIcon name="chevronRight" size={15}/></button></header>
        {selected?.note && <div className="bbi-evidence-note"><BosseFinanceIcon name="info" size={16}/><span>{selected.note}</span></div>}
        {hide ? <p className="bbi-empty">Desactiva Privacidad para consultar los movimientos.</p> : !evidence.length ? <p className="bbi-empty">Este hallazgo se refiere al estado general del periodo y no tiene registros individuales vinculados. No se inventarán comprobantes.</p> : <>
          <div className="bbi-evidence-scroll"><table className="bbi-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto / folio</th><th>Proveedor</th><th className="bbi-amount">Importe</th><th aria-label="Ver movimiento"></th></tr></thead>
          <tbody>{visibleEvidence.map((row, index) => <tr key={row.key || `${row.type}-${row.id}-${index}`}><td>{shortDate(row.fecha)}</td><td><span className={`bbi-type ${row.type === 'Ingreso' ? 'bbi-income' : 'bbi-expense'}`}>{row.type}</span></td><td><strong>{row.concepto || 'Sin concepto'}</strong><small>{row.folio || `Registro ${row.id}`}</small></td><td>{row.proveedor || 'Sin dato'}</td><td className="bbi-amount">{money(row.monto)}</td><td><button type="button" onClick={() => onOpenRecord?.(row)} aria-label={`Abrir movimiento ${row.folio || row.id}`}><BosseFinanceIcon name="eye" size={17}/></button></td></tr>)}</tbody></table></div>
          <div className="bbi-evidence-footer"><span><BosseFinanceIcon name="layers" size={17}/> <strong>Total de estos movimientos:</strong> {money(evidenceTotal(evidence))}</span>
            {evidence.length > 4 && <button type="button" onClick={() => setShowAllEvidence(value => !value)}>{showAllEvidence ? 'Mostrar primeros cuatro' : `Ver ${evidence.length} movimientos`}</button>}
          </div>
        </>}
        <p className="bbi-evidence-help">Abre el movimiento para consultar los campos y el historial disponibles sin volver a Administración.</p>
      </section>
    </div>

    <section className="bbi-panel bbi-next" ref={nextRef} aria-labelledby="bbi-next-title"><header className="bbi-panel-header"><div><h3 id="bbi-next-title" className="bbi-with-icon"><BosseFinanceIcon name="chart" size={23}/> Impacto y próximos pasos</h3><p>Acciones verificables para dar seguimiento al hallazgo seleccionado.</p></div></header>
      <div className="bbi-next-grid"><div className="bbi-impact">
        <BosseFinanceIcon name="trend" size={30}/>
        <div><strong>{hasScenarioChange && hasBaseline ? 'Impacto del escenario seleccionado' : 'El análisis parte de datos comprobables'}</strong>
          <p>{hasScenarioChange && hasBaseline ? `El GM simulado sería ${visibleMoney(scenario.gm, hide)} (${hide || scenario.gpm == null ? 'GPM oculto' : `GPM ${percentage(scenario.gpm)}`}). Son supuestos, no un resultado contable.` : 'Selecciona un hallazgo, revisa su evidencia y utiliza los escenarios solo para explorar sensibilidad financiera.'}</p></div>
      </div><ol className="bbi-nextsteps">{steps.map((step, index) => <li key={step.id}><span className="bbi-step-number">{index + 1}</span><div><strong>{step.title}</strong><p>{step.description}</p></div><button type="button" onClick={() => step.action === 'charts' ? onGoCharts?.() : step.action === 'scenario' ? simulate() : chooseFinding(selected?.id, true)} disabled={step.action === 'evidence' && (!evidence.length || hide)}>{step.action === 'charts' ? 'Abrir Gráficas' : step.action === 'scenario' ? 'Simular' : 'Ver evidencia'} <BosseFinanceIcon name="chevronRight" size={14}/></button></li>)}</ol></div>
    </section>
      </div>
    </details>
  </div>;
}
