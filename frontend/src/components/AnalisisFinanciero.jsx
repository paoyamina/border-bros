import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import API_BASE_URL from "../config/api";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

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

const [mesSeleccionado, setMesSeleccionado] =
  useState(null);

const [semanaSeleccionada, setSemanaSeleccionada] =
  useState(null);

const [nivelGrafica, setNivelGrafica] =
  useState("periodo");

const [diaSeleccionado, setDiaSeleccionado] =
  useState(null);

  const [modoGrafica, setModoGrafica] =
  useState("flujo");

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

  const resumen = useMemo(
  () => analisis?.resumen || {},
  [analisis]
);

  const semanas = useMemo(
  () => analisis?.evolucion_semanal || [],
  [analisis]
);

  const dias = useMemo(
  () => analisis?.evolucion_diaria || [],
  [analisis]
);

const meses = useMemo(() => {
  const mapa = new Map();

  dias.forEach((dia) => {
    const fechaTexto = String(
      dia.fecha_financiera || ""
    ).split("T")[0];

    if (!fechaTexto) return;

    const [anio, mes] = fechaTexto.split("-");

    if (!anio || !mes) return;

    const clave = `${anio}-${mes}`;

    if (!mapa.has(clave)) {
      mapa.set(clave, {
        id: clave,
        anio: Number(anio),
        mes: Number(mes),
        ingresos: 0,
        egresos: 0,
        nomina: 0,
      });
    }

    const acumulado = mapa.get(clave);

    acumulado.ingresos += Number(
      dia.ingresos || 0
    );

    acumulado.egresos += Number(
      dia.egresos || 0
    );

    acumulado.nomina += Number(
      dia.nomina || 0
    );
  });

  return Array.from(mapa.values())
    .map((mes) => {
      const gm =
        mes.ingresos - mes.egresos;

      const gpm =
        mes.ingresos > 0
          ? (gm / mes.ingresos) * 100
          : null;

      const fechaMes = new Date(
        mes.anio,
        mes.mes - 1,
        1
      );

      return {
        ...mes,

        etiqueta: fechaMes.toLocaleDateString(
          "es-MX",
          {
            month: "short",
            year: "numeric",
          }
        ),

        gm,
        gpm,
      };
    })
    .sort((a, b) =>
      a.id.localeCompare(b.id)
    );
}, [dias]);

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

    const comparacionNomina =
  analisis?.comparacion_nomina || {};

  const prenominaEsperada =
  Number(
    comparacionNomina.prenomina_referencia || 0
  );

const nominaRealComparacion =
  Number(
    comparacionNomina.nomina_real || 0
  );

const diferenciaNominaComparacion =
  Number(
    comparacionNomina.diferencia || 0
  );

