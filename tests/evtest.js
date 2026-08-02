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
global.window=global; global.confirm=()=>true; global.alert=()=>{};
const M=new Function(js+'\n;return {appliquer,PRESET_JIM,run,getRES:()=>RESULTS,readCfg,prepDT,'
 +'simYear,simDay,evInit,evSeq,getDT:()=>DT,refConso,weatherSeq};')();
M.appliquer(JSON.parse(JSON.stringify(M.PRESET_JIM)));
let KO=0; const chk=(t,ok,d='')=>{console.log((ok?'  ok   ':'  ECHEC')+'  '+t+(d?'  -> '+d:''));if(!ok)KO++;};
const set=o=>{nodes.evOn.checked=true; for(const k in o) nodes[k]?nodes[k].value=String(o[k]):(nodes[k]=mk(k)).value=String(o[k]);
  const c=M.readCfg(); M.prepDT(c); return c;};
const CAP=15.27;

console.log('=== conservation de l\'énergie de roulage ===');
for(const immo of [0,20,33,50,80]) for(const cap of [0,CAP]){
  const cfg=set({evImmo:immo}); const t=M.simYear(cfg,cap);
  chk(`immobilité ${immo} %, batterie ${cap} : ${cfg.evKwh} kWh roulés`,
      Math.abs(t.evDrive-cfg.evKwh)<cfg.evKwh*0.02, t.evDrive.toFixed(0)+' kWh');
}
{ const cfg=set({evImmo:33}); const t=M.simYear(cfg,CAP);
  chk('énergie entrée ≈ énergie sortie (le stock ne dérive pas)',
      Math.abs((t.evSun+t.evGrid)-t.evDrive)<cfg.evKwh*0.05,
      `entrée ${(t.evSun+t.evGrid).toFixed(0)} / sortie ${t.evDrive.toFixed(0)} kWh`);
  chk('jours sans trajet ≈ consigne', Math.abs(t.evImmoJ-365*0.33)<40, t.evImmoJ.toFixed(0)+' j/an pour 120 visés');
}

console.log('=== bornes physiques ===');
{ const cfg=set({evImmo:33});
  let pk=0,socMin=1e9,socMax=-1e9,neg=false;
  for(const dt of M.getDT()){
    const ev=M.evInit(cfg), es=M.evSeq(cfg,60,4517);
    for(let d=0;d<60;d++){
      ev.drive=!es.immo[d]; ev.trip=es.trip; ev.plug=true;
      const r=M.simDay(dt,null,cfg,CAP,CAP/2,ev);
      r.evS.forEach(v=>{ if(v*4>pk)pk=v*4; if(v<-1e-12)neg=true; });
      r.evSocS.forEach(v=>{ if(v<socMin)socMin=v; if(v>socMax)socMax=v; });
    }
  }
  chk('puissance de borne respectée', pk<=cfg.evKw+1e-6, 'pointe '+pk.toFixed(2)+' kW / '+cfg.evKw);
  chk('aucune restitution vers la maison (pas de V2H)', !neg);
  chk('état de charge dans [0 ; utile]', socMin>=-1e-9&&socMax<=cfg.evUtil+1e-9,
      socMin.toFixed(1)+' à '+socMax.toFixed(1)+' kWh pour '+cfg.evUtil);
}

console.log('=== règle de priorité ===');
{ const cfg=set({evImmo:33});
  const test=(k,socPct)=>{
    const dt=M.getDT().find(d=>d.k===k);
    const ev=M.evInit(cfg); ev.soc=cfg.evUtil*socPct/100; ev.drive=false; ev.trip=0; ev.plug=true; ev.charge=false;
    const r=M.simDay(dt,null,cfg,CAP,0,ev);   // batterie domestique vide : elle veut charger
    let firstEv=-1,firstB=-1;
    for(let q=0;q<96;q++){ if(firstEv<0&&r.evS[q]>1e-6)firstEv=q; if(firstB<0&&r.chS[q]>1e-6)firstB=q; }
    return {firstEv,firstB};
  };
  const e1=test('ete',40);
  chk('été : la maison se sert avant la voiture, même voiture à 40 %',
      e1.firstB>=0 && (e1.firstEv<0||e1.firstB<=e1.firstEv), `batt q${e1.firstB}, voiture q${e1.firstEv}`);
  const h1=test('hiver',40);
  chk('hiver, voiture sous 50 % : la voiture passe devant',
      h1.firstEv>=0 && (h1.firstB<0||h1.firstEv<=h1.firstB), `voiture q${h1.firstEv}, batt q${h1.firstB}`);
  const h2=test('hiver',80);
  chk('hiver, voiture au-dessus de 50 % : la maison repasse devant',
      h2.firstB>=0 && (h2.firstEv<0||h2.firstB<=h2.firstEv), `batt q${h2.firstB}, voiture q${h2.firstEv}`);
}

