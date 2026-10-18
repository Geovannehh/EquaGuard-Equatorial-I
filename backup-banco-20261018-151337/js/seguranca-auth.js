/* Acesso de demonstração. Autenticação corporativa exige validação no servidor.
   Altere as credenciais abaixo para a apresentação. Não use senhas reais. */
window.EGSeguranca=(function(){
 'use strict';
 var USUARIO='seguranca',SENHA='EquaGuard@2026',CHAVE='equaguard_seguranca_sessao',DURACAO=30*60*1000;
 var expira=0,timer;
 var $=function(id){return document.getElementById(id)};
 function limpar(){
  ['linhas','modulos'].forEach(function(id){$(id).replaceChildren()});
  ['participantes','resultados','concluidos'].forEach(function(id){$(id).textContent='0'});
  $('acerto').textContent='—';$('estado').textContent='';
 }
 function sair(mensagem){
  expira=0;clearTimeout(timer);try{sessionStorage.removeItem(CHAVE)}catch(e){}
  $('painel-seguranca').hidden=true;$('login-seguranca').hidden=false;
  $('login-senha').value='';$('login-erro').textContent=mensagem||'';limpar();
  window.dispatchEvent(new Event('equaguard:logout'));$('login-usuario').focus();
 }
 function autorizado(){if(expira>Date.now())return true;if(expira)sair('Sua sessão expirou. Entre novamente.');return false}
 function abrir(){
  $('login-seguranca').hidden=true;$('painel-seguranca').hidden=false;$('login-senha').value='';$('login-erro').textContent='';
  clearTimeout(timer);timer=setTimeout(function(){sair('Sua sessão expirou. Entre novamente.')},Math.max(0,expira-Date.now()));
  window.dispatchEvent(new Event('equaguard:login'));$('titulo-painel').focus();
 }
 $('login-form').addEventListener('submit',function(ev){
  ev.preventDefault();
  if($('login-usuario').value.trim().toLowerCase()!==USUARIO||$('login-senha').value!==SENHA){$('login-erro').textContent='Usuário ou senha inválidos.';$('login-senha').value='';$('login-senha').focus();return}
  expira=Date.now()+DURACAO;try{sessionStorage.setItem(CHAVE,JSON.stringify({expira:expira}))}catch(e){}abrir();
 });
 $('login-mostrar').addEventListener('click',function(){var mostrar=$('login-senha').type==='password';$('login-senha').type=mostrar?'text':'password';this.textContent=mostrar?'Ocultar senha':'Mostrar senha';this.setAttribute('aria-pressed',String(mostrar))});
 $('sair-seguranca').addEventListener('click',function(){sair()});
 window.addEventListener('pageshow',function(){if(expira)autorizado()});
 document.addEventListener('visibilitychange',function(){if(!document.hidden&&expira)autorizado()});
 try{var sessao=JSON.parse(sessionStorage.getItem(CHAVE)||'null');if(sessao&&Number.isFinite(sessao.expira)&&sessao.expira>Date.now()&&sessao.expira<=Date.now()+DURACAO)expira=sessao.expira}catch(e){}
 if(expira)abrir();else sair();
 return {autorizado:autorizado};
})();