const diferenciaNominaPct =
  comparacionNomina.diferencia_porcentaje;

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
  // DÍA
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

  // SEMANA
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

  // MES
  if (mesSeleccionado) {
    const inicio = `${mesSeleccionado.id}-01`;

    const ultimoDia = new Date(
      mesSeleccionado.anio,
      mesSeleccionado.mes,
      0
    ).getDate();

    const fin = `${mesSeleccionado.id}-${String(
      ultimoDia
    ).padStart(2, "0")}`;

    return {
      tipo: "mes",
      inicio,
      fin,
    };
  }

  // PERIODO COMPLETO
  return {
    tipo: "periodo",
    inicio: fechaInicio,
    fin: fechaFin,
  };
}, [
  diaSeleccionado,
  semanaSeleccionada,
  mesSeleccionado,
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

const datosGrafica = useMemo(() => {
  // NIVEL 1: MESES
  if (nivelGrafica === "periodo") {
    return meses.map((mes) => ({
      id: mes.id,
      etiqueta: mes.etiqueta,

      ingresos: Number(
        mes.ingresos || 0
      ),

      egresos: Number(
        mes.egresos || 0
      ),

      nomina: Number(
        mes.nomina || 0
      ),

      gm: Number(
        mes.gm || 0
      ),

      gpm:
        mes.gpm === null ||
        mes.gpm === undefined
          ? null
          : Number(mes.gpm),

      provisional: false,

      estado: null,

      original: mes,
    }));
  }

  // NIVEL 2: SEMANAS DEL MES
  if (
    nivelGrafica === "mes" &&
    mesSeleccionado
  ) {
    return semanas
      .filter((semana) => {
        const inicio = String(
          semana.semana_inicio || ""
        ).split("T")[0];

        const fin = String(
          semana.semana_fin || ""
        ).split("T")[0];

        if (!inicio || !fin) {
          return false;
        }

        const inicioMes =
          `${mesSeleccionado.id}-01`;

        const ultimoDiaMes = new Date(
          mesSeleccionado.anio,
          mesSeleccionado.mes,
          0
        )
          .toISOString()
          .split("T")[0];

        return (
          fin >= inicioMes &&
          inicio <= ultimoDiaMes
        );
      })
      .map((semana) => ({
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

        nomina: Number(
          semana.nomina || 0
        ),

        gm: Number(
          semana.gm || 0
        ),

        gpm:
          semana.gpm === null ||
          semana.gpm === undefined
            ? null
            : Number(semana.gpm),

        provisional:
          semana.estado_periodo ===
          "PROVISIONAL",

        estado:
          semana.estado_periodo,

        original: semana,
      }));
  }

  // NIVEL 3: DÍAS DE LA SEMANA
  if (
    nivelGrafica === "semana" &&
    semanaSeleccionada
  ) {
    return diasSemanaSeleccionada.map(
      (dia) => ({
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

        nomina: Number(
          dia.nomina || 0
        ),

        gm: Number(
          dia.gm || 0
        ),

        gpm:
          dia.gpm === null ||
          dia.gpm === undefined
            ? null
            : Number(dia.gpm),

        provisional: false,

        estado:
          semanaSeleccionada
            ?.estado_periodo,

        original: dia,
      })
    );
  }

  return [];
}, [
  nivelGrafica,
  meses,
  semanas,
  mesSeleccionado,
  diasSemanaSeleccionada,
  semanaSeleccionada,
]);

const metricasSeleccion = useMemo(() => {
  if (diaSeleccionado) {
    return {
      nivel: "dia",
      etiqueta: formatoFecha(
        diaSeleccionado.id
      ),
      ingresos: Number(
        diaSeleccionado.ingresos || 0
      ),
      egresos: Number(
        diaSeleccionado.egresos || 0
      ),
      nomina: Number(
        diaSeleccionado.nomina || 0
      ),
      gm: Number(
        diaSeleccionado.gm || 0
      ),
      gpm:
        diaSeleccionado.gpm === null ||
        diaSeleccionado.gpm === undefined
          ? null
          : Number(diaSeleccionado.gpm),
    };
  }

  if (semanaSeleccionada) {
    return {
      nivel: "semana",
      etiqueta: `${formatoFecha(
        semanaSeleccionada.semana_inicio
      )} — ${formatoFecha(
        semanaSeleccionada.semana_fin
      )}`,
      ingresos: Number(
        semanaSeleccionada.ingresos || 0
      ),
      egresos: Number(
        semanaSeleccionada.egresos || 0
      ),
      nomina: Number(
        semanaSeleccionada.nomina || 0
      ),
      gm: Number(
        semanaSeleccionada.gm || 0
      ),
      gpm:
        semanaSeleccionada.gpm === null ||
        semanaSeleccionada.gpm === undefined
          ? null
          : Number(semanaSeleccionada.gpm),
    };
  }

  return {
    nivel: "periodo",
    etiqueta: `${formatoFecha(
      fechaInicio
    )} — ${formatoFecha(fechaFin)}`,
    ingresos: Number(
      resumen.total_ingresos || 0
    ),
    egresos: Number(
      resumen.total_egresos || 0
    ),
    nomina: Number(
      resumen.total_nomina || 0
    ),
    gm: Number(resumen.gm || 0),
    gpm:
      resumen.gpm === null ||
      resumen.gpm === undefined
        ? null
        : Number(resumen.gpm),
  };
}, [
  diaSeleccionado,
  semanaSeleccionada,
  resumen,
  fechaInicio,
  fechaFin,
]);

const hallazgosEjecutivos = useMemo(() => {
  const hallazgos = [];

  const totalIngresosActual =
  metricasSeleccion.ingresos;

const totalEgresosActual =
  metricasSeleccion.egresos;

const gmActual =
  metricasSeleccion.gm;

const gpmActual =
  metricasSeleccion.gpm;

  // 1. Periodo provisional
  if (provisional) {
    hallazgos.push({
      tipo: "advertencia",
      titulo: "Periodo provisional",
      texto:
        "Todavía pueden registrarse egresos correspondientes a este periodo. El GPM no debe considerarse definitivo.",
    });
  }

  // 2. GM negativo
  if (gmActual < 0) {
    hallazgos.push({
      tipo: "critico",
      titulo: "Margen negativo",
      texto: `Los egresos superan el resultado disponible. GM actual: ${formatoMoneda(
        gmActual
      )}.`,
    });
  }

  // 3. Peso de egresos
  if (
    totalIngresosActual > 0 &&
    totalEgresosActual >
      totalIngresosActual * 0.8
  ) {
    hallazgos.push({
      tipo: "advertencia",
      titulo: "Egresos elevados",
      texto: `Los egresos representan ${formatoPorcentaje(
        (totalEgresosActual /
          totalIngresosActual) *
          100
      )} de los ingresos.`,
    });
  }

  // 4. Categoría principal
  if (categoriasFiltradas.length > 0) {
    const principal =
      categoriasFiltradas[0];

    hallazgos.push({
      tipo: "informativo",
      titulo: "Principal categoría de gasto",
      texto: `${principal.categoria} concentra ${formatoPorcentaje(
        principal.porcentaje
      )} de los egresos (${formatoMoneda(
        principal.total
      )}).`,
    });
  }

  // 5. Diferencia nómina
  if (
    prenominaEsperada > 0 &&
    diferenciaNominaPct !== null &&
    diferenciaNominaPct !== undefined
  ) {
    const diferenciaPct =
      Number(diferenciaNominaPct);

    if (Math.abs(diferenciaPct) > 5) {
      hallazgos.push({
        tipo:
          diferenciaPct > 0
            ? "advertencia"
            : "informativo",
        titulo:
          "Diferencia entre prenómina y nómina real",
        texto:
          diferenciaPct > 0
            ? `La nómina real quedó ${formatoPorcentaje(
                Math.abs(diferenciaPct)
              )} por encima de la prenómina.`
            : `La nómina real quedó ${formatoPorcentaje(
                Math.abs(diferenciaPct)
              )} por debajo de la prenómina.`,
      });
    }
  }

  // 6. GPM sano / positivo
  if (
    !provisional &&
    gpmActual !== null &&
    gpmActual > 0
  ) {
    hallazgos.push({
      tipo: "positivo",
      titulo: "Margen positivo",
      texto: `El periodo cerró con un GPM de ${formatoPorcentaje(
        gpmActual
      )}.`,
    });
  }

  // 7. Si no encontramos nada especial
  if (hallazgos.length === 0) {
    hallazgos.push({
      tipo: "informativo",
      titulo: "Sin alertas relevantes",
      texto:
        "No se detectaron desviaciones importantes con los datos disponibles para este periodo.",
    });
  }

  return hallazgos;
}, [
  metricasSeleccion,
  provisional,
  categoriasFiltradas,
  prenominaEsperada,
  diferenciaNominaPct,
]);

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
        padding: "13px 14px",
minHeight: "105px",
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
          fontSize: "23px",
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
        marginBottom: "12px",
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

const TooltipFinanciero = ({
  active,
  payload,
  label,
}) => {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  const item =
    payload[0]?.payload || {};

  return (
    <div
      style={{
        background: "#111",
        color: "#fff",
        padding: "12px 14px",
        borderRadius: "10px",
        boxShadow:
          "0 8px 25px rgba(0,0,0,.22)",
        minWidth: "190px",
        fontSize: "12px",
      }}
    >
      <div
        style={{
          fontWeight: "700",
          marginBottom: "9px",
          fontSize: "13px",
        }}
      >
        {label}
      </div>

      <div>
        Ingresos:{" "}
        <strong>
          {formatoMoneda(item.ingresos)}
        </strong>
      </div>

      <div style={{ marginTop: "4px" }}>
        Egresos:{" "}
        <strong>
          {formatoMoneda(item.egresos)}
        </strong>
      </div>

      <div style={{ marginTop: "4px" }}>
        Nómina:{" "}
        <strong>
          {formatoMoneda(item.nomina)}
        </strong>
      </div>

      <div style={{ marginTop: "4px" }}>
        GM:{" "}
        <strong>
          {formatoMoneda(item.gm)}
        </strong>
      </div>

      <div style={{ marginTop: "4px" }}>
        GPM:{" "}
        <strong>
          {item.gpm === null
            ? "Pendiente"
            : formatoPorcentaje(item.gpm)}
        </strong>
      </div>

      {item.provisional && (
        <div
          style={{
            marginTop: "9px",
            color: "#ffd76a",
            fontWeight: "700",
          }}
        >
          ● PERIODO PROVISIONAL
        </div>
      )}
    </div>
  );
};

const GraficaFinanciera = () => {
  if (datosGrafica.length === 0) {
    return (
      <div style={estadoVacio}>
        No hay datos suficientes para graficar.
      </div>
    );
  }

  const manejarClickGrafica = (
  estado
) => {
  const item =
    estado?.activePayload?.[0]?.payload;

  if (!item) return;

  // MES → SEMANAS
  if (nivelGrafica === "periodo") {
    setMesSeleccionado(
      item.original
    );

    setSemanaSeleccionada(null);
    setDiaSeleccionado(null);

    setNivelGrafica("mes");

    return;
  }

  // SEMANA → DÍAS
  if (nivelGrafica === "mes") {
    setSemanaSeleccionada(
      item.original
    );

    setDiaSeleccionado(null);

    setNivelGrafica("semana");

    return;
  }

  // DÍA → SELECCIONAR DÍA
  if (nivelGrafica === "semana") {
    setDiaSeleccionado(item);
  }
};

  return (
    <div>
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "10px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: "700",
              color: "#777",
            }}
          >
            Nivel de análisis
          </div>

          <div
            style={{
              fontSize: "14px",
              fontWeight: "700",
              marginTop: "2px",
            }}
          >
            {nivelGrafica === "periodo"
  ? "Meses"
  : nivelGrafica === "mes"
  ? `Semanas · ${
      mesSeleccionado?.etiqueta || ""
    }`
  : `Días · ${formatoFechaCorta(
      semanaSeleccionada?.semana_inicio
    )}–${formatoFechaCorta(
      semanaSeleccionada?.semana_fin
    )}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          {[
            ["flujo", "Ingresos / Egresos"],
            ["gpm", "GPM"],
            ["nomina", "Nómina"],
          ].map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              onClick={() =>
                setModoGrafica(valor)
              }
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border:
                  "1px solid #ddd",
                background:
                  modoGrafica === valor
                    ? "#111"
                    : "#fff",
                color:
                  modoGrafica === valor
                    ? "#fff"
                    : "#111",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "600",
              }}
            >
              {etiqueta}
            </button>
          ))}

          {nivelGrafica !== "periodo" && (
  <button
    type="button"
    onClick={() => {
      // DÍAS → SEMANAS
      if (nivelGrafica === "semana") {
        setNivelGrafica("mes");
        setSemanaSeleccionada(null);
        setDiaSeleccionado(null);
        return;
      }

      // SEMANAS → MESES
      if (nivelGrafica === "mes") {
        setNivelGrafica("periodo");
        setMesSeleccionado(null);
        setSemanaSeleccionada(null);
        setDiaSeleccionado(null);
      }
    }}
              style={{
                ...botonSecundario,
                padding: "6px 10px",
                fontSize: "11px",
              }}
            >
              ↑ Subir nivel
            </button>
          )}
        </div>
      </div>

      {/* BREADCRUMB */}

      <div
        style={{
          marginBottom: "8px",
          color: "#777",
          fontSize: "11px",
        }}
      >
        Periodo

{mesSeleccionado &&
  ` › ${mesSeleccionado.etiqueta}`}

{semanaSeleccionada &&
  ` › ${formatoFechaCorta(
    semanaSeleccionada.semana_inicio
  )}–${formatoFechaCorta(
    semanaSeleccionada.semana_fin
  )}`}

{diaSeleccionado &&
  ` › ${formatoFechaCorta(
    diaSeleccionado.id
  )}`}
      </div>

      {/* GRÁFICA */}

      <div
        style={{
          width: "100%",
          height: "280px",
        }}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <ComposedChart
            data={datosGrafica}
            margin={{
              top: 15,
              right: 15,
              bottom: 5,
              left: 5,
            }}
            onClick={
              manejarClickGrafica
            }
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#ececec"
            />

            <XAxis
              dataKey="etiqueta"
              tick={{
                fontSize: 10,
              }}
              tickLine={false}
              axisLine={{
                stroke: "#ddd",
              }}
            />

            <YAxis
              yAxisId="dinero"
              tickFormatter={(v) =>
                `$${Number(v).toLocaleString(
                  "es-MX",
                  {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }
                )}`
              }
              tick={{
                fontSize: 10,
              }}
              tickLine={false}
              axisLine={false}
              width={65}
            />

            {modoGrafica === "gpm" && (
              <YAxis
                yAxisId="porcentaje"
                orientation="right"
                tickFormatter={(v) =>
                  `${Number(v).toFixed(0)}%`
                }
                tick={{
                  fontSize: 10,
                }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
            )}

            <Tooltip
              content={
                <TooltipFinanciero />
              }
            />

            <Legend
              wrapperStyle={{
                fontSize: "11px",
              }}
            />

            <ReferenceLine
              yAxisId="dinero"
              y={0}
              stroke="#bbb"
            />

            {modoGrafica === "flujo" && (
              <>
                <Bar
                  yAxisId="dinero"
                  dataKey="ingresos"
                  name="Ingresos"
                  fill="#111"
                  radius={[
                    4,
                    4,
                    0,
                    0,
                  ]}
                  maxBarSize={38}
                />

                <Bar
                  yAxisId="dinero"
                  dataKey="egresos"
                  name="Egresos"
                  fill="#aaa"
                  radius={[
                    4,
                    4,
                    0,
                    0,
                  ]}
                  maxBarSize={38}
                />

                <Line
                  yAxisId="dinero"
                  type="monotone"
                  dataKey="gm"
                  name="GM"
                  stroke="#666"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#fff",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </>
            )}

            {modoGrafica === "gpm" && (
              <Line
                yAxisId="porcentaje"
                type="monotone"
                dataKey="gpm"
                name="GPM"
                stroke="#111"
                strokeWidth={3}
                connectNulls={false}
                dot={{
                  r: 5,
                }}
                activeDot={{
                  r: 7,
                }}
              />
            )}

            {modoGrafica === "nomina" && (
              <Bar
                yAxisId="dinero"
                dataKey="nomina"
                name="Nómina"
                fill="#555"
                radius={[
                  5,
                  5,
                  0,
                  0,
                ]}
                maxBarSize={48}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const descargarExcel = async () => {
  if (!analisis) {
    alert(
      "Primero debes cargar el análisis financiero."
    );
    return;
  }

  try {
    const respuesta = await fetch(
      `${API_BASE_URL}/api/analisis-financiero/exportar-excel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analisis,
          hallazgos: hallazgosEjecutivos,
          usuario: usuarioActivo || "",
        }),
      }
    );

    if (!respuesta.ok) {
      let mensaje =
        "No fue posible generar el Excel.";

      try {
        const error = await respuesta.json();
        mensaje = error.error || mensaje;
      } catch {
        // La respuesta no era JSON.
      }

      throw new Error(mensaje);
    }

    const blob = await respuesta.blob();

    const url =
      window.URL.createObjectURL(blob);

    const enlace =
      document.createElement("a");

    enlace.href = url;

    const inicio = String(
      fechaInicio || "inicio"
    ).replaceAll("-", "");

    const fin = String(
      fechaFin || "fin"
    ).replaceAll("-", "");

    enlace.download =
      `BOSSE_Analisis_Financiero_${inicio}_${fin}.xlsx`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(
      "Error descargando Excel:",
      error
    );

    alert(`🚨 ${error.message}`);
  }
};

