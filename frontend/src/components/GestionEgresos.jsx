import React from "react";

function GestionEgresos({
  usuarioActivo,
  rol,
  onSeleccionarTipo,
  onVolver,
}) {
  const estiloBotonPrincipal = {
    padding: "14px 22px",
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  };

  const estiloBotonTipo = {
    width: "100%",
    padding: "18px",
    background: "#fff",
    color: "#111",
    border: "1px solid #dcdcdc",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "left",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f7f5",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        padding: "28px",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: "600",
                color: "#111",
              }}
            >
              Gestión de egresos
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#666",
                fontSize: "15px",
              }}
            >
              Usuario: {usuarioActivo || "Sin usuario"} | Rol: {rol || "Sin rol"}
            </p>
          </div>

          <button
            type="button"
            onClick={onVolver}
            style={{
              ...estiloBotonPrincipal,
              background: "#fff",
              color: "#111",
              border: "1px solid #111",
            }}
          >
            ← Volver al menú
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: "14px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  color: "#111",
                }}
              >
                Registrar nuevo egreso
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#777",
                  fontSize: "14px",
                }}
              >
                Selecciona el tipo de egreso que deseas capturar.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <button
              type="button"
              onClick={() => onSeleccionarTipo("egresos_caja")}
              style={estiloBotonTipo}
            >
              <div style={{ fontSize: "17px", marginBottom: "6px" }}>
                Efectivo
              </div>
              <div style={{ fontSize: "13px", color: "#777", fontWeight: "400" }}>
                Egresos pagados directamente desde caja.
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSeleccionarTipo("egresos_bancos")}
              style={estiloBotonTipo}
            >
              <div style={{ fontSize: "17px", marginBottom: "6px" }}>
                Bancos
              </div>
              <div style={{ fontSize: "13px", color: "#777", fontWeight: "400" }}>
                Movimientos realizados desde cuentas bancarias.
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSeleccionarTipo("egresos_banca")}
              style={estiloBotonTipo}
            >
              <div style={{ fontSize: "17px", marginBottom: "6px" }}>
                Banca
              </div>
              <div style={{ fontSize: "13px", color: "#777", fontWeight: "400" }}>
                Operaciones registradas desde banca electrónica.
              </div>
            </button>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "20px",
              color: "#111",
            }}
          >
            Movimientos registrados
          </h2>

          <p
            style={{
              margin: 0,
              color: "#777",
              fontSize: "14px",
            }}
          >
            Aquí agregaremos el listado unificado, los filtros y las acciones de
            consulta y edición.
          </p>
        </div>
      </div>
    </div>
  );
}

export default GestionEgresos;