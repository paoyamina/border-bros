import React from "react";
import "./BosseAdminSubnav.css";
import BosseFinanceIcon from "./BosseFinanceIcon";

function BorderBrosShell({
  children,
  usuarioActivo,
  rol,
  negocioNombre = "BOSSE",
  seccionActiva = "administracion",
  adminSection = "inicio",
  onAdminSectionChange = () => {},
  puedeVerAnalisis = false,
  financeSection = 'resumen',
  onFinanceSectionChange = () => {},
  onAdministracion,
  onAnalisis,
  onMisNegocios,
  onLogout,
}) {
const inicial = String(usuarioActivo || "U").trim().charAt(0).toUpperCase();
const [adminNavOpen, setAdminNavOpen] = React.useState(seccionActiva === 'administracion' && adminSection === 'inicio');
React.useEffect(() => {
  // Al entrar a un formulario, recogemos el menú para despejar la pantalla.
  setAdminNavOpen(seccionActiva === 'administracion' && adminSection === 'inicio');
}, [seccionActiva, adminSection]);


return (
    <div
  className="bb-platform-shell bb-theme-minimal bb-finance-premium"
>
      <aside className="bb-platform-sidebar">
        <div className="bb-brand-block">
  <img
  src="/logo-borderbros-champagne.png"
  alt="Border Brothers"
  className="bb-brand-logo bb-brand-logo-bosse"
/>
  <span className="bb-brand-caption">Business Operating Platform</span>
</div>

        <button type="button" className="bb-business-switcher" onClick={onMisNegocios}>
          <span className="bb-business-logo-wrap">
            <img src="/Logo_BOSSE.png" alt={negocioNombre} />
          </span>
          <span className="bb-business-switcher-copy">
            <small>Negocio actual</small>
            <strong>{negocioNombre}</strong>
          </span>
          <span className="bb-business-chevron">⌄</span>
        </button>

        <nav className="bb-platform-nav" aria-label="Navegación principal">
          <button
            type="button"
            className={`bb-nav-item ${seccionActiva === "administracion" ? "is-active" : ""}`}
            onClick={() => {
              if (seccionActiva === 'administracion') setAdminNavOpen(v => !v);
              else { setAdminNavOpen(true); onAdministracion?.(); }
            }}
            aria-expanded={seccionActiva === 'administracion' && adminNavOpen}
            aria-controls="bb-admin-navigation-items"
          >
            <span className="bb-nav-icon"><BosseFinanceIcon name="receipt" size={19}/></span>
            <span>Administración</span>
            <span className="bb-admin-collapse-caret" aria-hidden="true">{adminNavOpen ? "▴" : "▾"}</span>
          </button>
          {seccionActiva === 'administracion' && adminNavOpen && (
            <div id="bb-admin-navigation-items" className="bb-admin-subnav" aria-label="Secciones de Administración">
              {[
                { id: 'inicio', label: 'Inicio', icon: '⌂' },
                { id: 'caja', label: 'Cortes de caja', icon: '▤', roles: ['socio','contador','gobernador','cajero'] },
                { id: 'egresos', label: 'Egresos', icon: '▣', roles: ['socio','contador','gobernador','administrador','cajero'] },
                { id: 'nomina', label: 'Nómina', icon: '♙', roles: ['socio','contador','gobernador','administrador','cajero'] },
                { id: 'empleados', label: 'Empleados', icon: '♧', roles: ['socio','gobernador','administrador','cajero'] },
                { id: 'puestos', label: 'Puestos', icon: '♢', roles: ['socio','contador','gobernador','administrador','cajero'] },
                { id: 'catalogo', label: 'Catálogos', icon: '◇', roles: ['gobernador','contador'] },
                { id: 'inversiones_socios', label: 'Adelantos socios', icon: '◇', roles: ['socio','contador','gobernador'] },
                { id: 'cambio_divisas', label: 'Cambio de divisas', icon: '↔', roles: ['gobernador','administrador','cajero'] }
              ].filter(item => !item.roles || item.roles.includes(String(rol || '').trim().toLowerCase()))
                .map(item => {
                  const seleccionado = adminSection === item.id ||
                    (item.id === 'caja' && ['caja_nuevo','caja_editar'].includes(adminSection)) ||
                    (item.id === 'egresos' && ['egresos_caja','egresos_bancos','egresos_banca'].includes(adminSection)) ||
                    (item.id === 'nomina' && ['aprobaciones_nomina','historial_nomina'].includes(adminSection));
                  return (
                    <button key={item.id} type="button"
                      title={item.label}
                      aria-current={seleccionado ? 'page' : undefined}
                      className={seleccionado ? 'active' : ''}
                      onClick={() => onAdminSectionChange(item.id)}>
                      <span className="bb-admin-subnav-icon" aria-hidden="true">{item.icon}</span>
                      {item.label}
                    </button>
                  );
                })}
            </div>
          )}


          {puedeVerAnalisis && (
            <button
              type="button"
              className={`bb-nav-item ${seccionActiva === "analisis" ? "is-active" : ""}`}
              onClick={onAnalisis}
            >
              <span className="bb-nav-icon"><BosseFinanceIcon name="chart" size={19}/></span>
              <span>Análisis Financiero</span>
            </button>
          )}
          {puedeVerAnalisis && seccionActiva === 'analisis' && (
            <div className="bb-finance-subnav" aria-label="Secciones de Análisis Financiero">
              {[
                ['resumen', 'file', 'Resumen'],
                ['explorar', 'search', 'Explorar movimientos'],
                ['graficas', 'chart', 'Gráficas'],
                ['borderbro', 'sparkles', 'BorderBro']
              ].map(([id, icon, name]) => (
                <button key={id} type="button"
                  className={financeSection === id ? 'active' : ''}
                  aria-current={financeSection === id ? 'page' : undefined}
                  onClick={() => onFinanceSectionChange(id)}>
                  <span aria-hidden="true"><BosseFinanceIcon name={icon} size={19}/></span>{name}
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="bb-sidebar-spacer" />

        <button type="button" className="bb-all-businesses" onClick={onMisNegocios}>
          <span><BosseFinanceIcon name="home" size={18}/></span>
          <span>Mis negocios</span>
        </button>

        <div className="bb-user-card">
          <div className="bb-user-avatar">{inicial}</div>
          <div className="bb-user-copy">
            <strong>{usuarioActivo || "Usuario"}</strong>
            <span>{rol || "Sin rol"}</span>
          </div>
          <button type="button" onClick={onLogout} className="bb-logout-button" title="Cerrar sesión">
            <BosseFinanceIcon name="logout" size={17}/>
          </button>
        </div>
      </aside>

      <div className="bb-platform-mobilebar">
        <button type="button" onClick={onMisNegocios} className="bb-mobile-business">
          <span className="bb-mobile-mark">B</span>
          <span>{negocioNombre}</span>
          <span>⌄</span>
        </button>

        <div className="bb-mobile-nav">
          <button
            type="button"
            className={seccionActiva === "administracion" ? "is-active" : ""}
            onClick={onAdministracion}
          >
            Administración
          </button>
          {puedeVerAnalisis && (
            <button
              type="button"
              className={seccionActiva === "analisis" ? "is-active" : ""}
              onClick={onAnalisis}
            >
              Análisis
            </button>
          )}
        </div>
      </div>

      <div className="bb-platform-content">{children}</div>
      <nav className="bb-bosse-mobile-dock" aria-label="Navegación móvil">
        <button type="button" className={seccionActiva==='administracion'?'active':''} onClick={onAdministracion}><span aria-hidden="true">▦</span>Administración</button>
        {puedeVerAnalisis && <button type="button" className={seccionActiva==='analisis'?'active':''} onClick={onAnalisis}><span aria-hidden="true">⌁</span>Análisis</button>}
        <button type="button" onClick={onMisNegocios}><span aria-hidden="true">▣</span>Negocios</button>
        <button type="button" onClick={onLogout}><span aria-hidden="true">◎</span>Salir</button>
      </nav>
    </div>
  );
}

export default BorderBrosShell;
