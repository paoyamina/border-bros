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

  // ============================================================
// BORDERBRO
// ============================================================

const [borderBroAbierto, setBorderBroAbierto] =
  useState(false);

const [borderBroMensaje, setBorderBroMensaje] =
  useState("");

const [borderBroCargando, setBorderBroCargando] =
  useState(false);

const [borderBroEstado, setBorderBroEstado] =
  useState("normal");

const [borderBroError, setBorderBroError] =
  useState("");

const [borderBroConversacion, setBorderBroConversacion] =
  useState([
    {
      rol: "assistant",
      texto:
        "Hola, soy BorderBro. Puedo analizar los datos financieros de este periodo. Pregúntame lo que quieras sobre ingresos, egresos, nómina o cortes.",
      evidencia: [],
    },
  ]);

  // ============================================================
// CONSTRUCTOR DE ANÁLISIS
// ============================================================

const [campoEjeX, setCampoEjeX] =
  useState("categoria");

const [campoValor, setCampoValor] =
  useState("monto_mxn");

const [agregacion, setAgregacion] =
  useState("SUM");

const [tipoGrafica, setTipoGrafica] =
  useState("barras");

  const [campoSerie, setCampoSerie] =
  useState("");

  const [metricaGrafica, setMetricaGrafica] =
  useState("ingresos");

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

// ============================================================
// BORDERBRO - CHAT
// ============================================================

const preguntasBorderBro = [
  "¿Dónde estoy perdiendo dinero?",
  "¿Qué cambió contra el periodo anterior?",
  "¿Hay algo raro en mis egresos?",
  "Analiza mis cortes y dime qué debería revisar.",
];

