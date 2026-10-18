/* Estado de interface em cache; resultados e progresso persistem no servidor. */
var EG=(function(){
 var KEY='equaguard_jogador',FILA='equaguard_fila_banco',sincronizando=null,d={id:'',nome:'',setor:'',perfil:'',prog:{},ts:0};
 function ler(k,padrao){try{return JSON.parse(localStorage.getItem(k))||padrao}catch(e){return padrao}}
 function gravar(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){notificar('Não foi possível guardar os dados neste navegador.')}}
 function notificar(msg){var e=document.getElementById('eg-sync');if(!e){e=document.createElement('p');e.id='eg-sync';e.setAttribute('role','status');e.style.cssText='position:fixed;bottom:10px;left:16px;right:16px;z-index:9999;background:#213750;color:#fff;padding:12px 18px;border:1px solid #f5c242;border-radius:8px;margin:0;font:14px system-ui';document.body.appendChild(e)}e.textContent=msg;e.hidden=!msg}
 async function api(url,method,body){
  if(location.protocol==='file:')throw Error('Abra o jogo pelo servidor: http://127.0.0.1:3000');
  var r=await fetch(url,{method:method||'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  var v=await r.json();if(!r.ok){var err=Error(v.erro||'Não foi possível salvar os dados.');err.status=r.status;throw err}return v;
 }
 function atualizar(p){d=p;EG.d=d;gravar(KEY,d)}
 function fila(){var f=ler(FILA,[]);return Array.isArray(f)?f:[]}
 function sincronizar(){
  if(sincronizando)return sincronizando;
  sincronizando=(async function(){
   var enviou=false,r;
   while((r=fila().find(function(x){return x.jogadorId===d.id}))){await api('/api/results','POST',r);gravar(FILA,fila().filter(function(x){return x.eventoId!==r.eventoId}));enviou=true}
   if(enviou)notificar('Resultados salvos.');
  })().finally(function(){sincronizando=null});return sincronizando;
 }
 return {d:d,api:api,restaurar:atualizar,notificar:notificar,sincronizar:sincronizar,uid:function(){return crypto.randomUUID()},
  novoJogador:async function(nome,setor){await EG.ready;await sincronizar();atualizar(await api('/api/players','POST',{nome:nome,setor:setor}));notificar('')},
  salvarPerfil:async function(perfil){await sincronizar();atualizar(await api('/api/player','PATCH',{perfil:perfil}))},
  concluir:function(n){d.prog[n]=1;d.ts=Date.now();gravar(KEY,d)},feito:function(n){return !!d.prog[n]},
  pode:function(n){
   if(!d.id||!d.perfil)return false;var req={'1':[],'2':['1'],'3':['1','2'],'3t':['1','2','3'],'4':['1','2','3'],'5':['1','2','3','4']};
   if(!req[n]||(n==='3t'&&d.perfil!=='Técnico de campo'))return false;
   if((n==='4'||n==='5')&&d.perfil==='Técnico de campo'&&!d.prog['3t'])return false;
   return req[n].every(function(k){return !!d.prog[k]});
  },
  registrar:function(r){var registro=Object.assign({},r,{eventoId:EG.uid(),jogadorId:d.id,perfil:d.perfil,nome:d.nome,setor:d.setor});var f=fila();f.push(registro);gravar(FILA,f);sincronizar().catch(function(e){notificar('Resultado aguardando envio. '+e.message)})}
 };
})();
EG.tempos=[];
EG.agendar=function(f,ms){var id=setTimeout(function(){EG.tempos=EG.tempos.filter(function(t){return t!==id});f()},ms);EG.tempos.push(id);return id};
EG.cancelarPendencias=function(){EG.tempos.forEach(clearTimeout);EG.tempos=[]};
EG.ready=(async function(){
 try{EG.restaurar(await EG.api('/api/player'));await EG.sincronizar();EG.restaurar(await EG.api('/api/player'))}catch(e){if(e.status!==401)EG.notificar(e.message)}
 var pagina=location.pathname.split('/').pop(),rotas={'modulo3.html':'3','modulo3-tecnico.html':'3t','modulo4.html':'4','modulo5.html':'5'};
 if(rotas[pagina]&&!EG.pode(rotas[pagina]))location.replace('index.html'+(EG.d.id?'?modulos=1':''));
})();
function enviarDados(r){EG.registrar(r)}
window.addEventListener('online',function(){EG.sincronizar().catch(function(e){EG.notificar(e.message)})});
window.addEventListener('load',function(){var b=document.getElementById('voltaMod');if(b)b.addEventListener('click',function(){location.href='index.html?modulos=1'})});
