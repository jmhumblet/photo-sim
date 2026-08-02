const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','simulateur-pv.html'),'utf8');
const js=src.slice(src.indexOf('<script>')+8, src.indexOf('</script>'));
const vals={}; const re=/id="([A-Za-z]+)"[^>]*value="([^"]*)"/g; let m;
while(m=re.exec(src)) if(!(m[1] in vals)) vals[m[1]]=m[2];
const nodes={};
const mk=id=>({value:vals[id]??'0',checked:false,textContent:'',innerHTML:'',dataset:{},style:{},
  addEventListener(){},closest(){return null},insertAdjacentHTML(){}});
global.document={getElementById:id=>nodes[id]||(nodes[id]=mk(id)),addEventListener(){},
  querySelector(){return null},
  querySelectorAll(){return Object.values(nodes)},
  createElement(){return {click(){},style:{}}},querySelectorAll(){return[]}};
const _ls={};
global.localStorage={getItem:k=>_ls[k]??null,setItem:(k,v)=>{_ls[k]=String(v)},removeItem:k=>{delete _ls[k]}};
global.window=global; global.performance={now:()=>Date.now()};
const M=new Function(js+'\n;return {readCfg,prepDT,mcOneDraw,PROFILS_MC,refConso,simYear};')();
const {readCfg,prepDT,mcOneDraw,PROFILS_MC,refConso}=M;

document.getElementById('evOn').checked = process.argv.includes('--ve');
const cfg=readCfg();
cfg._S=40; cfg._pAway=14/365; cfg._pHeat=10/123; cfg._heatMul=2.5;
prepDT(cfg);
const capU=+(document.getElementById("mcCap").value||5.22);
console.log('capacité utile testée :',capU.toFixed(2),'kWh | conso nominale',refConso(cfg).toFixed(0),
  'kWh | véhicule',cfg.evOn?'actif':'inactif');

console.log('\nChronométrage sur 20 tirages × 3 profils :');
let t0=Date.now(); let n=0;
for(let d=0;d<20;d++) PROFILS_MC.forEach((p,i)=>{ mcOneDraw(cfg,capU,p,1000003*(i+1)+d*7919); n++; });
const per=(Date.now()-t0)/n;
console.log('  ',per.toFixed(1),'ms par tirage-profil →',(per*600*3/1000).toFixed(0),'s pour 600 tirages');

console.log('\nRésultats sur 120 tirages :');
const res={};
PROFILS_MC.forEach(p=>res[p.k]={b0:[],b1:[],cons:[],sol0:[],sol1:[],immo:[]});
t0=Date.now();
for(let d=0;d<120;d++) PROFILS_MC.forEach((p,i)=>{
  const r=mcOneDraw(cfg,capU,p,1000003*(i+1)+d*7919);
  res[p.k].b0.push(r.b0); res[p.k].b1.push(r.b1); res[p.k].cons.push(r.cons);
  res[p.k].sol0.push(r.evSol0); res[p.k].sol1.push(r.evSol1); res[p.k].immo.push(r.immo);});
const moy=a=>a.reduce((x,y)=>x+y,0)/a.length;
const q=(a,p)=>{const b=[...a].sort((x,y)=>x-y);return b[Math.floor((b.length-1)*p)];};
console.log('profil      | conso  | facture sans batt (P10 / méd / P90) | gain batterie');
for(const p of PROFILS_MC){
  const R=res[p.k];
  console.log('  '+p.n.padEnd(11)+'|'+moy(R.cons).toFixed(0).padStart(7)+' |'
   +q(R.b0,.1).toFixed(0).padStart(9)+' /'+q(R.b0,.5).toFixed(0).padStart(6)+' /'
   +q(R.b0,.9).toFixed(0).padStart(6)+' € |'
   +(moy(R.b0)-moy(R.b1)).toFixed(0).padStart(11)+' €');
}
if(cfg.evOn){
  console.log('\nVéhicule : part du roulage venant du soleil');
  console.log('profil      | sans batt (P10/méd/P90) | avec batt | jours sans trajet');
  for(const p of PROFILS_MC){ const R=res[p.k];
    console.log('  '+p.n.padEnd(11)+'|'+q(R.sol0,.1).toFixed(0).padStart(7)+' /'
     +q(R.sol0,.5).toFixed(0).padStart(5)+' /'+q(R.sol0,.9).toFixed(0).padStart(5)+' % |'
     +moy(R.sol1).toFixed(0).padStart(9)+' % |'+moy(R.immo).toFixed(0).padStart(15)+' j');}
  const ecart=q(res.normal.sol0,.9)-q(res.normal.sol0,.1);
  const disc=moy(res.rigoureux.sol0)-moy(res.insouciant.sol0);
  console.log(`  dispersion d'une année à l'autre ${ecart.toFixed(0)} pts`
    +` | effet de la discipline ${disc.toFixed(0)} pts`);
}
console.log('\ndurée réelle',( (Date.now()-t0)/1000 ).toFixed(1),'s pour 120×3');
