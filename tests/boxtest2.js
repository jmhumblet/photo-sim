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
const _ls={}; global.localStorage={getItem:k=>_ls[k]??null,setItem(){},removeItem(){}};
global.window=global; global.performance={now:()=>0};
const M=new Function(js+'\n;return {mcRender,mcInit,mcHover,MCstate,PROFILS_MC,readCfg,q,moy};')();
let KO=0; const chk=(t,ok,d='')=>{console.log((ok?'  ok   ':'  ECHEC')+'  '+t+(d?'  -> '+d:''));if(!ok)KO++;};

// jeu de donnees synthetique : loi normale par profil
M.mcInit();
let seed=1; const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
const gauss=(mu,sd)=>mu+sd*(rnd()+rnd()+rnd()+rnd()+rnd()+rnd()-3);
const base={rigoureux:590,normal:619,insouciant:641};
for(let n=0;n<400;n++) for(const p of M.PROFILS_MC){
  const R=M.MCstate.res[p.k], b0=gauss(base[p.k],28), b1=b0-gauss(330,12);
  R.bill0.push(b0); R.bill1.push(b1); R.gain.push(b0-b1); R.cons.push(3000);
}
M.MCstate.done=400;
M.mcRender(M.readCfg(),5.22,5.22);
const svg=nodes.mcBox.innerHTML;

console.log('=== lisibilite du graphe ===');
chk('aucun NaN dans le SVG', !/NaN/.test(svg));
const gr=[...svg.matchAll(/stroke-dasharray="2 4"/g)].length;
chk('reperes verticaux en arriere-plan', gr>=5 && gr<=9, gr+' lignes');
const lbl=[...svg.matchAll(/font-size="10"[^>]*text-anchor="middle">([\d\s  ,.]+) €/g)].map(x=>x[1]);
console.log('  graduations :', lbl.join(' | '));
const nums=lbl.map(t=>+t.replace(/[^\d]/g,''));
const pas=nums.slice(1).map((v,i)=>v-nums[i]);
chk('graduations equidistantes', new Set(pas).size===1, 'pas de '+pas[0]);
chk('graduations sur valeurs rondes', nums.every(v=>v%pas[0]===0), nums.join(','));
chk('les reperes couvrent les boites',
    Math.min(...nums)<=q0(M.MCstate.res.insouciant.bill1,.05)+1 &&
    Math.max(...nums)>=q0(M.MCstate.res.insouciant.bill0,.95)-1);
function q0(a,p){return M.q(a,p);}
const grp=[...svg.matchAll(/onmouseenter="mcHover\('(\w+)','(\d)'\)"/g)];
chk('une zone de survol par boite', grp.length===M.PROFILS_MC.length*2, grp.length+' zones');
chk('infobulle native sur chaque boite', (svg.match(/<title>P5 /g)||[]).length===grp.length);
chk('bornes P5/P95 ecrites sous chaque moustache', (svg.match(/font-size="9"/g)||[]).length===grp.length*2);
chk('zone de survol transparente et large', /fill="transparent"/.test(svg));

console.log('=== panneau de survol ===');
M.mcHover();
chk('etat au repos explicatif', /Survolez/.test(nodes.mcBoxInfo.innerHTML));
M.mcHover('normal','0');
const inf=nodes.mcBoxInfo.innerHTML;
console.log('  ', inf.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,150));
for(const t of ['P5','P25','médiane','P75','P95','moyenne','400 années'])
  chk('panneau contient '+t, inf.includes(t));
chk('valeurs coherentes avec la serie',
    inf.includes(M.q(M.MCstate.res.normal.bill0,.5).toLocaleString('fr-BE',{maximumFractionDigits:0})));
M.mcHover('normal','1');
chk('bascule vers la serie avec batterie', /avec batterie/.test(nodes.mcBoxInfo.innerHTML));
console.log(KO?`\n${KO} echec(s)`:'\ntout est vert');
