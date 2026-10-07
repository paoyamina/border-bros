import React from "react";

const permisosPorRol = {
  socio: [
    "caja",
    "egresos_caja",
    "egresos_bancos",
    "egresos_banca",
    "nomina",
    "empleados",
    "aprobaciones_nomina",
    "historial_nomina",
    "inversiones_socios",
    "puestos",
  ],
  contador: [
    "caja",
    "egresos_caja",
    "egresos_bancos",
    "egresos_banca",
    "nomina",
    "aprobaciones_nomina",
    "historial_nomina",
    "inversiones_socios",
    "puestos",
  ],
  gobernador: [
    "caja",
    "egresos_caja",
    "egresos_bancos",
    "egresos_banca",
    "nomina",
    "empleados",
    "aprobaciones_nomina",
    "historial_nomina",
    "inversiones_socios",
    "puestos",
    "cambio_divisas",
  ],
  administrador: [
  "egresos_caja",
  "egresos_bancos",
  "egresos_banca",
  "nomina",
  "empleados",
  "aprobaciones_nomina",
  "historial_nomina",
  "puestos",
  "cambio_divisas",
],

cajero: [
  "egresos_caja",
  "egresos_bancos",
  "egresos_banca",
  "caja",
  "nomina",
  "empleados",
  "aprobaciones_nomina",
  "historial_nomina",
  "puestos",
  "cambio_divisas",
],
};

function normalizarRol(rol) {
  return String(rol || "").trim().toLowerCase();
}

function puedeVer(rol, formulario) {
  const rolNormalizado = normalizarRol(rol);

  // Temporal: si todavía no viene rol desde backend, mostramos todo para pruebas
  if (!rolNormalizado || rolNormalizado === "sin rol") {
    return true;
  }

  return permisosPorRol[rolNormalizado]?.includes(formulario);
}

function puedeVerEgresos(rol) {
  return (
    puedeVer(rol, "egresos_caja") ||
    puedeVer(rol, "egresos_bancos") ||
    puedeVer(rol, "egresos_banca")
  );
}

function MenuPrincipal({ usuarioActivo, rol, onSeleccionarFormulario, onLogout }) {
  const modulos = [
    {
      id: "caja",
      titulo: "Cortes de caja",
      descripcion: "Ingresos, cierres y control de cortes.",
      icono: "▤",
      imagen: "/bosse/luxury/cortes.webp",
      visible: puedeVer(rol, "caja"),
      onClick: () => onSeleccionarFormulario("caja"),
    },
    {
      id: "egresos",
      titulo: "Gestión de egresos",
      descripcion: "Efectivo, bancos y banca electrónica.",
      icono: "▣",
      imagen: "/bosse/luxury/egresos.webp",
      visible: puedeVerEgresos(rol),
      onClick: () => onSeleccionarFormulario("egresos"),
    },
    {
      id: "nomina",
      titulo: "Nómina",
      descripcion: "Prenómina, operación y seguimiento.",
      icono: "♙",
      imagen: "/bosse/luxury/nomina.webp",
      visible: puedeVer(rol, "nomina"),
      onClick: () => onSeleccionarFormulario("nomina"),
    },
    {
      id: "empleados",
      titulo: "Empleados",
      descripcion: "Personal, altas y administración del equipo.",
      icono: "♧",
      imagen: "/bosse/luxury/empleados.webp",
      visible: puedeVer(rol, "empleados"),
      onClick: () => onSeleccionarFormulario("empleados"),
    },
    {
      id: "puestos",
      titulo: "Catálogo de puestos",
      descripcion: "Clasificación y configuración de puestos.",
      icono: "♢",
      imagen: "/bosse/luxury/puestos.webp",
      visible: puedeVer(rol, "puestos"),
      onClick: () => onSeleccionarFormulario("puestos"),
    },
    {
      id: "inversiones_socios",
      titulo: "Adelantos de socios",
      descripcion: "Registro y seguimiento de adelantos.",
      icono: "◇",
      imagen: "/bosse/luxury/adelantos.webp",
      visible: puedeVer(rol, "inversiones_socios"),
      onClick: () => onSeleccionarFormulario("inversiones_socios"),
    },
    {
      id: "cambio_divisas",
      titulo: "Cambio de divisas",
      descripcion: "Operaciones y control de conversión.",
      icono: "↔",
      imagen: "/bosse/luxury/divisas.webp",
      visible: puedeVer(rol, "cambio_divisas"),
      onClick: () => onSeleccionarFormulario("cambio_divisas"),
    },
  ].filter((modulo) => modulo.visible);

  return (
    <main className="bosse-admin-page bosse-luxury">
            <section className="bosse-luxury-statusbar">
        <div className="bosse-luxury-status-item">
          <span>SESIÓN ACTIVA</span>
          <strong>{usuarioActivo || "Usuario"}</strong>
        </div>

        <div className="bosse-luxury-status-item">
          <span>ROL</span>
          <strong>{normalizarRol(rol) || rol}</strong>
        </div>

        <div className="bosse-luxury-status-item">
          <span>MÓDULOS DISPONIBLES</span>
          <strong>{modulos.length}</strong>
        </div>

        <div className="bosse-luxury-status-item bosse-luxury-status-clock">
          <span>
            {new Intl.DateTimeFormat("es-MX", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })
              .format(new Date())
              .toUpperCase()}
          </span>

          <strong>
            {new Intl.DateTimeFormat("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date())}
          </strong>
        </div>
      </section>
      <section
        className="bosse-luxury-hero"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(8,8,7,.96) 0%, rgba(8,8,7,.72) 38%, rgba(8,8,7,.18) 72%, rgba(8,8,7,.62) 100%), url('/bosse/luxury/hero.webp')",
        }}
      >
        <div className="bosse-luxury-hero-copy">
          <span className="bosse-luxury-eyebrow">CONTROL OPERATIVO</span>

          <h1>Administración</h1>

          <p>
            Sistema de ingreso de datos de
            <br />
            BOSSE.
          </p>
        </div>

        <div className="bosse-luxury-hero-quote">
          <span>CAPTURA Y ADMINISTRACIÓN</span>
          <i />
        </div>
      </section>

      <section className="bosse-luxury-modules">
        <div className="bosse-luxury-grid">
          {modulos.map((modulo, index) => (
            <button
              type="button"
              key={modulo.id}
              className={`bosse-luxury-card bosse-luxury-card-${modulo.id}`}
              onClick={modulo.onClick}
              style={{
                backgroundImage: `
                  linear-gradient(
                    90deg,
                    rgba(7,7,6,.94) 0%,
                    rgba(7,7,6,.74) 48%,
                    rgba(7,7,6,.22) 100%
                  ),
                  url('${modulo.imagen}')
                `,
              }}
            >
              <span className="bosse-luxury-card-number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="bosse-luxury-card-content">
                <span className="bosse-luxury-card-icon">
                  {modulo.icono}
                </span>

                <h3>{modulo.titulo}</h3>

                <p>{modulo.descripcion}</p>
              </div>

              <span className="bosse-luxury-card-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="bosse-admin-mobile-logout">
        <button type="button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}

export default MenuPrincipal;
