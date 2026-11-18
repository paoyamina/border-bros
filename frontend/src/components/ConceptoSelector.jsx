import React, { useEffect, useState } from 'react';

/** Solo sugerimos conceptos aprobados. Una captura nueva nunca crea memoria automáticamente. */
export default function ConceptoSelector({value = '', onChange, aprobados = [], inputStyle}) {
  const [esNuevo, setEsNuevo] = useState(false);
  const opciones = [...new Set(aprobados.map(s => String(s || '').trim()).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b, 'es'));
  useEffect(() => {
    if (esNuevo && value && aprobados.includes(value)) setEsNuevo(false);
  }, [aprobados, value, esNuevo]);
  const valorFuera = value && !opciones.includes(value) ? value : null;
  return <div style={{width:'100%',marginBottom:10}}>
    <select
      aria-label="Concepto del egreso"
      value={esNuevo ? '__nuevo__' : value}
      onChange={e => {
        const siguiente = e.target.value;
        setEsNuevo(siguiente === '__nuevo__');
        onChange(siguiente === '__nuevo__' ? '' : siguiente);
      }}
      style={{...inputStyle,width:'100%',height:42,cursor:'pointer'}}
    >
      <option value="">Selecciona un concepto aprobado</option>
      {opciones.map(c => <option key={c} value={c}>{c}</option>)}
      {!esNuevo && valorFuera && <option value={valorFuera}>{valorFuera}</option>}
      <option value="__nuevo__">＋ Escribir concepto nuevo…</option>
    </select>
    {esNuevo && <input
      aria-label="Nuevo concepto del egreso"
      type="text"
      maxLength={250}
      placeholder="Describe el concepto del gasto"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{...inputStyle,width:'100%',height:42,marginTop:8}}
    />}
    {!opciones.length && <small style={{display:'block',color:'#81745f',fontSize:11,marginTop:5}}>
      No hay conceptos autorizados para este proveedor. Selecciona «Escribir concepto nuevo»;
      el contador podrá aprobar una combinación habitual después.
    </small>}
  </div>;
}
