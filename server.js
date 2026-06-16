const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const multer = require('multer'); 
const fs = require('fs');

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
  const { idCajero, password } = req.body;

  if (!idCajero || !password) {
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
        u.nombre,
        u.email,
        r.nombre AS rol
      FROM usuarios u
      LEFT JOIN roles r ON r.id = u.rol_id
      WHERE u.id = $1
      AND u.password_hash = $2
      AND u.activo = true
      `,
      [idCajero, password]
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
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    });

  } catch (err) {
    console.error('Error DB:', err);

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
            total_cxc,
            responsable_iniciales,
            drive_folder_id,
            drive_folder_url,
            created_at,
            updated_at,
            updated_by
          )
          VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20,
            $21, NOW(), NOW(), $22
          )
          RETURNING *
          `,
          [
            detalles.fecha || null,
            detalles.folio || nombreCarpeta || null,
            usuarioId,
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
            toNumber(detalles.totalCxC),
            detalles.responsable || null,
            folderId,
            folderUrl,
            usuarioId
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

    const result = await pool.query(
      `
      INSERT INTO egresos (
        tipo_egreso,
        fecha,
        divisa,
        tipo_cambio,
        monto_original,
        monto_mxn,
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
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
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
        categoria_id || null,
        proveedor_id || null,
        concepto,
        cuenta_id || null,
        referencia || null,
        usuario_crea_id || null,
        drive_folder_id || null,
        drive_folder_url || null,
        estatus || 'REGISTRADO'
      ]
    );

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
    const { nombre, usuario_id } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del proveedor es obligatorio'
      });
    }

    const nombreLimpio = nombre.trim();

    const existente = await pool.query(
      `
      SELECT id, nombre
      FROM proveedores
      WHERE LOWER(nombre) = LOWER($1)
      LIMIT 1
      `,
      [nombreLimpio]
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
      INSERT INTO proveedores (nombre, created_by, activo)
      VALUES ($1, $2, true)
      RETURNING id, nombre
      `,
      [nombreLimpio, usuario_id || null]
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
    const result = await pool.query(
      `
      SELECT id, nombre
      FROM proveedores
      WHERE activo = true OR activo IS NULL
      ORDER BY nombre ASC
      `
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

      const nombreCarpeta = `INVERSION_SOCIO_${fecha}_${socio.nombre}`;
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
        metodo_pago,
        cuenta_origen,
        monto,
        comentario,
        comprobante_url,
        usuario_crea_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
      `,
      [
        socio_id,
        fecha,
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
    const result = await pool.query(
      `
      SELECT id, nombre
      FROM categorias
      ORDER BY nombre ASC
      `
    );

    res.json({
      success: true,
      categorias: result.rows
    });

  } catch (error) {
    console.error('Error cargando categorias:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/categorias/buscar-o-crear', async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la categoría es obligatorio'
      });
    }

    const nombreLimpio = nombre.trim();

    const existente = await pool.query(
      `
      SELECT id, nombre
      FROM categorias
      WHERE LOWER(nombre) = LOWER($1)
      LIMIT 1
      `,
      [nombreLimpio]
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
      INSERT INTO categorias (nombre)
      VALUES ($1)
      RETURNING id, nombre
      `,
      [nombreLimpio]
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

// Obtener empleados
app.get('/api/empleados', async (req, res) => {

  try {

    const { activos } = req.query;

    let query = `
      SELECT *
      FROM empleados
    `;

    if (activos === 'true') {
      query += ` WHERE activo = true `;
    }

    if (activos === 'false') {
      query += ` WHERE activo = false `;
    }

    query += ` ORDER BY nombre ASC `;

    const result = await pool.query(query);

    res.json({
      success: true,
      empleados: result.rows
    });

  } catch (error) {

    console.error('Error empleados:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crear empleado
app.post('/api/empleados', async (req, res) => {

  try {

    const {
  nombre,
  puesto,
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
  $1, $2, $3, $4,
  $5, $6, $7, $8,
  true,
  NOW(),
  $9
)
      RETURNING *
      `,
      [
  nombre,
  puesto || null,
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
  puesto,
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
  puesto = $2,
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
  puesto || null,
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
        fecha_creacion
      )
      VALUES ($1, $2, $3, 'PENDIENTE', $4, $5, $6, NOW())
      RETURNING *
      `,
      [
        fecha_inicio || null,
        fecha_fin || null,
        total || 0,
        usuario_crea_id || null,
        comentarios_extraordinarios || null,
        comentarios || null
      ]
    );

    const prenomina = prenominaResult.rows[0];

    for (const fila of detalle) {
      await client.query(
        `
        INSERT INTO prenomina_detalle (
          prenomina_id,
          empleado_id,
          dias,
          costo_unitario,
          prima,
          descuento,
          total,
          tipo_nomina,
          metodo_pago_nomina,
          comentario_pago,
          nota
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          prenomina.id,
          fila.empleado_id,
          fila.dias || 0,
          fila.costo_unitario || 0,
          fila.prima || 0,
          fila.descuento || 0,
          fila.total || 0,
          fila.tipo_nomina || "Operativa",
          fila.metodo_pago_nomina || "Efectivo",
          fila.comentario_pago || null,
          fila.nota || null
        ]
      );
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

// Obtener detalle de una prenómina
app.get('/api/prenomina/:id/detalle', async (req, res) => {
  try {
    const { id } = req.params;

    const prenominaResult = await pool.query(
      `
      SELECT
        p.*,
        u.nombre AS usuario_crea
      FROM prenomina p
      LEFT JOIN usuarios u
        ON u.id = p.usuario_crea_id
      WHERE p.id = $1
      `,
      [id]
    );

    if (prenominaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Prenómina no encontrada"
      });
    }

    const detalleResult = await pool.query(
      `
      SELECT
        pd.*,
        e.nombre AS empleado,
        e.puesto
      FROM prenomina_detalle pd
      LEFT JOIN empleados e
        ON e.id = pd.empleado_id
      WHERE pd.prenomina_id = $1
      ORDER BY e.nombre ASC
      `,
      [id]
    );

    res.json({
      success: true,
      prenomina: prenominaResult.rows[0],
      detalle: detalleResult.rows
    });

  } catch (error) {
    console.error("Error detalle prenómina:", error);

    res.status(500).json({
      success: false,
      error: error.message
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

// Aprobar prenómina
app.put('/api/prenomina/:id/aprobar', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { usuario_aprueba_id, comentario } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `
      UPDATE prenomina
      SET
        estatus = 'APROBADA',
        usuario_aprueba_id = $1,
        fecha_aprobacion = NOW()
      WHERE id = $2
        AND estatus = 'PENDIENTE'
      RETURNING *
      `,
      [usuario_aprueba_id || null, id]
    );

    if (result.rows.length === 0) {
      throw new Error('La prenómina no existe o ya fue procesada.');
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
      VALUES ($1, 'APROBADA', $2, $3, NOW())
      `,
      [id, usuario_aprueba_id || null, comentario || 'Prenómina aprobada']
    );

    const categoriaResult = await client.query(
    `
    SELECT id
    FROM categorias
    WHERE LOWER(REPLACE(TRIM(nombre), 'ó', 'o')) IN ('nomina', 'nominas')
    ORDER BY id
    LIMIT 1
    `
  );

    const categoriaId =
      categoriaResult.rows.length > 0 ? categoriaResult.rows[0].id : null;

    const proveedorResult = await client.query(
      `
      SELECT id
      FROM proveedores
      WHERE LOWER(nombre) = LOWER('Nómina Boca Negra')
      LIMIT 1
      `
    );

    const proveedorId =
      proveedorResult.rows.length > 0 ? proveedorResult.rows[0].id : null;

    const resumenResult = await client.query(
      `
      SELECT
        COALESCE(tipo_nomina, 'Operativa') AS tipo_nomina,
        COALESCE(metodo_pago_nomina, 'Efectivo') AS metodo_pago_nomina,
        SUM(total) AS total
      FROM prenomina_detalle
      WHERE prenomina_id = $1
      GROUP BY
        COALESCE(tipo_nomina, 'Operativa'),
        COALESCE(metodo_pago_nomina, 'Efectivo')
      `,
      [id]
    );

    for (const grupo of resumenResult.rows) {
      const totalGrupo = Number(grupo.total) || 0;

      if (totalGrupo <= 0) continue;

      const tipoEgreso =
        grupo.metodo_pago_nomina === 'Banco' ? 'banco' : 'efectivo';

      const referencia = `PRENOMINA-${id}-${grupo.tipo_nomina}-${grupo.metodo_pago_nomina}`;

      const egresoExistente = await client.query(
        `
        SELECT id
        FROM egresos
        WHERE referencia = $1
        LIMIT 1
        `,
        [referencia]
      );

      if (egresoExistente.rows.length > 0) continue;

      await client.query(
        `
        INSERT INTO egresos (
          tipo_egreso,
          fecha,
          divisa,
          tipo_cambio,
          monto_original,
          monto_mxn,
          categoria_id,
          proveedor_id,
          concepto,
          cuenta_id,
          referencia,
          usuario_crea_id,
          estatus
        )
        VALUES (
          $1, CURRENT_DATE, 'MXN', 1,
          $2, $3,
          $4, $5, $6,
          NULL,
          $7,
          $8,
          'REGISTRADO'
        )
        `,
        [
          tipoEgreso,
          totalGrupo,
          totalGrupo,
          categoriaId,
          proveedorId,
          `Nómina aprobada #${id} - ${grupo.tipo_nomina} / ${grupo.metodo_pago_nomina}`,
          referencia,
          usuario_aprueba_id || null
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      prenomina
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error aprobando prenómina:', error);

    res.status(500).json({
      success: false,
      error: error.message
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
        COALESCE(SUM(total_general), 0) AS total_ingresos,
        COALESCE(SUM(total_cover), 0) AS total_cover,
        COALESCE(SUM(total_tarjetas), 0) AS total_tarjetas,
        COALESCE(SUM(total_vales), 0) AS total_vales,
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

    const inversionesResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(monto), 0) AS total_inversiones_socios
      FROM inversiones_socios
      WHERE fecha BETWEEN $1 AND $2
      `,
      [fechaInicio, fechaFin]
    );

    const inversionesSociosResult = await pool.query(
      `
      SELECT
        s.nombre AS socio,
        COALESCE(SUM(i.monto), 0) AS total
      FROM inversiones_socios i
      LEFT JOIN socios s
        ON s.id = i.socio_id
      WHERE i.fecha BETWEEN $1 AND $2
      GROUP BY s.nombre
      ORDER BY total DESC
      `,
      [fechaInicio, fechaFin]
    );

    const ingresos = ingresosResult.rows[0];
    const egresos = egresosResult.rows[0];
    const inversiones = inversionesResult.rows[0];

    const totalIngresos = Number(ingresos.total_ingresos) || 0;
    const totalEgresos = Number(egresos.total_egresos) || 0;
    const totalInversionesSocios =
      Number(inversiones.total_inversiones_socios) || 0;

    const utilidadOperativa = totalIngresos - totalEgresos;
    const flujoConInversiones = utilidadOperativa + totalInversionesSocios;

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
        total_inversiones_socios: totalInversionesSocios,
        utilidad_operativa: utilidadOperativa,
        flujo_con_inversiones: flujoConInversiones
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
      inversiones_por_socio: inversionesSociosResult.rows
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

// Encender servidor
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Sistema BOSSE listo en puerto ${PORT}`);
    console.log(`📅 ${new Date().toLocaleString()}`);
});