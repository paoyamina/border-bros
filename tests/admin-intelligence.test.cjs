'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {businessDate,fridayWeek,validSupplier,categoryForCut,registerAdminIntelligence}=require('../bosse/admin-intelligence');

const user={negocio:8,id:17,role:'cajero'};
test('fecha de aplicación: rechaza fechas inválidas',()=>{
 assert.equal(businessDate(''),false);
 assert.equal(businessDate('2026-02-30'),false);
 assert.equal(businessDate('2026-11-16'),true);
});
test('semana viernes-jueves, incluyendo cambio de mes',()=>{
 assert.deepEqual(fridayWeek('2026-11-16'),{inicio:'2026-11-13',fin:'2026-11-19'});
 assert.deepEqual(fridayWeek('2026-10-01'),{inicio:'2026-09-25',fin:'2026-10-01'});
});
test('proveedor aprobado debe existir en mismo negocio y estar activo',async()=>{
 const queries=[];
 const db={query:async(sql,args)=>{queries.push({sql,args});return {rows:[{id:11}]};}};
 assert.deepEqual(await validSupplier(db,user,{proveedor_id:11}),{proveedor_id:11,solicitud_proveedor_id:null});
 assert.deepEqual(queries[0].args,[11,8]);
});
test('solicitud pendiente puede registrarse como egreso',async()=>{
 const db={query:async()=>({rows:[{id:42}]})};
 assert.deepEqual(await validSupplier(db,user,{solicitud_proveedor_id:42}),{proveedor_id:null,solicitud_proveedor_id:42});
});
test('no permite dos identificaciones simultáneas',async()=>{
 await assert.rejects(validSupplier({query:async()=>({rows:[]})},user,{proveedor_id:2,solicitud_proveedor_id:3}),/no ambos/);
});
test('proveedor o solicitud de otro negocio es rechazado',async()=>{
 await assert.rejects(validSupplier({query:async()=>({rows:[]})},user,{solicitud_proveedor_id:99}),/ya no está pendiente/);
});
test('reglamentos se asignan únicamente a Servicios',async()=>{
 const db={query:async()=>({rows:[{id:4,nombre:'Servicios'},{id:8,nombre:'Gastos Corte'}]})};
 assert.deepEqual(await categoryForCut(db,8,'REGLAMENTO'),{id:4,nombre:'Servicios'});
 assert.deepEqual(await categoryForCut(db,8,'GASTO'),{id:8,nombre:'Gastos Corte'});
});
test('no inventa categorías cuando faltan',async()=>{
 await assert.rejects(categoryForCut({query:async()=>({rows:[]})},8,'GASTO'),/Falta la categoría/);
});
test('registro de rutas de memoria mantiene validación de roles',()=>{
 const routes=[];
 const app={get:(p,...h)=>routes.push({p,h}),post:(p,...h)=>routes.push({p,h}),patch:(p,...h)=>routes.push({p,h})};
 const auth=()=>{},manager=()=>{};
 registerAdminIntelligence({app,pool:{},catalogAuth:auth,catalogManager:manager});
 const write=routes.find(r=>r.p==='/api/proveedores/memoria'&&r.h.length===3);
 assert.ok(write);assert.equal(write.h[0],auth);assert.equal(write.h[1],manager);
 const merge=routes.find(r=>r.p.endsWith('/fusionar'));
 assert.equal(merge.h[1],manager);
});
