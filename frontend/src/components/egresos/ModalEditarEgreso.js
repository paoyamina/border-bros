import React, { useEffect, useState } from "react";

const formularioInicial = {
  fecha: "",
  tipo_egreso: "efectivo",
  divisa: "MXN",
  tipo_cambio: "1",
  monto_original: "",
  monto_mxn: "",
  categoria_id: "",
  proveedor_id: "",
  concepto: "",
  referencia: "",
  estatus: "REGISTRADO",
};

function obtenerFechaParaInput(fecha) {
  if (!fecha) return "";

  const texto = String(fecha);

  if (texto.includes("T")) {
    return texto.split("T")[0];
  }

  return texto.substring(0, 10);
}

function obtenerNombreCategoria(categoria) {
  return (
    categoria.nombre ||
    categoria.categoria ||
    categoria.descripcion ||
    `Categoría ${categoria.id}`
  );
}

function obtenerNombreProveedor(proveedor) {
  return (
    proveedor.nombre ||
    proveedor.razon_social ||
    proveedor.proveedor ||
    proveedor.beneficiario ||
    `Proveedor ${proveedor.id}`
  );
}

function ModalEditarEgreso({
  abierto,
  egreso,
  categorias = [],
  proveedores = [],
  usuarioId = null,
  onCerrar,
  onGuardar,
}) {
  const [formulario, setFormulario] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto || !egreso) return;

    setFormulario({
      fecha: obtenerFechaParaInput(egreso.fecha),
      tipo_egreso: egreso.tipo_egreso || "efectivo",
      divisa: egreso.divisa || "MXN",
      tipo_cambio: String(egreso.tipo_cambio ?? 1),
      monto_original: String(
        egreso.monto_original ?? egreso.monto_mxn ?? ""
      ),
      monto_mxn: String(egreso.monto_mxn ?? ""),
      categoria_id: String(egreso.categoria_id ?? ""),
      proveedor_id: String(egreso.proveedor_id ?? ""),
      concepto: egreso.concepto || "",
      referencia: egreso.referencia || "",
      estatus: egreso.estatus || "REGISTRADO",
    });

    setError("");
    setGuardando(false);
  }, [abierto, egreso]);

  if (!abierto || !egreso) return null;

  const cambiarCampo = (evento) => {
    const { name, value } = evento.target;

    setFormulario((anterior) => {
      const actualizado = {
        ...anterior,
        [name]: value,
      };

      if (name === "divisa" && value === "MXN") {
        actualizado.tipo_cambio = "1";
        actualizado.monto_mxn = actualizado.monto_original;
      }

      if (name === "monto_original" && actualizado.divisa === "MXN") {
        actualizado.monto_mxn = value;
      }

      if (
        (name === "monto_original" || name === "tipo_cambio") &&
        actualizado.divisa !== "MXN"
      ) {
        const montoOriginal = Number(actualizado.monto_original);
        const tipoCambio = Number(actualizado.tipo_cambio);

        if (
          Number.isFinite(montoOriginal) &&
          Number.isFinite(tipoCambio)
        ) {
          actualizado.monto_mxn = (
            montoOriginal * tipoCambio
          ).toFixed(2);
        }
      }

      return actualizado;
    });
  };

  const validarFormulario = () => {
    if (!formulario.fecha) {
      return "La fecha es obligatoria.";
    }

    if (!formulario.tipo_egreso) {
      return "El tipo de egreso es obligatorio.";
    }

    if (!formulario.categoria_id) {
      return "La categoría es obligatoria.";
    }

    if (!formulario.proveedor_id) {
      return "El proveedor o beneficiario es obligatorio.";
    }

    if (!formulario.concepto.trim()) {
      return "El concepto es obligatorio.";
    }

    const montoOriginal = Number(formulario.monto_original);
    const montoMxn = Number(formulario.monto_mxn);
    const tipoCambio = Number(formulario.tipo_cambio);

    if (!Number.isFinite(montoOriginal) || montoOriginal <= 0) {
      return "El monto debe ser mayor que cero.";
    }

    if (!Number.isFinite(montoMxn) || montoMxn <= 0) {
      return "El monto en MXN debe ser mayor que cero.";
    }

    if (!Number.isFinite(tipoCambio) || tipoCambio <= 0) {
      return "El tipo de cambio debe ser mayor que cero.";
    }

    return "";
  };

  const guardarCambios = async (evento) => {
    evento.preventDefault();

    const mensajeValidacion = validarFormulario();

    if (mensajeValidacion) {
      setError(mensajeValidacion);
      return;
    }

    setGuardando(true);
    setError("");

    try {
      await onGuardar({
        fecha: formulario.fecha,
        tipo_egreso: formulario.tipo_egreso,
        divisa: formulario.divisa,
        tipo_cambio: Number(formulario.tipo_cambio),
        monto_original: Number(formulario.monto_original),
        monto_mxn: Number(formulario.monto_mxn),
        categoria_id: Number(formulario.categoria_id),
        proveedor_id: Number(formulario.proveedor_id),
        concepto: formulario.concepto.trim(),
        referencia: formulario.referencia.trim() || null,
        estatus: formulario.estatus || "REGISTRADO",
        usuario_edita_id: usuarioId || null,
      });
    } catch (errorGuardado) {
      console.error("Error editando egreso:", errorGuardado);

      setError(
        errorGuardado.message ||
          "No fue posible guardar los cambios."
      );
    } finally {
      setGuardando(false);
    }
  };

  const estiloCampo = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d8d8d8",
    borderRadius: "8px",
    background: "#fff",
    fontSize: "14px",
    color: "#222",
  };

  const estiloEtiqueta = {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#333",
  };

  const estiloGrupo = {
    minWidth: 0,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-editar-egreso"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.48)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !guardando) {
          onCerrar();
        }
      }}
    >
      <form
        onSubmit={guardarCambios}
        style={{
          width: "100%",
          maxWidth: "780px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: "14px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "#fff",
            padding: "20px 22px",
            borderBottom: "1px solid #e7e7e7",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div>
            <h2
              id="titulo-editar-egreso"
              style={{
                margin: 0,
                fontSize: "21px",
                color: "#111",
              }}
            >
              Editar egreso
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#777",
                fontSize: "13px",
              }}
            >
              Movimiento #{egreso.id}
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "1px solid #ddd",
              background: "#fff",
              cursor: guardando ? "not-allowed" : "pointer",
              fontSize: "22px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "22px" }}>
          {error && (
            <div
              style={{
                marginBottom: "18px",
                padding: "12px",
                background: "#fdeaea",
                border: "1px solid #efb8b8",
                borderRadius: "8px",
                color: "#9d1c1c",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <div style={estiloGrupo}>
              <label style={estiloEtiqueta}>
                Fecha *
              </label>

              <input
                type="date"
                name="fecha"
                value={formulario.fecha}
                onChange={cambiarCampo}
                style={estiloCampo}
                required
              />
            </div>

            <div style={estiloGrupo}>
              <label style={estiloEtiqueta}>
                Tipo de egreso *
              </label>

              <select
                name="tipo_egreso"
                value={formulario.tipo_egreso}
                onChange={cambiarCampo}
                style={estiloCampo}
                required
              >
                <option value="efectivo">Efectivo</option>
                <option value="bancos">Bancos</option>
                <option value="banca">Banca</option>
              </select>
            </div>

            <div style={estiloGrupo}>
              <label style={estiloEtiqueta}>
                Categoría *
              </label>

              <select
                name="categoria_id"
                value={formulario.categoria_id}
                onChange={cambiarCampo}
                style={estiloCampo}
                required
              >
                <option value="">Selecciona una categoría</option>

                {categorias.map((categoria) => (
                  <option
                    key={categoria.id}
                    value={categoria.id}
                  >
                    {obtenerNombreCategoria(categoria)}
                  </option>
                ))}
              </select>
            </div>

            <div style={estiloGrupo}>
              <label style={estiloEtiqueta}>
                Proveedor o beneficiario *
              </label>

              <select
                name="proveedor_id"
                value={formulario.proveedor_id}
                onChange={cambiarCampo}
                style={estiloCampo}
                required
              >
                <option value="">
                  Selecciona un proveedor
                </option>

                {proveedores.map((proveedor) => (
                  <option
                    key={proveedor.id}
                    value={proveedor.id}
                  >
                    {obtenerNombreProveedor(proveedor)}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                ...estiloGrupo,
                gridColumn: "1 / -1",
              }}
            >
              <label style={estiloEtiqueta}>
                Concepto *
              </label>

              <input
                type="text"
                name="concepto"
                value={formulario.concepto}
                onChange={cambiarCampo}
                style={estiloCampo}
                maxLength={250}
                required
              />
            </div>

            <div
              style={{
                ...estiloGrupo,
                gridColumn: "1 / -1",
              }}
            >
              <label style={estiloEtiqueta}>
                Referencia
              </label>

              <input
                type="text"
                name="referencia"
                value={formulario.referencia}
                onChange={cambiarCampo}
                style={estiloCampo}
                maxLength={250}
              />
            </div>

            <div style={estiloGrupo}>
              <label style={estiloEtiqueta}>
                Divisa *
              </label>

              <select
                name="divisa"
                value={formulario.divisa}
                onChange={cambiarCampo}
                style={estiloCampo}
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div style={estiloGrupo}>
              <label style={estiloEtiqueta}>
                Tipo de cambio *
              </label>

              <input
                type="number"
                name="tipo_cambio"
                value={formulario.tipo_cambio}
                onChange={cambiarCampo}
                style={estiloCampo}
                min="0.0001"
                step="0.0001"
                disabled={formulario.divisa === "MXN"}
              />
            </div>

            <div style={estiloGrupo}>
              <label style={estiloEtiqueta}>
                Monto original *
              </label>

              <input
                type="number"
                name="monto_original"
                value={formulario.monto_original}
                onChange={cambiarCampo}
                style={estiloCampo}
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div style={estiloGrupo}>
              <label style={estiloEtiqueta}>
                Monto MXN *
              </label>

              <input
                type="number"
                name="monto_mxn"
                value={formulario.monto_mxn}
                onChange={cambiarCampo}
                style={{
                  ...estiloCampo,
                  background: "#f5f5f5",
                }}
                min="0.01"
                step="0.01"
                readOnly
                required
              />
            </div>
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: "#fff",
            borderTop: "1px solid #e7e7e7",
            padding: "16px 22px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            style={{
              padding: "11px 18px",
              background: "#fff",
              color: "#222",
              border: "1px solid #bbb",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: guardando ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando}
            style={{
              padding: "11px 18px",
              background: guardando ? "#777" : "#111",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: guardando ? "not-allowed" : "pointer",
            }}
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ModalEditarEgreso;