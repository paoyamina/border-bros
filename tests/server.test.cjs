const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),http=require('node:http');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),realRequire=createRequire(path.join(root,'server.js'));
let app,server,base,role='contador',queries=[],modelCalls=0;
const express=realRequire('express');
const pool={async query(sql,args){queries.push({sql,args});
 if(/FROM usuarios u/.test(sql))return {rows:[{id:4,nombre:'Prueba',rol:role,negocio_id:1,activo:true}]};
 if(/FROM borderbro_conocimiento_bosse/.test(sql))return {rows:[]};
 if(/INSERT INTO borderbro_conocimiento_bosse/.test(sql))return {rows:[{id:7,estatus:'PENDIENTE'}]};
 if(/UPDATE borderbro_conocimiento_bosse/.test(sql))return {rows:[{id:7,estatus:args[0]}]};
 return {rows:[]};
 }};
test.before(async()=>{
 const wrappedExpress=()=>{app=express();app.listen=()=>null;return app};Object.assign(wrappedExpress,express);
 class AI {constructor(){this.responses={create:async()=>{modelCalls++;return {id:'mock',output:[],output_text:'Sin registros disponibles para concluir.'}}}}}
 const customRequire=name=>name==='express'?wrappedExpress:name==='pg'?{Pool:function(){return pool}}:name==='openai'?AI:name==='./auth'?()=>{}:realRequire(name);
 const sandbox={require:customRequire,__dirname:root,Buffer,console:{log(){},warn(){},error(){}},process:{env:{BOSSE_SESSION_SECRET:'only-test-secret',OPENAI_API_KEY:'fake'}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'server.js'),'utf8'),sandbox,{filename:'server.js'});
 server=http.createServer(app);await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
});
test.after(()=>new Promise(r=>server.close(r)));
async function token(){const r=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idCajero:'TEST',password:'fake'})});const data=await r.json();assert.equal(r.status,200);assert.ok(data.catalog_token);return data.catalog_token;}
async function post(url,body,t){return fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:JSON.stringify(body)});}
test('rutas financieras y catálogo requieren sesión firmada',async()=>{
 for(const endpoint of ['/api/analisis-financiero?negocio_id=1','/api/proveedores/catalogo?negocio_id=1']){const r=await fetch(base+endpoint);assert.equal(r.status,401);}
 const t=await token();const bad=await fetch(base+'/api/proveedores/catalogo?negocio_id=1',{headers:{Authorization:'Bearer '+t+'x'}});assert.equal(bad.status,401);
});
test('un token válido no permite cambiar negocio ni ganar rol desde el cuerpo',async()=>{
 const t=await token();let r=await post('/api/borderbro/chat',{negocio_id:2,mensaje:'Consulta',fecha_inicio:'2026-11-01',fecha_fin:'2026-11-05'},t);assert.equal(r.status,403);
 role='cajero';r=await post('/api/borderbro/chat',{negocio_id:1,rol:'gobernador',mensaje:'Consulta',fecha_inicio:'2026-11-01',fecha_fin:'2026-11-05'},t);assert.equal(r.status,403);
 r=await post('/api/categorias/catalogo',{negocio_id:1,nombre:'Nueva',rol:'gobernador'},t);assert.equal(r.status,403);role='contador';
});
test('conocimientos requieren propuesta y revisión humana explícita',async()=>{
 const t=await token();queries=[];
 let r=await post('/api/borderbro-conocimiento',{negocio_id:1,tipo:'CORRECCION',titulo:'Regla comprobada',contenido:'La prenómina es referencia, no otro egreso.'},t);assert.equal(r.status,201);assert.equal((await r.json()).entrada.estatus,'PENDIENTE');
 const insert=queries.find(q=>/INSERT INTO borderbro_conocimiento_bosse/.test(q.sql));assert.ok(insert);assert.equal(insert.args[0],1);assert.equal(insert.args[4],4);
 r=await post('/api/borderbro-conocimiento/7/revisar',{negocio_id:1,decision:'APROBADO'},t);assert.equal(r.status,200);assert.ok(queries.some(q=>/UPDATE borderbro_conocimiento_bosse/.test(q.sql)&&q.args[1]===4&&q.args[3]===1));
});
test('BorderBro usa solo conocimiento aprobado y valida periodo antes de consultar al modelo',async()=>{
 const t=await token();modelCalls=0;let r=await post('/api/borderbro/chat',{negocio_id:1,mensaje:'Consulta',fecha_inicio:'2026-11-05',fecha_fin:'2026-11-01'},t);assert.equal(r.status,400);assert.equal(modelCalls,0);
 queries=[];r=await post('/api/borderbro/chat',{negocio_id:1,mensaje:'Consulta',fecha_inicio:'2026-11-01',fecha_fin:'2026-11-05'},t);assert.equal(r.status,200);assert.equal(modelCalls,1);const q=queries.find(q=>/FROM borderbro_conocimiento_bosse/.test(q.sql));assert.ok(q.sql.includes("estatus='APROBADO'"));assert.equal(q.args[0],1);assert.ok(!queries.some(q=>/^(INSERT|UPDATE|DELETE)/.test(q.sql.trim())));
});
