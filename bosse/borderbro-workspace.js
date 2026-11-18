'use strict';
// BOSSE / BorderBro: conversaciones privadas, identificadas por sesión autenticada.
const crypto = require('crypto');
const VALID_UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const MAX_CONTEXT = 4000;
const trim = (v, max) => String(v || '').trim().slice(0, max);
const guard = req => ({ usuario: Number(req.catalogUser.id), negocio: Number(req.catalogUser.negocio) });
const goodDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d||'')) ? d : null;
const safeEvidence = e => {
  if(!Array.isArray(e))return [];
  const json = JSON.stringify(e.slice(0,12));
  if(json.length > 120000) return [{ tipo: 'aviso', detalle: 'La evidencia extensa se consulta desde BOSSE.' }];
  return e.slice(0,12);
};
module.exports = ({app, pool}) => {
  const lookup = async (id, req) => {
    if(!VALID_UUID.test(String(id||''))) return null;
    const {usuario,negocio}=guard(req);
    const {rows} = await pool.query('SELECT id,titulo,contexto_adicional,creada_en,actualizada_en FROM borderbro_conversaciones_bosse WHERE id=$1 AND negocio_id=$2 AND usuario_id=$3 LIMIT 1',[id,negocio,usuario]);
    return rows[0] || null;
  };
  async function create(req, title, context='') {
    const {usuario,negocio}=guard(req);
    const id=crypto.randomUUID();
    const {rows}=await pool.query('INSERT INTO borderbro_conversaciones_bosse(id,negocio_id,usuario_id,titulo,contexto_adicional) VALUES($1,$2,$3,$4,$5) RETURNING id,titulo,contexto_adicional,creada_en,actualizada_en',
      [id,negocio,usuario,trim(title,140)||'Nueva conversación',trim(context,MAX_CONTEXT)]);
    return rows[0];
  }
  const fail = (res,err) => {console.error('BorderBro workspace:',err.message);return res.status(500).json({success:false,error:'No fue posible consultar el historial de BorderBro. Verifica la migración de base de datos.'});};

  app.get('/api/borderbro/conversaciones', async(req,res)=>{
    try {
      const {usuario,negocio}=guard(req);
      const {rows}=await pool.query(`SELECT c.id,c.titulo,c.creada_en,c.actualizada_en,
        EXISTS(SELECT 1 FROM borderbro_mensajes_bosse m WHERE m.conversacion_id=c.id) AS tiene_mensajes
        FROM borderbro_conversaciones_bosse c WHERE c.negocio_id=$1 AND c.usuario_id=$2
        ORDER BY c.actualizada_en DESC LIMIT 80`,[negocio,usuario]);
      return res.json({success:true,conversaciones:rows});
    } catch(err){return fail(res,err);}
  });
  app.post('/api/borderbro/conversaciones', async(req,res)=>{
    try{const row=await create(req,req.body?.titulo,req.body?.contexto_adicional);return res.status(201).json({success:true,conversacion:row});}
    catch(err){return fail(res,err);}
  });
  app.get('/api/borderbro/conversaciones/:id', async(req,res)=>{
    try {
      const c=await lookup(req.params.id,req);
      if(!c)return res.status(404).json({success:false,error:'Conversación no encontrada.'});
      const {usuario,negocio}=guard(req);
      const {rows}=await pool.query(`SELECT rol,texto,fecha_inicio::text,fecha_fin::text,evidencia,creada_en
        FROM borderbro_mensajes_bosse WHERE conversacion_id=$1 AND negocio_id=$2 AND usuario_id=$3 ORDER BY id ASC LIMIT 300`,
        [c.id,negocio,usuario]);
      return res.json({success:true,conversacion:c,mensajes:rows});
    }catch(err){return fail(res,err);}
  });
  app.patch('/api/borderbro/conversaciones/:id', async(req,res)=>{
    const title=req.body?.titulo, context=req.body?.contexto_adicional;
    if(title===undefined&&context===undefined)return res.status(400).json({success:false,error:'Indica el campo que deseas actualizar.'});
    if(title!==undefined&&(!trim(title,141)||String(title).length>140))return res.status(400).json({success:false,error:'El título no puede exceder 140 caracteres.'});
    if(context!==undefined&&String(context).length>MAX_CONTEXT)return res.status(400).json({success:false,error:'La información adicional no puede exceder 4000 caracteres.'});
    try{
      const c=await lookup(req.params.id,req);if(!c)return res.status(404).json({success:false,error:'Conversación no encontrada.'});
      const {usuario,negocio}=guard(req);
      const {rows}=await pool.query(`UPDATE borderbro_conversaciones_bosse SET titulo=COALESCE($4,titulo),
        contexto_adicional=COALESCE($5,contexto_adicional),actualizada_en=NOW()
        WHERE id=$1 AND negocio_id=$2 AND usuario_id=$3 RETURNING id,titulo,contexto_adicional,actualizada_en`,
        [c.id,negocio,usuario,title===undefined?null:trim(title,140),context===undefined?null:String(context).trim()]);
      return res.json({success:true,conversacion:rows[0]});
    }catch(err){return fail(res,err);}
  });
  app.delete('/api/borderbro/conversaciones/:id', async(req,res)=>{
    try{
      const {usuario,negocio}=guard(req);
      const {rowCount}=await pool.query('DELETE FROM borderbro_conversaciones_bosse WHERE id=$1 AND negocio_id=$2 AND usuario_id=$3',
        [VALID_UUID.test(req.params.id)?req.params.id:crypto.randomUUID(),negocio,usuario]);
      if(!rowCount)return res.status(404).json({success:false,error:'Conversación no encontrada.'});
      return res.json({success:true});
    }catch(err){return fail(res,err);}
  });
  // Inicializar historial con la conversación que estaba abierta antes de activar esta función.
  app.post('/api/borderbro/conversaciones/importar', async(req,res)=>{
    const entries=Array.isArray(req.body?.mensajes)?req.body.mensajes:[];
    if(!entries.length||entries.length>80)return res.status(400).json({success:false,error:'Elige una conversación de máximo 80 mensajes.'});
    if(entries.some(m=>!['user','assistant'].includes(m?.rol)||!String(m?.texto||'').trim()||String(m.texto).length>24000))
      return res.status(400).json({success:false,error:'Los mensajes no tienen un formato válido.'});
    const client=await pool.connect();
    try{
      const {usuario,negocio}=guard(req),id=crypto.randomUUID(),title=trim(req.body?.titulo,140)||trim(entries.find(m=>m.rol==='user')?.texto,120)||'Conversación importada';
      await client.query('BEGIN');
      await client.query('INSERT INTO borderbro_conversaciones_bosse(id,negocio_id,usuario_id,titulo) VALUES($1,$2,$3,$4)',[id,negocio,usuario,title]);
      for(const m of entries){await client.query(`INSERT INTO borderbro_mensajes_bosse(conversacion_id,negocio_id,usuario_id,rol,texto,fecha_inicio,fecha_fin,evidencia) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
        [id,negocio,usuario,m.rol,trim(m.texto,24000),goodDate(m.fecha_inicio),goodDate(m.fecha_fin),JSON.stringify(safeEvidence(m.evidencia))]);}
      await client.query('COMMIT');return res.status(201).json({success:true,conversacion:{id,titulo:title}});
    }catch(err){await client.query('ROLLBACK').catch(()=>{});return fail(res,err);}finally{client.release();}
  });
  // Llamado SOLO desde la ruta autenticada de chat, después de obtener respuesta.
  async function saveExchange(req, {id,text,response,evidence,start,end}){
    const {usuario,negocio}=guard(req);
    const client=await pool.connect();
    let cid=id;
    try{
      await client.query('BEGIN');
      if(cid){
        if(!VALID_UUID.test(cid))throw Object.assign(new Error('ID de conversación inválido'),{status:400});
        const found=await client.query('SELECT id FROM borderbro_conversaciones_bosse WHERE id=$1 AND negocio_id=$2 AND usuario_id=$3 FOR UPDATE',[cid,negocio,usuario]);
        if(!found.rowCount)throw Object.assign(new Error('Conversación no encontrada para el usuario'),{status:404});
      } else {
        cid=crypto.randomUUID();
        await client.query('INSERT INTO borderbro_conversaciones_bosse(id,negocio_id,usuario_id,titulo) VALUES($1,$2,$3,$4)',[cid,negocio,usuario,trim(text,135)||'Nueva conversación']);
      }
      for(const [rol,contenido,evidenciaMsg] of [['user',text,[]],['assistant',response,evidence]]){
        await client.query(`INSERT INTO borderbro_mensajes_bosse(conversacion_id,negocio_id,usuario_id,rol,texto,fecha_inicio,fecha_fin,evidencia)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
          [cid,negocio,usuario,rol,trim(contenido,24000),goodDate(start),goodDate(end),JSON.stringify(safeEvidence(evidenciaMsg))]);
      }
      await client.query('UPDATE borderbro_conversaciones_bosse SET actualizada_en=NOW() WHERE id=$1',[cid]);
      await client.query('COMMIT');return cid;
    }catch(err){await client.query('ROLLBACK').catch(()=>{});throw err;}finally{client.release();}
  }
  return {lookup,saveExchange};
};
