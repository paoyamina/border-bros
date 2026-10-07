import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import MenuPrincipal from "./components/MenuPrincipal";
import GestionEgresos from "./components/GestionEgresos";
import CorteCaja from "./forms/CorteCaja";
import EgresosEfectivo from "./forms/EgresosEfectivo";
import EgresosBancos from "./forms/EgresosBancos";
import EgresosBanca from "./forms/EgresosBanca";
import Nomina from "./forms/Nomina";
import AprobacionesNomina from "./forms/AprobacionesNomina";
import HistorialNomina from "./forms/HistorialNomina";
import Empleados from "./forms/Empleados";
import Puestos from "./forms/Puestos";
import InversionesSocios from "./components/InversionesSocios";
import AnalisisFinanciero from "./components/AnalisisFinanciero";
import GestionCortes from "./components/cortes/GestionCortes";
import CambioDivisas from "./forms/CambioDivisas";
import BorderBrosShell from "./components/BorderBrosShell";
import SelectorNegocio from "./components/SelectorNegocio";
import "./BosseTheme.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formularioActivo, setFormularioActivo] = useState(null);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [usuarioId, setUsuarioId] = useState(null);
  const [rol, setRol] = useState(null);
  const [negocioId, setNegocioId] = useState(null);
  const [, setUsuario] = useState(null);
  const [mostrandoSplash, setMostrandoSplash] = useState(true);
  const [, setSeccionSeleccionada] = useState(null);
  const [corteEditando, setCorteEditando] = useState(null);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(false);
  const puedeEntrarAnalisis = (rolUsuario) => {
  return ["socio", "contador", "gobernador", "administrador"].includes(
    String(rolUsuario || "").trim().toLowerCase()
  );
};
  useEffect(() => {
  const timer = setTimeout(() => {
    setMostrandoSplash(false);
  }, 1800);

  return () => clearTimeout(timer);
}, []);

