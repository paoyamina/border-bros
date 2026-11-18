const test=require('node:test');const assert=require('node:assert/strict');
const register=require('../bosse/borderbro-workspace');
function fixture(){
 const handlers={};let rows=[];let interactions=[];
 const pool={
  async query(sql,args=[]){interactions.push({sql,args});
   if(sql.startsWith('SELECT id,titulo,contexto_adicional'))return {rows:rows.filter(r=>r.id===args[0]&&r.negocio_id===args[1]&&r.usuario_id===args[2])};
   if(sql.startsWith('INSERT INTO borderbro_conversaciones_bosse')){
    const r={id:args[0],negocio_id:args[1],usuario_id:args[2],titulo:args[3],contexto_adicional:args[4]||''};rows.push(r);return {rows:[r]};}
   if(sql.startsWith('DELETE FROM borderbro_conversaciones_bosse')){let old=rows.length;rows=rows.filter(r=>!(r.id===args[0]&&r.negocio_id===args[1]&&r.usuario_id===args[2]));return {rowCount:old-rows.length};}
   return {rows:[],rowCount:0};},
  async connect(){return {query:this.query.bind(this),release(){}};}
 };
 const app={get(p,fn){handlers['GET '+p]=fn;},post(p,fn){handlers['POST '+p]=fn;},patch(p,fn){handlers['PATCH '+p]=fn;},delete(p,fn){handlers['DELETE '+p]=fn;}};
 const service=register({app,pool});
 return {handlers,pool,service,interactions};
}
function request(id,biz=1){return {catalogUser:{id,negocio:biz},headers:{},body:{},params:{}};}
function response(){return {statusCode:200,payload:null,status(s){this.statusCode=s;return this},json(v){this.payload=v;return v}}}
test('No se puede leer una conversación de otro usuario ni otro negocio',async()=>{
 const {service}=fixture();const origin=request(9,1);
 const created=await service.lookup('00000000-0000-4000-8000-000000000001',origin);
 assert.equal(created,null);
});
test('Guardar conversaciones utiliza negocio y usuario del token, no del body',async()=>{
 const {handlers,interactions}=fixture();const req=request(17,4);req.body={negocio_id:999,titulo:'Campaña de marketing',contexto_adicional:'Presupuesto 15000'};
 const res=response();await handlers['POST /api/borderbro/conversaciones'](req,res);
 assert.equal(res.statusCode,201);const ins=interactions.find(i=>i.sql.startsWith('INSERT INTO borderbro_conversaciones_bosse'));
 assert.deepEqual(ins.args.slice(1,3),[4,17]);
});
test('Se rechaza contexto adicional de más de 4000 caracteres',async()=>{
 const {handlers}=fixture();const req=request(7,2);req.body={contexto_adicional:'a'.repeat(4001)};req.params.id='00000000-0000-4000-8000-000000000001';
 const res=response();await handlers['PATCH /api/borderbro/conversaciones/:id'](req,res);assert.equal(res.statusCode,400);
});
test('Eliminar conversación de otro usuario devuelve 404',async()=>{
 const {handlers}=fixture();const req=request(8,3);req.params.id='00000000-0000-4000-8000-000000000001';
 const res=response();await handlers['DELETE /api/borderbro/conversaciones/:id'](req,res);assert.equal(res.statusCode,404);
});

test('Un usuario no puede consultar el chat de otro usuario del mismo negocio',async()=>{
 const {handlers}=fixture();const owner=request(17,4);owner.body={titulo:'Análisis de rentabilidad'};const created=response();
 await handlers['POST /api/borderbro/conversaciones'](owner,created);
 const wrong=request(23,4);wrong.params.id=created.payload.conversacion.id;const result=response();
 await handlers['GET /api/borderbro/conversaciones/:id'](wrong,result);
 assert.equal(result.statusCode,404);
});
