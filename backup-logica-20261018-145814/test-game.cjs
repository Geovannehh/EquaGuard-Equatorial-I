const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const base='tmp/equaguard-bugfix/js/';
function app(files){
 const elements=new Map(),storage={},timers=new Map();let tid=0;
 function element(id){if(!elements.has(id))elements.set(id,{id,hidden:false,disabled:false,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(n,f){(this.listeners[n]??=[]).push(f)},click(){if(!this.disabled)(this.listeners.click||[]).forEach(f=>f.call(this,{target:this}))},focus(){},scrollIntoView(){},scrollTo(){},setAttribute(){},removeAttribute(){},querySelector(){return element(id+'child')},querySelectorAll(){return[]},appendChild(){},remove(){},value:'',innerHTML:'',textContent:''});return elements.get(id)}
 const ctx={console,Date,Math,JSON,Map,Set,Event:function(){},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},location:{pathname:'/index.html',search:'',replace(v){this.redirect=v}},window:{addEventListener(){},dispatchEvent(){},scrollTo(){}},document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>element('created'+(++tid)),addEventListener(){}},setTimeout:f=>{timers.set(++tid,f);return tid},clearTimeout:id=>timers.delete(id),fetch:()=>Promise.resolve()};
 vm.createContext(ctx);for(const file of ['eg-dados.js',...files])vm.runInContext(fs.readFileSync(base+file,'utf8'),ctx,{filename:file});return {c:ctx,e:element,storage,timers};
}
let {c,e}=app(['index-core.js','index-social.js','index-modulo2.js']);
c.EG.novoJogador('Ana','TI');c.EG.salvarPerfil('TI');assert.equal(c.EG.pode('4'),false);
['1','2','3'].forEach(k=>c.EG.concluir(k));assert.equal(c.EG.pode('4'),true);
c.EG.salvarPerfil('Técnico de campo');assert.equal(c.EG.pode('4'),false);assert.equal(c.EG.pode('3t'),true);
c.EG.concluir('3t');assert.equal(c.EG.pode('4'),true);assert.equal(c.EG.pode('5'),false);c.EG.concluir('4');assert.equal(c.EG.pode('5'),true);
c.mod1Done=true;c.mod2Done=true;c.EG.novoJogador('Bia','Operações');c.atualizaModulos();assert.equal(c.mod1Done,false);assert.equal(e('mod2').disabled,true);
c.pontos=60;c.resp={0:'sus'};c.socialFeito=true;c.reiniciarM1();assert.equal(c.pontos,0);assert.equal(c.socialFeito,false);assert.equal(Object.keys(c.resp).length,0);
let enviado;c.enviarDados=d=>enviado=d;c.resp={0:'sus',1:'caiu',2:'sus',3:'seg',4:'sus',5:'seg'};c.enviarResultado('Teste');assert.equal(enviado.acertos,5);assert.equal(enviado.erros,1);
c.reiniciarM1();c.aberto=0;c.resp={0:'sus'};c.caiu('link');assert.equal(c.quedas,0);
let abriu=0;c.abrirEmail=()=>abriu++;const handler=e('mread').listeners.click[0];const choice={id:'',dataset:{r:'sus'},closest:()=>null};c.aberto=0;c.resp={};handler({target:choice});handler({target:choice});assert.equal(c.pontos,10);assert.equal(abriu,1);
c.enviado=false;c.socialFeito=false;c.mostrarRes();assert.equal(c.EG.feito('1'),false);
let calls=0;c.EG.agendar(()=>calls++,100);c.EG.cancelarPendencias();assert.equal(c.EG.tempos.length,0);
({c,e}=app(['modulo4.js']));c.enviarDados=d=>enviado=d;c.m4.erros=2;c.m5.erros=1;c.enviar();assert.equal(enviado.acertos+enviado.erros,2);assert.equal(enviado.tentativasErradas,3);assert(c.M4.certo.includes('imagem inteira'));
({c,e}=app(['modulo5.js']));c.enviarDados=d=>enviado=d;c.a1.erros=3;c.a2={erros:2,escolhas:[]};c.enviar();assert.equal(enviado.acertos+enviado.erros,2);assert.equal(enviado.tentativasErradas,5);
let terminou=0;c.FN={concluido:false,fim:()=>terminou++};c.fechaFone();assert.equal(terminou,0);c.FN.concluido=true;c.fechaFone();c.fechaFone();assert.equal(terminou,1);
for(const [file,button] of [['modulo3.js','m3Done'],['modulo3-tecnico.js','m3Done'],['modulo4.js','m5Done'],['modulo5.js','s2Done']]){
 const x=app([file]);if(file==='modulo3-tecnico.js')x.c.situacao(0);x.e(button).click();assert.equal(Object.keys(x.c.EG.d.prog).length,0,file+' não pode concluir sem resolver');
}
console.log('OK: progressão comum e técnica, nova identidade, reinício, pontuação de phishing, cliques duplicados, conclusão antecipada nos quatro fluxos, cancelamento de temporizadores, métricas M4/M5 e confirmação de chamado.');
