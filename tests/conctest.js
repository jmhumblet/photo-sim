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
const M=new Function(js+'\n;return {mcRender,mcInit,MCstate,PROFILS_MC,readCfg,q,moy};')();
let KO=0; const chk=(t,ok,d='')=>{console.log((ok?'  ok   ':'  ECHEC')+'  '+t+(d?'  -> '+d:''));if(!ok)KO++;};

let seed=7; const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
const gauss=(mu,sd)=>mu+sd*(rnd()+rnd()+rnd()+rnd()+rnd()+rnd()-3);

// ecartVise = écart discipline ; sdN pilote la dispersion météo (P90-P10 ≈ 2.563 sd)
function scenario(ecartVise,sdN){
  M.mcInit(); seed=7;
  const mu={rigoureux:500, normal:500+ecartVise/2, insouciant:500+ecartVise};
  for(let n=0;n<800;n++) for(const p of M.PROFILS_MC){
    const b0=gauss(mu[p.k], p.k==='normal'?sdN:8), b1=b0-260;
    const R=M.MCstate.res[p.k];
    R.bill0.push(b0); R.bill1.push(b1); R.gain.push(b0-b1); R.cons.push(3000);
    R.evSol0.push(40); R.evSol1.push(30); R.evGrid0.push(500); R.immo.push(120);
  }
  M.MCstate.done=800;
  const cfg=M.readCfg(); cfg.evOn=false;
  M.mcRender(cfg,5.22,5.22);
  const txt=nodes.mcConc.innerHTML.replace(/<[^>]+>/g,'').replace(/\s+/g,' ');
  const nums=[...txt.matchAll(/([\d  ,.]+) € par an|([\d  ,.]+) € d'écart/g)];
  const par=t=>+t.replace(/[^\d]/g,'');
  const ecart=par(txt.match(/([\d  ,.]+) € par an/)[1]);
  const disp =par(txt.match(/([\d  ,.]+) € d'écart/)[1]);
  return {txt,ecart,disp,
    tier: /pèsent lourd/.test(txt)?'lourd' : /comptent modérément/.test(txt)?'modéré' : 'négligeable',
    rel : /moins que l'aléa/.test(txt)?'<' : /du même ordre que l'aléa/.test(txt)?'=' :
          /davantage que l'aléa/.test(txt)?'>' : '?'};
}

console.log('=== la phrase doit dire ce que les chiffres disent ===');
console.log('  écart | aléa | verdict      | relation annoncée');
for(const [E,sd] of [[10,50],[40,50],[92,50],[92,20],[92,10],[200,20],[5,5],[120,40],[92,73]]){
  const r=scenario(E,sd);
  const vrai = r.ecart < r.disp*0.8 ? '<' : r.ecart <= r.disp*1.25 ? '=' : '>';
  const rap  = r.disp>1 ? r.ecart/r.disp : 9;
  const tierAttendu = (r.ecart<20||rap<0.5)?'négligeable' : rap<1.2?'modéré':'lourd';
  console.log('  '+String(r.ecart).padStart(6)+' |'+String(r.disp).padStart(5)
    +' | '+r.tier.padEnd(12)+' | '+r.rel);
  chk(`  relation cohérente (${r.ecart} vs ${r.disp})`, r.rel===vrai, `dit "${r.rel}", vrai "${vrai}"`);
  chk(`  verdict cohérent`, r.tier===tierAttendu, `dit "${r.tier}", attendu "${tierAttendu}"`);
}
console.log('\n=== le cas signalé : 92 € contre 127 € ===');
{ const r=scenario(92,127/2.563);
  console.log('  ', r.txt.slice(0,190));
  chk("ne prétend plus que 92 € dépasse l'aléa météo", !/davantage que l'aléa/.test(r.txt));
  chk('classé au plus en "modéré"', r.tier!=='lourd', r.tier);
}
console.log(KO?`\n${KO} echec(s)`:'\ntout est vert');
