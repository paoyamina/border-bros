import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import API_BASE_URL, { apiFetch } from '../config/api';
import { financialDate } from '../utils/financialDate';
import './BosseBorderBroChat.css';
import BosseFinanceIcon from './BosseFinanceIcon';
import BosseBorderBroMarkdown from './BosseBorderBroMarkdown';
import BosseBorderBroWorkspace from './BosseBorderBroWorkspace';
import { splitEvidence, sourceTitle, sourcePeriod, sourceSummary, individualMovements, movementLabel, exportConversation, conversationEntries } from './BosseBorderBroTranscript';

const BorderBroContext = createContext(null);
const BorderBroActionsContext = createContext(null);
const ALLOWED_ROLES = new Set(['socio', 'contador', 'gobernador', 'administrador']);
const defaultPeriod = () => {
  const end = financialDate();
  return { start: `${end.slice(0, 7)}-01`, end };
};
const initialMessages = () => [{
  rol: 'assistant',
  texto: 'Hola. Soy BorderBro, el asistente financiero de BOSSE. Puedes preguntarme por ingresos, egresos, cortes, nómina o movimientos concretos.',
  evidencia: [], greeting: true
}];
const QUESTIONS = [
  '¿Qué debería revisar en mis cortes de caja?',
  'Explícame el GM y el GPM de este periodo.',
  '¿Qué cambió respecto al periodo anterior?',
  '¿Cuáles son mis principales categorías de egresos?'
];
// Títulos breves, pero cada opción conserva la pregunta completa para el chat.
const DRAWER_PROMPTS = [
  { label: 'Revisar cortes', question: QUESTIONS[0] },
  { label: 'GM y GPM', question: QUESTIONS[1] },
  { label: 'Comparar periodos', question: QUESTIONS[2] },
  { label: 'Categorías de gasto', question: QUESTIONS[3] }
];
const isISODate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

