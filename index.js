const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a la base de datos SQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('🚀 El sistema de Pao está vivo y funcionando');
});

// Ruta para traer los campos del formulario "Corte de Caja Pro"
app.get('/api/campos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campos WHERE formulario_id = 1 ORDER BY orden ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error conectando a la base de datos" });
  }
});

const PORT = process.env.PORT || 3000;
// RUTA DE DIAGNÓSTICO
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ mensaje: "✅ Conexión Exitosa", hora_db: result.rows[0] });
  } catch (err) {
    res.status(500).json({ 
        error: "❌ Error de conexión", 
        detalle: err.message, 
        codigo: err.code 
    });
  }
});
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});