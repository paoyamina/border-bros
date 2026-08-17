const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const multer = require('multer'); 
const fs = require('fs');
const ExcelJS = require('exceljs');
const app = express();

// Configuración de CORS más robusta
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Aumentamos el límite para que pasen las fotos sin problema
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configuración de Multer (Verifica que la carpeta 'uploads' exista)
const upload = multer({ dest: 'uploads/' });

// 1. Conexión a Base de Datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,
});

async function registrarHistorialEgreso({
  egresoId,
  accion,
  usuarioId,
  datosAnteriores = null,
  datosNuevos = null,
  cliente = pool,
}) {
  await cliente.query(
    `
      INSERT INTO egresos_historial (
        egreso_id,
        accion,
        usuario_id,
        datos_anteriores,
        datos_nuevos
      )
      VALUES ($1, $2, $3, $4, $5);
    `,
    [
      egresoId,
      accion,
      usuarioId || null,
      datosAnteriores ? JSON.stringify(datosAnteriores) : null,
      datosNuevos ? JSON.stringify(datosNuevos) : null,
    ]
  );
}

async function registrarHistorialCorte({
  corteId,
  accion,
  usuarioId,
  datosAnteriores = null,
  datosNuevos = null,
  cliente = pool,
}) {
  await cliente.query(
    `
      INSERT INTO cortes_historial (
        corte_id,
        accion,
        usuario_id,
        datos_anteriores,
        datos_nuevos
      )
      VALUES ($1, $2, $3, $4, $5);
    `,
    [
      corteId,
      accion,
      usuarioId || null,
      datosAnteriores ? JSON.stringify(datosAnteriores) : null,
      datosNuevos ? JSON.stringify(datosNuevos) : null,
    ]
  );
}


// 2. Google Drive Auth (OAuth)
const authorize = require('./auth');

let driveService;

authorize((auth) => {
  driveService = google.drive({ version: 'v3', auth });
});

const PARENT_FOLDER_ID = "1E49rMF7_dDjalF7AW4P8vurboUBowKcT";

// --- FUNCIONES AUXILIARES ---

async function crearCarpetaEnDrive(nombre) {
    const fileMetadata = {
        name: nombre,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [PARENT_FOLDER_ID],
    };
    const folder = await driveService.files.create({
        resource: fileMetadata,
        fields: 'id',
    });
    return folder.data.id;
}

async function subirArchivoADrive(pathArchivo, nombreArchivo, mimeType, folderId) {
    await driveService.files.create({
        requestBody: {
            name: nombreArchivo,
            parents: [folderId],
        },
        media: {
            mimeType: mimeType,
            body: fs.createReadStream(pathArchivo),
        },
    });
    // Elimina el archivo de la carpeta local 'uploads' para no llenar espacio
    if (fs.existsSync(pathArchivo)) {
        fs.unlinkSync(pathArchivo);
    }
}

// --- RUTAS (API) ---

