import BorderBroConocimiento from './BorderBroConocimiento';
import { apiFetch } from '../config/api';
import React,{useCallback,useEffect,useState} from 'react';
import API_BASE_URL from '../config/api';
import './ProveedorCatalogo.css';
const apiHeaders=()=>({'Content-Type':'application/json',Authorization:`Bearer ${sessionStorage.getItem('bosse_catalog_token')||''}`});
async function api(url,method='GET',body){const r=await apiFetch(`${API_BASE_URL}${url}`,{method,headers:apiHeaders(),...(body?{body:JSON.stringify(body)}:{})});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.error||'No se pudo completar la operación.');return j;}
export default function ProveedorCatalogo({negocioId,onVolver}){
  const [tab,setTab]=useState('solicitudes');const [requests,setRequests]=useState([]),[providers,setProviders]=useState([]),[categories,setCategories]=useState([]);
  const [links,setLinks]=useState({});
  const [memoria,setMemoria]=useState([]);
  const [memoriaForm,setMemoriaForm]=useState({proveedor_id:'',categoria_id:'',concepto:'',prioridad:3});
  const [search,setSearch]=useState(''),[newName,setNewName]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false);
  const load=useCallback(async()=>{setLoading(true);try{const [r,p,c,m]=await Promise.all([
    api(`/api/proveedores/solicitudes?negocio_id=${negocioId}`),api(`/api/proveedores/catalogo?negocio_id=${negocioId}`),
    api(`/api/categorias?negocio_id=${negocioId}`),api(`/api/proveedores/memoria/catalogo?negocio_id=${negocioId}`)]);
    setRequests(r.solicitudes||[]);setProviders(p.proveedores||[]);setCategories(c.categorias||[]);setMemoria(m.combinaciones||[]);setNotice('');}catch(e){setNotice(e.message);}finally{setLoading(false);}},[negocioId]);
  useEffect(()=>{load();},[load]);
  const operate=async(fn)=>{try{setLoading(true);await fn();await load();}catch(e){setNotice(e.message);}finally{setLoading(false);}};
  const approve=(r,decision)=>operate(async()=>{
    let proveedor_id=Number(links[r.id])||null;
    if(decision==='APROBADO'){
      const exact=providers.find(p=>p.nombre.trim().toLocaleLowerCase('es')===r.nombre_solicitado.trim().toLocaleLowerCase('es'));
      if(exact&&!proveedor_id)proveedor_id=exact.id;
      if(!window.confirm(`¿Aprobar “${r.nombre_solicitado}”${proveedor_id?' vinculándolo al proveedor seleccionado del catálogo':' como proveedor nuevo'}?`))return;
    }else if(!window.confirm(`¿Rechazar “${r.nombre_solicitado}”?`))return;
    await api(`/api/proveedores/solicitudes/${r.id}/resolver`,'POST',{negocio_id:negocioId,decision,proveedor_id});
  });
  const editProvider=(p)=>{const nombre=window.prompt('Nombre del proveedor (se conservará el historial de movimientos):',p.nombre);if(!nombre||nombre.trim()===p.nombre)return;operate(()=>api(`/api/proveedores/catalogo/${p.id}`,'PATCH',{negocio_id:negocioId,nombre:nombre.trim(),activo:p.activo!==false}));};
  const toggleProvider=p=>{if(!window.confirm(`${p.activo===false?'Activar':'Desactivar'} ${p.nombre}?`))return;operate(()=>api(`/api/proveedores/catalogo/${p.id}`,'PATCH',{negocio_id:negocioId,nombre:p.nombre,activo:p.activo===false}));};
  const editCategory=c=>{const name=window.prompt('Nuevo nombre de la categoría:',c.nombre);if(!name||name.trim()===c.nombre)return;operate(()=>api(`/api/categorias/catalogo/${c.id}`,'PATCH',{negocio_id:negocioId,nombre:name.trim()}));};
  const createCategory=()=>{if(!newName.trim())return;operate(async()=>{await api('/api/categorias/catalogo','POST',{nombre:newName.trim(),negocio_id:negocioId});setNewName('');});};
  const guardarMemoria=()=>operate(async()=>{
    if(!memoriaForm.proveedor_id||!memoriaForm.categoria_id||!memoriaForm.concepto.trim())throw new Error('Selecciona proveedor, categoría y concepto.');
    await api('/api/proveedores/memoria','POST',{...memoriaForm,negocio_id:negocioId});
    setMemoriaForm(p=>({...p,concepto:''}));
  });
  const actualizarMemoria=(item)=>operate(()=>api(`/api/proveedores/memoria/${item.id}`,'PATCH',{negocio_id:negocioId,activo:!item.activo}));
  const unificarProveedor=async(origen)=>{
    const disponible=providers.filter(p=>p.id!==origen.id&&p.activo!==false);
    if(!disponible.length){setNotice('No hay otro proveedor activo para unificar.');return;}
    const list=disponible.slice(0,20).map(p=>`${p.id}: ${p.nombre}`).join('\n');
    const chosen=window.prompt(`Unificar «${origen.nombre}» con otro proveedor del negocio.\nEscribe el ID del proveedor correcto:\n${list}`);
    if(!chosen)return;
    const destino_id=Number(chosen);
    try{
      const preview=await api(`/api/proveedores/catalogo/${origen.id}/fusion-preview?negocio_id=${negocioId}&destino_id=${destino_id}`);
      const confirma=window.prompt(`Esta operación moverá ${preview.egresos_afectados} egresos de «${preview.origen.nombre}» a «${preview.destino.nombre}», preservando auditoría y desactivando el duplicado.\n\nEscribe UNIFICAR para confirmar:`);
      if(confirma!=='UNIFICAR')return;
      await operate(()=>api(`/api/proveedores/catalogo/${origen.id}/fusionar`,'POST',{negocio_id:negocioId,destino_id,confirmacion:'UNIFICAR'}));
    }catch(e){setNotice(e.message);}
  };
  const filtered=providers.filter(p=>p.nombre.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  return <main className="bosse-catalog"><button type="button" className="bosse-catalog-back" onClick={onVolver}>← Administración</button><span className="bosse-catalog-overline">BOSSE / ADMINISTRACIÓN</span><h1>Catálogos y autorizaciones</h1><p>Los cajeros buscan y reutilizan proveedores. Las altas nuevas se revisan aquí para prevenir duplicados.</p><div className="bosse-catalog-tabs">{[['solicitudes','Solicitudes'],['proveedores','Proveedores'],['categorias','Categorías'],['memoria','Memoria aprobada'],['conocimiento','BorderBro']].map(([id,n])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{n}{id==='solicitudes'&&<small>{requests.filter(x=>x.estatus==='PENDIENTE').length}</small>}</button>)}</div>
    {notice&&<p role="alert" className="bosse-catalog-error">{notice}</p>}
    {tab==='solicitudes'&&<section><h2>Solicitudes de alta</h2>{requests.filter(r=>r.estatus==='PENDIENTE').map(r=><article className="bosse-catalog-row" key={r.id}><div><strong>{r.nombre_solicitado}</strong><small>Solicitante #{r.solicitante_id} · {new Date(r.creada_en).toLocaleDateString('es-MX')}</small><label className="bosse-provider-link">Reutilizar un proveedor del catálogo<select value={links[r.id]||''} onChange={e=>setLinks({...links,[r.id]:e.target.value})}><option value="">Crear nuevo al aprobar</option>{providers.filter(p=>p.activo!==false).map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label><small>Compara nombres antes de crear. Vincular evita otro proveedor y conserva la solicitud.</small></div><div className="bosse-catalog-actions"><button disabled={loading} onClick={()=>approve(r,'APROBADO')}>Aprobar</button><button disabled={loading} onClick={()=>approve(r,'RECHAZADO')}>Rechazar</button></div></article>)}{!requests.some(r=>r.estatus==='PENDIENTE')&&<p>No hay solicitudes pendientes.</p>}<h3>Historial reciente</h3>{requests.filter(r=>r.estatus!=='PENDIENTE').slice(0,10).map(r=><div className="bosse-catalog-row" key={r.id}>{r.nombre_solicitado} — {r.estatus}</div>)}</section>}
    {tab==='proveedores'&&<section><h2>Proveedores del negocio</h2><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar proveedor…" aria-label="Buscar proveedor"/>{filtered.map(p=><article className="bosse-catalog-row" key={p.id}><div><strong>{p.nombre}</strong><small>{p.activo===false?'Inactivo':'Activo'} · ID {p.id}</small></div><div className="bosse-catalog-actions"><button onClick={()=>editProvider(p)}>Editar</button><button onClick={()=>toggleProvider(p)}>{p.activo===false?'Activar':'Desactivar'}</button><button disabled={loading||p.activo===false} onClick={()=>unificarProveedor(p)}>Unificar con…</button></div></article>)}</section>}
    {tab==='memoria'&&<section><h2>Combinaciones autorizadas</h2><p style={{fontSize:12,color:'#707774'}}>Sólo gobernador o contador pueden aprobar sugerencias. No se aprende de capturas sin revisar.</p>
      <div className="bosse-catalog-create" style={{marginBottom:18}}>
        <select aria-label="Proveedor" value={memoriaForm.proveedor_id} onChange={e=>setMemoriaForm(p=>({...p,proveedor_id:e.target.value}))}>
          <option value="">Selecciona proveedor</option>{providers.filter(p=>p.activo!==false).map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select aria-label="Categoría" value={memoriaForm.categoria_id} onChange={e=>setMemoriaForm(p=>({...p,categoria_id:e.target.value}))}>
          <option value="">Selecciona categoría</option>{categories.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input aria-label="Concepto habitual" placeholder="Concepto habitual validado" maxLength={250} value={memoriaForm.concepto} onChange={e=>setMemoriaForm(p=>({...p,concepto:e.target.value}))}/>
        <select aria-label="Prioridad" value={memoriaForm.prioridad} onChange={e=>setMemoriaForm(p=>({...p,prioridad:Number(e.target.value)}))}>
          <option value={1}>Normal</option><option value={3}>Frecuente</option><option value={5}>Predeterminada</option>
        </select>
        <button type="button" disabled={loading} onClick={guardarMemoria}>Aprobar combinación</button>
      </div>
      {memoria.map(m=><article className="bosse-catalog-row" key={m.id}><div><strong>{m.proveedor}</strong><small>{m.categoria} · {m.concepto} · Prioridad {m.prioridad} · {m.activo?'Activa':'Retirada'}</small></div><button onClick={()=>actualizarMemoria(m)} disabled={loading}>{m.activo?'Retirar sugerencia':'Reactivar'}</button></article>)}
      {!memoria.length&&<p>Aún no hay combinaciones autorizadas.</p>}
    </section>}
    {tab==='conocimiento'&&<BorderBroConocimiento negocioId={negocioId}/>}
    {tab==='categorias'&&<section><h2>Categorías de egresos</h2><div className="bosse-catalog-create"><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nueva categoría"/><button onClick={createCategory} disabled={loading||!newName.trim()}>Crear categoría</button></div>{categories.map(c=><article className="bosse-catalog-row" key={c.id}><strong>{c.nombre}</strong><button onClick={()=>editCategory(c)}>Editar nombre</button></article>)}</section>}
    <p className="bosse-catalog-foot">Los cambios de catálogo no modifican automáticamente importes, fechas ni cálculos financieros.</p>
  </main>;
}
