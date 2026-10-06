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

    const tipoContenido =
      respuesta.headers.get("content-type") || "";

    const textoRespuestaHttp =
      await respuesta.text();

    let resultado;

    if (tipoContenido.includes("application/json")) {
      try {
        resultado = JSON.parse(textoRespuestaHttp);
      } catch {
        throw new Error(
          "BorderBro recibió una respuesta JSON inválida del servidor."
        );
      }
    } else {
      console.error(
        "Respuesta no JSON de BorderBro:",
        respuesta.status,
        textoRespuestaHttp.slice(0, 300)
      );

      throw new Error(
        respuesta.status === 404
          ? "BorderBro todavía no está disponible en el servidor desplegado."
          : "El servidor de BorderBro no respondió correctamente. Revisa el despliegue del backend."
      );
    }

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
          BORDERBRO · AI INTELLIGENCE
      ====================================================== */}

      {!borderBroAbierto && (
  <button
    type="button"
    onClick={() => setBorderBroAbierto(true)}
    title="Pregúntale a BorderBro"
    aria-label="Abrir BorderBro AI"
    style={{
      position: "fixed",
      right: "22px",
      bottom: "22px",
      zIndex: 1000,

      width: "68px",
      height: "68px",
      padding: "3px",

      borderRadius: "50%",
      border: "1px solid rgba(167, 139, 250, 0.45)",

      background:
        "linear-gradient(145deg, #171026 0%, #090713 100%)",

      boxShadow:
        "0 14px 38px rgba(35, 15, 70, 0.38), 0 0 24px rgba(124, 58, 237, 0.22)",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      cursor: "pointer",
      overflow: "visible",
    }}
  >
    <span
      style={{
        width: "60px",
        height: "60px",

        borderRadius: "50%",
        overflow: "hidden",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        background:
          "radial-gradient(circle at 50% 35%, rgba(139,92,246,.25), rgba(15,10,25,.95))",

        position: "relative",
      }}
    >
      <img
        src="/borderbro/borderbro-button.png"
        alt="BorderBro"
        style={{
          width: "58px",
          height: "58px",
          objectFit: "contain",
          display: "block",
        }}
      />
    </span>

    <span
      style={{
        position: "absolute",
        right: "3px",
        bottom: "4px",

        width: "13px",
        height: "13px",

        borderRadius: "50%",
        background: "#34d399",
        border: "3px solid #0b0813",

        boxShadow:
          "0 0 10px rgba(52,211,153,.85)",
      }}
    />
  </button>
)}

      {borderBroAbierto && (
        <>
          <div
            className="bb-backdrop"
            onClick={() => setBorderBroAbierto(false)}
          />

          <section
            className="bb-shell"
            role="dialog"
            aria-modal="true"
            aria-label="BorderBro AI"
          >
            <div className="bb-aurora bb-aurora-one" />
            <div className="bb-aurora bb-aurora-two" />
            <div className="bb-grid" />

            <header className="bb-header">
              <div className="bb-brand">
                <div className="bb-brand-avatar">
                  <img src={imagenBorderBro} alt="BorderBro" />
                </div>

                <div>
                  <div className="bb-brand-row">
                    <strong>BorderBro AI</strong>
                    <span className="bb-online">
                      <i />
                      ONLINE
                    </span>
                  </div>
                  <span className="bb-subtitle">
                    Inteligencia financiera de BOSSE
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="bb-close"
                onClick={() => setBorderBroAbierto(false)}
                aria-label="Cerrar BorderBro"
              >
                ×
              </button>
            </header>

            <div className="bb-context">
              <span className="bb-context-icon">✦</span>
              <div>
                <small>CONTEXTO ACTUAL</small>
                <strong>
                  {formatoFecha(rangoSeleccionado.inicio)}
                  {" — "}
                  {formatoFecha(rangoSeleccionado.fin)}
                </strong>
              </div>
              <span className="bb-context-pill">
                BOSSE LIVE
              </span>
            </div>

            <div className="bb-chat">
              {borderBroConversacion.length <= 1 && (
                <div className="bb-hero">
                  <div className="bb-orbit">
                    <span className="bb-ring bb-ring-one" />
                    <span className="bb-ring bb-ring-two" />
                    <span className="bb-orbit-glow" />
                    <img
                      src="/borderbro/borderbro-normal.png"
                      alt="BorderBro"
                    />
                    <span className="bb-orbit-star bb-star-one">✦</span>
                    <span className="bb-orbit-star bb-star-two">✦</span>
                  </div>

                  <span className="bb-eyebrow">
                    ✦ TU ANALISTA DE NEGOCIO
                  </span>
                  <h2>¿Qué quieres saber de tu negocio?</h2>
                  <p>
                    Pregunta en lenguaje natural. BorderBro cruza
                    ingresos, egresos, nómina y cortes para encontrar
                    patrones, riesgos y oportunidades.
                  </p>

                  <div className="bb-prompts">
                    {preguntasBorderBro.map((pregunta, index) => (
                      <button
                        key={pregunta}
                        type="button"
                        disabled={borderBroCargando}
                        onClick={() =>
                          enviarPreguntaBorderBro(pregunta)
                        }
                        className="bb-prompt"
                      >
                        <span className="bb-prompt-icon">
                          {index === 0
                            ? "↘"
                            : index === 1
                            ? "↔"
                            : index === 2
                            ? "✦"
                            : "⌁"}
                        </span>
                        <span>{pregunta}</span>
                        <b>›</b>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bb-thread">
                {borderBroConversacion.map((mensaje, index) => {
                  const esUsuario = mensaje.rol === "user";
                  const esSaludoInicial =
                    index === 0 &&
                    borderBroConversacion.length <= 1;

                  if (esSaludoInicial) return null;

                  return (
                    <div
                      key={`${mensaje.rol}-${index}`}
                      className={
                        esUsuario
                          ? "bb-message bb-message-user"
                          : "bb-message bb-message-ai"
                      }
                    >
                      {!esUsuario && (
                        <div className="bb-message-avatar">
                          <img
                            src="/borderbro/borderbro-inline.png"
                            alt=""
                          />
                        </div>
                      )}

                      <div className="bb-message-content">
                        {!esUsuario && (
                          <div className="bb-message-label">
                            <span>BorderBro</span>
                            <small>AI ANALYSIS</small>
                          </div>
                        )}

                        <div className="bb-message-bubble">
                          {mensaje.texto}
                        </div>

                        {!esUsuario &&
                          mensaje.meta?.herramientas_utilizadas
                            ?.length > 0 && (
                            <div className="bb-analysis-meta">
                              <span>✦</span>
                              {mensaje.meta.cantidad_consultas ||
                                mensaje.meta
                                  .herramientas_utilizadas.length}{" "}
                              consultas a BOSSE
                            </div>
                          )}

                        {!esUsuario &&
                          mensaje.evidencia?.length > 0 && (
                            <details className="bb-sources">
                              <summary>
                                <span>⌁</span>
                                Ver datos utilizados
                                <b>+</b>
                              </summary>
                              <pre>
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
                })}

                {borderBroCargando && (
                  <div className="bb-thinking">
                    <div className="bb-thinking-avatar">
                      <span />
                      <img
                        src="/borderbro/borderbro-thinking.png"
                        alt="BorderBro analizando"
                      />
                    </div>
                    <div>
                      <strong>Analizando BOSSE</strong>
                      <p>
                        Cruzando datos y buscando patrones
                        <span className="bb-dots">•••</span>
                      </p>
                    </div>
                  </div>
                )}

                {borderBroError && (
                  <div className="bb-error">
                    <span>!</span>
                    <div>
                      <strong>No pude completar la consulta</strong>
                      <p>{borderBroError}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <footer className="bb-composer-wrap">
              <div className="bb-composer">
                <span className="bb-composer-spark">✦</span>
                <textarea
                  value={borderBroMensaje}
                  disabled={borderBroCargando}
                  onChange={(e) =>
                    setBorderBroMensaje(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviarPreguntaBorderBro();
                    }
                  }}
                  placeholder="Pregunta lo que quieras sobre BOSSE..."
                  rows={1}
                />
                <button
                  type="button"
                  disabled={
                    borderBroCargando ||
                    !borderBroMensaje.trim()
                  }
                  onClick={() => enviarPreguntaBorderBro()}
                  aria-label="Enviar pregunta"
                >
                  ↑
                </button>
              </div>

              <div className="bb-powered">
                <span>✦</span>
                Powered by BOSSE Intelligence
                <i />
                Los datos pueden requerir revisión humana
              </div>
            </footer>
          </section>

          <style>{`
            .bb-launcher {
              position: fixed;
              right: 24px;
              bottom: 24px;
              z-index: 1000;
              height: 72px;
              padding: 8px 15px 8px 8px;
              border: 1px solid rgba(196,181,253,.24);
              border-radius: 24px;
              color: #fff;
              background:
                radial-gradient(circle at 15% 20%, rgba(139,92,246,.30), transparent 42%),
                linear-gradient(135deg, #090713 0%, #171026 55%, #211238 100%);
              box-shadow:
                0 24px 60px rgba(17,8,38,.38),
                0 0 0 1px rgba(139,92,246,.08),
                inset 0 1px rgba(255,255,255,.08);
              display: flex;
              align-items: center;
              gap: 11px;
              cursor: pointer;
              font-family: inherit;
              overflow: hidden;
              transition: transform .2s ease, box-shadow .2s ease;
            }

            .bb-launcher:hover {
              transform: translateY(-3px);
              box-shadow:
                0 28px 70px rgba(17,8,38,.45),
                0 0 30px rgba(124,58,237,.16);
            }

            .bb-launcher-glow {
              position: absolute;
              width: 100px;
              height: 100px;
              left: -25px;
              top: -35px;
              border-radius: 50%;
              background: rgba(124,58,237,.22);
              filter: blur(25px);
              pointer-events: none;
            }

            .bb-launcher-avatar {
              width: 55px;
              height: 55px;
              border-radius: 18px;
              position: relative;
              flex: 0 0 auto;
              display: grid;
              place-items: center;
              background: rgba(255,255,255,.07);
              border: 1px solid rgba(255,255,255,.12);
            }

            .bb-launcher-avatar img {
              width: 52px;
              height: 52px;
              object-fit: contain;
              position: relative;
              z-index: 1;
            }

            .bb-launcher-online {
              position: absolute;
              right: -1px;
              bottom: -1px;
              width: 11px;
              height: 11px;
              border-radius: 50%;
              background: #34d399;
              border: 2px solid #130d21;
              box-shadow: 0 0 12px rgba(52,211,153,.75);
              z-index: 2;
            }

            .bb-launcher-copy {
              display: flex;
              flex-direction: column;
              text-align: left;
              line-height: 1.15;
            }

            .bb-launcher-copy strong {
              font-size: 12px;
              font-weight: 760;
              white-space: nowrap;
            }

            .bb-launcher-copy small {
              color: #aaa0bd;
              font-size: 9px;
              margin-top: 5px;
              letter-spacing: .3px;
            }

            .bb-launcher-spark {
              color: #c4b5fd;
              font-size: 13px;
              margin-left: 3px;
            }

            .bb-backdrop {
              position: fixed;
              inset: 0;
              z-index: 1090;
              background: rgba(3,2,8,.55);
              backdrop-filter: blur(7px);
              -webkit-backdrop-filter: blur(7px);
              animation: bbFade .18s ease;
            }

            .bb-shell {
              --bb-border: rgba(196,181,253,.13);
              position: fixed;
              z-index: 1100;
              right: 24px;
              bottom: 24px;
              width: min(470px, calc(100vw - 48px));
              height: min(780px, calc(100dvh - 48px));
              min-height: 560px;
              border-radius: 30px;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              isolation: isolate;
              color: #f8f7ff;
              font-family: inherit;
              background:
                radial-gradient(circle at 78% -10%, rgba(109,40,217,.24), transparent 34%),
                linear-gradient(180deg, #0b0813 0%, #100b1b 48%, #09070f 100%);
              border: 1px solid var(--bb-border);
              box-shadow:
                0 35px 100px rgba(0,0,0,.55),
                0 0 0 1px rgba(124,58,237,.05),
                inset 0 1px rgba(255,255,255,.05);
              animation: bbOpen .24s cubic-bezier(.2,.8,.2,1);
            }

            .bb-aurora {
              position: absolute;
              z-index: -2;
              border-radius: 50%;
              filter: blur(65px);
              pointer-events: none;
            }

            .bb-aurora-one {
              width: 280px;
              height: 280px;
              right: -130px;
              top: 60px;
              background: rgba(124,58,237,.22);
            }

            .bb-aurora-two {
              width: 240px;
              height: 240px;
              left: -130px;
              bottom: 100px;
              background: rgba(37,99,235,.12);
            }

            .bb-grid {
              position: absolute;
              inset: 0;
              z-index: -1;
              opacity: .055;
              pointer-events: none;
              background-image:
                linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px);
              background-size: 34px 34px;
              mask-image: linear-gradient(to bottom, #000, transparent 58%);
            }

            .bb-header {
              padding: 17px 18px 11px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              flex: 0 0 auto;
            }

            .bb-brand {
              display: flex;
              align-items: center;
              gap: 11px;
              min-width: 0;
            }

            .bb-brand-avatar {
              width: 43px;
              height: 43px;
              border-radius: 14px;
              flex: 0 0 auto;
              display: grid;
              place-items: center;
              background: linear-gradient(145deg, rgba(139,92,246,.18), rgba(255,255,255,.035));
              border: 1px solid rgba(196,181,253,.14);
              box-shadow: 0 0 22px rgba(124,58,237,.09);
            }

            .bb-brand-avatar img {
              width: 40px;
              height: 40px;
              object-fit: contain;
            }

            .bb-brand-row {
              display: flex;
              align-items: center;
              gap: 8px;
              min-width: 0;
            }

            .bb-brand-row strong {
              font-size: 15px;
              letter-spacing: -.25px;
              white-space: nowrap;
            }

            .bb-online {
              display: inline-flex;
              align-items: center;
              gap: 5px;
              border: 1px solid rgba(52,211,153,.15);
              background: rgba(52,211,153,.07);
              color: #6ee7b7;
              padding: 4px 7px;
              border-radius: 999px;
              font-size: 7px;
              letter-spacing: .8px;
              font-weight: 800;
            }

            .bb-online i {
              width: 5px;
              height: 5px;
              border-radius: 50%;
              background: #34d399;
              box-shadow: 0 0 8px #34d399;
            }

            .bb-subtitle {
              display: block;
              color: #8f879d;
              font-size: 9px;
              margin-top: 4px;
            }

            .bb-close {
              width: 38px;
              height: 38px;
              flex: 0 0 auto;
              border-radius: 13px;
              border: 1px solid rgba(255,255,255,.08);
              background: rgba(255,255,255,.035);
              color: #b9b2c5;
              cursor: pointer;
              font-size: 19px;
            }

            .bb-context {
              margin: 0 18px 10px;
              padding: 9px 11px;
              border-radius: 14px;
              display: flex;
              align-items: center;
              gap: 9px;
              flex: 0 0 auto;
              background: rgba(255,255,255,.035);
              border: 1px solid rgba(255,255,255,.065);
              backdrop-filter: blur(12px);
            }

            .bb-context-icon {
              color: #a78bfa;
              font-size: 12px;
            }

            .bb-context > div {
              display: flex;
              flex-direction: column;
              min-width: 0;
              flex: 1;
            }

            .bb-context small {
              color: #746d80;
              font-size: 7px;
              font-weight: 800;
              letter-spacing: .9px;
            }

            .bb-context strong {
              margin-top: 3px;
              font-size: 9px;
              color: #d8d3e2;
              font-weight: 650;
            }

            .bb-context-pill {
              flex: 0 0 auto;
              color: #a78bfa;
              font-size: 7px;
              font-weight: 800;
              letter-spacing: .6px;
              border: 1px solid rgba(167,139,250,.13);
              border-radius: 999px;
              padding: 5px 7px;
              background: rgba(124,58,237,.07);
            }

            .bb-chat {
              flex: 1 1 auto;
              min-height: 0;
              overflow-y: auto;
              overscroll-behavior: contain;
              scrollbar-width: thin;
              scrollbar-color: rgba(139,92,246,.25) transparent;
            }

            .bb-chat::-webkit-scrollbar {
              width: 5px;
            }

            .bb-chat::-webkit-scrollbar-thumb {
              background: rgba(139,92,246,.24);
              border-radius: 99px;
            }

            .bb-hero {
              padding: 12px 22px 18px;
              text-align: center;
            }

            .bb-orbit {
              width: 142px;
              height: 142px;
              margin: 1px auto 12px;
              position: relative;
              display: grid;
              place-items: center;
            }

            .bb-orbit img {
              width: 112px;
              height: 112px;
              object-fit: contain;
              position: relative;
              z-index: 3;
              filter: drop-shadow(0 15px 24px rgba(0,0,0,.28));
              animation: bbFloat 4s ease-in-out infinite;
            }

            .bb-orbit-glow {
              position: absolute;
              width: 90px;
              height: 90px;
              border-radius: 50%;
              background: rgba(124,58,237,.32);
              filter: blur(28px);
              z-index: 1;
            }

            .bb-ring {
              position: absolute;
              border-radius: 50%;
              border: 1px solid rgba(167,139,250,.18);
            }

            .bb-ring-one {
              width: 120px;
              height: 120px;
              animation: bbPulse 3s ease-in-out infinite;
            }

            .bb-ring-two {
              width: 142px;
              height: 142px;
              border-style: dashed;
              opacity: .55;
              animation: bbSpin 18s linear infinite;
            }

            .bb-orbit-star {
              position: absolute;
              z-index: 4;
              color: #c4b5fd;
              text-shadow: 0 0 14px #8b5cf6;
            }

            .bb-star-one {
              top: 22px;
              right: 10px;
              font-size: 12px;
            }

            .bb-star-two {
              left: 9px;
              bottom: 30px;
              font-size: 8px;
              opacity: .65;
            }

            .bb-eyebrow {
              color: #a78bfa;
              font-size: 8px;
              letter-spacing: 1.4px;
              font-weight: 800;
            }

            .bb-hero h2 {
              margin: 8px auto 0;
              max-width: 360px;
              color: #fff;
              font-size: 24px;
              line-height: 1.1;
              letter-spacing: -.8px;
              font-weight: 760;
            }

            .bb-hero p {
              max-width: 380px;
              margin: 10px auto 0;
              color: #92899f;
              font-size: 10px;
              line-height: 1.6;
            }

            .bb-prompts {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px;
              margin-top: 18px;
            }

            .bb-prompt {
              min-height: 68px;
              padding: 11px;
              border-radius: 15px;
              border: 1px solid rgba(255,255,255,.075);
              background:
                linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.018));
              color: #d8d3e2;
              font-family: inherit;
              text-align: left;
              display: grid;
              grid-template-columns: 27px 1fr 10px;
              align-items: center;
              gap: 8px;
              cursor: pointer;
              transition: border-color .18s ease, transform .18s ease, background .18s ease;
              backdrop-filter: blur(10px);
            }

            .bb-prompt:hover {
              transform: translateY(-2px);
              border-color: rgba(167,139,250,.25);
              background: rgba(124,58,237,.075);
            }

            .bb-prompt:disabled {
              opacity: .5;
              cursor: not-allowed;
            }

            .bb-prompt-icon {
              width: 27px;
              height: 27px;
              border-radius: 9px;
              display: grid;
              place-items: center;
              color: #c4b5fd;
              background: rgba(124,58,237,.12);
              border: 1px solid rgba(167,139,250,.10);
            }

            .bb-prompt span:nth-child(2) {
              font-size: 9px;
              line-height: 1.35;
              font-weight: 650;
            }

            .bb-prompt b {
              color: #5e566b;
              font-size: 16px;
              font-weight: 400;
            }

            .bb-thread {
              padding: 12px 18px 22px;
            }

            .bb-message {
              display: flex;
              gap: 9px;
              margin-bottom: 18px;
            }

            .bb-message-user {
              justify-content: flex-end;
            }

            .bb-message-avatar {
              width: 34px;
              height: 34px;
              flex: 0 0 auto;
              border-radius: 11px;
              display: grid;
              place-items: center;
              background: rgba(124,58,237,.10);
              border: 1px solid rgba(167,139,250,.10);
            }

            .bb-message-avatar img {
              width: 31px;
              height: 31px;
              object-fit: contain;
            }

            .bb-message-content {
              max-width: 86%;
              min-width: 0;
            }

            .bb-message-user .bb-message-content {
              max-width: 80%;
            }

            .bb-message-label {
              display: flex;
              align-items: center;
              gap: 7px;
              margin: 0 0 6px 2px;
            }

            .bb-message-label span {
              color: #ddd7e8;
              font-size: 9px;
              font-weight: 750;
            }

            .bb-message-label small {
              color: #7c6f90;
              font-size: 6px;
              letter-spacing: .9px;
              font-weight: 800;
            }

            .bb-message-bubble {
              white-space: pre-wrap;
              font-size: 11px;
              line-height: 1.65;
            }

            .bb-message-ai .bb-message-bubble {
              color: #d5d0de;
              padding: 13px 14px;
              border-radius: 5px 17px 17px 17px;
              background: rgba(255,255,255,.035);
              border: 1px solid rgba(255,255,255,.065);
              box-shadow: inset 0 1px rgba(255,255,255,.025);
              backdrop-filter: blur(10px);
            }

            .bb-message-user .bb-message-bubble {
              color: #fff;
              padding: 11px 14px;
              border-radius: 17px 5px 17px 17px;
              background: linear-gradient(135deg, #5b21b6, #312e81);
              box-shadow: 0 8px 24px rgba(76,29,149,.22);
            }

            .bb-analysis-meta {
              margin-top: 7px;
              color: #8f7daa;
              font-size: 8px;
              display: flex;
              align-items: center;
              gap: 5px;
            }

            .bb-analysis-meta span {
              color: #a78bfa;
            }

            .bb-sources {
              margin-top: 8px;
              border-radius: 12px;
              border: 1px solid rgba(255,255,255,.055);
              background: rgba(255,255,255,.022);
              overflow: hidden;
            }

            .bb-sources summary {
              list-style: none;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 7px;
              padding: 10px 11px;
              color: #968ba7;
              font-size: 8px;
              font-weight: 650;
            }

            .bb-sources summary::-webkit-details-marker {
              display: none;
            }

            .bb-sources summary span {
              color: #a78bfa;
            }

            .bb-sources summary b {
              margin-left: auto;
              font-size: 13px;
              font-weight: 400;
            }

            .bb-sources pre {
              margin: 0;
              padding: 11px;
              max-height: 230px;
              overflow: auto;
              border-top: 1px solid rgba(255,255,255,.045);
              color: #a8a0b3;
              background: rgba(0,0,0,.18);
              white-space: pre-wrap;
              word-break: break-word;
              font-size: 8px;
              line-height: 1.5;
            }

            .bb-thinking {
              display: flex;
              align-items: center;
              gap: 12px;
              margin: 8px 0 6px;
              padding: 12px;
              border-radius: 15px;
              background: rgba(124,58,237,.055);
              border: 1px solid rgba(167,139,250,.09);
            }

            .bb-thinking-avatar {
              width: 48px;
              height: 48px;
              flex: 0 0 auto;
              position: relative;
              display: grid;
              place-items: center;
            }

            .bb-thinking-avatar span {
              position: absolute;
              inset: 0;
              border-radius: 50%;
              border: 1px solid rgba(167,139,250,.20);
              box-shadow: 0 0 25px rgba(124,58,237,.12);
              animation: bbPulse 1.5s ease-in-out infinite;
            }

            .bb-thinking-avatar img {
              width: 43px;
              height: 43px;
              object-fit: contain;
              position: relative;
              z-index: 1;
            }

            .bb-thinking strong {
              color: #ddd7e8;
              font-size: 10px;
            }

            .bb-thinking p {
              margin: 4px 0 0;
              color: #7f758d;
              font-size: 8px;
            }

            .bb-dots {
              display: inline-block;
              margin-left: 4px;
              color: #a78bfa;
              letter-spacing: 2px;
              animation: bbBlink 1.1s ease-in-out infinite;
            }

            .bb-error {
              display: flex;
              gap: 10px;
              align-items: flex-start;
              padding: 12px;
              border-radius: 14px;
              color: #fecdd3;
              background: rgba(159,18,57,.12);
              border: 1px solid rgba(251,113,133,.16);
            }

            .bb-error > span {
              width: 23px;
              height: 23px;
              border-radius: 8px;
              display: grid;
              place-items: center;
              flex: 0 0 auto;
              background: rgba(251,113,133,.12);
              font-weight: 800;
            }

            .bb-error strong {
              display: block;
              font-size: 9px;
            }

            .bb-error p {
              margin: 4px 0 0;
              color: #cfa5af;
              font-size: 8px;
              line-height: 1.45;
            }

            .bb-composer-wrap {
              flex: 0 0 auto;
              padding: 10px 14px max(13px, env(safe-area-inset-bottom));
              background: linear-gradient(180deg, rgba(9,7,15,.60), rgba(9,7,15,.97) 28%);
              border-top: 1px solid rgba(255,255,255,.045);
              backdrop-filter: blur(18px);
            }

            .bb-composer {
              min-height: 49px;
              display: flex;
              align-items: flex-end;
              gap: 8px;
              padding: 5px 5px 5px 12px;
              border-radius: 17px;
              background: rgba(255,255,255,.045);
              border: 1px solid rgba(196,181,253,.11);
              box-shadow:
                inset 0 1px rgba(255,255,255,.035),
                0 10px 30px rgba(0,0,0,.16);
            }

            .bb-composer:focus-within {
              border-color: rgba(167,139,250,.28);
              box-shadow:
                0 0 0 3px rgba(124,58,237,.055),
                inset 0 1px rgba(255,255,255,.04);
            }

            .bb-composer-spark {
              align-self: center;
              color: #a78bfa;
              font-size: 12px;
            }

            .bb-composer textarea {
              flex: 1;
              min-width: 0;
              max-height: 100px;
              resize: none;
              border: 0;
              outline: 0;
              padding: 10px 2px;
              background: transparent;
              color: #f3eff9;
              font: inherit;
              font-size: 10px;
              line-height: 1.45;
            }

            .bb-composer textarea::placeholder {
              color: #6f667b;
            }

            .bb-composer button {
              width: 39px;
              height: 39px;
              flex: 0 0 auto;
              border: 0;
              border-radius: 13px;
              color: #fff;
              background: linear-gradient(135deg, #7c3aed, #4f46e5);
              box-shadow: 0 7px 18px rgba(79,70,229,.22);
              cursor: pointer;
              font-size: 17px;
            }

            .bb-composer button:disabled {
              color: #5d5667;
              background: rgba(255,255,255,.045);
              box-shadow: none;
              cursor: not-allowed;
            }

            .bb-powered {
              margin-top: 7px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 5px;
              color: #554d61;
              font-size: 6.5px;
              letter-spacing: .2px;
              text-align: center;
            }

            .bb-powered span {
              color: #7c3aed;
            }

            .bb-powered i {
              width: 2px;
              height: 2px;
              border-radius: 50%;
              background: #554d61;
            }

            @keyframes bbOpen {
              from { opacity: 0; transform: translateY(16px) scale(.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }

            @keyframes bbFade {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            @keyframes bbFloat {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-7px); }
            }

            @keyframes bbPulse {
              0%, 100% { transform: scale(.96); opacity: .45; }
              50% { transform: scale(1.04); opacity: 1; }
            }

            @keyframes bbSpin {
              to { transform: rotate(360deg); }
            }

            @keyframes bbBlink {
              0%, 100% { opacity: .25; }
              50% { opacity: 1; }
            }

            @media (max-width: 680px) {
              .bb-launcher {
                right: 14px;
                bottom: max(14px, env(safe-area-inset-bottom));
                height: 62px;
                border-radius: 21px;
                padding: 7px;
              }

              .bb-launcher-avatar {
                width: 48px;
                height: 48px;
                border-radius: 16px;
              }

              .bb-launcher-avatar img {
                width: 46px;
                height: 46px;
              }

              .bb-launcher-copy,
              .bb-launcher-spark {
                display: none;
              }

              .bb-backdrop {
                background: #09070f;
                backdrop-filter: none;
              }

              .bb-shell {
                inset: 0;
                width: 100vw;
                height: 100dvh;
                min-height: 0;
                max-width: none;
                max-height: none;
                border: 0;
                border-radius: 0;
                box-shadow: none;
              }

              .bb-header {
                padding:
                  max(13px, env(safe-area-inset-top))
                  14px
                  9px;
              }

              .bb-brand-avatar {
                width: 39px;
                height: 39px;
                border-radius: 13px;
              }

              .bb-brand-avatar img {
                width: 37px;
                height: 37px;
              }

              .bb-brand-row strong {
                font-size: 14px;
              }

              .bb-subtitle {
                font-size: 8px;
              }

              .bb-context {
                margin: 0 14px 7px;
                padding: 8px 10px;
              }

              .bb-context-pill {
                display: none;
              }

              .bb-hero {
                padding: 8px 15px 16px;
              }

              .bb-orbit {
                width: 126px;
                height: 126px;
                margin-bottom: 8px;
              }

              .bb-orbit img {
                width: 100px;
                height: 100px;
              }

              .bb-ring-one {
                width: 108px;
                height: 108px;
              }

              .bb-ring-two {
                width: 126px;
                height: 126px;
              }

              .bb-hero h2 {
                font-size: 22px;
                max-width: 300px;
              }

              .bb-hero p {
                font-size: 9px;
                max-width: 330px;
              }

              .bb-prompts {
                gap: 7px;
                margin-top: 15px;
              }

              .bb-prompt {
                min-height: 62px;
                padding: 9px;
                grid-template-columns: 25px 1fr;
              }

              .bb-prompt-icon {
                width: 25px;
                height: 25px;
              }

              .bb-prompt b {
                display: none;
              }

              .bb-prompt span:nth-child(2) {
                font-size: 8.5px;
              }

              .bb-thread {
                padding: 10px 14px 18px;
              }

              .bb-message-content {
                max-width: calc(100% - 43px);
              }

              .bb-message-user .bb-message-content {
                max-width: 86%;
              }

              .bb-message-bubble {
                font-size: 10.5px;
              }

              .bb-composer-wrap {
                padding:
                  9px
                  10px
                  max(10px, env(safe-area-inset-bottom));
              }

              .bb-powered {
                font-size: 6px;
              }
            }

            @media (max-width: 370px) {
              .bb-online {
                display: none;
              }

              .bb-hero h2 {
                font-size: 20px;
              }

              .bb-prompts {
                grid-template-columns: 1fr;
              }

              .bb-prompt {
                min-height: 50px;
              }
            }

            @media (max-height: 700px) and (min-width: 681px) {
              .bb-shell {
                height: calc(100dvh - 28px);
                bottom: 14px;
              }

              .bb-orbit {
                width: 105px;
                height: 105px;
              }

              .bb-orbit img {
                width: 84px;
                height: 84px;
              }

              .bb-ring-one {
                width: 92px;
                height: 92px;
              }

              .bb-ring-two {
                width: 105px;
                height: 105px;
              }

              .bb-hero h2 {
                font-size: 21px;
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .bb-shell,
              .bb-backdrop,
              .bb-orbit img,
              .bb-ring,
              .bb-thinking-avatar span,
              .bb-dots {
                animation: none !important;
              }
            }
          `}</style>
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