export function BosseBorderBroProvider({ children }) {
  const [session, setSession] = useState({ key: '', enabled: false, inBorderBro: false, businessId: null, businessName: 'BOSSE', view: 'Administración' });
  const [period, setPeriodState] = useState(defaultPeriod);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversationContext, setConversationContext] = useState('');
  const [conversations, setConversations] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const request = useRef(null);
  const busy = useRef(false);
  const identityKey = useRef('');

  // Una identidad y negocio equivalen a una conversación. Navegar entre pantallas NO la reinicia.
  const syncApp = useCallback(({ loggedIn, businessSelected, userId, businessId, businessName, role, inBorderBro, view }) => {
    const authorized = ALLOWED_ROLES.has(String(role || '').toLowerCase().trim());
    const enabled = !!(loggedIn && businessSelected && userId && businessId && authorized);
    const key = enabled ? `${userId}:${businessId}` : '';
    setSession(previous => previous.key === key && previous.inBorderBro === !!inBorderBro && previous.businessName === businessName && previous.view === view
      ? previous : { key, enabled, inBorderBro: !!inBorderBro, businessId: enabled ? businessId : null, businessName: businessName || 'BOSSE', view: view || 'Administración' });
  }, []);

  useEffect(() => {
    if (identityKey.current !== session.key) {
      identityKey.current = session.key;
      request.current?.abort();
      request.current = null;
      busy.current = false;
      setLoading(false);
      setMessages(initialMessages());
      setDraft('');
      setError('');
      setPeriodState(defaultPeriod());
      setPrivacy(false);
      setOpen(false);
      setConversationId(null);
      setConversationContext('');
      setConversations([]);
      setHistoryError('');
    }
  }, [session.key]);

  useEffect(() => {
    // La conversación está integrada en su propia pantalla: no se duplica en un modal.
    if (session.inBorderBro) setOpen(false);
  }, [session.inBorderBro]);

  useEffect(() => () => { request.current?.abort(); }, []);

  const setPeriod = useCallback((start, end) => {
    if (!isISODate(start) || !isISODate(end) || start > end) return;
    setPeriodState(previous => previous.start === start && previous.end === end ? previous : { start, end });
  }, []);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);
  const historyEndpoint = `${API_BASE_URL}/api/borderbro/conversaciones`;
  const requireResponse = async (response) => {
    const data = await response.json().catch(() => null);
    if(!response.ok || !data?.success) throw new Error(data?.error || `Error de historial (${response.status})`);
    return data;
  };
  const refreshConversations = useCallback(async () => {
    if(!session.enabled) return;
    try {
      const result=await requireResponse(await apiFetch(historyEndpoint));
      setConversations(result.conversaciones || []);
      setHistoryError('');
    } catch(e) {setHistoryError(e.message || 'No se pudo cargar el historial.');}
  }, [session.key,session.enabled,historyEndpoint]);
  const openConversation = useCallback(async id => {
    if(privacy) throw new Error('Desactiva Privacidad para abrir una conversación.');
    if(loading) throw new Error('Espera a que BorderBro termine de responder.');
    const result=await requireResponse(await apiFetch(`${historyEndpoint}/${encodeURIComponent(id)}`));
    setConversationId(result.conversacion.id);
    setConversationContext(result.conversacion.contexto_adicional||'');
    setMessages(initialMessages().concat((result.mensajes||[]).map(row=>({
      rol:row.rol, texto:row.texto, evidencia:Array.isArray(row.evidencia)?row.evidencia:[],
      periodKey:row.fecha_inicio&&row.fecha_fin?`${row.fecha_inicio}:${row.fecha_fin}`:undefined
    }))));
    setError('');setDraft('');
  }, [privacy,loading,historyEndpoint]);
  const saveContext=useCallback(async value => {
    if(privacy) throw new Error('Desactiva Privacidad antes de guardar información adicional.');
    const text=String(value||'').trim();
    let activeId=conversationId;
    // Al añadir contexto a una conversación antigua, guardamos también sus mensajes.
    if(!activeId&&messages.some(m=>!m.greeting)){
      const imported=await requireResponse(await apiFetch(`${historyEndpoint}/importar`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mensajes:messages.filter(m=>!m.greeting).slice(-80).map(m=>({
          rol:m.rol,texto:m.texto,evidencia:m.evidencia||[],
          fecha_inicio:m.periodKey?.split(':')[0]||null,
          fecha_fin:m.periodKey?.split(':')[1]||null
        }))})
      }));
      activeId=imported.conversacion.id;
    }
    const url=activeId?`${historyEndpoint}/${activeId}`:historyEndpoint;
    const result=await requireResponse(await apiFetch(url,{
      method:activeId?'PATCH':'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contexto_adicional:text})
    }));
    setConversationId(result.conversacion.id);
    setConversationContext(result.conversacion.contexto_adicional||'');
    await refreshConversations();
  }, [conversationId,historyEndpoint,privacy,refreshConversations,messages]);
  const saveCurrentChat=useCallback(async()=>{
    if(privacy) throw new Error('Desactiva Privacidad antes de guardar.');
    if(conversationId)return;
    const current=messages.filter(m=>!m.greeting).map(m=>({
      rol:m.rol,texto:m.texto, evidencia:m.evidencia||[],
      fecha_inicio:m.periodKey?.split(':')[0]||null,fecha_fin:m.periodKey?.split(':')[1]||null
    }));
    if(!current.length)throw new Error('Todavía no hay mensajes para guardar.');
    const result=await requireResponse(await apiFetch(`${historyEndpoint}/importar`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({titulo:current.find(m=>m.rol==='user')?.texto.slice(0,120)||'Conversación actual',mensajes:current})
    }));
    setConversationId(result.conversacion.id);
    await refreshConversations();
    return result.conversacion.id;
  }, [conversationId,historyEndpoint,messages,privacy,refreshConversations]);
  const renameConversation=useCallback(async(id,title)=>{
    await requireResponse(await apiFetch(`${historyEndpoint}/${id}`,{method:'PATCH',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({titulo:title})}));
    await refreshConversations();
  },[historyEndpoint,refreshConversations]);
  const deleteConversation=useCallback(async id=>{
    await requireResponse(await apiFetch(`${historyEndpoint}/${id}`,{method:'DELETE'}));
    if(conversationId===id){setConversationId(null);setConversationContext('');setMessages(initialMessages());}
    await refreshConversations();
  },[conversationId,historyEndpoint,refreshConversations]);

  const newChat = useCallback(() => {
    request.current?.abort();
    request.current = null;
    busy.current = false;
    setLoading(false);
    setError('');
    setDraft('');
    setMessages(initialMessages());
    setConversationId(null);
    setConversationContext('');
  }, []);

  const send = useCallback(async (question) => {
    const text = String(question ?? draft).trim();
    if (!text || busy.current || !session.enabled || !session.businessId || privacy) return;
    busy.current = true;
    setLoading(true);
    setError('');
    setDraft('');
    const periodKey = `${period.start}:${period.end}`;
    // Mantener el historial estructurado de la versión actual de BOSSE.
    // El backend distingue cada mensaje y los periodos no se mezclan con la pregunta actual.
    const previousConversation = messages.filter(m => !m.greeting && (m.rol === 'user' || m.rol === 'assistant'))
      .slice(-8).map(m => ({ rol: m.rol,
        texto: `[Periodo ${m.periodKey || 'sin especificar'}] ${String(m.texto || '').slice(0, 1750)}` }));
    const payloadText = text;
    setMessages(old => [...old, { rol: 'user', texto: text, evidencia: [], periodKey }]);
    const controller = new AbortController();
    request.current = controller;
    try {
      let activeId=conversationId;
      // Rescata los turnos de la sesión anterior a la activación del historial.
      if(!activeId && previousConversation.length){
        const already=await requireResponse(await apiFetch(`${historyEndpoint}/importar`,{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({mensajes:messages.filter(m=>!m.greeting).slice(-80).map(m=>({
            rol:m.rol,texto:m.texto,evidencia:m.evidencia||[],
            fecha_inicio:m.periodKey?.split(':')[0]||null,
            fecha_fin:m.periodKey?.split(':')[1]||null
          }))})
        }));
        activeId=already.conversacion.id;setConversationId(activeId);
      }
      const response = await apiFetch(`${API_BASE_URL}/api/borderbro/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: payloadText, historial:previousConversation, modulo_actual:session.view || 'Administración', conversacion_id:activeId, negocio_id: Number(session.businessId), fecha_inicio: period.start, fecha_fin: period.end }),
        signal: controller.signal
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        const fallback = response.status === 401 ? 'La sesión venció. Vuelve a iniciar sesión.'
          : response.status === 403 ? 'Tu usuario no tiene acceso a este negocio o a Análisis Financiero.'
          : response.status === 503 ? 'BorderBro no está configurado en el servidor.'
          : response.status === 429 ? 'Hay demasiadas consultas. Intenta de nuevo más tarde.'
          : 'BorderBro no pudo responder. Revisa la conexión con el servidor.';
        throw new Error(result?.error || fallback);
      }
      if (controller.signal.aborted) return;
      if(result.conversacion_id) setConversationId(result.conversacion_id);
      if(result.historial_guardado===false) setHistoryError('La respuesta llegó, pero no se pudo guardar en el historial. Puedes descargarla antes de salir.');
      else refreshConversations();
      setMessages(old => [...old, {
        rol: 'assistant', texto: result.respuesta || 'No recibí una respuesta textual.',
        evidencia: Array.isArray(result.evidencia) ? result.evidencia : [], periodKey
      }]);
    } catch (err) {
      if (err.name !== 'AbortError' && !controller.signal.aborted) {
        setError(err.message || 'No se pudo contactar a BorderBro.');
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        busy.current = false;
        setLoading(false);
      }
    }
  }, [draft, messages, session.enabled, session.businessId, session.view, period, privacy, conversationId, refreshConversations, historyEndpoint]);

  const value = useMemo(() => ({
    session, period, messages, draft, setDraft, loading, error, open, privacy,
    conversationId, conversationContext, conversations, historyError,
    refreshConversations, openConversation, saveContext, saveCurrentChat,
    renameConversation, deleteConversation,
    syncApp, setPeriod, setPrivacy, openChat, closeChat, newChat, send
  }), [session, period, messages, draft, loading, error, open, privacy,
    conversationId, conversationContext, conversations, historyError,
    refreshConversations, openConversation, saveContext, saveCurrentChat,
    renameConversation, deleteConversation,
    syncApp, setPeriod, openChat, closeChat, newChat, send]);

  const actions = useMemo(() => ({ syncApp, setPeriod, setPrivacy, setDraft }), [syncApp, setPeriod]);
  return <BorderBroActionsContext.Provider value={actions}>
    <BorderBroContext.Provider value={value}>{children}</BorderBroContext.Provider>
  </BorderBroActionsContext.Provider>;
}

export function useBosseBorderBroActions() {
  const actions = useContext(BorderBroActionsContext);
  if (!actions) throw new Error('Falta el proveedor compartido de BorderBro.');
  return actions;
}

export function useBosseBorderBro() {
  const context = useContext(BorderBroContext);
  if (!context) throw new Error('BorderBro debe estar dentro de su proveedor compartido.');
  return context;
}

const STARTER_ACTIONS = [
  { title: 'Analizar mis resultados', icon: 'chart', question: 'Analiza los resultados del periodo: ingresos, egresos y rentabilidad. Señala qué datos faltan.' },
  { title: 'Pronosticar mis ventas', icon: 'chart', question: 'Pronostica las ventas de las próximas cuatro semanas usando el historial verificable. Dame tres escenarios y sus limitaciones.' },
  { title: 'Mejorar mis ventas', icon: 'search', question: 'Investiga estrategias comerciales y propón un experimento de marketing de 30 días para BOSSE, con KPI y presupuesto estimado.' },
  { title: 'Darte más información', icon: 'database', question: 'Hazme hasta cinco preguntas concretas sobre mi negocio, mis metas, aforo, eventos y presupuesto para mejorar tus recomendaciones.' }
];

/** No confundir llamadas a herramientas con movimientos financieros. */
function MessageEvidence({ evidence }) {
  const { tools, records } = splitEvidence(evidence);
  return <div className="bbai-evidence-group">
    {tools.length > 0 && <details className="bbai-evidence">
      <summary>Ver fuentes consultadas ({tools.length})</summary>
      <div className="bbai-readable-sources">{tools.map((source, index) => <section className="bbai-readable-source" key={`${source.herramienta}-${index}`}>
        <strong>{index + 1}. {sourceTitle(source)}</strong>
        {sourcePeriod(source) && <span className="bbai-source-period">Periodo: {sourcePeriod(source)}</span>}
        <p>{sourceSummary(source)}</p>
        {individualMovements(source).length > 0 && <details className="bbai-source-movements">
          <summary>Ver movimientos identificados ({individualMovements(source).length})</summary>
          <ul>{individualMovements(source).slice(0, 20).map((movement, n) => <li key={n}>{movementLabel(movement)}</li>)}</ul>
          {individualMovements(source).length > 20 && <p>Se muestran los primeros 20. Consulta los demás en Explorar movimientos.</p>}
        </details>}
        <details className="bbai-source-technical"><summary>Mostrar datos técnicos</summary>
          <pre>{JSON.stringify(source.datos ?? null, null, 2)}</pre>
        </details>
      </section>)}</div>
      <p className="bbai-source-note">Las fuentes consultadas son herramientas de análisis, no necesariamente movimientos individuales.</p>
    </details>}
    {records.length > 0 && <details className="bbai-evidence"><summary>Ver otros registros de evidencia ({records.length})</summary>
      <pre>{JSON.stringify(records, null, 2)}</pre>
    </details>}
  </div>;
}

function ExportTranscript({ className = '', forcePrivacy = false }) {
  const { session, messages, loading, privacy } = useBosseBorderBro();
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState('');
  const available = !privacy && !forcePrivacy && !loading && conversationEntries(messages).length > 0;
  const menu = useRef(null);
  useEffect(() => {
    if (!expanded) return undefined;
    const handle = event => { if (menu.current && !menu.current.contains(event.target)) setExpanded(false); };
    const escape = event => { if (event.key === 'Escape') setExpanded(false); };
    document.addEventListener('pointerdown', handle);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', handle); document.removeEventListener('keydown', escape); };
  }, [expanded]);
  const download = type => {
    const ok = exportConversation(type, { businessName: session.businessName, messages });
    setExpanded(false);
    setNotice(ok ? '' : 'No se pudo abrir la vista de impresión. Permite ventanas emergentes para BOSSE.');
  };
  return <div className={`bbai-export-wrapper ${className}`} ref={menu}>
    <button type="button" className="bbai-export-trigger" aria-expanded={expanded} aria-haspopup="true"
      title={privacy ? 'Desactiva Privacidad para exportar la conversación' : 'Descargar preguntas, respuestas y fuentes'}
      disabled={!available} onClick={() => { setNotice(''); setExpanded(v => !v); }}>
      <BosseFinanceIcon name="file" size={16}/> Descargar conversación <span aria-hidden="true">⌄</span>
    </button>
    {expanded && <div className="bbai-export-menu" role="group" aria-label="Formatos de descarga">
      <button type="button" onClick={() => download('pdf')}>PDF <small>Abre vista para imprimir / guardar PDF</small></button>
      <button type="button" onClick={() => download('word')}>Word editable (.rtf) <small>Para trabajar en Word o LibreOffice</small></button>
      <button type="button" onClick={() => download('txt')}>Texto (.txt) <small>Para copiar o conservar el contenido</small></button>
      <p>Incluye preguntas, respuestas, periodos y fuentes consultadas. No incluye JSON técnico.</p>
    </div>}
    {notice && <span className="bbai-export-error" role="alert">{notice}</span>}
  </div>;
}

function ChatBody({ compact = false, copilot = false, suggestedQuestions = [], forcePrivacy = false }) {
  const { session, period, messages, draft, setDraft, loading, error, privacy, send, newChat } = useBosseBorderBro();
  const mask = privacy || forcePrivacy;
  const threadBox = useRef(null);
  const input = useRef(null);
  const [moreQuestionsOpen, setMoreQuestionsOpen] = useState(false);
  const drawerMode = !copilot && !compact;
  const realMessages = messages.filter(message => !message.greeting);
  const welcome = copilot && realMessages.length === 0;
  useEffect(() => {
    if (threadBox.current && !welcome) threadBox.current.scrollTop = threadBox.current.scrollHeight;
  }, [messages.length, loading, welcome]);
  const focusQuestion = question => {
    setDraft(question);
    input.current?.focus();
  };
  const handleSubmit = event => { event.preventDefault(); send(); };
  const examples = [...new Set([...suggestedQuestions, ...QUESTIONS])].slice(0, copilot ? 3 : compact ? 5 : 3);
  const shortSuggestion = question => question.length > 62 ? `${question.slice(0, 59).trim()}…` : question;
  return <>
    {copilot && welcome && !mask && <div className="bbai-focus-welcome">
      <div className="bbai-focus-emblem" aria-hidden="true"><BosseFinanceIcon name="sparkles" size={49}/></div>
      <h2>¿Qué quieres analizar hoy?</h2>
      <p>Pregúntame sobre tu negocio y consulta la evidencia de cada cifra.</p>
      <div className="bbai-starter-grid" aria-label="Comenzar una consulta">
        {STARTER_ACTIONS.map(action => <button type="button" key={action.title} onClick={() => focusQuestion(action.question)} disabled={loading}>
          <BosseFinanceIcon name={action.icon} size={23}/><span>{action.title}</span><BosseFinanceIcon name="chevronRight" size={17}/>
        </button>)}
      </div>
    </div>}
    {(!copilot || !welcome || mask) && <div className={`bbai-conversation ${compact ? 'bbai-conversation-compact' : ''} ${copilot ? 'bbai-conversation-focus' : ''}`} ref={threadBox} role="log" aria-live="polite" aria-label="Historial de BorderBro">
      {mask ? <div className="bbai-privacy-message">El modo Privacidad está activado. Desactívalo desde Análisis Financiero para mostrar o consultar cifras con BorderBro.</div>
        : (copilot ? realMessages : messages).map((message, index) => <article key={`${index}-${message.rol}`} className={`bbai-message ${message.rol === 'user' ? 'bbai-user' : 'bbai-assistant'}`}>
          {copilot && <span className="bbai-message-avatar" aria-hidden="true">{message.rol === 'user' ? 'T' : 'B'}</span>}
          <div className="bbai-message-content">
            <span className="bbai-author">{message.rol === 'user' ? 'Tú' : 'BorderBro'}</span>
            <div className="bbai-message-text">{message.rol === 'assistant' ? <BosseBorderBroMarkdown text={message.texto}/> : message.texto}</div>
            {message.periodKey && <small>Periodo consultado: {message.periodKey.replace(':', ' — ')}</small>}
            {Array.isArray(message.evidencia) && message.evidencia.length > 0 && <MessageEvidence evidence={message.evidencia}/> }
          </div>
        </article>)}
      {!mask && loading && <div className="bbai-thinking" role="status">BorderBro está analizando los registros…</div>}
      {!mask && error && <p className="bbai-error" role="alert">{error}</p>}
    </div>}
    {copilot && welcome && !mask && error && <p className="bbai-error" role="alert">{error}</p>}
    {!mask && (!copilot || !welcome) && (drawerMode
      ? <div className="bbai-drawer-suggestions" aria-label="Preguntas sugeridas">
        <div className="bbai-drawer-suggestions-main">
          {DRAWER_PROMPTS.slice(0, 2).map(item => <button className="bbai-drawer-suggestion" key={item.label} type="button" title={item.question} disabled={loading} onClick={() => focusQuestion(item.question)}>{item.label}</button>)}
          <button type="button" className="bbai-drawer-suggestions-more" aria-expanded={moreQuestionsOpen} aria-controls="bbai-drawer-more-prompts" onClick={() => setMoreQuestionsOpen(open => !open)}>{moreQuestionsOpen ? 'Ver menos' : 'Más preguntas'}</button>
        </div>
        {moreQuestionsOpen && <div id="bbai-drawer-more-prompts" className="bbai-drawer-suggestions-extra">
          {DRAWER_PROMPTS.slice(2).map(item => <button className="bbai-drawer-suggestion" key={item.label} type="button" title={item.question} disabled={loading} onClick={() => { focusQuestion(item.question); setMoreQuestionsOpen(false); }}>{item.label}</button>)}
        </div>}
      </div>
      : <div className={`bbai-questions ${copilot ? 'bbai-questions-focus' : ''}`} aria-label="Preguntas sugeridas">
        {examples.map(question => <button key={question} type="button" title={question} disabled={loading} onClick={() => focusQuestion(question)}>{copilot || !compact ? shortSuggestion(question) : question}</button>)}
      </div>)}
    <form className={`bbai-form ${copilot ? 'bbai-form-focus' : ''}`} onSubmit={handleSubmit}>
      <label className={copilot ? 'bbai-visually-hidden' : undefined} htmlFor={compact ? 'bbai-inline-input' : 'bbai-drawer-input'}>Pregunta sobre tu negocio</label>
      <div className="bbai-compose">
        <textarea id={compact ? 'bbai-inline-input' : 'bbai-drawer-input'} ref={input}
          value={draft} onChange={event => setDraft(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) { event.preventDefault(); send(); } }}
          placeholder={copilot ? 'Pregunta lo que quieras sobre tus finanzas…' : 'Ej. ¿Qué explica la diferencia del corte del 1 de noviembre?'}
          rows={copilot ? 1 : compact ? 2 : 3} maxLength={2500} disabled={loading || mask || !session.enabled}/>
        {copilot && <span className="bbai-compose-context"><BosseFinanceIcon name="sliders" size={15}/> {session.businessName} · Periodo seleccionado</span>}
        <button type="submit" className="bbai-send" aria-label="Enviar pregunta" disabled={loading || mask || !draft.trim() || !session.enabled}>
          <span className="bbai-send-label">{loading ? 'Consultando…' : 'Enviar'}</span><span aria-hidden="true">{copilot ? '➤' : '↑'}</span>
        </button>
      </div>
    </form>
    {copilot ? <p className="bbai-focus-disclaimer">Las respuestas se basan en datos autorizados de BOSSE y pueden requerir validación contable.</p>
      : drawerMode ? <div className="bbai-drawer-meta">
          <span title={`${session.businessName} · ${session.view} · ${period.start} — ${period.end}`}>{session.businessName} · {period.start} — {period.end} · Revisión contable recomendada</span>
          <button type="button" onClick={newChat} disabled={loading}>Nueva conversación</button>
        </div>
      : <><div className="bbai-footnote"><span>{session.businessName} · {session.view} · {period.start} — {period.end}</span><button type="button" onClick={newChat} disabled={loading}>Nueva conversación</button></div>
        <p className="bbai-caution">BorderBro utiliza los datos autorizados de BOSSE. Sus respuestas pueden requerir revisión del contador.</p></>}
  </>;
}

/** Visible primero en la página BorderBro. Comparte historial con la burbuja global. */
export function BosseBorderBroInline({ suggestedQuestions = [], forcePrivacy = false, copilot = false }) {
  const { session, newChat, loading, messages } = useBosseBorderBro();
  if (!session.enabled) return null;
  return <section id="bosse-borderbro-conversation" className={`bbai-inline ${copilot ? 'bbai-inline-copilot bbai-inline-focus' : ''}`} aria-label="Conversar con BorderBro">
    {copilot ? <div className="bbai-focus-toolbar">
      <div className="bbai-focus-identity"><span className="bbai-avatar" aria-hidden="true">B</span><strong>BorderBro</strong><span className="bbai-focus-online" aria-label="Asistente disponible"/></div>
      <div className="bbai-focus-toolbar-actions"><BosseBorderBroWorkspace/>{messages.some(message => !message.greeting) && <ExportTranscript forcePrivacy={forcePrivacy}/>}
      {messages.some(message => !message.greeting) && <button type="button" onClick={newChat} disabled={loading} className="bbai-focus-new"><BosseFinanceIcon name="file" size={17}/> Nueva conversación</button>}</div>
    </div> : <header className="bbai-panel-heading"><div className="bbai-avatar" aria-hidden="true">B</div><div>
      <span className="bbai-eyebrow">BOSSE · INTELIGENCIA FINANCIERA</span>
      <h2>Pregúntale a BorderBro</h2>
      <p>Primero pregunta. Después verifica las respuestas con los diagnósticos y movimientos de abajo.</p>
    </div><span className="bbai-status"><span aria-hidden="true" className="bbai-live-dot"/> Asistente</span></header>}
    <ChatBody compact copilot={copilot} suggestedQuestions={suggestedQuestions} forcePrivacy={forcePrivacy}/>
  </section>;
}

/** Un único chat accesible en Administración, formularios y Análisis Financiero. */
export function BosseBorderBroGlobal() {
  const { session, open, openChat, closeChat } = useBosseBorderBro();
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);
  useEffect(() => {
    if (!open || !session.enabled || session.inBorderBro) return undefined;
    previousFocus.current = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') { closeChat(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = [...dialogRef.current.querySelectorAll('button:not([disabled]),textarea:not([disabled]),a[href],input:not([disabled])')];
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (document.contains(previousFocus.current)) previousFocus.current?.focus();
    };
  }, [open, closeChat, session.enabled, session.inBorderBro]);
  if (!session.enabled || session.inBorderBro) return null;
  return <>
    {!open && <button className="bbai-launcher" type="button" onClick={openChat} aria-label="Hablar con BorderBro" title="Pregúntale a BorderBro">
      <span aria-hidden="true">B</span><i aria-hidden="true"/>
    </button>}
    {open && <div className="bbai-overlay">
      <button className="bbai-backdrop" type="button" onClick={closeChat} aria-label="Cerrar conversación"/>
      <section className="bbai-drawer" ref={dialogRef} role="dialog" aria-modal="true" aria-label="BorderBro, asistente de BOSSE">
        <header className="bbai-panel-heading"><div className="bbai-avatar" aria-hidden="true">B</div><div>
          <span className="bbai-eyebrow">BOSSE · ASISTENTE FINANCIERO</span>
          <h2>Pregúntale a BorderBro</h2>
          <p>Mismo historial en todo BOSSE</p>
        </div><button type="button" className="bbai-close" ref={closeRef} onClick={closeChat} aria-label="Cerrar chat">×</button></header>
        <div className="bbai-drawer-export"><BosseBorderBroWorkspace compact/>{<ExportTranscript/>}</div>
        <ChatBody/>
      </section>
    </div>}
  </>;
}
