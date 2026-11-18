// Preguntas de negocio. Son atajos editables, no se envían automáticamente.
export const QUESTION_GROUPS = [
  { id:'direccion', title:'Dirección y estrategia', icon:'sparkles', prompts:[
    ['Diagnóstico ejecutivo','Dame un diagnóstico ejecutivo de BOSSE: qué va bien, qué requiere atención y qué verificarías primero.'],
    ['Tres prioridades','Si fueras el director de BOSSE, ¿cuáles serían tus tres prioridades para los próximos 30 días y por qué?'],
    ['Decisión de inversión','Tenemos un presupuesto comercial limitado. ¿Cómo decidirías dónde invertirlo y qué datos faltan para hacerlo?'],
    ['Información faltante','¿Qué datos de BOSSE puedes consultar y qué información debo darte para obtener recomendaciones más precisas?'],
  ]},
  { id:'ventas', title:'Ventas y rentabilidad', icon:'chart', prompts:[
    ['¿Somos rentables?','Con los ingresos, gastos y nómina registrados, ¿qué podemos y qué no podemos afirmar sobre la rentabilidad real de BOSSE?'],
    ['Días de más ventas','Analiza los días con mayores y menores ventas y sugiere qué investigar antes de cambiar la operación.'],
    ['GM y GPM','Explícame el GM y el GPM, qué gastos podrían faltar y cómo afecta eso nuestras decisiones.'],
    ['Comparar periodos','Compara este periodo con periodos equivalentes, indicando si faltan cortes o días registrados.'],
    ['Precios y cover','¿Cómo evaluarías si debemos cambiar precios de ticket, cover o paquetes sin perjudicar el margen?'],
  ]},
  { id:'forecast', title:'Forecasting', icon:'chart', prompts:[
    ['Pronóstico 4 semanas','Pronostica las ventas de las próximas cuatro semanas y explícame escenarios conservador, base y optimista con sus límites.'],
    ['Pronóstico 12 semanas','Construye un escenario de ventas para las próximas 12 semanas usando todo el historial verificable disponible.'],
    ['Datos para pronóstico','Si todavía no podemos hacer forecasting confiable, identifica qué semanas o datos faltan y proponme cómo recopilarlos.'],
    ['Sensibilidad','¿Qué pasaría si las ventas subieran 10% y los gastos operativos 5%? Distingue simulación de pronóstico.'],
  ]},
  { id:'marketing', title:'Marketing y crecimiento', icon:'megaphone', prompts:[
    ['Campaña 30 días','Investiga estrategias de marketing para aumentar las ventas de BOSSE y propón una campaña medible de 30 días.'],
    ['Deep research local','Investiga tendencias y competencia local para un negocio nocturno como BOSSE. Cita fuentes públicas y separa las hipótesis.'],
    ['Presupuesto $15,000','Si tuviera $15,000 MXN para aumentar ventas, ¿qué experimentos de marketing probarías y cómo medirías resultados?'],
    ['Traer clientes de vuelta','Diseña un experimento de fidelización para atraer clientes recurrentes sin asumir que un descuento es rentable.'],
    ['Calendario y promociones','Proponme un calendario comercial de cuatro semanas basado en nuestros eventos reales y lo que falte confirmar.'],
    ['Medir campañas','¿Qué datos debo registrar para medir costo por compra, ventas incrementales, aforo y rentabilidad de una campaña?'],
  ]},
  { id:'operacion', title:'Operación y control', icon:'database', prompts:[
    ['Cortes de caja','¿Qué cortes de caja requieren revisión y qué evidencia específica los respalda?'],
    ['Gastos prioritarios','¿Qué gastos parecen atípicos y cuáles son las categorías y proveedores que más pesan?'],
    ['Nómina','Compara prenómina aprobada y nómina registrada, sin sumar pagos duplicados.'],
    ['Capacidad y demanda','¿Qué información de aforo, personal, horarios y asistencia ayudaría a vender más sin afectar el servicio?'],
  ]},
  { id:'investigacion', title:'Investigación y decisiones', icon:'search', prompts:[
    ['Benchmark externo','Busca referencias públicas actuales del sector de bares y vida nocturna; distingue lo verificable de las estimaciones.'],
    ['Oportunidades de mercado','¿Qué tendencias de consumo locales valdría la pena probar en BOSSE y qué evidencias las respaldan?'],
    ['Plan de acción','Transforma nuestro último diagnóstico en acciones con responsable, plazo, KPI y criterio para continuar o detener.'],
    ['Preguntas que me harías','Hazme hasta cinco preguntas concretas sobre BOSSE para que puedas dar recomendaciones comerciales más útiles.'],
  ]}
];