// Login
app.post('/api/login', async (req, res) => {
  const { idCajero, usuarioLogin, usuario_login, password } = req.body;

  // Temporalmente aceptamos varios nombres para no romper el frontend todavía
  const login = usuarioLogin || usuario_login || idCajero;

  if (!login || !password) {
    return res.status(400).json({
      success: false,
      error: 'Debes ingresar usuario y contraseña'
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.usuario_login,
        u.nombre,
        u.email,
        COALESCE(r.nombre, u.rol) AS rol,
        u.rol_id,
        u.negocio_id
      FROM usuarios u
      LEFT JOIN roles r
        ON r.id = u.rol_id
      WHERE UPPER(TRIM(u.usuario_login)) = UPPER(TRIM($1))
        AND u.password_hash = $2
        AND u.activo = true
      LIMIT 1
      `,
      [login, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Usuario o contraseña incorrectos'
      });
    }

    const usuario = result.rows[0];

    return res.json({
      success: true,
      id: usuario.id,
      usuario_login: usuario.usuario_login,
      nombre: usuario.nombre,
      email: usuario.email,

      // Normalizado para permisos del frontend
      rol: String(usuario.rol || "").toLowerCase(),

      // Por si después queremos mostrarlo bonito
      rol_display: usuario.rol,

      rol_id: usuario.rol_id,
      negocio_id: usuario.negocio_id
    });

  } catch (err) {
    console.error('Error DB login:', err);

    return res.status(500).json({
      success: false,
      error: 'Error en la base de datos'
    });
  }
});

// Guardar Reporte, subir a Drive y guardar corte en PostgreSQL
app.post('/api/guardar-reporte', upload.array('fotos'), async (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILES:", req.files);

  if (!driveService) {
    return res.status(500).json({
      success: false,
      error: "Drive aún no está listo, intenta de nuevo"
    });
  }

  const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  try {
    const { nombreCarpeta, usuario } = req.body;
    const fotos = req.files;

    let detalles = null;

    if (req.body.detalles) {
      detalles = JSON.parse(req.body.detalles);
    }

    if (!fotos || fotos.length === 0) {
      console.log("No se recibieron fotos, pero se procesará la carpeta.");
    }

    console.log(`📂 Procesando reporte de: ${usuario}`);
    console.log(`📁 Carpeta: ${nombreCarpeta}`);

    // 1. Crear carpeta en Drive
    const folderId = await crearCarpetaEnDrive(nombreCarpeta);
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

    // 2. Subir archivos SOLO si existen
    if (fotos && fotos.length > 0) {
      for (const foto of fotos) {
        await subirArchivoADrive(
          foto.path,
          foto.originalname,
          foto.mimetype,
          folderId
        );
      }
    }

    let corteGuardado = null;

    // 3. Guardar corte de caja en PostgreSQL
    if (detalles && detalles.tipo === "CORTE_CAJA") {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const negocioId = Number(detalles.negocio_id);

if (!Number.isInteger(negocioId) || negocioId <= 0) {
  throw new Error(
    "No se recibió un negocio_id válido para guardar el corte."
  );
}

        const buscarOCrearCategoria = async (
  nombreCategoria,
  negocioId
) => {
  const nombreLimpio = String(
    nombreCategoria || ""
  ).trim();

  if (!nombreLimpio) return null;

  if (
    !Number.isInteger(Number(negocioId)) ||
    Number(negocioId) <= 0
  ) {
    throw new Error(
      "No se recibió un negocio_id válido para la categoría."
    );
  }

  const existente = await client.query(
    `
      SELECT id
      FROM categorias
      WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
        AND negocio_id = $2
      LIMIT 1
    `,
    [
      nombreLimpio,
      Number(negocioId),
    ]
  );

  if (existente.rows.length > 0) {
    return existente.rows[0].id;
  }

  const nueva = await client.query(
    `
      INSERT INTO categorias (
        nombre,
        negocio_id
      )
      VALUES ($1, $2)
      RETURNING id
    `,
    [
      nombreLimpio,
      Number(negocioId),
    ]
  );

  return nueva.rows[0].id;
};

const buscarOCrearProveedor = async (
  nombreProveedor,
  usuarioId,
  negocioId
) => {
  const nombreLimpio = String(
    nombreProveedor || ""
  ).trim();

  if (!nombreLimpio) return null;

  if (
    !Number.isInteger(Number(negocioId)) ||
    Number(negocioId) <= 0
  ) {
    throw new Error(
      "No se recibió un negocio_id válido para el proveedor."
    );
  }

  const existente = await client.query(
    `
      SELECT id
      FROM proveedores
      WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
        AND negocio_id = $2
      LIMIT 1
    `,
    [
      nombreLimpio,
      Number(negocioId),
    ]
  );

  if (existente.rows.length > 0) {
    return existente.rows[0].id;
  }

  const nuevo = await client.query(
    `
      INSERT INTO proveedores (
        nombre,
        created_by,
        activo,
        negocio_id
      )
      VALUES ($1, $2, true, $3)
      RETURNING id
    `,
    [
      nombreLimpio,
      usuarioId || null,
      Number(negocioId),
    ]
  );

  return nuevo.rows[0].id;
};


const crearEgresoDesdeCorte = async ({
  movimiento,
  tipoMovimiento,
  numero,
  corteId,
  folio,
  fecha,
  usuarioId,
  negocioId,
  folderId,
  folderUrl,
}) => {
  const montoMxn = toNumber(movimiento.monto_mxn);

  if (montoMxn <= 0) return;

  const categoriaId =
  await buscarOCrearCategoria(
    movimiento.categoria,
    negocioId
  );

const proveedorId =
  await buscarOCrearProveedor(
    movimiento.proveedor,
    usuarioId,
    negocioId
  );

  const referencia = `CORTE-${folio}-${tipoMovimiento}-${numero}`;

  const existente = await client.query(
    `
    SELECT id
    FROM egresos
    WHERE referencia = $1
    LIMIT 1
    `,
    [referencia]
  );

  if (existente.rows.length > 0) return;

  await client.query(
    `
    INSERT INTO egresos (
          tipo_egreso,
          fecha,
          divisa,
          tipo_cambio,
          monto_original,
          monto_mxn,
          negocio_id,
          categoria_id,
          proveedor_id,
          concepto,
          cuenta_id,
          referencia,
          usuario_crea_id,
          drive_folder_id,
          drive_folder_url,
          estatus
        )
        VALUES (
          'efectivo',
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          NULL,
          $10,
          $11,
          $12,
          $13,
          'REGISTRADO'
        )
    `,
          [
          fecha || null,
          movimiento.divisa || "MXN",
          toNumber(movimiento.tipo_cambio) || 1,
          toNumber(movimiento.monto_original),
          montoMxn,
          negocioId,
          categoriaId,
          proveedorId,
          movimiento.concepto || `${tipoMovimiento} de corte`,
          referencia,
          usuarioId || null,
          folderId || null,
          folderUrl || null,
        ]
  );
};

        let usuarioId = null;

        if (usuario) {
          const usuarioResult = await client.query(
            `
            SELECT id
            FROM usuarios
            WHERE LOWER(nombre) = LOWER($1)
            LIMIT 1
            `,
            [usuario]
          );

          if (usuarioResult.rows.length > 0) {
            usuarioId = usuarioResult.rows[0].id;
          }
        }

        const corteResult = await client.query(
  `
            INSERT INTO corte_caja (
              fecha,
              folio,
              usuario_id,
              negocio_id,
              tipo_cambio,
              total_tarjetas,
              total_efectivo_mxn,
              total_efectivo_usd,
              total_general,
              total_tarjetas_mxn,
              total_tarjetas_usd,
              cover_tpv,
              cover_efectivo,
              cover_usd,
              total_cover,
              venta_ticket,
              diferencia,
              total_vales,
              gastos_corte,
              reglamentos,
              total_cxc,
              responsable_iniciales,
              drive_folder_id,
              drive_folder_url,
              created_at,
              updated_at,
              updated_by
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              $11,
              $12,
              $13,
              $14,
              $15,
              $16,
              $17,
              $18,
              $19,
              $20,
              $21,
              $22,
              $23,
              $24,
              NOW(),
              NOW(),
              $25
            )
            RETURNING *
            `,
            [
              detalles.fecha || null,
              detalles.folio || nombreCarpeta || null,
              usuarioId,
              negocioId,
              toNumber(detalles.tipoCambio),
              toNumber(detalles.totalTarjetas),
              toNumber(detalles.efectivoMXN),
              toNumber(detalles.efectivoUSD),
              toNumber(detalles.totalGlobalMXN),
              toNumber(detalles.totalTarjetas),
              0,
              toNumber(detalles.coverTPV),
              toNumber(detalles.coverEfectivo),
              toNumber(detalles.coverUSD),
              toNumber(detalles.totalCover),
              toNumber(detalles.ventaTicket),
              toNumber(detalles.diferencia),
              toNumber(detalles.totalVales),
              toNumber(detalles.gastosCorte),
              toNumber(detalles.reglamentos),
              toNumber(detalles.totalCxC),
              detalles.responsable || null,
              folderId,
              folderUrl,
              usuarioId,
            ]
          );

        corteGuardado = corteResult.rows[0];

        // 4. Guardar denominaciones
        const denominaciones = Array.isArray(detalles.denominaciones)
          ? detalles.denominaciones
          : [];

        for (const item of denominaciones) {
          const moneda = item.moneda;
          const valor = toNumber(item.valor);
          const cantidad = parseInt(item.cantidad) || 0;
          const tipoIngreso = item.tipo_ingreso || "Normal";
const concepto = item.concepto || `${tipoIngreso} ${moneda} ${valor}`;

const montoOriginal =
  item.monto_original !== undefined
    ? toNumber(item.monto_original)
    : valor * cantidad;

const montoMxn =
  item.monto_mxn !== undefined
    ? toNumber(item.monto_mxn)
    : moneda === "USD"
      ? montoOriginal * toNumber(detalles.tipoCambio)
      : montoOriginal;

if (!moneda || cantidad <= 0) continue;

          let denominacionId = null;

          const denomResult = await client.query(
            `
            SELECT id
            FROM denominaciones
            WHERE moneda = $1
              AND valor = $2
            LIMIT 1
            `,
            [moneda, valor]
          );

          if (denomResult.rows.length > 0) {
            denominacionId = denomResult.rows[0].id;
          } else {
            const nuevaDenom = await client.query(
              `
              INSERT INTO denominaciones (moneda, valor)
              VALUES ($1, $2)
              RETURNING id
              `,
              [moneda, valor]
            );

            denominacionId = nuevaDenom.rows[0].id;
          }

          await client.query(
            `
           INSERT INTO corte_denominaciones (
  corte_id,
  denominacion_id,
  cantidad,
  tipo_ingreso,
  concepto,
  monto_original,
  monto_mxn
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
           [
  corteGuardado.id,
  denominacionId,
  cantidad,
  tipoIngreso,
  concepto,
  montoOriginal,
  montoMxn
]
          );
        }

        // 5. Guardar vales
        const vales = Array.isArray(detalles.vales) ? detalles.vales : [];

        for (const vale of vales) {
          const monto = toNumber(vale.monto);

          if (!vale.concepto && monto <= 0) continue;

          await client.query(
            `
            INSERT INTO corte_vales (
              corte_id,
              concepto,
              monto,
              moneda,
              tipo_cambio,
              monto_mxn
            )
            VALUES ($1, $2, $3, 'MXN', $4, $5)
            `,
            [
              corteGuardado.id,
              vale.concepto || "Sin concepto",
              monto,
              toNumber(detalles.tipoCambio),
              monto
            ]
          );
        }

        // 6. Guardar cuentas por cobrar
        const cxc = Array.isArray(detalles.cxc) ? detalles.cxc : [];

        for (const cuenta of cxc) {
          const monto = toNumber(cuenta.monto);

          if (!cuenta.nombre && monto <= 0) continue;

          await client.query(
            `
            INSERT INTO cuentas_por_cobrar (
              corte_id,
              nombre,
              monto,
              moneda,
              tipo_cambio,
              monto_mxn
            )
            VALUES ($1, $2, $3, 'MXN', $4, $5)
            `,
            [
              corteGuardado.id,
              cuenta.nombre || "Sin nombre",
              monto,
              toNumber(detalles.tipoCambio),
              monto
            ]
          );
        }
        
        // 7. Crear egresos automáticos por gastos de corte
const gastosCorteDetalle = Array.isArray(detalles.gastosCorteDetalle)
  ? detalles.gastosCorteDetalle
  : [];

for (const movimiento of gastosCorteDetalle) {
  await crearEgresoDesdeCorte({
    movimiento,
    tipoMovimiento: "GASTO",
    numero: movimiento.numero || 1,
    corteId: corteGuardado.id,
    folio: corteGuardado.folio,
    fecha: corteGuardado.fecha,
    usuarioId,
    negocioId,
    folderId,
    folderUrl,
  });
}

// 8. Crear egresos automáticos por reglamentos / interventor
const reglamentosDetalle = Array.isArray(detalles.reglamentosDetalle)
  ? detalles.reglamentosDetalle
  : [];

for (const movimiento of reglamentosDetalle) {
  await crearEgresoDesdeCorte({
    movimiento,
    tipoMovimiento: "REGLAMENTO",
    numero: movimiento.numero || 1,
    corteId: corteGuardado.id,
    folio: corteGuardado.folio,
    fecha: corteGuardado.fecha,
    usuarioId,
    negocioId,
    folderId,
    folderUrl,
  });
}

        await client.query("COMMIT");

      } catch (error) {
        await client.query("ROLLBACK");
        throw error;

      } finally {
        client.release();
      }
    }

    res.json({
      success: true,
      message: "¡Reporte enviado exitosamente a Drive y guardado en base de datos!",
      folderId,
      folderUrl,
      corte: corteGuardado
    });

  } catch (error) {
    console.error("❌ Error en el servidor:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Guardar egreso en PostgreSQL
app.post('/api/egresos', async (req, res) => {
  try {
    const {
      tipo_egreso,
      fecha,
      divisa,
      tipo_cambio,
      monto_original,
      monto_mxn,
      negocio_id,
      categoria_id,
      proveedor_id,
      concepto,
      cuenta_id,
      referencia,
      usuario_crea_id,
      drive_folder_id,
      drive_folder_url,
      estatus
    } = req.body;

    const negocioId = Number(negocio_id);

    if (!Number.isInteger(negocioId) || negocioId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El negocio_id es obligatorio."
      });
    }

    const result = await pool.query(
      `
        INSERT INTO egresos (
          tipo_egreso,
          fecha,
          divisa,
          tipo_cambio,
          monto_original,
          monto_mxn,
          negocio_id,
          categoria_id,
          proveedor_id,
          concepto,
          cuenta_id,
          referencia,
          usuario_crea_id,
          drive_folder_id,
          drive_folder_url,
          estatus
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15, $16
        )
        RETURNING *
      `,
      [
        tipo_egreso,
        fecha,
        divisa,
        tipo_cambio,
        monto_original,
        monto_mxn,
        negocioId,
        categoria_id || null,
        proveedor_id || null,
        concepto,
        cuenta_id || null,
        referencia || null,
        usuario_crea_id || null,
        drive_folder_id || null,
        drive_folder_url || null,
        estatus || "REGISTRADO"
      ]
    );

        await registrarHistorialEgreso({
      egresoId: result.rows[0].id,
      accion: "CREADO",
      usuarioId: usuario_crea_id,
      datosNuevos: result.rows[0],
    });

    res.json({
      success: true,
      egreso: result.rows[0]
    });

  } catch (error) {
    console.error('Error guardando egreso:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener cortes de caja por negocio
app.get("/api/cortes", async (req, res) => {
  try {
    const {
      negocio_id,
      fecha_inicio,
      fecha_fin,
      folio,
    } = req.query;

    const negocioId = Number(negocio_id);

    if (!Number.isInteger(negocioId) || negocioId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El negocio_id no es válido.",
      });
    }

    const condiciones = ["cc.negocio_id = $1"];
    const valores = [negocioId];

    if (fecha_inicio) {
      valores.push(fecha_inicio);
      condiciones.push(
        `cc.fecha::date >= $${valores.length}::date`
      );
    }

    if (fecha_fin) {
      valores.push(fecha_fin);
      condiciones.push(
        `cc.fecha::date <= $${valores.length}::date`
      );
    }

    if (folio && String(folio).trim()) {
      valores.push(`%${String(folio).trim()}%`);
      condiciones.push(
        `cc.folio ILIKE $${valores.length}`
      );
    }

    const result = await pool.query(
      `
        SELECT
          cc.id,
          cc.fecha,
          cc.folio,
          cc.usuario_id,
          cc.negocio_id,
          cc.tipo_cambio,
          cc.total_tarjetas,
          cc.total_efectivo_mxn,
          cc.total_efectivo_usd,
          cc.total_general,
          cc.cover_tpv,
          cc.cover_efectivo,
          cc.cover_usd,
          cc.total_cover,
          cc.venta_ticket,
          cc.diferencia,
          cc.total_vales,
          cc.gastos_corte,
          cc.reglamentos,
          cc.total_cxc,
          cc.responsable_iniciales,
          cc.drive_folder_id,
          cc.drive_folder_url,
          cc.estatus,
          cc.created_at,
          cc.updated_at,
          cc.updated_by,
          u.nombre AS usuario_nombre
        FROM corte_caja cc
        LEFT JOIN usuarios u
          ON u.id = cc.usuario_id
        WHERE ${condiciones.join(" AND ")}
        ORDER BY cc.fecha DESC, cc.id DESC;
      `,
      valores
    );

    return res.json({
      success: true,
      cortes: result.rows,
    });
  } catch (error) {
    console.error("Error consultando cortes:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "No fue posible consultar los cortes.",
    });
  }
});

// Obtener historial de un corte
app.get("/api/cortes/:id/historial", async (req, res) => {
  const corteId = Number(req.params.id);

  if (!Number.isInteger(corteId) || corteId <= 0) {
    return res.status(400).json({
      success: false,
      error: "El id del corte no es válido.",
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          ch.id,
          ch.corte_id,
          ch.accion,
          ch.usuario_id,
          ch.datos_anteriores,
          ch.datos_nuevos,
          ch.fecha,
          u.nombre AS usuario
        FROM cortes_historial ch
        LEFT JOIN usuarios u
          ON u.id = ch.usuario_id
        WHERE ch.corte_id = $1
        ORDER BY ch.fecha DESC, ch.id DESC;
      `,
      [corteId]
    );

    return res.json({
      success: true,
      historial: result.rows,
    });
  } catch (error) {
    console.error("Error consultando historial del corte:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "No fue posible consultar el historial del corte.",
    });
  }
});

// Obtener detalle completo de un corte
app.get("/api/cortes/:id", async (req, res) => {
  const corteId = Number(req.params.id);

  if (!Number.isInteger(corteId) || corteId <= 0) {
    return res.status(400).json({
      success: false,
      error: "El id del corte no es válido.",
    });
  }

  try {
    const corteResult = await pool.query(
      `
        SELECT
          cc.*,
          u.nombre AS usuario_nombre
        FROM corte_caja cc
        LEFT JOIN usuarios u
          ON u.id = cc.usuario_id
        WHERE cc.id = $1
        LIMIT 1;
      `,
      [corteId]
    );

    if (corteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No se encontró el corte.",
      });
    }

    const corte = corteResult.rows[0];

    const [
      denominacionesResult,
      valesResult,
      cxcResult,
      egresosResult,
    ] = await Promise.all([
      pool.query(
        `
          SELECT
            cd.id,
            cd.corte_id,
            cd.denominacion_id,
            cd.cantidad,
            cd.tipo_ingreso,
            cd.concepto,
            cd.monto_original,
            cd.monto_mxn,
            d.moneda,
            d.valor
          FROM corte_denominaciones cd
          LEFT JOIN denominaciones d
            ON d.id = cd.denominacion_id
          WHERE cd.corte_id = $1
          ORDER BY cd.tipo_ingreso, d.moneda, d.valor DESC;
        `,
        [corteId]
      ),

      pool.query(
        `
          SELECT *
          FROM corte_vales
          WHERE corte_id = $1
          ORDER BY id ASC;
        `,
        [corteId]
      ),

      pool.query(
        `
          SELECT *
          FROM cuentas_por_cobrar
          WHERE corte_id = $1
          ORDER BY id ASC;
        `,
        [corteId]
      ),

      pool.query(
        `
          SELECT
            e.*,
            c.nombre AS categoria_nombre,
            p.nombre AS proveedor_nombre
          FROM egresos e
          LEFT JOIN categorias c
            ON c.id = e.categoria_id
          LEFT JOIN proveedores p
            ON p.id = e.proveedor_id
          WHERE e.negocio_id = $1
            AND e.referencia LIKE $2
          ORDER BY e.id ASC;
        `,
        [
          corte.negocio_id,
          `CORTE-${corte.folio}-%`,
        ]
      ),
    ]);

    const egresosCorte = egresosResult.rows;

    const gastosCorte = egresosCorte.filter((egreso) =>
      String(egreso.referencia || "").includes("-GASTO-")
    );

    const reglamentos = egresosCorte.filter((egreso) =>
      String(egreso.referencia || "").includes("-REGLAMENTO-")
    );

    return res.json({
      success: true,
      corte: {
        ...corte,
        denominaciones: denominacionesResult.rows,
        vales: valesResult.rows,
        cxc: cxcResult.rows,
        gastos_corte_detalle: gastosCorte,
        reglamentos_detalle: reglamentos,
      },
    });
  } catch (error) {
    console.error("Error consultando detalle del corte:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "No fue posible consultar el detalle del corte.",
    });
  }
});

// Editar un corte de caja
app.put("/api/cortes/:id", async (req, res) => {
  const corteId = Number(req.params.id);

  if (!Number.isInteger(corteId) || corteId <= 0) {
    return res.status(400).json({
      success: false,
      error: "El id del corte no es válido.",
    });
  }

  const {
    fecha,
    folio,
    negocio_id,
    usuario_edita_id,
    tipoCambio,
    totalTarjetas,
    efectivoMXN,
    efectivoUSD,
    totalGlobalMXN,
    coverTPV,
    coverEfectivo,
    coverUSD,
    totalCover,
    ventaTicket,
    diferencia,
    totalVales,
    gastosCorte,
    reglamentos,
    totalCxC,
    responsable,
    denominaciones,
    vales,
    cxc,
    gastosCorteDetalle,
    reglamentosDetalle,
    } = req.body;

  const negocioId = Number(negocio_id);

  if (!Number.isInteger(negocioId) || negocioId <= 0) {
    return res.status(400).json({
      success: false,
      error: "El negocio_id no es válido.",
    });
  }

  if (!fecha) {
    return res.status(400).json({
      success: false,
      error: "La fecha es obligatoria.",
    });
  }

  if (!folio || !String(folio).trim()) {
    return res.status(400).json({
      success: false,
      error: "El folio es obligatorio.",
    });
  }

  const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const corteAnteriorResult = await client.query(
      `
        SELECT *
        FROM corte_caja
        WHERE id = $1
        FOR UPDATE;
      `,
      [corteId]
    );

    if (corteAnteriorResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        error: "No se encontró el corte.",
      });
    }

    const corteAnterior = corteAnteriorResult.rows[0];

    if (Number(corteAnterior.negocio_id) !== negocioId) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        error: "El corte no pertenece al negocio indicado.",
      });
    }

    const corteActualizadoResult = await client.query(
      `
        UPDATE corte_caja
        SET
          fecha = $1,
          folio = $2,
          negocio_id = $3,
          tipo_cambio = $4,
          total_tarjetas = $5,
          total_efectivo_mxn = $6,
          total_efectivo_usd = $7,
          total_general = $8,
          total_tarjetas_mxn = $9,
          total_tarjetas_usd = $10,
          cover_tpv = $11,
          cover_efectivo = $12,
          cover_usd = $13,
          total_cover = $14,
          venta_ticket = $15,
          diferencia = $16,
          total_vales = $17,
          gastos_corte = $18,
          reglamentos = $19,
          total_cxc = $20,
          responsable_iniciales = $21,
          updated_at = NOW(),
          updated_by = $22
        WHERE id = $23
        RETURNING *;
      `,
      [
        fecha,
        String(folio).trim(),
        negocioId,
        toNumber(tipoCambio),
        toNumber(totalTarjetas),
        toNumber(efectivoMXN),
        toNumber(efectivoUSD),
        toNumber(totalGlobalMXN),
        toNumber(totalTarjetas),
        0,
        toNumber(coverTPV),
        toNumber(coverEfectivo),
        toNumber(coverUSD),
        toNumber(totalCover),
        toNumber(ventaTicket),
        toNumber(diferencia),
        toNumber(totalVales),
        toNumber(gastosCorte),
        toNumber(reglamentos),
        toNumber(totalCxC),
        responsable || null,
        usuario_edita_id || null,
        corteId,
      ]
    );

    const corteActualizado = corteActualizadoResult.rows[0];

    // Reemplazar denominaciones anteriores
    await client.query(
      `
        DELETE FROM corte_denominaciones
        WHERE corte_id = $1;
      `,
      [corteId]
    );

    const denominacionesNuevas = Array.isArray(denominaciones)
      ? denominaciones
      : [];

    for (const item of denominacionesNuevas) {
      const moneda = String(item.moneda || "").toUpperCase();
      const valor = toNumber(item.valor);
      const cantidad = Number.parseInt(item.cantidad, 10) || 0;
      const tipoIngreso = item.tipo_ingreso || "Normal";
      const concepto =
        item.concepto || `${tipoIngreso} ${moneda} ${valor}`;

      const montoOriginal =
        item.monto_original !== undefined
          ? toNumber(item.monto_original)
          : valor * cantidad;

      const montoMxn =
        item.monto_mxn !== undefined
          ? toNumber(item.monto_mxn)
          : moneda === "USD"
          ? montoOriginal * toNumber(tipoCambio)
          : montoOriginal;

      if (!moneda || cantidad <= 0) continue;

      let denominacionId = null;

      const denominacionExistente = await client.query(
        `
          SELECT id
          FROM denominaciones
          WHERE moneda = $1
            AND valor = $2
          LIMIT 1;
        `,
        [moneda, valor]
      );

      if (denominacionExistente.rows.length > 0) {
        denominacionId = denominacionExistente.rows[0].id;
      } else {
        const nuevaDenominacion = await client.query(
          `
            INSERT INTO denominaciones (
              moneda,
              valor
            )
            VALUES ($1, $2)
            RETURNING id;
          `,
          [moneda, valor]
        );

        denominacionId = nuevaDenominacion.rows[0].id;
      }

      await client.query(
        `
          INSERT INTO corte_denominaciones (
            corte_id,
            denominacion_id,
            cantidad,
            tipo_ingreso,
            concepto,
            monto_original,
            monto_mxn
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `,
        [
          corteId,
          denominacionId,
          cantidad,
          tipoIngreso,
          concepto,
          montoOriginal,
          montoMxn,
        ]
      );
    }

    // Reemplazar vales anteriores
    await client.query(
      `
        DELETE FROM corte_vales
        WHERE corte_id = $1;
      `,
      [corteId]
    );

    const valesNuevos = Array.isArray(vales) ? vales : [];

    for (const vale of valesNuevos) {
      const monto = toNumber(vale.monto);

      if (!vale.concepto && monto <= 0) continue;

      await client.query(
        `
          INSERT INTO corte_vales (
            corte_id,
            concepto,
            monto,
            moneda,
            tipo_cambio,
            monto_mxn
          )
          VALUES ($1, $2, $3, 'MXN', $4, $5);
        `,
        [
          corteId,
          vale.concepto || "Sin concepto",
          monto,
          toNumber(tipoCambio),
          monto,
        ]
      );
    }

    // Reemplazar cuentas por cobrar anteriores
    await client.query(
      `
        DELETE FROM cuentas_por_cobrar
        WHERE corte_id = $1;
      `,
      [corteId]
    );

    const cuentasNuevas = Array.isArray(cxc) ? cxc : [];

    for (const cuenta of cuentasNuevas) {
      const monto = toNumber(cuenta.monto);

      if (!cuenta.nombre && monto <= 0) continue;

      await client.query(
        `
          INSERT INTO cuentas_por_cobrar (
            corte_id,
            nombre,
            monto,
            moneda,
            tipo_cambio,
            monto_mxn
          )
          VALUES ($1, $2, $3, 'MXN', $4, $5);
        `,
        [
          corteId,
          cuenta.nombre || "Sin nombre",
          monto,
          toNumber(tipoCambio),
          monto,
        ]
      );
    }

    // Sincronizar egresos automáticos del corte
const buscarCategoriaId = async (nombre) => {
  const nombreLimpio = String(nombre || "").trim();

  if (!nombreLimpio) return null;

  const resultado = await client.query(
    `
      SELECT id
      FROM categorias
      WHERE negocio_id = $1
        AND LOWER(TRIM(nombre)) = LOWER(TRIM($2))
      LIMIT 1;
    `,
    [negocioId, nombreLimpio]
  );

  if (resultado.rows.length === 0) {
    throw new Error(
      `No se encontró la categoría "${nombreLimpio}".`
    );
  }

  return resultado.rows[0].id;
};

const buscarProveedorId = async (nombre) => {
  const nombreLimpio = String(nombre || "").trim();

  if (!nombreLimpio) return null;

  const resultado = await client.query(
    `
      SELECT id
      FROM proveedores
      WHERE negocio_id = $1
        AND LOWER(TRIM(nombre)) = LOWER(TRIM($2))
      LIMIT 1;
    `,
    [negocioId, nombreLimpio]
  );

  if (resultado.rows.length === 0) {
    throw new Error(
      `No se encontró el proveedor "${nombreLimpio}".`
    );
  }

  return resultado.rows[0].id;
};

const sincronizarMovimientos = async ({
  tipoMovimiento,
  movimientos,
}) => {
  const movimientosNuevos = Array.isArray(movimientos)
    ? movimientos
    : [];

  const folioAnterior = String(corteAnterior.folio || "").trim();
  const folioNuevo = String(folio || "").trim();

  const referenciasConservadas = [];

  for (let index = 0; index < movimientosNuevos.length; index += 1) {
    const movimiento = movimientosNuevos[index];
    const numero = movimiento.numero || index + 1;

    const referenciaAnterior =
      `CORTE-${folioAnterior}-${tipoMovimiento}-${numero}`;

    const referenciaNueva =
      `CORTE-${folioNuevo}-${tipoMovimiento}-${numero}`;

    referenciasConservadas.push(referenciaNueva);

    const categoriaId = await buscarCategoriaId(
      movimiento.categoria
    );

    const proveedorId = await buscarProveedorId(
      movimiento.proveedor
    );

    const montoOriginal = toNumber(
      movimiento.monto_original
    );

    const montoMxn = toNumber(movimiento.monto_mxn);

    if (montoMxn <= 0) continue;

    const egresoAnteriorResult = await client.query(
      `
        SELECT *
        FROM egresos
        WHERE negocio_id = $1
          AND referencia IN ($2, $3)
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE;
      `,
      [
        negocioId,
        referenciaAnterior,
        referenciaNueva,
      ]
    );

    if (egresoAnteriorResult.rows.length > 0) {
      const egresoAnterior = egresoAnteriorResult.rows[0];

      const egresoActualizadoResult = await client.query(
        `
          UPDATE egresos
          SET
            fecha = $1,
            tipo_egreso = 'efectivo',
            divisa = $2,
            tipo_cambio = $3,
            monto_original = $4,
            monto_mxn = $5,
            categoria_id = $6,
            proveedor_id = $7,
            concepto = $8,
            referencia = $9,
            drive_folder_id = $10,
            drive_folder_url = $11,
            estatus = 'REGISTRADO',
            fecha_edicion = NOW(),
            updated_at = NOW(),
            updated_by = $12
          WHERE id = $13
          RETURNING *;
        `,
        [
          fecha,
          movimiento.divisa || "MXN",
          toNumber(movimiento.tipo_cambio) || 1,
          montoOriginal,
          montoMxn,
          categoriaId,
          proveedorId,
          movimiento.concepto ||
            `${tipoMovimiento} de corte`,
          referenciaNueva,
          corteAnterior.drive_folder_id || null,
          corteAnterior.drive_folder_url || null,
          usuario_edita_id || null,
          egresoAnterior.id,
        ]
      );

      await registrarHistorialEgreso({
        egresoId: egresoAnterior.id,
        accion: "EDITADO",
        usuarioId: usuario_edita_id,
        datosAnteriores: egresoAnterior,
        datosNuevos: egresoActualizadoResult.rows[0],
        cliente: client,
      });
    } else {
      const egresoNuevoResult = await client.query(
        `
          INSERT INTO egresos (
            tipo_egreso,
            fecha,
            divisa,
            tipo_cambio,
            monto_original,
            monto_mxn,
            negocio_id,
            categoria_id,
            proveedor_id,
            concepto,
            cuenta_id,
            referencia,
            usuario_crea_id,
            drive_folder_id,
            drive_folder_url,
            estatus
          )
          VALUES (
            'efectivo',
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            NULL,
            $10,
            $11,
            $12,
            $13,
            'REGISTRADO'
          )
          RETURNING *;
        `,
        [
          fecha,
          movimiento.divisa || "MXN",
          toNumber(movimiento.tipo_cambio) || 1,
          montoOriginal,
          montoMxn,
          negocioId,
          categoriaId,
          proveedorId,
          movimiento.concepto ||
            `${tipoMovimiento} de corte`,
          referenciaNueva,
          usuario_edita_id || null,
          corteAnterior.drive_folder_id || null,
          corteAnterior.drive_folder_url || null,
        ]
      );

      await registrarHistorialEgreso({
        egresoId: egresoNuevoResult.rows[0].id,
        accion: "CREADO",
        usuarioId: usuario_edita_id,
        datosNuevos: egresoNuevoResult.rows[0],
        cliente: client,
      });
    }
  }

  const prefijosPosibles = [
    `CORTE-${folioAnterior}-${tipoMovimiento}-%`,
    `CORTE-${folioNuevo}-${tipoMovimiento}-%`,
  ];

  const egresosExistentesResult = await client.query(
    `
      SELECT *
      FROM egresos
      WHERE negocio_id = $1
        AND (
          referencia LIKE $2
          OR referencia LIKE $3
        )
      FOR UPDATE;
    `,
    [
      negocioId,
      prefijosPosibles[0],
      prefijosPosibles[1],
    ]
  );

  for (const egresoExistente of egresosExistentesResult.rows) {
    if (
      referenciasConservadas.includes(
        egresoExistente.referencia
      )
    ) {
      continue;
    }

    if (egresoExistente.estatus === "CANCELADO") {
      continue;
    }

    const egresoCanceladoResult = await client.query(
      `
        UPDATE egresos
        SET
          estatus = 'CANCELADO',
          fecha_edicion = NOW(),
          updated_at = NOW(),
          updated_by = $1
        WHERE id = $2
        RETURNING *;
      `,
      [
        usuario_edita_id || null,
        egresoExistente.id,
      ]
    );

    await registrarHistorialEgreso({
      egresoId: egresoExistente.id,
      accion: "CANCELADO",
      usuarioId: usuario_edita_id,
      datosAnteriores: egresoExistente,
      datosNuevos: egresoCanceladoResult.rows[0],
      cliente: client,
    });
  }
};

await sincronizarMovimientos({
  tipoMovimiento: "GASTO",
  movimientos: gastosCorteDetalle,
});

await sincronizarMovimientos({
  tipoMovimiento: "REGLAMENTO",
  movimientos: reglamentosDetalle,
});

    await registrarHistorialCorte({
      corteId,
      accion: "EDITADO",
      usuarioId: usuario_edita_id,
      datosAnteriores: corteAnterior,
      datosNuevos: corteActualizado,
      cliente: client,
    });

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Corte actualizado correctamente.",
      corte: corteActualizado,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error editando corte:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "No fue posible actualizar el corte.",
    });
  } finally {
    client.release();
  }
});

// Cancelar un corte y sus egresos automáticos
app.put("/api/cortes/:id/cancelar", async (req, res) => {
  const corteId = Number(req.params.id);

  if (!Number.isInteger(corteId) || corteId <= 0) {
    return res.status(400).json({
      success: false,
      error: "El id del corte no es válido.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const corteResult = await client.query(
      `
        SELECT *
        FROM corte_caja
        WHERE id = $1
        FOR UPDATE;
      `,
      [corteId]
    );

    if (corteResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        error: "No se encontró el corte.",
      });
    }

    const corteAnterior = corteResult.rows[0];

    if (corteAnterior.estatus === "CANCELADO") {
      await client.query("ROLLBACK");

      return res.json({
        success: true,
        message: "El corte ya estaba cancelado.",
      });
    }

    const corteActualizadoResult = await client.query(
      `
        UPDATE corte_caja
        SET
          estatus = 'CANCELADO',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `,
      [corteId]
    );

    const egresosResult = await client.query(
      `
        SELECT *
        FROM egresos
        WHERE negocio_id = $1
          AND referencia LIKE $2
          AND COALESCE(estatus, 'REGISTRADO') <> 'CANCELADO'
        FOR UPDATE;
      `,
      [
        corteAnterior.negocio_id,
        `CORTE-${corteAnterior.folio}-%`,
      ]
    );

    for (const egresoAnterior of egresosResult.rows) {
      const egresoActualizadoResult = await client.query(
        `
          UPDATE egresos
          SET
            estatus = 'CANCELADO',
            fecha_edicion = NOW(),
            updated_at = NOW()
          WHERE id = $1
          RETURNING *;
        `,
        [egresoAnterior.id]
      );

      await registrarHistorialEgreso({
        egresoId: egresoAnterior.id,
        accion: "CANCELADO",
        usuarioId: null,
        datosAnteriores: egresoAnterior,
        datosNuevos: egresoActualizadoResult.rows[0],
        cliente: client,
      });
    }

    await registrarHistorialCorte({
      corteId,
      accion: "CANCELADO",
      usuarioId: null,
      datosAnteriores: corteAnterior,
      datosNuevos: corteActualizadoResult.rows[0],
      cliente: client,
    });

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Corte y egresos asociados cancelados correctamente.",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error cancelando corte:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "No fue posible cancelar el corte.",
    });
  } finally {
    client.release();
  }
});

// Reactivar un corte y sus egresos automáticos
app.put("/api/cortes/:id/reactivar", async (req, res) => {
  const corteId = Number(req.params.id);

  if (!Number.isInteger(corteId) || corteId <= 0) {
    return res.status(400).json({
      success: false,
      error: "El id del corte no es válido.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const corteResult = await client.query(
      `
        SELECT *
        FROM corte_caja
        WHERE id = $1
        FOR UPDATE;
      `,
      [corteId]
    );

    if (corteResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        error: "No se encontró el corte.",
      });
    }

    const corteAnterior = corteResult.rows[0];

    if (corteAnterior.estatus !== "CANCELADO") {
      await client.query("ROLLBACK");

      return res.json({
        success: true,
        message: "El corte ya estaba registrado.",
      });
    }

    const corteActualizadoResult = await client.query(
      `
        UPDATE corte_caja
        SET
          estatus = 'REGISTRADO',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `,
      [corteId]
    );

    const egresosResult = await client.query(
      `
        SELECT *
        FROM egresos
        WHERE negocio_id = $1
          AND referencia LIKE $2
          AND estatus = 'CANCELADO'
        FOR UPDATE;
      `,
      [
        corteAnterior.negocio_id,
        `CORTE-${corteAnterior.folio}-%`,
      ]
    );

    for (const egresoAnterior of egresosResult.rows) {
      const egresoActualizadoResult = await client.query(
        `
          UPDATE egresos
          SET
            estatus = 'REGISTRADO',
            fecha_edicion = NOW(),
            updated_at = NOW()
          WHERE id = $1
          RETURNING *;
        `,
        [egresoAnterior.id]
      );

      await registrarHistorialEgreso({
        egresoId: egresoAnterior.id,
        accion: "REACTIVADO",
        usuarioId: null,
        datosAnteriores: egresoAnterior,
        datosNuevos: egresoActualizadoResult.rows[0],
        cliente: client,
      });
    }

    await registrarHistorialCorte({
      corteId,
      accion: "REACTIVADO",
      usuarioId: null,
      datosAnteriores: corteAnterior,
      datosNuevos: corteActualizadoResult.rows[0],
      cliente: client,
    });

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Corte y egresos asociados reactivados correctamente.",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error reactivando corte:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "No fue posible reactivar el corte.",
    });
  } finally {
    client.release();
  }
});

// Obtener egresos registrados por negocio
app.get('/api/egresos', async (req, res) => {
  try {
    const {
      negocio_id,
      fecha_inicio,
      fecha_fin,
      tipo_egreso,
      categoria_id,
      proveedor_id,
      concepto,
      referencia,
      estatus,

      monto_min,
      monto_max,
      divisa,
      usuario_nombre,
    } = req.query;

    const negocioId = Number(negocio_id);

    if (!Number.isInteger(negocioId) || negocioId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El negocio_id es obligatorio'
      });
    }

    const condiciones = ['e.negocio_id = $1'];
    const valores = [negocioId];

    const agregarCondicion = (condicion, valor) => {
      valores.push(valor);
      condiciones.push(
        condicion.replace('?', `$${valores.length}`)
      );
    };

    if (fecha_inicio) {
      agregarCondicion('e.fecha >= ?', fecha_inicio);
    }

    if (fecha_fin) {
      agregarCondicion('e.fecha <= ?', fecha_fin);
    }

    if (tipo_egreso) {
      agregarCondicion('e.tipo_egreso = ?', tipo_egreso);
    }

    if (categoria_id) {
      agregarCondicion('e.categoria_id = ?', Number(categoria_id));
    }

    if (proveedor_id) {
      agregarCondicion('e.proveedor_id = ?', Number(proveedor_id));
    }

    if (concepto && concepto.trim()) {
      agregarCondicion(
        `LOWER(COALESCE(e.concepto, '')) LIKE LOWER(?)`,
        `%${concepto.trim()}%`
      );
    }

    if (referencia && referencia.trim()) {
      agregarCondicion(
        `LOWER(COALESCE(e.referencia, '')) LIKE LOWER(?)`,
        `%${referencia.trim()}%`
      );
    }

    if (estatus) {
      agregarCondicion(
        `COALESCE(e.estatus, 'REGISTRADO') = ?`,
        estatus
      );
    }

    if (monto_min) {
  agregarCondicion(
    "COALESCE(e.monto_mxn,0) >= ?",
    Number(monto_min)
  );
}

if (monto_max) {
  agregarCondicion(
    "COALESCE(e.monto_mxn,0) <= ?",
    Number(monto_max)
  );
}

if (divisa) {
  agregarCondicion(
    "COALESCE(e.divisa,'MXN') = ?",
    divisa
  );
}

if (usuario_nombre && usuario_nombre.trim()) {
  agregarCondicion(
    "LOWER(COALESCE(u.nombre,'')) LIKE LOWER(?)",
    `%${usuario_nombre.trim()}%`
  );
}

    const result = await pool.query(
      `
        SELECT
          e.id,
          e.tipo_egreso,
          e.fecha,
          e.divisa,
          e.tipo_cambio,
          e.monto_original,
          e.monto_mxn,
          e.negocio_id,
          e.categoria_id,
          c.nombre AS categoria,
          e.proveedor_id,
          p.nombre AS proveedor,
          e.concepto,
          e.cuenta_id,
          e.referencia,
          e.usuario_crea_id,
          u.nombre AS usuario_crea,
          e.drive_folder_id,
          e.drive_folder_url,
          COALESCE(e.estatus, 'REGISTRADO') AS estatus,
          e.fecha_creacion AS created_at,
          e.updated_at
        FROM egresos e
        LEFT JOIN categorias c
          ON c.id = e.categoria_id
        LEFT JOIN proveedores p
          ON p.id = e.proveedor_id
        LEFT JOIN usuarios u
          ON u.id = e.usuario_crea_id
        WHERE ${condiciones.join(' AND ')}
        ORDER BY e.fecha DESC, e.id DESC
      `,
      valores
    );

    return res.json({
      success: true,
      egresos: result.rows
    });

  } catch (error) {
    console.error('Error cargando egresos:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Editar un egreso
app.put('/api/egresos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const {
      fecha,
      tipo_egreso,
      divisa,
      tipo_cambio,
      monto_original,
      monto_mxn,
      categoria_id,
      proveedor_id,
      concepto,
      referencia,
      estatus,
      usuario_edita_id,
    } = req.body;

    const egresoId = Number(id);

    if (!Number.isInteger(egresoId) || egresoId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El id del egreso no es válido.",
      });
    }

    const previousResult = await pool.query(
  `
    SELECT *
    FROM egresos
    WHERE id = $1;
  `,
  [egresoId]
);

if (previousResult.rows.length === 0) {
  return res.status(404).json({
    success: false,
    error: "No se encontró el egreso.",
  });
}

const previousEgreso = previousResult.rows[0];

    if (!fecha) {
      return res.status(400).json({
        success: false,
        error: "La fecha es obligatoria.",
      });
    }

    if (!concepto || !concepto.trim()) {
      return res.status(400).json({
        success: false,
        error: "El concepto es obligatorio.",
      });
    }

    if (!monto_mxn || Number(monto_mxn) <= 0) {
      return res.status(400).json({
        success: false,
        error: "El monto debe ser mayor a cero.",
      });
    }

    const result = await pool.query(
      `
        UPDATE egresos
        SET
          fecha = $1,
          tipo_egreso = $2,
          divisa = $3,
          tipo_cambio = $4,
          monto_original = $5,
          monto_mxn = $6,
          categoria_id = $7,
          proveedor_id = $8,
          concepto = $9,
          referencia = $10,
          estatus = $11,
          fecha_edicion = NOW(),
          updated_at = NOW(),
          updated_by = $12
        WHERE id = $13
        RETURNING *
      `,
      [
        fecha,
        tipo_egreso || "efectivo",
        divisa || "MXN",
        Number(tipo_cambio) || 1,
        Number(monto_original) || Number(monto_mxn),
        Number(monto_mxn),
        categoria_id || null,
        proveedor_id || null,
        concepto.trim(),
        referencia?.trim() || null,
        estatus || "REGISTRADO",
        usuario_edita_id || null,
        egresoId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No se encontró el egreso.",
      });
    }

  await registrarHistorialEgreso({
  egresoId,
  accion: "EDITADO",
  usuarioId: usuario_edita_id,
  datosAnteriores: previousEgreso,
  datosNuevos: result.rows[0],
});
    
    return res.json({
      success: true,
      egreso: result.rows[0],
    });
  } catch (error) {
    console.error("Error editando egreso:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Cancelar un egreso
app.put('/api/egresos/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;

    const egresoId = Number(id);

    if (!Number.isInteger(egresoId) || egresoId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El id del egreso no es válido.",
      });
    }

    const result = await pool.query(
      `
        UPDATE egresos
        SET
          estatus = 'CANCELADO',
          fecha_edicion = NOW(),
          updated_at = NOW(),
          updated_by = $1
        WHERE id = $2
          AND COALESCE(estatus, 'REGISTRADO') <> 'CANCELADO'
        RETURNING *
      `,
      [
        usuario_id || null,
        egresoId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "El egreso no existe o ya estaba cancelado.",
      });
    }

    await registrarHistorialEgreso({
  egresoId,
  accion: "CANCELADO",
  usuarioId: usuario_id,
  datosNuevos: result.rows[0],
});

    return res.json({
      success: true,
      egreso: result.rows[0],
    });

  } catch (error) {
    console.error("Error cancelando egreso:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Reactivar un egreso

app.put("/api/egresos/:id/reactivar", async (req, res) => {
  const { id } = req.params;
const { usuario_id } = req.body;

const egresoId = Number(id);

if (!Number.isInteger(egresoId) || egresoId <= 0) {
  return res.status(400).json({
    success: false,
    error: "El id del egreso no es válido.",
  });
}

  try {
    const result = await pool.query(
      `
      UPDATE egresos
      SET
        estatus = 'REGISTRADO',
        fecha_edicion = NOW(),
        updated_at = NOW(),
        updated_by = $2
      WHERE id = $1
        AND estatus = 'CANCELADO'
      RETURNING *;
      `,
      [egresoId, usuario_id || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "El egreso no existe o ya está registrado.",
      });
    }

    await registrarHistorialEgreso({
  egresoId,
  accion: "REACTIVADO",
  usuarioId: usuario_id,
  datosNuevos: result.rows[0],
});

    return res.json({
      success: true,
      egreso: result.rows[0],
    });
  } catch (error) {
    console.error("Error reactivando egreso:", error);

    return res.status(500).json({
      success: false,
      error: "No fue posible reactivar el egreso.",
    });
  }
});

// Obtener historial de un egreso
app.get('/api/egresos/:id/historial', async (req, res) => {
  try {
    const { id } = req.params;
    const egresoId = Number(id);

    if (!Number.isInteger(egresoId) || egresoId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El id del egreso no es válido.",
      });
    }

    const result = await pool.query(
      `
        SELECT
          h.id,
          h.egreso_id,
          h.accion,
          h.usuario_id,
          u.nombre AS usuario,
          h.fecha,
          h.datos_anteriores,
          h.datos_nuevos
        FROM egresos_historial h
        LEFT JOIN usuarios u
          ON u.id = h.usuario_id
        WHERE h.egreso_id = $1
        ORDER BY h.fecha DESC, h.id DESC
      `,
      [egresoId]
    );

    return res.json({
      success: true,
      historial: result.rows,
    });

  } catch (error) {
    console.error("Error cargando historial de egreso:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Obtener conceptos únicos usados en egresos
app.get('/api/egresos/conceptos', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT DISTINCT TRIM(concepto) AS concepto
      FROM egresos
      WHERE concepto IS NOT NULL
        AND TRIM(concepto) <> ''
        AND COALESCE(estatus, 'REGISTRADO') <> 'CANCELADO'
      ORDER BY concepto ASC
      `
    );

    res.json({
      success: true,
      conceptos: result.rows.map((fila) => fila.concepto)
    });

  } catch (error) {
    console.error('Error cargando conceptos de egresos:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/probar-egreso', async (req, res) => {
  try {
    const result = await pool.query(
      `
      INSERT INTO egresos (
        tipo_egreso,
        fecha,
        divisa,
        tipo_cambio,
        monto_original,
        monto_mxn,
        concepto,
        referencia,
        estatus
      )
      VALUES (
        'efectivo',
        CURRENT_DATE,
        'MXN',
        1,
        100,
        100,
        'Prueba desde navegador',
        'TEST-NAVEGADOR',
        'REGISTRADO'
      )
      RETURNING *
      `
    );

    res.json({
      success: true,
      egreso: result.rows[0],
    });
  } catch (error) {
    console.error('Error prueba egreso:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/api/proveedores/buscar-o-crear', async (req, res) => {
  try {
    const {
      nombre,
      usuario_id,
      negocio_id
    } = req.body;

    const negocioId = Number(negocio_id);

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del proveedor es obligatorio'
      });
    }

    if (!Number.isInteger(negocioId) || negocioId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El negocio_id es obligatorio'
      });
    }

    const nombreLimpio = nombre.trim();

    const existente = await pool.query(
      `
        SELECT id, nombre
        FROM proveedores
        WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
          AND negocio_id = $2
        LIMIT 1
      `,
      [nombreLimpio, negocioId]
    );

    if (existente.rows.length > 0) {
      return res.json({
        success: true,
        proveedor: existente.rows[0],
        creado: false
      });
    }

    const nuevo = await pool.query(
      `
        INSERT INTO proveedores (
          nombre,
          created_by,
          activo,
          negocio_id
        )
        VALUES ($1, $2, true, $3)
        RETURNING id, nombre
      `,
      [
        nombreLimpio,
        usuario_id || null,
        negocioId
      ]
    );

    res.json({
      success: true,
      proveedor: nuevo.rows[0],
      creado: true
    });

  } catch (error) {
    console.error('Error proveedor:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/proveedores', async (req, res) => {
  try {
    const negocioId = Number(req.query.negocio_id);

    if (!Number.isInteger(negocioId) || negocioId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El negocio_id es obligatorio'
      });
    }

    const result = await pool.query(
      `
        SELECT id, nombre
        FROM proveedores
        WHERE negocio_id = $1
          AND (activo = true OR activo IS NULL)
        ORDER BY nombre ASC
      `,
      [negocioId]
    );

    res.json({
      success: true,
      proveedores: result.rows
    });

  } catch (error) {
    console.error('Error cargando proveedores:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get("/api/usuarios", async (req, res) => {
  const { negocio_id } = req.query;

  if (!negocio_id) {
    return res.status(400).json({
      success: false,
      message: "Falta negocio_id",
    });
  }

  try {
    const resultado = await pool.query(
      `
        SELECT DISTINCT
          u.id,
          u.nombre
        FROM usuarios u
        INNER JOIN egresos e
          ON e.usuario_crea_id = u.id
        WHERE e.negocio_id = $1
          AND u.nombre IS NOT NULL
          AND TRIM(u.nombre) <> ''
        ORDER BY u.nombre ASC
      `,
      [negocio_id]
    );

    return res.json({
      success: true,
      usuarios: resultado.rows,
    });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible obtener los usuarios",
    });
  }
});

// Obtener socios
app.get('/api/socios', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, nombre, porcentaje_participacion, activo
      FROM socios
      WHERE activo = true
      ORDER BY nombre ASC
      `
    );

    res.json({
      success: true,
      socios: result.rows
    });

  } catch (error) {
    console.error('Error cargando socios:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener inversiones de socios
app.get('/api/inversiones-socios', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        i.*,
        s.nombre AS socio,
        u.nombre AS usuario_crea
      FROM inversiones_socios i
      LEFT JOIN socios s
        ON s.id = i.socio_id
      LEFT JOIN usuarios u
        ON u.id = i.usuario_crea_id
      ORDER BY i.fecha DESC, i.id DESC
      `
    );

    res.json({
      success: true,
      inversiones: result.rows
    });

  } catch (error) {
    console.error('Error cargando inversiones de socios:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Guardar inversión de socio
app.post('/api/inversiones-socios', upload.single('comprobante'), async (req, res) => {
  try {
    const {
  socio_id,
  fecha,
  tipo_movimiento,
  metodo_pago,
  cuenta_origen,
  monto,
  comentario,
  usuario_crea_id
} = req.body;

    const comprobante = req.file;

    if (!socio_id) {
      return res.status(400).json({
        success: false,
        error: 'Debes seleccionar un socio.'
      });
    }

    if (!fecha) {
      return res.status(400).json({
        success: false,
        error: 'La fecha es obligatoria.'
      });
    }

    if (!monto || Number(monto) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El monto debe ser mayor a cero.'
      });
    }

    const socioResult = await pool.query(
      `
      SELECT id, nombre
      FROM socios
      WHERE id = $1
      LIMIT 1
      `,
      [socio_id]
    );

    if (socioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Socio no encontrado.'
      });
    }

    const socio = socioResult.rows[0];

    let comprobanteUrl = null;

    if (comprobante) {
      if (!driveService) {
        return res.status(500).json({
          success: false,
          error: 'Drive aún no está listo, intenta de nuevo.'
        });
      }

      const tipoMovimientoCarpeta = tipo_movimiento || "Adelanto";
      const nombreCarpeta = `${tipoMovimientoCarpeta.toUpperCase()}_SOCIO_${fecha}_${socio.nombre}`;
      const folderId = await crearCarpetaEnDrive(nombreCarpeta);
      comprobanteUrl = `https://drive.google.com/drive/folders/${folderId}`;

      await subirArchivoADrive(
        comprobante.path,
        comprobante.originalname,
        comprobante.mimetype,
        folderId
      );
    }

    const result = await pool.query(
      `
      INSERT INTO inversiones_socios (
  socio_id,
  fecha,
  tipo_movimiento,
  metodo_pago,
  cuenta_origen,
  monto,
  comentario,
  comprobante_url,
  usuario_crea_id,
  created_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
RETURNING *
      `,
      [
  socio_id,
  fecha,
  tipo_movimiento || "Adelanto",
  metodo_pago || null,
  cuenta_origen || null,
  monto,
  comentario || null,
  comprobanteUrl,
  usuario_crea_id || null
]
    );

    res.json({
      success: true,
      inversion: result.rows[0],
      comprobante_url: comprobanteUrl
    });

  } catch (error) {
    console.error('Error guardando inversión de socio:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/categorias', async (req, res) => {
  try {
    const negocioId = Number(req.query.negocio_id);

    if (!Number.isInteger(negocioId) || negocioId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El negocio_id es obligatorio'
      });
    }

    const result = await pool.query(
      `
        SELECT id, nombre
        FROM categorias
        WHERE negocio_id = $1
        ORDER BY nombre ASC
      `,
      [negocioId]
    );

    res.json({
      success: true,
      categorias: result.rows
    });

  } catch (error) {
    console.error('Error cargando categorías:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/categorias/buscar-o-crear', async (req, res) => {
  try {
    const { nombre, negocio_id } = req.body;
    const negocioId = Number(negocio_id);

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la categoría es obligatorio'
      });
    }

    if (!Number.isInteger(negocioId) || negocioId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El negocio_id es obligatorio'
      });
    }

    const nombreLimpio = nombre.trim();

    const existente = await pool.query(
      `
        SELECT id, nombre
        FROM categorias
        WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
          AND negocio_id = $2
        LIMIT 1
      `,
      [nombreLimpio, negocioId]
    );

    if (existente.rows.length > 0) {
      return res.json({
        success: true,
        categoria: existente.rows[0],
        creado: false
      });
    }

    const nueva = await pool.query(
      `
        INSERT INTO categorias (
          nombre,
          negocio_id
        )
        VALUES ($1, $2)
        RETURNING id, nombre
      `,
      [nombreLimpio, negocioId]
    );

    res.json({
      success: true,
      categoria: nueva.rows[0],
      creado: true
    });

  } catch (error) {
    console.error('Error categoría:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener catálogo de puestos
app.get('/api/puestos', async (req, res) => {
  try {
    const negocioId = Number(req.query.negocio_id || 1);
    const activos =
  req.query.activos === "true"
    ? true
    : req.query.activos === "false"
    ? false
    : null;

    if (!Number.isInteger(negocioId) || negocioId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El negocio_id no es válido.",
      });
    }

    const result = await pool.query(
  `
    SELECT
      id,
      nombre,
      tipo_nomina,
      hoja_excel,
      seccion_nomina,
      modalidad_pago,
      tarifa_base,
      tarifa_viernes,
      tarifa_sabado,
      activo,
      negocio_id
    FROM puestos
    WHERE negocio_id = $1
      AND (
        $2::BOOLEAN IS NULL
        OR activo = $2::BOOLEAN
      )
    ORDER BY nombre ASC;
  `,
  [negocioId, activos]
);

    return res.json({
      success: true,
      puestos: result.rows,
    });
  } catch (error) {
    console.error("Error obteniendo puestos:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "No se pudieron obtener los puestos.",
    });
  }
});

// Crear puesto
app.post('/api/puestos', async (req, res) => {
  try {
    const {
      nombre,
      tipo_nomina,
      hoja_excel,
      seccion_nomina,
      modalidad_pago,
      tarifa_base,
      tarifa_viernes,
      tarifa_sabado,
      negocio_id,
    } = req.body;

    const nombreLimpio = String(nombre || "").trim();
    const negocioId = Number(negocio_id || 1);

    if (!nombreLimpio) {
      return res.status(400).json({
        success: false,
        error: "El nombre del puesto es obligatorio.",
      });
    }

    if (!Number.isInteger(negocioId) || negocioId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El negocio_id no es válido.",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO puestos (
          nombre,
          tipo_nomina,
          hoja_excel,
          seccion_nomina,
          modalidad_pago,
          tarifa_base,
          tarifa_viernes,
          tarifa_sabado,
          activo,
          negocio_id,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          TRUE, $9, NOW(), NOW()
        )
        RETURNING *;
      `,
      [
        nombreLimpio,
        tipo_nomina || "Operativa",
        hoja_excel || "PRINCIPAL",
        String(seccion_nomina || "GENERAL").trim().toUpperCase(),
        modalidad_pago || "DIARIO",
        Number(tarifa_base) || 0,
        Number(tarifa_viernes) || 300,
        Number(tarifa_sabado) || 200,
        negocioId,
      ]
    );

    return res.json({
      success: true,
      puesto: result.rows[0],
    });
  } catch (error) {
    console.error("Error creando puesto:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "Ya existe un puesto con ese nombre.",
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Editar puesto
app.put('/api/puestos/:id', async (req, res) => {
  try {
    const puestoId = Number(req.params.id);

    const {
      nombre,
      tipo_nomina,
      hoja_excel,
      seccion_nomina,
      modalidad_pago,
      tarifa_base,
      tarifa_viernes,
      tarifa_sabado,
      negocio_id,
    } = req.body;

    const nombreLimpio = String(nombre || "").trim();
    const negocioId = Number(negocio_id || 1);

    if (!Number.isInteger(puestoId) || puestoId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El id del puesto no es válido.",
      });
    }

    if (!nombreLimpio) {
      return res.status(400).json({
        success: false,
        error: "El nombre del puesto es obligatorio.",
      });
    }

    const anteriorResult = await pool.query(
      `
        SELECT *
        FROM puestos
        WHERE id = $1
          AND negocio_id = $2
        LIMIT 1;
      `,
      [puestoId, negocioId]
    );

    if (anteriorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No se encontró el puesto.",
      });
    }

    const result = await pool.query(
      `
        UPDATE puestos
        SET
          nombre = $1,
          tipo_nomina = $2,
          hoja_excel = $3,
          seccion_nomina = $4,
          modalidad_pago = $5,
          tarifa_base = $6,
          tarifa_viernes = $7,
          tarifa_sabado = $8,
          updated_at = NOW()
        WHERE id = $9
          AND negocio_id = $10
        RETURNING *;
      `,
      [
        nombreLimpio,
        tipo_nomina || "Operativa",
        hoja_excel || "PRINCIPAL",
        String(seccion_nomina || "GENERAL").trim().toUpperCase(),
        modalidad_pago || "DIARIO",
        Number(tarifa_base) || 0,
        Number(tarifa_viernes) || 300,
        Number(tarifa_sabado) || 200,
        puestoId,
        negocioId,
      ]
    );

    // Mantener sincronizado el texto antiguo del puesto
    await pool.query(
      `
        UPDATE empleados
        SET puesto = $1
        WHERE puesto_id = $2;
      `,
      [nombreLimpio, puestoId]
    );

    return res.json({
      success: true,
      puesto: result.rows[0],
    });
  } catch (error) {
    console.error("Error editando puesto:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "Ya existe otro puesto con ese nombre.",
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Desactivar puesto
app.put('/api/puestos/:id/desactivar', async (req, res) => {
  try {
    const puestoId = Number(req.params.id);

    if (!Number.isInteger(puestoId) || puestoId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El id del puesto no es válido.",
      });
    }

    const empleadosActivos = await pool.query(
      `
        SELECT COUNT(*)::INTEGER AS total
        FROM empleados
        WHERE puesto_id = $1
          AND activo = TRUE;
      `,
      [puestoId]
    );

    if (empleadosActivos.rows[0].total > 0) {
      return res.status(400).json({
        success: false,
        error:
          "No puedes desactivar este puesto porque tiene empleados activos asignados.",
      });
    }

    const result = await pool.query(
      `
        UPDATE puestos
        SET
          activo = FALSE,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `,
      [puestoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No se encontró el puesto.",
      });
    }

    return res.json({
      success: true,
      puesto: result.rows[0],
    });
  } catch (error) {
    console.error("Error desactivando puesto:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Reactivar puesto
app.put('/api/puestos/:id/reactivar', async (req, res) => {
  try {
    const puestoId = Number(req.params.id);

    if (!Number.isInteger(puestoId) || puestoId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El id del puesto no es válido.",
      });
    }

    const result = await pool.query(
      `
        UPDATE puestos
        SET
          activo = TRUE,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `,
      [puestoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No se encontró el puesto.",
      });
    }

    return res.json({
      success: true,
      puesto: result.rows[0],
    });
  } catch (error) {
    console.error("Error reactivando puesto:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Obtener empleados con configuración del puesto
app.get('/api/empleados', async (req, res) => {
  try {
    const { activos } = req.query;

    const condiciones = [];
    const valores = [];

    if (activos === 'true') {
      condiciones.push('e.activo = TRUE');
    }

    if (activos === 'false') {
      condiciones.push('e.activo = FALSE');
    }

    let query = `
      SELECT
        e.*,
        COALESCE(p.nombre, e.puesto) AS puesto_nombre,
        p.tipo_nomina AS tipo_nomina_puesto,
        p.hoja_excel,
        p.seccion_nomina,
        p.modalidad_pago,
        p.tarifa_base,
        p.tarifa_viernes,
        p.tarifa_sabado
      FROM empleados e
      LEFT JOIN puestos p
        ON p.id = e.puesto_id
    `;

    if (condiciones.length > 0) {
      query += ` WHERE ${condiciones.join(' AND ')} `;
    }

    query += ` ORDER BY e.nombre ASC `;

    const result = await pool.query(query, valores);

    return res.json({
      success: true,
      empleados: result.rows,
    });
  } catch (error) {
    console.error('Error empleados:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Crear empleado
app.post('/api/empleados', async (req, res) => {

  try {

  const {
  nombre,
  puesto_id,
  fecha_ingreso,
  cuenta_bancaria,
  sueldo_diario,
  sueldo_base,
  tipo_nomina,
  metodo_pago_nomina,
  usuario_id
} = req.body;

    const result = await pool.query(
      `
      INSERT INTO empleados (
  nombre,
  puesto_id,
  puesto,
  fecha_ingreso,
  cuenta_bancaria,
  sueldo_diario,
  sueldo_base,
  tipo_nomina,
  metodo_pago_nomina,
  activo,
  created_at,
  created_by
)
VALUES (
  $1,
  $2,
  (SELECT nombre FROM puestos WHERE id = $2),
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  true,
  NOW(),
  $9
)
      RETURNING *
      `,
      [
  nombre,
  puesto_id || null,
  fecha_ingreso || null,
  cuenta_bancaria || null,
  sueldo_diario || 0,
  sueldo_base || 0,
  tipo_nomina || "Operativa",
  metodo_pago_nomina || "Efectivo",
  usuario_id || null
]
    );

    res.json({
      success: true,
      empleado: result.rows[0]
    });

  } catch (error) {

    console.error('Error creando empleado:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Baja empleado
app.put('/api/empleados/:id/baja', async (req, res) => {

  try {

    const { id } = req.params;

    const {
      motivo_baja,
      usuario_id
    } = req.body;

    const result = await pool.query(
      `
      UPDATE empleados
      SET
        activo = false,
        fecha_baja = CURRENT_DATE,
        motivo_baja = $1,
        deleted_at = NOW(),
        deleted_by = $2
      WHERE id = $3
      RETURNING *
      `,
      [
        motivo_baja || null,
        usuario_id || null,
        id
      ]
    );

    res.json({
      success: true,
      empleado: result.rows[0]
    });

  } catch (error) {

    console.error('Error baja empleado:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reactivar empleado
app.put('/api/empleados/:id/reactivar', async (req, res) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE empleados
      SET
        activo = true,
        fecha_baja = NULL,
        motivo_baja = NULL,
        deleted_at = NULL,
        deleted_by = NULL
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    res.json({
      success: true,
      empleado: result.rows[0]
    });

  } catch (error) {

    console.error('Error reactivando empleado:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Editar empleado
app.put('/api/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;

   const {
  nombre,
  puesto_id,
  fecha_ingreso,
  cuenta_bancaria,
  sueldo_diario,
  sueldo_base,
  tipo_nomina,
  metodo_pago_nomina,
  usuario_id
} = req.body;

    const result = await pool.query(
      `
      UPDATE empleados
SET
  nombre = $1,
  puesto_id = $2,
  puesto = (
    SELECT nombre
    FROM puestos
    WHERE id = $2
  ),
  fecha_ingreso = $3,
  cuenta_bancaria = $4,
  sueldo_diario = $5,
  sueldo_base = $6,
  tipo_nomina = $7,
  metodo_pago_nomina = $8,
  updated_at = NOW(),
  updated_by = $9
WHERE id = $10
RETURNING *
      `,
      [
  nombre,
  puesto_id || null,
  fecha_ingreso || null,
  cuenta_bancaria || null,
  sueldo_diario || 0,
  sueldo_base || 0,
  tipo_nomina || "Operativa",
  metodo_pago_nomina || "Efectivo",
  usuario_id || null,
  id
]
    );

    res.json({
      success: true,
      empleado: result.rows[0]
    });

  } catch (error) {
    console.error('Error editando empleado:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crear prenómina pendiente
app.post('/api/prenomina', async (req, res) => {
  const client = await pool.connect();

  try {
    const {
  fecha_inicio,
  fecha_fin,
  total,
  usuario_crea_id,
  comentarios_extraordinarios,
  comentarios,
  detalle
} = req.body;

const negocioId = 1; // BOSSE

    if (!detalle || !Array.isArray(detalle) || detalle.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'La prenómina debe tener al menos un empleado.'
      });
    }

    await client.query('BEGIN');

    const prenominaResult = await client.query(
      `
      INSERT INTO prenomina (
  fecha_inicio,
  fecha_fin,
  total,
  estatus,
  usuario_crea_id,
  comentarios_extraordinarios,
  comentarios,
  fecha_creacion,
  negocio_id
)
VALUES (
  $1,
  $2,
  $3,
  'PENDIENTE',
  $4,
  $5,
  $6,
  NOW(),
  $7
)
      RETURNING *
      `,
      [
  fecha_inicio || null,
  fecha_fin || null,
  total || 0,
  usuario_crea_id || null,
  comentarios_extraordinarios || null,
  comentarios || null,
  negocioId
]
    );

    const prenomina = prenominaResult.rows[0];

    for (const fila of detalle) {
  const empleadoResult = await client.query(
    `
      SELECT
        e.id,
        e.puesto_id,
        COALESCE(p.nombre, e.puesto) AS puesto_nombre,
        COALESCE(p.tipo_nomina, e.tipo_nomina, 'Operativa') AS tipo_nomina,
        p.modalidad_pago,
        p.hoja_excel,
        p.seccion_nomina,
        COALESCE(
          e.metodo_pago_nomina,
          'Efectivo'
        ) AS metodo_pago_nomina
      FROM empleados e
      LEFT JOIN puestos p
        ON p.id = e.puesto_id
      WHERE e.id = $1
      LIMIT 1;
    `,
    [fila.empleado_id]
  );

  if (empleadoResult.rows.length === 0) {
    throw new Error(
      `No se encontró el empleado con id ${fila.empleado_id}.`
    );
  }

  const empleado = empleadoResult.rows[0];

  const detalleInsertadoResult = await client.query(
  `
    INSERT INTO prenomina_detalle (
      prenomina_id,
      empleado_id,
      puesto_id,
      puesto_nombre,
      dias,
      costo_unitario,
      prima,
      descuento,
      total,
      tipo_nomina,
      metodo_pago_nomina,
      modalidad_pago,
      hoja_excel,
      seccion_nomina,
      comentario_pago,
      nota
    )
    VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15, $16
    )
    RETURNING id;
  `,
  [
    prenomina.id,
    fila.empleado_id,
    empleado.puesto_id || null,
    empleado.puesto_nombre || null,
    Number(fila.dias) || 0,
    Number(fila.costo_unitario) || 0,
    Number(fila.prima) || 0,
    Number(fila.descuento) || 0,
    Number(fila.total) || 0,
    empleado.tipo_nomina || "Operativa",
    fila.metodo_pago_nomina ||
      empleado.metodo_pago_nomina ||
      "Efectivo",
    empleado.modalidad_pago || "DIARIO",
    empleado.hoja_excel || "PRINCIPAL",
    empleado.seccion_nomina || "GENERAL",
    fila.comentario_pago || null,
    fila.nota || null,
  ]
);

const prenominaDetalleId =
  detalleInsertadoResult.rows[0].id;

const mesas = Array.isArray(fila.mesas)
  ? fila.mesas
  : [];

for (const mesa of mesas) {
  const fechaMesa = mesa.fecha || null;
  const cantidadMesas =
    Number(mesa.cantidad_mesas) || 0;
  const tarifaMesa =
    Number(mesa.tarifa_mesa) || 0;

  if (!fechaMesa) {
    continue;
  }

  await client.query(
    `
      INSERT INTO prenomina_detalle_mesas (
        prenomina_detalle_id,
        fecha,
        cantidad_mesas,
        tarifa_mesa
      )
      VALUES ($1, $2, $3, $4);
    `,
    [
      prenominaDetalleId,
      fechaMesa,
      cantidadMesas,
      tarifaMesa,
    ]
  );
}
}

    await client.query(
      `
      INSERT INTO prenomina_logs (
        prenomina_id,
        accion,
        usuario_id,
        comentario,
        created_at
      )
      VALUES ($1, 'CREADA', $2, $3, NOW())
      `,
      [
        prenomina.id,
        usuario_crea_id || null,
        comentarios || 'Prenómina creada y enviada a aprobación'
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      prenomina
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error creando prenómina:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  } finally {
    client.release();
  }
});

// Editar prenómina existente
app.put('/api/prenomina/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const prenominaId = Number(req.params.id);

    if (!Number.isInteger(prenominaId) || prenominaId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El id de la prenómina no es válido.",
      });
    }

    const {
      fecha_inicio,
      fecha_fin,
      total,
      usuario_edita_id,
      comentarios_extraordinarios,
      comentarios,
      detalle,
    } = req.body;

    if (!detalle || !Array.isArray(detalle) || detalle.length === 0) {
      return res.status(400).json({
        success: false,
        error: "La prenómina debe tener al menos un empleado.",
      });
    }

    await client.query("BEGIN");

    const prenominaAnteriorResult = await client.query(
      `
        SELECT *
        FROM prenomina
        WHERE id = $1
        FOR UPDATE;
      `,
      [prenominaId]
    );

    if (prenominaAnteriorResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        error: "Prenómina no encontrada.",
      });
    }

    const prenominaAnterior = prenominaAnteriorResult.rows[0];

    const prenominaActualizadaResult = await client.query(
      `
        UPDATE prenomina
        SET
          fecha_inicio = $1,
          fecha_fin = $2,
          total = $3,
          comentarios_extraordinarios = $4,
          comentarios = $5
        WHERE id = $6
        RETURNING *;
      `,
      [
        fecha_inicio || null,
        fecha_fin || null,
        Number(total) || 0,
        comentarios_extraordinarios || null,
        comentarios || null,
        prenominaId,
      ]
    );

    // Guardamos los IDs de detalle actuales
    const detallesAnterioresResult = await client.query(
      `
        SELECT id
        FROM prenomina_detalle
        WHERE prenomina_id = $1;
      `,
      [prenominaId]
    );

    const idsDetalleAnteriores =
      detallesAnterioresResult.rows.map((fila) => fila.id);

    // Primero eliminar las mesas asociadas
    if (idsDetalleAnteriores.length > 0) {
      await client.query(
        `
          DELETE FROM prenomina_detalle_mesas
          WHERE prenomina_detalle_id = ANY($1::int[]);
        `,
        [idsDetalleAnteriores]
      );
    }

    // Luego reemplazamos todo el detalle
    await client.query(
      `
        DELETE FROM prenomina_detalle
        WHERE prenomina_id = $1;
      `,
      [prenominaId]
    );

    for (const fila of detalle) {
      const empleadoResult = await client.query(
        `
          SELECT
            e.id,
            e.puesto_id,
            COALESCE(p.nombre, e.puesto) AS puesto_nombre,
            COALESCE(
              p.tipo_nomina,
              e.tipo_nomina,
              'Operativa'
            ) AS tipo_nomina,
            p.modalidad_pago,
            p.hoja_excel,
            p.seccion_nomina,
            COALESCE(
              e.metodo_pago_nomina,
              'Efectivo'
            ) AS metodo_pago_nomina
          FROM empleados e
          LEFT JOIN puestos p
            ON p.id = e.puesto_id
          WHERE e.id = $1
          LIMIT 1;
        `,
        [fila.empleado_id]
      );

      if (empleadoResult.rows.length === 0) {
        throw new Error(
          `No se encontró el empleado con id ${fila.empleado_id}.`
        );
      }

      const empleado = empleadoResult.rows[0];

      const detalleInsertadoResult = await client.query(
        `
          INSERT INTO prenomina_detalle (
            prenomina_id,
            empleado_id,
            puesto_id,
            puesto_nombre,
            dias,
            costo_unitario,
            prima,
            descuento,
            total,
            tipo_nomina,
            metodo_pago_nomina,
            modalidad_pago,
            hoja_excel,
            seccion_nomina,
            comentario_pago,
            nota
          )
          VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, $12,
            $13, $14, $15, $16
          )
          RETURNING id;
        `,
        [
          prenominaId,
          fila.empleado_id,
          empleado.puesto_id || null,
          empleado.puesto_nombre || null,
          Number(fila.dias) || 0,
          Number(fila.costo_unitario) || 0,
          Number(fila.prima) || 0,
          Number(fila.descuento) || 0,
          Number(fila.total) || 0,
          fila.tipo_nomina ||
            empleado.tipo_nomina ||
            "Operativa",
          fila.metodo_pago_nomina ||
            empleado.metodo_pago_nomina ||
            "Efectivo",
          fila.modalidad_pago ||
            empleado.modalidad_pago ||
            "DIARIO",
          fila.hoja_excel ||
            empleado.hoja_excel ||
            "PRINCIPAL",
          fila.seccion_nomina ||
            empleado.seccion_nomina ||
            "GENERAL",
          fila.comentario_pago || null,
          fila.nota || null,
        ]
      );

      const prenominaDetalleId =
        detalleInsertadoResult.rows[0].id;

      const mesas = Array.isArray(fila.mesas)
        ? fila.mesas
        : [];

      for (const mesa of mesas) {
        const fechaMesa = mesa.fecha || null;
        const cantidadMesas =
          Number(mesa.cantidad_mesas) || 0;
        const tarifaMesa =
          Number(mesa.tarifa_mesa) || 0;

        if (!fechaMesa) {
          continue;
        }

        await client.query(
          `
            INSERT INTO prenomina_detalle_mesas (
              prenomina_detalle_id,
              fecha,
              cantidad_mesas,
              tarifa_mesa
            )
            VALUES ($1, $2, $3, $4);
          `,
          [
            prenominaDetalleId,
            fechaMesa,
            cantidadMesas,
            tarifaMesa,
          ]
        );
      }
    }

    await client.query(
      `
        INSERT INTO prenomina_logs (
          prenomina_id,
          accion,
          usuario_id,
          comentario,
          created_at
        )
        VALUES (
          $1,
          'EDITADA',
          $2,
          $3,
          NOW()
        );
      `,
      [
        prenominaId,
        usuario_edita_id || null,
        comentarios ||
          `Prenómina editada. Total anterior: ${prenominaAnterior.total}`,
      ]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Prenómina actualizada correctamente.",
      prenomina: prenominaActualizadaResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error editando prenómina:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "No fue posible actualizar la prenómina.",
    });
  } finally {
    client.release();
  }
});

// Obtener detalle histórico de una prenómina
app.get('/api/prenomina/:id/detalle', async (req, res) => {
  try {
    const prenominaId = Number(req.params.id);

    if (!Number.isInteger(prenominaId) || prenominaId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El id de la prenómina no es válido.",
      });
    }

    const prenominaResult = await pool.query(
      `
        SELECT
          p.*,
          creador.nombre AS usuario_crea,
          aprobador.nombre AS usuario_aprueba
        FROM prenomina p
        LEFT JOIN usuarios creador
          ON creador.id = p.usuario_crea_id
        LEFT JOIN usuarios aprobador
          ON aprobador.id = p.usuario_aprueba_id
        WHERE p.id = $1
        LIMIT 1;
      `,
      [prenominaId]
    );

    if (prenominaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Prenómina no encontrada.",
      });
    }

    const detalleResult = await pool.query(
      `
        SELECT
          pd.id,
          pd.prenomina_id,
          pd.empleado_id,

          COALESCE(
            e.nombre,
            'Empleado no disponible'
          ) AS empleado,

          pd.puesto_id,

          COALESCE(
            pd.puesto_nombre,
            p.nombre,
            e.puesto,
            'Sin puesto'
          ) AS puesto,

          COALESCE(
            pd.tipo_nomina,
            p.tipo_nomina,
            e.tipo_nomina,
            'Operativa'
          ) AS tipo_nomina,

          COALESCE(
            pd.metodo_pago_nomina,
            e.metodo_pago_nomina,
            'Efectivo'
          ) AS metodo_pago_nomina,

          COALESCE(
            pd.modalidad_pago,
            p.modalidad_pago,
            'DIARIO'
          ) AS modalidad_pago,

          COALESCE(
            pd.hoja_excel,
            p.hoja_excel,
            'PRINCIPAL'
          ) AS hoja_excel,

          COALESCE(
            pd.seccion_nomina,
            p.seccion_nomina,
            'GENERAL'
          ) AS seccion_nomina,

          pd.dias,
          pd.costo_unitario,
          pd.prima,
          pd.descuento,
          pd.total,
          pd.comentario_pago,
          pd.nota

        FROM prenomina_detalle pd

        LEFT JOIN empleados e
          ON e.id = pd.empleado_id

        LEFT JOIN puestos p
          ON p.id = pd.puesto_id

        WHERE pd.prenomina_id = $1

        ORDER BY
          COALESCE(pd.hoja_excel, p.hoja_excel, 'PRINCIPAL'),
          COALESCE(pd.seccion_nomina, p.seccion_nomina, 'GENERAL'),
          COALESCE(e.nombre, '') ASC;
      `,
      [prenominaId]
    );

    return res.json({
      success: true,
      prenomina: prenominaResult.rows[0],
      detalle: detalleResult.rows,
    });
  } catch (error) {
    console.error("Error detalle prenómina:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Descargar Excel de una prenómina aprobada
app.get('/api/prenomina/:id/excel', async (req, res) => {
  try {
    const prenominaId = Number(req.params.id);

    if (!Number.isInteger(prenominaId) || prenominaId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El id de la prenómina no es válido.",
      });
    }

    // ============================================================
    // 1. CONSULTAR PRENÓMINA
    // ============================================================

    const prenominaResult = await pool.query(
      `
        SELECT
          p.*,
          creador.nombre AS usuario_crea,
          aprobador.nombre AS usuario_aprueba
        FROM prenomina p
        LEFT JOIN usuarios creador
          ON creador.id = p.usuario_crea_id
        LEFT JOIN usuarios aprobador
          ON aprobador.id = p.usuario_aprueba_id
        WHERE p.id = $1
        LIMIT 1;
      `,
      [prenominaId]
    );

    if (prenominaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Prenómina no encontrada.",
      });
    }

    const prenomina = prenominaResult.rows[0];

    if (prenomina.estatus !== "APROBADA") {
      return res.status(400).json({
        success: false,
        error:
          "El Excel solamente puede descargarse cuando la prenómina está aprobada.",
      });
    }

    // ============================================================
    // 2. CONSULTAR DETALLE
    // ============================================================

    const detalleResult = await pool.query(
      `
        SELECT
          pd.id,
          pd.prenomina_id,
          pd.empleado_id,

          COALESCE(
            e.nombre,
            'Empleado no disponible'
          ) AS empleado,

          e.fecha_ingreso,
          e.cuenta_bancaria,

          pd.puesto_id,

          COALESCE(
            pd.puesto_nombre,
            p.nombre,
            e.puesto,
            'Sin puesto'
          ) AS puesto,

          COALESCE(
            pd.tipo_nomina,
            p.tipo_nomina,
            e.tipo_nomina,
            'Operativa'
          ) AS tipo_nomina,

          COALESCE(
            pd.metodo_pago_nomina,
            e.metodo_pago_nomina,
            'Efectivo'
          ) AS metodo_pago_nomina,

          COALESCE(
            pd.modalidad_pago,
            p.modalidad_pago,
            'DIARIO'
          ) AS modalidad_pago,

          COALESCE(
            pd.hoja_excel,
            p.hoja_excel,
            'PRINCIPAL'
          ) AS hoja_excel,

          COALESCE(
            pd.seccion_nomina,
            p.seccion_nomina,
            'GENERAL'
          ) AS seccion_nomina,

          pd.dias,
          pd.costo_unitario,
          pd.prima,
          pd.descuento,
          pd.total,
          pd.comentario_pago,
          pd.nota

        FROM prenomina_detalle pd

        LEFT JOIN empleados e
          ON e.id = pd.empleado_id

        LEFT JOIN puestos p
          ON p.id = pd.puesto_id

        WHERE pd.prenomina_id = $1

        ORDER BY pd.id ASC;
      `,
      [prenominaId]
    );

    const detalle = detalleResult.rows;

    // ============================================================
    // 3. CONSULTAR MESAS RP
    // ============================================================

    const mesasResult = await pool.query(
      `
        SELECT
          pdm.id,
          pdm.prenomina_detalle_id,
          pdm.fecha,
          pdm.cantidad_mesas,
          pdm.tarifa_mesa,
          pdm.subtotal
        FROM prenomina_detalle_mesas pdm
        INNER JOIN prenomina_detalle pd
          ON pd.id = pdm.prenomina_detalle_id
        WHERE pd.prenomina_id = $1
        ORDER BY
          pdm.prenomina_detalle_id ASC,
          pdm.fecha ASC,
          pdm.id ASC;
      `,
      [prenominaId]
    );

    const mesas = mesasResult.rows;

    // ============================================================
    // 4. ABRIR MACHOTE
    // ============================================================

    const plantillaPath = path.join(
      __dirname,
      "templates",
      "nomina_machote.xlsx"
    );

    if (!fs.existsSync(plantillaPath)) {
      return res.status(500).json({
        success: false,
        error:
          "No se encontró templates/nomina_machote.xlsx en el servidor.",
      });
    }

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(plantillaPath);

    const hojaPrincipal =
      workbook.getWorksheet("19.20 JUNIO");

    const hojaNominaOp =
      workbook.getWorksheet("Nómina Op.");

    const hojaRP =
      workbook.getWorksheet("RP");

    if (!hojaPrincipal || !hojaNominaOp || !hojaRP) {
      throw new Error(
        "El machote no contiene las hojas esperadas: 19.20 JUNIO, Nómina Op. y RP."
      );
    }

    // ============================================================
    // 5. FUNCIONES AUXILIARES
    // ============================================================

    const mesesNombre = [
      "ENERO",
      "FEBRERO",
      "MARZO",
      "ABRIL",
      "MAYO",
      "JUNIO",
      "JULIO",
      "AGOSTO",
      "SEPTIEMBRE",
      "OCTUBRE",
      "NOVIEMBRE",
      "DICIEMBRE",
    ];

    const convertirFecha = (fecha) => {
      if (!fecha) return null;

      const texto = String(fecha).split("T")[0];
      const [anio, mes, dia] = texto
        .split("-")
        .map(Number);

      if (!anio || !mes || !dia) {
        return null;
      }

      return new Date(anio, mes - 1, dia);
    };

    const crearTituloPeriodo = () => {
      const inicio = convertirFecha(
        prenomina.fecha_inicio
      );

      const fin = convertirFecha(
        prenomina.fecha_fin
      );

      if (!inicio && !fin) {
        return "NÓMINA";
      }

      if (inicio && fin) {
        const diaInicio = inicio.getDate();
        const diaFin = fin.getDate();

        const mesInicio =
          mesesNombre[inicio.getMonth()];

        const mesFin =
          mesesNombre[fin.getMonth()];

        if (
          inicio.getMonth() === fin.getMonth() &&
          inicio.getFullYear() === fin.getFullYear()
        ) {
          return `${diaInicio}.${diaFin} ${mesInicio}`;
        }

        return `${diaInicio} ${mesInicio} - ${diaFin} ${mesFin}`;
      }

      const fecha = inicio || fin;

      return `${fecha.getDate()} ${
        mesesNombre[fecha.getMonth()]
      }`;
    };

    const normalizarTexto = (valor) =>
      String(valor || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const tituloPeriodo = crearTituloPeriodo();

    hojaPrincipal.getCell("B5").value =
      tituloPeriodo;

    hojaNominaOp.getCell("B6").value =
      tituloPeriodo;

    hojaRP.getCell("B6").value =
      tituloPeriodo;

    // ============================================================
    // 6. LIMPIAR DATOS DEL MACHOTE SIN BORRAR FORMATO
    // ============================================================

    const limpiarCeldas = (
      hoja,
      filaInicio,
      filaFin,
      columnas
    ) => {
      for (
        let fila = filaInicio;
        fila <= filaFin;
        fila += 1
      ) {
        for (const columna of columnas) {
          hoja.getCell(
            `${columna}${fila}`
          ).value = null;
        }
      }
    };

    // Hoja principal
    limpiarCeldas(
      hojaPrincipal,
      9,
      15,
      ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
    );

    limpiarCeldas(
      hojaPrincipal,
      17,
      30,
      ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
    );

    limpiarCeldas(
      hojaPrincipal,
      32,
      54,
      ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
    );

    limpiarCeldas(
      hojaPrincipal,
      56,
      60,
      ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
    );

    limpiarCeldas(
      hojaPrincipal,
      62,
      88,
      ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
    );

    limpiarCeldas(
      hojaPrincipal,
      90,
      100,
      ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
    );

    limpiarCeldas(
      hojaPrincipal,
      102,
      102,
      ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
    );

    limpiarCeldas(
      hojaPrincipal,
      104,
      105,
      ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
    );

    limpiarCeldas(
      hojaPrincipal,
      107,
      113,
      ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
    );

    // Nómina Op.
    limpiarCeldas(
      hojaNominaOp,
      9,
      13,
      ["B", "C", "D", "E", "F"]
    );

    // RP
    limpiarCeldas(
      hojaRP,
      9,
      22,
      [
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
      ]
    );

    // ============================================================
    // 7. LLENAR HOJA PRINCIPAL
    // ============================================================

    const seccionesPrincipal = {
      GENERAL: {
        inicio: 9,
        fin: 15,
        numerar: false,
      },

      MESEROS: {
        inicio: 17,
        fin: 30,
        numerar: true,
      },

      AYUDANTES: {
        inicio: 32,
        fin: 54,
        numerar: true,
      },

      BARRA: {
        inicio: 56,
        fin: 60,
        numerar: true,
      },

      SEGURIDAD: {
        inicio: 62,
        fin: 88,
        numerar: true,
      },

      HOSTESS: {
        inicio: 90,
        fin: 100,
        numerar: true,
      },

      CADENA: {
        inicio: 102,
        fin: 102,
        numerar: false,
      },

      BANOS: {
        inicio: 104,
        fin: 105,
        numerar: false,
      },

      DJ: {
        inicio: 107,
        fin: 113,
        numerar: false,
      },
    };

    const detallePrincipal = detalle.filter(
      (item) =>
        normalizarTexto(item.hoja_excel) ===
        "PRINCIPAL"
    );

    const agrupadosPrincipal = {};

    for (const item of detallePrincipal) {
      let seccion = normalizarTexto(
        item.seccion_nomina
      );

      if (seccion === "MESERO") {
        seccion = "MESEROS";
      }

      if (seccion === "AYUDANTE") {
        seccion = "AYUDANTES";
      }

      if (seccion === "BANO") {
        seccion = "BANOS";
      }

      if (!seccionesPrincipal[seccion]) {
        seccion = "GENERAL";
      }

      if (!agrupadosPrincipal[seccion]) {
        agrupadosPrincipal[seccion] = [];
      }

      agrupadosPrincipal[seccion].push(item);
    }

    for (const [
      nombreSeccion,
      configuracion,
    ] of Object.entries(seccionesPrincipal)) {
      const empleados =
        agrupadosPrincipal[nombreSeccion] || [];

      const capacidad =
        configuracion.fin -
        configuracion.inicio +
        1;

      if (empleados.length > capacidad) {
        throw new Error(
          `La sección ${nombreSeccion} tiene ${empleados.length} empleados y el machote solo tiene espacio para ${capacidad}.`
        );
      }

      empleados.forEach((item, index) => {
        const fila =
          configuracion.inicio + index;

        if (configuracion.numerar) {
          hojaPrincipal.getCell(
            `A${fila}`
          ).value = index + 1;
        }

        hojaPrincipal.getCell(
          `B${fila}`
        ).value = item.empleado || "";

        hojaPrincipal.getCell(
          `C${fila}`
        ).value = convertirFecha(
          item.fecha_ingreso
        );

        hojaPrincipal.getCell(
          `D${fila}`
        ).value =
          item.cuenta_bancaria || "";

        hojaPrincipal.getCell(
          `E${fila}`
        ).value = item.puesto || "";

        if (
          normalizarTexto(
            item.modalidad_pago
          ) === "SEMANAL"
        ) {
          hojaPrincipal.getCell(
            `F${fila}`
          ).value = "SEMANA";
        } else {
          hojaPrincipal.getCell(
            `F${fila}`
          ).value =
            Number(item.dias) || 0;
        }

        hojaPrincipal.getCell(
          `G${fila}`
        ).value =
          Number(item.costo_unitario) ||
          0;

        hojaPrincipal.getCell(
          `I${fila}`
        ).value =
          Number(item.total) || 0;

        hojaPrincipal.getCell(
          `C${fila}`
        ).numFmt = "dd/mm/yyyy";

        hojaPrincipal.getCell(
          `G${fila}`
        ).numFmt = '$#,##0.00';

        hojaPrincipal.getCell(
          `I${fila}`
        ).numFmt = '$#,##0.00';
      });
    }

    const totalPrincipal =
      detallePrincipal.reduce(
        (acumulado, item) =>
          acumulado +
          (Number(item.total) || 0),
        0
      );

    hojaPrincipal.getCell("I114").value =
      totalPrincipal;

    hojaPrincipal.getCell("I114").numFmt =
      '$#,##0.00';

    // ============================================================
    // 8. LLENAR NÓMINA OP.
    // ============================================================

    const detalleNominaOp = detalle.filter(
      (item) =>
        normalizarTexto(item.hoja_excel) ===
        "NOMINA_OP"
    );

    if (detalleNominaOp.length > 5) {
      throw new Error(
        `Nómina Op. tiene ${detalleNominaOp.length} empleados y el machote actualmente tiene espacio para 5.`
      );
    }

    detalleNominaOp.forEach(
      (item, index) => {
        const fila = 9 + index;

        hojaNominaOp.getCell(
          `B${fila}`
        ).value = item.empleado || "";

        hojaNominaOp.getCell(
          `C${fila}`
        ).value = convertirFecha(
          item.fecha_ingreso
        );

        hojaNominaOp.getCell(
          `D${fila}`
        ).value = item.puesto || "";

        hojaNominaOp.getCell(
          `E${fila}`
        ).value =
          Number(item.total) || 0;

        hojaNominaOp.getCell(
          `C${fila}`
        ).numFmt = "dd/mm/yyyy";

        hojaNominaOp.getCell(
          `E${fila}`
        ).numFmt = '$#,##0.00';
      }
    );

    const totalNominaOp =
      detalleNominaOp.reduce(
        (acumulado, item) =>
          acumulado +
          (Number(item.total) || 0),
        0
      );

    hojaNominaOp.getCell("E14").value =
      totalNominaOp;

    hojaNominaOp.getCell("E14").numFmt =
      '$#,##0.00';

    // ============================================================
    // 9. LLENAR RP
    // ============================================================

    const detalleRP = detalle.filter(
      (item) =>
        normalizarTexto(item.hoja_excel) ===
          "RP" ||
        normalizarTexto(
          item.modalidad_pago
        ) === "POR_MESA"
    );

    if (detalleRP.length > 14) {
      throw new Error(
        `RP tiene ${detalleRP.length} empleados y el machote actualmente tiene espacio para 14.`
      );
    }

    let totalViernes = 0;
    let totalSabado = 0;

    detalleRP.forEach((item, index) => {
      const fila = 9 + index;

      const mesasEmpleado = mesas
        .filter(
          (mesa) =>
            Number(
              mesa.prenomina_detalle_id
            ) === Number(item.id)
        )
        .sort(
          (a, b) =>
            String(a.fecha).localeCompare(
              String(b.fecha)
            )
        );

      const primeraMesa =
        mesasEmpleado[0] || null;

      const segundaMesa =
        mesasEmpleado[1] || null;

      const tarifaPrimera =
        Number(
          primeraMesa?.tarifa_mesa
        ) || 300;

      const cantidadPrimera =
        Number(
          primeraMesa?.cantidad_mesas
        ) || 0;

      const subtotalPrimera =
        cantidadPrimera *
        tarifaPrimera;

      const tarifaSegunda =
        Number(
          segundaMesa?.tarifa_mesa
        ) || 200;

      const cantidadSegunda =
        Number(
          segundaMesa?.cantidad_mesas
        ) || 0;

      const subtotalSegunda =
        cantidadSegunda *
        tarifaSegunda;

      totalViernes += subtotalPrimera;
      totalSabado += subtotalSegunda;

      hojaRP.getCell(
        `B${fila}`
      ).value = item.empleado || "";

      hojaRP.getCell(
        `C${fila}`
      ).value = item.puesto || "RP";

      hojaRP.getCell(
        `D${fila}`
      ).value = tarifaPrimera;

      hojaRP.getCell(
        `E${fila}`
      ).value = cantidadPrimera;

      hojaRP.getCell(
        `F${fila}`
      ).value = subtotalPrimera;

      hojaRP.getCell(
        `G${fila}`
      ).value = tarifaSegunda;

      hojaRP.getCell(
        `H${fila}`
      ).value = cantidadSegunda;

      hojaRP.getCell(
        `I${fila}`
      ).value = subtotalSegunda;

      hojaRP.getCell(
        `J${fila}`
      ).value =
        Number(item.total) ||
        subtotalPrimera +
          subtotalSegunda;

      ["D", "F", "G", "I", "J"].forEach(
        (columna) => {
          hojaRP.getCell(
            `${columna}${fila}`
          ).numFmt = '$#,##0.00';
        }
      );
    });

    hojaRP.getCell("F24").value =
      totalViernes;

    hojaRP.getCell("I24").value =
      totalSabado;

    hojaRP.getCell("J24").value =
      totalViernes + totalSabado;

    hojaRP.getCell("F24").numFmt =
      '$#,##0.00';

    hojaRP.getCell("I24").numFmt =
      '$#,##0.00';

    hojaRP.getCell("J24").numFmt =
      '$#,##0.00';

    // ============================================================
    // 10. GENERAR ARCHIVO
    // ============================================================

    const buffer =
      await workbook.xlsx.writeBuffer();

    const nombreArchivo = `Nomina ${tituloPeriodo
      .toLowerCase()
      .replace(/\b\w/g, (letra) =>
        letra.toUpperCase()
      )}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`
    );

    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error(
      "Error generando Excel de nómina:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "No se pudo generar el Excel.",
    });
  }
});

// Obtener prenóminas pendientes
app.get('/api/prenomina/pendientes', async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
        p.*,
        u.nombre AS usuario_crea
      FROM prenomina p
      LEFT JOIN usuarios u
        ON u.id = p.usuario_crea_id
      WHERE p.estatus = 'PENDIENTE'
      ORDER BY p.fecha_creacion DESC
      `
    );

    res.json({
      success: true,
      prenominas: result.rows
    });

  } catch (error) {

    console.error('Error obteniendo prenóminas:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Aprobar prenómina sin generar egreso automático
app.put('/api/prenomina/:id/aprobar', async (req, res) => {
  const client = await pool.connect();

  try {
    const prenominaId = Number(req.params.id);
    const { usuario_aprueba_id, comentario } = req.body;

    if (!Number.isInteger(prenominaId) || prenominaId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El id de la prenómina no es válido.",
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
        UPDATE prenomina
        SET
          estatus = 'APROBADA',
          usuario_aprueba_id = $1,
          fecha_aprobacion = NOW(),
          comentarios = COALESCE($2, comentarios)
        WHERE id = $3
          AND estatus = 'PENDIENTE'
        RETURNING *;
      `,
      [
        usuario_aprueba_id || null,
        comentario || null,
        prenominaId,
      ]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        error:
          "La prenómina no existe o ya fue aprobada/rechazada.",
      });
    }

    const prenomina = result.rows[0];

    await client.query(
      `
        INSERT INTO prenomina_logs (
          prenomina_id,
          accion,
          usuario_id,
          comentario,
          created_at
        )
        VALUES ($1, 'APROBADA', $2, $3, NOW());
      `,
      [
        prenominaId,
        usuario_aprueba_id || null,
        comentario || "Prenómina aprobada desde BOSSE",
      ]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message:
        "Prenómina aprobada. No se generó ningún egreso automático.",
      prenomina,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error aprobando prenómina:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// Rechazar prenómina
app.put('/api/prenomina/:id/rechazar', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { usuario_aprueba_id, comentario } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `
      UPDATE prenomina
      SET
        estatus = 'RECHAZADA',
        usuario_aprueba_id = $1,
        fecha_aprobacion = NOW(),
        comentarios = $2
      WHERE id = $3
      RETURNING *
      `,
      [usuario_aprueba_id || null, comentario || null, id]
    );

    await client.query(
      `
      INSERT INTO prenomina_logs (
        prenomina_id,
        accion,
        usuario_id,
        comentario,
        created_at
      )
      VALUES ($1, 'RECHAZADA', $2, $3, NOW())
      `,
      [id, usuario_aprueba_id || null, comentario || 'Prenómina rechazada']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      prenomina: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');

    res.status(500).json({
      success: false,
      error: error.message
    });

  } finally {
    client.release();
  }
});

// Análisis financiero

app.get('/api/analisis-financiero', async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const fechaInicio = fecha_inicio || primerDiaMes;
    const fechaFin = fecha_fin || hoy.toISOString().split("T")[0];

    const ingresosResult = await pool.query(
      `
      SELECT
  COALESCE(SUM(total_general + total_cover), 0) AS total_ingresos,
  COALESCE(SUM(total_general), 0) AS total_general_sin_cover,
  COALESCE(SUM(total_cover), 0) AS total_cover,
  COALESCE(SUM(total_tarjetas), 0) AS total_tarjetas,
  COALESCE(SUM(total_vales), 0) AS total_vales,
  COALESCE(SUM(gastos_corte), 0) AS total_gastos_corte,
  COALESCE(SUM(reglamentos), 0) AS total_reglamentos,
  COALESCE(SUM(total_cxc), 0) AS total_cxc,
  COALESCE(SUM(total_efectivo_mxn), 0) AS total_efectivo_mxn,
  COALESCE(SUM(total_efectivo_usd * tipo_cambio), 0) AS total_efectivo_usd_mxn,
  COALESCE(SUM(venta_ticket), 0) AS total_venta_ticket,
  COALESCE(SUM(diferencia), 0) AS total_diferencia
FROM corte_caja
WHERE fecha BETWEEN $1 AND $2
      `,
      [fechaInicio, fechaFin]
    );

    const egresosResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(e.monto_mxn), 0) AS total_egresos,
        COALESCE(SUM(
          CASE
            WHEN LOWER(COALESCE(c.nombre, '')) = LOWER('Nómina')
              OR e.referencia LIKE 'PRENOMINA-%'
            THEN e.monto_mxn
            ELSE 0
          END
        ), 0) AS total_nomina,
        COALESCE(SUM(
          CASE
            WHEN LOWER(COALESCE(c.nombre, '')) = LOWER('Nómina')
              OR e.referencia LIKE 'PRENOMINA-%'
            THEN 0
            ELSE e.monto_mxn
          END
        ), 0) AS total_egresos_operativos
      FROM egresos e
      LEFT JOIN categorias c
        ON c.id = e.categoria_id
      WHERE e.fecha BETWEEN $1 AND $2
        AND COALESCE(e.estatus, 'REGISTRADO') <> 'CANCELADO'
      `,
      [fechaInicio, fechaFin]
    );

    const categoriasResult = await pool.query(
      `
      SELECT
        COALESCE(c.nombre, 'Sin categoría') AS categoria,
        COALESCE(SUM(e.monto_mxn), 0) AS total
      FROM egresos e
      LEFT JOIN categorias c
        ON c.id = e.categoria_id
      WHERE e.fecha BETWEEN $1 AND $2
        AND COALESCE(e.estatus, 'REGISTRADO') <> 'CANCELADO'
      GROUP BY COALESCE(c.nombre, 'Sin categoría')
      ORDER BY total DESC
      `,
      [fechaInicio, fechaFin]
    );

    const tipoEgresoResult = await pool.query(
      `
      SELECT
        COALESCE(tipo_egreso, 'Sin tipo') AS tipo_egreso,
        COALESCE(SUM(monto_mxn), 0) AS total
      FROM egresos
      WHERE fecha BETWEEN $1 AND $2
        AND COALESCE(estatus, 'REGISTRADO') <> 'CANCELADO'
      GROUP BY COALESCE(tipo_egreso, 'Sin tipo')
      ORDER BY total DESC
      `,
      [fechaInicio, fechaFin]
    );

    const movimientosSociosResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(
          CASE
            WHEN COALESCE(tipo_movimiento, 'Adelanto') = 'Adelanto'
            THEN monto
            ELSE 0
          END
        ), 0) AS total_adelantos_socios,

        COALESCE(SUM(
          CASE
            WHEN tipo_movimiento = 'Devolución'
            THEN monto
            ELSE 0
          END
        ), 0) AS total_devoluciones_socios
      FROM inversiones_socios
      WHERE fecha BETWEEN $1 AND $2
      `,
      [fechaInicio, fechaFin]
    );

    const inversionesSociosResult = await pool.query(
      `
      SELECT
        i.socio_id,
        COALESCE(s.nombre, 'Sin socio') AS socio,

        COALESCE(SUM(
          CASE
            WHEN COALESCE(i.tipo_movimiento, 'Adelanto') = 'Adelanto'
            THEN i.monto
            ELSE 0
          END
        ), 0) AS total_adelantos,

        COALESCE(SUM(
          CASE
            WHEN i.tipo_movimiento = 'Devolución'
            THEN i.monto
            ELSE 0
          END
        ), 0) AS total_devoluciones,

        COALESCE(SUM(
          CASE
            WHEN i.tipo_movimiento = 'Devolución'
            THEN -i.monto
            ELSE i.monto
          END
        ), 0) AS saldo_adelantos,

        COALESCE(SUM(
          CASE
            WHEN i.tipo_movimiento = 'Devolución'
            THEN -i.monto
            ELSE i.monto
          END
        ), 0) AS total

      FROM inversiones_socios i
      LEFT JOIN socios s
        ON s.id = i.socio_id
      WHERE i.fecha BETWEEN $1 AND $2
      GROUP BY
        i.socio_id,
        COALESCE(s.nombre, 'Sin socio')
      ORDER BY saldo_adelantos DESC
      `,
      [fechaInicio, fechaFin]
    );

    const sociosDistribucionResult = await pool.query(
      `
      SELECT
        s.id,
        s.nombre AS socio,
        COALESCE(s.porcentaje_participacion, 0) AS porcentaje_participacion,

        COALESCE(mov.adelantos, 0) AS adelantos,
        COALESCE(mov.devoluciones, 0) AS devoluciones

      FROM socios s

      LEFT JOIN (
        SELECT
          socio_id,

          SUM(
            CASE
              WHEN COALESCE(tipo_movimiento, 'Adelanto') = 'Adelanto'
              THEN monto
              ELSE 0
            END
          ) AS adelantos,

          SUM(
            CASE
              WHEN tipo_movimiento = 'Devolución'
              THEN monto
              ELSE 0
            END
          ) AS devoluciones

        FROM inversiones_socios
        WHERE fecha BETWEEN $1 AND $2
        GROUP BY socio_id
      ) mov
        ON mov.socio_id = s.id

      WHERE s.activo = true

      ORDER BY s.nombre ASC
      `,
      [fechaInicio, fechaFin]
    );

    const ingresos = ingresosResult.rows[0];
    const egresos = egresosResult.rows[0];
    const movimientosSocios = movimientosSociosResult.rows[0];

    const totalIngresos = Number(ingresos.total_ingresos) || 0;
    const totalEgresos = Number(egresos.total_egresos) || 0;

    const totalAdelantosSocios =
      Number(movimientosSocios.total_adelantos_socios) || 0;

    const totalDevolucionesSocios =
      Number(movimientosSocios.total_devoluciones_socios) || 0;

    const saldoAdelantosSocios =
      totalAdelantosSocios - totalDevolucionesSocios;

    const utilidadOperativa = totalIngresos - totalEgresos;

    const flujoConAdelantos =
      utilidadOperativa - saldoAdelantosSocios;

    const porcentajeEgresos =
      totalIngresos > 0 ? (totalEgresos / totalIngresos) * 100 : 0;

    const margenGanancia =
      totalIngresos > 0 ? (utilidadOperativa / totalIngresos) * 100 : 0;

    const porcentajeNominaSobreEgresos =
      totalEgresos > 0
        ? ((Number(egresos.total_nomina) || 0) / totalEgresos) * 100
        : 0;

    const porcentajeEgresosOperativosSobreEgresos =
      totalEgresos > 0
        ? ((Number(egresos.total_egresos_operativos) || 0) / totalEgresos) * 100
        : 0;

    const distribucionSocios = sociosDistribucionResult.rows.map((socio) => {
      const porcentaje = Number(socio.porcentaje_participacion) || 0;
      const utilidadAsignada = utilidadOperativa * (porcentaje / 100);

      const adelantos = Number(socio.adelantos) || 0;
      const devoluciones = Number(socio.devoluciones) || 0;
      const saldoAdelantos = adelantos - devoluciones;

      return {
        socio: socio.socio,
        porcentaje_participacion: porcentaje,
        utilidad_asignada: utilidadAsignada,

        adelantos,
        devoluciones,
        saldo_adelantos: saldoAdelantos,

        // Temporal por compatibilidad
        inversion_aportada: saldoAdelantos,

        result_neto: utilidadAsignada - saldoAdelantos
      };
    });

    res.json({
      success: true,
      filtros: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      },
      resumen: {
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos,
        total_nomina: Number(egresos.total_nomina) || 0,
        total_egresos_operativos:
          Number(egresos.total_egresos_operativos) || 0,

        total_adelantos_socios: totalAdelantosSocios,
        total_devoluciones_socios: totalDevolucionesSocios,
        saldo_adelantos_socios: saldoAdelantosSocios,

        // Temporal por compatibilidad
        total_inversiones_socios: saldoAdelantosSocios,

        utilidad_operativa: utilidadOperativa,

        flujo_con_adelantos: flujoConAdelantos,

        // Temporal por compatibilidad
        flujo_con_inversiones: flujoConAdelantos,

        porcentaje_egresos: porcentajeEgresos,
        margen_ganancia: margenGanancia,
        porcentaje_nomina_sobre_egresos: porcentajeNominaSobreEgresos,
        porcentaje_egresos_operativos_sobre_egresos:
          porcentajeEgresosOperativosSobreEgresos
      },
      ingresos: {
        total_cover: Number(ingresos.total_cover) || 0,
        total_tarjetas: Number(ingresos.total_tarjetas) || 0,
        total_vales: Number(ingresos.total_vales) || 0,
        total_cxc: Number(ingresos.total_cxc) || 0,
        total_efectivo_mxn: Number(ingresos.total_efectivo_mxn) || 0,
        total_efectivo_usd_mxn:
          Number(ingresos.total_efectivo_usd_mxn) || 0,
        total_venta_ticket: Number(ingresos.total_venta_ticket) || 0,
        total_diferencia: Number(ingresos.total_diferencia) || 0
      },
      egresos_por_categoria: categoriasResult.rows,
      egresos_por_tipo: tipoEgresoResult.rows,
      inversiones_por_socio: inversionesSociosResult.rows,
      distribucion_socios: distribucionSocios
    });

  } catch (error) {
    console.error('Error análisis financiero:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener historial de prenóminas
app.get('/api/prenomina', async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
        p.*,
        uc.nombre AS usuario_crea,
        ua.nombre AS usuario_aprueba
      FROM prenomina p

      LEFT JOIN usuarios uc
        ON uc.id = p.usuario_crea_id

      LEFT JOIN usuarios ua
        ON ua.id = p.usuario_aprueba_id

      ORDER BY p.fecha_creacion DESC
      `
    );

    res.json({
      success: true,
      prenominas: result.rows
    });

  } catch (error) {

    console.error('Error historial prenómina:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Consultar cortes de caja por negocio
app.get("/api/cortes", async (req, res) => {
  try {
    const {
      negocio_id,
      fecha_inicio,
      fecha_fin,
      folio,
    } = req.query;

    const negocioId = Number(negocio_id);

    if (!Number.isInteger(negocioId) || negocioId <= 0) {
      return res.status(400).json({
        success: false,
        error: "El negocio_id no es válido.",
      });
    }

    const condiciones = ["cc.negocio_id = $1"];
    const valores = [negocioId];

    if (fecha_inicio) {
      valores.push(fecha_inicio);
      condiciones.push(
        `cc.fecha::date >= $${valores.length}::date`
      );
    }

    if (fecha_fin) {
      valores.push(fecha_fin);
      condiciones.push(
        `cc.fecha::date <= $${valores.length}::date`
      );
    }

    if (folio && String(folio).trim()) {
      valores.push(`%${String(folio).trim()}%`);
      condiciones.push(
        `cc.folio ILIKE $${valores.length}`
      );
    }

    const result = await pool.query(
      `
        SELECT
          cc.id,
          cc.fecha,
          cc.folio,
          cc.usuario_id,
          cc.negocio_id,
          cc.tipo_cambio,
          cc.total_tarjetas,
          cc.total_efectivo_mxn,
          cc.total_efectivo_usd,
          cc.total_general,
          cc.cover_tpv,
          cc.cover_efectivo,
          cc.cover_usd,
          cc.total_cover,
          cc.venta_ticket,
          cc.diferencia,
          cc.total_vales,
          cc.gastos_corte,
          cc.reglamentos,
          cc.total_cxc,
          cc.responsable_iniciales,
          cc.drive_folder_id,
          cc.drive_folder_url,
          cc.created_at,
          cc.updated_at,
          cc.updated_by,
          u.nombre AS usuario_nombre
        FROM corte_caja cc
        LEFT JOIN usuarios u
          ON u.id = cc.usuario_id
        WHERE ${condiciones.join(" AND ")}
        ORDER BY cc.fecha DESC, cc.id DESC;
      `,
      valores
    );

    return res.json({
      success: true,
      cortes: result.rows,
    });
  } catch (error) {
    console.error("Error consultando cortes:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "No fue posible consultar los cortes.",
    });
  }
});

// Consultar el detalle de un corte de caja
app.get("/api/cortes/:id", async (req, res) => {
  const corteId = Number(req.params.id);

  if (!Number.isInteger(corteId) || corteId <= 0) {
    return res.status(400).json({
      success: false,
      error: "El id del corte no es válido.",
    });
  }

  try {
    const corteResult = await pool.query(
      `
        SELECT
          cc.*,
          u.nombre AS usuario_nombre
        FROM corte_caja cc
        LEFT JOIN usuarios u
          ON u.id = cc.usuario_id
        WHERE cc.id = $1
        LIMIT 1;
      `,
      [corteId]
    );

    if (corteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No se encontró el corte.",
      });
    }

    const corte = corteResult.rows[0];

    const [
      denominacionesResult,
      valesResult,
      cxcResult,
      egresosResult,
    ] = await Promise.all([
      pool.query(
        `
          SELECT
            cd.id,
            cd.corte_id,
            cd.denominacion_id,
            cd.cantidad,
            cd.tipo_ingreso,
            cd.concepto,
            cd.monto_original,
            cd.monto_mxn,
            d.moneda,
            d.valor
          FROM corte_denominaciones cd
          LEFT JOIN denominaciones d
            ON d.id = cd.denominacion_id
          WHERE cd.corte_id = $1
          ORDER BY cd.tipo_ingreso, d.moneda, d.valor DESC;
        `,
        [corteId]
      ),

      pool.query(
        `
          SELECT *
          FROM corte_vales
          WHERE corte_id = $1
          ORDER BY id ASC;
        `,
        [corteId]
      ),

      pool.query(
        `
          SELECT *
          FROM cuentas_por_cobrar
          WHERE corte_id = $1
          ORDER BY id ASC;
        `,
        [corteId]
      ),

      /*
       * Gastos de corte y Reglamentos se guardan como egresos.
       * Se localizan mediante la referencia generada desde el corte.
       */
      pool.query(
        `
          SELECT
            e.*,
            c.nombre AS categoria_nombre,
            p.nombre AS proveedor_nombre
          FROM egresos e
          LEFT JOIN categorias c
            ON c.id = e.categoria_id
          LEFT JOIN proveedores p
            ON p.id = e.proveedor_id
          WHERE e.negocio_id = $1
            AND e.referencia LIKE $2
          ORDER BY e.id ASC;
        `,
        [
          corte.negocio_id,
          `CORTE-${corte.folio}-%`,
        ]
      ),
    ]);

    const egresosCorte = egresosResult.rows;

    const gastosCorte = egresosCorte.filter((egreso) =>
      String(egreso.referencia || "").includes("-GASTO-")
    );

    const reglamentos = egresosCorte.filter((egreso) =>
      String(egreso.referencia || "").includes(
        "-REGLAMENTO-"
      )
    );

    return res.json({
      success: true,
      corte: {
        ...corte,
        denominaciones: denominacionesResult.rows,
        vales: valesResult.rows,
        cxc: cxcResult.rows,
        gastos_corte_detalle: gastosCorte,
        reglamentos_detalle: reglamentos,
      },
    });
  } catch (error) {
    console.error(
      "Error consultando detalle del corte:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "No fue posible consultar el detalle del corte.",
    });
  }
});

// Encender servidor
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Sistema BOSSE listo en puerto ${PORT}`);
    console.log(`📅 ${new Date().toLocaleString()}`);
});