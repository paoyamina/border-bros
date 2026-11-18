'use strict';
module.exports=({app,pool,catalogAuth,catalogManager})=>{
  app.get('/api/borderbro-conocimiento',catalogAuth,catalogManager,async(req,res)=>{
    try{const r=await pool.query('SELECT id,tipo,titulo,contenido,estatus,creada_en,revisada_en,creador_id,revisor_id FROM borderbro_conocimiento_bosse WHERE negocio_id=$1 ORDER BY creada_en DESC LIMIT 200',[req.catalogUser.negocio]);res.json({success:true,entradas:r.rows});}
    catch(e){res.status(500).json({success:false,error:'No se pudo cargar el conocimiento. Revisa la migración de BOSSE.'});}
  });
  app.post('/api/borderbro-conocimiento',catalogAuth,catalogManager,async(req,res)=>{
    const titulo=String(req.body.titulo||'').trim(),contenido=String(req.body.contenido||'').trim(),tipo=req.body.tipo;
    if(!['MANUAL','CORRECCION'].includes(tipo)||titulo.length<3||titulo.length>150||contenido.length<10||contenido.length>12000)return res.status(400).json({success:false,error:'Indica tipo, título (3–150 caracteres) y contenido (10–12000 caracteres).'});
    try{const r=await pool.query(`INSERT INTO borderbro_conocimiento_bosse(negocio_id,tipo,titulo,contenido,creador_id) VALUES($1,$2,$3,$4,$5) RETURNING id,estatus`,[req.catalogUser.negocio,tipo,titulo,contenido,req.catalogUser.id]);res.status(201).json({success:true,entrada:r.rows[0]});}
    catch(e){res.status(500).json({success:false,error:'No se pudo guardar la propuesta.'});}
  });
  app.post('/api/borderbro-conocimiento/:id/revisar',catalogAuth,catalogManager,async(req,res)=>{
    const decision=req.body.decision,id=Number(req.params.id);
    if(!Number.isInteger(id)||id<=0||!['APROBADO','RECHAZADO','RETIRADO'].includes(decision))return res.status(400).json({success:false,error:'Decisión inválida.'});
    try{const r=await pool.query(`UPDATE borderbro_conocimiento_bosse SET estatus=$1,revisor_id=$2,revisada_en=NOW() WHERE id=$3 AND negocio_id=$4 AND ((estatus='PENDIENTE' AND $1 IN ('APROBADO','RECHAZADO')) OR (estatus='APROBADO' AND $1='RETIRADO')) RETURNING id,estatus`,[decision,req.catalogUser.id,id,req.catalogUser.negocio]);
      if(!r.rows.length)return res.status(409).json({success:false,error:'La propuesta cambió o ya fue revisada.'});res.json({success:true,entrada:r.rows[0]});}
    catch(e){res.status(500).json({success:false,error:'No se pudo registrar la revisión.'});}
  });
};