const manejarLoginExitoso = (usuario) => {
  setIsLoggedIn(true);
  setUsuario(usuario);
  setUsuarioActivo(usuario.nombre);
  setUsuarioId(usuario.id);
  setRol(usuario.rol);
  setNegocioId(usuario.negocio_id);
  setFormularioActivo(null);
  setSeccionSeleccionada(null);
  setNegocioSeleccionado(false);

  console.log("LOGIN:", usuario);
  console.log("negocio_id:", usuario.negocio_id);
};

  const cerrarSesion = () => {
  const confirmar = window.confirm("¿Deseas cerrar sesión?");

  if (!confirmar) return;

  setIsLoggedIn(false);
  setFormularioActivo(null);
  setUsuarioActivo(null);
  setUsuario(null);
  setUsuarioId(null);
  setRol(null);
  setNegocioId(null);
  setSeccionSeleccionada(null);
  setNegocioSeleccionado(false);
};

  const volverAlMenu = () => {
    const confirmar = window.confirm(
      "¿Deseas volver al menú? Se limpiará la información capturada en este formulario."
    );

    if (!confirmar) return;

    setFormularioActivo(null);
  };

  const seleccionarFormulario = (tipo, corte = null) => {
  setFormularioActivo(tipo);
  setCorteEditando(corte);
};

  if (mostrandoSplash) {
    return (
      <div className="bb-splash">
        <div className="bb-splash-glow" />
        <img src="/logo-principal.png" alt="Border Brothers" className="bb-splash-logo" />
        <div className="bb-splash-line" />
        <p>Business Operating Platform</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={manejarLoginExitoso} />;
  }

  if (isLoggedIn && !negocioSeleccionado) {
    return (
      <SelectorNegocio
        usuarioActivo={usuarioActivo}
        rol={rol}
        onLogout={cerrarSesion}
        onSeleccionarBosse={() => {
          setNegocioSeleccionado(true);
          setSeccionSeleccionada("administracion");
          setFormularioActivo(null);
        }}
      />
    );
  }

  if (isLoggedIn && !formularioActivo) {
    return (
      <BorderBrosShell
        usuarioActivo={usuarioActivo}
        rol={rol}
        negocioNombre="BOSSE"
        seccionActiva="administracion"
        puedeVerAnalisis={puedeEntrarAnalisis(rol)}
        onAdministracion={() => {
          setSeccionSeleccionada("administracion");
          setFormularioActivo(null);
        }}
        onAnalisis={() => {
          setSeccionSeleccionada("analisis");
          setFormularioActivo("analisis_financiero");
        }}
        onMisNegocios={() => {
          setFormularioActivo(null);
          setSeccionSeleccionada(null);
          setNegocioSeleccionado(false);
        }}
        onLogout={cerrarSesion}
      >
        <MenuPrincipal
          usuarioActivo={usuarioActivo}
          rol={rol}
          onSeleccionarFormulario={seleccionarFormulario}
          onLogout={cerrarSesion}
        />
      </BorderBrosShell>
    );
  }

  if (formularioActivo === "caja") {
  return (
   <GestionCortes
  usuarioActivo={usuarioActivo}
  usuarioId={usuarioId}
  rol={rol}
  negocioId={negocioId}
  onSeleccionarTipo={seleccionarFormulario}
  onVolver={volverAlMenu}
  onEditarCorte={(corte) =>
    seleccionarFormulario("caja_editar", corte)
  }
/>
  );
}

if (formularioActivo === "caja_nuevo") {
  return (
    <CorteCaja
      usuarioActivo={usuarioActivo}
      usuarioId={usuarioId}
      negocioId={negocioId}
      onVolver={volverAlMenu}
    />
  );
}

if (formularioActivo === "caja_editar") {
  return (
    <CorteCaja
      usuarioActivo={usuarioActivo}
      usuarioId={usuarioId}
      negocioId={negocioId}
      corteEditando={corteEditando}
      modoEdicion={true}
      onVolver={() => {
        setFormularioActivo("caja");
        setCorteEditando(null);
      }}
    />
  );
}

  if (formularioActivo === "egresos") {
  return (
    <GestionEgresos
      usuarioActivo={usuarioActivo}
      usuarioId={usuarioId}
      rol={rol}
      negocioId={negocioId}
      onSeleccionarTipo={setFormularioActivo}
      onVolver={volverAlMenu}
/>
  );
}

  if (formularioActivo === "egresos_caja") {
    return (
      <EgresosEfectivo
  usuarioActivo={usuarioActivo}
  usuarioId={usuarioId}
  negocioId={negocioId}
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
  negocioId={negocioId}
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
  negocioId={negocioId}
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
  negocioId={negocioId}
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
      negocioId={negocioId}
      onVolver={volverAlMenu}
    />
  );
}

if (formularioActivo === "puestos") {
  return (
    <Puestos
      usuarioActivo={usuarioActivo}
      onVolver={() => setFormularioActivo(null)}
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

if (formularioActivo === "cambio_divisas") {
  return (
    <CambioDivisas
      usuarioActivo={usuarioActivo}
      usuarioId={usuarioId}
      negocioId={negocioId}
      onVolver={volverAlMenu}
    />
  );
}

if (formularioActivo === "analisis_financiero") {
  if (!puedeEntrarAnalisis(rol)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#FAFAF9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: "16px",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 10px 28px rgba(0,0,0,0.08)",
          }}
        >
          <h2>Acceso restringido</h2>

          <p style={{ color: "#666", lineHeight: "1.5" }}>
            Tu usuario no tiene permiso para ver el módulo de Análisis
            Financiero.
          </p>

          <button
            onClick={cerrarSesion}
            style={{
              marginTop: "18px",
              padding: "12px 24px",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Salir
          </button>
        </div>
      </div>
    );
  }

  return (
    <BorderBrosShell
      usuarioActivo={usuarioActivo}
      rol={rol}
      negocioNombre="BOSSE"
      seccionActiva="analisis"
      puedeVerAnalisis={puedeEntrarAnalisis(rol)}
      onAdministracion={() => {
        setSeccionSeleccionada("administracion");
        setFormularioActivo(null);
      }}
      onAnalisis={() => {
        setSeccionSeleccionada("analisis");
        setFormularioActivo("analisis_financiero");
      }}
      onMisNegocios={() => {
        setFormularioActivo(null);
        setSeccionSeleccionada(null);
        setNegocioSeleccionado(false);
      }}
      onLogout={cerrarSesion}
    >
      <AnalisisFinanciero
        usuarioActivo={usuarioActivo}
        usuarioId={usuarioId}
        negocioId={negocioId}
        rol={rol}
        onVolver={() => {
          setSeccionSeleccionada("administracion");
          setFormularioActivo(null);
        }}
      />
    </BorderBrosShell>
  );
}

  return null;
}

export default App;