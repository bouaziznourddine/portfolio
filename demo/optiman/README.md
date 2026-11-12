# OPTIMAN — démonstration interactive

Copie statique du visualiseur de planning développé dans le projet OPTIMAN
(ordonnancement d'une cellule d'usinage robotisée). Elle fonctionne sans serveur :
le planning affiché est un **résultat enregistré**, aucun calcul n'est exécuté en ligne.

## Ce que l'on peut y faire

- **Gantt de production** : machines, robot et opérateurs ; périodes de 30 min à une semaine ;
  filtres par ressource, par OF et par type d'opération ; détail de chaque opération ;
  isolement d'un OF ou d'une pièce ; mode kiosque.
- **Gantt des emplacements, des palettes et des montages** : occupation de chaque ressource de stockage.
- **Scénario** : phases à planifier, paramètres de la cellule, résultats, liste des opérations.
- **Exports** : CSV robot, opérateurs et CNC, et l'archive destinée à Unity.

## Comment c'est fait

| Fichier | Origine |
|---|---|
| `js/optiman_gantt.js`, `js/optiman_stock.js`, `css/optiman_gantt.css` | Code du module Odoo 12 `optiman_dev`, **sans modification** |
| `js/optiman_templates.js` | Gabarit QWeb du module, repris tel quel |
| `js/odoo_shim.js` | Remplace le client web Odoo : modules, classes, widget d'action, et réponses aux appels du Gantt à partir des données enregistrées |
| `js/demo_app.js`, `css/demo.css`, `index.html` | Habillage de la démonstration : fiche du scénario, fiches de détail, téléchargements |
| `js/demo_i18n.js` | Version anglaise : dictionnaire français → anglais et boutons FR / EN |
| `data/scenario.js` | Scénario enregistré : phases, opérations, occupation des palettes et des montages |
| `exports/` | Exports produits par le module pour ce scénario |
| `js/lib/jquery.js` | jQuery 1.11.1 (licence MIT), la version livrée avec Odoo 12 |

Le solveur d'ordonnancement et le module Odoo lui-même ne font pas partie de cette démonstration.

## Langues

La démonstration existe en **français et en anglais** : boutons FR / EN de la barre du haut.
Elle reprend la langue choisie sur le reste du site, et `?lang=en` dans l'adresse force l'anglais.

Le code du module n'est pas modifié pour autant. `js/demo_i18n.js` fournit la traduction là où Odoo
la fournit d'ordinaire : la fonction `_t()` du module, son gabarit, puis les textes écrits à l'écran.
Restent tels quels, dans les deux langues : les identifiants techniques du module (types d'opération
comme `montage` ou `robot_cnc_rotary` dans les listes, noms des paramètres) et le contenu des exports.

*English: this is a serverless copy of the OPTIMAN schedule viewer, available in French and English
(FR / EN buttons in the top bar). The schedule shown is a recorded result; nothing is computed online.*

## Données

Le jeu de données est **anonymisé** : les références d'affaires, d'articles, de phases et de montages
sont remplacées par des codes génériques (`AFF-001`, `ART-001`, `POINT-001`, `MONT-001`).
