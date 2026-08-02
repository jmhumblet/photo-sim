# Les harnais de vérification du simulateur

Un **harnais** est un petit programme qui charge le simulateur, lui pose des questions dont on
connaît la réponse, et signale tout écart. Il ne teste pas « est-ce que ça marche ? » mais
« est-ce que ça dit la vérité ? ».

Le simulateur est un fichier HTML unique, destiné à s'ouvrir dans un navigateur. Ces scripts
récupèrent son `<script>`, l'évaluent dans Node avec un faux DOM — quelques dizaines de lignes
qui imitent `getElementById`, `innerHTML`, `localStorage` — puis appellent directement les
fonctions internes. Aucun navigateur, aucune dépendance à installer.

## Lancer

```
cd tests
node run-all.js        # résumé, une ligne par harnais
node run-all.js -v     # sortie détaillée
node evtest.js         # un seul harnais
```

Node suffit. Rien à installer.

## Ce que chaque harnais vérifie

| Fichier | Objet |
|---|---|
| `smoke.js` | Le script s'évalue sans erreur ; tout `id` sollicité par le code existe dans le HTML. Le filet le plus grossier, celui qui attrape les fautes de frappe. |
| `audit.js` | 39 invariants : le bilan énergétique boucle, la VAN et le TRI sont cohérents entre eux, les gains croissent avec la capacité, les cas limites (batterie nulle, horizon court) ne cassent rien, le Monte-Carlo est déterministe à graine fixée. |
| `cftest.js` | Capacité utile propre à chaque batterie, chronique année par année en tableau unique, légende des coûts complète et chiffrée. |
| `boxtest2.js` | Lisibilité du graphe de l'étude : graduations sur valeurs rondes et équidistantes, une zone de survol par boîte, bornes P5/P95 écrites, aucun `NaN`. |
| `evtest.js` | Chaîne du véhicule : l'énergie de roulage est conservée sur cinq rythmes d'immobilité, la puissance de borne n'est jamais dépassée, l'état de charge reste dans ses bornes, aucune restitution vers la maison, la règle de priorité se comporte différemment en été et en hiver. |
| `conctest.js` | Les phrases de conclusion ne peuvent pas contredire les nombres qu'elles contiennent. Le harnais lit le texte rendu, en extrait les chiffres, recalcule la relation vraie et la compare à celle qui est annoncée. |
| `scentest.js` | Presets, stockage local, enregistrement puis rechargement d'un scénario, retour aux valeurs par défaut. |
| `childtest.js` | L'onglet d'étude est engendré en réinjectant le moteur du parent : ce harnais vérifie que le découpage du `<script>` reste correct et que les paramètres en lecture seule sont complets. |
| `mctest.js` | Monte-Carlo : temps par tirage, ordre attendu des trois profils, indicateurs du véhicule. `node mctest.js --ve` active la voiture. |

## Scripts d'analyse

Ce ne sont pas des tests : ils font tourner le simulateur pour produire des chiffres.

| Fichier | Objet |
|---|---|
| `verdict.js` | Tableau des options et des décisions marginales sur le scénario Woluwe-Saint-Lambert. |
| `evverdict.js` | Valeur de la batterie selon le rythme d'utilisation de la voiture. |
| `sbias.js` | Sensibilité de la part solaire du roulage à la longueur de séquence simulée. |
| `realconc.js` | Rend le texte de conclusion de l'étude de robustesse sans ouvrir le navigateur. |

## Un avertissement utile

Plusieurs fois au cours de ce travail, un harnais a signalé une erreur qui n'existait pas — une
expression régulière trop stricte, un découpage naïf du `<script>`, une espace insécable de la
locale française. Un harnais rouge ne prouve pas que le simulateur est faux ; il prouve qu'il
faut regarder. La règle appliquée ici a été de diagnostiquer avant de corriger, et de corriger le
harnais quand c'était lui qui avait tort.
