/*
 * OPTIMAN — démonstration statique : enveloppe de la page.
 * Le Gantt vient du module Odoo, sans modification. Ce fichier ajoute ce que le
 * client Odoo fournit d'ordinaire autour de lui : la fiche du scénario et ses
 * onglets (lecture seule), la fiche d'une opération ou d'une phase, et le
 * téléchargement des exports enregistrés avec le planning.
 */
(function (window) {
    'use strict';

    var $ = window.jQuery;
    var document = window.document;
    var demo = window.odoo.demo;
    var DATA = demo.data;
    var PLAN = DATA.plan;
    var LABELS = DATA.labels;
    // Dates et nombres suivent la langue de la démonstration (voir demo_i18n.js).
    var ENGLISH = !!(window.DEMO_I18N && window.DEMO_I18N.lang === 'en');
    var LOCALE = ENGLISH ? 'en-GB' : 'fr-FR';
    var EXPORTS = {
        robot: {file: 'exports/Detail_robot.csv', label: 'CSV robot',
            help: 'Tous les transferts robot du scénario (Detail_robot.csv).'},
        operateur: {file: 'exports/Detail_operateur.csv', label: 'CSV opérateurs',
            help: 'Toutes les opérations affectées aux opérateurs (Detail_operateur.csv).'},
        cnc: {file: 'exports/Detail_cnc.csv', label: 'CSV CNC',
            help: 'Tous les usinages CNC, autonomes, accompagnés et à vide (Detail_cnc.csv).'},
        unity: {file: 'exports/Planning_Unity_' + PLAN.id + '.zip', label: 'Exporter pour Unity',
            help: 'Archive ZIP des trois CSV du même scénario : robot, opérateurs et CNC.'}
    };

    // ------------------------------------------------------------ formatters
    var dateTimeFormat = null;
    try {
        dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
            timeZone: PLAN.tz || 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
    } catch (ignore) { /* The UTC text is shown instead. */ }

    function datetime(value) {
        if (!value) { return ''; }
        var milliseconds = demo.parseUtc(value);
        if (isNaN(milliseconds)) { return ''; }
        return dateTimeFormat ? dateTimeFormat.format(new Date(milliseconds)) : value + ' UTC';
    }

    function float(value, digits) {
        digits = digits === undefined ? 2 : digits;
        return Number(value || 0).toLocaleString(LOCALE, {minimumFractionDigits: digits, maximumFractionDigits: digits});
    }

    function integer(value) { return Number(value || 0).toLocaleString(LOCALE); }

    function floatTime(hours) {
        var total = Math.round(Math.abs(Number(hours) || 0) * 60);
        var minutes = total % 60;
        var whole = (total - minutes) / 60;
        // Same display as Odoo's float_time widget: 04:49.
        return (hours < 0 ? '-' : '') + (whole < 10 ? '0' : '') + whole + ':' + (minutes < 10 ? '0' : '') + minutes;
    }

    function label(model, field) { return (LABELS[model][field] || {}).string || field; }

    function selection(model, field, value) {
        var options = (LABELS[model][field] || {}).selection || [];
        for (var i = 0; i < options.length; i++) { if (options[i][0] === value) { return options[i][1]; } }
        return value || '';
    }

    function blank(value) { return value === false || value === null || value === undefined ? '' : value; }

    // ----------------------------------------------------------- DOM helpers
    function checkbox(checked) {
        return $('<input/>', {type: 'checkbox', 'aria-readonly': 'true'}).prop({checked: !!checked, disabled: true});
    }

    // rows: [label, value] ; a falsy row is skipped (invisible field).
    function group(title, rows) {
        var $group = $('<div/>', {'class': 'demo_group'});
        if (title) { $('<div/>', {'class': 'demo_group_title'}).text(title).appendTo($group); }
        var $body = $('<tbody/>').appendTo($('<table/>').appendTo($group));
        rows.forEach(function (row) {
            if (!row) { return; }
            var $line = $('<tr/>').appendTo($body);
            $('<td/>', {'class': 'demo_label'}).text(row[0]).appendTo($line);
            var $value = $('<td/>', {'class': 'demo_value'}).appendTo($line);
            if (row[1] && row[1].jquery) { $value.append(row[1]); } else { $value.text(blank(row[1])); }
        });
        return $group;
    }

    function groups() {
        var $container = $('<div/>', {'class': 'demo_groups'});
        Array.prototype.forEach.call(arguments, function ($group) { $container.append($group); });
        return $container;
    }

    function table(columns, rows, options) {
        options = options || {};
        var $wrap = $('<div/>', {'class': 'demo_table_wrap'});
        var $table = $('<table/>', {'class': 'demo_table'}).appendTo($wrap);
        var $head = $('<tr/>').appendTo($('<thead/>').appendTo($table));
        columns.forEach(function (column) {
            $('<th/>', {scope: 'col', 'class': column.numeric ? 'is-numeric' : ''}).text(column.label).appendTo($head);
        });
        var $body = $('<tbody/>').appendTo($table);
        rows.forEach(function (row) {
            var $line = $('<tr/>').appendTo($body);
            if (options.rowClass) { $line.addClass(options.rowClass(row) || ''); }
            if (options.onOpen) {
                $line.addClass('is-clickable').attr({tabindex: '0', title: options.openTitle || 'Ouvrir'})
                    .on('click', function () { options.onOpen(row); })
                    .on('keydown', function (event) {
                        if (event.key === 'Enter' || event.keyCode === 13) { options.onOpen(row); }
                    });
            }
            columns.forEach(function (column) {
                var value = column.value(row);
                var $cell = $('<td/>', {'class': column.numeric ? 'is-numeric' : ''}).appendTo($line);
                if (value && value.jquery) { $cell.append(value); } else { $cell.text(blank(value)); }
            });
        });
        return $wrap;
    }

    // pages: [{title, build}] ; a page is built the first time it is opened.
    function notebook(pages) {
        var $notebook = $('<div/>', {'class': 'demo_notebook'});
        var $tabs = $('<div/>', {'class': 'demo_tabs', role: 'tablist'}).appendTo($notebook);
        var $panel = $('<div/>', {'class': 'demo_tab_panel', role: 'tabpanel'}).appendTo($notebook);
        var built = [];
        function select(index) {
            $tabs.children().each(function (position) {
                $(this).toggleClass('is-active', position === index)
                    .attr('aria-selected', position === index ? 'true' : 'false');
            });
            if (!built[index]) { built[index] = pages[index].build(); }
            $panel.children().detach();
            $panel.append(built[index]);
        }
        pages.forEach(function (page, index) {
            $('<button/>', {type: 'button', role: 'tab', 'class': 'demo_tab'}).text(page.title)
                .on('click', function () { select(index); }).appendTo($tabs);
        });
        select(0);
        return $notebook;
    }

    // ----------------------------------------------------------------- modal
    var $modal = null;
    var lastFocus = null;

    function closeModal() {
        if (!$modal) { return; }
        $modal.remove();
        $modal = null;
        if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) { lastFocus.focus(); }
    }

    function openModal(title, $content) {
        closeModal();
        lastFocus = document.activeElement;
        $modal = $('<div/>', {'class': 'demo_modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title});
        var $dialog = $('<div/>', {'class': 'demo_modal_dialog'}).appendTo($modal);
        var $header = $('<div/>', {'class': 'demo_modal_header'}).appendTo($dialog);
        $('<h4/>').text(title).appendTo($header);
        $('<button/>', {type: 'button', 'class': 'demo_modal_close', 'aria-label': 'Fermer'}).text('×')
            .on('click', closeModal).appendTo($header);
        $('<div/>', {'class': 'demo_modal_body'}).append($content).appendTo($dialog);
        var $footer = $('<div/>', {'class': 'demo_modal_footer'}).appendTo($dialog);
        var $close = $('<button/>', {type: 'button', 'class': 'demo_btn demo_btn_primary'}).text('Fermer')
            .on('click', closeModal).appendTo($footer);
        $modal.on('click', function (event) { if (event.target === $modal[0]) { closeModal(); } });
        $modal.appendTo(document.body);
        $close.focus();
    }

    $(document).on('keydown', function (event) {
        if ($modal && (event.key === 'Escape' || event.keyCode === 27)) { closeModal(); }
    });

    // ------------------------------------------------------- operation sheet
    function operationDetail(id) {
        var details = DATA.details;
        var row = details.rows[id - 1];
        var result = {};
        details.cols.forEach(function (name, index) {
            result[name] = name === 'detail_legacy_contract' ? row[index] === 1 :
                (row[index] ? details.strings[row[index]] : false);
        });
        return result;
    }

    // Same groups, tabs and visibility rules as the module's operation form view.
    function openOperation(id) {
        var operation = demo.records['optiman.dev.operation'][id - 1];
        if (!operation) { return; }
        var detail = operationDetail(id);
        var L = function (field) { return label('operation', field); };
        var $form = $('<div/>');
        $form.append(groups(
            group('Opération et ressources', [
                ['Scénario', PLAN.name],
                [L('detail_affair'), detail.detail_affair],
                [L('of_id'), operation.of_id],
                [L('phase'), operation.phase],
                [L('type_op'), operation.type_op],
                [L('machine'), operation.machine],
                [L('operateur'), operation.operateur]
            ]),
            group('Horaire et pièce', [
                [L('start_datetime'), datetime(operation.start_datetime)],
                [L('end_datetime'), datetime(operation.end_datetime)],
                [L('duree'), float(operation.duree)],
                operation.duree_operateur ? [L('duree_operateur'), float(operation.duree_operateur)] : null,
                [L('detail_piece_label'), detail.detail_piece_label],
                operation.piece_idx ? [L('piece_idx'), operation.piece_idx] : null,
                operation.segment_count > 1 ? [L('segment_num'), operation.segment_num] : null,
                operation.segment_count > 1 ? [L('segment_count'), operation.segment_count] : null,
                [L('a_vide'), checkbox(operation.a_vide)]
            ])
        ));
        $form.append(notebook([
            {title: 'Palette et montage', build: function () {
                var $page = $('<div/>');
                $page.append(groups(
                    group('Palette réservée', [
                        [L('detail_palette_reference'), detail.detail_palette_reference],
                        [L('detail_palette_type'), detail.detail_palette_type],
                        operation.emplacement ? [L('emplacement'), operation.emplacement] : null,
                        [L('detail_palette_capacity'), detail.detail_palette_capacity],
                        [L('detail_reservation_start'), datetime(detail.detail_reservation_start)],
                        [L('detail_reservation_end'), datetime(detail.detail_reservation_end)]
                    ]),
                    group('Montage et chargement', [
                        [L('type_montage'), operation.type_montage],
                        [L('montage_num'), operation.montage_num],
                        detail.detail_legacy_contract ? [L('detail_montage_capacity'), detail.detail_montage_capacity] : null,
                        [L('detail_montage_nominal'), detail.detail_montage_nominal],
                        [L('detail_montage_actual'), detail.detail_montage_actual],
                        [L('detail_montage_empty'), detail.detail_montage_empty],
                        [L('detail_montage_stock'), detail.detail_montage_stock],
                        [L('detail_montage_stock_source'), detail.detail_montage_stock_source]
                    ])
                ));
                $('<p/>', {'class': 'demo_muted'}).text('Le n° de palette du planning, par exemple S-9, désigne l’emplacement réservé dans cette famille. L’emplacement reste occupé du premier montage au démontage de la dernière phase. Un numéro de série physique distinct n’est pas renseigné.').appendTo($page);
                $('<p/>', {'class': 'demo_muted'}).text('La capacité de palette compte des emplacements ; le chargement du montage compte des positions. Le stock de supports est partagé entre tous les OF du même type, pas le nombre libre à l’heure de cette opération. Un support se libère à la fin du démontage de sa phase.').appendTo($page);
                if (!detail.detail_reservation_start) {
                    $('<p/>', {'class': 'demo_muted'}).text('La période de réservation n’est pas renseignée dans ce résultat.').appendTo($page);
                }
                return $page;
            }},
            {title: 'Détails de la phase', build: function () {
                var $page = $('<div/>');
                $page.append(groups(
                    group('OF et article', [
                        [L('detail_article'), detail.detail_article],
                        [L('detail_designation'), detail.detail_designation],
                        [L('detail_lot_quantity'), detail.detail_lot_quantity],
                        [L('detail_montage_count'), detail.detail_montage_count],
                        detail.detail_legacy_contract ? null : [L('detail_machining_per_montage'), detail.detail_machining_per_montage],
                        detail.detail_legacy_contract ? null : [L('detail_machining_load'), detail.detail_machining_load]
                    ]),
                    group('Outillage CNC', [
                        [L('detail_tools_required'), detail.detail_tools_required],
                        [L('detail_machine_tool_capacity'), detail.detail_machine_tool_capacity]
                    ])
                ));
                $page.append(group('Informations conservées avec le planning', [['', detail.detail_source_note]]));
                return $page;
            }}
        ]));
        openModal('Détail de l’opération', $form);
    }

    // ----------------------------------------------------------- phase sheet
    function openLine(line) {
        var L = function (field) { return label('line', field); };
        var $form = $('<div/>');
        $form.append(groups(
            group('Identification et origine', [
                [L('sequence'), line.sequence],
                [L('id_op'), line.id_op],
                [L('id_affaire'), line.id_affaire],
                [L('phase'), line.phase],
                [L('article'), line.article],
                [L('designation'), line.designation]
            ]),
            group('Quantité, temps et priorité', [
                [L('qty'), integer(line.qty)],
                [L('t_lot_heures'), float(line.t_lot_heures)],
                [L('t_total_heures'), float(line.t_total_heures)],
                [L('jours_suivi'), line.jours_suivi],
                ['Estimation Odoo (min)', float(line.estimated_minutes)],
                [L('rang'), line.rang],
                [L('deadline_datetime'), datetime(line.deadline_datetime)]
            ])
        ));
        $form.append(groups(
            group('Montage et ressources', [
                [L('type_montage'), line.type_montage],
                [L('type_palette'), selection('line', 'type_palette', line.type_palette)],
                [L('nb_outils'), line.nb_outils]
            ]),
            group(' ', [
                ['Stock partagé de supports', integer(line.qty_montage_maxi)],
                [L('qty_palette_maxi'), integer(line.qty_palette_maxi)],
                ['Positions par montage', integer(line.qty_piece_montage)],
                [L('montage_count'), integer(line.montage_count)],
                [L('temps_piece_heures'), floatTime(line.temps_piece_heures)]
            ])
        ));
        $form.append(group('Résultat du calcul', [
            [L('machine'), line.machine],
            [L('finish_datetime'), datetime(line.finish_datetime)],
            ['Retard (min)', float(line.retard)]
        ]));
        openModal('Phase à planifier', $form);
    }

    // -------------------------------------------------------------- exports
    function download(kind) {
        var entry = EXPORTS[kind];
        if (!entry) { return; }
        var link = document.createElement('a');
        link.href = entry.file;
        link.download = entry.file.split('/').pop();
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // -------------------------------------------------------- scenario sheet
    function phasesPage() {
        var L = function (field) { return label('line', field); };
        return table([
            {label: L('id_op'), value: function (r) { return r.id_op; }},
            {label: L('id_affaire'), value: function (r) { return r.id_affaire; }},
            {label: L('phase'), numeric: true, value: function (r) { return r.phase; }},
            {label: L('article'), value: function (r) { return r.article; }},
            {label: L('qty'), numeric: true, value: function (r) { return integer(r.qty); }},
            {label: 'Temps total (h)', numeric: true, value: function (r) { return float(r.t_lot_heures); }},
            {label: 'Usinage/montage (h)', numeric: true, value: function (r) { return float(r.t_total_heures); }},
            {label: L('type_montage'), value: function (r) { return r.type_montage; }},
            {label: L('type_palette'), value: function (r) { return selection('line', 'type_palette', r.type_palette); }},
            {label: 'Stock de supports', numeric: true, value: function (r) { return integer(r.qty_montage_maxi); }},
            {label: 'Positions/montage', numeric: true, value: function (r) { return integer(r.qty_piece_montage); }},
            {label: L('montage_count'), numeric: true, value: function (r) { return integer(r.montage_count); }},
            {label: L('nb_outils'), numeric: true, value: function (r) { return integer(r.nb_outils); }},
            {label: L('rang'), numeric: true, value: function (r) { return integer(r.rang); }},
            {label: L('deadline_datetime'), value: function (r) { return datetime(r.deadline_datetime); }}
        ], DATA.lines, {onOpen: openLine, openTitle: 'Ouvrir la phase'});
    }

    function parametersPage() {
        var $page = $('<div/>');
        $('<p/>').text('Les durées sont en minutes. Le début du scénario est défini par le champ ci-dessus. La plage de travail et les jours ouvrés utilisent le fuseau de la cellule. Les stocks partagés proviennent de Qty montage maxi des OF. MONTAGES_DISPONIBLES est facultatif ; s’il est renseigné pour un type utilisé, son stock doit correspondre aux OF.').appendTo($page);
        $('<pre/>', {'class': 'demo_json'}).text(PLAN.parameters_json || '').appendTo($page);
        var template = (ENGLISH && document.getElementById('tpl-params-help-en')) || document.getElementById('tpl-params-help');
        if (template && template.content) { $page.append(document.importNode(template.content, true)); }
        return $page;
    }

    function resultsPage() {
        var L = function (field) { return label('line', field); };
        var $page = $('<div/>');
        $page.append(group(null, [
            ['Durée globale (min)', float(PLAN.makespan)],
            ['Retard pondéré (min × rang)', float(PLAN.total_retard)],
            [label('plan', 'score_f'), float(PLAN.score_f, 6)]
        ]));
        if (PLAN.warnings) { $('<div/>', {'class': 'demo_alert', role: 'status'}).text(PLAN.warnings).appendTo($page); }
        $('<p/>').text('Le calcul est conservé dans ce scénario. Les dates et affectations des OF Odoo ne sont pas modifiées.').appendTo($page);
        $page.append(table([
            {label: L('id_op'), value: function (r) { return r.id_op; }},
            {label: L('id_affaire'), value: function (r) { return r.id_affaire; }},
            {label: L('phase'), numeric: true, value: function (r) { return r.phase; }},
            {label: L('machine'), value: function (r) { return r.machine; }},
            {label: L('finish_datetime'), value: function (r) { return datetime(r.finish_datetime); }},
            {label: 'Retard (min)', numeric: true, value: function (r) { return float(r.retard); }}
        ], DATA.lines, {onOpen: openLine, openTitle: 'Ouvrir la phase'}));
        return $page;
    }

    function operationsPage() {
        var L = function (field) { return label('operation', field); };
        var all = demo.records['optiman.dev.operation'];
        var size = 40;
        var pages = Math.max(1, Math.ceil(all.length / size));
        var page = 0;
        var columns = [
            {label: 'Scénario', value: function () { return PLAN.name; }},
            {label: L('of_id'), value: function (r) { return r.of_id; }},
            {label: L('phase'), numeric: true, value: function (r) { return r.phase; }},
            {label: L('type_op'), value: function (r) { return r.type_op; }},
            {label: L('machine'), value: function (r) { return r.machine; }},
            {label: L('operateur'), value: function (r) { return r.operateur; }},
            {label: L('montage_num'), numeric: true, value: function (r) { return r.montage_num; }},
            {label: L('type_palette'), value: function (r) { return selection('operation', 'type_palette', r.type_palette); }},
            {label: L('emplacement'), numeric: true, value: function (r) { return r.emplacement; }},
            {label: L('pieces_label'), value: function (r) { return r.pieces_label; }},
            {label: L('a_vide'), value: function (r) { return checkbox(r.a_vide); }},
            {label: L('start_datetime'), value: function (r) { return datetime(r.start_datetime); }},
            {label: L('end_datetime'), value: function (r) { return datetime(r.end_datetime); }},
            {label: 'Durée (min)', numeric: true, value: function (r) { return float(r.duree); }}
        ];
        var $page = $('<div/>');
        var $pager = $('<div/>', {'class': 'demo_pager'}).appendTo($page);
        var $range = $('<span/>', {'aria-live': 'polite'}).appendTo($pager);
        var $previous = $('<button/>', {type: 'button', 'class': 'demo_btn', 'aria-label': 'Page précédente'}).text('‹').appendTo($pager);
        var $next = $('<button/>', {type: 'button', 'class': 'demo_btn', 'aria-label': 'Page suivante'}).text('›').appendTo($pager);
        var $slot = $('<div/>').appendTo($page);
        function render() {
            var start = page * size;
            var rows = all.slice(start, start + size);
            $range.text(integer(start + 1) + '-' + integer(start + rows.length) + ' / ' + integer(all.length));
            $slot.empty().append(table(columns, rows, {
                onOpen: function (row) { openOperation(row.id); }, openTitle: 'Ouvrir la fiche de l’opération',
                rowClass: function (row) { return row.a_vide ? 'is-muted' : ''; }
            }));
        }
        // Like Odoo's pager, the pages wrap around.
        $previous.on('click', function () { page = page === 0 ? pages - 1 : page - 1; render(); });
        $next.on('click', function () { page = page === pages - 1 ? 0 : page + 1; render(); });
        render();
        return $page;
    }

    function buildScenario() {
        var $view = $('#view-scenario').empty();
        var $crumb = $('<div/>', {'class': 'demo_breadcrumb'}).appendTo($view);
        $('<span/>').text('Plannings').appendTo($crumb);
        $('<span/>', {'class': 'demo_breadcrumb_sep', 'aria-hidden': 'true'}).text('/').appendTo($crumb);
        $('<strong/>').text(PLAN.name).appendTo($crumb);

        var $status = $('<div/>', {'class': 'demo_statusbar'}).appendTo($view);
        var $buttons = $('<div/>', {'class': 'demo_statusbar_buttons'}).appendTo($status);
        $('<button/>', {type: 'button', 'class': 'demo_btn demo_btn_primary'}).text('Voir le Gantt')
            .on('click', function () { window.location.hash = 'gantt'; }).appendTo($buttons);
        ['robot', 'operateur', 'cnc', 'unity'].forEach(function (kind) {
            $('<button/>', {type: 'button', 'class': 'demo_btn', title: EXPORTS[kind].help}).text(EXPORTS[kind].label)
                .on('click', function () { download(kind); }).appendTo($buttons);
        });
        $('<button/>', {type: 'button', 'class': 'demo_btn',
            title: 'Désactivé dans la démonstration : le scénario est enregistré, aucun calcul n’est exécuté en ligne.'})
            .text('Revenir en préparation').prop('disabled', true).appendTo($buttons);
        var $steps = $('<div/>', {'class': 'demo_steps', role: 'group', 'aria-label': 'État du scénario'}).appendTo($status);
        ((LABELS.plan.state || {}).selection || []).forEach(function (option) {
            $('<span/>', {'class': 'demo_step' + (option[0] === PLAN.state ? ' is-current' : '')}).text(option[1]).appendTo($steps);
        });

        var $sheet = $('<div/>', {'class': 'demo_sheet'}).appendTo($view);
        $('<h1/>', {'class': 'demo_title'}).text(PLAN.name).appendTo($sheet);
        $sheet.append(groups(
            group(null, [
                [label('plan', 'start_datetime'), datetime(PLAN.start_datetime)],
                [label('plan', 'tz'), PLAN.tz]
            ]),
            group(null, [
                [label('plan', 'algorithm'), selection('plan', 'algorithm', PLAN.algorithm)],
                [label('plan', 'computed_at'), datetime(PLAN.computed_at)]
            ])
        ));
        $sheet.append(notebook([
            {title: 'Phases à planifier', build: phasesPage},
            {title: 'Paramètres de la cellule', build: parametersPage},
            {title: 'Résultats', build: resultsPage},
            {title: 'Opérations', build: operationsPage}
        ]));
    }

    // --------------------------------------------------------------- routing
    var VIEWS = {gantt: '#view-gantt', scenario: '#view-scenario'};
    var scenarioBuilt = false;

    function route() {
        var name = (window.location.hash || '').replace(/^#/, '');
        if (!VIEWS[name]) { name = 'gantt'; }
        if (name === 'scenario' && !scenarioBuilt) {
            buildScenario();
            scenarioBuilt = true;
        }
        closeModal();
        Object.keys(VIEWS).forEach(function (key) { $(VIEWS[key]).prop('hidden', key !== name); });
        $('.demo_nav_link').each(function () {
            var active = $(this).attr('data-view') === name;
            $(this).toggleClass('is-active', active);
            if (active) { $(this).attr('aria-current', 'page'); } else { $(this).removeAttr('aria-current'); }
        });
    }

    // What the Gantt asks its host to open: the scenario, an operation, an export.
    demo.onAction(function (action) {
        if (!action) { return; }
        if (action.type === 'ir.actions.client' && action.tag === 'optiman_dev_export_csv') {
            return download(action.params && action.params.kind);
        }
        if (action.type === 'ir.actions.act_window' && action.res_model === 'optiman.dev.plan') {
            window.location.hash = 'scenario';
            return;
        }
        if (action.type === 'ir.actions.act_window' && action.res_model === 'optiman.dev.operation') {
            return openOperation(action.res_id);
        }
    });

    $(function () {
        $(window).on('hashchange', route);
        route();
        demo.mount('optiman_dev_gantt', {plan_id: PLAN.id}, '#view-gantt').then(function () {
            $('#demo-loading').remove();
        }, function () {
            $('#demo-loading').text('La démonstration n’a pas pu démarrer. Rechargez la page.');
        });
    });
})(window);
