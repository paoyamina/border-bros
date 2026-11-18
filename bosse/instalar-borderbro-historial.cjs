'use strict';
// Migración voluntaria: añadir tablas de historial. No modifica las tablas financieras.
const fs=require('fs');
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env')});
const {Pool}=require('pg');
const sql=fs.readFileSync(path.join(__dirname,'migrations','20261116_borderbro_conversaciones.sql'),'utf8');
if(!process.env.DATABASE_URL){console.error('DATABASE_URL no configurada en el entorno del backend.');process.exit(2);}
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
(async()=>{
  try{
    await pool.query(sql);
    const check=await pool.query("SELECT to_regclass('public.borderbro_conversaciones_bosse') IS NOT NULL AS ok");
    if(!check.rows[0]?.ok)throw new Error('La tabla de conversaciones no quedó disponible.');
    console.log('Migración de historial BorderBro aplicada correctamente.');
  }catch(e){console.error('No se pudo migrar BorderBro:',e.message);process.exitCode=1;}
  finally{await pool.end();}
})();
