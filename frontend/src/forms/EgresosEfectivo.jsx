import {financialWeek} from '../utils/financialWeek';
import { apiFetch } from '../config/api';
import React, { useEffect, useState } from "react";
import estilos from "../styles/estilos";
import EgresoCapturaUnificada from "../components/EgresoCapturaUnificada";
import "../components/EgresosVistaRapida.css";
import { validarEgreso } from "../utils/validaciones";
import ProveedorSelector from "../components/ProveedorAutocompleteEfectivo";
import ConceptoSelector from "../components/ConceptoSugerenciasEfectivo";
import API_BASE_URL, { API_ENDPOINTS } from "../config/api";

function EgresosEfectivo({
  usuarioActivo,
  usuarioId,
  negocioId,
  rol,
  onVolver
}) {
  const [fechaEgreso, setFechaEgreso] = useState("");
  const [tcEgreso, setTcEgreso] = useState(18.5);
  const [montoEgreso, setMontoEgreso] = useState("");
  const [divisaEgreso, setDivisaEgreso] = useState("MXN");
  const [categoriaEgreso, setCategoriaEgreso] = useState("");
  const [conceptoEgreso, setConceptoEgreso] = useState("");
  const [beneficiarioEgreso, setBeneficiarioEgreso] = useState("");
  const [solicitudProveedorId,setSolicitudProveedorId] = useState(null);
  const [conceptosAprobados, setConceptosAprobados] = useState([]);
  const [selectorVersion, setSelectorVersion] = useState(0);
  const semanaAplicacion=financialWeek(fechaEgreso);
  const [fotosEgreso, setFotosEgreso] = useState([]);
  const [proveedoresExistentes, setProveedoresExistentes] = useState([]);
const [categoriasExistentes, setCategoriasExistentes] = useState([]);
const [guardando, setGuardando] = useState(false);
const puedeAgregarCategoria = ["contador", "gobernador"].includes(
  String(rol || "").trim().toLowerCase()
);
  useEffect(() => {

  const cargarProveedores = async () => {

    try {

      const respuesta = await apiFetch(
        `${API_BASE_URL}/api/proveedores?negocio_id=${negocioId}`
      );

      const resultado = await respuesta.json();
      console.log("RESPUESTA DRIVE:", resultado);

      if (resultado.success) {
        setProveedoresExistentes(resultado.proveedores);
      }

    } catch (error) {
      console.error("Error cargando proveedores:", error);
    }
  };

  const cargarCategorias = async () => {

  try {

    const respuesta = await apiFetch(
      `${API_BASE_URL}/api/categorias?negocio_id=${negocioId}`
    );

    const resultado = await respuesta.json();

    if (resultado.success) {
      setCategoriasExistentes(resultado.categorias);
    }

  } catch (error) {
    console.error("Error cargando categorías:", error);
  }
};

  cargarProveedores();
  cargarCategorias();




}, [negocioId]);


  const montoNumerico = parseFloat(montoEgreso) || 0;
  const montoMXN = divisaEgreso === "USD" ? montoNumerico * tcEgreso : montoNumerico;

  const agregarCategoria = async () => {
  const nueva = prompt("Nombre de la nueva categoría:");

  if (!nueva?.trim()) return;

  try {
    const respuesta = await apiFetch(
      `${API_BASE_URL}/api/categorias/catalogo`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json", Authorization: `Bearer ${sessionStorage.getItem('bosse_catalog_token')||''}`,
        },
        body: JSON.stringify({
          nombre: nueva.trim(),
          negocio_id: negocioId,
        }),
      }
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(
        resultado.error || "No se pudo guardar la categoría."
      );
    }

    const categoriaGuardada = resultado.categoria;

    setCategoriasExistentes((prev) => {
      const yaExiste = prev.some(
        (categoria) => categoria.id === categoriaGuardada.id
      );

      if (yaExiste) return prev;

      return [...prev, categoriaGuardada].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es")
      );
    });

    setCategoriaEgreso(categoriaGuardada.nombre);

    alert("✅ Categoría agregada correctamente.");
  } catch (error) {
    alert("🚨 Error al agregar categoría: " + error.message);
  }
};

