/*
 * OPTIMAN — démonstration statique : français / anglais.
 *
 * Le code du module n'est pas modifié. La traduction passe par trois points :
 *   - _t() du module (web.core) renvoie le texte anglais, comme le fait Odoo ;
 *   - le gabarit du module et la page sont traduits nœud par nœud ;
 *   - un observateur traduit ce que les scripts écrivent ensuite (les textes
 *     de optiman_stock.js et les libellés enregistrés avec le scénario).
 *
 * La langue est celle du site (localStorage « lang ») ; ?lang=en ou ?lang=fr
 * la force pour une visite. Changer de langue recharge la page.
 *
 * Ajouter une traduction : une ligne « "texte français": "English text", » dans EN
 * (le texte français avec des espaces simples), ou une règle dans RULES pour un texte
 * assemblé avec des valeurs. Ce qui n'est pas dans EN reste affiché en français.
 */
(function (window) {
    'use strict';

    var document = window.document;
    var lang = 'fr';
    try {
        var forced = /[?&]lang=(fr|en)\b/.exec(window.location.search);
        lang = forced ? forced[1] : (window.localStorage.getItem('lang') || 'fr');
    } catch (ignore) { /* Stockage indisponible : la démonstration reste en français. */ }
    if (lang !== 'en') { lang = 'fr'; }

    // Texte français (espaces normalisés) -> texte anglais.
    var EN = {
        "Accompagné": "Attended",
        "Actualisation impossible. Vérifiez la connexion et réessayez.": "Refresh failed. Check the connection and try again.",
        "Actualiser": "Refresh",
        "Affaire / OF": "Job / MO",
        "Afficher aussi les emplacements jamais utilisés": "Also show slots never used",
        "Afficher aussi les montages jamais utilisés": "Also show fixtures never used",
        "Afficher aussi les palettes jamais utilisées": "Also show pallets never used",
        "Afficher tous les OF": "Show all MOs",
        "Afficher toutes les pièces": "Show all parts",
        "Algorithme": "Algorithm",
        "Ancienne capacité en pièces (archive)": "Former capacity in parts (archive)",
        "Ancienne convention": "Former convention",
        "Appuyez sur Échap pour quitter le plein écran.": "Press Esc to leave full screen.",
        "Archive ZIP des trois CSV du même scénario : robot, opérateurs et CNC.": "ZIP archive of the three CSV files of the same scenario: robot, operators and CNC.",
        "Article": "Item",
        "Aucun planning calculé. Préparez puis calculez le scénario pour afficher ses opérations.": "No computed schedule. Prepare and compute the scenario to display its operations.",
        "Aucune opération pour ces filtres sur cette période. Changez la période ou sélectionnez Tous les OF / Tout.": "No operation for these filters in this period. Change the period or select All MOs / All.",
        "Aucune opération visible avec ces filtres. Utilisez Réafficher les types, puis vérifiez l’OF, les ressources et la période.": "No operation visible with these filters. Use Show all types, then check the MO, the resources and the period.",
        "Avertissements du solveur": "Solver warnings",
        "Barre bleue : emplacement réservé. Zone sans barre : emplacement libre.": "Blue bar: slot reserved. No bar: slot free.",
        "Barre bleue : occupation d’une palette physique. Cliquez pour voir les pièces et les horaires.": "Blue bar: a physical pallet is occupied. Click to see the parts and the times.",
        "Barre bleue : occupation d’une palette physique. Cliquez pour voir l’OF, les pièces et son emplacement.": "Blue bar: a physical pallet is occupied. Click to see the MO, the parts and its slot.",
        "Barre bleue : palette réservée du montage au démontage de la phase, ou jusqu’au démontage final en précédence montage. Zone sans barre : palette libre. Cliquez sur une barre pour voir son détail.": "Blue bar: pallet reserved from mounting to dismounting of the phase, or until the final dismounting under fixture precedence. No bar: pallet free. Click a bar to see its details.",
        "Barre verte : occupation du support partagé par un OF. Cliquez pour voir la phase, les pièces et la palette associée.": "Green bar: the shared fixture is occupied by an MO. Click to see the phase, the parts and the associated pallet.",
        "Calculé": "Computed",
        "Calculé le": "Computed on",
        "Capacité du magasin de la CNC": "CNC tool magazine capacity",
        "Capacité du type de palette": "Capacity of the pallet type",
        "Centrer": "Centre",
        "Cette démonstration a besoin de JavaScript pour afficher le planning.": "This demo needs JavaScript to display the schedule.",
        "Cette partie concerne la même pièce que les autres parties de cet usinage.": "This segment concerns the same part as the other segments of this machining operation.",
        "Charge d’usinage de la phase": "Machining load of the phase",
        "Chargement de la démonstration…": "Loading the demo…",
        "Chargement de la période…": "Loading the period…",
        "Chargement de tous les emplacements…": "Loading all slots…",
        "Chargement impossible. Cliquez sur Actualiser pour réessayer.": "Loading failed. Click Refresh to try again.",
        "Choisir une pièce": "Choose a part",
        "Cliquez sur un type pour masquer ou réafficher ses barres.": "Click a type to hide or show its bars.",
        "Cliquez sur une barre pour comprendre l’opération. Une opération commune à plusieurs ressources apparaît sur chaque ligne concernée.": "Click a bar to understand the operation. An operation shared by several resources appears on each row concerned.",
        "Cmax — Priorité (ancien nom)": "Cmax — Priority (former name)",
        "CNC affectée": "Assigned CNC",
        "Copie statique du module Odoo 12 · données anonymisées · aucun calcul en ligne": "Static copy of the Odoo 12 module · anonymised data · no computation online",
        "CSV CNC": "CNC CSV",
        "CSV opérateurs": "Operator CSV",
        "CSV robot": "Robot CSV",
        "cycle à vide": "empty cycle",
        "cycles à vide": "empty cycles",
        "Dans cette partie, la présence opérateur dure": "In this segment, the operator is present for",
        "Données archivées lors du calcul du planning.": "Data archived when the schedule was computed.",
        "Durée": "Duration",
        "Durée (min)": "Duration (min)",
        "Durée :": "Duration:",
        "Durée de la période affichée": "Length of the displayed period",
        "Durée du planning (min)": "Schedule duration (min)",
        "Durée globale (min)": "Overall duration (min)",
        "Durée Odoo indicative (min)": "Indicative Odoo duration (min)",
        "Début": "Start",
        "Début du scénario": "Scenario start",
        "démonstration interactive": "interactive demo",
        "Démontage": "Dismounting",
        "Désactivé dans la démonstration : le scénario est enregistré, aucun calcul n’est exécuté en ligne.": "Disabled in the demo: the scenario is recorded, no computation runs online.",
        "Désignation": "Description",
        "Détail de l’opération": "Operation details",
        "Détails de la phase": "Phase details",
        "EDD — Échéances les plus proches": "EDD — Earliest due dates",
        "Emplacement": "Slot",
        "Emplacement palette": "Pallet slot",
        "Emplacement palette :": "Pallet slot:",
        "Emplacement vide": "Empty position",
        "Emplacement vide (aucune pièce)": "Empty position (no part)",
        "Ensemble du scénario": "Whole scenario",
        "Estimation Odoo (min)": "Odoo estimate (min)",
        "Explorez le planning": "Explore the schedule",
        "Export impossible. Vérifiez la connexion et vos droits, puis réessayez.": "Export failed. Check the connection and your access rights, then try again.",
        "Exporter les CSV robot, opérateurs et CNC du même scénario en ZIP, indépendamment des filtres du Gantt": "Export the robot, operator and CNC CSV files of the same scenario as a ZIP, regardless of the Gantt filters",
        "Exporter pour Unity": "Export for Unity",
        "Exporter tous les usinages CNC, accompagnés et à vide compris, indépendamment des filtres du Gantt": "Export all CNC machining operations, attended and empty cycles included, regardless of the Gantt filters",
        "Exporter toutes les opérations des opérateurs du scénario enregistré, indépendamment des filtres du Gantt": "Export all operator operations of the recorded scenario, regardless of the Gantt filters",
        "Exporter toutes les opérations du robot du scénario enregistré, indépendamment des filtres du Gantt": "Export all robot operations of the recorded scenario, regardless of the Gantt filters",
        "Fermer": "Close",
        "Filtrer par affaire ou OF": "Filter by job or MO",
        "Fin": "End",
        "Fin calculée": "Computed end",
        "fin prévue": "planned end",
        "Fuseau de l’atelier": "Workshop time zone",
        "Gantt de production": "Production Gantt",
        "Gantt des emplacements": "Slot Gantt",
        "Gantt des emplacements : positions en lignes, temps en colonnes": "Slot Gantt: positions in rows, time in columns",
        "Gantt des montages": "Fixture Gantt",
        "Gantt des palettes": "Pallet Gantt",
        "Heures de l’atelier :": "Workshop time:",
        "Heures du compte Odoo :": "Odoo account time:",
        "Historique des emplacements indisponible.": "Slot history unavailable.",
        "Horaire": "Time",
        "Horaire et pièce": "Time and part",
        "Identifiant de phase": "Phase identifier",
        "Identification et origine": "Identification and origin",
        "Impossible de charger le planning. Actualisez après avoir vérifié la connexion et vos droits.": "Unable to load the schedule. Refresh after checking the connection and your access rights.",
        "Impossible de trouver le début de cet OF. Vérifiez la connexion et vos droits, puis sélectionnez-le à nouveau.": "Unable to find the start of this MO. Check the connection and your access rights, then select it again.",
        "Indicateurs du scénario entier": "Indicators for the whole scenario",
        "Informations conservées avec le planning": "Information kept with the schedule",
        "Isoler cet OF": "Isolate this MO",
        "Isoler cette pièce": "Isolate this part",
        "Jamais utilisé": "Never used",
        "Jour": "Day",
        "Jours de suivi 1re pièce": "First-part monitoring days",
        "La capacité de palette compte des emplacements ; le chargement du montage compte des positions. Le stock de supports est partagé entre tous les OF du même type, pas le nombre libre à l’heure de cette opération. Un support se libère à la fin du démontage de sa phase.": "Pallet capacity counts slots; fixture loading counts positions. The fixture stock is shared between all MOs of the same type; it is not the number free at the time of this operation. A fixture is released when the dismounting of its phase ends.",
        "La CNC usine la pièce. Aucun suivi opérateur n’est affecté à ce cycle dans le planning calculé.": "The CNC machines the part. No operator monitoring is assigned to this cycle in the computed schedule.",
        "La démonstration n’a pas pu charger ses fichiers. Rechargez la page.": "The demo could not load its files. Reload the page.",
        "La démonstration n’a pas pu démarrer. Rechargez la page.": "The demo could not start. Reload the page.",
        "La palette et le support restent réservés. Les transferts robot indiquent si la palette est sortie pour permettre d’autres usinages pendant la pause.": "The pallet and the fixture remain reserved. The robot transfers show whether the pallet was taken out to allow other machining during the pause.",
        "La première pièce de cette phase nécessite un suivi opérateur. La CNC et l’opérateur sont mobilisés ensemble.": "The first part of this phase requires operator monitoring. The CNC and the operator are engaged together.",
        "La période de réservation n’est pas renseignée dans ce résultat.": "The reservation period is not recorded in this result.",
        "Le calcul est conservé dans ce scénario. Les dates et affectations des OF Odoo ne sont pas modifiées.": "The computation is kept in this scenario. The dates and assignments of the Odoo MOs are not changed.",
        "Le n° de palette du planning, par exemple S-9, désigne l’emplacement réservé dans cette famille. L’emplacement reste occupé du premier montage au démontage de la dernière phase. Un numéro de série physique distinct n’est pas renseigné.": "The pallet number in the schedule, for example S-9, is the slot reserved in that family. The slot stays occupied from the first mounting to the dismounting of the last phase. No separate physical serial number is recorded.",
        "Le robot charge le montage depuis le rotary dans la CNC. La CNC est mobilisée pendant ce transfert.": "The robot loads the fixture from the rotary into the CNC. The CNC is engaged during this transfer.",
        "Le robot ramène le montage sur la table pour la suite des opérations.": "The robot brings the fixture back to the table for the following operations.",
        "Le robot recharge la même palette au jour ouvré suivant pour poursuivre la même pièce avec son opérateur.": "The robot reloads the same pallet on the next working day to continue the same part with its operator.",
        "Le robot sort la palette interrompue sans la démonter. La CNC peut usiner d’autres montages autonomes ; cette palette et son support restent réservés.": "The robot takes the interrupted pallet out without dismounting it. The CNC can machine other unattended fixtures; this pallet and its fixture remain reserved.",
        "Le robot sort le montage de la CNC et le dépose sur le rotary. La CNC est libérée à la fin de ce transfert.": "The robot takes the fixture out of the CNC and places it on the rotary. The CNC is released at the end of this transfer.",
        "Le robot transporte le montage depuis la table vers le rotary.": "The robot carries the fixture from the table to the rotary.",
        "Le serveur ne fournit pas encore les montages. Redémarrez Odoo après la mise à jour, puis actualisez cette page.": "The server does not provide the fixtures yet. Restart Odoo after the update, then refresh this page.",
        "Les données de cette opération ne permettent pas d’identifier une pièce.": "The data of this operation does not identify a part.",
        "Les données de phases sont incomplètes ou incohérentes : les totaux OF et pièces ne sont pas affichés. Vérifiez le scénario.": "The phase data is incomplete or inconsistent: MO and part totals are not displayed. Check the scenario.",
        "Les durées sont en minutes. Le début du scénario est défini par le champ ci-dessus. La plage de travail et les jours ouvrés utilisent le fuseau de la cellule. Les stocks partagés proviennent de Qty montage maxi des OF. MONTAGES_DISPONIBLES est facultatif ; s’il est renseigné pour un type utilisé, son stock doit correspondre aux OF.": "Durations are in minutes. The start of the scenario is set by the field above. Working hours and working days use the cell’s time zone. Shared stocks come from the “Qty montage maxi” of the MOs. MONTAGES_DISPONIBLES is optional; if it is set for a type in use, its stock must match the MOs.",
        "L’opérateur fixe les pièces sur le montage avant leur transfert vers la CNC.": "The operator mounts the parts on the fixture before it is transferred to the CNC.",
        "L’opérateur retire les pièces après usinage et libère le montage.": "The operator removes the parts after machining and frees the fixture.",
        "L’opérateur réoriente les pièces avant l’usinage de cette phase, pendant la durée prévue par le solveur.": "The operator re-orients the parts before this phase is machined, for the time set by the solver.",
        "L’opérateur suit le début de la première pièce de cette phase pendant": "The operator monitors the start of the first part of this phase for",
        "L’usinage accompagné est mis en pause à la fermeture et reprend au prochain jour ouvré.": "Attended machining is paused at closing time and resumes on the next working day.",
        "Masquer :": "Hide:",
        "min ; la CNC poursuit ensuite l’usinage seule.": "min; the CNC then continues machining on its own.",
        "min ; la CNC poursuit ensuite seule.": "min; the CNC then continues on its own.",
        "Mode kiosque": "Kiosk mode",
        "Mode kiosque dans la fenêtre · Échap pour quitter": "Kiosk mode in the window · Esc to exit",
        "Mode kiosque · Échap pour quitter": "Kiosk mode · Esc to exit",
        "Montage": "Mounting",
        "Montage et chargement": "Fixture and loading",
        "Montage et ressources": "Fixture and resources",
        "Navigation dans le planning": "Schedule navigation",
        "Nombre de parties": "Number of segments",
        "Nombre d’outils": "Number of tools",
        "Non renseigné": "Not specified",
        "non renseigné": "not specified",
        "Nouveau planning": "New schedule",
        "Numéro de phase": "Phase number",
        "N° emplacement": "Slot no.",
        "N° montage": "Fixture no.",
        "N° palette (planning)": "Pallet no. (schedule)",
        "N° partie d’usinage": "Machining segment no.",
        "Occupation prévue des emplacements": "Planned slot occupation",
        "Occupation prévue des palettes, du montage au démontage de la phase ou jusqu’au démontage final selon la précédence. Les filtres du Gantt ne s’appliquent pas ici. Ce repère ne décrit pas la position physique actuelle de la palette.": "Planned occupation of the pallets, from mounting to dismounting of the phase, or until the final dismounting, depending on the precedence rule. The Gantt filters do not apply here. This view does not describe the current physical position of the pallet.",
        "OF": "MOs",
        "OF :": "MO:",
        "OF et article": "MO and item",
        "OPTIMAN · Planning de production": "OPTIMAN · Production schedule",
        "Opérateur": "Operator",
        "Opérateurs": "Operators",
        "Opération": "Operation",
        "Opération et ressources": "Operation and resources",
        "Opération hors de la période affichée. Utilisez Centrer pour la retrouver.": "Operation outside the displayed period. Use Centre to find it.",
        "Opération issue du planning calculé.": "Operation taken from the computed schedule.",
        "Opération sélectionnée": "Selected operation",
        "Opérations": "Operations",
        "Ordre d’affichage": "Display order",
        "Origine des informations": "Source of the information",
        "Origine du stock": "Stock source",
        "Outillage CNC": "CNC tooling",
        "Outils nécessaires à la phase": "Tools required for the phase",
        "Ouvrir": "Open",
        "Ouvrir la fiche de l’opération": "Open the operation record",
        "Ouvrir la fiche Odoo": "Open the Odoo record",
        "Ouvrir la phase": "Open the phase",
        "Page précédente": "Previous page",
        "Page suivante": "Next page",
        "Palette": "Pallet",
        "Palette / ID": "Pallet / ID",
        "Palette et montage": "Pallet and fixture",
        "Palette libérée à": "Pallet released at",
        "Palette réservée": "Reserved pallet",
        "Palette réservée depuis": "Pallet reserved from",
        "Paramètres de la cellule": "Cell parameters",
        "Paramètres du solveur (JSON)": "Solver parameters (JSON)",
        "partie": "segment",
        "Passages nécessaires": "Passes required",
        "Passages nécessaires pour la phase": "Passes required for the phase",
        "Phase / OF": "Phase / MO",
        "Phase :": "Phase:",
        "Phase à planifier": "Phase to schedule",
        "Phases à planifier": "Phases to schedule",
        "pièce": "part",
        "Pièce": "Part",
        "Pièce du montage à isoler": "Part of the fixture to isolate",
        "Pièce isolée :": "Isolated part:",
        "Pièce à isoler": "Part to isolate",
        "Pièce(s) concernée(s)": "Part(s) concerned",
        "pièces": "parts",
        "Pièces": "Parts",
        "Pièces réelles dans ce montage": "Actual parts in this fixture",
        "Planning des machines, du robot et des opérateurs": "Schedule of the machines, the robot and the operators",
        "Planning du scénario": "Scenario schedule",
        "Plannings": "Schedules",
        "Plus de 5 000 opérations sur cette période. Choisissez une période plus courte ou filtrez un OF pour afficher un planning complet.": "More than 5,000 operations in this period. Choose a shorter period or filter on one MO to display a complete schedule.",
        "Position dans le montage": "Position in the fixture",
        "Positions par montage": "Positions per fixture",
        "Positions prévues par montage": "Planned positions per fixture",
        "Positions à vide du montage": "Empty positions of the fixture",
        "Positions/montage": "Positions/fixture",
        "Pourquoi cette opération ?": "Why this operation?",
        "Précédents": "Previous",
        "Présence opérateur (min)": "Operator presence (min)",
        "Période précédente": "Previous period",
        "Période précédente du stock": "Previous stock period",
        "Période suivante": "Next period",
        "Période suivante du stock": "Next stock period",
        "Qté palette maxi": "Max pallet qty",
        "Quantité de l’OF": "MO quantity",
        "Quantité de pièces": "Number of parts",
        "Quantité, temps et priorité": "Quantity, time and priority",
        "Quitter le kiosque": "Exit kiosk",
        "Rang (plus grand = prioritaire)": "Rank (higher = higher priority)",
        "Rechargement pour la reprise accompagnée": "Reloaded to resume attended machining",
        "Recherche du début de cet OF…": "Looking for the start of this MO…",
        "Reprise d’usinage accompagné": "Attended machining resumed",
        "Ressource": "Resource",
        "Ressources": "Resources",
        "Ressources affichées": "Resources displayed",
        "Retard (min)": "Lateness (min)",
        "Retard pondéré (min × rang)": "Weighted lateness (min × rank)",
        "Retard pondéré des phases (min × rang)": "Weighted lateness of the phases (min × rank)",
        "Retirer le filtre OF en conservant la période et les autres filtres": "Remove the MO filter while keeping the period and the other filters",
        "Retirer le filtre pièce et conserver l’OF et les autres filtres": "Remove the part filter and keep the MO and the other filters",
        "Revenir au début du planning": "Back to the start of the schedule",
        "Revenir en préparation": "Back to preparation",
        "Réafficher :": "Show again:",
        "Réafficher les types": "Show all types",
        "Résultat du calcul": "Computation result",
        "Résultats": "Results",
        "S et B": "S and B",
        "Scénario": "Scenario",
        "Scénario indisponible": "Scenario unavailable",
        "Semaine": "Week",
        "Sortie pendant la pause accompagnée": "Taken out during the attended pause",
        "SPT — Montages les plus courts": "SPT — Shortest fixture times first",
        "Stock de supports": "Fixture stock",
        "Stock partagé de supports": "Shared fixture stock",
        "Stock retenu au calcul": "Stock used for the computation",
        "Stock total de ce type de montage": "Total stock of this fixture type",
        "Suivants": "Next",
        "Suivre la pièce et les opérations communes à son montage dans toutes ses phases.": "Follow the part and the operations shared by its fixture through all its phases.",
        "Support / ID": "Fixture / ID",
        "Sélectionnez une barre pour voir ses horaires, ses ressources et son rôle dans la production.": "Select a bar to see its times, its resources and its role in production.",
        "Temps par pièce": "Time per part",
        "Temps total (h)": "Total time (h)",
        "Temps total du lot (h)": "Total batch time (h)",
        "Tous les montages": "All fixtures",
        "Tous les OF": "All MOs",
        "Tous les transferts robot du scénario (Detail_robot.csv).": "All robot transfers of the scenario (Detail_robot.csv).",
        "Tous les usinages CNC, autonomes, accompagnés et à vide (Detail_cnc.csv).": "All CNC machining operations: unattended, attended and empty cycles (Detail_cnc.csv).",
        "Tout": "All",
        "Toutes les opérations affectées aux opérateurs (Detail_operateur.csv).": "All operations assigned to the operators (Detail_operateur.csv).",
        "Toutes les palettes": "All pallets",
        "Transfert CNC → rotary": "Transfer CNC → rotary",
        "Transfert rotary → CNC": "Transfer rotary → CNC",
        "Transfert rotary → table": "Transfer rotary → table",
        "Transfert table → rotary": "Transfer table → rotary",
        "Transport": "Transfer",
        "Type de montage": "Fixture type",
        "Type de palette": "Pallet type",
        "type masqué": "type hidden",
        "Types d’opérations visibles": "Visible operation types",
        "types masqués": "types hidden",
        "Un cycle à vide ne correspond pas à une pièce réelle.": "An empty cycle does not correspond to a real part.",
        "Un emplacement du montage reste vide. Ce cycle occupe la CNC, sans produire de pièce.": "One position of the fixture stays empty. This cycle occupies the CNC without producing a part.",
        "Une ligne par emplacement S ou B. Les barres montrent ses réservations successives, phase par phase ou jusqu’au démontage final selon la précédence.": "One row per S or B slot. The bars show its successive reservations, phase by phase or until the final dismounting, depending on the precedence rule.",
        "Une ligne par palette physique ITS148 ou PC210. Chaque barre couvre le montage et le démontage de la phase, ou toute l’affaire selon la précédence.": "One row per physical ITS148 or PC210 pallet. Each bar covers the mounting and dismounting of the phase, or the whole job, depending on the precedence rule.",
        "Une ligne par palette physique ITS148 ou PC210. Chaque barre couvre le montage et le démontage de la phase, ou toute l’affaire selon la précédence. Les emplacements S/B restent indiqués dans le détail.": "One row per physical ITS148 or PC210 pallet. Each bar covers the mounting and dismounting of the phase, or the whole job, depending on the precedence rule. The S/B slots are still shown in the details.",
        "Une ligne par support partagé et par type de montage. Les OF et les pièces qui réutilisent un support apparaissent successivement sur la même ligne.": "One row per shared fixture and per fixture type. The MOs and parts that reuse a fixture appear one after another on the same row.",
        "Usinage": "Machining",
        "Usinage accompagné": "Attended machining",
        "Usinage par montage": "Machining per fixture",
        "Usinage par montage (h)": "Machining per fixture (h)",
        "Usinage par montage (min)": "Machining per fixture (min)",
        "Usinage à vide": "Empty cycle",
        "Usinage/montage (h)": "Machining/fixture (h)",
        "Voir le Gantt": "View the Gantt",
        "Vues de la démonstration": "Demo views",
        "· montage": "· fixture",
        "· Montage :": "· Fixture:",
        "· opération partagée (": "· shared operation (",
        "À préparer": "To prepare",
        "À vide": "Empty",
        "Échange pendant une pause": "Exchange during a pause",
        "Échéance de la phase": "Phase due date",
        "État du scénario": "Scenario status",
        "← Retour au projet": "← Back to the project"
    };

    function plural(count, one, many) { return count + ' ' + (Number(count) === 1 ? one : many); }

    // Textes composés avec des valeurs : [motif, remplacement].
    var RULES = [
        // Libellés calculés avec le planning (fiche d'une opération, résultats)
        [/^P(\d+)–P(\d+) · opération partagée$/, 'P$1–P$2 · shared operation'],
        [/^([\d.,]+) min \(positions à vide comprises\)$/, '$1 min (empty positions included)'],
        [/^(\d+) passages?$/, function (m) { return plural(m[1], 'pass', 'passes'); }],
        [/^(\d+) outils?$/, function (m) { return plural(m[1], 'tool', 'tools'); }],
        [/^(\d+) pièces?$/, function (m) { return plural(m[1], 'part', 'parts'); }],
        [/^(\d+) supports?$/, function (m) { return plural(m[1], 'fixture', 'fixtures'); }],
        [/^(\d+) emplacements?$/, function (m) { return plural(m[1], 'slot', 'slots'); }],
        [/^(\d+) positions? \/ montage$/, function (m) { return plural(m[1], 'position', 'positions') + ' / fixture'; }],
        [/^(\d+) positions? à vide$/, function (m) { return plural(m[1], 'empty position', 'empty positions'); }],
        [/^Affaire (\S+) : les palettes sont libérées après chaque phase complète ; les pièces attendent la phase suivante dans la zone de stockage intermédiaire\.$/,
            'Job $1: the pallets are released after each complete phase; the parts wait for the next phase in the intermediate storage area.'],
        // Textes assemblés par optiman_stock.js
        [/^(\d+) supports affichables · stock partagé : (.+)$/, '$1 fixtures shown · shared stock: $2'],
        [/^(\d+) palettes affichables · stock ITS148 : (\d+) · PC210 : (\d+)$/, '$1 pallets shown · ITS148 stock: $2 · PC210: $3'],
        [/^(\d+) emplacements affichables · capacité S : (\d+) · capacité B : (\d+)$/, '$1 slots shown · S capacity: $2 · B capacity: $3'],
        [/^(\d+) palettes affectées affichables · capacité S : (\d+) · capacité B : (\d+)$/, '$1 assigned pallets shown · S capacity: $2 · B capacity: $3'],
        [/^(.+) · OF (.+) · montage (\d+) · (.+ → .+)$/, '$1 · MO $2 · fixture $3 · $4'],
        [/^OF (.+) · M(\d+) · P(.+)$/, 'MO $1 · F$2 · P$3'],
        [/^(.+?)(?: · OF (.+?))? · montage (\d+) · pièces P(.+)$/, function (m) {
            return m[1] + (m[2] ? ' · MO ' + m[2] : '') + ' · fixture ' + m[3] + ' · parts P' + m[4];
        }],
        [/^Phase (\d+) · stock partagé : (.+?) · palette ([SB]-\d+) · Du (.+) au (.+) · durée ([\d.]+) min\.$/, function (m) {
            return 'Phase ' + m[1] + ' · shared stock: ' + (m[2] === 'non renseigné' ? 'not specified' : m[2]) +
                ' · pallet ' + m[3] + ' · From ' + m[4] + ' to ' + m[5] + ' · duration ' + m[6] + ' min.';
        }],
        [/^Stock de palettes : (.+?) · emplacement ([SB]-\d+) · Réservée du (.+) au (.+) · durée ([\d.]+) min\.$/,
            'Pallet stock: $1 · slot $2 · Reserved from $3 to $4 · duration $5 min.'],
        [/^Réservé du (.+) au (.+) · durée ([\d.]+) min\.$/, 'Reserved from $1 to $2 · duration $3 min.']
    ];
    // Un texte ne peut suivre une règle que s'il contient l'un de ces mots.
    var HINT = /pièce|passage|outil|support|montage|emplacement|position|palette|Affaire|Réservé|OF |opération/;

    function lookup(text) {
        if (Object.prototype.hasOwnProperty.call(EN, text)) { return EN[text]; }
        if (!HINT.test(text)) { return null; }
        for (var i = 0; i < RULES.length; i++) {
            var match = RULES[i][0].exec(text);
            if (match) { return typeof RULES[i][1] === 'function' ? RULES[i][1](match) : text.replace(RULES[i][0], RULES[i][1]); }
        }
        return null;
    }

    // Traduit un texte en conservant les espaces qui l'entourent.
    function translate(value) {
        if (lang === 'fr' || typeof value !== 'string' || !value) { return value; }
        var parts = /^(\s*)([\s\S]*?)(\s*)$/.exec(value);
        var body = parts[2];
        if (!body) { return value; }
        var hit = lookup(body.replace(/\s+/g, ' '));
        if (hit !== null) { return parts[1] + hit + parts[3]; }
        if (body.indexOf('\n') >= 0) {
            var changed = false;
            var lines = body.split('\n').map(function (line) {
                var out = translate(line);
                if (out !== line) { changed = true; }
                return out;
            });
            if (changed) { return parts[1] + lines.join('\n') + parts[3]; }
        }
        return value;
    }

    var ATTRIBUTES = ['title', 'aria-label', 'placeholder', 'alt'];
    var SKIPPED = {SCRIPT: 1, STYLE: 1, PRE: 1, CODE: 1, TEMPLATE: 1};

    function translateNode(node) {
        if (lang === 'fr' || !node) { return node; }
        if (node.nodeType === 3) {
            var text = translate(node.nodeValue);
            if (text !== node.nodeValue) { node.nodeValue = text; }
            return node;
        }
        if (node.nodeType !== 1 || SKIPPED[node.nodeName]) { return node; }
        for (var i = 0; i < ATTRIBUTES.length; i++) {
            var value = node.getAttribute(ATTRIBUTES[i]);
            if (value) {
                var translated = translate(value);
                if (translated !== value) { node.setAttribute(ATTRIBUTES[i], translated); }
            }
        }
        for (var child = node.firstChild; child; child = child.nextSibling) { translateNode(child); }
        return node;
    }

    // Enregistre la langue pour tout le site, puis recharge la démonstration.
    function setLanguage(next) {
        var stored = null;
        try {
            window.localStorage.setItem('lang', next);
            stored = window.localStorage.getItem('lang');
        } catch (ignore) { /* La langue est alors portée par l'adresse. */ }
        var search = window.location.search.replace(/[?&]lang=(fr|en)\b/, '').replace(/^&/, '?');
        if (stored !== next) { search += (search ? '&' : '?') + 'lang=' + next; }
        var target = window.location.pathname + search + window.location.hash;
        if (search === window.location.search) { window.location.reload(); } else { window.location.href = target; }
    }

    window.DEMO_I18N = {lang: lang, t: translate, dom: translateNode, setLanguage: setLanguage};

    document.documentElement.lang = lang;
    Array.prototype.forEach.call(document.querySelectorAll('.demo_lang button'), function (button) {
        var code = button.getAttribute('data-lang');
        button.setAttribute('aria-pressed', code === lang ? 'true' : 'false');
        if (code === lang) { button.classList.add('is-active'); }
        button.addEventListener('click', function () { if (code !== lang) { setLanguage(code); } });
    });
    if (lang === 'fr') { return; }

    document.title = 'OPTIMAN — interactive demo · Nourddine Bouaziz';
    var description = document.querySelector('meta[name="description"]');
    if (description) {
        description.setAttribute('content', 'Interactive demo of the OPTIMAN schedule: Gantt of the machines, the robot and the operators, pallet and fixture occupation. Static copy of the Odoo 12 module interface, on an anonymised data set.');
    }
    // Le module demande ses dates en « fr-FR » : en anglais, on lui sert le même format en « en-GB »
    // (jour/mois, 24 h), ce qui donne « Friday 13 November 2026 » sans toucher à son code.
    var NativeDateTimeFormat = window.Intl && window.Intl.DateTimeFormat;
    if (NativeDateTimeFormat) {
        var EnglishDateTimeFormat = function (locales, options) {
            return new NativeDateTimeFormat(locales === 'fr-FR' ? 'en-GB' : locales, options);
        };
        EnglishDateTimeFormat.prototype = NativeDateTimeFormat.prototype;
        EnglishDateTimeFormat.supportedLocalesOf = NativeDateTimeFormat.supportedLocalesOf;
        window.Intl.DateTimeFormat = EnglishDateTimeFormat;
    }
    translateNode(document.body);
    if (window.MutationObserver) {
        new window.MutationObserver(function (records) {
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                if (record.type === 'childList') {
                    for (var j = 0; j < record.addedNodes.length; j++) { translateNode(record.addedNodes[j]); }
                } else if (record.type === 'characterData') {
                    translateNode(record.target);
                } else if (record.type === 'attributes') {
                    var value = record.target.getAttribute(record.attributeName);
                    if (value) {
                        var translated = translate(value);
                        if (translated !== value) { record.target.setAttribute(record.attributeName, translated); }
                    }
                }
            }
        }).observe(document.body, {childList: true, subtree: true, characterData: true,
            attributes: true, attributeFilter: ATTRIBUTES});
    }
})(window);
