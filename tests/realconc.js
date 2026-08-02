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
global.window=global; global.performance={now:()=>0};
const M=new Function(js+'\n;return {mcRender,mcInit,mcOneDraw,MCstate,PROFILS_MC,readCfg,prepDT,q,moy};')();
nodes.evOn.checked=true;                       // valeurs par défaut + véhicule
const cfg=M.readCfg();
cfg._S=40; cfg._pAway=14/365; cfg._pHeat=10/123; cfg._heatMul=2.5;
M.prepDT(cfg); M.mcInit();
const N=+(process.argv[2]||150), capU=+(document.getElementById('mcCap').value||5.22);
for(let d=0;d<N;d++) M.PROFILS_MC.forEach((p,i)=>{
  const r=M.mcOneDraw(cfg,capU,p,1000003*(i+1)+d*7919), R=M.MCstate.res[p.k];
  R.bill0.push(r.b0); R.bill1.push(r.b1); R.gain.push(r.b0-r.b1); R.cons.push(r.cons);
  R.evSol0.push(r.evSol0); R.evSol1.push(r.evSol1); R.evGrid0.push(r.evGrid0); R.immo.push(r.immo);});
M.MCstate.done=N;
M.mcRender(cfg,capU,capU);
console.log(nodes.mcConc.innerHTML.replace(/<[^>]+>/g,'').replace(/[ \t]+/g,' ').trim());
