import React, { useEffect, useState } from "react";

import Login from "./components/Login";
import MenuPrincipal from "./components/MenuPrincipal";

import CorteCaja from "./forms/CorteCaja";
import EgresosEfectivo from "./forms/EgresosEfectivo";
import EgresosBancos from "./forms/EgresosBancos";
import EgresosBanca from "./forms/EgresosBanca";
import Nomina from "./forms/Nomina";
import AprobacionesNomina from "./forms/AprobacionesNomina";
import HistorialNomina from "./forms/HistorialNomina";
import Empleados from "./forms/Empleados";
import InversionesSocios from "./components/InversionesSocios";
import AnalisisFinanciero from "./components/AnalisisFinanciero";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formularioActivo, setFormularioActivo] = useState(null);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [usuarioId, setUsuarioId] = useState(null);
  const [rol, setRol] = useState(null);
  const [mostrandoSplash, setMostrandoSplash] = useState(true);
  useEffect(() => {
  const timer = setTimeout(() => {
    setMostrandoSplash(false);
  }, 1800);

  return () => clearTimeout(timer);
}, []);

  const manejarLoginExitoso = (usuario) => {
    setIsLoggedIn(true);
    setUsuarioActivo(usuario.nombre);
    setUsuarioId(usuario.id);
    setRol(usuario.rol);
    setFormularioActivo(null);
  };

  const cerrarSesion = () => {
    const confirmar = window.confirm("¿Deseas cerrar sesión?");

    if (!confirmar) return;

    setIsLoggedIn(false);
    setFormularioActivo(null);
    setUsuarioActivo(null);
    setRol(null);
  };

  const volverAlMenu = () => {
    const confirmar = window.confirm(
      "¿Deseas volver al menú? Se limpiará la información capturada en este formulario."
    );

    if (!confirmar) return;

    setFormularioActivo(null);
  };

  if (mostrandoSplash) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAFAF9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "30px",
      }}
    >
      <style>
        {`
          @keyframes fadeInLogo {
            from {
              opacity: 0;
              transform: scale(0.96);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>

      <img
        src="/logo-principal.png"
        alt="Border Brothers"
        style={{
          width: "min(520px, 85vw)",
          height: "auto",
          animation: "fadeInLogo 1s ease",
        }}
      />

      <p
  style={{
    marginTop: "26px",
    fontSize: "22px",
    fontWeight: "600",
    letterSpacing: "2.5px",
    textTransform: "uppercase",
    color: "#476F4D",
    textAlign: "center",
    animation: "fadeInLogo 1.2s ease",
  }}
>
  Sistema administrativo y financiero
</p>
    </div>
  );
}

if (!isLoggedIn) {
  return <Login onLogin={manejarLoginExitoso} />;
}

  if (isLoggedIn && !formularioActivo) {
    return (
      <MenuPrincipal
        usuarioActivo={usuarioActivo}
        rol={rol}
        onSeleccionarFormulario={setFormularioActivo}
        onLogout={cerrarSesion}
      />
    );
  }

  if (formularioActivo === "caja") {
    return (
      <CorteCaja
        usuarioActivo={usuarioActivo}
        usuarioId={usuarioId}
        onVolver={volverAlMenu}
      />
    );
  }

  if (formularioActivo === "egresos_caja") {
    return (
      <EgresosEfectivo
  usuarioActivo={usuarioActivo}
  usuarioId={usuarioId}
  rol={rol}
  onVolver={volverAlMenu}
        />
    );
  }

  if (formularioActivo === "egresos_bancos") {
    return (
      <EgresosBancos
        usuarioActivo={usuarioActivo}
       usuarioId={usuarioId}
        rol={rol}
       onVolver={volverAlMenu}
      />
    );
  }

  if (formularioActivo === "egresos_banca") {
    return (
     <EgresosBanca
  usuarioActivo={usuarioActivo}
  usuarioId={usuarioId}
  rol={rol}
  onVolver={volverAlMenu}
/>
    );
  }

  if (formularioActivo === "nomina") {
    return (
      <Nomina
  usuarioActivo={usuarioActivo}
  usuarioId={usuarioId}
  onVolver={volverAlMenu}
/>
    );
  }

  if (formularioActivo === "aprobaciones_nomina") {
  return (
    <AprobacionesNomina
      usuarioActivo={usuarioActivo}
      usuarioId={usuarioId}
      onVolver={volverAlMenu}
    />
  );
}

  if (formularioActivo === "empleados") {
  return (
    <Empleados
      usuarioActivo={usuarioActivo}
      usuarioId={usuarioId}
      onVolver={volverAlMenu}
    />
  );
}

if (formularioActivo === "historial_nomina") {
  return (
    <HistorialNomina
      usuarioActivo={usuarioActivo}
      onVolver={volverAlMenu}
    />
  );
}

if (formularioActivo === "inversiones_socios") {
  return (
    <InversionesSocios
      usuarioActivo={usuarioActivo}
      usuarioId={usuarioId}
      onVolver={volverAlMenu}
    />
  );
}

if (formularioActivo === "analisis_financiero") {
  return (
    <AnalisisFinanciero
      usuarioActivo={usuarioActivo}
      onVolver={volverAlMenu}
    />
  );
}

  return null;
}

export default App;