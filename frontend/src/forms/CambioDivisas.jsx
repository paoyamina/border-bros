import React, { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../config/api";

function CambioDivisas({
  usuarioActivo,
  usuarioId,
  negocioId,
  onVolver,
}) {
  const [cortes, setCortes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [tipoCambio, setTipoCambio] = useState("");
  const [montoDestino, setMontoDestino] = useState("");
  const [casaCambio, setCasaCambio] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [fecha, setFecha] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const formatoMoneda = (valor, moneda = "USD") =>
    Number(valor || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: moneda,
      minimumFractionDigits: 2,
    });

  const formatoFecha = (valor) => {
    if (!valor) return "—";

    return new Date(valor).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const cargarDatos = async () => {
    if (!negocioId) return;

    try {
      setCargando(true);

      const [respuestaCortes, respuestaHistorial] = await Promise.all([
        fetch(
          `${API_BASE_URL}/api/cambios-divisa/cortes-disponibles?negocio_id=${negocioId}`
        ),
        fetch(
          `${API_BASE_URL}/api/cambios-divisa?negocio_id=${negocioId}`
        ),
      ]);

      const resultadoCortes = await respuestaCortes.json();
      const resultadoHistorial = await respuestaHistorial.json();

      if (!resultadoCortes.success) {
        throw new Error(
          resultadoCortes.error ||
            "No fue posible cargar los cortes disponibles."
        );
      }

      if (!resultadoHistorial.success) {
        throw new Error(
          resultadoHistorial.error ||
            "No fue posible cargar el historial."
        );
      }

      setCortes(resultadoCortes.cortes || []);
      setHistorial(resultadoHistorial.cambios || []);
    } catch (error) {
      alert("🚨 Error cargando Cambio de Divisas: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [negocioId]);

  const cortesSeleccionados = useMemo(() => {
    return cortes
      .map((corte) => ({
        corte_id: Number(corte.corte_id),
        monto_usd: Number(asignaciones[corte.corte_id]) || 0,
      }))
      .filter((item) => item.monto_usd > 0);
  }, [cortes, asignaciones]);

  const totalUsd = useMemo(
    () =>
      cortesSeleccionados.reduce(
        (total, item) => total + item.monto_usd,
        0
      ),
    [cortesSeleccionados]
  );

  const mxnCalculado =
    totalUsd > 0 && Number(tipoCambio) > 0
      ? totalUsd * Number(tipoCambio)
      : 0;

  const cambiarAsignacion = (corte, valor) => {
    const numero = Number(valor);

    if (numero < 0) return;

    const disponible = Number(corte.usd_disponibles) || 0;

    if (numero > disponible) {
      alert(
        `Este corte solo tiene ${formatoMoneda(
          disponible,
          "USD"
        )} disponibles.`
      );
      return;
    }

    setAsignaciones((prev) => ({
      ...prev,
      [corte.corte_id]: valor,
    }));
  };

  const usarTodo = (corte) => {
    setAsignaciones((prev) => ({
      ...prev,
      [corte.corte_id]: Number(corte.usd_disponibles),
    }));
  };

  const limpiarFormulario = () => {
    setAsignaciones({});
    setTipoCambio("");
    setMontoDestino("");
    setCasaCambio("");
    setComentarios("");
    setFecha(new Date().toISOString().split("T")[0]);
  };

  const guardarCambio = async () => {
    if (totalUsd <= 0) {
      alert("Debes seleccionar dólares de al menos un corte.");
      return;
    }

    if (!Number(tipoCambio) || Number(tipoCambio) <= 0) {
      alert("Debes ingresar un tipo de cambio válido.");
      return;
    }

    const destinoFinal =
      Number(montoDestino) > 0
        ? Number(montoDestino)
        : Number(mxnCalculado.toFixed(2));

    if (destinoFinal <= 0) {
      alert("El monto recibido en MXN debe ser mayor a cero.");
      return;
    }

    const confirmar = window.confirm(
      `¿Registrar cambio de ${formatoMoneda(
        totalUsd,
        "USD"
      )} por ${formatoMoneda(destinoFinal, "MXN")}?`
    );

    if (!confirmar) return;

    try {
      setGuardando(true);

      const respuesta = await fetch(
        `${API_BASE_URL}/api/cambios-divisa`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            negocio_id: negocioId,
            fecha,
            monto_origen: totalUsd,
            tipo_cambio: Number(tipoCambio),
            monto_destino: destinoFinal,
            casa_cambio: casaCambio.trim() || null,
            comentarios: comentarios.trim() || null,
            usuario_crea_id: usuarioId,
            cortes: cortesSeleccionados,
          }),
        }
      );

      const resultado = await respuesta.json();

      if (!resultado.success) {
        throw new Error(
          resultado.error || "No fue posible registrar el cambio."
        );
      }

      alert("✅ Cambio de divisas registrado.");

      limpiarFormulario();
      await cargarDatos();
    } catch (error) {
      alert("🚨 Error: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const cancelarCambio = async (cambio) => {
    if (cambio.estatus === "CANCELADO") return;

    const confirmar = window.confirm(
      `¿Cancelar el cambio #${cambio.id}?\n\n` +
        "Los USD utilizados volverán a quedar disponibles."
    );

    if (!confirmar) return;

    try {
      const respuesta = await fetch(
        `${API_BASE_URL}/api/cambios-divisa/${cambio.id}/cancelar`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            usuario_id: usuarioId,
          }),
        }
      );

      const resultado = await respuesta.json();

      if (!resultado.success) {
        throw new Error(
          resultado.error || "No fue posible cancelar el cambio."
        );
      }

      alert("✅ Cambio cancelado. Los USD fueron liberados.");

      await cargarDatos();
    } catch (error) {
      alert("🚨 Error: " + error.message);
    }
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #D1D5DB",
    borderRadius: "6px",
    background: "#fff",
  };

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    color: "#666",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAFAF9",
        padding: "28px",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: "1250px",
          margin: "0 auto",
          background: "#fff",
          padding: "32px",
          borderRadius: "10px",
          boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
        }}
      >
        <button
          type="button"
          onClick={onVolver}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            marginBottom: "22px",
          }}
        >
          ← VOLVER
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "28px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontWeight: "300",
                letterSpacing: "3px",
              }}
            >
              CAMBIO DE DIVISAS
            </h1>

            <p style={{ color: "#777" }}>
              Control de dólares provenientes de cortes de caja
            </p>
          </div>

          <div style={{ textAlign: "right", color: "#777" }}>
            Operador: {usuarioActivo || "—"}
          </div>
        </div>

        {cargando ? (
          <p>Cargando información...</p>
        ) : (
          <>
            <h2>1. Selecciona los dólares a cambiar</h2>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "850px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <th style={{ padding: "12px", textAlign: "left" }}>
                      Fecha
                    </th>
                    <th style={{ padding: "12px", textAlign: "left" }}>
                      Corte
                    </th>
                    <th style={{ padding: "12px", textAlign: "right" }}>
                      USD originales
                    </th>
                    <th style={{ padding: "12px", textAlign: "right" }}>
                      Ya cambiados
                    </th>
                    <th style={{ padding: "12px", textAlign: "right" }}>
                      Disponibles
                    </th>
                    <th style={{ padding: "12px" }}>
                      USD a cambiar
                    </th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {cortes.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        style={{
                          padding: "25px",
                          textAlign: "center",
                          color: "#777",
                        }}
                      >
                        No hay dólares disponibles en cortes de caja.
                      </td>
                    </tr>
                  ) : (
                    cortes.map((corte) => (
                      <tr
                        key={corte.corte_id}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: "10px" }}>
                          {formatoFecha(corte.fecha)}
                        </td>

                        <td style={{ padding: "10px" }}>
                          {corte.folio}
                        </td>

                        <td
                          style={{
                            padding: "10px",
                            textAlign: "right",
                          }}
                        >
                          {formatoMoneda(
                            corte.usd_originales,
                            "USD"
                          )}
                        </td>

                        <td
                          style={{
                            padding: "10px",
                            textAlign: "right",
                          }}
                        >
                          {formatoMoneda(
                            corte.usd_cambiados,
                            "USD"
                          )}
                        </td>

                        <td
                          style={{
                            padding: "10px",
                            textAlign: "right",
                            fontWeight: "700",
                          }}
                        >
                          {formatoMoneda(
                            corte.usd_disponibles,
                            "USD"
                          )}
                        </td>

                        <td style={{ padding: "10px" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              asignaciones[corte.corte_id] ?? ""
                            }
                            onChange={(e) =>
                              cambiarAsignacion(
                                corte,
                                e.target.value
                              )
                            }
                            style={{
                              ...inputStyle,
                              minWidth: "120px",
                            }}
                          />
                        </td>

                        <td style={{ padding: "10px" }}>
                          <button
                            type="button"
                            onClick={() => usarTodo(corte)}
                          >
                            Usar todo
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: "24px",
                padding: "20px",
                background: "#F5F5F3",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#777",
                  letterSpacing: "1px",
                }}
              >
                TOTAL USD SELECCIONADOS
              </div>

              <div
                style={{
                  fontSize: "32px",
                  marginTop: "5px",
                  fontWeight: "600",
                }}
              >
                {formatoMoneda(totalUsd, "USD")}
              </div>
            </div>

            <h2 style={{ marginTop: "35px" }}>
              2. Datos del cambio
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "18px",
              }}
            >
              <div>
                <label style={labelStyle}>Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Tipo de cambio
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={tipoCambio}
                  onChange={(e) =>
                    setTipoCambio(e.target.value)
                  }
                  placeholder="Ej. 18.4000"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  MXN calculados
                </label>
                <input
                  value={mxnCalculado.toFixed(2)}
                  readOnly
                  style={{
                    ...inputStyle,
                    background: "#F3F4F6",
                  }}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  MXN realmente recibidos
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoDestino}
                  onChange={(e) =>
                    setMontoDestino(e.target.value)
                  }
                  placeholder={mxnCalculado.toFixed(2)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Casa de cambio
                </label>
                <input
                  value={casaCambio}
                  onChange={(e) =>
                    setCasaCambio(e.target.value)
                  }
                  placeholder="Opcional"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginTop: "18px" }}>
              <label style={labelStyle}>Comentarios</label>
              <textarea
                value={comentarios}
                onChange={(e) =>
                  setComentarios(e.target.value)
                }
                placeholder="Observaciones del cambio..."
                rows="3"
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            <div
              style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                disabled={guardando}
                onClick={guardarCambio}
                style={{
                  padding: "14px 28px",
                  background: "#000",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: guardando ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  letterSpacing: "1px",
                }}
              >
                {guardando
                  ? "GUARDANDO..."
                  : "REGISTRAR CAMBIO"}
              </button>
            </div>

            <h2 style={{ marginTop: "50px" }}>
              3. Historial de cambios
            </h2>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "1000px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <th style={{ padding: "10px" }}>ID</th>
                    <th style={{ padding: "10px" }}>Fecha</th>
                    <th style={{ padding: "10px" }}>USD</th>
                    <th style={{ padding: "10px" }}>
                      Tipo cambio
                    </th>
                    <th style={{ padding: "10px" }}>
                      MXN recibidos
                    </th>
                    <th style={{ padding: "10px" }}>
                      Casa cambio
                    </th>
                    <th style={{ padding: "10px" }}>
                      Cortes utilizados
                    </th>
                    <th style={{ padding: "10px" }}>
                      Estatus
                    </th>
                    <th style={{ padding: "10px" }}>
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {historial.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        style={{
                          textAlign: "center",
                          padding: "25px",
                        }}
                      >
                        Todavía no hay cambios registrados.
                      </td>
                    </tr>
                  ) : (
                    historial.map((cambio) => (
                      <tr
                        key={cambio.id}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: "10px" }}>
                          {cambio.id}
                        </td>

                        <td style={{ padding: "10px" }}>
                          {formatoFecha(cambio.fecha)}
                        </td>

                        <td style={{ padding: "10px" }}>
                          {formatoMoneda(
                            cambio.monto_origen,
                            "USD"
                          )}
                        </td>

                        <td style={{ padding: "10px" }}>
                          {Number(
                            cambio.tipo_cambio || 0
                          ).toFixed(4)}
                        </td>

                        <td style={{ padding: "10px" }}>
                          {formatoMoneda(
                            cambio.monto_destino,
                            "MXN"
                          )}
                        </td>

                        <td style={{ padding: "10px" }}>
                          {cambio.casa_cambio || "—"}
                        </td>

                        <td style={{ padding: "10px" }}>
                          {(cambio.cortes || [])
                            .map(
                              (c) =>
                                `${c.folio}: ${formatoMoneda(
                                  c.monto_usd,
                                  "USD"
                                )}`
                            )
                            .join(" | ") || "—"}
                        </td>

                        <td style={{ padding: "10px" }}>
                          {cambio.estatus}
                        </td>

                        <td style={{ padding: "10px" }}>
                          {cambio.estatus !== "CANCELADO" ? (
                            <button
                              type="button"
                              onClick={() =>
                                cancelarCambio(cambio)
                              }
                            >
                              Cancelar
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CambioDivisas;