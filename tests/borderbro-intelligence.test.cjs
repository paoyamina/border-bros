'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {
  salesForecast,normalizeHistory,currentQuestion,safeCity,searchSources,offsetISO,classifyScope,publicMarketResearch
}=require('../bosse/borderbro-intelligence');
function weeks(count,values=[]) {
 const start='2026-07-03';
 return Array.from({length:count},(_,i)=>({
  semana_inicio:offsetISO(start,7*i),semana_fin:offsetISO(start,7*i+6),
  cantidad_cortes:2,total_ingresos:values[i]??(100000+i*1200)
 }));
}
test('no inventa ventas sin seis semanas completas',()=>{
 const x=salesForecast(weeks(4));
 assert.equal(x.estado,'SIN_BASE_SUFICIENTE');
 assert.equal(x.totales_horizonte,undefined);
});
test('no asume ingresos cero en semanas ausentes',()=>{
 const a=weeks(8); a.splice(3,1);
 const x=salesForecast(a);
 assert.equal(x.estado,'SIN_BASE_SUFICIENTE');
 assert.ok(x.razones.some(t=>t.includes('semanas consecutivas')));
});
test('descarta un hueco antiguo pero usa las seis semanas consecutivas recientes',()=>{
 const rows=weeks(10);rows.splice(2,1);
 const x=salesForecast(rows);
 assert.equal(x.estado,'PROYECCION_ORIENTATIVA');
 assert.ok(x.advertencias.some(t=>t.includes('semanas previas sin registros')));
});
test('proyecta escenarios monotónicos y horizonte transparente',()=>{
 const x=salesForecast(weeks(10),{horizonWeeks:4});
 assert.equal(x.estado,'PROYECCION_ORIENTATIVA');
 assert.equal(x.escenarios_semanales.length,4);
 assert.equal(x.historial.length,10);
 assert.ok(x.totales_horizonte.conservador<x.totales_horizonte.base);
 assert.ok(x.totales_horizonte.base<x.totales_horizonte.optimista);
 assert.ok(x.advertencias.some(v=>v.includes('no ingreso oficial')));
});
test('horizonte y tendencia limitados; no forecast negativo',()=>{
 const x=salesForecast(weeks(12,[500000,500000,500000,500000,1000,1000,1000,1000,0,0,0,0]),{horizonWeeks:99});
 assert.equal(x.horizonte_semanas,12);
 assert.ok(x.escenarios_semanales.every(v=>v.conservador>=0&&v.base>=0));
 assert.ok(x.tendencia_semanal_estimada>=-3.5);
});
test('no reenvía historial fuera de formato ni longitud',()=>{
 const h=normalizeHistory([{rol:'assistant',texto:'a'.repeat(3000)},{rol:'admin',texto:'forbidden'},
 {rol:'user',texto:'puedes comparar ventas'},{rol:'user',texto:''}]);
 assert.equal(h.length,2);
 assert.equal(h[0].content.length,1800);
 assert.equal(h[1].role,'user');
});
test('extrae pregunta actual de cliente viejo',()=>{
 assert.equal(currentQuestion('Contexto reciente...\nNueva pregunta del usuario:\n¿La venta subió?'),'¿La venta subió?');
 assert.equal(currentQuestion('¿Qué promoción probamos?'),'¿Qué promoción probamos?');
});
test('investigación sólo usa ciudad pública con formato seguro',()=>{
 assert.equal(safeCity('Tijuana, Baja California, México'),'Tijuana, Baja California, México');
 assert.equal(safeCity('businessId=1, token=abc'),'Tijuana, Baja California, México');
});
test('fuentes publicas se obtienen de anotaciones, no de texto arbitrario',()=>{
 const x=searchSources({output:[{content:[{annotations:[
  {type:'url_citation',url:'https://example.org/reporte',title:'Reporte'},
  {type:'url_citation',url:'file:///etc/passwd',title:'Inseguro'},
  {type:'url_citation',url:'https://example.org/reporte',title:'Duplicado'}]}]}]});
 assert.deepEqual(x,[{titulo:'Duplicado',url:'https://example.org/reporte'}]);
});
test('compuerta de ámbito acepta negocio y bloquea lo personal',async()=>{
 const client={responses:{create:async ()=>({output_text:'FUERA'})}};
 assert.equal(await classifyScope(client,'modelo','¿Qué película veo esta noche?'),false);
 client.responses.create=async ()=>({output_text:'NEGOCIO'});
 assert.equal(await classifyScope(client,'modelo','¿Cómo aumentar mis ventas de cover?'),true);
});
test('si el clasificador no responde, bloquea por seguridad',async()=>{
 const client={responses:{create:async ()=>({output_text:''})}};
 assert.equal(await classifyScope(client,'modelo','mensaje'),false);
});

test('búsqueda pública separada nunca recibe cifras internas ni folios',async()=>{
  let request;
  const client={responses:{create:async value=>{
    request=value;
    return {output_text:'Resultado público de prueba',output:[{content:[{annotations:[{type:'url_citation',url:'https://ejemplo.mx/sector',title:'Informe local'}]}]}]};
  }}};
  const x=await publicMarketResearch(client,'modelo',{theme:'marketing_digital',city:'Tijuana, Baja California, México'});
  assert.equal(request.tools[0].type,'web_search');
  assert.equal(request.store,false);
  assert.match(request.input,/Tijuana/);
  assert.doesNotMatch(request.input,/negocio_id|corte_id|997178|Son[ií]a/i);
  assert.equal(x.fuentes_publicas[0].url,'https://ejemplo.mx/sector');
});
