const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','simulateur-pv.html'),'utf8');
const js=src.slice(src.indexOf('<script>')+8, src.indexOf('</script>'));
const vals={}; const re=/id="([A-Za-z]+)"[^>]*value="([^"]*)"/g; let m;
while(m=re.exec(src)) if(!(m[1] in vals)) vals[m[1]]=m[2];
const mk=id=>({value:vals[id]??'0',checked:false,textContent:'',innerHTML:'',
  dataset:{},style:{},addEventListener(){},closest(){return null}});
const nodes={};
global.document={getElementById:id=>nodes[id]||(nodes[id]=mk(id)),addEventListener(){},
  querySelector(){return null},querySelectorAll(){return Object.values(nodes)},
  createElement(){return {click(){},style:{}}}};
const _ls={}; global.localStorage={getItem:k=>_ls[k]??null,setItem:(k,v)=>{_ls[k]=String(v)},removeItem(){}};
global.window=global;
const M=new Function(js+'\n;return {RESULTS,readCfg,drawCF,BATT,renderBatt,run};')();
let KO=0; const chk=(t,ok,d='')=>{console.log((ok?'  ok   ':'  ECHEC')+'  '+t+(d?'  -> '+d:''));if(!ok)KO++;};

// 1. capacite utile
console.log('=== capacite utile par batterie ===');
chk('chaque option a util < nom', M.BATT.every(b=>b.util>0&&b.util<=b.nom),
    M.BATT.map(b=>`${b.nom}/${b.util}`).join(' '));
const caps=M.RESULTS.filter(r=>r.cap>0).map(r=>r.cap);
chk('RESULTS utilise les capacites utiles', JSON.stringify(caps)===JSON.stringify(M.BATT.map(b=>b.util)),
    caps.join(', '));
chk('tri croissant sur l utile', caps.every((c,i)=>i===0||c>caps[i-1]));
chk('DoD affichee dans le tableau', /DoD/.test(src) && /battAlerte/.test(src));

// 2. chronique combinee
console.log('=== chronique combinee ===');
const h=nodes.cf.innerHTML, L=nodes.cfLeg.innerHTML;
chk('un seul tableau', (h.match(/<table/g)||[]).length===1);
const nOpt=M.RESULTS.length;
chk('un groupe de colonnes par option', (h.match(/colspan="4"/g)||[]).length===nOpt*3,
    `${(h.match(/colspan="4"/g)||[]).length} pour ${nOpt} options x3 (entete+2 pieds)`);
chk('CV en colonne unique', (h.match(/Certificats/g)||[]).length===1);
const lignes=(h.match(/<tr><td>\d+<\/td>/g)||[]).length;
chk('lignes d annees conservees', lignes>=13, lignes+' lignes');
chk('plus de selecteur cfSel', !/cfSel/.test(src));
// coherence : le cumule final de chaque option = -capex + somme des nets
for(const r of M.RESULTS){
  const som=r.e.rows.reduce((a,x)=>a+x.net,0)-r.capex;
  chk('cumule final coherent '+(r.lab||'PV seul'), Math.abs(som-r.e.rows[r.e.rows.length-1].cum)<0.01);
}
// les CV sont bien identiques entre options (justifie la colonne unique)
const cv0=M.RESULTS[0].e.rows.map(x=>x.cv.toFixed(4)).join();
chk('CV identiques entre options', M.RESULTS.every(r=>r.e.rows.map(x=>x.cv.toFixed(4)).join()===cv0));

// 3. legende
console.log('=== legende des couts ===');
const cfg=M.readCfg();
for(const [t,pat] of [['entretien',/entretien/i],['onduleur',/onduleur/i],['batterie',/remplacement de la batterie/i],
  ['annee onduleur',new RegExp('année\\s*'+cfg.invYear)],['taux d actualisation',/actualisation/i],
  ['euros courants',/euros courants/i]]) chk('legende mentionne '+t, pat.test(L));
chk('montant de remplacement batterie chiffre',
  M.RESULTS.filter(r=>r.cap>0).every(r=>L.includes((r.prix*cfg.batPct/100).toLocaleString('fr-BE',{maximumFractionDigits:0}))));
console.log(KO?`\n${KO} echec(s)`:'\ntout est vert');
