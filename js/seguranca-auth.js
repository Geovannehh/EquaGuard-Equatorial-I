/* A sessão é validada no servidor; o navegador recebe somente cookie HttpOnly. */
window.EGSeguranca=(function(){
 'use strict';var expira=0,timer,$=function(id){return document.getElementById(id)};
 async function api(url,body){if(location.protocol==='file:')throw Error('Abra http://127.0.0.1:3000/seguranca.html com o servidor iniciado.');var r=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});var d=await r.json();if(!r.ok){var e=Error(d.erro||'Falha ao acessar o servidor.');e.status=r.status;throw e}return d}
 function bloquear(msg){expira=0;clearTimeout(timer);$('painel-seguranca').hidden=true;$('login-seguranca').hidden=false;$('login-senha').value='';$('login-senha').type='password';$('login-mostrar').textContent='Mostrar senha';$('login-mostrar').setAttribute('aria-pressed','false');$('login-erro').textContent=msg||'';['linhas','modulos'].forEach(function(id){$(id).replaceChildren()});['participantes','resultados','concluidos'].forEach(function(id){$(id).textContent='0'});$('acerto').textContent='—';window.dispatchEvent(new Event('equaguard:logout'))}
 function abrir(s){expira=s.expira;$('login-seguranca').hidden=true;$('painel-seguranca').hidden=false;$('login-senha').value='';clearTimeout(timer);timer=setTimeout(function(){bloquear('Sua sessão expirou. Entre novamente.')},Math.max(0,expira-Date.now()));window.dispatchEvent(new Event('equaguard:login'));$('titulo-painel').focus()}
 function autorizado(){if(expira>Date.now())return true;if(expira)bloquear('Sua sessão expirou. Entre novamente.');return false}
 $('login-form').addEventListener('submit',async function(ev){ev.preventDefault();var b=this.querySelector('[type=submit]');b.disabled=true;try{abrir(await api('/api/login',{usuario:$('login-usuario').value,senha:$('login-senha').value}))}catch(e){bloquear(e.message)}finally{b.disabled=false}});
 $('sair-seguranca').addEventListener('click',async function(){try{await api('/api/logout',{});bloquear()}catch(e){$('estado').textContent='Não foi possível encerrar a sessão no servidor. Tente novamente.'}});
 $('login-mostrar').addEventListener('click',function(){var mostrar=$('login-senha').type==='password';$('login-senha').type=mostrar?'text':'password';this.textContent=mostrar?'Ocultar senha':'Mostrar senha';this.setAttribute('aria-pressed',String(mostrar))});
 $('senha-form').addEventListener('submit',async function(ev){ev.preventDefault();var b=this.querySelector('[type=submit]');b.disabled=true;try{await api('/api/password',{atual:$('senha-atual').value,nova:$('senha-nova').value});this.reset();bloquear('Senha alterada. Entre com a nova senha.')}catch(e){$('senha-erro').textContent=e.message}finally{b.disabled=false}});
 async function verificar(){try{abrir(await api('/api/session'))}catch(e){bloquear(e.status===401?'':e.message)}}
 document.addEventListener('visibilitychange',function(){if(!document.hidden&&expira)verificar()});
 bloquear();setTimeout(verificar,0);
 return {autorizado:autorizado,api:api,bloquear:bloquear};
})();
