import React, {useMemo, useState} from 'react';
import './EgresosCapturaRapida.css';

/** Concepto siempre editable; las sugerencias aprobadas nunca son obligatorias. */
export default function ConceptoSugerenciasEfectivo({value='', onChange, aprobados=[], inputStyle}) {
  const [expandido,setExpandido]=useState(false);
  const sugerencias=useMemo(()=>{
    const vistos=new Set();
    return (Array.isArray(aprobados)?aprobados:[])
      .map(x=>String(x||'').trim()).filter(x=>{
        const k=x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
        if(!x||vistos.has(k))return false;
        vistos.add(k);return true;
      });
  },[aprobados]);
  const visibles=expandido?sugerencias:sugerencias.slice(0,4);
  return <div className="bosse-captura-concepto">
    <input type="text" aria-label="Concepto del egreso" maxLength={250}
      value={value} onChange={e=>onChange(e.target.value)}
      autoComplete="off" placeholder="Escribe el concepto del egreso…"
      style={{...inputStyle,width:'100%',height:44,boxSizing:'border-box'}} />
    {sugerencias.length>0 && <div className="bosse-captura-conceptos-sugeridos">
      <span>Sugerencias (opcionales):</span>
      <div className="bosse-captura-chips">
        {visibles.map(s=><button type="button" key={s} onClick={()=>onChange(s)}
          title={`Usar ${s}. Puedes editar el texto después.`}>{s}</button>)}
        {sugerencias.length>4 && <button type="button" className="bosse-captura-vermas" onClick={()=>setExpandido(v=>!v)}>
          {expandido?'Ver menos':`Ver ${sugerencias.length-4} más`}
        </button>}
      </div>
    </div>}
  </div>;
}
