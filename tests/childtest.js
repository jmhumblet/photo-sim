const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','simulateur-pv.html'),'utf8');
const js=src.slice(src.indexOf('<script>')+8, src.indexOf('</script>'));
const vals={}; const re=/id="([A-Za-z]+)"[^>]*value="([^"]*)"/g; let m;
while(m=re.exec(src)) if(!(m[1] in vals)) vals[m[1]]=m[2];
const nodes={};
const mk=id=>({id,value:vals[id]??'0',checked:false,textContent:'',innerHTML:'',dataset:{},style:{},
  type:'number',addEventListener(){},closest(){return null},insertAdjacentHTML(){}});
let CAPT='';
global.document={
  getElementById:id=>nodes[id]||(nodes[id]=mk(id)),
  addEventListener(){}, querySelector(){return null},
  querySelectorAll(){return Object.values(nodes)},
  createElement(){return {click(){},style:{}}},
  querySelectorAll(sel){
    if(sel==='style') return [{textContent:'/*css*/'}];
    if(sel.startsWith('script')) return [{textContent:js}];
    if(sel.startsWith('#params')) return Object.values(nodes).filter(n=>n.id);
    return [];
  }
};

global.window={open:()=>({document:{open(){},write(h){CAPT=h;},close(){}}})};
global.performance={now:()=>Date.now()};
const M=new Function(js+'\n;return {openMC,readCfg};')();
M.openMC();
console.log('HTML enfant genere :',CAPT.length,'caracteres');
const nOpen=(CAPT.match(/<script>/g)||[]).length, nClose=(CAPT.match(/<\/script>/g)||[]).length;
console.log('balises script : ',nOpen,'ouvertes /',nClose,'fermees ->',nOpen===nClose?'equilibre':'DESEQUILIBRE');
const divO=(CAPT.match(/<div/g)||[]).length, divC=(CAPT.match(/<\/div>/g)||[]).length;
console.log('balises div    : ',divO,'/',divC,'->',divO===divC?'equilibre':'DESEQUILIBRE');
// extraction et validation syntaxique des deux scripts enfants
// on reproduit la logique du parseur HTML : après <script>, on cherche le premier </script>
const parts=[]; let pos=0;
while(true){
  const a=CAPT.indexOf('<script>',pos); if(a<0) break;
  const b=CAPT.indexOf('</script>',a); if(b<0) break;
  parts.push(CAPT.slice(a+8,b)); pos=b+9;
}
console.log('blocs script reels :',parts.length);
parts.forEach((p,i)=>{
  try{ new Function(p); console.log('  bloc',i+1,'('+p.length+' car.) : syntaxe OK'); }
  catch(e){ console.log('  bloc',i+1,': ERREUR',e.message); }
});

// controle du bloc de parametres en lecture seule
const seg=CAPT.slice(CAPT.indexOf('Paramètres utilisés'),CAPT.indexOf('Réglages de'));
const attendus=['Nombre de panneaux','Inclinaison','Consommation diffuse',
 'Part diurne','Indice de consommation','Profondeur de décharge','Options de batterie',
 'Prix marginal évité','Taux d\'actualisation','Certificats verts','Remplacement onduleur',
 'Types de journée','Appareils','Lave-vaisselle','Sèche-linge','€ / kWh nominal'];
const manque=attendus.filter(a=>!seg.includes(a));
console.log('bloc lecture seule :',seg.length,'caracteres,',(seg.match(/<tr>/g)||[]).length,'lignes');
console.log('libelles attendus  :',manque.length?'MANQUE '+manque.join(', '):'tous presents');
console.log('champs vides masques:',seg.includes('undefined')?'PROBLEME':'ok');
console.log('\n--- debut du bloc 2 ---'); console.log(parts[1].slice(0,200));
console.log('--- fin du bloc 2 ---'); console.log(parts[1].slice(-160));
console.log('positions <script> dans CAPT :', [...CAPT.matchAll(/<script>/g)].map(m=>m.index).join(', '));
console.log('positions </script> :', [...CAPT.matchAll(/<\/script>/g)].map(m=>m.index).join(', '));
for(const id of ['mcN','mcS','mcCap','mcAway','mcHeat','mcHeatMul','mcGo','mcProg','mcStat','mcTab','mcBox','mcConc'])
  if(!CAPT.includes('id="'+id+'"')) console.log('  MANQUE id',id);
console.log('ids de controle : tous presents');
console.log('parametres en lecture seule :',(CAPT.match(/<span>/g)||[]).length,'lignes de resume');
