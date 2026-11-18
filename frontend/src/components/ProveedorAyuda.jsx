import { apiFetch } from '../config/api';
import React, { useEffect, useRef, useState } from 'react';
import API_BASE_URL from '../config/api';
import './ProveedorCatalogo.css';

const headers = () => ({'Content-Type':'application/json',Authorization:`Bearer ${sessionStorage.getItem('bosse_catalog_token')||''}`});
const normalize = s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

/** El formulario original permanece igual: este asistente sólo añade validación y memoria aprobada. */
export default function ProveedorAyuda({nombre,negocioId,proveedores=[],solicitudId=null,onElegir=()=>{},onSolicitar=()=>{},onSugerir=()=>{},onMemoria=()=>{}}) {
  const [similares,setSimilares]=useState([]);
  const [memoria,setMemoria]=useState([]);
  const [estado,setEstado]=useState('');
  const [buscando,setBuscando]=useState(false);
  const callback=useRef(onSugerir);
  callback.current=onSugerir;
  const memoryCallback=useRef(onMemoria);
  memoryCallback.current=onMemoria;
  const exact=proveedores.find(p=>normalize(p.nombre)===normalize(nombre));

  useEffect(()=>{
    const q=String(nombre||'').trim();
    setEstado('');setMemoria([]);setSimilares([]);memoryCallback.current([]);
    if(q.length<2)return undefined;
    let active=true;
    const task=setTimeout(async()=>{
      setBuscando(true);
      try{
        if(exact){
          const response=await apiFetch(`${API_BASE_URL}/api/proveedores/memoria?negocio_id=${negocioId}&proveedor_id=${exact.id}`,{headers:headers()});
          const data=await response.json();
          if(!response.ok)throw new Error(data.error||'No se pudieron consultar las combinaciones.');
          if(active){
            const combos=data.combinaciones||[];
            setMemoria(combos);
            memoryCallback.current(combos);
            if(combos.length===1)callback.current(combos[0],true);
          }
        }else{
          const response=await apiFetch(`${API_BASE_URL}/api/proveedores/sugerencias?negocio_id=${negocioId}&nombre=${encodeURIComponent(q)}`,{headers:headers()});
          const data=await response.json();
          if(!response.ok)throw new Error(data.error||'No se pudo consultar el catálogo.');
          if(active)setSimilares(data.similares||[]);
        }
      }catch(e){if(active)setEstado(e.message||'No se pudo comprobar el proveedor.');}
      finally{if(active)setBuscando(false);}
    },280);
    return ()=>{active=false;clearTimeout(task);};
  },[nombre,negocioId,exact?.id]);

  const solicitar=async()=>{
    if(exact||!nombre?.trim())return;
    setBuscando(true);
    try{
      const response=await apiFetch(`${API_BASE_URL}/api/proveedores/solicitudes`,{method:'POST',headers:headers(),body:JSON.stringify({nombre:nombre.trim(),negocio_id:negocioId})});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.error||'No se pudo solicitar el proveedor.');
      onSolicitar(Number(result.solicitud.id));
      setEstado('Solicitud registrada. Puedes guardar el egreso o el corte; el contador revisará el proveedor después.');
    }catch(e){setEstado(e.message||'No se pudo registrar la solicitud.');}
    finally{setBuscando(false);}
  };
  if(!String(nombre||'').trim())return null;
  if(exact)return <div className="bosse-supplier-helper" aria-live="polite">
    <small>✓ Proveedor del catálogo {buscando?'· Consultando combinaciones…':''}</small>
    {memoria.length>0&&<>
      <small style={{display:'block',marginTop:5}}>Combinaciones autorizadas por contador o gobernador:</small>
      <div className="bosse-supplier-suggestions">{memoria.map(item=><button type="button" key={item.id} onClick={()=>callback.current(item,false)} title="Aplicar categoría y concepto aprobados">{item.categoria} · {item.concepto}</button>)}</div>
    </>}
    {estado&&<div className="bosse-supplier-info">{estado}</div>}
  </div>;
  return <div className="bosse-supplier-helper" aria-live="polite">
    {solicitudId?<strong>✓ Solicitud #{solicitudId} pendiente. Puedes guardar este movimiento.</strong>:
      <small>{buscando?'Buscando coincidencias…':'Selecciona un proveedor existente o solicita su revisión; escribir un nombre no lo da de alta.'}</small>}
    {!!similares.length&&<div className="bosse-supplier-suggestions">{similares.map(p=><button key={p.id} type="button" onClick={()=>onElegir(p.nombre)}>{p.nombre} <span>{p.coincidencia}% similar</span></button>)}</div>}
    {!solicitudId&&<button type="button" className="bosse-supplier-request" onClick={solicitar} disabled={buscando}>Solicitar proveedor “{nombre.trim()}”</button>}
    {estado&&<div className="bosse-supplier-info">{estado}</div>}
  </div>;
}
