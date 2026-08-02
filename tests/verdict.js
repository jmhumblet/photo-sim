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
const _ls={}; global.localStorage={getItem:k=>_ls[k]??null,setItem:(k,v)=>{_ls[k]=String(v)},removeItem(){}};
global.window=global; global.confirm=()=>true; global.alert=()=>{};
const M=new Function(js+'\n;return {appliquer,PRESET_JIM,PRESETS,run,getRES:()=>RESULTS,readCfg,BATT,refConso,simYear,economics};')();
M.appliquer(JSON.parse(JSON.stringify(M.PRESET_JIM)));
M.run();
const cfg=M.readCfg(), R=M.getRES();
const e=n=>n.toLocaleString('fr-BE',{maximumFractionDigits:0});
const e1=n=>n.toLocaleString('fr-BE',{maximumFractionDigits:1});
console.log('conso de référence',e(M.refConso(cfg)),'kWh | production an 1',e(cfg.prodY1),'kWh | kWc',cfg.kwc);
console.log('\n== options ==');
console.log('option'.padEnd(34),'util'.padStart(6),'invest'.padStart(8),'coût én.'.padStart(9),
  'gain/an'.padStart(8),'auto'.padStart(6),'TRI'.padStart(6),'VAN25'.padStart(8),'retour'.padStart(7));
for(const r of R) console.log(
  (r.cap?(r.lab||''):'Sans batterie').slice(0,34).padEnd(34),
  (r.cap?e1(r.cap):'—').padStart(6), e(r.capex).padStart(8), e(r.cost).padStart(9),
  e(r.gain).padStart(8), (100*r.auto).toFixed(1).padStart(6),
  (100*r.e.irr).toFixed(1).padStart(6), e(r.e.npv).padStart(8),
  (r.e.pb?e1(r.e.pb)+'a':'jamais').padStart(7));
console.log('\n== gains marginaux ==');
for(let i=1;i<R.length;i++){
  const a=R[i-1], b=R[i];
  const dCap=b.prix-a.prix, dGain=b.gain-a.gain;
  // TRI/VAN du seul incrément : flux = différence des flux nets
  const fl=b.e.rows.map((x,k)=>x.net-a.e.rows[k].net);
  let npv=-dCap; fl.forEach((f,k)=>npv+=f/Math.pow(1+cfg.disc/100,k+1));
  let lo=-0.95,hi=2; for(let t=0;t<200;t++){const mm=(lo+hi)/2; let v=-dCap;
    fl.forEach((f,k)=>v+=f/Math.pow(1+mm,k+1)); if(v>0) lo=mm; else hi=mm;}
  let cum=-dCap,pb=null; fl.forEach((f,k)=>{const p=cum;cum+=f;if(pb===null&&cum>=0)pb=k+(-p)/f;});
  console.log(`${(a.cap?e1(a.cap):'0')} → ${e1(b.cap)} kWh utiles`.padEnd(30),
    '+'+e(dCap)+' €', '| +'+e(dGain)+' €/an',
    '| TRI '+(100*(lo+hi)/2).toFixed(1)+' %', '| VAN '+e(npv)+' €',
    '| retour '+(pb?e1(pb)+' a':'jamais'));
}
const t0=M.simYear(cfg,0);
console.log('\nsans batterie : prélevé',e(t0.imp),'kWh, injecté',e(t0.exp),'kWh, écrêté',e(t0.clip||0),'kWh');

console.log('\n== chaque batterie comparée aux panneaux seuls (comparaison honnête entre fournisseurs) ==');
const a=R[0];
for(let i=1;i<R.length;i++){
  const b=R[i], dC=b.prix-a.prix;
  const fl=b.e.rows.map((x,k)=>x.net-a.e.rows[k].net);
  let npv=-dC; fl.forEach((f,k)=>npv+=f/Math.pow(1+cfg.disc/100,k+1));
  let lo=-0.95,hi=2; for(let t=0;t<300;t++){const mm=(lo+hi)/2;let v=-dC;
    fl.forEach((f,k)=>v+=f/Math.pow(1+mm,k+1)); if(v>0) lo=mm; else hi=mm;}
  let cum=-dC,pb=null; fl.forEach((f,k)=>{const p=cum;cum+=f;if(pb===null&&cum>=0)pb=k+(-p)/f;});
  console.log((b.lab||'').slice(0,32).padEnd(34),'+'+e(dC)+' €',
    '| +'+e(b.gain-a.gain)+' €/an', '| '+e((b.prix)/b.cap)+' €/kWh utile',
    '| TRI '+(100*(lo+hi)/2).toFixed(1)+' %', '| VAN '+e(npv)+' €',
    '| retour '+(pb?e1(pb)+' a':'jamais'));
}
console.log('\n== sensibilité : et si le gain batterie était surestimé de 40 % (écart au modèle statistique) ? ==');
for(let i=1;i<R.length;i++){
  const b=R[i], dC=b.prix-a.prix;
  const fl=b.e.rows.map((x,k)=>(x.net-a.e.rows[k].net)*0.6);
  let npv=-dC; fl.forEach((f,k)=>npv+=f/Math.pow(1+cfg.disc/100,k+1));
  let cum=-dC,pb=null; fl.forEach((f,k)=>{const p=cum;cum+=f;if(pb===null&&cum>=0)pb=k+(-p)/f;});
  console.log((b.lab||'').slice(0,32).padEnd(34),'VAN '+e(npv)+' €','| retour '+(pb?e1(pb)+' a':'jamais'));
}

const marg=nodes.marg.innerHTML;
console.log('\n== rendu du tableau des décisions ==');
console.log('tableaux :',(marg.match(/<table/g)||[]).length,
  '| garde sur surcoût négatif :', /moins cher <i>et<\/i> mieux/.test(marg)?'active':'inactive',
  '| TRI aberrant 200 % :', /200,0 %/.test(marg)?'PRESENT':'absent');
console.log(marg.replace(/<[^>]+>/g,'|').replace(/\|+/g,'|').split('\n').map(x=>x.trim()).filter(Boolean).join('\n'));
