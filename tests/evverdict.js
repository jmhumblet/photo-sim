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
const M=new Function(js+'\n;return {appliquer,PRESET_JIM,run,getRES:()=>RESULTS,readCfg};')();
M.appliquer(JSON.parse(JSON.stringify(M.PRESET_JIM)));
const e=n=>n.toLocaleString('fr-BE',{maximumFractionDigits:0});
function tab(evOn,immo){
  nodes.evOn.checked=evOn; if(immo!==undefined) nodes.evImmo.value=String(immo);
  M.run(); const R=M.getRES(), cfg=M.readCfg(), a=R[0];
  return R.map((b,i)=>{
    if(!i) return {lab:'panneaux seuls',npv:b.e.npv,irr:b.e.irr,pb:b.e.pb,gain:b.gain};
    const d=b.prix, fl=b.e.rows.map((x,k)=>x.net-a.e.rows[k].net);
    let npv=-d; fl.forEach((f,k)=>npv+=f/Math.pow(1+cfg.disc/100,k+1));
    let lo=-.95,hi=2; for(let t=0;t<300;t++){const mm=(lo+hi)/2;let v=-d;
      fl.forEach((f,k)=>v+=f/Math.pow(1+mm,k+1)); if(v>0)lo=mm;else hi=mm;}
    let cum=-d,pb=null; fl.forEach((f,k)=>{const p=cum;cum+=f;if(pb===null&&cum>=0)pb=k+(-p)/f;});
    return {lab:(b.lab||'').slice(0,30),npv,irr:(lo+hi)/2,pb,gain:b.gain-a.gain};
  });
}
console.log('=== la batterie face aux panneaux seuls ===');
for(const [t,on,im] of [['sans véhicule',false],['véhicule, 33 % de jours au garage',true,33],
                        ['véhicule, roule tous les jours',true,0],
                        ['véhicule, 60 % au garage',true,60]]){
  console.log('\n--- '+t);
  tab(on,im).forEach((r,i)=>console.log('   '+r.lab.padEnd(32),
    i?`+${e(r.gain)} €/an | VAN ${e(r.npv)} € | TRI ${(100*r.irr).toFixed(1)} % | retour ${r.pb?r.pb.toFixed(1)+' a':'jamais'}`
     :`gain ${e(r.gain)} €/an | VAN ${e(r.npv)} € | TRI ${(100*r.irr).toFixed(1)} %`));
}
