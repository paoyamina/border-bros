'use strict';
const normalizeName = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.']/g,'').replace(/[^a-z0-9]+/g, ' ').trim();
function distance(a,b) {
  let row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}return row[b.length];
}
function namesSimilar(name, rows) {
  const q=normalizeName(name);if(!q)return [];
  return rows.map(row=>{const n=normalizeName(row.nombre);const words=new Set(q.split(' '));const other=new Set(n.split(' '));const overlap=[...words].filter(w=>other.has(w)).length/Math.max(words.size,other.size,1);
    const score=q===n?100:Math.max(Math.round((1-distance(q,n)/Math.max(q.length,n.length,1))*100),Math.round(overlap*85),q.length>=3&&n.includes(q)?90:0);
    return {...row,coincidencia:score};}).filter(r=>r.coincidencia>=55).sort((a,b)=>b.coincidencia-a.coincidencia).slice(0,6);
}
function validateTpv(total, split) {
  if(split==null)return null;
  if(typeof split!=='object'||Array.isArray(split))throw new Error('Desglose TPV inválido.');
  const fields=['bbva','plataforma'];
  if(fields.some(k=>split[k]==null||String(split[k]).trim()===''||!Number.isFinite(Number(split[k]))||Number(split[k])<0))throw new Error('Indica los importes TPV BBVA y Plataforma, incluso si son cero.');
  const cents=v=>Math.round(Number(v)*100);
  if(!Number.isFinite(Number(total))||cents(total)!==cents(split.bbva)+cents(split.plataforma))throw new Error('BBVA + Plataforma debe coincidir con el total de ventas tarjeta.');
  return {bbva:cents(split.bbva)/100,plataforma:cents(split.plataforma)/100};
}
const canAnalyze = role => ['gobernador','contador','socio','administrador'].includes(String(role||'').trim().toLowerCase());
module.exports={normalizeName,namesSimilar,validateTpv,canAnalyze};