const limpiarFormulario = () => {
  // Conservamos la fecha para capturar varios egresos del mismo día.
  setMontoEgreso("");
  setDivisaEgreso("MXN");
  setTcEgreso(18.5);
  setCategoriaEgreso("");
  setConceptoEgreso("");
  setBeneficiarioEgreso("");
  setSolicitudProveedorId(null);
  setConceptosAprobados([]);
  setSelectorVersion(v => v + 1);
  setFotosEgreso([]);
};

  const enviarEgresoADrive = async () => {

  if (!semanaAplicacion) {
    alert('Selecciona la fecha a la que corresponde el gasto antes de guardar.');
    return;
  }
  if (!solicitudProveedorId && !proveedoresExistentes.some(p => String(p.nombre).trim().toLowerCase() === beneficiarioEgreso.trim().toLowerCase())) {
    alert('Selecciona un proveedor del catálogo o registra primero su solicitud.');
    return;
  }
  const errorValidacion = validarEgreso({
    categoria: categoriaEgreso,
    concepto: conceptoEgreso,
    proveedor: beneficiarioEgreso,
    monto: montoEgreso,
  });

  if (errorValidacion) {
    alert(`⚠️ ${errorValidacion}`);
    return;
  }

    if (fotosEgreso.length === 0) {
      const continuar = window.confirm(
        "⚠️ No agregaste comprobante. ¿Deseas continuar de todos modos?"
      );
      if (!continuar) return;
    }

    const confirmar = window.confirm(`
¿ESTÁS SEGURO DE REGISTRAR ESTE EGRESO?

Fecha de aplicación: ${fechaEgreso} · Semana ${semanaAplicacion.inicio} al ${semanaAplicacion.fin}\nProveedor: ${beneficiarioEgreso}
Categoría: ${categoriaEgreso}
Concepto: ${conceptoEgreso}
Monto: ${
      divisaEgreso === "USD"
        ? `${montoNumerico} USD ($${montoMXN.toFixed(2)} MXN)`
        : `$${montoNumerico.toFixed(2)} MXN`
    }
`);

  if (!confirmar) return;

if (guardando) return;

setGuardando(true);

try {
  let proveedorId=null;
  if (!solicitudProveedorId) {
  const respuestaProveedor = await apiFetch(`${API_BASE_URL}/api/proveedores/buscar-o-crear`, {
  method: "POST",
  headers: {
          Authorization: `Bearer ${sessionStorage.getItem("bosse_catalog_token") || ""}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
  nombre: beneficiarioEgreso,
  usuario_id: usuarioId,
  negocio_id: negocioId,
}),
});

const resultadoProveedor = await respuestaProveedor.json();

if (!resultadoProveedor.success) {
  throw new Error(resultadoProveedor.error || "Error al guardar proveedor.");
}

proveedorId = resultadoProveedor.proveedor.id;
  }

const respuestaCategoria = await apiFetch(
  `${API_BASE_URL}/api/categorias/buscar-o-crear`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nombre: categoriaEgreso,
      negocio_id: negocioId,
    }),
  }
);

const resultadoCategoria = await respuestaCategoria.json();

if (!resultadoCategoria.success) {
  throw new Error(
    resultadoCategoria.error || "Error al guardar categoría."
  );
}

const categoriaId = resultadoCategoria.categoria.id;

  const formData = new FormData();

  formData.append(
    "nombreCarpeta",
    `EGRESO_EFECTIVO_${fechaEgreso}_${categoriaEgreso}_${beneficiarioEgreso}`
  );

  formData.append("usuario", usuarioActivo);

  formData.append(
    "detalles",
    JSON.stringify({
      negocio_id: negocioId,
      tipo: "EGRESO_EFECTIVO",
      fecha: fechaEgreso,
      monto: montoNumerico,
      divisa: divisaEgreso,
      tc: tcEgreso,
      montoMXN,
      categoria: categoriaEgreso,
      concepto: conceptoEgreso,
      proveedor: beneficiarioEgreso,
      solicitud_proveedor_id: solicitudProveedorId,
    })
  );

  fotosEgreso.forEach((file) => {
    formData.append("fotos", file);
  });

  const respuesta = await apiFetch(API_ENDPOINTS.guardarReporte, {
    method: "POST",
    body: formData,
  });

  const resultado = await respuesta.json();

  console.log("RESPUESTA REAL DRIVE:", resultado);

  if (!resultado.success) {
    throw new Error(resultado.error || "Error desconocido en servidor.");
  }

  console.log("USUARIO ID EN EGRESO:", usuarioId);

  const respuestaBD = await apiFetch(`${API_BASE_URL}/api/egresos`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
  tipo_egreso: "efectivo",
  fecha: fechaEgreso,
  divisa: divisaEgreso,
  tipo_cambio: divisaEgreso === "USD" ? tcEgreso : 1,
  monto_original: montoNumerico,
  monto_mxn: montoMXN,
   negocio_id: negocioId,
  categoria_id: categoriaId,
  proveedor_id: proveedorId,
    solicitud_proveedor_id: solicitudProveedorId,
  concepto: conceptoEgreso,
  referencia: null,
  usuario_crea_id: usuarioId,
  drive_folder_id: resultado.folderId,
  drive_folder_url: resultado.folderUrl,
  estatus: "REGISTRADO",
}),
});

const resultadoBD = await respuestaBD.json();

console.log("RESPUESTA BD:", resultadoBD);

if (!resultadoBD.success) {
  throw new Error(resultadoBD.error || "Error al guardar en base de datos.");
}

limpiarFormulario();

window.dispatchEvent(new Event("egresoActualizado"));

alert(
  "✅ Egreso efectivo registrado correctamente. Ya puedes capturar otro gasto."
);
} catch (error) {
  console.error("Error al registrar egreso efectivo:", error);
  alert("🚨 Error al registrar egreso efectivo: " + error.message);
} finally {
  setGuardando(false);
}
  };

  return (
    <EgresoCapturaUnificada
      tipo="Efectivo" usuario={usuarioActivo} onVolver={onVolver}
      basicos={(<>
      <div className="eg2-grid-basicos">
        <div className="eg2-campo">
          <label htmlFor="eg2-fecha">FECHA DEL GASTO *</label>
          <input id="eg2-fecha" type="date" value={fechaEgreso}
            onChange={e=>setFechaEgreso(e.target.value)}
            style={{...estilos.input,width:'100%'}} />
        </div>
        <div className="eg2-campo">
            <label htmlFor="eg2-divisa">DIVISA</label>
            <select id="eg2-divisa" value={divisaEgreso} onChange={e=>setDivisaEgreso(e.target.value)}
              style={{...estilos.input,width:'100%'}}>
              <option value="MXN">MXN (Pesos)</option>
              <option value="USD">USD (Dólares)</option>
            </select>
          </div>
        <div className="eg2-campo eg2-categoria">
          <label htmlFor="eg2-categoria">CATEGORÍA *</label>
          <div className="eg2-categoria-fila">
            <select id="eg2-categoria" value={categoriaEgreso}
              onChange={e=>setCategoriaEgreso(e.target.value)}
              style={{...estilos.input,width:'100%'}}>
              <option value="">Selecciona una categoría</option>
              {categoriasExistentes.map(c=><option value={c.nombre} key={c.id}>{c.nombre}</option>)}
            </select>
            {puedeAgregarCategoria && <button type="button" className="eg2-categoria-agregar"
              title="Agregar categoría" aria-label="Agregar categoría" onClick={agregarCategoria}>+</button>}
          </div>
        </div>
      </div>
      <p className="eg2-semana">{semanaAplicacion ?
        `Semana financiera: ${semanaAplicacion.inicio} al ${semanaAplicacion.fin} (viernes a jueves)` :
        'Selecciona la fecha de aplicación del gasto.'}</p>
      {divisaEgreso === 'USD' && <div className="eg2-extra-basicos">
        <div className="eg2-campo">
          <label htmlFor="eg2-tc">TIPO DE CAMBIO USD / MXN</label>
          <input id="eg2-tc" type="number" min="0" step="0.01" value={tcEgreso}
            onChange={e=>setTcEgreso(parseFloat(e.target.value))}
            onWheel={e=>e.currentTarget.blur()}
            style={{...estilos.input,width:'100%'}} />
        </div>
      </div>}
      {categoriasExistentes.length>0 && <div className="eg2-atajos">
        <span>Accesos a categorías:</span>
        {categoriasExistentes.slice(0,4).map(c=><button type="button" key={c.id}
          aria-pressed={c.nombre===categoriaEgreso} onClick={()=>setCategoriaEgreso(c.nombre)}>{c.nombre}</button>)}
      </div>}
    </>)}
      detalle={(<>
      <div className="eg2-detalles-campo"><div className="eg2-campo">
        <label>PROVEEDOR *</label>
        <ProveedorSelector key={`proveedor-${selectorVersion}`}
              negocioId={negocioId} proveedores={proveedoresExistentes}
              value={beneficiarioEgreso} solicitudId={solicitudProveedorId}
              inputStyle={estilos.input}
              onChange={nombre => {
                setBeneficiarioEgreso(nombre);
                setSolicitudProveedorId(null);
                setConceptosAprobados([]);
                if (beneficiarioEgreso && nombre !== beneficiarioEgreso &&
                  proveedoresExistentes.some(p => p.nombre === beneficiarioEgreso)) {
                  setCategoriaEgreso(''); setConceptoEgreso('');
                }
              }}
              onSolicitar={setSolicitudProveedorId}
              onMemoria={combinaciones => setConceptosAprobados(combinaciones.map(x => x.concepto))}
              onSugerir={(item, automatico) => {
                setCategoriaEgreso(anterior => automatico && anterior ? anterior : item.categoria);
                setConceptoEgreso(anterior => automatico && anterior ? anterior : item.concepto);
                if (!automatico) setSelectorVersion(v => v + 1);
              }}/>

      </div></div>
      <div className="eg2-detalles-campo"><div className="eg2-campo">
        <label>CONCEPTO DEL EGRESO *</label>
        <ConceptoSelector key={`concepto-${selectorVersion}`}
              value={conceptoEgreso} onChange={setConceptoEgreso}
              aprobados={conceptosAprobados} inputStyle={estilos.input} />
      </div></div>

    </>)}
      ayuda={(<>
      <div className="eg2-ayuda-item"><span aria-hidden="true">⌕</span><p>
        {solicitudProveedorId
          ? 'Proveedor pendiente de aprobación: podrás guardar el gasto con su solicitud.'
          : 'Busca el proveedor por nombre. Si no aparece, puedes solicitar el alta aquí mismo.'}
      </p></div>
      <div className="eg2-ayuda-item"><span aria-hidden="true">✦</span><p>
        {conceptosAprobados.length>0
          ? `${conceptosAprobados.length} concepto(s) aprobado(s) disponibles para este proveedor. Escribir otro está permitido.`
          : 'El concepto es libre. Las sugerencias se mostrarán si existen combinaciones aprobadas.'}
      </p></div>
    </>)}
      monto={(<>
      <label htmlFor="eg2-monto">MONTO TOTAL PAGADO *</label>
      <div className="eg2-monto-fila"><span>{divisaEgreso==='MXN'?'$':'USD'}</span>
        <input id="eg2-monto" type="number" min="0" step="0.01" inputMode="decimal"
          placeholder="0.00" value={montoEgreso} onChange={e=>setMontoEgreso(e.target.value)}
          onWheel={e=>e.currentTarget.blur()}
          style={{...estilos.input,width:'100%',border:0,background:'transparent'}} />
      </div>
      {divisaEgreso === 'USD' && montoNumerico>0 && <small>
        Equivale a ${montoMXN.toLocaleString('es-MX',{minimumFractionDigits:2})} MXN · TC: {tcEgreso}
      </small>}
    </>)}
      comprobante={(<>
    <div className="eg2-ux-comprobante-titulo">FOTO O PDF DEL COMPROBANTE</div>
    <p>Adjunta una foto o PDF del pago.</p>
    <div className="eg2-ux-adjunto">
      <input type="file" id="eg2-ux-archivo" className="eg2-ux-file-input"
        accept="image/*,application/pdf" onClick={e => {e.currentTarget.value = '';}}
        onChange={e => setFotosEgreso(Array.from(e.target.files || []))} />
      <label htmlFor="eg2-ux-archivo" className="eg2-ux-file-boton">
        ▤ {fotosEgreso.length ? 'Cambiar comprobante' : 'Adjuntar comprobante'}
      </label>
      {fotosEgreso.length > 0 && <div className="eg2-ux-file-seleccion">
        <span title={fotosEgreso[0].name}>✓ {fotosEgreso[0].name}</span>
        <button type="button" onClick={() => setFotosEgreso([])}>Quitar</button>
      </div>}
    </div>
  </>)}
  validacion={[
   {nombre:'Fecha',listo:Boolean(fechaEgreso)},
   {nombre:'Categoría',listo:Boolean(categoriaEgreso)},
   {nombre:'Proveedor',listo:Boolean(solicitudProveedorId || (beneficiarioEgreso && proveedoresExistentes.some(p => p && p.nombre && String(p.nombre).trim().toLowerCase() === String(beneficiarioEgreso).trim().toLowerCase())))},
   {nombre:'Concepto',listo:Boolean(String(conceptoEgreso || '').trim())},
   {nombre:'Monto',listo:Number(montoEgreso) > 0}
 ]}
 ayudaActiva={Boolean(solicitudProveedorId || (Array.isArray(conceptosAprobados) && conceptosAprobados.length > 0))}
 accion={(<button type="button" className="eg2-guardar" onClick={enviarEgresoADrive}
        disabled={guardando || !montoEgreso || !conceptoEgreso}>
        {guardando ? 'Guardando…' : 'Guardar egreso de efectivo'}
      </button>)}
    />
  );
}

export default EgresosEfectivo;
