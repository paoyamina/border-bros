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
  const [seccionSeleccionada, setSeccionSeleccionada] = useState(null);
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

  if (seccionSeleccionada === "analisis") {
    setFormularioActivo("analisis_financiero");
  } else {
    setFormularioActivo(null);
  }
};

  const cerrarSesion = () => {
  const confirmar = window.confirm("¿Deseas cerrar sesión?");

  if (!confirmar) return;

  setIsLoggedIn(false);
  setFormularioActivo(null);
  setUsuarioActivo(null);
  setUsuarioId(null);
  setRol(null);
  setSeccionSeleccionada(null);
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

if (!seccionSeleccionada) {
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
      <img
        src="/logo-principal.png"
        alt="Border Brothers"
        style={{
          width: "min(420px, 82vw)",
          height: "auto",
          marginBottom: "38px",
        }}
      />

      <h1
        style={{
          fontSize: "30px",
          margin: "0 0 10px",
          color: "#111111",
          textAlign: "center",
        }}
      >
        Bienvenido
      </h1>

      <p
        style={{
          fontSize: "16px",
          color: "#6B7280",
          marginBottom: "34px",
          textAlign: "center",
        }}
      >
        Selecciona el área a la que deseas ingresar
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "24px",
          width: "min(760px, 100%)",
        }}
      >
        <button
          onClick={() => setSeccionSeleccionada("administracion")}
          style={{
            background: "#ffffff",
            border: "1px solid #e5e5e5",
            borderRadius: "18px",
            padding: "32px 24px",
            cursor: "pointer",
            boxShadow: "0 10px 28px rgba(0,0,0,0.07)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 14px 34px rgba(0,0,0,0.11)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.07)";
          }}
        >
          <img
            src="/logo-administracion.png"
            alt="Administración"
            style={{
              width: "96px",
              height: "96px",
              objectFit: "contain",
              marginBottom: "18px",
            }}
          />

          <div
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#111111",
              marginBottom: "8px",
            }}
          >
            Administración
          </div>

          <div
            style={{
              fontSize: "14px",
              color: "#6B7280",
              lineHeight: "1.5",
            }}
          >
            Formularios, cortes, egresos, nómina e inversiones.
          </div>
        </button>

        <button
          onClick={() => setSeccionSeleccionada("analisis")}
          style={{
            background: "#ffffff",
            border: "1px solid #e5e5e5",
            borderRadius: "18px",
            padding: "32px 24px",
            cursor: "pointer",
            boxShadow: "0 10px 28px rgba(0,0,0,0.07)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 14px 34px rgba(0,0,0,0.11)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.07)";
          }}
        >
          <img
            src="/logo-analisis.png"
            alt="Análisis"
            style={{
              width: "96px",
              height: "96px",
              objectFit: "contain",
              marginBottom: "18px",
            }}
          />

          <div
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#111111",
              marginBottom: "8px",
            }}
          >
            Análisis
          </div>

          <div
            style={{
              fontSize: "14px",
              color: "#6B7280",
              lineHeight: "1.5",
            }}
          >
            Indicadores, gráficas, utilidad y distribución de socios.
          </div>
        </button>
      </div>
    </div>
  );
}

if (!isLoggedIn) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAFAF9",
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={() => setSeccionSeleccionada(null)}
        style={{
          position: "fixed",
          top: "22px",
          left: "22px",
          zIndex: 20,
          padding: "10px 18px",
          background: "#ffffff",
          color: "#111111",
          border: "1px solid #d6d6d6",
          borderRadius: "999px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "600",
          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        }}
      >
        ← Cambiar área
      </button>

      <Login onLogin={manejarLoginExitoso} />
    </div>
  );
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
      onVolver={
        seccionSeleccionada === "analisis" ? cerrarSesion : volverAlMenu
      }
    />
  );
}

  return null;
}

export default App;