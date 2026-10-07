import React, { useState } from "react";
import { API_ENDPOINTS } from "../config/api";
import { validarLogin } from "../utils/validaciones";

function Login({ onLogin }) {
  const [userCredentials, setUserCredentials] = useState({
    idCajero: "",
    password: "",
  });

  const manejarLogin = async (e) => {
    e.preventDefault();

    const errorValidacion = validarLogin(userCredentials);

    if (errorValidacion) {
      alert(`⚠️ ${errorValidacion}`);
      return;
    }

    try {
      const respuesta = await fetch(API_ENDPOINTS.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCajero: userCredentials.idCajero,
          password: userCredentials.password,
        }),
      });

      if (!respuesta.ok) {
        throw new Error("El servidor respondió con un error.");
      }

      const datos = await respuesta.json();

      if (!datos.success) {
        alert(datos.error || "⚠️ Acceso denegado: credenciales incorrectas.");
        return;
      }

      onLogin({
  id: datos.id,
  nombre: datos.nombre,
  rol: datos.rol,
  negocio_id: datos.negocio_id,
  idCajero: userCredentials.idCajero,
});
    } catch (error) {
      console.error("Error en login:", error);
      alert("🚨 Error de conexión. El servidor no responde.");
    }
  };

  return (
    <div className="bb-login-page">
      <div className="bb-login-aurora bb-login-aurora-one" />
      <div className="bb-login-aurora bb-login-aurora-two" />

      <div className="bb-login-brand-panel">
        <div className="bb-login-brand-copy">
          <img src="/logo-principal.png" alt="Border Brothers" className="bb-login-brand-logo" />
          <div className="bb-login-kicker">BUSINESS OPERATING PLATFORM</div>
          <h1>Todos tus negocios.<br />Una sola plataforma.</h1>
          <p>Operación, finanzas e inteligencia para tomar mejores decisiones.</p>
        </div>

        <div className="bb-login-brand-footer">
          <span className="bb-status-dot" />
          Plataforma segura · Acceso autorizado
        </div>
      </div>

      <div className="bb-login-form-panel">
        <div className="bb-login-card">
          <div className="bb-login-mobile-brand">
            <img src="/logo-principal.png" alt="Border Brothers" />
          </div>

          <div className="bb-login-overline">ACCESO A BORDERBROS</div>
          <h2>Bienvenido</h2>
          <p className="bb-login-subtitle">Ingresa con tus credenciales para continuar.</p>

          <form onSubmit={manejarLogin}>
            <label className="bb-field-label" htmlFor="bb-user-id">ID de usuario</label>
            <input
              id="bb-user-id"
              className="bb-login-input"
              type="text"
              placeholder="Tu ID de usuario"
              value={userCredentials.idCajero}
              onChange={(e) =>
                setUserCredentials({
                  ...userCredentials,
                  idCajero: e.target.value.toUpperCase(),
                })
              }
            />

            <label className="bb-field-label" htmlFor="bb-password">Contraseña</label>
            <input
              id="bb-password"
              className="bb-login-input"
              type="password"
              placeholder="Tu contraseña"
              value={userCredentials.password}
              onChange={(e) =>
                setUserCredentials({
                  ...userCredentials,
                  password: e.target.value,
                })
              }
            />

            <button type="submit" className="bb-login-submit">
              Entrar a BorderBros <span>→</span>
            </button>
          </form>

          <p className="bb-login-location">Tijuana, B.C. · México</p>
        </div>
      </div>
    </div>
  );
}

export default Login;