const descargarPDF = async () => {
  if (!analisis) {
    alert(
      "Primero debes cargar el análisis financiero."
    );
    return;
  }

  try {
    const respuesta = await fetch(
      `${API_BASE_URL}/api/analisis-financiero/exportar-pdf`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analisis,
          hallazgos: hallazgosEjecutivos,
          usuario: usuarioActivo || "",
        }),
      }
    );

    if (!respuesta.ok) {
      let mensaje =
        "No fue posible generar el PDF.";

      try {
        const error =
          await respuesta.json();

        mensaje =
          error.error || mensaje;
      } catch {
        // La respuesta no era JSON.
      }

      throw new Error(mensaje);
    }

    const blob =
      await respuesta.blob();

    const url =
      window.URL.createObjectURL(blob);

    const enlace =
      document.createElement("a");

    enlace.href = url;

    const inicio = String(
      fechaInicio || "inicio"
    ).replaceAll("-", "");

    const fin = String(
      fechaFin || "fin"
    ).replaceAll("-", "");

    enlace.download =
      `BOSSE_Reporte_Ejecutivo_${inicio}_${fin}.pdf`;

    document.body.appendChild(enlace);

    enlace.click();

    enlace.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(
      "Error descargando PDF:",
      error
    );

    alert(`🚨 ${error.message}`);
  }
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
            maxWidth: "1760px",
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
  type="button"
  onClick={descargarExcel}
  disabled={cargando || !analisis}
  style={{
    ...botonTab,
    background: "#111",
    color: "#fff",
    opacity:
      cargando || !analisis ? 0.55 : 1,
    cursor:
      cargando || !analisis
        ? "not-allowed"
        : "pointer",
  }}
