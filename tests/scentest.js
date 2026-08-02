const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','simulateur-pv.html'),'utf8');
const js=src.slice(src.indexOf('<script>')+8, src.indexOf('</script>'));
const vals={}; const re=/id="([A-Za-z]+)"[^>]*value="([^"]*)"/g; let m;
while(m=re.exec(src)) if(!(m[1] in vals)) vals[m[1]]=m[2];
const nodes={};
const mk=id=>({id,value:vals[id]??'',checked:false,textContent:'',innerHTML:'',dataset:{},style:{},
  type:id==='evOn'?'checkbox':'number',addEventListener(){},closest(){return null},insertAdjacentHTML(){}});
const _ls={};
global.localStorage={getItem:k=>_ls[k]??null,setItem:(k,v)=>{_ls[k]=String(v)},removeItem:k=>{delete _ls[k]}};
global.document={getElementById:id=>nodes[id]||(nodes[id]=mk(id)),addEventListener(){},
  querySelector(){return null},querySelectorAll(){return Object.values(nodes).filter(n=>n.id&&n.type)},
  createElement(){return {click(){},style:{}}}};
global.window=global; global.performance={now:()=>Date.now()};
global.confirm=()=>true; global.prompt=()=>'Mon toit';
global.Blob=function(){}; global.URL={createObjectURL:()=>''};
const M=new Function(js+'\n;return {PRESETS,DEFAUT_GENERIQUE,PRESET_JIM,appliquer,snapshotParams,'
  +'enregistrerScen,lsGet,reinit,DT,APPL,RESULTS};')();
const {PRESETS,DEFAUT_GENERIQUE,PRESET_JIM,appliquer,snapshotParams,enregistrerScen,lsGet,reinit}=M;

const etat=()=>{const s=snapshotParams();
  return {capex:s.inp.capexPv,pvA:s.inp.pvA||'(vide)',base:s.inp.baseKwh,
          nApp:s.APPL.length,clim:s.APPL.some(a=>/clim/i.test(a.n))?'oui':'non',
          refSud:s.inp.refSud};};
console.log('presets disponibles :',Object.keys(PRESETS).join(' | '));
console.log('\n1. au démarrage (générique)   :',JSON.stringify(etat()));
appliquer(JSON.parse(JSON.stringify(PRESET_JIM)));
console.log('2. après chargement Woluwe    :',JSON.stringify(etat()));
enregistrerScen();
console.log('3. scénario enregistré        :',Object.keys(lsGet().scenarios||{}).join(', '));
reinit();
console.log('4. après réinitialisation     :',JSON.stringify(etat()));
appliquer(JSON.parse(JSON.stringify(lsGet().scenarios['Mon toit'])));
console.log('5. rechargement du scénario   :',JSON.stringify(etat()));
console.log('\ncourant mémorisé en localStorage :',lsGet().courant?'oui':'non');
console.log('taille du stockage :',JSON.stringify(lsGet()).length,'caracteres');
const j=PRESET_JIM;
console.log('\nintégrité du preset Woluwe : ',
  j.inp.pvA==='850.4'&&j.inp.pvB==='834.06'&&j.inp.capexPv==='5102'
  &&j.APPL.length===8&&j.DT.length===3 ? 'conforme' : 'INCOMPLET');
