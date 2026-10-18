const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const {DatabaseSync}=require('node:sqlite');
const scrypt=promisify(crypto.scrypt);
const PERFIS=['Analista','Liderança','TI','Técnico de campo'];
const MODULOS={
 '1': 'Módulo 1: Phishing e Engenharia Social',
 '2': 'Módulo 2: Senhas e posto de trabalho',
 '3': 'Módulo 3: Dispositivos perdidos',
 '3t-1':'Módulo 3 – Parte 2: Notebook e rede operacional',
 '3t-2':'Módulo 3 – Parte 3: Alerta de segurança',
 '3t-3':'Módulo 3 – Parte 4: QR Code suspeito',
 '4':'Módulo 4: O perigo de compartilhar informações',
 '5':'Módulo 5: Armadilhas digitais'
};
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
async function senhaHash(senha){const salt=crypto.randomBytes(16).toString('hex');return salt+':'+(await scrypt(senha,salt,64)).toString('hex')}
async function confere(senha,valor){const [salt,h]=valor.split(':');const x=await scrypt(senha,salt,64);return crypto.timingSafeEqual(x,Buffer.from(h,'hex'))}
function erro(status,message){return Object.assign(new Error(message),{status})}
function texto(v,max=160){if(typeof v!=='string'||!v.trim()||v.length>max)throw erro(400,'Dados inválidos.');return v.trim()}
async function criarServidor(op={}){
 const root=op.root||__dirname,dbPath=op.dbPath||path.join(__dirname,'data','equaguard.sqlite');
 if(dbPath!==':memory:')fs.mkdirSync(path.dirname(dbPath),{recursive:true});
 const db=new DatabaseSync(dbPath);db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY,name TEXT NOT NULL,sector TEXT NOT NULL,profile TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,kind TEXT NOT NULL,principal TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS results(event_id TEXT PRIMARY KEY,player_id TEXT NOT NULL REFERENCES players(id),module_key TEXT NOT NULL,profile TEXT NOT NULL,payload TEXT NOT NULL,received_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS results_player ON results(player_id,module_key);
 CREATE TABLE IF NOT EXISTS progress(player_id TEXT NOT NULL REFERENCES players(id),module_key TEXT NOT NULL,completed_at TEXT NOT NULL,PRIMARY KEY(player_id,module_key));
 CREATE TABLE IF NOT EXISTS login_audit(id INTEGER PRIMARY KEY,username TEXT NOT NULL,ip TEXT NOT NULL,success INTEGER NOT NULL,created_at INTEGER NOT NULL);
 PRAGMA user_version=1;`);
 let senhaInicial=null;
 if(!db.prepare('SELECT id FROM users LIMIT 1').get()||op.resetAdmin){
  senhaInicial=op.adminPassword||process.env.EG_ADMIN_PASSWORD||crypto.randomBytes(12).toString('base64url');
  if(senhaInicial.length<12)throw Error('A senha inicial deve ter ao menos 12 caracteres.');
  const passwordHash=await senhaHash(senhaInicial);
  db.prepare('INSERT INTO users VALUES(?,?,?,?) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash').run(crypto.randomUUID(),'seguranca',passwordHash,new Date().toISOString());
  db.prepare("DELETE FROM sessions WHERE kind='admin'").run();
 }
 function json(res,status,d){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(d))}
 function cookie(req,n){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(n+'='))?.slice(n.length+1)||''}
 function sessao(req,kind){const token=cookie(req,kind==='admin'?'eg_admin':'eg_player');if(!token)return null;return db.prepare('SELECT * FROM sessions WHERE token_hash=? AND kind=? AND expires_at>?').get(hash(token),kind,Date.now())}
 function exige(req,kind){const s=sessao(req,kind);if(!s)throw erro(401,'Entre novamente para continuar.');return s}
 function criaSessao(res,kind,id){const token=crypto.randomBytes(32).toString('hex'),tempo=kind==='admin'?1800:30*86400;db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token),kind,id,Date.now()+tempo*1000);res.setHeader('Set-Cookie',`${kind==='admin'?'eg_admin':'eg_player'}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${tempo}${process.env.EG_COOKIE_SECURE==='1'?'; Secure':''}`)}
 async function corpo(req){
  if(!String(req.headers['content-type']||'').startsWith('application/json'))throw erro(415,'Envie JSON.');
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)throw erro(403,'Origem não permitida.');
  if(req.headers['sec-fetch-site']==='cross-site')throw erro(403,'Origem não permitida.');
  let data='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>65536)throw erro(413,'Dados muito grandes.');data+=chunk.toString('utf8')}
  try{const v=JSON.parse(data);if(!v||typeof v!=='object'||Array.isArray(v))throw Error();return v}catch{throw erro(400,'JSON inválido.')}
 }
 function jogador(id){const p=db.prepare('SELECT * FROM players WHERE id=?').get(id);if(!p)throw erro(401,'Participante não encontrado.');const prog={};db.prepare('SELECT module_key FROM progress WHERE player_id=?').all(id).forEach(r=>prog[r.module_key]=1);return {id:p.id,nome:p.name,setor:p.sector,perfil:p.profile,prog,ts:Date.now()}}
 function permitido(p,key){let pre=key==='1'?[]:key==='2'?['1']:key==='3'?['1','2']:key.startsWith('3t-')?['1','2','3']:key==='4'?['1','2','3']:['1','2','3','4'];if(key.startsWith('3t-')&&p.perfil!=='Técnico de campo')return false;if(['4','5'].includes(key)&&p.perfil==='Técnico de campo')pre.push('3t');return pre.every(k=>p.prog[k])}
 function resultado(d,p){
  const key=Object.keys(MODULOS).find(k=>MODULOS[k]===d.modulo);if(!key)throw erro(400,'Módulo inválido.');
  const evento=texto(d.eventoId,100);if(d.jogadorId!==p.id)throw erro(403,'Resultado pertence a outro participante.');
  const anterior=db.prepare('SELECT player_id FROM results WHERE event_id=?').get(evento);if(anterior){if(anterior.player_id!==p.id)throw erro(409,'Identificador já utilizado.');return {duplicado:true}}
  if(!p.perfil||!permitido(p,key))throw erro(409,'Conclua os módulos anteriores antes de avançar.');
  const total=key==='1'?6:key==='2'||key==='4'||key==='5'?2:1,max=key==='1'?105:total*10;
  const int=(v,limit)=>{if(!Number.isInteger(v)||v<0||v>limit)throw erro(400,'Pontuação inválida.');return v};
  const ac=int(d.acertos,total),er=int(d.erros,total),pa=int(d.parciais||0,total);if(ac+er+pa!==total)throw erro(400,'Quantidade de respostas inconsistente.');
  const pts=int(d.pontos,max),tent=int(d.tentativasErradas??d.quedas??er,50);
  const copia={eventoId:evento,jogadorId:p.id,nome:p.nome,setor:p.setor,perfil:p.perfil,modulo:MODULOS[key],dataHora:new Date().toISOString(),acertos:ac,erros:er,parciais:pa,pontos:pts,tentativasErradas:tent};
  for(const k of ['escolhas','selo','engSocial','engSocialPrimeira','engSocialEscolhas'])if(d[k]!=null)copia[k]=texto(d[k]||'—',2000);
  for(const k of ['quedas','reportouQueda'])if(d[k]!=null)copia[k]=int(d[k],50);
  db.exec('BEGIN IMMEDIATE');try{
   db.prepare('INSERT INTO results VALUES(?,?,?,?,?,?)').run(evento,p.id,key,p.perfil,JSON.stringify(copia),copia.dataHora);
   db.prepare('INSERT OR IGNORE INTO progress VALUES(?,?,?)').run(p.id,key,copia.dataHora);
   if(key.startsWith('3t-')&&db.prepare("SELECT COUNT(*) AS n FROM progress WHERE player_id=? AND module_key IN ('3t-1','3t-2','3t-3')").get(p.id).n===3)db.prepare('INSERT OR IGNORE INTO progress VALUES(?,?,?)').run(p.id,'3t',copia.dataHora);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}return {salvo:true,eventoId:evento};
 }
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  try{
   const url=new URL(req.url,'http://localhost'),route=url.pathname,method=req.method;
   if(route==='/api/login'&&method==='POST'){
    const d=await corpo(req),username=texto(d.usuario,80).toLowerCase(),senha=texto(d.senha,128),ip=req.socket.remoteAddress||'';
    if(db.prepare('SELECT COUNT(*) AS n FROM login_audit WHERE ip=? AND success=0 AND created_at>?').get(ip,Date.now()-15*60000).n>=10)throw erro(429,'Muitas tentativas. Aguarde 15 minutos.');
    const u=db.prepare('SELECT * FROM users WHERE username=?').get(username),ok=await confere(senha,u?.password_hash||'00000000000000000000000000000000:'+ '00'.repeat(64));
    db.prepare('INSERT INTO login_audit(username,ip,success,created_at) VALUES(?,?,?,?)').run(username,ip,u&&ok?1:0,Date.now());
    if(!u||!ok)throw erro(401,'Usuário ou senha inválidos.');criaSessao(res,'admin',u.id);return json(res,200,{usuario:u.username,expira:Date.now()+1800000});
   }
   if(route==='/api/session'&&method==='GET'){const s=exige(req,'admin');return json(res,200,{usuario:db.prepare('SELECT username FROM users WHERE id=?').get(s.principal).username,expira:s.expires_at})}
   if(route==='/api/logout'&&method==='POST'){await corpo(req);const s=sessao(req,'admin');if(s)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(s.token_hash);res.setHeader('Set-Cookie','eg_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true})}
   if(route==='/api/password'&&method==='POST'){
    const s=exige(req,'admin'),d=await corpo(req),u=db.prepare('SELECT * FROM users WHERE id=?').get(s.principal);if(!await confere(texto(d.atual,128),u.password_hash))throw erro(401,'Senha atual incorreta.');
    const nova=texto(d.nova,128);if(nova.length<12)throw erro(400,'Use ao menos 12 caracteres.');db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(await senhaHash(nova),u.id);db.prepare("DELETE FROM sessions WHERE principal=? AND kind='admin'").run(u.id);res.setHeader('Set-Cookie','eg_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});
   }
   if(route==='/api/players'&&method==='POST'){const d=await corpo(req),id=crypto.randomUUID();db.prepare('INSERT INTO players(id,name,sector,created_at) VALUES(?,?,?,?)').run(id,texto(d.nome,80),texto(d.setor,80),new Date().toISOString());const old=sessao(req,'player');if(old)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(old.token_hash);criaSessao(res,'player',id);return json(res,201,jogador(id))}
   if(route==='/api/player'&&method==='GET')return json(res,200,jogador(exige(req,'player').principal));
   if(route==='/api/player'&&method==='PATCH'){const s=exige(req,'player'),d=await corpo(req);if(!PERFIS.includes(d.perfil))throw erro(400,'Perfil inválido.');db.prepare('UPDATE players SET profile=? WHERE id=?').run(d.perfil,s.principal);return json(res,200,jogador(s.principal))}
   if(route==='/api/results'&&method==='POST'){const s=exige(req,'player'),d=await corpo(req);return json(res,200,resultado(d,jogador(s.principal)))}
   if(route==='/api/results'&&method==='GET'){exige(req,'admin');return json(res,200,{resultados:db.prepare('SELECT payload FROM results ORDER BY received_at,event_id').all().map(r=>JSON.parse(r.payload))})}
   if(route.startsWith('/api/'))throw erro(404,'Rota não encontrada.');
   if(!['GET','HEAD'].includes(method))throw erro(405,'Método não permitido.');
   const rel=decodeURIComponent(route==='/'?'/index.html':route).slice(1);
   if(!/^(index\.html|seguranca\.html|modulo[345](?:-tecnico)?\.html|(?:js|css|assets)\/[\w./-]+)$/.test(rel)||rel.split('/').includes('..'))throw erro(404,'Arquivo não encontrado.');
   const file=path.resolve(root,rel),real=fs.realpathSync(file),rootReal=fs.realpathSync(root);if(!real.startsWith(rootReal+path.sep))throw erro(404,'Arquivo não encontrado.');
   const tipos={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
   const type=tipos[path.extname(file)];if(!type)throw erro(404,'Arquivo não encontrado.');
   const data=await fs.promises.readFile(real);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(method==='HEAD'?undefined:data);
  }catch(e){const status=e.status||(e.code==='ENOENT'?404:500);if(status===500)console.error('Erro interno:',e.message);json(res,status,{erro:status===500?'Erro interno no servidor.':e.message})}
 });
 return {server,db,senhaInicial,close:()=>new Promise((resolve,reject)=>{server.close(e=>{db.close();e?reject(e):resolve()});server.closeIdleConnections()})};
}
if(require.main===module)criarServidor({resetAdmin:process.argv.includes('--reset-admin')}).then(app=>{
 if(process.argv.includes('--init')){if(app.senhaInicial)console.log(`Usuário: seguranca\nSenha inicial: ${app.senhaInicial}`);else console.log('Banco já inicializado.');app.db.close();return}
 const port=Number(process.env.PORT||3000);app.server.listen(port,'127.0.0.1',()=>{console.log(`EquaGuard: http://127.0.0.1:${port}`);if(app.senhaInicial)console.log(`Acesso inicial — usuário: seguranca | senha: ${app.senhaInicial}\nGuarde esta senha. Ela não será exibida novamente.`)});
 app.server.on('error',e=>{console.error(e.message);process.exitCode=1;app.db.close()});
 for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>app.close().then(()=>process.exit(0)));
}).catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={criarServidor};
