import React, { useState } from 'react';
import ProveedorAyuda from './ProveedorAyuda';

const normalizar = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/** El catálogo es la selección normal; la escritura se habilita solo para solicitar un alta. */
export default function ProveedorSelector({
  proveedores = [], value = '', solicitudId = null, negocioId,
  onChange, onSolicitar, onSugerir, onMemoria, inputStyle
}) {
  const [solicitando, setSolicitando] = useState(false);
  const seleccionado = proveedores.find(p => normalizar(p.nombre) === normalizar(value));
  const opciones = [...proveedores].sort((a,b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));

  const elegir = nuevoValor => {
    if (nuevoValor === '__nuevo__') {
      setSolicitando(true);
      onChange('');
      return;
    }
    setSolicitando(false);
    const proveedor = opciones.find(p => String(p.id) === nuevoValor);
    onChange(proveedor ? proveedor.nombre : '');
  };

  const elegirSugerido = nombre => {
    setSolicitando(false);
    onChange(nombre);
  };

  return <div style={{width: '100%'}}>
    <select
      aria-label="Proveedor del catálogo"
      value={solicitando ? '__nuevo__' : (seleccionado ? String(seleccionado.id) : '')}
      onChange={e => elegir(e.target.value)}
      style={{...inputStyle, width:'100%', minHeight:42, cursor:'pointer'}}
    >
      <option value="">Selecciona un proveedor del catálogo</option>
      {opciones.map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
      <option value="__nuevo__">＋ Solicitar proveedor nuevo…</option>
    </select>
    {solicitando && <div style={{marginTop:8}}>
      <input
        aria-label="Nombre del proveedor solicitado"
        type="text"
        maxLength={250}
        placeholder="Nombre del proveedor que no está en el catálogo"
        autoComplete="off"
        value={value}
        disabled={Boolean(solicitudId)}
        onChange={e => onChange(e.target.value)}
        style={{...inputStyle, width:'100%', height:42}}
      />
      <small style={{display:'block',fontSize:11,color:'#81745f',marginTop:5}}>
        Primero revisa las coincidencias; la solicitud queda pendiente de aprobación.
      </small>
    </div>}
    {(seleccionado || solicitando || solicitudId) && <ProveedorAyuda
      nombre={value}
      negocioId={negocioId}
      proveedores={proveedores}
      solicitudId={solicitudId}
      onElegir={elegirSugerido}
      onSolicitar={onSolicitar}
      onSugerir={onSugerir}
      onMemoria={onMemoria}
    />}
  </div>;
}
