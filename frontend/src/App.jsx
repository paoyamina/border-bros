import React, { useState } from "react";

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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formularioActivo, setFormularioActivo] = useState(null);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [usuarioId, setUsuarioId] = useState(null);
  const [rol, setRol] = useState(null);

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

  return null;
}

export default App;