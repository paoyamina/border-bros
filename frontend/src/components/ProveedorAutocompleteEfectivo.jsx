import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../config/api';
import API_BASE_URL from '../config/api';
import ProveedorAyuda from './ProveedorAyuda';
import { normalizarProveedor, sugerirProveedores } from './ProveedorBusquedaUtils.mjs';
import './EgresosCapturaRapida.css';

/** Selector de captura rápida para Egresos (Efectivo).
 * No da de alta proveedores automáticamente: la solicitud debe aprobarse después.
 */
export default function ProveedorAutocompleteEfectivo({
  proveedores = [], value = '', solicitudId = null, negocioId,
  onChange, onSolicitar, onSugerir, onMemoria, inputStyle
}) {
  const listaId = useId();
  const raizRef = useRef(null);
  const [seleccionado, setSeleccionado] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [informacion, setInformacion] = useState('');
  const valor = String(value || '');
  const coincidencias = useMemo(
    () => sugerirProveedores(proveedores, valor, 5), [proveedores, valor]
  );
  const aprobado = useMemo(() => proveedores.find(p =>
    p && p.activo !== false && p.activo !== 0 &&
    normalizarProveedor(p.nombre) === normalizarProveedor(valor)
  ), [proveedores, valor]);
  const pendiente = Boolean(solicitudId);
  // La lista nunca queda abierta tras elegir un proveedor ni al salir del campo.
  const menuVisible = Boolean(abierto && valor.trim() && !pendiente && seleccionado !== valor);
  useEffect(() => {
    if (!abierto && !altaAbierta) return;
    const cerrarFuera = (evento) => {
      if (raizRef.current && !raizRef.current.contains(evento.target)) {
        setAbierto(false);
        setAltaAbierta(false);
      }
    };
    document.addEventListener('pointerdown', cerrarFuera);
    return () => document.removeEventListener('pointerdown', cerrarFuera);
  }, [abierto, altaAbierta]);

  const cambiar = (texto) => {
    setError(''); setInformacion(''); setAltaAbierta(false);
    setIndiceActivo(0); setSeleccionado(''); setAbierto(Boolean(String(texto || '').trim()));
    onChange(texto);
  };
  const elegir = (proveedor) => {
    if (!proveedor) return;
    setError(''); setInformacion(''); setAltaAbierta(false);
    setAbierto(false); setIndiceActivo(0); setSeleccionado(String(proveedor.nombre));
    onChange(String(proveedor.nombre));
  };

  const abrirSolicitud = () => {
    if (!valor.trim()) return;
    if (aprobado) return elegir(aprobado);
    setError(''); setAbierto(false); setAltaAbierta(true);
  };

  const enviarSolicitud = async () => {
    const nombre = valor.trim();
    if (!nombre || aprobado || pendiente || enviando) return;
    setEnviando(true); setError('');
    try {
      const respuesta = await apiFetch(`${API_BASE_URL}/api/proveedores/solicitudes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('bosse_catalog_token') || ''}`
        },
        body: JSON.stringify({ nombre, negocio_id: negocioId })
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.success || !datos.solicitud?.id) {
        throw new Error(datos.error || 'No se pudo registrar la solicitud.');
      }
      onSolicitar(Number(datos.solicitud.id));
      setAltaAbierta(false); setAbierto(false);
      setInformacion('Solicitud enviada. Puedes guardar el egreso; el contador revisará el proveedor.');
    } catch (e) {
      setError(e?.message || 'No se pudo registrar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  const teclado = (e) => {
    if (pendiente) return;
    if (e.key === 'Escape') {e.stopPropagation();setAbierto(false);setAltaAbierta(false);return;}
    if (e.key === 'Tab') {setAbierto(false);return;}
    if (e.key === 'ArrowDown') {
      e.preventDefault();setAbierto(true);
      setIndiceActivo(i=>Math.min(Math.max(0,coincidencias.length-1),i+1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();setAbierto(true);
      setIndiceActivo(i=>Math.max(0,i-1));
    }
    if (e.key === 'Enter' && abierto && coincidencias.length>0) {
      e.preventDefault();elegir(coincidencias[indiceActivo] || coincidencias[0]);
    }
  };

  return <div ref={raizRef} className="bosse-captura-proveedor" onBlur={e => {
    if (!e.currentTarget.contains(e.relatedTarget)) setAbierto(false);
  }}>
    <div className="bosse-captura-input-row">
      <span className="bosse-captura-search-icon" aria-hidden="true">⌕</span>
      <input
        type="text" role="combobox" aria-autocomplete="list"
        aria-label="Buscar proveedor del catálogo"
        aria-controls={listaId}
        aria-expanded={menuVisible && coincidencias.length>0}
        aria-activedescendant={menuVisible && coincidencias.length>0 ? `${listaId}-${indiceActivo}` : undefined}
        placeholder="Escribe para buscar un proveedor…"
        autoComplete="off" maxLength={250}
        value={valor} disabled={pendiente || enviando}
        onChange={e => cambiar(e.target.value)}
        onFocus={() => { if (!pendiente && valor.trim() && seleccionado !== valor) setAbierto(true); }}
        onKeyDown={teclado}
        style={{...inputStyle, paddingLeft:36, paddingRight:36, width:'100%', boxSizing:'border-box', minHeight:44}}
      />
      {!!valor && !pendiente && <button
        type="button" className="bosse-captura-clear" aria-label="Limpiar proveedor"
        onClick={() => cambiar('')}>×</button>}
    </div>

    {menuVisible && <div id={listaId} role="listbox" aria-label="Coincidencias del catálogo" className="bosse-captura-resultados">
      {coincidencias.length>0 ? coincidencias.map((p,i)=><button
        type="button" role="option" id={`${listaId}-${i}`} key={p.id ?? p.nombre}
        aria-selected={i===indiceActivo}
        className={i===indiceActivo?'is-active':''}
        onMouseDown={e=>e.preventDefault()}
        onMouseEnter={()=>setIndiceActivo(i)}
        onClick={()=>elegir(p)}>
        <span className="bosse-captura-option-name">{p.nombre}</span>
        <span className="bosse-captura-option-meta">Catálogo ✓</span>
      </button>) : <div className="bosse-captura-empty">No encontramos ese nombre en el catálogo.</div>}
      {!aprobado && <button type="button" className="bosse-captura-nuevo-link"
        onMouseDown={e=>e.preventDefault()} onClick={abrirSolicitud}>
        ＋ Solicitar “{valor.trim()}” como proveedor nuevo
      </button>}
    </div>}

    {aprobado && !pendiente && <div className="bosse-captura-validado">✓ Proveedor del catálogo</div>}
    {pendiente && <div className="bosse-captura-pendiente">
      <span>Solicitud #{solicitudId} pendiente de aprobación · Puedes guardar el egreso.</span>
      <button type="button" onClick={()=>cambiar('')}>Cambiar</button>
    </div>}

    {altaAbierta && !pendiente && <div className="bosse-captura-solicitud" aria-label="Solicitud de proveedor">
      <strong>¿Solicitar “{valor.trim()}”?</strong>
      <p>Se revisará para evitar duplicados. Puedes guardar el egreso después de enviar la solicitud.</p>
      {coincidencias.length>0 && <div className="bosse-captura-similares">
        <span>Antes revisa si ya existe:</span>
        {coincidencias.slice(0,3).map(p=><button type="button" key={p.id??p.nombre}
          onClick={()=>elegir(p)}>{p.nombre}</button>)}
      </div>}
      <div className="bosse-captura-solicitud-acciones">
        <button type="button" onClick={()=>setAltaAbierta(false)} disabled={enviando}>Cancelar</button>
        <button type="button" onClick={enviarSolicitud} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar solicitud de alta'}
        </button>
      </div>
    </div>}
    {error && <p className="bosse-captura-error" role="alert">{error}</p>}
    {informacion && <p className="bosse-captura-validado" role="status">{informacion}</p>}
    {!valor && <small className="bosse-captura-ayuda">Busca por nombre; si no existe, puedes solicitarlo aquí sin salir del formulario.</small>}
    {aprobado && !pendiente && <ProveedorAyuda
      nombre={valor} negocioId={negocioId} proveedores={proveedores}
      onSugerir={onSugerir} onMemoria={onMemoria}
      onSolicitar={onSolicitar} onElegir={nombre=>cambiar(nombre)}
    />}
  </div>;
}
