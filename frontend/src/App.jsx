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
import ProveedorCatalogo from "./components/ProveedorCatalogo";
import SelectorNegocio from "./components/SelectorNegocio";
import "./BosseTheme.css";
import { BosseBorderBroProvider, BosseBorderBroGlobal, useBosseBorderBroActions } from './components/BosseBorderBroChat';

function AppContent() {
  const { syncApp, setPrivacy: setChatPrivacy } = useBosseBorderBroActions();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formularioActivo, setFormularioActivo] = useState(null);
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [usuarioId, setUsuarioId] = useState(null);
  const [rol, setRol] = useState(null);
  const [negocioId, setNegocioId] = useState(null);
  const [negocios,setNegocios]=useState([]);
  const [negocioNombre,setNegocioNombre]=useState("BOSSE");
  const [seccionFinanciera, setSeccionFinanciera] = useState("resumen");
  const [, setUsuario] = useState(null);
  const [mostrandoSplash, setMostrandoSplash] = useState(true);
  const [, setSeccionSeleccionada] = useState(null);
  const [corteEditando, setCorteEditando] = useState(null);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(false);
  useEffect(() => {
    syncApp({
      loggedIn: isLoggedIn,
      businessSelected: negocioSeleccionado,
      userId: usuarioId,
      businessId: negocioId,
      businessName: negocioNombre,
      role: rol,
      inBorderBro: formularioActivo === 'analisis_financiero' && seccionFinanciera === 'borderbro',
      view: formularioActivo === 'analisis_financiero'
        ? `Análisis Financiero / ${seccionFinanciera}`
        : formularioActivo ? `Administración / ${formularioActivo.replaceAll('_', ' ')}` : 'Administración / Inicio'
    });
  }, [syncApp, isLoggedIn, negocioSeleccionado, usuarioId, negocioId, negocioNombre, rol, formularioActivo, seccionFinanciera]);
  useEffect(() => {
    // Privacidad en Análisis Financiero no debe bloquear accidentalmente el chat de Administración.
    if (formularioActivo !== 'analisis_financiero') setChatPrivacy(false);
  }, [formularioActivo, setChatPrivacy]);
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
  setNegocios(usuario.negocios||[{negocio_id:usuario.negocio_id,nombre:"BOSSE",rol:usuario.rol}]);
  setFormularioActivo(null);
  setSeccionSeleccionada(null);
  setNegocioSeleccionado(false);


};

  const cerrarSesion = () => {
  const confirmar = window.confirm("¿Deseas cerrar sesión?");

  if (!confirmar) return;

  sessionStorage.removeItem('bosse_catalog_token');
  sessionStorage.removeItem('bosse_negocio');
  setIsLoggedIn(false);
  setFormularioActivo(null);
  setUsuarioActivo(null);
  setUsuario(null);
  setUsuarioId(null);
  setRol(null);
  setNegocioId(null);
  setSeccionSeleccionada(null);
  setNegocioSeleccionado(false);
  setSeccionFinanciera('resumen');
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


  // Un único shell visual para TODOS los formularios de Administración.
  // La lógica de los formularios, sesiones y permisos de API no se modifica.
  const confirmarCambioDesdeCaptura = () => {
    const capturaAbierta = [
      'caja_nuevo', 'caja_editar', 'egresos_caja', 'egresos_bancos',
      'egresos_banca', 'nomina', 'empleados', 'inversiones_socios',
      'cambio_divisas'
    ].includes(formularioActivo);
    return !capturaAbierta || window.confirm(
      '¿Cambiar de módulo? Los datos que no hayas guardado en el formulario podrían perderse.'
    );
  };
  const cambiarSeccionAdmin = (destino) => {
    const ruta = destino === 'inicio' ? null : destino;
    if (ruta === formularioActivo) return;
    if (!confirmarCambioDesdeCaptura()) return;
    setCorteEditando(null);
    setSeccionSeleccionada('administracion');
    setFormularioActivo(ruta);
  };
  const abrirAnalisisDesdeAdmin = () => {
    if (!confirmarCambioDesdeCaptura()) return;
    setSeccionSeleccionada('analisis');
    setFormularioActivo('analisis_financiero');
  };
  const cambiarNegocioDesdeAdmin = () => {
    if (!confirmarCambioDesdeCaptura()) return;
    setFormularioActivo(null);
    setSeccionSeleccionada(null);
    setNegocioSeleccionado(false);
  };
  const renderAdminEnShell = (contenido) => (
    <BorderBrosShell
      usuarioActivo={usuarioActivo}
      rol={rol}
      negocioNombre={negocioNombre}
      seccionActiva="administracion"
      adminSection={formularioActivo || 'inicio'}
      onAdminSectionChange={cambiarSeccionAdmin}
      puedeVerAnalisis={puedeEntrarAnalisis(rol)}
      onAdministracion={() => cambiarSeccionAdmin('inicio')}
      onAnalisis={abrirAnalisisDesdeAdmin}
      onMisNegocios={cambiarNegocioDesdeAdmin}
      onLogout={cerrarSesion}
    >
      {contenido}
    </BorderBrosShell>
  );

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
        negocios={negocios}
        onSeleccionarBosse={(business) => {
          setNegocioId(business.negocio_id);
          setNegocioNombre(business.nombre);
          setRol(business.rol);
          sessionStorage.setItem("bosse_negocio",String(business.negocio_id));
          setNegocioSeleccionado(true);
          setSeccionFinanciera('resumen');
          setSeccionSeleccionada("administracion");
          setSeccionFinanciera("resumen");
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
        negocioNombre={negocioNombre}
        seccionActiva="administracion"
        adminSection={formularioActivo || "inicio"}
        onAdminSectionChange={cambiarSeccionAdmin}
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

  if (formularioActivo === "catalogo") {
    return <BorderBrosShell usuarioActivo={usuarioActivo} rol={rol} negocioNombre={negocioNombre}
      seccionActiva="administracion"
        adminSection={formularioActivo || "inicio"}
        onAdminSectionChange={cambiarSeccionAdmin} puedeVerAnalisis={puedeEntrarAnalisis(rol)}
      onAdministracion={volverAlMenu} onAnalisis={()=>setFormularioActivo('analisis_financiero')}
      onMisNegocios={()=>{setFormularioActivo(null);setNegocioSeleccionado(false);}} onLogout={cerrarSesion}>
      <ProveedorCatalogo negocioId={negocioId} onVolver={volverAlMenu}/>
    </BorderBrosShell>;
  }

  if (formularioActivo === "caja") {
  return renderAdminEnShell(
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
  return renderAdminEnShell(
    <CorteCaja
      usuarioActivo={usuarioActivo}
      usuarioId={usuarioId}
      negocioId={negocioId}
      onVolver={volverAlMenu}
    />
  );
}

if (formularioActivo === "caja_editar") {
  return renderAdminEnShell(
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
  return renderAdminEnShell(
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
    return renderAdminEnShell(
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
    return renderAdminEnShell(
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
    return renderAdminEnShell(
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
    return renderAdminEnShell(
      <Nomina
  usuarioActivo={usuarioActivo}
  usuarioId={usuarioId}
  negocioId={negocioId}
  onVolver={volverAlMenu}
/>
    );
  }

  if (formularioActivo === "aprobaciones_nomina") {
  return renderAdminEnShell(
    <AprobacionesNomina
      usuarioActivo={usuarioActivo}
      usuarioId={usuarioId}
      onVolver={volverAlMenu}
    />
  );
}

  if (formularioActivo === "empleados") {
  return renderAdminEnShell(
    <Empleados
      usuarioActivo={usuarioActivo}
      usuarioId={usuarioId}
      negocioId={negocioId}
      onVolver={volverAlMenu}
    />
  );
}

if (formularioActivo === "puestos") {
  return renderAdminEnShell(
    <Puestos
      usuarioActivo={usuarioActivo}
      onVolver={() => setFormularioActivo(null)}
    />
  );
}

if (formularioActivo === "historial_nomina") {
  return renderAdminEnShell(
    <HistorialNomina
      usuarioActivo={usuarioActivo}
      onVolver={volverAlMenu}
    />
  );
}

if (formularioActivo === "inversiones_socios") {
  return renderAdminEnShell(
    <InversionesSocios
      usuarioActivo={usuarioActivo}
      usuarioId={usuarioId}
      onVolver={volverAlMenu}
    />
  );
}

if (formularioActivo === "cambio_divisas") {
  return renderAdminEnShell(
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
      negocioNombre={negocioNombre}
      seccionActiva="analisis"
      financeSection={seccionFinanciera}
      onFinanceSectionChange={setSeccionFinanciera}
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
        negocioNombre={negocioNombre}
        financeSection={seccionFinanciera}
        onFinanceSectionChange={setSeccionFinanciera}
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

function App() {
  return <BosseBorderBroProvider>
    <AppContent/>
    <BosseBorderBroGlobal/>
  </BosseBorderBroProvider>;
}

export default App;