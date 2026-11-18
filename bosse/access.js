'use strict';
const {canAnalyze}=require('./domain');
const operational={
 cortes:['socio','contador','gobernador','cajero'],egresos:['socio','contador','gobernador','administrador','cajero'],
 empleados:['socio','gobernador','administrador','cajero'],puestos:['socio','contador','gobernador','administrador','cajero'],
 prenomina:['socio','contador','gobernador','administrador','cajero'],'cambios-divisa':['gobernador','administrador','cajero'],
 'inversiones-socios':['socio','contador','gobernador'],socios:['socio','contador','gobernador']
};
module.exports=({pool})=>async(req,res,next)=>{
 try{
  const user=req.catalogUser;
  const resource=req.path.split('/')[2];
  if(resource==='probar-egreso')return res.status(404).json({success:false,error:'Ruta de diagnóstico deshabilitada.'});
  const detailForAnalysis=resource==='cortes'&&req.method==='GET'&&/^\/api\/cortes\/\d+$/.test(req.path)&&canAnalyze(user.role);
  if(!detailForAnalysis&&operational[resource]&&!operational[resource].includes(user.role))return res.status(403).json({success:false,error:'No tienes permiso para este módulo.'});
  if(['analisis-financiero','borderbro'].includes(resource)&&!canAnalyze(user.role))return res.status(403).json({success:false,error:'No tienes permiso para Análisis Financiero.'});
  for(const requested of [req.query?.negocio_id,req.body?.negocio_id])if(requested!=null&&Number(requested)!==user.negocio)return res.status(403).json({success:false,error:'Sin permiso para este negocio.'});
  req.query.negocio_id=user.negocio;
  if(req.is('application/json')){
   req.body.negocio_id=user.negocio;
   for(const key of ['usuario_id','usuario_crea_id','usuario_edita_id','usuario_aprueba_id','usuario_cancela_id','usuario_reactiva_id'])if(key in req.body)req.body[key]=user.id;
  }
  const match=req.path.match(/^\/api\/(cortes|egresos|prenomina|empleados|puestos|cambios-divisa)\/(\d+)(?:\/|$)/);
  const tables={cortes:'corte_caja',egresos:'egresos',prenomina:'prenomina',empleados:'empleados',puestos:'puestos','cambios-divisa':'cambios_divisa'};
  if(match){const r=await pool.query(`SELECT id FROM ${tables[match[1]]} WHERE id=$1 AND negocio_id=$2`,[Number(match[2]),user.negocio]);if(!r.rows.length)return res.status(404).json({success:false,error:'Registro no encontrado en tu negocio.'});}
  for(const [key,table] of [['proveedor_id','proveedores'],['categoria_id','categorias'],['puesto_id','puestos']]){
   if(req.body?.[key]){const r=await pool.query(`SELECT id FROM ${table} WHERE id=$1 AND negocio_id=$2`,[req.body[key],user.negocio]);if(!r.rows.length)return res.status(400).json({success:false,error:`${key} no pertenece a tu negocio.`});}
  }
  next();
 }catch(e){console.error('Acceso BOSSE:',e.message);res.status(500).json({success:false,error:'No fue posible verificar los permisos.'});}
};
