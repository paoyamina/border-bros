import React, {useEffect,useState} from 'react';
import {useBosseBorderBro} from './BosseBorderBroChat';
import {QUESTION_GROUPS} from './BosseBorderBroQuestions';
import './BosseBorderBroWorkspace.css';

export default function BosseBorderBroWorkspace({compact=false}) {
  const {session,messages,conversationId,conversationContext,conversations,
    refreshConversations,openConversation,saveContext,saveCurrentChat,deleteConversation,
    renameConversation,loading,privacy,setDraft,historyError}=useBosseBorderBro();
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState('preguntas');
  const [category,setCategory]=useState('todos');
  const [query,setQuery]=useState('');
  const [contextText,setContextText]=useState('');
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState('');
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [renameId,setRenameId]=useState(null);
  const [renameText,setRenameText]=useState('');
  const [titleFilter,setTitleFilter]=useState('');
  useEffect(()=>{if(open&&!privacy){setContextText(conversationContext||'');setNotice('');refreshConversations();}},[open,privacy,refreshConversations]);
  useEffect(()=>{if(!open)return;const onKey=e=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[open]);
  useEffect(()=>{if(open)setContextText(conversationContext||'')},[conversationContext,open]);
  const ask=text=>{setDraft(text);setOpen(false);};
  const doSaveContext=async()=>{
    setSaving(true);setNotice('');
    try{await saveContext(contextText);setNotice('Información guardada para esta conversación. BorderBro la distinguirá de los datos oficiales.');}
    catch(e){setNotice(e.message||'No se pudo guardar el contexto.');}
    finally{setSaving(false);}
  };
  const doAction=async fn=>{setSaving(true);setNotice('');try{await fn();}catch(e){setNotice(e.message||'No se pudo realizar esta acción.');}finally{setSaving(false);}};
  const groups=QUESTION_GROUPS.filter(g=>category==='todos'||g.id===category);
  const hasLocal=messages.some(m=>!m.greeting);
  return <>
    <button type="button" className="bbai-workspace-trigger" onClick={()=>{setTab('preguntas');setOpen(true)}} disabled={!session.enabled} aria-label="Abrir preguntas, información adicional e historial de BorderBro">
      {compact?'Preguntas e historial':'Explorar preguntas · Historial'}
    </button>
    {open && <div className="bbai-workspace-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <section className="bbai-workspace-dialog" role="dialog" aria-modal="true" aria-label="Herramientas de BorderBro">
        <header className="bbai-workspace-heading"><div><small>BOSSE · BORDERBRO</small><h2>Tu espacio de análisis</h2><p>Haz mejores preguntas y conserva lo que vas investigando.</p></div><button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar">×</button></header>
        <nav aria-label="Opciones de BorderBro" className="bbai-workspace-tabs">
          {[['preguntas','Explorar preguntas'],['contexto','Dar más contexto'],['historial','Mis conversaciones']].map(([id,label])=><button type="button" key={id} aria-current={tab===id?'page':undefined} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}
        </nav>
        {privacy&&<p className="bbai-workspace-warning">Modo Privacidad activado. Las conversaciones y cifras no se muestran ni se guardan hasta desactivarlo.</p>}
        <div className="bbai-workspace-content">
        {tab==='preguntas'&&<>
          <p className="bbai-workspace-lead">Estas preguntas se agregan al cuadro de escritura para que puedas editarlas antes de enviarlas.</p>
          <input type="search" placeholder="Buscar temas, por ejemplo: marketing, ventas, nómina…" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Buscar preguntas sugeridas"/>
          <div className="bbai-workspace-categories"><button className={category==='todos'?'active':''} type="button" onClick={()=>setCategory('todos')}>Todas</button>{QUESTION_GROUPS.map(g=><button className={category===g.id?'active':''} key={g.id} type="button" onClick={()=>setCategory(g.id)}>{g.title}</button>)}</div>
          <div className="bbai-workspace-prompt-list">{groups.map(g=>{const items=g.prompts.filter(([label,q])=>(label+' '+q).toLowerCase().includes(query.toLowerCase()));return !!items.length&&<section key={g.id}><h3>{g.title}</h3>{items.map(([label,q])=><button type="button" key={label} onClick={()=>ask(q)}><strong>{label}</strong><span>{q}</span><b aria-hidden="true">↗</b></button>)}</section>})}</div>
        </>}
        {tab==='contexto'&&!privacy&&<>
          <p className="bbai-workspace-lead">¿Cómo funciona BOSSE en la práctica? Puedes compartir metas, aforo, eventos, público, campañas y límites de presupuesto. <strong>Son datos aportados por ti, no registros contables verificados.</strong></p>
          <div className="bbai-workspace-context-tips">{['Objetivo de ventas','Aforo y días de apertura','Eventos próximos','Clientes y canales','Presupuesto de marketing','Costos y restricciones'].map(t=><button key={t} type="button" onClick={()=>setContextText(x=>(x?x+'\n':'')+t+': ')}>{t} +</button>)}</div>
          <label htmlFor="bbai-business-context">Información adicional para esta conversación</label>
          <textarea id="bbai-business-context" rows={10} maxLength={4000} value={contextText} onChange={e=>setContextText(e.target.value)} placeholder={'Ejemplo:\nAforo máximo: 350 personas\nAbrimos viernes y sábados\nMeta: aumentar ventas entre semana\nPresupuesto de prueba: $15,000 MXN\nEventos: ...'} disabled={saving||privacy}/>
          <div className="bbai-workspace-context-footer"><span>{contextText.length}/4000 caracteres · Solo visible para tu usuario y negocio</span><button type="button" disabled={saving||privacy} onClick={doSaveContext}>{saving?'Guardando…':'Guardar contexto'}</button></div>
          <p className="bbai-workspace-hint">Esta ficha queda asociada al chat actual. No modifica ventas, gastos ni la ficha general del negocio. Puedes corregirla o borrarla después.</p>
        </>}
        {tab==='historial'&&!privacy&&<>
          <p className="bbai-workspace-lead">Tus conversaciones se guardan en BOSSE por usuario y negocio. Otros usuarios no podrán abrirlas desde su sesión.</p>
          <div className="bbai-workspace-history-actions"><input type="search" value={titleFilter} onChange={e=>setTitleFilter(e.target.value)} placeholder="Buscar por título…" aria-label="Buscar conversaciones"/><button type="button" onClick={refreshConversations}>Actualizar</button></div>
          {!conversationId&&hasLocal&&<button type="button" className="bbai-workspace-import" disabled={saving||privacy} onClick={()=>doAction(saveCurrentChat)}>Guardar esta conversación abierta en el historial</button>}
          <div className="bbai-workspace-history-list">
            {!conversations.length&&<p>No hay conversaciones guardadas todavía. Al enviar nuevas preguntas se guardarán automáticamente.</p>}
            {conversations.filter(c=>c.titulo.toLowerCase().includes(titleFilter.toLowerCase())).map(c=><article key={c.id} className={c.id===conversationId?'selected':''}>
              <div><strong>{c.titulo}</strong><small>{new Date(c.actualizada_en).toLocaleString('es-MX')} · {c.tiene_mensajes?'Con mensajes':'Sin mensajes'}</small></div>
              <div className="bbai-workspace-history-buttons">
                <button type="button" disabled={saving||privacy} onClick={()=>doAction(async()=>{await openConversation(c.id);setOpen(false);})}>Abrir</button>
                <button type="button" disabled={saving} onClick={()=>{setRenameId(renameId===c.id?null:c.id);setRenameText(c.titulo)}}>Renombrar</button>
                {confirmDelete===c.id?<button className="danger" type="button" disabled={saving} onClick={()=>doAction(async()=>{await deleteConversation(c.id);setConfirmDelete(null)})}>Confirmar eliminación</button>:<button type="button" disabled={saving} onClick={()=>setConfirmDelete(c.id)}>Eliminar</button>}
                {confirmDelete===c.id&&<button type="button" onClick={()=>setConfirmDelete(null)}>Cancelar</button>}
              </div>
              {renameId===c.id&&<form onSubmit={e=>{e.preventDefault();doAction(async()=>{await renameConversation(c.id,renameText);setRenameId(null);})}}><input type="text" maxLength={140} value={renameText} onChange={e=>setRenameText(e.target.value)} aria-label="Nuevo título"/><button type="submit">Guardar nombre</button></form>}
            </article>)}
          </div>
        </>}
        {!privacy&&(notice||historyError)&&<p className="bbai-workspace-notice" role="status">{notice||historyError}</p>}
        </div>
      </section>
    </div>}
  </>;
}
