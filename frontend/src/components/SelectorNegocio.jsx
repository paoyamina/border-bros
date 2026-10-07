import React from "react";

function SelectorNegocio({ usuarioActivo, rol, onSeleccionarBosse, onLogout }) {
  return (
    <div className="bb-business-home">
      <header className="bb-business-home-header">
        <img src="/logo-principal.png" alt="Border Brothers" className="bb-home-brand" />
        <div className="bb-home-user">
          <div>
            <strong>{usuarioActivo || "Usuario"}</strong>
            <span>{rol || "Sin rol"}</span>
          </div>
          <button type="button" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </header>

      <main className="bb-business-home-main">
        <div className="bb-home-eyebrow">PORTAFOLIO DE NEGOCIOS</div>
        <h1>¿Qué negocio quieres gestionar?</h1>
        <p className="bb-home-intro">
          Selecciona un negocio para entrar a su operación y análisis financiero.
        </p>

        <div className="bb-business-grid">
          <button type="button" className="bb-business-card" onClick={onSeleccionarBosse}>
            <div className="bb-business-card-topline">
              <span className="bb-status-dot" />
              <span>Activo</span>
            </div>

            <div className="bb-business-card-logo">
              <img src="/Logo_BOSSE.png" alt="BOSSE Tijuana" />
            </div>

            <div className="bb-business-card-footer">
              <div>
                <strong>BOSSE</strong>
                <span>Tijuana · Operación y finanzas</span>
              </div>
              <span className="bb-business-arrow">→</span>
            </div>
          </button>

          <div className="bb-future-business-card" aria-hidden="true">
            <span className="bb-future-plus">+</span>
            <div>
              <strong>Negocio 2</strong>
              <span>Loading...</span>
            </div>
          </div>
        </div>

        <div className="bb-home-footnote">
          <span className="bb-home-footnote-line" />
          <span>BorderBros · One platform, every business</span>
        </div>
      </main>
    </div>
  );
}

export default SelectorNegocio;
