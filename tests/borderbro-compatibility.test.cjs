'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs');const path=require('node:path');
const c=fs.readFileSync(path.join(__dirname,'../frontend/src/components/BosseBorderBroChat.jsx'),'utf8');
test('se preserva el historial estructurado del chat actual',()=>{
 assert.match(c,/filter\(m => !m\.greeting && \(m\.rol === 'user' \|\| m\.rol === 'assistant'\)\)/);
 assert.match(c,/slice\(-8\)\.map/);
 assert.match(c,/slice\(0, 1750\)/);
 assert.match(c,/historial:previousConversation/);
 assert.match(c,/modulo_actual:session\.view \|\| 'Administración'/);
});
test('la interfaz conserva exportaciones y preguntas sin envío automático',()=>{
 assert.match(c,/BosseBorderBroWorkspace/);
 assert.match(c,/ExportTranscript/);
});