>
  ↓ Descargar Excel
</button>

<button
  type="button"
  onClick={descargarPDF}
  disabled={cargando || !analisis}
  style={{
    ...botonTab,
    background: "#fff",
    color: "#111",
    border: "1px solid #111",
    opacity:
      cargando || !analisis ? 0.55 : 1,
    cursor:
      cargando || !analisis
        ? "not-allowed"
        : "pointer",
  }}
>
  ↓ Descargar PDF
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
          maxWidth: "1760px",
          margin: "0 auto",
          padding: "14px 18px 30px",
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
                gap: "8px",
marginBottom: "12px",
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

            {/* ====================================================
    PANEL CENTRAL BI
==================================================== */}

<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 2.2fr) minmax(280px, .8fr)",
    gap: "12px",
    marginBottom: "12px",
  }}
>
  {/* GRÁFICA */}

  <section
    style={{
      ...tarjeta,
      padding: "16px",
    }}
  >
    <TituloSeccion
      titulo="Evolución financiera"
      subtitulo="Haz clic en una semana para bajar a días."
    />

    <GraficaFinanciera />
  </section>

  {/* INSIGHTS */}

  <section
    style={{
      ...tarjeta,
      padding: "16px",
      maxHeight: "390px",
      overflowY: "auto",
    }}
  >
    <TituloSeccion
      titulo="Insights"
      subtitulo="Lectura automática del periodo."
    />

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {hallazgosEjecutivos.map(
        (hallazgo, index) => {
          const estilos = {
            positivo: {
              bg: "#edf7ee",
              border: "#c9e6cd",
              icono: "↑",
            },

            advertencia: {
              bg: "#fff8e5",
              border: "#ead9a3",
              icono: "▲",
            },

            critico: {
              bg: "#fff0f0",
              border: "#efc4c4",
              icono: "!",
            },

            informativo: {
              bg: "#f7f7f7",
              border: "#e3e3e3",
              icono: "•",
            },
          };

          const estilo =
            estilos[hallazgo.tipo] ||
            estilos.informativo;

          return (
            <div
              key={`${hallazgo.titulo}-${index}`}
              style={{
                padding: "10px",
                borderRadius: "8px",
                background: estilo.bg,
                border: `1px solid ${estilo.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#111",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "10px",
                    fontWeight: "700",
                  }}
                >
                  {estilo.icono}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                    }}
                  >
                    {hallazgo.titulo}
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginTop: "3px",
                      lineHeight: 1.35,
                    }}
                  >
                    {hallazgo.texto}
                  </div>
                </div>
              </div>
            </div>
          );
        }
      )}
    </div>
  </section>
</div>

{/* GRID FINANCIERO 2x2 */}

<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "12px",
    alignItems: "start",
  }}
>
  
              {/* Categorías */}

              <section
  style={{
    ...tarjeta,
    padding: "16px",
    minHeight: "260px",
  }}
>
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

              <section
  style={{
    ...tarjeta,
    padding: "16px",
    minHeight: "260px",
  }}
>
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

{/* Resultado cambiario */}

<section
  style={{
    ...tarjeta,
    padding: "16px",
    minHeight: "260px",
  }}
>
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

              <section
  style={{
    ...tarjeta,
    padding: "16px",
    minHeight: "260px",
  }}
>
  <TituloSeccion
    titulo="Prenómina vs nómina real"
    subtitulo="La prenómina es solo referencia. La contabilidad usa exclusivamente los egresos reales."
  />

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(150px, 1fr))",
      gap: "10px",
      marginBottom: "16px",
    }}
  >
    <div style={miniDato}>
      <span style={miniLabel}>
        Prenómina estimada
      </span>

      <strong>
        {formatoMoneda(
          prenominaEsperada
        )}
      </strong>
    </div>

    <div style={miniDato}>
      <span style={miniLabel}>
        Nómina real
      </span>

      <strong>
        {formatoMoneda(
          nominaRealComparacion
        )}
      </strong>
    </div>

    <div style={miniDato}>
      <span style={miniLabel}>
        Diferencia
      </span>

      <strong>
        {formatoMoneda(
          diferenciaNominaComparacion
        )}
      </strong>
    </div>

    <div style={miniDato}>
      <span style={miniLabel}>
        Variación
      </span>

      <strong>
        {diferenciaNominaPct === null ||
        diferenciaNominaPct === undefined
          ? "—"
          : formatoPorcentaje(
              diferenciaNominaPct
            )}
      </strong>
    </div>
  </div>

  <div
    style={{
      padding: "11px 12px",
      borderRadius: "8px",
      background:
        Math.abs(
          Number(
            diferenciaNominaPct || 0
          )
        ) > 5
          ? "#fff3cd"
          : "#f7f7f5",
      fontSize: "12px",
      color: "#555",
    }}
  >
    {prenominaEsperada === 0
      ? "No hay prenómina de referencia para este periodo."
      : Math.abs(
          Number(
            diferenciaNominaPct || 0
          )
        ) <= 5
      ? "La nómina real está dentro de ±5% de la prenómina."
      : diferenciaNominaComparacion > 0
      ? "La nómina real fue mayor que la prenómina estimada."
      : "La nómina real fue menor que la prenómina estimada."}
  </div>

  {prenominaReferencia.length > 0 && (
    <details
      style={{
        marginTop: "14px",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "600",
        }}
      >
        Ver prenóminas de referencia
      </summary>

      <div
        style={{
          marginTop: "10px",
        }}
      >
        {prenominaReferencia.map((p) => (
          <div
            key={p.id}
            style={{
              padding: "9px 0",
              borderBottom:
                "1px solid #eee",
              display: "flex",
              justifyContent:
                "space-between",
              gap: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: "600",
                  fontSize: "13px",
                }}
              >
                Prenómina #{p.id}
              </div>

              <div
                style={{
                  color: "#777",
                  fontSize: "11px",
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
                textAlign: "right",
              }}
            >
              <strong>
                {formatoMoneda(
                  p.total
                )}
              </strong>

              <div
                style={{
                  fontSize: "10px",
                  color: "#777",
                }}
              >
                {p.estatus}
              </div>
            </div>
          </div>
        ))}
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