'use strict';

// The memory is deliberately curated. It never learns from raw cashier entries.
const { normalizeName } = require('./domain');

function businessDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
function fridayWeek(value) {
  if (!businessDate(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  const offset = (date.getUTCDay() - 5 + 7) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  const start = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 6);
  return {inicio: start, fin: date.toISOString().slice(0, 10)};
}
async function validSupplier(db, user, {proveedor_id, solicitud_proveedor_id} = {}) {
  const supplierId = Number(proveedor_id || 0);
  const requestId = Number(solicitud_proveedor_id || 0);
  if (Boolean(supplierId) === Boolean(requestId)) {
    const err = new Error('Selecciona un proveedor aprobado o una solicitud pendiente (no ambos).'); err.status = 400; throw err;
  }
  if (supplierId) {
    const found = await db.query('SELECT id FROM proveedores WHERE id=$1 AND negocio_id=$2 AND (activo IS NULL OR activo=true)',[supplierId,user.negocio]);
    if (!found.rows.length) {const err=new Error('Proveedor no autorizado para este negocio.');err.status=400;throw err;}
    return {proveedor_id:supplierId, solicitud_proveedor_id:null};
  }
  const found = await db.query("SELECT id FROM solicitudes_proveedores_bosse WHERE id=$1 AND negocio_id=$2 AND estatus='PENDIENTE'",[requestId,user.negocio]);
  if (!found.rows.length) {const err=new Error('La solicitud ya no está pendiente. Actualiza la lista de proveedores.');err.status=409;throw err;}
  return {proveedor_id:null, solicitud_proveedor_id:requestId};
}
async function categoryFromName(db, businessId, category) {
  const rows=await db.query('SELECT id,nombre FROM categorias WHERE negocio_id=$1',[businessId]);
  const wanted=normalizeName(category);
  return rows.rows.find(r=>normalizeName(r.nombre)===wanted)||null;
}
async function categoryForCut(db, businessId, kind){
  const names=kind==='REGLAMENTO' ? ['Servicios'] : ['Gastos Corte','Gastos de Corte'];
  for (const name of names){const result=await categoryFromName(db,businessId,name);if(result)return result;}
  const err=new Error(`Falta la categoría autorizada «${names[0]}» en el catálogo. Pide al contador que la cree antes de guardar.`);
  err.status=409;throw err;
}
function registerAdminIntelligence({app,pool,catalogAuth,catalogManager}) {
  app.get('/api/proveedores/memoria',catalogAuth,async(req,res)=>{
    const id=Number(req.query.proveedor_id||0);
    if(!Number.isSafeInteger(id)||id<=0)return res.status(400).json({success:false,error:'Selecciona un proveedor.'});
    try{
      const data=await pool.query(`SELECT m.id,m.concepto,m.prioridad,m.categoria_id,c.nombre AS categoria
       FROM proveedor_memoria_bosse m JOIN categorias c ON c.id=m.categoria_id AND c.negocio_id=m.negocio_id
       JOIN proveedores p ON p.id=m.proveedor_id AND p.negocio_id=m.negocio_id
       WHERE m.negocio_id=$1 AND m.proveedor_id=$2 AND m.activo=true
       AND (p.activo IS NULL OR p.activo=true)
       ORDER BY m.prioridad DESC,m.actualizado_en DESC,m.id DESC LIMIT 12`,[req.catalogUser.negocio,id]);
      return res.json({success:true,combinaciones:data.rows});
    }catch(e){console.error('Memoria proveedores:',e.message);return res.status(500).json({success:false,error:'No fue posible consultar las sugerencias.'});}
  });
  app.get('/api/proveedores/memoria/catalogo',catalogAuth,catalogManager,async(req,res)=>{
    try{
      const data=await pool.query(`SELECT m.id,m.proveedor_id,p.nombre AS proveedor,m.categoria_id,
        c.nombre AS categoria,m.concepto,m.prioridad,m.activo
        FROM proveedor_memoria_bosse m
        JOIN proveedores p ON p.id=m.proveedor_id AND p.negocio_id=m.negocio_id
        JOIN categorias c ON c.id=m.categoria_id AND c.negocio_id=m.negocio_id
        WHERE m.negocio_id=$1 ORDER BY p.nombre,m.prioridad DESC,m.id DESC LIMIT 300`,[req.catalogUser.negocio]);
      return res.json({success:true,combinaciones:data.rows});
    }catch(e){return res.status(500).json({success:false,error:'No se pudo leer la memoria autorizada.'});}
  });
  app.post('/api/proveedores/memoria',catalogAuth,catalogManager,async(req,res)=>{
    const supplier=Number(req.body?.proveedor_id),category=Number(req.body?.categoria_id),
      concept=String(req.body?.concepto||'').trim().replace(/\s+/g,' ').slice(0,250),priority=Number(req.body?.prioridad||1);
    if(!Number.isSafeInteger(supplier)||supplier<=0||!Number.isSafeInteger(category)||category<=0||concept.length<2||!Number.isInteger(priority)||priority<1||priority>5)
      return res.status(400).json({success:false,error:'Selecciona proveedor, categoría y concepto válidos.'});
    try{
      const refs=await pool.query(`SELECT
        EXISTS(SELECT 1 FROM proveedores WHERE id=$1 AND negocio_id=$3 AND (activo IS NULL OR activo=true)) AS proveedor,
        EXISTS(SELECT 1 FROM categorias WHERE id=$2 AND negocio_id=$3) AS categoria`,[supplier,category,req.catalogUser.negocio]);
      if(!refs.rows[0]?.proveedor||!refs.rows[0]?.categoria)return res.status(400).json({success:false,error:'Proveedor o categoría de otro negocio.'});
      const data=await pool.query(`INSERT INTO proveedor_memoria_bosse(negocio_id,proveedor_id,categoria_id,concepto,prioridad,aprobado_por)
        VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT (negocio_id,proveedor_id,categoria_id,(LOWER(TRIM(concepto)))) DO UPDATE
        SET prioridad=EXCLUDED.prioridad,activo=true,aprobado_por=EXCLUDED.aprobado_por,actualizado_en=NOW()
        RETURNING id,concepto,prioridad`,[req.catalogUser.negocio,supplier,category,concept,priority,req.catalogUser.id]);
      return res.json({success:true,combinacion:data.rows[0]});
    }catch(e){console.error('Guardar memoria:',e.message);return res.status(500).json({success:false,error:'No fue posible guardar la combinación.'});}
  });
  // Vista previa y confirmación explícita: jamás se fusiona automáticamente por similitud.
  app.get('/api/proveedores/catalogo/:id/fusion-preview',catalogAuth,catalogManager,async(req,res)=>{
    const from=Number(req.params.id),to=Number(req.query.destino_id);
    if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<=0||to<=0||from===to)
      return res.status(400).json({success:false,error:'Selecciona dos proveedores diferentes.'});
    try{
      const r=await pool.query('SELECT id,nombre,activo FROM proveedores WHERE negocio_id=$1 AND id=ANY($2::integer[])',[req.catalogUser.negocio,[from,to]]);
      if(r.rows.length!==2||!r.rows.find(x=>x.id===to&&x.activo!==false))return res.status(404).json({success:false,error:'Los proveedores deben pertenecer al mismo negocio; el destino debe estar activo.'});
      const count=await pool.query('SELECT COUNT(*)::integer AS total FROM egresos WHERE negocio_id=$1 AND proveedor_id=$2',[req.catalogUser.negocio,from]);
      return res.json({success:true,origen:r.rows.find(x=>x.id===from),destino:r.rows.find(x=>x.id===to),egresos_afectados:count.rows[0].total});
    }catch(e){return res.status(500).json({success:false,error:'No se pudo preparar la unificación.'});}
  });
  app.post('/api/proveedores/catalogo/:id/fusionar',catalogAuth,catalogManager,async(req,res)=>{
    const from=Number(req.params.id),to=Number(req.body?.destino_id);
    if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<=0||to<=0||from===to||req.body?.confirmacion!=='UNIFICAR')
      return res.status(400).json({success:false,error:'Confirma el proveedor de destino escribiendo UNIFICAR.'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const r=await client.query('SELECT id,nombre,activo FROM proveedores WHERE negocio_id=$1 AND id=ANY($2::integer[]) ORDER BY id FOR UPDATE',[req.catalogUser.negocio,[from,to]]);
      const source=r.rows.find(x=>x.id===from),target=r.rows.find(x=>x.id===to);
      if(!source||!target||source.activo===false||target.activo===false){await client.query('ROLLBACK');return res.status(409).json({success:false,error:'Origen y destino deben estar activos en el mismo negocio.'});}
      const expenses=await client.query('SELECT * FROM egresos WHERE negocio_id=$1 AND proveedor_id=$2 FOR UPDATE',[req.catalogUser.negocio,from]);
      for(const before of expenses.rows){
        const updated=await client.query('UPDATE egresos SET proveedor_id=$1,updated_at=NOW(),updated_by=$2 WHERE id=$3 AND negocio_id=$4 RETURNING *',[to,req.catalogUser.id,before.id,req.catalogUser.negocio]);
        await client.query('INSERT INTO egresos_historial(egreso_id,accion,usuario_id,datos_anteriores,datos_nuevos) VALUES($1,$2,$3,$4,$5)',[before.id,'EDITADO',req.catalogUser.id,JSON.stringify(before),JSON.stringify(updated.rows[0])]);
      }
      await client.query("UPDATE solicitudes_proveedores_bosse SET proveedor_id=$1 WHERE negocio_id=$2 AND proveedor_id=$3 AND estatus='APROBADO'",[to,req.catalogUser.negocio,from]);
      // Mantiene únicamente sugerencias que un administrador había aprobado.
      await client.query(`INSERT INTO proveedor_memoria_bosse(negocio_id,proveedor_id,categoria_id,concepto,prioridad,aprobado_por,activo)
        SELECT negocio_id,$1,categoria_id,concepto,prioridad,$2,activo FROM proveedor_memoria_bosse WHERE negocio_id=$3 AND proveedor_id=$4
        ON CONFLICT (negocio_id,proveedor_id,categoria_id,(LOWER(TRIM(concepto)))) DO NOTHING`,[to,req.catalogUser.id,req.catalogUser.negocio,from]);
      await client.query('DELETE FROM proveedor_memoria_bosse WHERE negocio_id=$1 AND proveedor_id=$2',[req.catalogUser.negocio,from]);
      const antiguosAlias=await client.query('SELECT nombre_alias,nombre_normalizado FROM proveedor_alias_bosse WHERE negocio_id=$1 AND proveedor_id=$2 FOR UPDATE',[req.catalogUser.negocio,from]);
      await client.query('DELETE FROM proveedor_alias_bosse WHERE negocio_id=$1 AND proveedor_id=$2',[req.catalogUser.negocio,from]);
      for(const alias of antiguosAlias.rows)await client.query('INSERT INTO proveedor_alias_bosse(negocio_id,proveedor_id,nombre_alias,nombre_normalizado,aprobado_por) VALUES($1,$2,$3,$4,$5) ON CONFLICT(negocio_id,nombre_normalizado) DO NOTHING',[req.catalogUser.negocio,to,alias.nombre_alias,alias.nombre_normalizado,req.catalogUser.id]);
      if(normalizeName(source.nombre)!==normalizeName(target.nombre))await client.query('INSERT INTO proveedor_alias_bosse(negocio_id,proveedor_id,nombre_alias,nombre_normalizado,aprobado_por) VALUES($1,$2,$3,$4,$5) ON CONFLICT(negocio_id,nombre_normalizado) DO NOTHING',[req.catalogUser.negocio,to,source.nombre,normalizeName(source.nombre),req.catalogUser.id]);
      await client.query('UPDATE proveedores SET activo=false WHERE id=$1 AND negocio_id=$2',[from,req.catalogUser.negocio]);
      await client.query('INSERT INTO proveedor_fusiones_bosse(negocio_id,origen_id,destino_id,usuario_id,nombre_origen,nombre_destino,egresos_afectados) VALUES($1,$2,$3,$4,$5,$6,$7)',[req.catalogUser.negocio,from,to,req.catalogUser.id,source.nombre,target.nombre,expenses.rows.length]);
      await client.query('COMMIT');
      return res.json({success:true,egresos_corregidos:expenses.rows.length,proveedor_destino:target.nombre});
    }catch(e){await client.query('ROLLBACK');console.error('Fusión proveedores:',e.message);return res.status(500).json({success:false,error:'No se pudo unificar. No se guardaron cambios parciales.'});}
    finally{client.release();}
  });
  app.patch('/api/proveedores/memoria/:id',catalogAuth,catalogManager,async(req,res)=>{
    const id=Number(req.params.id);
    if(!Number.isSafeInteger(id)||id<=0||typeof req.body?.activo!=='boolean')return res.status(400).json({success:false,error:'Parámetros inválidos.'});
    try{
      const r=await pool.query('UPDATE proveedor_memoria_bosse SET activo=$1,actualizado_en=NOW(),aprobado_por=$2 WHERE id=$3 AND negocio_id=$4 RETURNING id,activo',[req.body.activo,req.catalogUser.id,id,req.catalogUser.negocio]);
      return r.rows.length?res.json({success:true,combinacion:r.rows[0]}):res.status(404).json({success:false,error:'No se encontró esta combinación.'});
    }catch(e){return res.status(500).json({success:false,error:'No se pudo actualizar la memoria.'});}
  });
}
module.exports={businessDate,fridayWeek,validSupplier,categoryForCut,registerAdminIntelligence};
