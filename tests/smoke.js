const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','simulateur-pv.html'),'utf8');
const js=src.slice(src.indexOf('<script>')+8, src.indexOf('</script>'));
// valeurs par defaut lues dans le HTML
const vals={}; const re=/id="([A-Za-z]+)"[^>]*value="([^"]*)"/g; let m;
while(m=re.exec(src)) if(!(m[1] in vals)) vals[m[1]]=m[2];
const mk=id=>({value:vals[id]??'0',checked:false,textContent:'',innerHTML:'',
  dataset:{},style:{},addEventListener(){},closest(){return null}});
const nodes={};
global.document={getElementById:id=>nodes[id]||(nodes[id]=mk(id)),
  addEventListener(){},querySelector(){return null},
  querySelectorAll(){return Object.values(nodes)},
  createElement(){return {click(){},style:{}}}};
const _ls={};
global.localStorage={getItem:k=>_ls[k]??null,setItem:(k,v)=>{_ls[k]=String(v)},removeItem:k=>{delete _ls[k]}};
global.window=global;
let errs=[];
try{ new Function(js+'\n;return {run,RESULTS,economics,readCfg};')(); }
catch(e){ errs.push('INIT: '+e.message); }
if(!errs.length){
  const M=new Function(js+'\n;return {RESULTS,readCfg,economics};')();
  console.log('Script evalue sans erreur.');
  console.log('Elements DOM sollicites :',Object.keys(nodes).length);
  const manquants=Object.keys(nodes).filter(k=>!(k in vals)&&!['dtBody','applList','evBox','prodHint','consHint','cmp','kpi','dayTabs','chart','dayStats','cf','cfSel','chCap','chWx','evDayLbl','battList','evOn'].includes(k));
  console.log('Ids sans valeur par defaut :',manquants.length?manquants.join(', '):'aucun');
  console.log('\nResultats calcules :',M.RESULTS.length,'options');
  for(const r of M.RESULTS)
    console.log(`  ${String(r.cap).padStart(2)} kWh | invest ${r.capex.toFixed(0).padStart(6)} EUR`
      +` | facture ${r.cost.toFixed(0).padStart(4)} | gain ${r.gain.toFixed(0).padStart(4)}`
      +` | retour ${r.e.pb?r.e.pb.toFixed(1)+'a':'jamais'} | TRI ${(r.e.irr*100).toFixed(1)}%`
      +` | VAN ${r.e.npv.toFixed(0)}`);
}else errs.forEach(e=>console.log(e));
