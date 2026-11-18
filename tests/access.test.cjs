const test=require('node:test'),assert=require('node:assert/strict');
const guard=require('../bosse/access');
function res(){return {code:200,status(n){this.code=n;return this},json(data){this.body=data;return this}}}
const req=(path,body={})=>({path,body,query:{},catalogUser:{id:4,role:'gobernador',negocio:1},is:()=>true});
test('rechaza negocio ajeno antes de consultar datos',async()=>{let query=false;const response=res();await guard({pool:{query:()=>{query=true}}})({...req('/api/egresos'),query:{negocio_id:2}},response,()=>assert.fail('No autorizado'));assert.equal(response.code,403);assert.equal(query,false);});
test('un ID de corte ajeno no permite consultar ni modificar',async()=>{for(const method of ['GET','PUT']){const response=res();await guard({pool:{query:async()=>({rows:[]})}})({...req('/api/cortes/99'),method},response,()=>assert.fail('ID ajeno'));assert.equal(response.code,404);}});
test('los IDs de catálogo también deben pertenecer al negocio',async()=>{const response=res();await guard({pool:{query:async()=>({rows:[]})}})(req('/api/egresos',{proveedor_id:12}),response,()=>assert.fail('Proveedor ajeno'));assert.equal(response.code,400);});
test('auditoría usa usuario de sesión, no uno enviado en el formulario',async()=>{const request=req('/api/egresos',{usuario_crea_id:999});let next=false;await guard({pool:{}})(request,res(),()=>{next=true});assert.equal(request.body.usuario_crea_id,4);assert.equal(next,true);});
test('cajero no consulta herramientas financieras ni rutas de diagnóstico',async()=>{const request=req('/api/borderbro/chat');request.catalogUser.role='cajero';const response=res();await guard({pool:{}})(request,response,()=>assert.fail('Rol sin análisis'));assert.equal(response.code,403);});
