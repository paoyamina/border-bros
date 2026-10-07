import React, { useState } from "react";

function BorderBrosShell({
  children,
  usuarioActivo,
  rol,
  negocioNombre = "BOSSE",
  seccionActiva = "administracion",
  puedeVerAnalisis = false,
  onAdministracion,
  onAnalisis,
  onMisNegocios,
  onLogout,
}) {
const inicial = String(usuarioActivo || "U").trim().charAt(0).toUpperCase();

const [temaBosse, setTemaBosse] = useState("luxury");
const esMinimal = temaBosse === "minimal";

return (
    <div
  className={`bb-platform-shell ${
    esMinimal ? "bb-theme-minimal" : "bb-theme-luxury"
  }`}
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

        <div className="bb-theme-preview">
  <span className="bb-theme-preview-label">ESTILO BOSSE</span>

  <div className="bb-theme-preview-options">
    <button
      type="button"
      className={temaBosse === "luxury" ? "is-active" : ""}
      onClick={() => setTemaBosse("luxury")}
    >
      <span>01</span>
      Luxury
    </button>

    <button
  type="button"
  className={temaBosse === "minimal" ? "is-active" : ""}
  onClick={() => setTemaBosse("minimal")}
>
  <span>02</span>
  Editorial
</button>
  </div>
</div>

        <nav className="bb-platform-nav" aria-label="Navegación principal">
          <button
            type="button"
            className={`bb-nav-item ${seccionActiva === "administracion" ? "is-active" : ""}`}
            onClick={onAdministracion}
          >
            <span className="bb-nav-icon">▦</span>
            <span>Administración</span>
          </button>

          {puedeVerAnalisis && (
            <button
              type="button"
              className={`bb-nav-item ${seccionActiva === "analisis" ? "is-active" : ""}`}
              onClick={onAnalisis}
            >
              <span className="bb-nav-icon">⌁</span>
              <span>Análisis Financiero</span>
            </button>
          )}
        </nav>

        <div className="bb-sidebar-spacer" />

        <button type="button" className="bb-all-businesses" onClick={onMisNegocios}>
          <span>⌂</span>
          <span>Mis negocios</span>
        </button>

        <div className="bb-user-card">
          <div className="bb-user-avatar">{inicial}</div>
          <div className="bb-user-copy">
            <strong>{usuarioActivo || "Usuario"}</strong>
            <span>{rol || "Sin rol"}</span>
          </div>
          <button type="button" onClick={onLogout} className="bb-logout-button" title="Cerrar sesión">
            ↗
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
    </div>
  );
}

export default BorderBrosShell;
