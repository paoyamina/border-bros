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

// Guardar Reporte y subir a Drive
app.post('/api/guardar-reporte', upload.array('fotos'), async (req, res) => {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    if (!driveService) {
        return res.status(500).json({ error: "Drive aún no está listo, intenta de nuevo" });
    }

    try {
        const { nombreCarpeta, usuario } = req.body;
        const fotos = req.files;

        if (!fotos || fotos.length === 0) {
    console.log("No se recibieron fotos, pero se procesará la carpeta.");
}

        console.log(`📂 Procesando reporte de: ${usuario}`);
        console.log(`📁 Carpeta: ${nombreCarpeta}`);

        // 1. Crear carpeta en Drive
const folderId = await crearCarpetaEnDrive(nombreCarpeta);

        // 2. Subir archivos SOLO si existen
if (fotos && fotos.length > 0) {
    for (const foto of fotos) {
        await subirArchivoADrive(foto.path, foto.originalname, foto.mimetype, folderId);
    }
}

        res.json({
  success: true,
  message: "¡Reporte enviado exitosamente a Drive!",
  folderId,
  folderUrl: `https://drive.google.com/drive/folders/${folderId}`
});
    } catch (error) {
        console.error("❌ Error en el servidor:", error);
        res.status(500).json({ success: false, error: error.message });
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
        activo,
        created_at,
        created_by
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6,
        true,
        NOW(),
        $7
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
        updated_at = NOW(),
        updated_by = $7
      WHERE id = $8
      RETURNING *
      `,
      [
        nombre,
        puesto || null,
        fecha_ingreso || null,
        cuenta_bancaria || null,
        sueldo_diario || 0,
        sueldo_base || 0,
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
          nota
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          prenomina.id,
          fila.empleado_id,
          fila.dias || 0,
          fila.costo_unitario || 0,
          fila.prima || 0,
          fila.descuento || 0,
          fila.total || 0,
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
      RETURNING *
      `,
      [usuario_aprueba_id || null, id]
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
      VALUES ($1, 'APROBADA', $2, $3, NOW())
      `,
      [id, usuario_aprueba_id || null, comentario || 'Prenómina aprobada']
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