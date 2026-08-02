const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','simulateur-pv.html'),'utf8');
const js=src.slice(src.indexOf('<script>')+8, src.indexOf('</script>'));
const vals={}; const re=/id="([A-Za-z]+)"[^>]*value="([^"]*)"/g; let m;
while(m=re.exec(src)) if(!(m[1] in vals)) vals[m[1]]=m[2];
const nodes={}; const mk=id=>({id,value:vals[id]??'',checked:false,textContent:'',innerHTML:'',
 dataset:{},style:{},type:'number',addEventListener(){},closest(){return null},insertAdjacentHTML(){}});
const _ls={};
global.localStorage={getItem:k=>_ls[k]??null,setItem:(k,v)=>{_ls[k]=String(v)},removeItem:()=>{}};
global.document={getElementById:id=>nodes[id]||(nodes[id]=mk(id)),addEventListener(){},
 querySelector(){return null},querySelectorAll(){return Object.values(nodes).filter(n=>n.id&&n.type)},
 createElement(){return {click(){},style:{}}}};
global.window=global; global.performance={now:()=>Date.now()};
const M=new Function(js+'\n;return {run,getR:()=>RESULTS,readCfg,simYear,prepDT,refConso,'
 +'getBATT:()=>BATT,setBATT:b=>{BATT=b},economics,mcOneDraw,PROFILS_MC,getDT:()=>DT};')();
const {run,getR,readCfg,simYear,prepDT,refConso,setBATT,economics,mcOneDraw,PROFILS_MC}=M;
let KO=0; const chk=(t,ok,d='')=>{console.log((ok?'  ok   ':'  ÉCHEC')+'  '+t+(d?'  → '+d:'')); if(!ok)KO++;};

console.log('\n=== 1. Variables déclarées mais jamais lues ===');
const ids=[...src.matchAll(/<input id="([A-Za-z]+)"/g)].map(x=>x[1])
  .concat([...src.matchAll(/<select id="([A-Za-z]+)"/g)].map(x=>x[1]));
const lus=new Set([...js.matchAll(/\$\('([A-Za-z]+)'\)/g)].map(x=>x[1]));
const cfgList=(js.match(/\[([^\]]*?)\]\.forEach\(k=>c\[k\]=\+\$\(k\)\.value\)/s)||['',''])[1];
const inCfg=new Set([...cfgList.matchAll(/'([A-Za-z]+)'/g)].map(x=>x[1]));
const orphelins=ids.filter(i=>!lus.has(i)&&!inCfg.has(i));
chk('tous les champs sont lus quelque part',orphelins.length===0,orphelins.join(', ')||'aucun orphelin');
const jamaisUtil=[...inCfg].filter(k=>!new RegExp('\\b(cfg|c)\\.'+k+'\\b').test(js));
chk('tous les champs de readCfg sont utilisés',jamaisUtil.length===0,jamaisUtil.join(', ')||'—');

console.log('\n=== 2. Bilan énergétique ===');
const cfg=readCfg(); prepDT(cfg);
for(const cap of [0,5.22,14.46]){
  const t=simYear(cfg,cap);
  const ent=t.prod+t.imp, sor=t.cons+t.exp+(t.ch-t.dis)+t.clip;
  chk(`entrées = sorties à ${cap} kWh`,Math.abs(ent-sor)<0.5,`écart ${(ent-sor).toFixed(3)} kWh`);
  chk(`  pertes batterie ≥ 0`,t.ch-t.dis>=-1e-6,`${(t.ch-t.dis).toFixed(1)} kWh`);
}

