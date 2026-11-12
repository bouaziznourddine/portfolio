odoo.define('optiman_dev.Gantt', function (require) {
    'use strict';

    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var fieldUtils = require('web.field_utils');
    var session = require('web.session');
    var _t = core._t;
    var DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';
    var MAX_OPERATIONS = 5000;
    var LEGEND_TYPES = ['montage', 'usinage', 'supervised', 'empty', 'rotation', 'demontage', 'transport'];
    var OPERATION_FIELDS = [
        'of_id', 'phase', 'type_op', 'machine', 'operateur', 'montage_num',
        'piece_idx', 'pieces_label', 'type_montage', 'a_vide', 'emplacement', 'type_palette',
        'start_datetime', 'end_datetime', 'duree', 'duree_operateur', 'segment_num', 'segment_count', 'pause_exchange'
    ];

    function utc(value) {
        return moment.utc(value, DATE_FORMAT, true);
    }

    function isRobot(operation) {
        return (operation.type_op || '').indexOf('robot_') === 0;
    }

    function operationLabel(operation) {
        if (operation.pause_exchange) {
            return operation.type_op === 'robot_cnc_rotary' ? _t('Sortie pendant la pause accompagnée') : _t('Rechargement pour la reprise accompagnée');
        }
        var labels = {
            montage: _t('Montage'), rotation: _t('Rotation'),
            demontage: _t('Démontage'), usinage: _t('Usinage'),
            robot_table_rotary: _t('Transfert table → rotary'),
            robot_rotary_cnc: _t('Transfert rotary → CNC'),
            robot_cnc_rotary: _t('Transfert CNC → rotary'),
            robot_rotary_table: _t('Transfert rotary → table')
        };
        if (operation.a_vide) { return _t('Usinage à vide'); }
        if (operation.type_op === 'usinage' && operation.operateur) {
            if (operation.segment_count > 1) {
                return (operation.segment_num > 1 ? _t('Reprise d’usinage accompagné') : _t('Usinage accompagné')) +
                    ' · ' + _t('partie ') + operation.segment_num + '/' + operation.segment_count;
            }
            return _t('Usinage accompagné');
        }
        return labels[operation.type_op] || operation.type_op;
    }

    function operationClass(operation) {
        if (operation.a_vide) { return 'optiman_empty'; }
        if (operation.type_op === 'usinage' && operation.operateur) {
            return 'optiman_supervised';
        }
        var classes = {
            montage: 'optiman_montage', rotation: 'optiman_rotation',
            demontage: 'optiman_demontage', usinage: 'optiman_usinage',
            robot_table_rotary: 'optiman_robot_out', robot_rotary_cnc: 'optiman_robot_out',
            robot_cnc_rotary: 'optiman_robot_back', robot_rotary_table: 'optiman_robot_back'
        };
        return classes[operation.type_op] || 'optiman_other';
    }

    function operationWhy(operation) {
        if (operation.pause_exchange) {
            return operation.type_op === 'robot_cnc_rotary' ?
                _t('Le robot sort la palette interrompue sans la démonter. La CNC peut usiner d’autres montages autonomes ; cette palette et son support restent réservés.') :
                _t('Le robot recharge la même palette au jour ouvré suivant pour poursuivre la même pièce avec son opérateur.');
        }
        if (operation.a_vide) {
            return _t('Un emplacement du montage reste vide. Ce cycle occupe la CNC, sans produire de pièce.');
        }
        if (operation.type_op === 'usinage' && operation.operateur) {
            if (operation.segment_count > 1) {
                var resume = _t('Cette partie concerne la même pièce que les autres parties de cet usinage. ') +
                    _t('L’usinage accompagné est mis en pause à la fermeture et reprend au prochain jour ouvré. ') +
                    _t('La palette et le support restent réservés. Les transferts robot indiquent si la palette est sortie pour permettre d’autres usinages pendant la pause.');
                if (operation.duree_operateur > 0 && operation.duree_operateur < operation.duree) {
                    resume += ' ' + _t('Dans cette partie, la présence opérateur dure ') + operation.duree_operateur +
                        _t(' min ; la CNC poursuit ensuite seule.');
                }
                return resume;
            }
            if (operation.duree_operateur > 0 && operation.duree_operateur < operation.duree) {
                return _t('L’opérateur suit le début de la première pièce de cette phase pendant ') +
                    operation.duree_operateur + _t(' min ; la CNC poursuit ensuite l’usinage seule.');
            }
            return _t('La première pièce de cette phase nécessite un suivi opérateur. La CNC et l’opérateur sont mobilisés ensemble.');
        }
        var explanations = {
            montage: _t('L’opérateur fixe les pièces sur le montage avant leur transfert vers la CNC.'),
            rotation: _t('L’opérateur réoriente les pièces avant l’usinage de cette phase, pendant la durée prévue par le solveur.'),
            demontage: _t('L’opérateur retire les pièces après usinage et libère le montage.'),
            usinage: _t('La CNC usine la pièce. Aucun suivi opérateur n’est affecté à ce cycle dans le planning calculé.'),
            robot_table_rotary: _t('Le robot transporte le montage depuis la table vers le rotary.'),
            robot_rotary_cnc: _t('Le robot charge le montage depuis le rotary dans la CNC. La CNC est mobilisée pendant ce transfert.'),
            robot_cnc_rotary: _t('Le robot sort le montage de la CNC et le dépose sur le rotary. La CNC est libérée à la fin de ce transfert.'),
            robot_rotary_table: _t('Le robot ramène le montage sur la table pour la suite des opérations.')
        };
        return explanations[operation.type_op] || _t('Opération issue du planning calculé.');
    }

    function operationCategory(operation) {
        if (operation.a_vide) { return 'empty'; }
        if (operation.type_op === 'usinage' && operation.operateur) { return 'supervised'; }
        if (isRobot(operation)) { return 'transport'; }
        return operation.type_op;
    }

    var Gantt = AbstractAction.extend({
        template: 'optiman_dev.Gantt',
        hasControlPanel: false,
        events: {
            'click .optiman_refresh': '_onRefresh',
            'click .optiman_export_csv': '_onExportCSV',
            'click .optiman_kiosk_toggle': '_onToggleKiosk',
            'click .optiman_legend_toggle': '_onLegendToggle',
            'click .optiman_legend_reset': '_onLegendReset',
            'click .optiman_open_plan': '_onOpenPlan',
            'click .optiman_first': '_onFirst',
            'click .optiman_previous': '_onPrevious',
            'click .optiman_next': '_onNext',
            'click .optiman_zoom_button': '_onZoom',
            'click .optiman_resource_filter': '_onResourceFilter',
            'change .optiman_of_filter': '_onOfFilter',
            'click .optiman_bar': '_onOperation',
            'click .optiman_isolate': '_onIsolate',
            'click .optiman_show_all': '_onShowAllOF',
            'click .optiman_isolate_piece': '_onIsolatePiece',
            'change .optiman_piece_choice': '_onPieceChoice',
            'click .optiman_show_all_pieces': '_onShowAllPieces',
            'click .optiman_center': '_onCenter',
            'click .optiman_open_operation': '_onOpenOperation'
        },

        init: function (parent, action) {
            this._super.apply(this, arguments);
            this.planId = action.params && Number(action.params.plan_id);
            this.plan = null;
            this.windowMinutes = 120;
            this.windowStart = null;
            this.firstStart = null;
            this.lastEnd = null;
            this.resourceFilter = 'all';
            this.ofFilter = '';
            this.pieceFilter = null;
            this.selectedPieceNumber = null;
            this.hiddenTypes = Object.create(null);
            this.operations = [];
            this.selectedOperation = null;
            this.affairs = Object.create(null);
            this.lineAffairs = Object.create(null);
            this.lineDetails = Object.create(null);
            this.emptyCount = 0;
            this.pieceCount = 0;
            this.metadataComplete = true;
            this.busy = false;
            this.windowLoaded = false;
            this.isKiosk = false;
            this._kioskPending = false;
            this._kioskNative = false;
            this._kioskDestroying = false;
            this._prepareDates();
        },

        willStart: function () {
            return $.when(this._super.apply(this, arguments), this._readMetadata());
        },

        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._bindKioskEvents();
                return self._loadWindow();
            });
        },

        _bindKioskEvents: function () {
            if (this._kioskDocument) { return; }
            var self = this;
            var doc = this._kioskDocument = this.el.ownerDocument;
            this._kioskFullscreenChange = function () {
                if (self._ownsFullscreen()) {
                    self._kioskNative = true;
                    if (!self.isKiosk || self._kioskDestroying) { self._exitNativeFullscreen(); }
                    else { self.$('.optiman_kiosk_status').text(_t('Mode kiosque · Échap pour quitter')); }
                } else if (self._kioskNative) {
                    self._kioskNative = false;
                    self._setKiosk(false);
                }
            };
            this._kioskKeydown = function (event) {
                if (!self.isKiosk) { return; }
                if (event.key === 'Escape' || event.keyCode === 27) {
                    event.preventDefault();
                    self._leaveKiosk();
                } else if (event.key === 'Tab' || event.keyCode === 9) {
                    var $focusable = self.$('button:enabled, select:enabled, [tabindex="0"]').filter(':visible');
                    var first = $focusable[0];
                    var last = $focusable[$focusable.length - 1];
                    if (first && (!self.el.contains(doc.activeElement) ||
                            (event.shiftKey && doc.activeElement === first) ||
                            (!event.shiftKey && doc.activeElement === last))) {
                        event.preventDefault();
                        (event.shiftKey ? last : first).focus();
                    }
                }
            };
            doc.addEventListener('fullscreenchange', this._kioskFullscreenChange);
            doc.addEventListener('webkitfullscreenchange', this._kioskFullscreenChange);
            doc.addEventListener('keydown', this._kioskKeydown, true);
        },

        _ownsFullscreen: function () {
            var doc = this._kioskDocument;
            return !!doc && (doc.fullscreenElement || doc.webkitFullscreenElement) === this.el;
        },

        _setKiosk: function (enabled) {
            this.isKiosk = enabled;
            if (this._kioskDestroying || this.isDestroyed()) { return; }
            this.$el.toggleClass('optiman_is_kiosk', enabled);
            this.$('.optiman_kiosk_toggle').text(enabled ? _t('Quitter le kiosque') : _t('Mode kiosque'))
                .attr('aria-pressed', enabled ? 'true' : 'false');
            this.$('.optiman_kiosk_status').text(enabled ? _t('Mode kiosque dans la fenêtre · Échap pour quitter') : '').toggle(enabled);
            // Keep the exit available even while a planning request is running.
            var button = this.$('.optiman_kiosk_toggle')[0];
            if (button) { button.focus(); }
        },

        _onToggleKiosk: function () {
            if (this.isKiosk) { return this._leaveKiosk(); }
            if (this._kioskPending) { return; }
            this._bindKioskEvents();
            this._setKiosk(true);
            var self = this;
            var doc = this._kioskDocument;
            var request = this.el.requestFullscreen || this.el.webkitRequestFullscreen;
            // Do not replace a fullscreen view owned by another component.
            if (!request || doc.fullscreenElement || doc.webkitFullscreenElement) { return; }
            this._kioskPending = true;
            function finish() {
                self._kioskPending = false;
                if (!self.isKiosk || self._kioskDestroying) { self._exitNativeFullscreen(); }
            }
            try {
                var result = request.call(this.el);
                if (result && result.then) {
                    result.then(function () {
                        // A fast browser-driven exit can precede fullscreenchange.
                        self._kioskNative = true;
                        self._kioskFullscreenChange();
                        finish();
                    }, finish);
                }
                else { finish(); }
            } catch (ignore) {
                // The CSS window mode remains fully usable if fullscreen is denied.
                finish();
            }
        },

        _exitNativeFullscreen: function () {
            var self = this;
            var doc = this._kioskDocument;
            if (!this._ownsFullscreen()) { return $.when(true); }
            var exit = doc.exitFullscreen || doc.webkitExitFullscreen;
            function failed() {
                if (!self._kioskDestroying && self._ownsFullscreen()) {
                    self._setKiosk(true);
                    self.$('.optiman_kiosk_status').text(_t('Appuyez sur Échap pour quitter le plein écran.'));
                }
                return false;
            }
            try {
                if (!exit) { return $.when(failed()); }
                var result = exit.call(doc);
                // Odoo 12's jQuery does not assimilate native Promises with $.when.
                return result && result.then ? result.then(function () { return true; }, failed) : $.when(true);
            } catch (ignore) { return $.when(failed()); }
        },

        _leaveKiosk: function () {
            this._setKiosk(false);
            return this._exitNativeFullscreen();
        },

        _actionOutsideKiosk: function (action) {
            var self = this;
            if (!this.isKiosk && !this._ownsFullscreen()) { return this.do_action(action); }
            return this._leaveKiosk().then(function (exited) {
                if (exited !== false && !self.isDestroyed()) { return self.do_action(action); }
            });
        },

        destroy: function () {
            this._kioskDestroying = true;
            this.isKiosk = false;
            var doc = this._kioskDocument;
            if (doc) {
                doc.removeEventListener('fullscreenchange', this._kioskFullscreenChange);
                doc.removeEventListener('webkitfullscreenchange', this._kioskFullscreenChange);
                doc.removeEventListener('keydown', this._kioskKeydown, true);
                this._exitNativeFullscreen();
            }
            this.$el.removeClass('optiman_is_kiosk');
            return this._super.apply(this, arguments);
        },

        _readMetadata: function () {
            var self = this;
            if (!Number.isInteger(this.planId) || this.planId <= 0) { return $.when(); }
            var domain = [['plan_id', '=', this.planId]];
            return $.when(
                this._rpc({
                    model: 'optiman.dev.plan', method: 'read',
                    args: [[this.planId], ['name', 'state', 'start_datetime', 'tz', 'parameters_json', 'algorithm']]
                }),
                this._rpc({
                    model: 'optiman.dev.operation', method: 'search_read',
                    domain: domain, fields: ['start_datetime'], limit: 1,
                    // Odoo 12 needs descriptors; a string here produces "undefined ASC".
                    orderBy: [{name: 'start_datetime'}, {name: 'id'}]
                }),
                this._rpc({
                    model: 'optiman.dev.operation', method: 'search_read',
                    domain: domain, fields: ['end_datetime'], limit: 1,
                    orderBy: [{name: 'end_datetime', asc: false}, {name: 'id', asc: false}]
                }),
                this._rpc({
                    model: 'optiman.dev.line', method: 'search_read',
                    domain: domain, fields: ['id_op', 'id_affaire', 'qty', 'qty_piece_montage'], limit: 2001,
                    orderBy: [{name: 'sequence'}, {name: 'id'}]
                }),
                this._rpc({
                    model: 'optiman.dev.operation', method: 'search_count',
                    args: [domain.concat([['type_op', '=', 'usinage'], ['a_vide', '=', true]])]
                })
            ).then(function (plans, first, last, lines, emptyCount) {
                if (self.isDestroyed()) { return; }
                self.plan = plans.length ? plans[0] : null;
                self.firstStart = first.length ? utc(first[0].start_datetime).valueOf() : null;
                self.lastEnd = last.length ? utc(last[0].end_datetime).valueOf() : null;
                if (self.windowStart === null || self.windowStart >= self.lastEnd || self.windowStart < self.firstStart) {
                    self.windowStart = self.firstStart;
                }
                self.affairs = Object.create(null);
                self.lineAffairs = Object.create(null);
                self.lineDetails = Object.create(null);
                self.pieceCount = 0;
                self.metadataComplete = lines.length <= 2000;
                lines.forEach(function (line) {
                    var key = line.id_affaire;
                    if (!self.affairs[key]) {
                        self.affairs[key] = {ids: [], qty: line.qty};
                        self.pieceCount += line.qty;
                    } else if (self.affairs[key].qty !== line.qty) {
                        self.metadataComplete = false;
                    }
                    self.affairs[key].ids.push(line.id_op);
                    self.lineAffairs[line.id_op] = key;
                    self.lineDetails[line.id_op] = line;
                });
                if (self.ofFilter && !self.affairs[self.ofFilter]) { self.ofFilter = ''; }
                if (self.pieceFilter && (self.pieceFilter.affair !== self.ofFilter ||
                        !self._pieceSpecs(self.pieceFilter.affair, self.pieceFilter.number))) {
                    self.pieceFilter = null;
                    self.selectedPieceNumber = null;
                }
                self.emptyCount = emptyCount;
                self._prepareDates();
            });
        },

        _prepareDates: function () {
            this.dateFormats = null;
            this.displayTimezone = (this.plan && this.plan.tz) || session.user_context.tz || 'UTC';
            try {
                var timezone = this.displayTimezone;
                this.dateFormats = {
                    time: new Intl.DateTimeFormat('fr-FR', {timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false}),
                    short: new Intl.DateTimeFormat('fr-FR', {timeZone: timezone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false}),
                    day: new Intl.DateTimeFormat('fr-FR', {timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})
                };
            } catch (ignore) {
                // Older browsers use Odoo's formatter, and the label states its actual timezone.
                this.displayTimezone = session.user_context.tz || 'UTC';
            }
        },

        _date: function (milliseconds, format) {
            if (milliseconds === null || milliseconds === undefined || !isFinite(milliseconds)) { return '—'; }
            if (this.dateFormats) { return this.dateFormats[format || 'short'].format(new Date(milliseconds)); }
            return fieldUtils.format.datetime(moment.utc(milliseconds));
        },

        _renderHeader: function () {
            var self = this;
            this.$('.optiman_gantt_name').text(this.plan ? this.plan.name : _t('Scénario indisponible'));
            this.$('.optiman_gantt_timezone').text(
                (this.dateFormats ? _t('Heures de l’atelier : ') : _t('Heures du compte Odoo : ')) + this.displayTimezone
            );
            var algorithm = this.plan && this.plan.algorithm || 'cmax';
            var algorithmLabels = {cmax: 'Cmax', priority: 'Cmax', edd: 'EDD', spt: 'SPT'};
            this.$('.optiman_gantt_algorithm').text(algorithmLabels[algorithm] || algorithm.toUpperCase());
            this.$('.optiman_gantt_day').text(this._date(this.windowStart, 'day'));
            var hasResult = this.plan && this.plan.state === 'done' && this.firstStart !== null;
            this.$('.optiman_metric_of').text(hasResult && this.metadataComplete ? Object.keys(this.affairs).length : '—');
            this.$('.optiman_metric_pieces').text(hasResult && this.metadataComplete ? this.pieceCount : '—');
            this.$('.optiman_metric_end').text(hasResult ? this._date(this.lastEnd) : '—');
            this.$('.optiman_metric_empty').text(hasResult ? this.emptyCount : '—');
            this.$('.optiman_metric_pieces_label').text(this.pieceCount === 1 ? _t('pièce') : _t('pièces'));
            this.$('.optiman_metric_empty_label').text(this.emptyCount === 1 ? _t('cycle à vide') : _t('cycles à vide'));
            var $filter = this.$('.optiman_of_filter').empty();
            $('<option/>', {value: ''}).text(_t('Tous les OF')).appendTo($filter);
            Object.keys(this.affairs).sort().forEach(function (key) {
                $('<option/>', {value: key}).text(key).appendTo($filter);
            });
            $filter.val(this.ofFilter);
            this.$('.optiman_show_all').toggle(!!this.ofFilter).prop('disabled', this.busy);
            this.$('.optiman_piece_filter_status').toggle(!!this.pieceFilter);
            this.$('.optiman_piece_filter_label').text(this.pieceFilter ?
                _t('Pièce isolée : ') + this.pieceFilter.affair + ' · P' + this.pieceFilter.number : '');
            this.$('.optiman_show_all_pieces').prop('disabled', this.busy);
            this.$('.optiman_resource_filter').each(function () {
                var active = $(this).attr('data-resource') === self.resourceFilter;
                $(this).toggleClass('is-active', active).attr('aria-pressed', active ? 'true' : 'false');
            });
            this.$('.optiman_zoom_button').each(function () {
                var active = Number($(this).attr('data-minutes')) === self.windowMinutes;
                $(this).toggleClass('is-active', active).attr('aria-pressed', active ? 'true' : 'false');
            });
            this._updateLegend();
            this.$('.optiman_export_csv').prop('disabled', this.busy || !this._canExportCSV());
        },

        _updateLegend: function () {
            var self = this;
            this.$('.optiman_legend_toggle').each(function () {
                var $button = $(this);
                var hidden = !!self.hiddenTypes[$button.attr('data-type')];
                $button.toggleClass('is-muted', hidden).attr('aria-pressed', hidden ? 'false' : 'true')
                    .attr('title', (hidden ? _t('Réafficher : ') : _t('Masquer : ')) + $button.text().trim());
            });
            var count = Object.keys(this.hiddenTypes).length;
            this.$('.optiman_legend_reset').toggle(count > 0);
            this.$('.optiman_legend_summary').text(count ? count + (count === 1 ? _t(' type masqué') : _t(' types masqués')) : '');
        },

        _applyTypeVisibility: function () {
            this._updateLegend();
            if (this.selectedOperation && this.hiddenTypes[operationCategory(this.selectedOperation)]) {
                this.selectedOperation = null;
                this._renderDetails();
            }
            // Preserve load/overflow/error notices until a complete window is available.
            if (this.windowLoaded) {
                this._renderOperations(this.operations);
                this._showWindowNotice();
            }
        },

        _onLegendToggle: function (event) {
            if (this.busy) { return; }
            var type = $(event.currentTarget).attr('data-type');
            if (LEGEND_TYPES.indexOf(type) < 0) { return; }
            if (this.hiddenTypes[type]) { delete this.hiddenTypes[type]; }
            else { this.hiddenTypes[type] = true; }
            this._applyTypeVisibility();
        },

        _onLegendReset: function () {
            if (this.busy) { return; }
            this.hiddenTypes = Object.create(null);
            this._applyTypeVisibility();
        },

        _setBusy: function (busy) {
            this.busy = busy;
            this.$('.optiman_gantt_toolbar button, .optiman_refresh, .optiman_resource_filter, .optiman_of_filter, .optiman_isolate, .optiman_show_all, .optiman_isolate_piece, .optiman_piece_choice, .optiman_show_all_pieces, .optiman_center, .optiman_bar, .optiman_legend_toggle, .optiman_legend_reset')
                .prop('disabled', busy);
            this.$('.optiman_gantt_scroll').attr('aria-busy', busy ? 'true' : 'false');
            this.$('.optiman_export_csv').prop('disabled', busy || !this._canExportCSV());
            if (!busy) {
                this.$('.optiman_previous, .optiman_first').prop('disabled', this.firstStart === null || this.windowStart <= this.firstStart);
                this.$('.optiman_next').prop('disabled', this.lastEnd === null || this.windowStart + this.windowMinutes * 60000 >= this.lastEnd);
                if (this.selectedOperation) { this._renderPieceControls(); }
            }
        },

        _canExportCSV: function () {
            return Number.isInteger(this.planId) && this.planId > 0 && this.plan && this.plan.state === 'done';
        },

        _onExportCSV: function (event) {
            if (this.busy || this.isDestroyed() || !this._canExportCSV()) { return; }
            var methods = {robot: 'action_export_robot', operateur: 'action_export_operateur',
                cnc: 'action_export_cnc', unity: 'action_export_unity'};
            var kind = $(event.currentTarget).attr('data-export-kind');
            if (!Object.prototype.hasOwnProperty.call(methods, kind)) { return; }
            var self = this;
            this._setBusy(true);
            // Export the saved scenario; visible OF, period, resource and type filters are not sent.
            return this._rpc({
                model: 'optiman.dev.plan', method: methods[kind], args: [[this.planId]]
            }).then(function (action) {
                if (self.isDestroyed()) { return; }
                self._setBusy(false);
                return self._actionOutsideKiosk(action);
            }, function (error) {
                if (!self.isDestroyed()) {
                    self._setBusy(false);
                    self._notice(_t('Export impossible. Vérifiez la connexion et vos droits, puis réessayez.'), true);
                    if (self.isKiosk) { self._leaveKiosk(); }
                }
                return $.Deferred().reject(error);
            });
        },

        _notice: function (message, warning) {
            this.$('.optiman_gantt_notice').toggleClass('alert-warning', !!warning)
                .toggleClass('alert-info', !warning).text(message || '').toggle(!!message);
        },

        _clearOperations: function () {
            this.windowLoaded = false;
            this.operations = [];
            this.selectedOperation = null;
            this.selectedPieceNumber = null;
            this.$('.optiman_gantt_timeline').empty();
            this._renderDetails();
        },

        _loadWindow: function () {
            var self = this;
            this.windowLoaded = false;
            this._renderHeader();
            if (!this.plan || this.plan.state !== 'done' || this.firstStart === null) {
                this._clearOperations();
                this._setBusy(false);
                this.$('.optiman_first, .optiman_previous, .optiman_next, .optiman_zoom_button, .optiman_of_filter').prop('disabled', true);
                this.$('.optiman_gantt_period').text('');
                this._notice(_t('Aucun planning calculé. Préparez puis calculez le scénario pour afficher ses opérations.'));
                return $.when();
            }
            this._setBusy(true);
            this._notice(_t('Chargement de la période…'));
            var windowEnd = this.windowStart + this.windowMinutes * 60000;
            var domain = [
                ['plan_id', '=', this.planId],
                ['start_datetime', '<', moment.utc(windowEnd).format(DATE_FORMAT)],
                ['end_datetime', '>=', moment.utc(this.windowStart).format(DATE_FORMAT)]
            ];
            if (this.ofFilter && this.affairs[this.ofFilter]) {
                domain.push(['of_id', 'in', this.affairs[this.ofFilter].ids]);
            }
            if (this.pieceFilter) {
                domain = domain.concat(this._pieceDomain());
            }
            return this._rpc({
                model: 'optiman.dev.operation', method: 'search_read',
                domain: domain, fields: OPERATION_FIELDS, limit: MAX_OPERATIONS + 1,
                orderBy: [{name: 'start_datetime'}, {name: 'id'}]
            }).then(function (operations) {
                if (self.isDestroyed()) { return; }
                self._setBusy(false);
                self.$('.optiman_gantt_period').text(self._date(self.windowStart) + ' → ' + self._date(windowEnd));
                self.$('.optiman_previous, .optiman_first').prop('disabled', self.windowStart <= self.firstStart);
                self.$('.optiman_next').prop('disabled', windowEnd >= self.lastEnd);
                if (operations.length > MAX_OPERATIONS) {
                    self._clearOperations();
                    self._notice(_t('Plus de 5 000 opérations sur cette période. Choisissez une période plus courte ou filtrez un OF pour afficher un planning complet.'), true);
                    return;
                }
                self.operations = operations;
                self.windowLoaded = true;
                if (self.selectedOperation) {
                    var selected = operations.filter(function (op) { return op.id === self.selectedOperation.id; });
                    if (selected.length) { self.selectedOperation = selected[0]; }
                }
                self._renderOperations(operations);
                self._renderDetails();
                self._showWindowNotice();
            }, function (error) {
                if (!self.isDestroyed()) {
                    self._setBusy(false);
                    self._clearOperations();
                    self._notice(_t('Impossible de charger le planning. Actualisez après avoir vérifié la connexion et vos droits.'), true);
                    if (self.isKiosk) { self._leaveKiosk(); }
                }
                return $.Deferred().reject(error);
            });
        },

        _showWindowNotice: function () {
            var groups = this._rows(this.operations);
            var visible = ['machines', 'robot', 'operators'].some(function (group) {
                return groups[group].some(function (row) { return row.operations.length; });
            });
            var message = visible ? '' : _t('Aucune opération pour ces filtres sur cette période. Changez la période ou sélectionnez Tous les OF / Tout.');
            if (!visible && Object.keys(this.hiddenTypes).length) {
                message = _t('Aucune opération visible avec ces filtres. Utilisez Réafficher les types, puis vérifiez l’OF, les ressources et la période.');
            }
            if (!this.metadataComplete) {
                message = _t('Les données de phases sont incomplètes ou incohérentes : les totaux OF et pièces ne sont pas affichés. Vérifiez le scénario. ') + message;
            }
            this._notice(message, !this.metadataComplete);
        },

        _rows: function (operations) {
            var self = this;
            var rows = {machines: [], robot: [], operators: []};
            var index = Object.create(null);
            function add(group, label) {
                var key = group + ':' + label;
                if (!index[key]) {
                    index[key] = {name: label, operations: []};
                    rows[group].push(index[key]);
                }
                return index[key];
            }
            var parameters = {};
            try { parameters = JSON.parse((this.plan && this.plan.parameters_json) || '{}') || {}; } catch (ignore) { /* Defaults below. */ }
            var cncCount = Math.min(2, Math.max(1, Number(parameters.NB_CNC) || 2));
            var operatorCount = Math.min(100, Math.max(1, Number(parameters.NB_OPERATEURS) || 2));
            var i;
            for (i = 1; i <= cncCount; i++) { add('machines', 'CNC' + i); }
            add('robot', 'ROBOT');
            for (i = 1; i <= operatorCount; i++) { add('operators', 'OP_' + i); }
            operations.forEach(function (operation) {
                if (self.hiddenTypes[operationCategory(operation)]) { return; }
                var start = utc(operation.start_datetime).valueOf();
                var end = utc(operation.end_datetime).valueOf();
                if (end <= self.windowStart && start < self.windowStart) { return; }
                // Loading/unloading reserves both the robot and the named CNC.
                if (operation.machine) { add('machines', operation.machine).operations.push(operation); }
                if (operation.operateur) { add('operators', operation.operateur).operations.push(operation); }
                if (isRobot(operation)) { add('robot', 'ROBOT').operations.push(operation); }
            });
            ['machines', 'robot', 'operators'].forEach(function (group) {
                if (self.resourceFilter !== 'all' && self.resourceFilter !== group) { rows[group] = []; }
            });
            return rows;
        },

        _renderOperations: function (operations) {
            var self = this;
            var windowDuration = this.windowMinutes * 60000;
            var windowEnd = this.windowStart + windowDuration;
            var $timeline = this.$('.optiman_gantt_timeline').empty();
            $timeline.toggleClass('optiman_week', this.windowMinutes === 10080);
            var $axis = $('<div/>', {'class': 'optiman_axis optiman_chart_row'}).appendTo($timeline);
            $('<div/>', {'class': 'optiman_resource'}).text(_t('Ressource')).appendTo($axis);
            var $axisTrack = $('<div/>', {'class': 'optiman_track'}).appendTo($axis);
            var interval = this.windowMinutes <= 30 ? 5 : this.windowMinutes <= 120 ? 30 : this.windowMinutes <= 240 ? 60 : this.windowMinutes <= 1440 ? 240 : 1440;
            var gridSize = (100 * interval / this.windowMinutes) + '% 100%';
            $axisTrack.css('background-size', gridSize);
            for (var offset = 0; offset <= this.windowMinutes; offset += interval) {
                $('<span/>', {'class': 'optiman_tick' + (offset === this.windowMinutes ? ' optiman_tick_last' : '')})
                    .css('left', (offset / this.windowMinutes * 100) + '%')
                    .text(self._date(this.windowStart + offset * 60000, this.windowMinutes >= 1440 ? 'short' : 'time'))
                    .appendTo($axisTrack);
            }
            var groups = this._rows(operations);
            ['machines', 'robot', 'operators'].forEach(function (group) {
                groups[group].forEach(function (row) {
                    var $row = $('<div/>', {'class': 'optiman_chart_row'}).appendTo($timeline);
                    var $label = $('<div/>', {'class': 'optiman_resource'}).text(row.name).appendTo($row);
                    var $track = $('<div/>', {'class': 'optiman_track'}).appendTo($row);
                    $track.css('background-size', gridSize);
                    var lanes = [];
                    row.operations.forEach(function (operation) {
                        var start = utc(operation.start_datetime).valueOf();
                        var end = utc(operation.end_datetime).valueOf();
                        // Suivi de la première pièce : la ligne opérateur ne montre que sa présence.
                        var presence = group === 'operators' && operation.type_op === 'usinage' &&
                            operation.duree_operateur > 0 ? operation.duree_operateur : null;
                        if (presence !== null) {
                            end = Math.min(end, start + presence * 60000);
                            if (end <= self.windowStart) { return; }
                        }
                        var clippedStart = Math.max(start, self.windowStart);
                        var clippedEnd = Math.min(end, windowEnd);
                        var lane = 0;
                        while (lane < lanes.length && lanes[lane] > start) { lane++; }
                        lanes[lane] = end;
                        var description = [
                            operationLabel(operation), _t('OF : ') + self._affair(operation),
                            _t('Phase : ') + operation.phase + _t(' · Montage : ') + operation.montage_num,
                            _t('Emplacement palette : ') + self._slotLabel(operation),
                            self._pieceLabel(operation),
                            self._date(start) + ' → ' + self._date(end),
                            _t('Durée : ') + (presence !== null ? presence : operation.duree) + _t(' min')
                        ].join('\n');
                        var selected = self.selectedOperation && self.selectedOperation.id === operation.id;
                        $('<button/>', {
                            type: 'button', 'class': 'optiman_bar ' + operationClass(operation) + (selected ? ' is-selected' : ''),
                            'data-operation-id': operation.id, title: description,
                            'aria-label': description, 'aria-pressed': selected ? 'true' : 'false'
                        }).css({
                            left: ((clippedStart - self.windowStart) / windowDuration * 100) + '%',
                            width: ((clippedEnd - clippedStart) / windowDuration * 100) + '%',
                            top: (12 + lane * 38) + 'px'
                        }).text(self._affair(operation) + (operation.a_vide ? ' ∅' : '')).appendTo($track);
                    });
                    var height = 24 + Math.max(1, lanes.length) * 38;
                    $track.height(height);
                    $label.css('min-height', height + 'px');
                });
            });
        },

        _affair: function (operation) {
            return this.lineAffairs[operation.of_id] || operation.of_id;
        },

        _resources: function (operation) {
            var resources = [];
            if (isRobot(operation)) { resources.push('ROBOT'); }
            if (operation.machine) { resources.push(operation.machine); }
            if (operation.operateur) { resources.push(operation.operateur); }
            return resources.join(' · ') || '—';
        },

        _slotLabel: function (operation) {
            var slot = operation.emplacement;
            return (operation.type_palette === 'S' || operation.type_palette === 'B') &&
                typeof slot === 'number' && isFinite(slot) && slot > 0 && Math.floor(slot) === slot ?
                operation.type_palette + '-' + slot : _t('Non renseigné');
        },

        _pieceContext: function (operation) {
            if (!operation || operation.a_vide) { return null; }
            var line = this.lineDetails[operation.of_id];
            if (!line || !Number.isInteger(line.qty) || line.qty < 1 ||
                    !Number.isInteger(line.qty_piece_montage) || line.qty_piece_montage < 1 ||
                    line.qty_piece_montage >= 1000 || !Number.isInteger(operation.montage_num) ||
                    operation.montage_num < 1) { return null; }
            var first = (operation.montage_num - 1) * line.qty_piece_montage + 1;
            var last = Math.min(first + line.qty_piece_montage - 1, line.qty);
            if (first > last) { return null; }
            if (operation.type_op === 'usinage') {
                if (!Number.isInteger(operation.piece_idx) || operation.piece_idx < 1 ||
                        operation.piece_idx > line.qty_piece_montage) { return null; }
                first += operation.piece_idx - 1;
                if (first > last) { return null; }
                last = first;
            }
            return {affair: line.id_affaire, first: first, last: last};
        },

        _pieceSpecs: function (affair, number) {
            var self = this;
            var group = this.affairs[affair];
            if (!this.metadataComplete || !group || !Number.isInteger(number) || number < 1 ||
                    number > group.qty) { return null; }
            var specs = [];
            var valid = group.ids.every(function (ofId) {
                var line = self.lineDetails[ofId];
                if (!line || line.qty !== group.qty || !Number.isInteger(line.qty_piece_montage) ||
                        line.qty_piece_montage < 1 || line.qty_piece_montage >= 1000) { return false; }
                specs.push({ofId: ofId, montage: Math.floor((number - 1) / line.qty_piece_montage) + 1,
                    index: (number - 1) % line.qty_piece_montage + 1});
                return true;
            });
            return valid && specs.length ? specs : null;
        },

        _pieceDomain: function () {
            var specs = this._pieceSpecs(this.pieceFilter.affair, this.pieceFilter.number);
            if (!specs) { return [['id', '=', 0]]; }
            var groups = Object.create(null);
            specs.forEach(function (spec) {
                var key = spec.montage + ':' + spec.index;
                if (!groups[key]) { groups[key] = {ids: [], montage: spec.montage, index: spec.index}; }
                groups[key].ids.push(spec.ofId);
            });
            var keys = Object.keys(groups);
            var domain = [];
            for (var i = 1; i < keys.length; i++) { domain.push('|'); }
            keys.forEach(function (key) {
                var group = groups[key];
                // Match the individual machining cycle OR a shared operation of its montage.
                domain = domain.concat(['&', '&', ['of_id', 'in', group.ids],
                    ['montage_num', '=', group.montage], '|', ['type_op', '!=', 'usinage'],
                    '&', ['piece_idx', '=', group.index], ['a_vide', '=', false]]);
            });
            return domain;
        },

        _pieceLabel: function (operation) {
            if (operation.a_vide) { return _t('Emplacement vide'); }
            var context = this._pieceContext(operation);
            if (!context) { return operation.pieces_label || '—'; }
            var label = 'P' + context.first;
            if (context.first !== context.last) {
                label += '–P' + context.last;
                if (this.pieceFilter && this.pieceFilter.affair === context.affair &&
                        this.pieceFilter.number >= context.first && this.pieceFilter.number <= context.last) {
                    label = 'P' + this.pieceFilter.number + _t(' · opération partagée (') + label + ')';
                }
            }
            return label;
        },

        _renderPieceControls: function () {
            var context = this._pieceContext(this.selectedOperation);
            var $choice = this.$('.optiman_piece_choice').empty();
            var candidate = this.selectedPieceNumber;
            var valid = context && this._pieceSpecs(context.affair, context.first);
            if (valid) {
                if (context.first === context.last) { candidate = context.first; }
                else if (!(candidate >= context.first && candidate <= context.last)) {
                    candidate = this.pieceFilter && this.pieceFilter.affair === context.affair &&
                        this.pieceFilter.number >= context.first && this.pieceFilter.number <= context.last ?
                        this.pieceFilter.number : null;
                }
                $('<option/>', {value: ''}).text(_t('Choisir une pièce')).appendTo($choice);
                for (var number = context.first; number <= context.last; number++) {
                    $('<option/>', {value: String(number)}).text('P' + number).appendTo($choice);
                }
            } else { candidate = null; }
            this.selectedPieceNumber = candidate;
            $choice.val(candidate === null ? '' : String(candidate)).prop('disabled', this.busy);
            this.$('.optiman_piece_choice_label').toggle(!!valid && context.first !== context.last);
            var active = valid && this.pieceFilter && this.pieceFilter.affair === context.affair &&
                this.pieceFilter.number === candidate;
            this.$('.optiman_isolate_piece').text(active ? _t('Afficher toutes les pièces') : _t('Isoler cette pièce'))
                .prop('disabled', this.busy || !valid || candidate === null)
                .attr('title', !valid ? (this.selectedOperation && this.selectedOperation.a_vide ?
                    _t('Un cycle à vide ne correspond pas à une pièce réelle.') :
                    _t('Les données de cette opération ne permettent pas d’identifier une pièce.')) :
                    _t('Suivre la pièce et les opérations communes à son montage dans toutes ses phases.'));
        },

        _renderDetails: function () {
            var operation = this.selectedOperation;
            this.$('.optiman_detail_empty').toggle(!operation);
            this.$('.optiman_detail_content').toggle(!!operation);
            if (!operation) { return; }
            this.$('.optiman_detail_type').text(operationLabel(operation));
            this.$('.optiman_detail_ref').text(this._affair(operation) + _t(' · phase ') + operation.phase +
                _t(' · montage ') + operation.montage_num +
                (operation.type_montage ? ' · ' + operation.type_montage : ''));
            var outside = (utc(operation.end_datetime).valueOf() <= this.windowStart &&
                utc(operation.start_datetime).valueOf() < this.windowStart) ||
                utc(operation.start_datetime).valueOf() >= this.windowStart + this.windowMinutes * 60000;
            this.$('.optiman_detail_context').text(outside ?
                _t('Opération hors de la période affichée. Utilisez Centrer pour la retrouver.') : '').toggle(outside);
            this.$('.optiman_detail_time').text(this._date(utc(operation.start_datetime).valueOf()) + ' → ' +
                this._date(utc(operation.end_datetime).valueOf()));
            this.$('.optiman_detail_duration').text(operation.duree + _t(' min'));
            this.$('.optiman_detail_resources').text(this._resources(operation));
            this.$('.optiman_detail_piece').text(this._pieceLabel(operation));
            this.$('.optiman_detail_slot').text(this._slotLabel(operation));
            this.$('.optiman_detail_why').text(operationWhy(operation));
            var affair = this.lineAffairs[operation.of_id];
            this.$('.optiman_isolate').text(affair && this.ofFilter === affair ?
                _t('Afficher tous les OF') : _t('Isoler cet OF'))
                .prop('disabled', this.busy || !affair);
            this._renderPieceControls();
        },

        _onOpenPlan: function () {
            if (!this.planId) { return; }
            return this._actionOutsideKiosk({
                type: 'ir.actions.act_window', res_model: 'optiman.dev.plan',
                res_id: this.planId, views: [[false, 'form']], target: 'current'
            });
        },

        _onOperation: function (event) {
            if (this.busy) { return; }
            var operationId = Number($(event.currentTarget).attr('data-operation-id'));
            var matches = this.operations.filter(function (operation) { return operation.id === operationId; });
            if (!matches.length) { return; }
            this.selectedOperation = matches[0];
            this.selectedPieceNumber = null;
            this.$('.optiman_bar').removeClass('is-selected').attr('aria-pressed', 'false');
            this.$('.optiman_bar[data-operation-id="' + operationId + '"]').addClass('is-selected').attr('aria-pressed', 'true');
            this._renderDetails();
        },

        _onOpenOperation: function () {
            if (!this.selectedOperation || this.busy) { return; }
            return this._actionOutsideKiosk({
                type: 'ir.actions.act_window', res_model: 'optiman.dev.operation',
                name: _t('Détail de l’opération'), flags: {mode: 'readonly'},
                res_id: this.selectedOperation.id, views: [[false, 'form']], target: 'new'
            });
        },

        _onResourceFilter: function (event) {
            if (this.busy || !this.windowLoaded) { return; }
            var group = $(event.currentTarget).attr('data-resource');
            if (['all', 'machines', 'operators', 'robot'].indexOf(group) < 0) { return; }
            this.resourceFilter = group;
            this._renderHeader();
            this._renderOperations(this.operations);
            this._showWindowNotice();
        },

        _onOfFilter: function (event) {
            var self = this;
            if (this.busy || this.isDestroyed()) { return; }
            var value = $(event.currentTarget).val();
            if (value && !this.affairs[value]) { return; }
            this.ofFilter = value;
            this.pieceFilter = null;
            this.selectedPieceNumber = null;
            this.selectedOperation = null;
            this._renderDetails();
            if (!value || !this.plan || this.plan.state !== 'done' || this.firstStart === null) {
                return this._loadWindow();
            }
            this._setBusy(true);
            this._clearOperations();
            this._renderHeader();
            this._notice(_t('Recherche du début de cet OF…'));
            // Search all phases outside the currently displayed period before loading its bars.
            return this._rpc({
                model: 'optiman.dev.operation', method: 'search_read',
                domain: [['plan_id', '=', this.planId], ['of_id', 'in', this.affairs[value].ids]],
                fields: ['start_datetime'], limit: 1,
                orderBy: [{name: 'start_datetime'}, {name: 'id'}]
            }).then(function (operations) {
                if (self.isDestroyed()) { return; }
                if (operations.length) {
                    self.windowStart = utc(operations[0].start_datetime).valueOf();
                }
                return self._loadWindow();
            }, function (error) {
                if (!self.isDestroyed()) {
                    self._setBusy(false);
                    self._clearOperations();
                    self._notice(_t('Impossible de trouver le début de cet OF. Vérifiez la connexion et vos droits, puis sélectionnez-le à nouveau.'), true);
                    if (self.isKiosk) { self._leaveKiosk(); }
                }
                return $.Deferred().reject(error);
            });
        },

        _onIsolate: function () {
            if (this.busy || this.isDestroyed() || !this.selectedOperation) { return; }
            var affair = this.lineAffairs[this.selectedOperation.of_id];
            if (!affair) { return; }
            if (this.ofFilter === affair) { return this._onShowAllOF(); }
            this.ofFilter = affair;
            this.pieceFilter = null;
            return this._loadWindow();
        },

        _onShowAllOF: function () {
            if (this.busy || this.isDestroyed() || (!this.ofFilter && !this.pieceFilter)) { return; }
            this.ofFilter = '';
            this.pieceFilter = null;
            return this._loadWindow();
        },

        _onPieceChoice: function (event) {
            if (this.busy || this.isDestroyed()) { return; }
            var context = this._pieceContext(this.selectedOperation);
            var number = Number($(event.currentTarget).val());
            this.selectedPieceNumber = context && Number.isInteger(number) &&
                number >= context.first && number <= context.last ? number : null;
            this._renderPieceControls();
        },

        _onIsolatePiece: function () {
            if (this.busy || this.isDestroyed()) { return; }
            var context = this._pieceContext(this.selectedOperation);
            var number = this.selectedPieceNumber;
            if (!context || !Number.isInteger(number) || number < context.first || number > context.last ||
                    !this._pieceSpecs(context.affair, number)) { return; }
            if (this.pieceFilter && this.pieceFilter.affair === context.affair && this.pieceFilter.number === number) {
                return this._onShowAllPieces();
            }
            this.ofFilter = context.affair;
            this.pieceFilter = {affair: context.affair, number: number};
            return this._loadWindow();
        },

        _onShowAllPieces: function () {
            if (this.busy || this.isDestroyed() || !this.pieceFilter) { return; }
            this.pieceFilter = null;
            return this._loadWindow();
        },

        _onCenter: function () {
            if (this.busy || !this.selectedOperation) { return; }
            var operation = this.selectedOperation;
            var middle = (utc(operation.start_datetime).valueOf() + utc(operation.end_datetime).valueOf()) / 2;
            this.windowStart = Math.max(this.firstStart, Math.min(
                Math.max(this.firstStart, this.lastEnd - this.windowMinutes * 60000),
                middle - this.windowMinutes * 30000
            ));
            // Restore the resource group so the centered operation is visible.
            this.resourceFilter = 'all';
            return this._loadWindow();
        },

        _onRefresh: function () {
            var self = this;
            if (this.busy) { return; }
            this.selectedOperation = null;
            this._renderDetails();
            this._setBusy(true);
            return this._readMetadata().then(function () {
                if (self.isDestroyed()) { return; }
                return self._loadWindow();
            }, function (error) {
                if (!self.isDestroyed()) {
                    self._setBusy(false);
                    self._clearOperations();
                    self._notice(_t('Actualisation impossible. Vérifiez la connexion et réessayez.'), true);
                    if (self.isKiosk) { self._leaveKiosk(); }
                }
                return $.Deferred().reject(error);
            });
        },

        _onFirst: function () {
            if (!this.busy && this.firstStart !== null) {
                this.windowStart = this.firstStart;
                return this._loadWindow();
            }
        },

        _onPrevious: function () {
            if (!this.busy && this.windowStart !== null) {
                this.windowStart = Math.max(this.firstStart, this.windowStart - this.windowMinutes * 60000);
                return this._loadWindow();
            }
        },

        _onNext: function () {
            if (!this.busy && this.windowStart !== null && this.windowStart + this.windowMinutes * 60000 < this.lastEnd) {
                this.windowStart += this.windowMinutes * 60000;
                return this._loadWindow();
            }
        },

        _onZoom: function (event) {
            var minutes = Number($(event.currentTarget).attr('data-minutes'));
            if (!this.busy && [30, 120, 240, 1440, 10080].indexOf(minutes) >= 0) {
                this.windowMinutes = minutes;
                return this._loadWindow();
            }
        }
    });

    core.action_registry.add('optiman_dev_gantt', Gantt);
    return Gantt;
});
