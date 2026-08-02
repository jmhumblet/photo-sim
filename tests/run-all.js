/* Lance les neuf harnais de vérification et rend un compte rendu unique.
   Usage :  node run-all.js          (résumé)
            node run-all.js -v       (sortie complète de chaque harnais)          */
const { execFileSync } = require('child_process');
const path = require('path');

const HARNAIS = [
  ['smoke',     "Le script s'évalue, tous les identifiants du HTML existent"],
  ['audit',     '39 invariants : bilan énergétique, identités économiques, cas limites'],
  ['cftest',    'Capacités utiles par batterie, chronique combinée, légende des coûts'],
  ['boxtest2',  'Lisibilité des boîtes à moustaches : graduations rondes, survol, bornes'],
  ['evtest',    'Chaîne du véhicule : énergie, puissance de borne, priorités, absence de V2H'],
  ['conctest',  'La prose des conclusions ne peut pas contredire ses propres chiffres'],
  ['scentest',  'Presets, stockage local, aller-retour d’un scénario enregistré'],
  ['childtest', "Génération de l'onglet d'étude et de ses paramètres en lecture seule"],
  ['mctest',    'Monte-Carlo : chronométrage, ordre des profils, indicateurs véhicule'],
];

const ECHEC = /(\bECHEC\b|ÉCHEC|anomalie\(s\)|echec\(s\))/;
const verbeux = process.argv.includes('-v');
let rouges = 0;

for (const [nom, quoi] of HARNAIS) {
  let sortie, ok = true;
  try {
    sortie = execFileSync('node', [path.join(__dirname, nom + '.js')], { encoding: 'utf8' });
  } catch (e) {
    sortie = (e.stdout || '') + (e.stderr || '');
    ok = false;
  }
  if (ECHEC.test(sortie)) ok = false;
  if (!ok) rouges++;
  console.log(`${ok ? '  ok   ' : '  ECHEC'}  ${nom.padEnd(10)} ${quoi}`);
  if (verbeux || !ok) console.log(sortie.split('\n').map(l => '        ' + l).join('\n'));
}

console.log(rouges ? `\n${rouges} harnais en échec` : '\nles neuf harnais passent');
process.exit(rouges ? 1 : 0);