console.log('\n=== 3. Identités économiques ===');
run(); let R=getR();
for(const r of R){
  const som=r.e.rows.reduce((a,x)=>a+x.net,0);
  chk(`cumul = somme des nets − capex (${r.nom||0} kWh)`,Math.abs(som-r.capex-r.e.cum)<0.01,
    `${som.toFixed(0)} − ${r.capex.toFixed(0)} vs ${r.e.cum.toFixed(0)}`);
  let v=-r.capex; r.e.rows.forEach((x,i)=>v+=x.net/Math.pow(1+r.e.irr,i+1));
  chk(`  VAN nulle au taux du TRI`,Math.abs(v)<1,`${v.toFixed(2)} €`);
  if(r.e.pb){ const y=Math.floor(r.e.pb);
    const c1=r.e.rows.slice(0,y).reduce((a,x)=>a+x.net,0)-r.capex;
    const c2=r.e.rows.slice(0,y+1).reduce((a,x)=>a+x.net,0)-r.capex;
    chk(`  retour encadré par le cumul`,c1<=0.01&&c2>=-0.01,`an ${y}: ${c1.toFixed(0)} → ${c2.toFixed(0)} €`);}
}

console.log('\n=== 4. Monotonies attendues ===');
R=getR();
for(let i=1;i<R.length;i++){
  chk(`import décroît de ${R[i-1].nom||0} à ${R[i].nom} kWh`,R[i].t.imp<=R[i-1].t.imp+0.5);
  chk(`  autoconso croît`,R[i].auto>=R[i-1].auto-1e-6);
  chk(`  investissement croît`,R[i].capex>R[i-1].capex);
}

console.log('\n=== 5. Cas limites ===');
const essai=(t,f)=>{try{f();chk(t,true)}catch(e){chk(t,false,e.message)}};
const set=(o)=>{Object.entries(o).forEach(([k,v])=>{nodes[k]=nodes[k]||mk(k);nodes[k].value=String(v)}); run();};
const base={nPan:14,baseKwh:1000,battDod:90,horizon:25};
essai('0 panneau',()=>{set({...base,nPan:0}); const r=getR()[0];
  if(!(r.t.prod<1e-6)) throw new Error('production non nulle');});
essai('consommation nulle',()=>{set({...base,nPan:14,baseKwh:0});
  const A=M.getBATT?0:0; });
essai('aucune option de batterie',()=>{setBATT([]); set(base);
  if(getR().length!==1) throw new Error('devrait ne rester que la ligne 0 kWh');});
setBATT([{nom:5.8,prix:2000},{nom:11.5,prix:3800},{nom:16,prix:4800}]);
essai('profondeur de décharge à 100 %',()=>set({...base,battDod:100}));
essai('horizon 5 ans',()=>set({...base,horizon:5}));
essai('horizon 40 ans',()=>set({...base,horizon:40}));
set(base);
essai('100 % de journées couvertes',()=>{M.getDT().forEach(d=>d.cloud=100); run();
  M.getDT().forEach((d,i)=>d.cloud=[40,46,70][i]); run();});

console.log('\n=== 6. Monte-Carlo ===');
const c2=readCfg(); c2._S=40; c2._pAway=14/365; c2._pHeat=10/123; c2._heatMul=2.5; prepDT(c2);
const a1=mcOneDraw(c2,5.22,PROFILS_MC[0],12345), a2=mcOneDraw(c2,5.22,PROFILS_MC[0],12345);
chk('graine identique → résultat identique',Math.abs(a1.b0-a2.b0)<1e-9);
const b1=mcOneDraw(c2,5.22,PROFILS_MC[0],999);
chk('graine différente → résultat différent',Math.abs(a1.b0-b1.b0)>1e-6);
chk('batterie réduit toujours la facture',a1.b1<a1.b0,`${a1.b0.toFixed(0)} → ${a1.b1.toFixed(0)} €`);
const mo=p=>{let s=0;for(let d=0;d<40;d++) s+=mcOneDraw(c2,5.22,p,d*7919).b0; return s/40;};
const mR=mo(PROFILS_MC[0]),mN=mo(PROFILS_MC[1]),mI=mo(PROFILS_MC[2]);
chk('rigoureux ≤ normal ≤ insouciant',mR<=mN+1&&mN<=mI+1,
  `${mR.toFixed(0)} / ${mN.toFixed(0)} / ${mI.toFixed(0)} €`);
console.log('\n'+(KO?'⚠ '+KO+' anomalie(s)':'✓ aucune anomalie détectée'));
