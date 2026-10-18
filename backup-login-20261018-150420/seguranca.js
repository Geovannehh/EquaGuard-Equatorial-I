(function(){
 'use strict';
 var $=function(id){return document.getElementById(id)},visiveis=[];
 function dados(){try{var a=JSON.parse(localStorage.getItem('equaguard_resultados')||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
 function identidade(r){return r.jogadorId||r.nome+'|'+r.setor}
 function celula(tr,valor){var td=document.createElement('td');td.textContent=valor;tr.appendChild(td)}
 function numero(v){return Math.max(0,Number(v)||0)}
 function render(){
  var todos=dados(),ultimos=new Map();
  todos.forEach(function(r){ultimos.set(identidade(r)+'|'+r.modulo,r)});
  visiveis=Array.from(ultimos.values()).filter(function(r){return (!$('area').value||r.setor===$('area').value)&&(!$('perfil').value||r.perfil===$('perfil').value)&&(!$('desde').value||new Date(r.dataHora)>=new Date($('desde').value+'T00:00:00'))});
  var jogadores=new Map(),mods=new Map(),ac=0,total=0;
  $('linhas').replaceChildren();$('modulos').replaceChildren();
  visiveis.forEach(function(r){
   var id=identidade(r);if(!jogadores.has(id))jogadores.set(id,{perfil:r.perfil,mods:new Set()});
   jogadores.get(id).mods.add(r.modulo);
   var a=numero(r.acertos),er=numero(r.erros),t=a+er+numero(r.parciais);ac+=a;total+=t;
   if(!mods.has(r.modulo))mods.set(r.modulo,{n:0,a:0,t:0});var m=mods.get(r.modulo);m.n++;m.a+=a;m.t+=t;
   var tr=document.createElement('tr');[new Date(r.dataHora).toLocaleString('pt-BR'),r.nome,r.setor+' / '+(r.perfil||'Não informado'),r.modulo,a+' / '+er+(r.tentativasErradas?' · '+r.tentativasErradas+' tentativas erradas':''),r.pontos==null?'—':r.pontos,r.escolhas||r.engSocialEscolhas||'—'].forEach(function(v){celula(tr,v)});$('linhas').appendChild(tr);
  });
  var completos=0;jogadores.forEach(function(j){var lista=Array.from(j.mods);if([1,2,3,4,5].every(function(n){return lista.some(function(m){return m.indexOf('Módulo '+n+':')===0})})&&(j.perfil!=='Técnico de campo'||[2,3,4].every(function(n){return lista.some(function(m){return m.indexOf('Módulo 3 – Parte '+n+':')===0})})))completos++});
  $('participantes').textContent=jogadores.size;$('resultados').textContent=visiveis.length;$('acerto').textContent=total?Math.round(100*ac/total)+'%':'—';$('concluidos').textContent=completos;
  $('estado').textContent=visiveis.length?'Atualizado com os resultados locais.':'Nenhum resultado encontrado. Conclua um módulo ou ajuste os filtros.';
  mods.forEach(function(m,nome){var tr=document.createElement('tr'),taxa=m.t?m.a/m.t:null;[nome,m.n,taxa===null?'—':Math.round(taxa*100)+'%',m.n<3?'Amostra insuficiente (mínimo 3)':taxa<0.7?'Priorizar reforço':taxa<0.85?'Revisar pontos de atenção':'Manter acompanhamento'].forEach(function(v){celula(tr,v)});$('modulos').appendChild(tr)});
 }
 function opcoes(){var a=dados();['area','perfil'].forEach(function(id){var campo=id==='area'?'setor':'perfil',sel=$(id),atual=sel.value;while(sel.options.length>1)sel.remove(1);Array.from(new Set(a.map(function(r){return r[campo]}).filter(Boolean))).sort().forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o)});sel.value=atual})}
 ['area','perfil','desde'].forEach(function(id){$(id).addEventListener('change',render)});
 $('exportar').addEventListener('click',function(){var campos=['dataHora','jogadorId','nome','setor','perfil','modulo','acertos','parciais','erros','tentativasErradas','pontos','escolhas'];function csv(v){var s=String(v==null?'':v);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}var texto=[campos.map(csv).join(';')].concat(visiveis.map(function(r){return campos.map(function(c){return csv(r[c])}).join(';')})).join('\r\n');var url=URL.createObjectURL(new Blob(['\ufeff'+texto],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='equaguard-seguranca.csv';a.click();setTimeout(function(){URL.revokeObjectURL(url)},1000)});
 window.addEventListener('storage',function(){opcoes();render()});opcoes();render();
})();
