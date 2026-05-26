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
        idCajero: userCredentials.idCajero,
      });
    } catch (error) {
      console.error("Error en login:", error);
      alert("🚨 Error de conexión. El servidor no responde.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: "420px",
          background: "#fff",
          borderRadius: "12px",
          padding: "48px 42px 38px",
          textAlign: "center",
          boxShadow: "0 4px 15px rgba(0,0,0,0.12)",
        }}
      >
        <img
          src="/Logo_BOSSE.png"
          alt="BOSSE"
          style={{
            width: "260px",
            maxWidth: "100%",
            margin: "0 auto 22px",
            display: "block",
          }}
        />

        <h2
          style={{
            fontSize: "25px",
            letterSpacing: "4px",
            fontWeight: "300",
            margin: "0 0 22px",
            textTransform: "uppercase",
            color: "#111",
          }}
        >
          Acceso Staff
        </h2>

        <form onSubmit={manejarLogin}>
          <input
            type="text"
            placeholder="ID DE USUARIO"
            value={userCredentials.idCajero}
            onChange={(e) =>
              setUserCredentials({
                ...userCredentials,
                idCajero: e.target.value.toUpperCase(),
              })
            }
            style={{
              width: "100%",
              height: "42px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              marginBottom: "15px",
              textAlign: "center",
              fontSize: "14px",
              letterSpacing: "0.5px",
              outline: "none",
              boxSizing: "border-box",
              color: "#333",
            }}
          />

          <input
            type="password"
            placeholder="CONTRASEÑA"
            value={userCredentials.password}
            onChange={(e) =>
              setUserCredentials({
                ...userCredentials,
                password: e.target.value,
              })
            }
            style={{
              width: "100%",
              height: "42px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              marginBottom: "22px",
              textAlign: "center",
              fontSize: "14px",
              letterSpacing: "0.5px",
              outline: "none",
              boxSizing: "border-box",
              color: "#333",
            }}
          />

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "20px",
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "4px",
              cursor: "pointer",
            }}
          >
            Entrar
          </button>
        </form>

        <p
          style={{
            marginTop: "24px",
            fontSize: "12px",
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          Tijuana, B.C.
        </p>
      </div>
    </div>
  );
}

export default Login;