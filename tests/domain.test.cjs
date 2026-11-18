const test=require('node:test');const assert=require('node:assert/strict');
const {namesSimilar,normalizeName,validateTpv,canAnalyze}=require('../bosse/domain');
test('nombres equivalentes y errores de dedo evitan altas inadvertidas',()=>{
 assert.equal(normalizeName('  José, SA.  '),'jose sa');
 assert.equal(namesSimilar('Jose SA',[{id:1,nombre:'José, S.A.'}])[0].coincidencia,100);
 assert.equal(namesSimilar('Costkoo',[{id:1,nombre:'Costco'},{id:2,nombre:'Gas del Pacifico'}])[0].id,1);
 assert.deepEqual(namesSimilar('',[{id:1,nombre:'Costco'}]),[]);
});
test('BBVA y Plataforma no cambian el total; históricos sin dato no se inventan',()=>{
 assert.equal(validateTpv(300,null),null);
 assert.deepEqual(validateTpv(0.3,{bbva:0.1,plataforma:0.2}),{bbva:0.1,plataforma:0.2});
 for(const split of [{bbva:100,plataforma:50},{bbva:-1,plataforma:301},{bbva:'',plataforma:300},{bbva:'NaN',plataforma:0}])assert.throws(()=>validateTpv(300,split));
});
test('permisos de análisis separan captura y consulta',()=>{
 assert.equal(canAnalyze('cajero'),false);assert.equal(canAnalyze('contador'),true);assert.equal(canAnalyze('gobernador'),true);assert.equal(canAnalyze(''),false);
});