const enviarPreguntaBorderBro = async (
  preguntaDirecta = null
) => {
  const pregunta = String(
    preguntaDirecta ?? borderBroMensaje
  ).trim();

  if (!pregunta || borderBroCargando) {
    return;
  }

  if (!negocioId) {
    setBorderBroError(
      "No se encontró el negocio asociado al usuario."
    );
    return;
  }

  const historialAnterior =
    borderBroConversacion
      .slice(-6)
      .map((mensaje) => {
        const autor =
          mensaje.rol === "user"
            ? "Usuario"
            : "BorderBro";

        return `${autor}: ${mensaje.texto}`;
      })
      .join("\n");

  const mensajeParaAgente =
    historialAnterior
      ? `Contexto reciente de la conversación:
${historialAnterior}

Nueva pregunta del usuario:
${pregunta}`
      : pregunta;

  setBorderBroConversacion((actual) => [
    ...actual,
    {
      rol: "user",
      texto: pregunta,
      evidencia: [],
    },
  ]);

  setBorderBroMensaje("");
  setBorderBroError("");
  setBorderBroCargando(true);
  setBorderBroEstado("thinking");

  try {
    const respuesta = await fetch(
      `${API_BASE_URL}/api/borderbro/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mensaje: mensajeParaAgente,
          negocio_id: Number(negocioId),
          fecha_inicio:
            rangoSeleccionado.inicio,
          fecha_fin:
            rangoSeleccionado.fin,
        }),
      }
    );

    const resultado = await respuesta.json();

    if (
      !respuesta.ok ||
      !resultado.success
    ) {
      throw new Error(
        resultado.error ||
          "BorderBro no pudo completar el análisis."
      );
    }

    const textoRespuesta =
      resultado.respuesta ||
      "Terminé el análisis, pero no recibí una respuesta textual.";

    const pareceAlerta =
      /anomal|inusual|raro|alerta|revisar|diferencia|fuera de lo normal/i.test(
        textoRespuesta
      );

    setBorderBroEstado(
      pareceAlerta ? "alert" : "talking"
    );

    setBorderBroConversacion((actual) => [
      ...actual,
      {
        rol: "assistant",
        texto: textoRespuesta,
        evidencia:
          resultado.evidencia || [],
        meta: resultado.meta || null,
      },
    ]);
  } catch (error) {
    console.error(
      "Error consultando BorderBro:",
      error
    );

    setBorderBroError(
      error.message ||
        "No fue posible consultar a BorderBro."
    );

    setBorderBroEstado("normal");
  } finally {
    setBorderBroCargando(false);
  }
};

const imagenBorderBro =
  borderBroEstado === "thinking"
    ? "/borderbro/borderbro-thinking.png"
    : borderBroEstado === "talking"
    ? "/borderbro/borderbro-talking.png"
    : borderBroEstado === "alert"
    ? "/borderbro/borderbro-alert.png"
    : "/borderbro/borderbro-normal.png";

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
// MOTOR DEL CONSTRUCTOR DE ANÁLISIS
// ============================================================

const camposConstructor = [
  {
    valor: "fecha_financiera",
    etiqueta: "Fecha financiera",
    tipo: "dimension",
  },
  {
    valor: "categoria",
    etiqueta: "Categoría",
    tipo: "dimension",
  },
  {
    valor: "tipo_egreso",
    etiqueta: "Tipo de egreso",
    tipo: "dimension",
  },
  {
    valor: "proveedor",
    etiqueta: "Proveedor",
    tipo: "dimension",
  },
  {
    valor: "concepto",
    etiqueta: "Concepto",
    tipo: "dimension",
  },
  {
    valor: "cuenta",
    etiqueta: "Cuenta",
    tipo: "dimension",
  },
  {
    valor: "usuario_nombre",
    etiqueta: "Usuario",
    tipo: "dimension",
  },
  {
    valor: "es_nomina",
    etiqueta: "Es nómina",
    tipo: "dimension",
  },
];

const metricasConstructor = [
  {
    valor: "monto_mxn",
    etiqueta: "Monto MXN",
  },
];

const valorDimensionConstructor = (
  registro,
  campo
) => {
  if (!campo) return "Valor";

  let valor = registro[campo];

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "Sin dato";
  }

  if (campo === "fecha_financiera") {
    return String(valor).split("T")[0];
  }

  if (campo === "es_nomina") {
    return valor ? "Nómina" : "No nómina";
  }

  return String(valor);
};

const resultadoConstructor = useMemo(() => {
  const grupos = new Map();
  const nombresSeries = new Set();

  const calcularValor = (grupo) => {
    if (!grupo) return 0;

    if (agregacion === "COUNT") {
      return grupo.cantidad;
    }

    if (agregacion === "AVG") {
      return grupo.cantidad > 0
        ? grupo.suma / grupo.cantidad
        : 0;
    }

    if (agregacion === "MIN") {
      return grupo.minimo ?? 0;
    }

    if (agregacion === "MAX") {
      return grupo.maximo ?? 0;
    }

    return grupo.suma;
  };

  egresosFiltrados.forEach((registro) => {
    const dimension =
      valorDimensionConstructor(
        registro,
        campoEjeX
      );

    const serie = campoSerie
      ? valorDimensionConstructor(
          registro,
          campoSerie
        )
      : "Valor";

    nombresSeries.add(serie);

    if (!grupos.has(dimension)) {
      grupos.set(dimension, new Map());
    }

    const porSerie = grupos.get(dimension);

    if (!porSerie.has(serie)) {
      porSerie.set(serie, {
        suma: 0,
        cantidad: 0,
        minimo: null,
        maximo: null,
      });
    }

    const grupo = porSerie.get(serie);

    const valor = Number(
      registro[campoValor] || 0
    );

    grupo.suma += valor;
    grupo.cantidad += 1;

    grupo.minimo =
      grupo.minimo === null
        ? valor
        : Math.min(grupo.minimo, valor);

    grupo.maximo =
      grupo.maximo === null
        ? valor
        : Math.max(grupo.maximo, valor);
  });

  const series = Array.from(
    nombresSeries
  ).sort((a, b) =>
    String(a).localeCompare(
      String(b),
      "es"
    )
  );

  const datos = Array.from(
    grupos.entries()
  ).map(([etiqueta, porSerie]) => {
    const fila = {
      etiqueta,
      cantidad: 0,
    };

    series.forEach((serie) => {
      const grupo = porSerie.get(serie);

      fila[serie] =
        calcularValor(grupo);

      fila.cantidad +=
        grupo?.cantidad || 0;
    });

    fila.valor = series.reduce(
      (acc, serie) =>
        acc + Number(
          fila[serie] || 0
        ),
      0
    );

    return fila;
  });

  if (
    campoEjeX ===
    "fecha_financiera"
  ) {
    datos.sort((a, b) =>
      String(a.etiqueta).localeCompare(
        String(b.etiqueta)
      )
    );
  } else {
    datos.sort(
      (a, b) =>
        Number(b.valor) -
        Number(a.valor)
    );
  }

  return {
    datos,
    series,
  };
}, [
  egresosFiltrados,
  campoEjeX,
  campoValor,
  campoSerie,
  agregacion,
]);

const datosConstructor =
  resultadoConstructor.datos;

const seriesConstructor =
  resultadoConstructor.series;

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

       const ultimoDia = new Date(
  mesSeleccionado.anio,
  mesSeleccionado.mes,
  0
).getDate();

const ultimoDiaMes =
  `${mesSeleccionado.id}-${String(
    ultimoDia
  ).padStart(2, "0")}`;

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

  if (mesSeleccionado) {
  return {
    nivel: "mes",
    etiqueta: mesSeleccionado.etiqueta,
    ingresos: Number(
      mesSeleccionado.ingresos || 0
    ),
    egresos: Number(
      mesSeleccionado.egresos || 0
    ),
    nomina: Number(
      mesSeleccionado.nomina || 0
    ),
    gm: Number(
      mesSeleccionado.gm || 0
    ),
    gpm:
      mesSeleccionado.gpm === null ||
      mesSeleccionado.gpm === undefined
        ? null
        : Number(mesSeleccionado.gpm),
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
  mesSeleccionado,
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

          <select
  value={metricaGrafica}
  onChange={(e) =>
    setMetricaGrafica(e.target.value)
  }
  style={{
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
  }}
>
  <option value="ingresos">
    Ingresos
  </option>
  <option value="egresos">
    Egresos
  </option>
  <option value="gm">
    GM
  </option>
  <option value="gpm">
    GPM
  </option>
  <option value="nomina">
    Nómina
  </option>
</select>

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

       {/* CONTROLES DE DRILL TIPO POWER BI */}

<div
  style={{
    display: "flex",
    gap: "4px",
    alignItems: "center",
    marginLeft: "4px",
  }}
>
  {/* SUBIR NIVEL */}
  <button
    type="button"
    title="Subir un nivel"
    disabled={nivelGrafica === "periodo"}
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
      width: "32px",
      height: "30px",
      padding: 0,
      fontSize: "16px",
      fontWeight: "700",
      opacity:
        nivelGrafica === "periodo"
          ? 0.35
          : 1,
      cursor:
        nivelGrafica === "periodo"
          ? "not-allowed"
          : "pointer",
    }}
  >
    ↑
  </button>

  {/* BAJAR NIVEL */}
  <button
    type="button"
    title="Bajar un nivel"
    disabled={
      nivelGrafica === "semana" ||
      (nivelGrafica === "periodo" &&
        meses.length === 0) ||
      (nivelGrafica === "mes" &&
        datosGrafica.length === 0)
    }
    onClick={() => {
      // MESES → SEMANAS
      if (nivelGrafica === "periodo") {
        if (meses.length === 0) return;

        const mes =
          mesSeleccionado ||
          meses[meses.length - 1];

        setMesSeleccionado(mes);
        setSemanaSeleccionada(null);
        setDiaSeleccionado(null);
        setNivelGrafica("mes");

        return;
      }

      // SEMANAS → DÍAS
      if (nivelGrafica === "mes") {
        if (datosGrafica.length === 0) return;

        const semana =
          semanaSeleccionada ||
          datosGrafica[
            datosGrafica.length - 1
          ]?.original;

        if (!semana) return;

        setSemanaSeleccionada(semana);
        setDiaSeleccionado(null);
        setNivelGrafica("semana");
      }
    }}
    style={{
      ...botonSecundario,
      width: "32px",
      height: "30px",
      padding: 0,
      fontSize: "16px",
      fontWeight: "700",
      opacity:
        nivelGrafica === "semana"
          ? 0.35
          : 1,
      cursor:
        nivelGrafica === "semana"
          ? "not-allowed"
          : "pointer",
    }}
  >
    ↓
  </button>
</div>
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

            {metricaGrafica !== "gpm" && (
  <Bar
    yAxisId="dinero"
    dataKey={metricaGrafica}
    name={
      metricaGrafica === "ingresos"
        ? "Ingresos"
        : metricaGrafica === "egresos"
        ? "Egresos"
        : metricaGrafica === "gm"
        ? "GM"
        : "Nómina"
    }
    fill="#111"
    radius={[4, 4, 0, 0]}
    maxBarSize={48}
  />
)}

            {metricaGrafica === "gpm" && (
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
  onClick={() =>
    setVista("constructor")
  }
  style={{
    ...botonTab,
    background:
      vista === "constructor"
        ? "#111"
        : "#fff",
    color:
      vista === "constructor"
        ? "#fff"
        : "#111",
  }}
>
  Constructor
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

        {/* ====================================================
            CONSTRUCTOR DE ANÁLISIS
        ==================================================== */}

        {vista === "constructor" && (
          <>
            <section style={tarjeta}>
              <TituloSeccion
                titulo="Constructor de análisis"
                subtitulo="Construye visualizaciones dinámicas con los movimientos del periodo y filtros actuales."
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <label style={labelFiltro}>Eje X</label>
                  <select
                    value={campoEjeX}
                    onChange={(e) =>
                      setCampoEjeX(e.target.value)
                    }
                    style={{
                      ...inputFiltro,
                      width: "100%",
                    }}
                  >
                    {camposConstructor.map((campo) => (
                      <option
                        key={campo.valor}
                        value={campo.valor}
                      >
                        {campo.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelFiltro}>Métrica</label>
                  <select
                    value={campoValor}
                    onChange={(e) =>
                      setCampoValor(e.target.value)
                    }
                    style={{
                      ...inputFiltro,
                      width: "100%",
                    }}
                  >
                    {metricasConstructor.map((campo) => (
                      <option
                        key={campo.valor}
                        value={campo.valor}
                      >
                        {campo.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelFiltro}>Agregación</label>
                  <select
                    value={agregacion}
                    onChange={(e) =>
                      setAgregacion(e.target.value)
                    }
                    style={{
                      ...inputFiltro,
                      width: "100%",
                    }}
                  >
                    <option value="SUM">Suma</option>
                    <option value="COUNT">
                      Conteo de movimientos
                    </option>
                    <option value="AVG">Promedio</option>
                    <option value="MIN">Mínimo</option>
                    <option value="MAX">Máximo</option>
                  </select>
                </div>
<div>
  <label style={labelFiltro}>
    Leyenda / Serie
  </label>

  <select
    value={campoSerie}
    onChange={(e) =>
      setCampoSerie(e.target.value)
    }
    style={{
      ...inputFiltro,
      width: "100%",
    }}
  >
    <option value="">
      Sin serie
    </option>

    {camposConstructor
      .filter(
        (campo) =>
          campo.valor !== campoEjeX
      )
      .map((campo) => (
        <option
          key={campo.valor}
          value={campo.valor}
        >
          {campo.etiqueta}
        </option>
      ))}
  </select>
</div>
                <div>
                  <label style={labelFiltro}>
                    Visualización
                  </label>
                  <select
                    value={tipoGrafica}
                    onChange={(e) =>
                      setTipoGrafica(e.target.value)
                    }
                    style={{
                      ...inputFiltro,
                      width: "100%",
                    }}
                  >
                    <option value="barras">Barras</option>
                    <option value="linea">Línea</option>
                    <option value="tabla">Tabla</option>
                    <option value="kpi">KPI</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#666",
                  }}
                >
                  {egresosFiltrados.length.toLocaleString(
                    "es-MX"
                  )}{" "}
                  movimientos ·{" "}
                  {datosConstructor.length.toLocaleString(
                    "es-MX"
                  )}{" "}
                  grupos
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#777",
                  }}
                >
                  Usa los mismos filtros y periodo del análisis
                  detallado.
                </div>
              </div>

              {datosConstructor.length === 0 ? (
                <div style={estadoVacio}>
                  No hay datos suficientes para construir la
                  visualización.
                </div>
              ) : tipoGrafica === "tabla" ? (
                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #eee",
                    borderRadius: "10px",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "12px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "#fafafa",
                          textAlign: "left",
                        }}
                      >
                        <th style={td}>
                          {camposConstructor.find(
                            (c) => c.valor === campoEjeX
                          )?.etiqueta || "Dimensión"}
                        </th>
                        <th
                          style={{
                            ...td,
                            textAlign: "right",
                          }}
                        >
                          {agregacion === "COUNT"
                            ? "Movimientos"
                            : `${
                                metricasConstructor.find(
                                  (c) =>
                                    c.valor === campoValor
                                )?.etiqueta || "Valor"
                              } · ${agregacion}`}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {datosConstructor.map((item) => (
                        <tr key={item.etiqueta}>
                          <td style={td}>
                            {item.etiqueta}
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: "right",
                              fontWeight: "700",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {agregacion === "COUNT"
                              ? Number(
                                  item.valor || 0
                                ).toLocaleString("es-MX")
                              : formatoMoneda(item.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : tipoGrafica === "kpi" ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {datosConstructor
                    .slice(0, 12)
                    .map((item, index) => (
                      <Kpi
                        key={item.etiqueta}
                        titulo={item.etiqueta}
                        valor={
                          agregacion === "COUNT"
                            ? Number(
                                item.valor || 0
                              ).toLocaleString("es-MX")
                            : formatoMoneda(item.valor)
                        }
                        subtitulo={`${item.cantidad} movimiento${
                          item.cantidad === 1 ? "" : "s"
                        }`}
                        destaque={index === 0}
                      />
                    ))}
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "420px",
                  }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <ComposedChart
                      data={datosConstructor.slice(0, 30)}
                      margin={{
                        top: 15,
                        right: 20,
                        bottom: 75,
                        left: 10,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#ececec"
                      />

                      <XAxis
                        dataKey="etiqueta"
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={90}
                        tick={{
                          fontSize: 10,
                        }}
                        tickLine={false}
                        axisLine={{
                          stroke: "#ddd",
                        }}
                      />

                      <YAxis
                        tickFormatter={(v) =>
                          agregacion === "COUNT"
                            ? Number(v).toLocaleString(
                                "es-MX"
                              )
                            : `$${Number(v).toLocaleString(
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
                        width={70}
                      />

                      <Tooltip
                        formatter={(value) => [
                          agregacion === "COUNT"
                            ? Number(value).toLocaleString(
                                "es-MX"
                              )
                            : formatoMoneda(value),
                          agregacion === "COUNT"
                            ? "Movimientos"
                            : `${
                                metricasConstructor.find(
                                  (c) =>
                                    c.valor === campoValor
                                )?.etiqueta || "Valor"
                              } · ${agregacion}`,
                        ]}
                      />
{campoSerie && (
  <Legend
    wrapperStyle={{
      fontSize: "11px",
    }}
  />
)}
                      {tipoGrafica === "barras" &&
  seriesConstructor.map(
    (serie, index) => (
      <Bar
        key={serie}
        dataKey={serie}
        name={
          campoSerie
            ? serie
            : agregacion === "COUNT"
            ? "Movimientos"
            : "Valor"
        }
        fill={
          [
            "#111111",
            "#4b5563",
            "#6b7280",
            "#9ca3af",
            "#374151",
            "#737373",
            "#a3a3a3",
            "#525252",
          ][index % 8]
        }
        radius={[4, 4, 0, 0]}
        maxBarSize={48}
      />
    )
  )}

                     {tipoGrafica === "linea" &&
  seriesConstructor.map(
    (serie, index) => (
      <Line
        key={serie}
        type="monotone"
        dataKey={serie}
        name={
          campoSerie
            ? serie
            : agregacion === "COUNT"
            ? "Movimientos"
            : "Valor"
        }
        stroke={
          [
            "#111111",
            "#4b5563",
            "#6b7280",
            "#9ca3af",
            "#374151",
            "#737373",
            "#a3a3a3",
            "#525252",
          ][index % 8]
        }
        strokeWidth={3}
        dot={{ r: 4 }}
        activeDot={{ r: 6 }}
      />
    )
  )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </>
        )}
            </main>

            {/* ======================================================
          BORDERBRO · AI COPILOT
      ====================================================== */}

      {!borderBroAbierto && (
        <button
          type="button"
          onClick={() => setBorderBroAbierto(true)}
          title="Pregúntale a BorderBro"
          style={{
            position: "fixed",
            right: "26px",
            bottom: "26px",
            zIndex: 1000,
            border: "1px solid rgba(255,255,255,.16)",
            background:
              "linear-gradient(135deg, #111 0%, #1c1c24 55%, #2a1f3d 100%)",
            color: "#fff",
            borderRadius: "22px",
            padding: "8px 16px 8px 8px",
            display: "flex",
            alignItems: "center",
            gap: "11px",
            cursor: "pointer",
            boxShadow:
              "0 18px 50px rgba(0,0,0,.28), 0 0 0 1px rgba(124,58,237,.08)",
            fontFamily: "inherit",
            transition: "all .2s ease",
          }}
        >
          <div
            style={{
              width: "54px",
              height: "54px",
              borderRadius: "17px",
              position: "relative",
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(145deg, rgba(255,255,255,.16), rgba(255,255,255,.04))",
              border: "1px solid rgba(255,255,255,.14)",
            }}
          >
            <img
              src="/borderbro/borderbro-button.png"
              alt="BorderBro"
              style={{
                width: "49px",
                height: "49px",
                objectFit: "contain",
              }}
            />

            <div
              style={{
                position: "absolute",
                right: "-3px",
                top: "-3px",
                width: "17px",
                height: "17px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                border: "2px solid #17171c",
                display: "grid",
                placeItems: "center",
                fontSize: "8px",
                boxShadow:
                  "0 0 14px rgba(139,92,246,.65)",
              }}
            >
              ✦
            </div>
          </div>

          <div
            style={{
              textAlign: "left",
              paddingRight: "4px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#aaa",
                textTransform: "uppercase",
                letterSpacing: "1.4px",
                fontWeight: "700",
              }}
            >
              AI Analyst
            </div>

            <div
              style={{
                fontSize: "13px",
                fontWeight: "750",
                marginTop: "2px",
              }}
            >
              Pregúntale a BorderBro
            </div>
          </div>

          <div
            style={{
              color: "#aaa",
              fontSize: "17px",
              marginLeft: "2px",
            }}
          >
            ↗
          </div>
        </button>
      )}

      {borderBroAbierto && (
        <>
          {/* SOMBRA / OVERLAY */}

          <div
            onClick={() => setBorderBroAbierto(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1090,
              background: "rgba(15,15,20,.18)",
              backdropFilter: "blur(2px)",
            }}
          />

          {/* PANEL */}

          <div
            style={{
              position: "fixed",
              top: "14px",
              right: "14px",
              bottom: "14px",
              width: "min(480px, calc(100vw - 28px))",
              zIndex: 1200,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: "24px",
              background:
                "rgba(250,250,252,.96)",
              backdropFilter: "blur(22px)",
              border: "1px solid rgba(255,255,255,.9)",
              boxShadow:
                "-10px 20px 70px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.04)",
            }}
          >
            {/* HEADER IA */}

            <div
              style={{
                position: "relative",
                overflow: "hidden",
                padding: "18px 18px 17px",
                background:
                  "linear-gradient(135deg, #101014 0%, #171720 52%, #241a38 100%)",
                color: "#fff",
              }}
            >
              {/* GLOW DECORATIVO */}

              <div
                style={{
                  position: "absolute",
                  width: "190px",
                  height: "190px",
                  borderRadius: "50%",
                  right: "-65px",
                  top: "-95px",
                  background:
                    "radial-gradient(circle, rgba(124,58,237,.42) 0%, rgba(124,58,237,0) 68%)",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  width: "150px",
                  height: "150px",
                  borderRadius: "50%",
                  left: "80px",
                  bottom: "-120px",
                  background:
                    "radial-gradient(circle, rgba(59,130,246,.25) 0%, rgba(59,130,246,0) 70%)",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "13px",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "20px",
                      background:
                        "linear-gradient(145deg, rgba(255,255,255,.16), rgba(255,255,255,.05))",
                      border:
                        "1px solid rgba(255,255,255,.13)",
                      display: "grid",
                      placeItems: "center",
                      position: "relative",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,.1)",
                    }}
                  >
                    <img
                      src={imagenBorderBro}
                      alt="BorderBro"
                      style={{
                        width: "59px",
                        height: "59px",
                        objectFit: "contain",
                      }}
                    />

                    <div
                      style={{
                        position: "absolute",
                        right: "-2px",
                        bottom: "-2px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background:
                          borderBroCargando
                            ? "#8b5cf6"
                            : "#22c55e",
                        border: "3px solid #17171e",
                        boxShadow: borderBroCargando
                          ? "0 0 14px rgba(139,92,246,.8)"
                          : "0 0 10px rgba(34,197,94,.5)",
                      }}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "800",
                          letterSpacing: "-.3px",
                        }}
                      >
                        BorderBro
                      </div>

                      <div
                        style={{
                          padding: "3px 7px",
                          borderRadius: "999px",
                          background:
                            "linear-gradient(135deg, rgba(139,92,246,.28), rgba(59,130,246,.20))",
                          border:
                            "1px solid rgba(167,139,250,.25)",
                          fontSize: "8px",
                          letterSpacing: "1px",
                          fontWeight: "800",
                          color: "#ddd6fe",
                        }}
                      >
                        AI
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "3px",
                        fontSize: "11px",
                        color: "#a5a5b0",
                      }}
                    >
                      Analista financiero de BOSSE
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setBorderBroAbierto(false)
                  }
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    border:
                      "1px solid rgba(255,255,255,.1)",
                    background:
                      "rgba(255,255,255,.06)",
                    color: "#ddd",
                    cursor: "pointer",
                    fontSize: "18px",
                  }}
                >
                  ×
                </button>
              </div>

              {/* CONTEXTO */}

              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  marginTop: "14px",
                  padding: "8px 10px",
                  borderRadius: "11px",
                  background:
                    "rgba(255,255,255,.055)",
                  border:
                    "1px solid rgba(255,255,255,.07)",
                  color: "#b7b7c1",
                  fontSize: "10px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#8b5cf6",
                    boxShadow:
                      "0 0 8px rgba(139,92,246,.8)",
                  }}
                />

                Analizando contexto de

                <strong
                  style={{
                    color: "#fff",
                    fontWeight: "650",
                  }}
                >
                  {formatoFecha(
                    rangoSeleccionado.inicio
                  )}
                  {" — "}
                  {formatoFecha(
                    rangoSeleccionado.fin
                  )}
                </strong>
              </div>
            </div>

            {/* ÁREA CHAT */}

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "18px",
                background:
                  "linear-gradient(180deg, #f7f7fa 0%, #fbfbfc 100%)",
              }}
            >
              {/* STARTER */}

              {borderBroConversacion.length <= 1 && (
                <div
                  style={{
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "750",
                      letterSpacing: "-.5px",
                      color: "#18181b",
                    }}
                  >
                    ¿Qué quieres analizar?
                  </div>

                  <div
                    style={{
                      marginTop: "5px",
                      fontSize: "12px",
                      lineHeight: 1.5,
                      color: "#71717a",
                    }}
                  >
                    Puedo cruzar tus datos de ingresos,
                    egresos, nómina y cortes para buscar
                    patrones y oportunidades.
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: "8px",
                      marginTop: "15px",
                    }}
                  >
                    {preguntasBorderBro.map(
                      (pregunta, index) => (
                        <button
                          key={pregunta}
                          type="button"
                          disabled={borderBroCargando}
                          onClick={() =>
                            enviarPreguntaBorderBro(
                              pregunta
                            )
                          }
                          style={{
                            minHeight: "78px",
                            border:
                              "1px solid #e5e5ea",
                            background: "#fff",
                            borderRadius: "14px",
                            padding: "11px",
                            textAlign: "left",
                            cursor:
                              borderBroCargando
                                ? "not-allowed"
                                : "pointer",
                            boxShadow:
                              "0 2px 8px rgba(0,0,0,.025)",
                            fontFamily: "inherit",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "15px",
                              marginBottom: "7px",
                            }}
                          >
                            {index === 0
                              ? "↘"
                              : index === 1
                              ? "↔"
                              : index === 2
                              ? "✦"
                              : "⌁"}
                          </div>

                          <div
                            style={{
                              fontSize: "10px",
                              lineHeight: 1.35,
                              fontWeight: "650",
                              color: "#3f3f46",
                            }}
                          >
                            {pregunta}
                          </div>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* MENSAJES */}

              {borderBroConversacion.map(
                (mensaje, index) => {
                  const esUsuario =
                    mensaje.rol === "user";

                  return (
                    <div
                      key={`${mensaje.rol}-${index}`}
                      style={{
                        display: "flex",
                        flexDirection: esUsuario
                          ? "row-reverse"
                          : "row",
                        alignItems: "flex-start",
                        gap: "9px",
                        marginBottom: "16px",
                      }}
                    >
                      {!esUsuario && (
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            flexShrink: 0,
                            borderRadius: "11px",
                            background:
                              "linear-gradient(145deg, #18181b, #302542)",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <img
                            src="/borderbro/borderbro-inline.png"
                            alt="BorderBro"
                            style={{
                              width: "31px",
                              height: "31px",
                              objectFit:
                                "contain",
                            }}
                          />
                        </div>
                      )}

                      <div
                        style={{
                          maxWidth: esUsuario
                            ? "78%"
                            : "86%",
                        }}
                      >
                        <div
                          style={{
                            padding: esUsuario
                              ? "10px 13px"
                              : "12px 13px",
                            borderRadius: esUsuario
                              ? "16px 5px 16px 16px"
                              : "5px 16px 16px 16px",
                            background: esUsuario
                              ? "linear-gradient(135deg, #18181b, #27272a)"
                              : "#fff",
                            color: esUsuario
                              ? "#fff"
                              : "#27272a",
                            border: esUsuario
                              ? "none"
                              : "1px solid #e7e7eb",
                            boxShadow: esUsuario
                              ? "0 5px 15px rgba(0,0,0,.12)"
                              : "0 3px 12px rgba(0,0,0,.035)",
                            fontSize: "12px",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {mensaje.texto}
                        </div>

                        {!esUsuario &&
                          mensaje.meta
                            ?.herramientas_utilizadas
                            ?.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                alignItems:
                                  "center",
                                gap: "5px",
                                marginTop: "7px",
                                color: "#8b5cf6",
                                fontSize: "9px",
                                fontWeight: "650",
                              }}
                            >
                              ✦{" "}
                              {mensaje.meta
                                .cantidad_consultas ||
                                mensaje.meta
                                  .herramientas_utilizadas
                                  .length}{" "}
                              consultas realizadas
                            </div>
                          )}

                        {!esUsuario &&
                          mensaje.evidencia
                            ?.length > 0 && (
                            <details
                              style={{
                                marginTop: "7px",
                                fontSize: "10px",
                                color: "#71717a",
                              }}
                            >
                              <summary
                                style={{
                                  cursor:
                                    "pointer",
                                  fontWeight:
                                    "650",
                                }}
                              >
                                Ver datos utilizados
                              </summary>

                              <pre
                                style={{
                                  marginTop: "7px",
                                  padding: "10px",
                                  background:
                                    "#f1f1f4",
                                  borderRadius:
                                    "10px",
                                  overflowX:
                                    "auto",
                                  whiteSpace:
                                    "pre-wrap",
                                  fontSize:
                                    "9px",
                                }}
                              >
                                {JSON.stringify(
                                  mensaje.evidencia,
                                  null,
                                  2
                                )}
                              </pre>
                            </details>
                          )}
                      </div>
                    </div>
                  );
                }
              )}

              {/* PENSANDO */}

              {borderBroCargando && (
                <div
                  style={{
                    display: "flex",
                    gap: "9px",
                    alignItems: "center",
                    marginTop: "4px",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "13px",
                      background:
                        "linear-gradient(145deg, #18181b, #33264b)",
                      display: "grid",
                      placeItems: "center",
                      boxShadow:
                        "0 0 22px rgba(139,92,246,.16)",
                    }}
                  >
                    <img
                      src="/borderbro/borderbro-thinking.png"
                      alt="BorderBro analizando"
                      style={{
                        width: "39px",
                        height: "39px",
                        objectFit: "contain",
                      }}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#3f3f46",
                      }}
                    >
                      Analizando tus datos...
                    </div>

                    <div
                      style={{
                        fontSize: "9px",
                        color: "#a1a1aa",
                        marginTop: "2px",
                      }}
                    >
                      BorderBro está consultando BOSSE
                    </div>
                  </div>
                </div>
              )}

              {borderBroError && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#9f1239",
                    fontSize: "11px",
                  }}
                >
                  {borderBroError}
                </div>
              )}
            </div>

            {/* COMPOSER */}

            <div
              style={{
                padding: "12px 14px 14px",
                background:
                  "rgba(255,255,255,.95)",
                borderTop: "1px solid #ececf0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "8px",
                  padding: "6px 6px 6px 12px",
                  borderRadius: "16px",
                  background: "#fff",
                  border:
                    "1px solid #dedee5",
                  boxShadow:
                    "0 5px 20px rgba(0,0,0,.055), 0 0 0 3px rgba(139,92,246,.025)",
                }}
              >
                <div
                  style={{
                    color: "#8b5cf6",
                    fontSize: "14px",
                    alignSelf: "center",
                  }}
                >
                  ✦
                </div>

                <textarea
                  value={borderBroMensaje}
                  disabled={borderBroCargando}
                  onChange={(e) =>
                    setBorderBroMensaje(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey
                    ) {
                      e.preventDefault();
                      enviarPreguntaBorderBro();
                    }
                  }}
                  placeholder="Pregunta sobre tus datos..."
                  rows={2}
                  style={{
                    flex: 1,
                    resize: "none",
                    border: "none",
                    background:
                      "transparent",
                    padding: "8px 2px",
                    fontFamily: "inherit",
                    fontSize: "12px",
                    outline: "none",
                    color: "#27272a",
                    boxSizing:
                      "border-box",
                  }}
                />

                <button
                  type="button"
                  disabled={
                    borderBroCargando ||
                    !borderBroMensaje.trim()
                  }
                  onClick={() =>
                    enviarPreguntaBorderBro()
                  }
                  style={{
                    width: "39px",
                    height: "39px",
                    flexShrink: 0,
                    border: "none",
                    borderRadius: "12px",
                    background:
                      borderBroCargando ||
                      !borderBroMensaje.trim()
                        ? "#e4e4e7"
                        : "linear-gradient(135deg, #18181b, #33264b)",
                    color: "#fff",
                    cursor:
                      borderBroCargando ||
                      !borderBroMensaje.trim()
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "17px",
                    boxShadow:
                      borderBroCargando ||
                      !borderBroMensaje.trim()
                        ? "none"
                        : "0 5px 14px rgba(0,0,0,.16)",
                  }}
                >
                  ↑
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  gap: "5px",
                  marginTop: "8px",
                  color: "#a1a1aa",
                  fontSize: "8px",
                  letterSpacing: ".2px",
                }}
              >
                <span
                  style={{
                    color: "#8b5cf6",
                  }}
                >
                  ✦
                </span>
                Powered by BOSSE Intelligence
              </div>
            </div>
          </div>
        </>
      )}
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