import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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

  // ============================================================
  // FORMATOS
  // ============================================================

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

  // ============================================================
  // CARGAR CORTES + HISTORIAL
  // ============================================================

  const cargarDatos = useCallback(async () => {
    if (!negocioId) return;

    try {
      setCargando(true);

      const [
        respuestaCortes,
        respuestaHistorial,
      ] = await Promise.all([
        fetch(
          `${API_BASE_URL}/api/cambios-divisa/cortes-disponibles?negocio_id=${negocioId}`
        ),

        fetch(
          `${API_BASE_URL}/api/cambios-divisa?negocio_id=${negocioId}`
        ),
      ]);

      const resultadoCortes =
        await respuestaCortes.json();

      const resultadoHistorial =
        await respuestaHistorial.json();

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

      setCortes(
        resultadoCortes.cortes || []
      );

      setHistorial(
        resultadoHistorial.cambios || []
      );
    } catch (error) {
      alert(
        "🚨 Error cargando Cambio de Divisas: " +
          error.message
      );
    } finally {
      setCargando(false);
    }
  }, [negocioId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ============================================================
  // CORTES SELECCIONADOS
  // ============================================================

  const cortesSeleccionados = useMemo(() => {
    return cortes
      .map((corte) => ({
        corte_id: Number(corte.corte_id),

        monto_usd:
          Number(
            asignaciones[corte.corte_id]
          ) || 0,
      }))

      .filter(
        (item) => item.monto_usd > 0
      );
  }, [cortes, asignaciones]);

  // ============================================================
  // TOTAL USD
  // ============================================================

  const totalUsd = useMemo(
    () =>
      cortesSeleccionados.reduce(
        (total, item) =>
          total + item.monto_usd,
        0
      ),
    [cortesSeleccionados]
  );

  // ============================================================
  // MXN CALCULADOS
  // ============================================================

  const mxnCalculado =
    totalUsd > 0 &&
    Number(tipoCambio) > 0
      ? totalUsd * Number(tipoCambio)
      : 0;

  // ============================================================
  // CAMBIAR ASIGNACIÓN DE CORTE
  // ============================================================

  const cambiarAsignacion = (
    corte,
    valor
  ) => {
    const numero = Number(valor);

    if (numero < 0) return;

    const disponible =
      Number(
        corte.usd_disponibles
      ) || 0;

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

  // ============================================================
  // USAR TODO EL SALDO DE UN CORTE
  // ============================================================

  const usarTodo = (corte) => {
    setAsignaciones((prev) => ({
      ...prev,

      [corte.corte_id]:
        Number(
          corte.usd_disponibles
        ),
    }));
  };

  // ============================================================
  // LIMPIAR FORMULARIO
  // ============================================================

  const limpiarFormulario = () => {
    setAsignaciones({});
    setTipoCambio("");
    setMontoDestino("");
    setCasaCambio("");
    setComentarios("");

    setFecha(
      new Date()
        .toISOString()
        .split("T")[0]
    );
  };

  // ============================================================
  // GUARDAR CAMBIO
  // ============================================================

  const guardarCambio = async () => {
    if (totalUsd <= 0) {
      alert(
        "Debes seleccionar dólares de al menos un corte."
      );

      return;
    }

    if (
      !Number(tipoCambio) ||
      Number(tipoCambio) <= 0
    ) {
      alert(
        "Debes ingresar un tipo de cambio válido."
      );

      return;
    }

    const destinoFinal =
      Number(montoDestino) > 0
        ? Number(montoDestino)
        : Number(
            mxnCalculado.toFixed(2)
          );

    if (destinoFinal <= 0) {
      alert(
        "El monto recibido en MXN debe ser mayor a cero."
      );

      return;
    }

    const confirmar =
      window.confirm(
        `¿Registrar cambio de ${formatoMoneda(
          totalUsd,
          "USD"
        )} por ${formatoMoneda(
          destinoFinal,
          "MXN"
        )}?`
      );

    if (!confirmar) return;

    try {
      setGuardando(true);

      const respuesta = await fetch(
        `${API_BASE_URL}/api/cambios-divisa`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            negocio_id: negocioId,

            fecha,

            monto_origen:
              totalUsd,

            tipo_cambio:
              Number(tipoCambio),

            monto_destino:
              destinoFinal,

            casa_cambio:
              casaCambio.trim() ||
              null,

            comentarios:
              comentarios.trim() ||
              null,

            usuario_crea_id:
              usuarioId,

            cortes:
              cortesSeleccionados,
          }),
        }
      );

      const resultado =
        await respuesta.json();

      if (!resultado.success) {
        throw new Error(
          resultado.error ||
            "No fue posible registrar el cambio."
        );
      }

      alert(
        "✅ Cambio de divisas registrado."
      );

      limpiarFormulario();

      await cargarDatos();
    } catch (error) {
      alert(
        "🚨 Error: " +
          error.message
      );
    } finally {
      setGuardando(false);
    }
  };

  // ============================================================
  // CANCELAR CAMBIO
  // ============================================================

  const cancelarCambio = async (
    cambio
  ) => {
    if (
      cambio.estatus ===
      "CANCELADO"
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        `¿Cancelar el cambio #${cambio.id}?\n\n` +
          "Los USD utilizados volverán a quedar disponibles."
      );

    if (!confirmar) return;

    try {
      const respuesta =
        await fetch(
          `${API_BASE_URL}/api/cambios-divisa/${cambio.id}/cancelar`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              usuario_id:
                usuarioId,
            }),
          }
        );

      const resultado =
        await respuesta.json();

      if (!resultado.success) {
        throw new Error(
          resultado.error ||
            "No fue posible cancelar el cambio."
        );
      }

      alert(
        "✅ Cambio cancelado. Los USD fueron liberados."
      );

      await cargarDatos();
    } catch (error) {
      alert(
        "🚨 Error: " +
          error.message
      );
    }
  };

  // ============================================================
  // ESTILOS
  // ============================================================

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border:
      "1px solid #D1D5DB",
    borderRadius: "6px",
    background: "#fff",
  };

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    color: "#666",
    marginBottom: "6px",
    textTransform:
      "uppercase",
    letterSpacing: "1px",
  };

  const thStyle = {
    padding: "12px",
    textAlign: "left",
    fontSize: "12px",
    textTransform:
      "uppercase",
    letterSpacing: "0.7px",
    color: "#555",
    whiteSpace: "nowrap",
  };

  // ============================================================
  // INTERFAZ
  // ============================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAFAF9",
        padding: "28px",
        fontFamily:
          '"Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: "1250px",
          margin: "0 auto",
          background: "#fff",
          padding: "32px",
          borderRadius: "10px",
          boxShadow:
            "0 4px 18px rgba(0,0,0,0.05)",
        }}
      >
        {/* VOLVER */}

        <button
          type="button"
          onClick={onVolver}
          style={{
            background:
              "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            marginBottom: "22px",
          }}
        >
          ← VOLVER
        </button>

        {/* ENCABEZADO */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
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

            <p
              style={{
                color: "#777",
              }}
            >
              Control de dólares
              provenientes de cortes
              de caja
            </p>
          </div>

          <div
            style={{
              textAlign: "right",
              color: "#777",
            }}
          >
            Operador:{" "}
            {usuarioActivo || "—"}
          </div>
        </div>

        {cargando ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#777",
            }}
          >
            Cargando información...
          </div>
        ) : (
          <>
            {/* ================================================= */}
            {/* 1. SELECCIÓN DE CORTES */}
            {/* ================================================= */}

            <h2>
              1. Selecciona los dólares a cambiar
            </h2>

            <p
              style={{
                color: "#777",
                marginTop: "-6px",
              }}
            >
              Puedes utilizar uno o varios
              cortes para realizar un mismo
              cambio.
            </p>

            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                  minWidth: "850px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom:
                        "1px solid #ddd",
                      background:
                        "#FAFAF9",
                    }}
                  >
                    <th
                      style={thStyle}
                    >
                      Fecha
                    </th>

                    <th
                      style={thStyle}
                    >
                      Corte
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign:
                          "right",
                      }}
                    >
                      USD originales
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign:
                          "right",
                      }}
                    >
                      Ya cambiados
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign:
                          "right",
                      }}
                    >
                      Disponibles
                    </th>

                    <th
                      style={thStyle}
                    >
                      USD a cambiar
                    </th>

                    <th
                      style={thStyle}
                    >
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {cortes.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        style={{
                          padding:
                            "30px",
                          textAlign:
                            "center",
                          color:
                            "#777",
                        }}
                      >
                        No hay dólares
                        disponibles en
                        cortes de caja.
                      </td>
                    </tr>
                  ) : (
                    cortes.map(
                      (corte) => (
                        <tr
                          key={
                            corte.corte_id
                          }
                          style={{
                            borderBottom:
                              "1px solid #eee",
                          }}
                        >
                          <td
                            style={{
                              padding:
                                "10px",
                            }}
                          >
                            {formatoFecha(
                              corte.fecha
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                              fontWeight:
                                "600",
                            }}
                          >
                            {corte.folio ||
                              `#${corte.corte_id}`}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                              textAlign:
                                "right",
                            }}
                          >
                            {formatoMoneda(
                              corte.usd_originales,
                              "USD"
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                              textAlign:
                                "right",
                            }}
                          >
                            {formatoMoneda(
                              corte.usd_cambiados,
                              "USD"
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                              textAlign:
                                "right",
                              fontWeight:
                                "700",
                            }}
                          >
                            {formatoMoneda(
                              corte.usd_disponibles,
                              "USD"
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                asignaciones[
                                  corte
                                    .corte_id
                                ] ?? ""
                              }
                              onChange={(
                                e
                              ) =>
                                cambiarAsignacion(
                                  corte,
                                  e
                                    .target
                                    .value
                                )
                              }
                              style={{
                                ...inputStyle,
                                minWidth:
                                  "120px",
                              }}
                            />
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                usarTodo(
                                  corte
                                )
                              }
                              style={{
                                padding:
                                  "8px 12px",
                                background:
                                  "#fff",
                                border:
                                  "1px solid #111",
                                borderRadius:
                                  "6px",
                                cursor:
                                  "pointer",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              Usar todo
                            </button>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* TOTAL USD */}

            <div
              style={{
                marginTop: "24px",
                padding: "20px",
                background:
                  "#F5F5F3",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#777",
                  letterSpacing:
                    "1px",
                }}
              >
                TOTAL USD
                SELECCIONADOS
              </div>

              <div
                style={{
                  fontSize: "32px",
                  marginTop: "5px",
                  fontWeight: "600",
                }}
              >
                {formatoMoneda(
                  totalUsd,
                  "USD"
                )}
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontSize: "13px",
                  color: "#777",
                }}
              >
                {
                  cortesSeleccionados.length
                }{" "}
                corte(s) utilizado(s)
              </div>
            </div>

            {/* ================================================= */}
            {/* 2. DATOS CAMBIO */}
            {/* ================================================= */}

            <h2
              style={{
                marginTop: "35px",
              }}
            >
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
                <label
                  style={
                    labelStyle
                  }
                >
                  Fecha
                </label>

                <input
                  type="date"
                  value={fecha}
                  onChange={(e) =>
                    setFecha(
                      e.target.value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Tipo de cambio
                </label>

                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={
                    tipoCambio
                  }
                  onChange={(e) =>
                    setTipoCambio(
                      e.target.value
                    )
                  }
                  placeholder="Ej. 18.4000"
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  MXN calculados
                </label>

                <input
                  value={mxnCalculado.toFixed(
                    2
                  )}
                  readOnly
                  style={{
                    ...inputStyle,
                    background:
                      "#F3F4F6",
                  }}
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  MXN realmente recibidos
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    montoDestino
                  }
                  onChange={(e) =>
                    setMontoDestino(
                      e.target.value
                    )
                  }
                  placeholder={mxnCalculado.toFixed(
                    2
                  )}
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Casa de cambio
                </label>

                <input
                  value={
                    casaCambio
                  }
                  onChange={(e) =>
                    setCasaCambio(
                      e.target.value
                    )
                  }
                  placeholder="Opcional"
                  style={
                    inputStyle
                  }
                />
              </div>
            </div>

            <div
              style={{
                marginTop: "18px",
              }}
            >
              <label
                style={labelStyle}
              >
                Comentarios
              </label>

              <textarea
                value={
                  comentarios
                }
                onChange={(e) =>
                  setComentarios(
                    e.target.value
                  )
                }
                placeholder="Observaciones del cambio..."
                rows="3"
                style={{
                  ...inputStyle,
                  resize:
                    "vertical",
                }}
              />
            </div>

            {/* GUARDAR */}

            <div
              style={{
                marginTop: "24px",
                display: "flex",
                justifyContent:
                  "flex-end",
              }}
            >
              <button
                type="button"
                disabled={
                  guardando
                }
                onClick={
                  guardarCambio
                }
                style={{
                  padding:
                    "14px 28px",
                  background:
                    "#000",
                  color: "#fff",
                  border: "none",
                  borderRadius:
                    "6px",
                  cursor:
                    guardando
                      ? "not-allowed"
                      : "pointer",
                  fontWeight:
                    "700",
                  letterSpacing:
                    "1px",
                  opacity:
                    guardando
                      ? 0.65
                      : 1,
                }}
              >
                {guardando
                  ? "GUARDANDO..."
                  : "REGISTRAR CAMBIO"}
              </button>
            </div>

            {/* ================================================= */}
            {/* 3. HISTORIAL */}
            {/* ================================================= */}

            <h2
              style={{
                marginTop: "50px",
              }}
            >
              3. Historial de cambios
            </h2>

            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                  minWidth:
                    "1000px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom:
                        "1px solid #ddd",
                      background:
                        "#FAFAF9",
                    }}
                  >
                    <th
                      style={
                        thStyle
                      }
                    >
                      ID
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Fecha
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      USD
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Tipo cambio
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      MXN recibidos
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Casa cambio
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Cortes utilizados
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Estatus
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {historial.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        style={{
                          textAlign:
                            "center",
                          padding:
                            "30px",
                          color:
                            "#777",
                        }}
                      >
                        Todavía no hay
                        cambios
                        registrados.
                      </td>
                    </tr>
                  ) : (
                    historial.map(
                      (cambio) => (
                        <tr
                          key={
                            cambio.id
                          }
                          style={{
                            borderBottom:
                              "1px solid #eee",
                            opacity:
                              cambio.estatus ===
                              "CANCELADO"
                                ? 0.55
                                : 1,
                          }}
                        >
                          <td
                            style={{
                              padding:
                                "10px",
                            }}
                          >
                            {
                              cambio.id
                            }
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                            }}
                          >
                            {formatoFecha(
                              cambio.fecha
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                              fontWeight:
                                "600",
                            }}
                          >
                            {formatoMoneda(
                              cambio.monto_origen,
                              "USD"
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                            }}
                          >
                            {Number(
                              cambio.tipo_cambio ||
                                0
                            ).toFixed(
                              4
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                              fontWeight:
                                "600",
                            }}
                          >
                            {formatoMoneda(
                              cambio.monto_destino,
                              "MXN"
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                            }}
                          >
                            {cambio.casa_cambio ||
                              "—"}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                              minWidth:
                                "200px",
                            }}
                          >
                            {(cambio.cortes ||
                              [])
                              .map(
                                (
                                  c
                                ) =>
                                  `${
                                    c.folio ||
                                    `Corte ${c.corte_id}`
                                  }: ${formatoMoneda(
                                    c.monto_usd,
                                    "USD"
                                  )}`
                              )
                              .join(
                                " | "
                              ) ||
                              "—"}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                            }}
                          >
                            {
                              cambio.estatus
                            }
                          </td>

                          <td
                            style={{
                              padding:
                                "10px",
                            }}
                          >
                            {cambio.estatus !==
                            "CANCELADO" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  cancelarCambio(
                                    cambio
                                  )
                                }
                                style={{
                                  padding:
                                    "8px 12px",
                                  border:
                                    "1px solid #111",
                                  background:
                                    "#fff",
                                  borderRadius:
                                    "6px",
                                  cursor:
                                    "pointer",
                                }}
                              >
                                Cancelar
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      )
                    )
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