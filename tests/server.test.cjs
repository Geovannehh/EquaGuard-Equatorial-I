const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {criarServidor}=require('../server.cjs');
test('banco, autenticação, autorização, progresso, repetição e persistência',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'equaguard-test-'));
 fs.writeFileSync(path.join(dir,'index.html'),'<h1>Teste</h1>');
 const op={root:dir,dbPath:path.join(dir,'dados.sqlite'),adminPassword:'SenhaTeste@2026!'};
 let app=await criarServidor(op),url;async function iniciar(){await new Promise(r=>app.server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+app.server.address().port}await iniciar();
 async function req(route,method='GET',body,cookie='',origin){const r=await fetch(url+route,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})},body:body?JSON.stringify(body):undefined});const content=await r.text();let data;try{data=JSON.parse(content)}catch{data=content}return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0],headers:r.headers}}
 try{
  assert.equal((await req('/api/results')).status,401);assert.equal((await req('/data/equaguard.sqlite')).status,404);assert.equal((await req('/server.cjs')).status,404);assert.equal((await req('/backup-login/test.js')).status,404);
  assert.equal((await req('/api/login','POST',{usuario:'seguranca',senha:'errada'})).status,401);
  assert.equal((await req('/api/login','POST',{usuario:'seguranca',senha:op.adminPassword},'', 'http://evil.example')).status,403);
  let login=await req('/api/login','POST',{usuario:'seguranca',senha:op.adminPassword});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);let admin=login.cookie;
  let p=await req('/api/players','POST',{nome:'Ana',setor:'Operações'}),player=p.cookie,id=p.data.id;assert.equal(p.status,201);assert.equal((await req('/api/results','GET',null,player)).status,401);
  assert.equal((await req('/api/player','PATCH',{perfil:'Técnico de campo'},player)).status,200);
  const nomes={'1':'Módulo 1: Phishing e Engenharia Social','2':'Módulo 2: Senhas e posto de trabalho','3':'Módulo 3: Dispositivos perdidos','3t-1':'Módulo 3 – Parte 2: Notebook e rede operacional','3t-2':'Módulo 3 – Parte 3: Alerta de segurança','3t-3':'Módulo 3 – Parte 4: QR Code suspeito','4':'Módulo 4: O perigo de compartilhar informações','5':'Módulo 5: Armadilhas digitais'};
  const dado=k=>({eventoId:'evento-'+k,jogadorId:id,modulo:nomes[k],acertos:k==='1'?6:['2','4','5'].includes(k)?2:1,erros:0,pontos:k==='1'?60:['2','4','5'].includes(k)?20:10,escolhas:'correta',perfil:'TI',nome:'Nome forjado'});
  assert.equal((await req('/api/results','POST',dado('4'),player)).status,409);
  assert.equal((await req('/api/results','POST',{...dado('1'),pontos:99999},player)).status,400);
  for(const k of ['1','2','3'])assert.equal((await req('/api/results','POST',dado(k),player)).status,200);
  assert.equal((await req('/api/results','POST',dado('4'),player)).status,409);
  for(const k of ['3t-1','3t-2','3t-3','4','5'])assert.equal((await req('/api/results','POST',dado(k),player)).status,200);
  assert.equal((await req('/api/results','POST',dado('5'),player)).data.duplicado,true);
  let lista=await req('/api/results','GET',null,admin);assert.equal(lista.data.resultados.length,8);assert.equal(lista.data.resultados[0].nome,'Ana');assert.equal(lista.data.resultados[0].perfil,'Técnico de campo');
  assert.equal((await req('/api/player','GET',null,player)).data.prog['3t'],1);
  const senha=app.db.prepare('SELECT password_hash FROM users').get().password_hash;assert(!senha.includes(op.adminPassword));assert.equal(senha.split(':')[1].length,128);
  await app.close();app=await criarServidor(op);await iniciar();assert.equal(app.senhaInicial,null);assert.equal((await req('/api/results','GET',null,admin)).data.resultados.length,8);assert.equal((await req('/api/player','GET',null,player)).data.prog['5'],1);
  let p2=await req('/api/players','POST',{nome:'Bruno',setor:'TI'});assert.equal((await req('/api/results','POST',dado('1'),p2.cookie)).status,403);
  assert.equal((await req('/api/password','POST',{atual:op.adminPassword,nova:'SenhaNova@2026!'},admin)).status,200);assert.equal((await req('/api/results','GET',null,admin)).status,401);
  login=await req('/api/login','POST',{usuario:'seguranca',senha:'SenhaNova@2026!'});assert.equal(login.status,200);admin=login.cookie;
  app.db.prepare("UPDATE sessions SET expires_at=0 WHERE kind='admin'").run();assert.equal((await req('/api/results','GET',null,admin)).status,401);
  login=await req('/api/login','POST',{usuario:'seguranca',senha:'SenhaNova@2026!'});await req('/api/logout','POST',{},login.cookie);assert.equal((await req('/api/session','GET',null,login.cookie)).status,401);
 }finally{await app.close();fs.rmSync(dir,{recursive:true,force:true})}
});
