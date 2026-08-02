const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','simulateur-pv.html'),'utf8');
const js=src.slice(src.indexOf('<script>')+8, src.indexOf('</script>'));
const vals={}; const re=/id="([A-Za-z]+)"[^>]*value="([^"]*)"/g; let m;
while(m=re.exec(src)) if(!(m[1] in vals)) vals[m[1]]=m[2];
const mk=id=>({value:vals[id]??'0',checked:false,textContent:'',innerHTML:'',dataset:{},style:{},
  addEventListener(){},closest(){return null}});
const nodes={};
global.document={getElementById:id=>nodes[id]||(nodes[id]=mk(id)),addEventListener(){},
  querySelector(){return null},querySelectorAll(){return Object.values(nodes)},createElement(){return{click(){},style:{}}}};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
global.window=global;
const M=new Function(js+'\n;return {appliquer,PRESET_JIM,readCfg,prepDT,simYear,setS:v=>{MC_S=v},mcOneDraw,PROFILS_MC};')();
M.appliquer(JSON.parse(JSON.stringify(M.PRESET_JIM)));
nodes.evOn.checked=true;
const cfg=M.readCfg(); M.prepDT(cfg);
console.log('part solaire du roulage selon la longueur de séquence (sans perturbation) :');
for(const S of [0,40,60,80,120,240]){
  M.setS(S);
  const t=M.simYear(cfg,0);
  console.log('  S='+String(S||'défaut').padStart(6),
    (100*t.evSun/(t.evSun+t.evGrid)).toFixed(1)+' %',
    '| jours sans trajet',t.evImmoJ.toFixed(0),
    '| roulage',t.evDrive.toFixed(0),'kWh');
}
M.setS(0);
console.log('\neffet des perturbations Monte-Carlo seules (S=40) :');
cfg._S=40; cfg._pAway=14/365; cfg._pHeat=10/123; cfg._heatMul=2.5;
for(const p of M.PROFILS_MC){
  let s=0; for(let d=0;d<40;d++) s+=M.mcOneDraw(cfg,0,p,1000003+d*7919).evSol0;
  console.log('  '+p.n.padEnd(11),(s/40).toFixed(1)+' %');
}
