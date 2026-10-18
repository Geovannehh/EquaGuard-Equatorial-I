const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {criarServidor}=require('../server.cjs');
test('cliente salva fila, reenvia, restaura progresso e aguarda gravações concorrentes',async()=>{
 const app=await criarServidor({dbPath:':memory:',adminPassword:'SenhaTeste@2026!'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 let cookie='',offline=false;const storage={},els={};
 function ambiente(){
  const c={console,crypto:crypto.webcrypto,Date,JSON,Event:function(){},setTimeout,clearTimeout,location:{protocol:'http:',pathname:'/index.html',replace(v){this.redirect=v}},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},window:{addEventListener(){}},document:{getElementById:id=>els[id]||null,body:{appendChild(e){els[e.id]=e}},createElement:()=>({setAttribute(){},style:{},hidden:false})},fetch:async(url,op)=>{if(offline)throw Error('Sem conexão');const r=await fetch(base+url,{...op,headers:{...op.headers,...(cookie?{Cookie:cookie}:{})}});const novo=r.headers.get('set-cookie');if(novo)cookie=novo.split(';')[0];return r}};
  vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../js/eg-dados.js'),'utf8'),c);return c;
 }
 try{
  let c=ambiente();await c.EG.ready;await c.EG.novoJogador('Ana','TI');await c.EG.salvarPerfil('TI');assert(c.EG.d.id);
  const m1={modulo:'Módulo 1: Phishing e Engenharia Social',acertos:6,erros:0,pontos:60};
  c.enviarDados(m1);c.enviarDados({modulo:'Módulo 2: Senhas e posto de trabalho',acertos:2,erros:0,pontos:20});await c.EG.sincronizar();assert.equal(app.db.prepare('SELECT COUNT(*) n FROM results').get().n,2);assert.equal(JSON.parse(storage.equaguard_fila_banco).length,0);
  c=ambiente();await c.EG.ready;assert(c.EG.feito('2'));const id=c.EG.d.id;
  offline=true;c.enviarDados({modulo:'Módulo 3: Dispositivos perdidos',acertos:1,erros:0,pontos:10});await assert.rejects(c.EG.sincronizar());assert.equal(JSON.parse(storage.equaguard_fila_banco).length,1);
  await assert.rejects(c.EG.novoJogador('Outro','TI'));assert.equal(c.EG.d.id,id);
  offline=false;await c.EG.sincronizar();c=ambiente();await c.EG.ready;assert(c.EG.feito('3'));assert.equal(app.db.prepare('SELECT COUNT(*) n FROM results').get().n,3);
 }finally{await app.close()}
});