console.log('=== recharge réseau : seulement la nuit et sous le seuil ===');
{ const cfg=set({evImmo:33});
  const dt=M.getDT().find(d=>d.k==='hiver');
  const ev=M.evInit(cfg); ev.soc=cfg.evUtil*0.1; ev.drive=false; ev.trip=0; ev.plug=true; ev.charge=true;
  const r=M.simDay(dt,null,cfg,0,0,ev);
  chk('la recharge réseau a bien eu lieu', r.evGrid>0, r.evGrid.toFixed(1)+' kWh');
  chk("elle s'arrête au seuil de priorité",
      ev.soc<=cfg.evUtil*cfg.evPrio/100+cfg.evKw/4+1e-6, 'SOC '+ev.soc.toFixed(1)+' kWh');
  const ev2=M.evInit(cfg); ev2.soc=cfg.evUtil*0.9; ev2.drive=false; ev2.trip=0; ev2.plug=true; ev2.charge=false;
  chk('pas de recharge réseau quand la réserve est haute',
      M.simDay(dt,null,cfg,0,0,ev2).evGrid<1e-9);
}

console.log('=== intégration dans la simulation ===');
{ const cfg=set({evImmo:33});
  const a=M.simYear({...cfg,evOn:false},0), b=M.simYear(cfg,0);
  chk('la consommation simulée augmente du roulage',
      Math.abs((b.cons-a.cons)-cfg.evKwh)<cfg.evKwh*0.05, (b.cons-a.cons).toFixed(0)+' kWh');
  chk('la consommation de référence intègre le véhicule',
      Math.abs(M.refConso(cfg)-M.refConso({...cfg,evOn:false})-cfg.evKwh)<1);
  const ev=M.evInit(cfg); ev.drive=false; ev.trip=0; ev.plug=true;
  const dt=M.getDT()[0]; const r=M.simDay(dt,null,cfg,CAP,5,ev);
  const parts=(dt._parts||[]).reduce((x,p)=>x+p.c.reduce((u,v)=>u+v,0),0);
  const evK=r.evS.reduce((x,y)=>x+y,0), L=r.loadS.reduce((x,y)=>x+y,0);
  chk('conso tracée = appareils + véhicule + veille batterie',
      Math.abs(L-parts-evK-cfg.battIdle/1000*24)<1e-9);
  chk('sélecteur de journée voiture dans le graphe', /id="chEv"/.test(src));
  chk('courbe véhicule dans la décomposition', /evS.some\(v=>v>1e-9\)\) comps.push/.test(src));
}

console.log('=== effet de l\'immobilité ===');
{ const g=[];
  for(const immo of [0,33,60]){ const cfg=set({evImmo:immo});
    const f=t=>t.imp*cfg.pElec-t.exp*cfg.pInj;
    const c0=M.simYear(cfg,0), c1=M.simYear(cfg,CAP);
    const t0=M.simYear(cfg,0);
    g.push({immo, sol:100*t0.evSun/(t0.evSun+t0.evGrid), marg:f(c0)-f(c1)});
  }
  console.log('   ',g.map(x=>`${x.immo} % immobile → ${x.sol.toFixed(0)} % solaire, batterie ${x.marg.toFixed(0)} €/an`).join(' | '));
  chk('plus la voiture reste au garage, plus elle roule au soleil', g[2].sol>g[0].sol);
}
console.log(KO?`\n${KO} echec(s)`:'\ntout est vert');
