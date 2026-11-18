import React from 'react';
import './EgresoCapturaUnificada.css';

/** Solo presentación: conserva las funciones de registro, permisos y API de cada formulario. */
export default function EgresoCapturaUnificada({
  tipo, usuario, onVolver, basicos, detalle, ayuda, monto, comprobante, accion, validacion = [], ayudaActiva = false
}) {
  const [mostrarAyuda, setMostrarAyuda] = React.useState(false);
  React.useEffect(() => {
    if (ayudaActiva) setMostrarAyuda(true);
  }, [ayudaActiva]);
  const pasos = Array.isArray(validacion) ? validacion : [];
  const completos = pasos.filter(p => p.listo).length;
  const pendientes = pasos.filter(p => !p.listo).map(p => p.nombre);
  return (
    <div className="eg2-pagina">
      <div className="eg2-tarjeta">
        <header className="eg2-encabezado">
          <button type="button" className="eg2-volver" onClick={onVolver}>← Volver a Gestión de egresos</button>
          <img src="/Logo_BOSSE.png" alt="BOSSE" className="eg2-logo" />
          <h1>EGRESOS ({tipo})</h1>
          <p>OPERADOR: {usuario}</p>
        </header>
        <div className="eg2-distribucion">
          <main className="eg2-principal">
            <section className="eg2-seccion" aria-labelledby="eg2-basicos">
              <div className="eg2-seccion-titulo">
                <h2 id="eg2-basicos">Captura rápida</h2>
                <span>Registra un egreso en pocos pasos</span>
              </div>
              <div className="eg2-seccion-cuerpo">{basicos}</div>
            </section>
            <section className="eg2-seccion" aria-labelledby="eg2-detalle">
              <div className="eg2-seccion-titulo">
                <h2 id="eg2-detalle">Detalle del gasto</h2>
                <span>Escribe o utiliza las sugerencias</span>
              </div>
              <div className="eg2-seccion-cuerpo">{detalle}</div>
            </section>
          </main>
          <aside className="eg2-lateral" aria-label="Monto, comprobante y ayuda">
            <section className="eg2-seccion eg2-ayuda">
              <button type="button" className="eg2-ux-ayuda-toggle"
                aria-expanded={mostrarAyuda} onClick={() => setMostrarAyuda(v => !v)}>
                <span>✦ Sugerencias para este gasto</span>
                <span aria-hidden="true">{mostrarAyuda ? '−' : '+'}</span>
              </button>
              {mostrarAyuda && <div className="eg2-seccion-cuerpo">{ayuda}</div>}
            </section>
            <section className="eg2-monto" aria-label="Monto del egreso">{monto}</section>
            <section className="eg2-seccion eg2-comprobante" aria-label="Comprobante del egreso">
              <div className="eg2-seccion-cuerpo">{comprobante}</div>
            </section>
          </aside>
          <div className="eg2-acciones">
            {pasos.length > 0 && <div className="eg2-ux-validacion" aria-live="polite">
              <div className="eg2-ux-estado-linea">
                <span>{pendientes.length ? 'Pendiente: ' + pendientes.join(', ') : 'Campos principales completos · se validará al guardar'}</span>
                <small>{completos} de {pasos.length}</small>
              </div>
              <div className="eg2-ux-barra" aria-hidden="true"><span style={{width: ((completos / pasos.length) * 100) + '%'}} /></div>
            </div>}
            {accion}
          </div>
        </div>
      </div>
    </div>
  );
}
