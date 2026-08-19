import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import API_BASE_URL from "../config/api";

function AnalisisFinanciero({
  usuarioActivo,
  usuarioId,
  negocioId,
  rol,
  onVolver,
}) {
  // ============================================================
  // FECHAS
  // ============================================================

  const hoy = new Date();

  const hoyISO = hoy.toISOString().split("T")[0];

  const primerDiaMes = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    1
  )
    .toISOString()
    .split("T")[0];

  // ============================================================
  // ESTADO
  // ============================================================

  const [fechaInicio, setFechaInicio] =
    useState(primerDiaMes);

  const [fechaFin, setFechaFin] =
    useState(hoyISO);

  const [analisis, setAnalisis] =
    useState(null);

  const [cargando, setCargando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [vista, setVista] =
    useState("resumen");

  const [busqueda, setBusqueda] =
    useState("");

  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState("");

  const [semanaSeleccionada, setSemanaSeleccionada] =
    useState(null);

    const [nivelGrafica, setNivelGrafica] =
  useState("periodo");

const [diaSeleccionado, setDiaSeleccionado] =
  useState(null);

  // ============================================================
  // FORMATO
  // ============================================================

  const formatoMoneda = (valor) =>
    Number(valor || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatoPorcentaje = (valor) => {
    if (
      valor === null ||
      valor === undefined ||
      Number.isNaN(Number(valor))
    ) {
      return "—";
    }

    return `${Number(valor).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;
  };

  const formatoVariacion = (valor) => {
  if (
    valor === null ||
    valor === undefined ||
    Number.isNaN(Number(valor))
  ) {
    return "Sin comparación";
  }

  const numero = Number(valor);

  if (numero === 0) {
    return "0.00%";
  }

  return `${numero > 0 ? "↑" : "↓"} ${Math.abs(numero).toLocaleString(
    "es-MX",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}%`;
};

const formatoPuntosPorcentuales = (valor) => {
  if (
    valor === null ||
    valor === undefined ||
    Number.isNaN(Number(valor))
  ) {
    return "Sin comparación";
  }

  const numero = Number(valor);

  if (numero === 0) {
    return "0.00 pp";
  }

  return `${numero > 0 ? "↑" : "↓"} ${Math.abs(numero).toLocaleString(
    "es-MX",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )} pp`;
};

const descripcionComparacion = () => {
  const anterior =
    comparacion?.periodo_anterior;

  if (!anterior) {
    return "";
  }

  return `${comparacion.descripcion || "Periodo anterior"}: ${formatoFecha(
    anterior.fecha_inicio
  )} — ${formatoFecha(anterior.fecha_fin)}`;
};

const tooltipCambioEgresos = () => {
  const cambios =
    comparacion?.principales_cambios_egresos || [];

  if (cambios.length === 0) {
    return descripcionComparacion();
  }

  const detalle = cambios
    .slice(0, 3)
    .map((item) => {
      const signo =
        Number(item.diferencia) > 0 ? "+" : "";

      return `${item.categoria}: ${signo}${formatoMoneda(
        item.diferencia
      )}`;
    })
    .join("\n");

  return `${descripcionComparacion()}\n\nPrincipales cambios:\n${detalle}`;
};

  const formatoFecha = (fecha) => {
    if (!fecha) return "—";

    const fechaTexto =
      String(fecha).split("T")[0];

    const [anio, mes, dia] =
      fechaTexto.split("-");

    if (!anio || !mes || !dia) {
      return fechaTexto;
    }

    return `${dia}/${mes}/${anio}`;
  };

  const formatoFechaCorta = (fecha) => {
    if (!fecha) return "—";

    const d = new Date(
      `${String(fecha).split("T")[0]}T12:00:00`
    );

    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    });
  };

  // ============================================================
  // CARGAR DATOS
  // ============================================================

  const cargarAnalisis = useCallback(async () => {
    if (!negocioId) {
      setError(
        "No se encontró el negocio asociado al usuario."
      );
      return;
    }

    try {
      setCargando(true);
      setError("");

      const params = new URLSearchParams({
        negocio_id: negocioId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });

      const respuesta = await fetch(
        `${API_BASE_URL}/api/analisis-financiero?${params.toString()}`
      );

      const resultado =
        await respuesta.json();

      if (!respuesta.ok || !resultado.success) {
        throw new Error(
          resultado.error ||
            "No se pudo cargar el análisis financiero."
        );
      }

      setAnalisis(resultado);
    } catch (err) {
      console.error(
        "Error cargando análisis financiero:",
        err
      );

      setError(
        err.message ||
          "No fue posible cargar el análisis."
      );
    } finally {
      setCargando(false);
    }
  }, [
    negocioId,
    fechaInicio,
    fechaFin,
  ]);

  useEffect(() => {
    cargarAnalisis();
  }, [cargarAnalisis]);

  // ============================================================
  // DATOS
  // ============================================================

  const resumen =
    analisis?.resumen || {};

  const semanas =
    analisis?.evolucion_semanal || [];

  const dias = useMemo(
  () => analisis?.evolucion_diaria || [],
  [analisis]
);

  const socios =
    analisis?.distribucion_socios || [];

  const egresosDetalle = useMemo(
  () => analisis?.egresos_detalle || [],
  [analisis]
);

  const cambiosDetalle =
    analisis?.resultado_cambiario_detalle || [];

  const prenominaReferencia =
    analisis?.prenomina_referencia || [];

  const periodo =
    analisis?.periodo || {};
    const comparacion =
  analisis?.comparacion || {};

  // ============================================================
  // FILTROS DETALLE
  // ============================================================

  const categoriasDisponibles =
    useMemo(() => {
      const nombres = new Set();

      egresosDetalle.forEach((e) => {
        if (e.categoria) {
          nombres.add(e.categoria);
        }
      });

      return Array.from(nombres).sort();
    }, [egresosDetalle]);

    const rangoSeleccionado = useMemo(() => {
  if (diaSeleccionado) {
    const fecha = String(
      diaSeleccionado.id
    ).split("T")[0];

    return {
      tipo: "dia",
      inicio: fecha,
      fin: fecha,
    };
  }

  if (semanaSeleccionada) {
    return {
      tipo: "semana",
      inicio: String(
        semanaSeleccionada.semana_inicio
      ).split("T")[0],
      fin: String(
        semanaSeleccionada.semana_fin
      ).split("T")[0],
    };
  }

  return {
    tipo: "periodo",
    inicio: fechaInicio,
    fin: fechaFin,
  };
}, [
  diaSeleccionado,
  semanaSeleccionada,
  fechaInicio,
  fechaFin,
]);


const egresosFiltrados = useMemo(() => {
  const texto =
    busqueda.trim().toLowerCase();

  return egresosDetalle.filter((egreso) => {
    const fechaFinanciera =
      String(
        egreso.fecha_financiera || ""
      ).split("T")[0];

    if (
      fechaFinanciera <
        rangoSeleccionado.inicio ||
      fechaFinanciera >
        rangoSeleccionado.fin
    ) {
      return false;
    }

    if (
      categoriaSeleccionada &&
      egreso.categoria !==
        categoriaSeleccionada
    ) {
      return false;
    }

    if (!texto) {
      return true;
    }

    const contenido = [
      egreso.categoria,
      egreso.proveedor,
      egreso.concepto,
      egreso.referencia,
      egreso.tipo_egreso,
      egreso.cuenta,
      egreso.usuario_nombre,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return contenido.includes(texto);
  });
}, [
  egresosDetalle,
  busqueda,
  categoriaSeleccionada,
  rangoSeleccionado,
]);

const categoriasFiltradas = useMemo(() => {
  const mapa = new Map();

  egresosFiltrados.forEach((egreso) => {
    const categoria =
      egreso.categoria || "Sin categoría";

    mapa.set(
      categoria,
      (mapa.get(categoria) || 0) +
        Number(egreso.monto_mxn || 0)
    );
  });

  const total = Array.from(
    mapa.values()
  ).reduce(
    (acc, valor) => acc + valor,
    0
  );

  return Array.from(mapa.entries())
    .map(([categoria, totalCategoria]) => ({
      categoria,
      total: totalCategoria,
      porcentaje:
        total > 0
          ? (totalCategoria / total) * 100
          : 0,
    }))
    .sort((a, b) => b.total - a.total);
}, [egresosFiltrados]);

const resumenSeleccion = useMemo(() => {
  const egresos = egresosFiltrados.reduce(
    (acc, egreso) =>
      acc +
      Number(egreso.monto_mxn || 0),
    0
  );

  const nomina = egresosFiltrados
    .filter((egreso) => egreso.es_nomina)
    .reduce(
      (acc, egreso) =>
        acc +
        Number(egreso.monto_mxn || 0),
      0
    );

  return {
    movimientos: egresosFiltrados.length,
    egresos,
    nomina,
    otros: egresos - nomina,
  };
}, [egresosFiltrados]);

  // ============================================================
  // MÉTRICAS DERIVADAS
  // ============================================================

  const totalNomina =
    Number(resumen.total_nomina || 0);

  const totalOperativos =
    Number(
      resumen.total_egresos_operativos || 0
    );

  const resultadoCambiario =
    Number(
      resumen.resultado_cambiario || 0
    );

  const estadoPeriodo =
    periodo.estado || "—";

  const provisional =
    estadoPeriodo === "PROVISIONAL";

    const diasSemanaSeleccionada = useMemo(() => {
  if (!semanaSeleccionada) {
    return [];
  }

  const inicio =
    String(semanaSeleccionada.semana_inicio)
      .split("T")[0];

  const fin =
    String(semanaSeleccionada.semana_fin)
      .split("T")[0];

  return dias.filter((dia) => {
    const fecha =
      String(dia.fecha_financiera)
        .split("T")[0];

    return fecha >= inicio && fecha <= fin;
  });
}, [dias, semanaSeleccionada]);

const datosGrafica =
  nivelGrafica === "periodo"
    ? semanas.map((semana) => ({
        id: semana.semana_inicio,
        etiqueta: `${formatoFechaCorta(
          semana.semana_inicio
        )}–${formatoFechaCorta(
          semana.semana_fin
        )}`,
        ingresos: Number(
          semana.ingresos || 0
        ),
        egresos: Number(
          semana.egresos || 0
        ),
        gm: Number(
          semana.gm || 0
        ),
        gpm:
          semana.gpm === null
            ? null
            : Number(semana.gpm),
        provisional:
          semana.estado_periodo ===
          "PROVISIONAL",
        original: semana,
      }))
    : diasSemanaSeleccionada.map((dia) => ({
        id: dia.fecha_financiera,
        etiqueta: formatoFechaCorta(
          dia.fecha_financiera
        ),
        ingresos: Number(
          dia.ingresos || 0
        ),
        egresos: Number(
          dia.egresos || 0
        ),
        gm: Number(
          dia.gm || 0
        ),
        gpm: Number(
          dia.gpm || 0
        ),
        provisional: false,
        original: dia,
      }));

const maximoGrafica = Math.max(
  1,
  ...datosGrafica.flatMap((item) => [
    Math.abs(item.ingresos),
    Math.abs(item.egresos),
    Math.abs(item.gm),
  ])
);

  // ============================================================
  // COMPONENTES VISUALES
  // ============================================================

  const Kpi = ({
  titulo,
  valor,
  subtitulo,
  destaque = false,
  variacion = null,
  variacionTexto = null,
  tooltip = "",
  invertirColor = false,
}) => {
  const numeroVariacion =
    variacion === null ||
    variacion === undefined
      ? null
      : Number(variacion);

  const positivo =
    numeroVariacion !== null &&
    numeroVariacion > 0;

  const negativo =
    numeroVariacion !== null &&
    numeroVariacion < 0;

  let colorVariacion =
    destaque ? "#ccc" : "#666";

  if (positivo) {
    colorVariacion = invertirColor
      ? "#b42318"
      : "#256029";
  }

  if (negativo) {
    colorVariacion = invertirColor
      ? "#256029"
      : "#b42318";
  }

  return (
    <div
      title={tooltip}
      style={{
        background: destaque
          ? "#111"
          : "#fff",
        color: destaque
          ? "#fff"
          : "#111",
        border: destaque
          ? "1px solid #111"
          : "1px solid #e7e7e7",
        borderRadius: "14px",
        padding: "18px",
        minHeight: "130px",
        boxSizing: "border-box",
        boxShadow:
          "0 2px 8px rgba(0,0,0,.035)",
        cursor: tooltip
          ? "help"
          : "default",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "1.4px",
          color: destaque
            ? "#aaa"
            : "#777",
          marginBottom: "10px",
          fontWeight: "700",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          fontSize: "27px",
          lineHeight: 1.15,
          fontWeight: "700",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {valor}
      </div>

      {variacionTexto && (
        <div
          style={{
            marginTop: "8px",
            fontSize: "12px",
            fontWeight: "700",
            color: destaque
              ? "#fff"
              : colorVariacion,
          }}
        >
          {variacionTexto}
        </div>
      )}

      {subtitulo && (
        <div
          style={{
            marginTop: "6px",
            fontSize: "11px",
            color: destaque
              ? "#aaa"
              : "#777",
          }}
        >
          {subtitulo}
        </div>
      )}
    </div>
  );
};

  const TituloSeccion = ({
    titulo,
    subtitulo,
    accion,
  }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "20px",
        alignItems: "flex-end",
        marginBottom: "16px",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: "600",
            color: "#111",
          }}
        >
          {titulo}
        </h2>

        {subtitulo && (
          <div
            style={{
              marginTop: "5px",
              fontSize: "13px",
              color: "#777",
            }}
          >
            {subtitulo}
          </div>
        )}
      </div>

      {accion}
    </div>
  );

  const GraficaFinanciera = () => {
  if (datosGrafica.length === 0) {
    return (
      <div style={estadoVacio}>
        No hay datos suficientes para graficar.
      </div>
    );
  }

  return (
    <div>
      {/* CABECERA DE NAVEGACIÓN */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "#777",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: "700",
            }}
          >
            Nivel de análisis
          </div>

          <div
            style={{
              marginTop: "4px",
              fontWeight: "700",
              fontSize: "15px",
            }}
          >
            {nivelGrafica === "periodo"
              ? `${formatoFecha(
                  fechaInicio
                )} — ${formatoFecha(
                  fechaFin
                )}`
              : `Semana ${formatoFecha(
                  semanaSeleccionada?.semana_inicio
                )} — ${formatoFecha(
                  semanaSeleccionada?.semana_fin
                )}`}
          </div>
        </div>

        {nivelGrafica === "semana" && (
          <button
            type="button"
            style={botonSecundario}
            onClick={() => {
              setNivelGrafica("periodo");
              setDiaSeleccionado(null);
            }}
          >
            ← Volver al periodo
          </button>
        )}
      </div>

      {/* LEYENDA */}

      <div
        style={{
          display: "flex",
          gap: "18px",
          flexWrap: "wrap",
          marginBottom: "14px",
          fontSize: "11px",
          color: "#666",
        }}
      >
        <span>■ Ingresos</span>
        <span>▨ Egresos</span>
        <span>● GM</span>
      </div>

      {/* GRÁFICA */}

      <div
        style={{
          overflowX: "auto",
          paddingBottom: "8px",
        }}
      >
        <div
          style={{
            minWidth: Math.max(
              700,
              datosGrafica.length * 115
            ),
            height: "330px",
            display: "flex",
            alignItems: "flex-end",
            gap: "14px",
            padding:
              "20px 10px 38px",
            borderBottom:
              "1px solid #ddd",
            boxSizing: "border-box",
          }}
        >
          {datosGrafica.map((item) => {
            const alturaIngresos =
              (Math.abs(item.ingresos) /
                maximoGrafica) *
              235;

            const alturaEgresos =
              (Math.abs(item.egresos) /
                maximoGrafica) *
              235;

            const alturaGM =
              (Math.abs(item.gm) /
                maximoGrafica) *
              235;

            const seleccionado =
              diaSeleccionado?.id === item.id;

            const tooltip = [
              item.etiqueta,
              `Ingresos: ${formatoMoneda(
                item.ingresos
              )}`,
              `Egresos: ${formatoMoneda(
                item.egresos
              )}`,
              `GM: ${formatoMoneda(
                item.gm
              )}`,
              `GPM: ${
                item.gpm === null
                  ? "Pendiente"
                  : formatoPorcentaje(
                      item.gpm
                    )
              }`,
              item.provisional
                ? "Periodo provisional"
                : "",
            ]
              .filter(Boolean)
              .join("\n");

            return (
              <div
                key={item.id}
                title={tooltip}
                onClick={() => {
                  if (
                    nivelGrafica === "periodo"
                  ) {
                    setSemanaSeleccionada(
                      item.original
                    );
                    setNivelGrafica(
                      "semana"
                    );
                    setDiaSeleccionado(
                      null
                    );
                  } else {
                    setDiaSeleccionado(
                      item
                    );
                  }
                }}
                style={{
                  flex:
                    "0 0 95px",
                  height: "270px",
                  display: "flex",
                  flexDirection:
                    "column",
                  justifyContent:
                    "flex-end",
                  alignItems:
                    "center",
                  cursor: "pointer",
                  borderRadius:
                    "9px",
                  background:
                    seleccionado
                      ? "#f4f4f4"
                      : "transparent",
                  padding:
                    "4px 5px",
                  boxSizing:
                    "border-box",
                }}
              >
                <div
                  style={{
                    height: "235px",
                    width: "100%",
                    display: "flex",
                    alignItems:
                      "flex-end",
                    justifyContent:
                      "center",
                    gap: "5px",
                  }}
                >
                  {/* INGRESOS */}

                  <div
                    style={{
                      height: `${Math.max(
                        2,
                        alturaIngresos
                      )}px`,
                      width: "20px",
                      background:
                        "#111",
                      borderRadius:
                        "4px 4px 0 0",
                    }}
                  />

                  {/* EGRESOS */}

                  <div
                    style={{
                      height: `${Math.max(
                        2,
                        alturaEgresos
                      )}px`,
                      width: "20px",
                      background:
                        "#aaa",
                      borderRadius:
                        "4px 4px 0 0",
                    }}
                  />

                  {/* GM */}

                  <div
                    style={{
                      height: `${Math.max(
                        2,
                        alturaGM
                      )}px`,
                      width: "8px",
                      background:
                        item.gm < 0
                          ? "#555"
                          : "#666",
                      borderRadius:
                        "999px 999px 0 0",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: "8px",
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "600",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {item.etiqueta}
                </div>

                {item.provisional && (
                  <div
                    style={{
                      marginTop: "3px",
                      fontSize: "8px",
                      padding: "2px 5px",
                      borderRadius:
                        "999px",
                      background:
                        "#fff3cd",
                      color: "#795a00",
                    }}
                  >
                    PROV.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DETALLE DÍA */}

      {nivelGrafica === "semana" &&
        diaSeleccionado && (
          <div
            style={{
              marginTop: "16px",
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "8px",
            }}
          >
            <div style={miniDato}>
              <span style={miniLabel}>
                Día
              </span>
              <strong>
                {formatoFecha(
                  diaSeleccionado.id
                )}
              </strong>
            </div>

            <div style={miniDato}>
              <span style={miniLabel}>
                Ingresos
              </span>
              <strong>
                {formatoMoneda(
                  diaSeleccionado.ingresos
                )}
              </strong>
            </div>

            <div style={miniDato}>
              <span style={miniLabel}>
                Egresos
              </span>
              <strong>
                {formatoMoneda(
                  diaSeleccionado.egresos
                )}
              </strong>
            </div>

            <div style={miniDato}>
              <span style={miniLabel}>
                GM
              </span>
              <strong>
                {formatoMoneda(
                  diaSeleccionado.gm
                )}
              </strong>
            </div>

            <div style={miniDato}>
              <span style={miniLabel}>
                GPM
              </span>
              <strong>
                {formatoPorcentaje(
                  diaSeleccionado.gpm
                )}
              </strong>
            </div>
          </div>
        )}
    </div>
  );
};

  // ============================================================
  // LOADING
  // ============================================================

  if (
    cargando &&
    !analisis
  ) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f7f7f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            '"Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "26px",
              fontWeight: "700",
            }}
          >
            BOSSE
          </div>

          <div
            style={{
              marginTop: "10px",
              color: "#777",
            }}
          >
            Preparando análisis financiero...
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RETURN
  // ============================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f7f5",
        fontFamily:
          '"Helvetica Neue", Helvetica, Arial, sans-serif',
        color: "#111",
      }}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e7e7e7",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "1500px",
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "25px",
                fontWeight: "700",
                letterSpacing: "-0.7px",
              }}
            >
              Análisis Financiero
            </div>

            <div
              style={{
                marginTop: "4px",
                color: "#777",
                fontSize: "13px",
              }}
            >
              BOSSE · {usuarioActivo || "Usuario"}
              {rol
                ? ` · ${rol}`
                : ""}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() =>
                setVista("resumen")
              }
              style={{
                ...botonTab,
                background:
                  vista === "resumen"
                    ? "#111"
                    : "#fff",
                color:
                  vista === "resumen"
                    ? "#fff"
                    : "#111",
              }}
            >
              Resumen ejecutivo
            </button>

            <button
              onClick={() =>
                setVista("detalle")
              }
              style={{
                ...botonTab,
                background:
                  vista === "detalle"
                    ? "#111"
                    : "#fff",
                color:
                  vista === "detalle"
                    ? "#fff"
                    : "#111",
              }}
            >
              Análisis detallado
            </button>

            <button
              onClick={onVolver}
              style={{
                ...botonTab,
                marginLeft: "6px",
              }}
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>

      <main
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
          padding: "26px 24px 60px",
        }}
      >
        {/* ====================================================
            PERIODO
        ==================================================== */}

        <section
          style={{
            ...tarjeta,
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  textTransform: "uppercase",
                  fontSize: "11px",
                  letterSpacing: "1.4px",
                  color: "#777",
                  fontWeight: "700",
                }}
              >
                Periodo analizado
              </div>

              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "650",
                  marginTop: "4px",
                }}
              >
                {formatoFecha(fechaInicio)}
                {" — "}
                {formatoFecha(fechaFin)}
              </div>

              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    padding: "5px 10px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: "700",
                    background: provisional
                      ? "#fff3cd"
                      : "#e8f5e9",
                    color: provisional
                      ? "#795a00"
                      : "#256029",
                  }}
                >
                  {estadoPeriodo}
                </span>

                {provisional && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#777",
                    }}
                  >
                    El periodo contiene semanas
                    pendientes de egresos.
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <div>
                <label style={labelFiltro}>
                  Desde
                </label>

                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) =>
                    setFechaInicio(
                      e.target.value
                    )
                  }
                  style={inputFiltro}
                />
              </div>

              <div>
                <label style={labelFiltro}>
                  Hasta
                </label>

                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) =>
                    setFechaFin(
                      e.target.value
                    )
                  }
                  style={inputFiltro}
                />
              </div>

              <button
                onClick={cargarAnalisis}
                disabled={cargando}
                style={{
                  ...botonPrincipal,
                  opacity: cargando
                    ? 0.6
                    : 1,
                }}
              >
                {cargando
                  ? "Actualizando..."
                  : "Actualizar"}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "10px",
              background: "#fff1f1",
              border: "1px solid #efc3c3",
              color: "#8a1c1c",
              marginBottom: "18px",
            }}
          >
            <strong>
              No se pudo cargar el análisis.
            </strong>

            <div
              style={{
                marginTop: "5px",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          </div>
        )}

        {/* ====================================================
            RESUMEN
        ==================================================== */}

        {vista === "resumen" && (
          <>
            {/* KPIs */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "12px",
                marginBottom: "22px",
              }}
            >
              <Kpi
  titulo="Ingresos"
  valor={formatoMoneda(
    resumen.total_ingresos
  )}
  variacion={
    comparacion?.ingresos?.porcentaje
  }
  variacionTexto={formatoVariacion(
    comparacion?.ingresos?.porcentaje
  )}
  subtitulo={descripcionComparacion()}
  tooltip={descripcionComparacion()}
/>

<Kpi
  titulo="Egresos"
  valor={formatoMoneda(
    resumen.total_egresos
  )}
  variacion={
    comparacion?.egresos?.porcentaje
  }
  variacionTexto={formatoVariacion(
    comparacion?.egresos?.porcentaje
  )}
  subtitulo={descripcionComparacion()}
  tooltip={tooltipCambioEgresos()}
  invertirColor
/>

<Kpi
  titulo="GM · Margen de Ganancia"
  valor={formatoMoneda(
    resumen.gm
  )}
  variacion={
    comparacion?.gm?.porcentaje
  }
  variacionTexto={formatoVariacion(
    comparacion?.gm?.porcentaje
  )}
  subtitulo={descripcionComparacion()}
  tooltip={descripcionComparacion()}
  destaque
/>

<Kpi
  titulo="GPM · % Margen"
  valor={formatoPorcentaje(
    resumen.gpm
  )}
  variacion={
    comparacion?.gpm?.diferencia_pp
  }
  variacionTexto={formatoPuntosPorcentuales(
    comparacion?.gpm?.diferencia_pp
  )}
  subtitulo={descripcionComparacion()}
  tooltip={descripcionComparacion()}
  destaque
/>

<Kpi
  titulo="Nómina"
  valor={formatoMoneda(
    totalNomina
  )}
  variacion={
    comparacion?.nomina?.porcentaje
  }
  variacionTexto={formatoVariacion(
    comparacion?.nomina?.porcentaje
  )}
  subtitulo={descripcionComparacion()}
  tooltip={descripcionComparacion()}
  invertirColor
/>

              <Kpi
                titulo="Otros egresos"
                valor={formatoMoneda(
                  totalOperativos
                )}
                subtitulo="Egresos sin nómina"
              />
            </div>

            {/* Semanas */}

            <section
  style={{
    ...tarjeta,
    marginBottom: "22px",
  }}
>
  <TituloSeccion
    titulo="Evolución financiera"
    subtitulo="Selecciona una semana para bajar al detalle diario."
  />

  <GraficaFinanciera />
</section>

            <section
              style={{
                ...tarjeta,
                marginBottom: "22px",
              }}
            >
              <TituloSeccion
                titulo="Calendario financiero"
                subtitulo="Semanas viernes → jueves. Selecciona una para revisar su detalle."
              />

              {semanas.length === 0 ? (
                <div style={estadoVacio}>
                  No hay semanas disponibles para
                  este periodo.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {semanas.map(
                    (semana) => {
                      const activa =
                        semanaSeleccionada
                          ?.semana_inicio ===
                        semana.semana_inicio;

                      const esProvisional =
                        semana.estado_periodo ===
                        "PROVISIONAL";

                      return (
                        <button
                          key={
                            semana.semana_inicio
                          }
                          type="button"
                          onClick={() => {
                            setSemanaSeleccionada(
                              activa
                                ? null
                                : semana
                            );

                            setVista(
                              "detalle"
                            );
                          }}
                          style={{
                            textAlign: "left",
                            background: activa
                              ? "#111"
                              : "#fff",
                            color: activa
                              ? "#fff"
                              : "#111",
                            border:
                              "1px solid #dedede",
                            borderRadius:
                              "12px",
                            padding: "14px",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "13px",
                              fontWeight:
                                "700",
                            }}
                          >
                            {formatoFechaCorta(
                              semana.semana_inicio
                            )}
                            {" — "}
                            {formatoFechaCorta(
                              semana.semana_fin
                            )}
                          </div>

                          <div
                            style={{
                              fontSize:
                                "18px",
                              fontWeight:
                                "700",
                              marginTop:
                                "10px",
                            }}
                          >
                            {formatoMoneda(
                              semana.ingresos
                            )}
                          </div>

                          <div
                            style={{
                              fontSize:
                                "11px",
                              marginTop:
                                "4px",
                              color: activa
                                ? "#bbb"
                                : "#777",
                            }}
                          >
                            Ingresos
                          </div>

                          <div
                            style={{
                              marginTop:
                                "10px",
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize:
                                  "12px",
                              }}
                            >
                              GPM{" "}
                              {semana.gpm ==
                              null
                                ? "—"
                                : formatoPorcentaje(
                                    semana.gpm
                                  )}
                            </span>

                            <span
                              style={{
                                padding:
                                  "3px 7px",
                                borderRadius:
                                  "999px",
                                fontSize:
                                  "9px",
                                fontWeight:
                                  "700",
                                background:
                                  esProvisional
                                    ? "#fff3cd"
                                    : "#e8f5e9",
                                color:
                                  esProvisional
                                    ? "#795a00"
                                    : "#256029",
                              }}
                            >
                              {
                                semana.estado_periodo
                              }
                            </span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* Dos columnas */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1.25fr) minmax(320px, .75fr)",
                gap: "18px",
                marginBottom: "22px",
              }}
            >
              {/* Categorías */}

              <section style={tarjeta}>
                <TituloSeccion
                  titulo="Egresos por categoría"
                  subtitulo="Participación de cada categoría sobre los egresos del periodo."
                />

                {categoriasFiltradas.length === 0 ? (
                  <div
                    style={estadoVacio}
                  >
                    No hay egresos para
                    mostrar.
                  </div>
                ) : (
                  <div>
                    {categoriasFiltradas.map(
                      (
                        categoria,
                        index
                      ) => {
                        const pct =
                          Number(
                            categoria.porcentaje ||
                              0
                          );

                        return (
                          <button
                            type="button"
                            key={`${categoria.categoria}-${index}`}
                            onClick={() => {
                              setCategoriaSeleccionada(
                                categoria.categoria
                              );
                              setVista(
                                "detalle"
                              );
                            }}
                            style={{
                              width:
                                "100%",
                              background:
                                "transparent",
                              border:
                                "none",
                              borderBottom:
                                "1px solid #eee",
                              padding:
                                "13px 0",
                              cursor:
                                "pointer",
                              textAlign:
                                "left",
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between",
                                gap:
                                  "15px",
                                alignItems:
                                  "center",
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                }}
                              >
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    justifyContent:
                                      "space-between",
                                    gap:
                                      "12px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight:
                                        "600",
                                    }}
                                  >
                                    {
                                      categoria.categoria
                                    }
                                  </span>

                                  <span
                                    style={{
                                      color:
                                        "#666",
                                      fontSize:
                                        "13px",
                                    }}
                                  >
                                    {formatoPorcentaje(
                                      pct
                                    )}
                                  </span>
                                </div>

                                <div
                                  style={{
                                    height:
                                      "5px",
                                    background:
                                      "#ededed",
                                    borderRadius:
                                      "999px",
                                    overflow:
                                      "hidden",
                                    marginTop:
                                      "8px",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        Math.max(
                                          0,
                                          pct
                                        )
                                      )}%`,
                                      height:
                                        "100%",
                                      background:
                                        "#111",
                                    }}
                                  />
                                </div>
                              </div>

                              <strong
                                style={{
                                  minWidth:
                                    "120px",
                                  textAlign:
                                    "right",
                                }}
                              >
                                {formatoMoneda(
                                  categoria.total
                                )}
                              </strong>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </section>

              {/* Socios */}

              <section style={tarjeta}>
                <TituloSeccion
                  titulo="Distribución por socio"
                  subtitulo="El porcentaje de participación es fijo."
                />

                {socios.length === 0 ? (
                  <div
                    style={estadoVacio}
                  >
                    No hay socios activos.
                  </div>
                ) : (
                  socios.map(
                    (socio) => (
                      <div
                        key={socio.id}
                        style={{
                          padding:
                            "13px 0",
                          borderBottom:
                            "1px solid #eee",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            gap:
                              "12px",
                          }}
                        >
                          <div>
                            <strong>
                              {
                                socio.socio
                              }
                            </strong>

                            <div
                              style={{
                                fontSize:
                                  "12px",
                                color:
                                  "#777",
                                marginTop:
                                  "3px",
                              }}
                            >
                              {formatoPorcentaje(
                                socio.porcentaje_participacion
                              )}{" "}
                              participación
                            </div>
                          </div>

                          <div
                            style={{
                              textAlign:
                                "right",
                            }}
                          >
                            <strong>
                              {formatoMoneda(
                                socio.participacion_gm
                              )}
                            </strong>
                          </div>
                        </div>

                        {Number(
                          socio.adelantos ||
                            0
                        ) > 0 && (
                          <details
                            style={{
                              marginTop:
                                "9px",
                            }}
                          >
                            <summary
                              style={{
                                cursor:
                                  "pointer",
                                fontSize:
                                  "11px",
                                color:
                                  "#777",
                              }}
                            >
                              ⚑ Movimiento
                              de adelanto
                              registrado
                            </summary>

                            <div
                              style={{
                                marginTop:
                                  "8px",
                                padding:
                                  "9px",
                                background:
                                  "#fafafa",
                                borderRadius:
                                  "8px",
                                fontSize:
                                  "12px",
                              }}
                            >
                              Adelantos:{" "}
                              <strong>
                                {formatoMoneda(
                                  socio.adelantos
                                )}
                              </strong>
                              <br />
                              Devoluciones:{" "}
                              <strong>
                                {formatoMoneda(
                                  socio.devoluciones
                                )}
                              </strong>
                              <br />
                              Saldo:{" "}
                              <strong>
                                {formatoMoneda(
                                  socio.saldo_adelantos
                                )}
                              </strong>

                              <div
                                style={{
                                  marginTop:
                                    "5px",
                                  color:
                                    "#777",
                                }}
                              >
                                Este movimiento
                                no modifica su
                                participación.
                              </div>
                            </div>
                          </details>
                        )}
                      </div>
                    )
                  )
                )}
              </section>
            </div>

            {/* Cambio divisa y prenomina */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(360px, 1fr))",
                gap: "18px",
              }}
            >
              <section style={tarjeta}>
                <TituloSeccion
                  titulo="Resultado cambiario"
                  subtitulo="Ganancia o pérdida realizada al convertir USD."
                />

                <div
                  style={{
                    fontSize: "27px",
                    fontWeight: "700",
                  }}
                >
                  {formatoMoneda(
                    resultadoCambiario
                  )}
                </div>

                {cambiosDetalle.length >
                0 ? (
                  <div
                    style={{
                      marginTop:
                        "15px",
                    }}
                  >
                    {cambiosDetalle
                      .slice(0, 5)
                      .map(
                        (cambio) => (
                          <div
                            key={
                              cambio.detalle_id
                            }
                            style={{
                              padding:
                                "9px 0",
                              borderBottom:
                                "1px solid #eee",
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              gap:
                                "12px",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize:
                                    "13px",
                                  fontWeight:
                                    "600",
                                }}
                              >
                                {cambio.corte_folio ||
                                  `Corte ${cambio.corte_id}`}
                              </div>

                              <div
                                style={{
                                  fontSize:
                                    "11px",
                                  color:
                                    "#777",
                                }}
                              >
                                {
                                  cambio.monto_usd
                                }{" "}
                                USD · TC{" "}
                                {
                                  cambio.tipo_cambio_realizado
                                }
                              </div>
                            </div>

                            <strong>
                              {formatoMoneda(
                                cambio.resultado_cambiario_mxn
                              )}
                            </strong>
                          </div>
                        )
                      )}
                  </div>
                ) : (
                  <div
                    style={{
                      ...estadoVacio,
                      marginTop: "12px",
                    }}
                  >
                    Sin cambios de divisa
                    realizados en este
                    periodo.
                  </div>
                )}
              </section>

              <section style={tarjeta}>
                <TituloSeccion
                  titulo="Referencia de prenómina"
                  subtitulo="Solo referencia. El análisis utiliza lo registrado en Egresos."
                />

                <div
                  style={{
                    fontSize: "27px",
                    fontWeight: "700",
                  }}
                >
                  {formatoMoneda(
                    totalNomina
                  )}
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "12px",
                    color: "#777",
                  }}
                >
                  Nómina contabilizada
                  mediante egresos.
                </div>

                {prenominaReferencia.length >
                  0 && (
                  <details
                    style={{
                      marginTop:
                        "14px",
                    }}
                  >
                    <summary
                      style={{
                        cursor:
                          "pointer",
                        fontSize:
                          "13px",
                        fontWeight:
                          "600",
                      }}
                    >
                      Ver prenóminas del
                      periodo
                    </summary>

                    <div
                      style={{
                        marginTop:
                          "10px",
                      }}
                    >
                      {prenominaReferencia.map(
                        (p) => (
                          <div
                            key={p.id}
                            style={{
                              padding:
                                "9px 0",
                              borderBottom:
                                "1px solid #eee",
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              gap:
                                "12px",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontWeight:
                                    "600",
                                  fontSize:
                                    "13px",
                                }}
                              >
                                Prenómina #
                                {p.id}
                              </div>

                              <div
                                style={{
                                  color:
                                    "#777",
                                  fontSize:
                                    "11px",
                                }}
                              >
                                {formatoFecha(
                                  p.fecha_inicio
                                )}{" "}
                                —{" "}
                                {formatoFecha(
                                  p.fecha_fin
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                textAlign:
                                  "right",
                              }}
                            >
                              <strong>
                                {formatoMoneda(
                                  p.total
                                )}
                              </strong>

                              <div
                                style={{
                                  fontSize:
                                    "10px",
                                  color:
                                    "#777",
                                }}
                              >
                                {
                                  p.estatus
                                }
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </details>
                )}
              </section>
            </div>
          </>
        )}

        {/* ====================================================
            ANÁLISIS DETALLADO
        ==================================================== */}

        {vista === "detalle" && (
          <>
            <section
              style={{
                ...tarjeta,
                marginBottom: "18px",
              }}
            >
              <TituloSeccion
                titulo="Análisis detallado"
                subtitulo="Explora los movimientos que forman los resultados del periodo."
                accion={
  <div
    style={{
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
    }}
  >
    {(semanaSeleccionada ||
      diaSeleccionado) && (
      <button
        type="button"
        onClick={() => {
          setSemanaSeleccionada(null);
          setDiaSeleccionado(null);
          setNivelGrafica("periodo");
        }}
        style={botonSecundario}
      >
        Limpiar selección
      </button>
    )}

    <button
      type="button"
      onClick={() => {
        setBusqueda("");
        setCategoriaSeleccionada("");
        setSemanaSeleccionada(null);
        setDiaSeleccionado(null);
        setNivelGrafica("periodo");
      }}
      style={botonSecundario}
    >
      Limpiar filtros
    </button>
  </div>
}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(240px, 2fr) minmax(190px, 1fr)",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={labelFiltro}
                  >
                    Buscar
                  </label>

                  <input
                    value={busqueda}
                    onChange={(e) =>
                      setBusqueda(
                        e.target.value
                      )
                    }
                    placeholder="Concepto, proveedor, referencia, cuenta, usuario..."
                    style={{
                      ...inputFiltro,
                      width: "100%",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={labelFiltro}
                  >
                    Categoría
                  </label>

                  <select
                    value={
                      categoriaSeleccionada
                    }
                    onChange={(e) =>
                      setCategoriaSeleccionada(
                        e.target.value
                      )
                    }
                    style={{
                      ...inputFiltro,
                      width: "100%",
                    }}
                  >
                    <option value="">
                      Todas
                    </option>

                    {categoriasDisponibles.map(
                      (categoria) => (
                        <option
                          key={
                            categoria
                          }
                          value={
                            categoria
                          }
                        >
                          {
                            categoria
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </section>

            {/* mini KPIs */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "10px",
                marginBottom: "18px",
              }}
            >
              <Kpi
  titulo="Movimientos"
  valor={resumenSeleccion.movimientos}
/>

<Kpi
  titulo="Egreso seleccionado"
  valor={formatoMoneda(
    resumenSeleccion.egresos
  )}
/>

<Kpi
  titulo="Nómina"
  valor={formatoMoneda(
    resumenSeleccion.nomina
  )}
/>

<Kpi
  titulo="Otros egresos"
  valor={formatoMoneda(
    resumenSeleccion.otros
  )}
/>
            </div>

            {/* tabla */}

            <section style={tarjeta}>
              <TituloSeccion
                titulo="Movimientos de egreso"
                subtitulo="La fecha financiera puede ser distinta a la fecha real de registro."
              />

              <div
  style={{
    marginBottom: "14px",
    padding: "10px 12px",
    background: "#f7f7f5",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#555",
  }}
>
  Mostrando:{" "}
  <strong>
    {rangoSeleccionado.tipo === "dia"
      ? `Día ${formatoFecha(
          rangoSeleccionado.inicio
        )}`
      : rangoSeleccionado.tipo === "semana"
      ? `Semana ${formatoFecha(
          rangoSeleccionado.inicio
        )} — ${formatoFecha(
          rangoSeleccionado.fin
        )}`
      : `Periodo ${formatoFecha(
          rangoSeleccionado.inicio
        )} — ${formatoFecha(
          rangoSeleccionado.fin
        )}`}
  </strong>
</div>

              {egresosFiltrados.length ===
              0 ? (
                <div style={estadoVacio}>
                  No se encontraron
                  movimientos con estos
                  filtros.
                </div>
              ) : (
                <div
                  style={{
                    overflowX:
                      "auto",
                  }}
                >
                  <table
                    style={{
                      width:
                        "100%",
                      borderCollapse:
                        "collapse",
                      minWidth:
                        "1250px",
                      fontSize:
                        "13px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background:
                            "#f7f7f5",
                        }}
                      >
                        {[
                          "Fecha registro",
                          "Periodo atribuido",
                          "Categoría",
                          "Tipo",
                          "Proveedor",
                          "Concepto",
                          "Referencia",
                          "Cuenta",
                          "Nómina",
                          "Monto",
                        ].map(
                          (
                            encabezado
                          ) => (
                            <th
                              key={
                                encabezado
                              }
                              style={{
                                padding:
                                  "11px 10px",
                                textAlign:
                                  encabezado ===
                                  "Monto"
                                    ? "right"
                                    : "left",
                                borderBottom:
                                  "1px solid #ddd",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                encabezado
                              }
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {egresosFiltrados.map(
                        (egreso) => (
                          <tr
                            key={
                              egreso.egreso_id
                            }
                          >
                            <td
                              style={
                                td
                              }
                            >
                              {formatoFecha(
                                egreso.fecha_registro
                              )}
                            </td>

                            <td
                              style={
                                td
                              }
                            >
                              <div>
                                {formatoFecha(
                                  egreso.fecha_financiera
                                )}
                              </div>

                              <div
                                style={{
                                  color:
                                    "#888",
                                  fontSize:
                                    "10px",
                                  marginTop:
                                    "2px",
                                }}
                              >
                                Semana{" "}
                                {formatoFecha(
                                  egreso.semana_inicio
                                )}{" "}
                                →{" "}
                                {formatoFecha(
                                  egreso.semana_fin
                                )}
                              </div>
                            </td>

                            <td
                              style={
                                td
                              }
                            >
                              {egreso.categoria ||
                                "Sin categoría"}
                            </td>

                            <td
                              style={
                                td
                              }
                            >
                              {
                                egreso.tipo_egreso
                              }
                            </td>

                            <td
                              style={
                                td
                              }
                            >
                              {egreso.proveedor ||
                                "—"}
                            </td>

                            <td
                              style={
                                td
                              }
                            >
                              {egreso.concepto ||
                                "—"}
                            </td>

                            <td
                              style={
                                td
                              }
                            >
                              {egreso.referencia ||
                                "—"}
                            </td>

                            <td
                              style={
                                td
                              }
                            >
                              {egreso.cuenta ||
                                "—"}
                            </td>

                            <td
                              style={
                                td
                              }
                            >
                              {egreso.es_nomina
                                ? "Sí"
                                : "No"}
                            </td>

                            <td
                              style={{
                                ...td,
                                textAlign:
                                  "right",
                                fontWeight:
                                  "700",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatoMoneda(
                                egreso.monto_mxn
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

// ============================================================
// ESTILOS
// ============================================================

const tarjeta = {
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: "14px",
  padding: "20px",
  boxShadow:
    "0 2px 8px rgba(0,0,0,.025)",
};

const botonTab = {
  border: "1px solid #d6d6d6",
  background: "#fff",
  padding: "9px 13px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};

const botonPrincipal = {
  background: "#111",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
  minHeight: "39px",
};

const botonSecundario = {
  border: "1px solid #ccc",
  background: "#fff",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};

const labelFiltro = {
  display: "block",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "1px",
  fontWeight: "700",
  color: "#666",
  marginBottom: "5px",
};

const inputFiltro = {
  border: "1px solid #d7d7d7",
  background: "#fff",
  borderRadius: "8px",
  padding: "9px 10px",
  fontSize: "13px",
  boxSizing: "border-box",
};

const estadoVacio = {
  padding: "25px",
  background: "#fafafa",
  border: "1px dashed #ddd",
  borderRadius: "10px",
  textAlign: "center",
  color: "#777",
  fontSize: "13px",
};

const td = {
  padding: "11px 10px",
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
};

const miniDato = {
  background: "#fafafa",
  border: "1px solid #e7e7e7",
  borderRadius: "9px",
  padding: "11px",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
};

const miniLabel = {
  fontSize: "9px",
  textTransform: "uppercase",
  letterSpacing: "1px",
  color: "#777",
  fontWeight: "700",
};

export default AnalisisFinanciero;