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
    "analisis_financiero",
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
    "analisis_financiero",
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
    "analisis_financiero",
  ],
  administrador: [
    "egresos_caja",
    "egresos_bancos",
    "egresos_banca",
    "nomina",
    "empleados",
    "historial_nomina",
  ],
  cajero: ["caja"],
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

function MenuPrincipal({ usuarioActivo, rol, onSeleccionarFormulario, onLogout }) {
  const estiloBotonMenu = {
  width: "100%",
  padding: "18px",
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  fontSize: "15px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "3px",
  cursor: "pointer",
  marginTop: "7px",
};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        paddingTop: "15px",
      }}
    >
      <div
        style={{
          maxWidth: "730px",
          margin: "0 auto",
          background: "#fff",
          padding: "42px 48px",
          borderRadius: "4px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.04)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            textTransform: "uppercase",
            letterSpacing: "2px",
            fontWeight: "300",
            fontSize: "28px",
            color: "#000",
            margin: "0 0 14px 0",
          }}
        >
          Selecciona un formulario
        </h1>

        <p
          style={{
            color: "#777",
            fontSize: "17px",
            margin: "0 0 14px 0",
          }}
        >
          Operador: {usuarioActivo || "Sin usuario"} | Rol: {rol || "Sin rol"}
        </p>

        {puedeVer(rol, "caja") && (
          <button onClick={() => onSeleccionarFormulario("caja")} style={estiloBotonMenu}>
            CORTE DE CAJA (INGRESOS)
          </button>
        )}

        {puedeVer(rol, "egresos_caja") && (
          <button onClick={() => onSeleccionarFormulario("egresos_caja")} style={estiloBotonMenu}>
            EGRESOS CAJA (EFECTIVO)
          </button>
        )}

        {puedeVer(rol, "egresos_bancos") && (
          <button onClick={() => onSeleccionarFormulario("egresos_bancos")} style={estiloBotonMenu}>
            EGRESOS BANCOS
          </button>
        )}

        {puedeVer(rol, "egresos_banca") && (
          <button onClick={() => onSeleccionarFormulario("egresos_banca")} style={estiloBotonMenu}>
            EGRESOS BANCA
          </button>
        )}

        {puedeVer(rol, "nomina") && (
          <button onClick={() => onSeleccionarFormulario("nomina")} style={estiloBotonMenu}>
            RESUMEN NÓMINA
          </button>
        )}

        {puedeVer(rol, "aprobaciones_nomina") && (
  <button
    onClick={() => onSeleccionarFormulario("aprobaciones_nomina")}
    style={estiloBotonMenu}
  >
    APROBACIONES NÓMINA
  </button>
)}

{puedeVer(rol, "historial_nomina") && (
  <button
    onClick={() => onSeleccionarFormulario("historial_nomina")}
    style={estiloBotonMenu}
  >
    HISTORIAL NÓMINA
  </button>
)}

{puedeVer(rol, "analisis_financiero") && (
  <button
    onClick={() => onSeleccionarFormulario("analisis_financiero")}
    style={estiloBotonMenu}
  >
    ANÁLISIS FINANCIERO
  </button>
)}

        {puedeVer(rol, "empleados") && (
  <button
    onClick={() => onSeleccionarFormulario("empleados")}
    style={estiloBotonMenu}
  >
    GESTIÓN EMPLEADOS
  </button>
)}

        <button
          onClick={onLogout}
          style={{
            ...estiloBotonMenu,
            marginTop: "14px",
            background: "#fff",
            color: "#000",
            border: "1px solid #000",
          }}
        >
          CERRAR SESIÓN
        </button>
      </div>
    </div>
  );
}

export default MenuPrincipal;