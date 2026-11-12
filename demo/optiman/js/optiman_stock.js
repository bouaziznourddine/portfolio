odoo.define('optiman_dev.Stock', function (require) {
    'use strict';
    var Gantt = require('optiman_dev.Gantt');
    var PAGE_SIZE = 100;
    Gantt.include({
        events: _.extend({}, Gantt.prototype.events, {
            'click .optiman_stock_toggle': '_onStockToggle',
            'click .optiman_stock_back': '_onStockBack',
            'click .optiman_stock_time_prev': '_stockTimePrevious',
            'click .optiman_stock_time_next': '_stockTimeNext',
            'click .optiman_stock_first': '_stockFirst',
            'click .optiman_stock_zoom': '_stockZoom',
            'change .optiman_stock_all': '_onStockFamily',
            'change .optiman_stock_family': '_onStockFamily',
            'click .optiman_stock_bar': '_onStockSlot',
            'click .optiman_stock_prev': '_onStockPrevious',
            'click .optiman_stock_next': '_onStockNext'
        }),

        _onStockToggle: function (event) {
            this.stockShowUnused = this.stockShowUnused || {};
            if (this.stockMode) {
                this.stockShowUnused[this.stockMode] = this.$('.optiman_stock_all').prop('checked');
            }
            this.stockMode = event ? $(event.currentTarget).attr('data-stock-mode') : 'palettes';
            this.$('.optiman_stock_all').prop('checked', !!this.stockShowUnused[this.stockMode]);
            this.stockVisible = true;
            this.stockPage = 0;
            this.stockSelected = null;
            this.$('.optiman_stock_panel, .optiman_stock_back').show();
            this.$('.optiman_gantt_main').hide();
            var mode = this.stockMode;
            this.$('.optiman_stock_toggle').each(function () {
                $(this).attr('aria-pressed', String($(this).attr('data-stock-mode') === mode));
            });
            return this._loadStock();
        },

        _onStockBack: function () {
            this.stockVisible = false;
            this.$('.optiman_stock_panel, .optiman_stock_back').hide();
            this.$('.optiman_gantt_main').show();
            this.$('.optiman_stock_toggle').attr('aria-pressed', 'false');
        },

        _onRefresh: function () {
            var result = this._super.apply(this, arguments);
            if (this.stockVisible) { this._loadStock(); }
            return result;
        },

        _loadStock: function () {
            var self = this;
            var token = this.stockLoadToken = (this.stockLoadToken || 0) + 1;
            this.$('.optiman_stock_controls').hide();
            this.$('.optiman_stock_message').text('Chargement de tous les emplacements…');
            return this._rpc({
                model: 'optiman.dev.plan', method: 'get_stock_view', args: [[this.planId]]
            }).then(function (data) {
                if (self.isDestroyed() || self.stockLoadToken !== token) { return; }
                if (data.error) { self.$('.optiman_stock_message').text(data.error); return; }
                if (self.stockMode === 'montages' && !Array.isArray(data.montages)) {
                    self.$('.optiman_stock_message').text('Le serveur ne fournit pas encore les montages. Redémarrez Odoo après la mise à jour, puis actualisez cette page.');
                    return;
                }
                self.stockData = data;
                var first = Infinity, last = -Infinity;
                data.reservations.concat(data.palettes || [], data.montages || []).forEach(function (row) {
                    row.start = moment.utc(row.start).valueOf();
                    row.end = moment.utc(row.end).valueOf();
                    first = Math.min(first, row.start);
                    last = Math.max(last, row.end);
                });
                if (!isFinite(first) || !isFinite(last)) {
                    self.$('.optiman_stock_message').text('Historique des emplacements indisponible.');
                    return;
                }
                var chosen = self.selectedOperation ?
                    moment.utc(self.selectedOperation.start_datetime).valueOf() : self.windowStart;
                self.stockFirst = first;
                self.stockLast = last;
                self.stockMinutes = self.windowMinutes || 120;
                self.stockStart = Math.max(first, Math.min(last - 1, chosen || first));
                self.stockPage = 0;
                self.stockSelected = null;
                self.$('.optiman_stock_message').text('');
                self.$('.optiman_stock_controls').show();
                self._renderStock();
            }, function () {
                if (!self.isDestroyed() && self.stockLoadToken === token) {
                    self.$('.optiman_stock_message').text('Chargement impossible. Cliquez sur Actualiser pour réessayer.');
                }
            });
        },

        _renderStock: function () {
            if (!this.stockData) { return; }
            var self = this, family = this.$('.optiman_stock_family').val();
            var duration = this.stockMinutes * 60000, end = this.stockStart + duration;
            var interval = this.stockMinutes <= 30 ? 5 : this.stockMinutes <= 120 ? 30 :
                this.stockMinutes <= 240 ? 60 : this.stockMinutes <= 1440 ? 240 : 1440;
            var gridSize = (100 * interval / this.stockMinutes) + '% 100%';
            var montageMode = this.stockMode === 'montages';
            var emplacementMode = this.stockMode === 'emplacements';
            this.stockEntries = montageMode ? (this.stockData.montages || []) :
                emplacementMode ? this.stockData.reservations : (this.stockData.palettes || []);
            var familySelect = this.$('.optiman_stock_family'), selectedFilter = familySelect.val() || 'all';
            if (montageMode) {
                var types = _.uniq(Object.keys(this.stockData.montage_stocks || {}).concat(
                    this.stockEntries.map(function (row) { return row.type_montage; }))).sort();
                familySelect.empty().append($('<option/>', {value: 'all'}).text('Tous les montages'));
                types.forEach(function (type) { familySelect.append($('<option/>', {value: type}).text(type)); });
                this.$('.optiman_stock_family_label').contents().first()[0].textContent = 'Type de montage';
                if (selectedFilter !== 'all' && types.indexOf(selectedFilter) >= 0) { familySelect.val(selectedFilter); }
                else { familySelect.val('all'); }
            } else {
                familySelect.empty().append('<option value="all">Toutes les palettes</option><option value="S">ITS148</option><option value="B">PC210</option>');
                this.$('.optiman_stock_family_label').contents().first()[0].textContent = 'Type de palette';
                familySelect.val(selectedFilter === 'S' || selectedFilter === 'B' ? selectedFilter : 'all');
            }
            family = familySelect.val() || 'all';
            this.$('.optiman_stock_title').text(montageMode ? 'Gantt des montages' : 'Gantt des palettes');
            if (emplacementMode) { this.$('.optiman_stock_title').text('Gantt des emplacements'); }
            this.$('.optiman_stock_intro').text(montageMode ? 'Une ligne par support partagé et par type de montage. Les OF et les pièces qui réutilisent un support apparaissent successivement sur la même ligne.' : 'Une ligne par palette physique ITS148 ou PC210. Chaque barre couvre le montage et le démontage de la phase, ou toute l’affaire selon la précédence. Les emplacements S/B restent indiqués dans le détail.');
            this.$('.optiman_stock_legend').text(montageMode ? 'Barre verte : occupation du support partagé par un OF. Cliquez pour voir la phase, les pièces et la palette associée.' : 'Barre bleue : occupation d’une palette physique. Cliquez pour voir l’OF, les pièces et son emplacement.');
            if (!montageMode) {
                this.$('.optiman_stock_intro').text(emplacementMode ? 'Une ligne par emplacement S ou B. Les barres montrent ses réservations successives, phase par phase ou jusqu’au démontage final selon la précédence.' : 'Une ligne par palette physique ITS148 ou PC210. Chaque barre couvre le montage et le démontage de la phase, ou toute l’affaire selon la précédence.');
                this.$('.optiman_stock_legend').text(emplacementMode ? 'Barre bleue : emplacement réservé. Zone sans barre : emplacement libre.' : 'Barre bleue : occupation d’une palette physique. Cliquez pour voir les pièces et les horaires.');
            }
            this.$('.optiman_stock_all_label').show();
            this.$('.optiman_stock_all_text').text(emplacementMode ?
                'Afficher aussi les emplacements jamais utilisés' : montageMode ?
                    'Afficher aussi les montages jamais utilisés' : 'Afficher aussi les palettes jamais utilisées');
            var rows = [], bySlot = Object.create(null);
            this.stockEntries.forEach(function (row, index) {
                row.stockIndex = index;
                if (family !== 'all' && family !== (montageMode ? row.type_montage : row.family)) { return; }
                if (montageMode && (!row.fixture_id || Number(row.fixture_id) > Number(row.stock))) { return; }
                var key = montageMode ? JSON.stringify([row.type_montage, Number(row.fixture_id)]) :
                    emplacementMode ? row.family + '-' + row.slot : JSON.stringify([row.family, Number(row.palette_id)]);
                if (!bySlot[key]) { bySlot[key] = []; }
                bySlot[key].push(row);
            });
            var typeStocks = Object.create(null), paletteNames = {S: 'ITS148', B: 'PC210'};
            if (montageMode) {
                Object.keys(this.stockData.montage_stocks || {}).forEach(function (type) {
                    if (family === 'all' || family === type) {
                        typeStocks[type] = Number(self.stockData.montage_stocks[type]) || 0;
                    }
                });
                this.stockEntries.forEach(function (row) {
                    if (family === 'all' || family === row.type_montage) {
                        typeStocks[row.type_montage] = Math.max(typeStocks[row.type_montage] || 0, Number(row.stock) || 0);
                    }
                });
            }
            var all = this.$('.optiman_stock_all').prop('checked');
            if (montageMode) {
                Object.keys(typeStocks).sort().forEach(function (type) {
                    for (var fixture = 1; fixture <= typeStocks[type]; fixture++) {
                        var fixtureKey = JSON.stringify([type, fixture]);
                        if (all || (bySlot[fixtureKey] && bySlot[fixtureKey].length)) {
                            rows.push({name: type + ' ID ' + ('0' + fixture).slice(-2), type_montage: type,
                                fixture_id: fixture, stock: typeStocks[type], reservations: bySlot[fixtureKey] || []});
                        }
                    }
                });
            } else if (!emplacementMode) {
                ['S', 'B'].forEach(function (type) {
                    if (family !== 'all' && family !== type) { return; }
                    var stock = Number(self.stockData.palette_stocks[type]) || 0;
                    for (var paletteId = 1; paletteId <= stock; paletteId++) {
                        var paletteKey = JSON.stringify([type, paletteId]);
                        if (all || (bySlot[paletteKey] && bySlot[paletteKey].length)) {
                            rows.push({name: paletteNames[type] + ' ID ' + ('0' + paletteId).slice(-2),
                                family: type, palette_id: paletteId, stock: stock,
                                reservations: bySlot[paletteKey] || []});
                        }
                    }
                });
            } else {
            ['S', 'B'].forEach(function (type) {
                if (family !== 'all' && family !== type) { return; }
                for (var slot = 1; slot <= self.stockData.capacities[type]; slot++) {
                    var key = type + '-' + slot;
                    if (all || bySlot[key]) { rows.push({name: key, reservations: bySlot[key] || []}); }
                }
            });
            }
            var totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
            this.stockPage = Math.min(this.stockPage || 0, totalPages - 1);
            var start = this.stockPage * PAGE_SIZE;
            this.$('.optiman_stock_counts').text(montageMode ? rows.length + ' supports affichables · stock partagé : ' +
                (family === 'all' ? _.uniq(rows.map(function (row) { return row.stock; })).join(' / ') : (rows[0] ? rows[0].stock : 0)) :
                !emplacementMode ? rows.length + ' palettes affichables · stock ITS148 : ' + this.stockData.palette_stocks.S + ' · PC210 : ' + this.stockData.palette_stocks.B :
                rows.length + (emplacementMode ? ' emplacements affichables · capacité S : ' : ' palettes affectées affichables · capacité S : ') +
                this.stockData.capacities.S + ' · capacité B : ' + this.stockData.capacities.B);
            this.$('.optiman_stock_period').text(this._date(this.stockStart) + ' → ' + this._date(end));
            this.$('.optiman_stock_time_prev, .optiman_stock_first').prop('disabled', this.stockStart <= this.stockFirst);
            this.$('.optiman_stock_time_next').prop('disabled', end >= this.stockLast);
            this.$('.optiman_stock_zoom').each(function () {
                var active = Number($(this).attr('data-minutes')) === self.stockMinutes;
                $(this).toggleClass('is-active', active).attr('aria-pressed', String(active));
            });
            var timeline = this.$('.optiman_stock_timeline').empty().toggleClass('optiman_week', this.stockMinutes === 10080).toggleClass('optiman_montage_view', !emplacementMode);
            var axis = $('<div/>', {'class': 'optiman_axis optiman_chart_row'}).appendTo(timeline);
            $('<div/>', {'class': 'optiman_resource'}).text(montageMode ? 'Support / ID' : emplacementMode ? 'Emplacement' : 'Palette / ID').appendTo(axis);
            var axisTrack = $('<div/>', {'class': 'optiman_track'}).appendTo(axis);
            for (var offset = 0; offset <= this.stockMinutes; offset += interval) {
                $('<span/>', {'class': 'optiman_tick' + (offset === this.stockMinutes ? ' optiman_tick_last' : '')})
                    .css('left', (offset / this.stockMinutes * 100) + '%')
                    .text(this._date(this.stockStart + offset * 60000, this.stockMinutes >= 1440 ? 'short' : 'time'))
                    .appendTo(axisTrack);
            }
            rows.slice(start, start + PAGE_SIZE).forEach(function (row) {
                var unusedMontage = montageMode && !row.reservations.length;
                var chartRow = $('<div/>', {'class': 'optiman_chart_row' + (unusedMontage ? ' optiman_stock_unused_row' : '')}).appendTo(timeline);
                var rowLabel = $('<div/>', {'class': 'optiman_resource'}).appendTo(chartRow);
                rowLabel.text(row.name);
                if (unusedMontage) {
                    $('<span/>', {'class': 'optiman_stock_unused_label'}).text('Jamais utilisé').appendTo(rowLabel);
                }
                var track = $('<div/>', {'class': 'optiman_track'}).css({'background-size': gridSize, height: '58px'}).appendTo(chartRow);
                row.reservations.forEach(function (reservation) {
                    if (reservation.start >= end || reservation.end <= self.stockStart) { return; }
                    var label = row.name + ' · OF ' + reservation.affair + ' · montage ' + reservation.montage +
                        ' · ' + self._date(reservation.start) + ' → ' + self._date(reservation.end);
                    $('<button/>', {type: 'button', 'class': 'optiman_stock_bar' + (montageMode ? ' optiman_stock_montage' : '') +
                        (self.stockSelected === reservation.stockIndex ? ' is-selected' : ''),
                        'data-reservation': reservation.stockIndex, title: label, 'aria-label': label,
                        'aria-pressed': String(self.stockSelected === reservation.stockIndex)})
                        .css({left: (Math.max(reservation.start, self.stockStart) - self.stockStart) / duration * 100 + '%',
                            width: (Math.min(reservation.end, end) - Math.max(reservation.start, self.stockStart)) / duration * 100 + '%'})
                        .text('OF ' + reservation.affair + ' · M' + reservation.montage + ' · P' + reservation.pieces).appendTo(track);
                });
            });
            this.$('.optiman_stock_prev').prop('disabled', this.stockPage === 0);
            this.$('.optiman_stock_next').prop('disabled', this.stockPage >= totalPages - 1);
            this.$('.optiman_stock_pages').toggle(rows.length > PAGE_SIZE);
            this.$('.optiman_stock_page_label').text((rows.length ? start + 1 : 0) + '–' + Math.min(rows.length, start + PAGE_SIZE) + ' / ' + rows.length);
            var detail = this.$('.optiman_stock_detail').empty();
            var selected = this.stockSelected === null ? null : this.stockEntries[this.stockSelected];
            if (selected) {
                $('<strong/>').text((montageMode ? selected.type_montage + ' ID ' + ('0' + selected.fixture_id).slice(-2) :
                    !emplacementMode ? paletteNames[selected.family] + ' ID ' + ('0' + selected.palette_id).slice(-2) : selected.family + '-' + selected.slot) +
                    (selected.affair ? ' · OF ' + selected.affair : '') +
                    ' · montage ' + selected.montage + ' · pièces P' + selected.pieces).appendTo(detail);
                $('<p/>').text((montageMode ? 'Phase ' + selected.phase + ' · stock partagé : ' + (selected.stock || 'non renseigné') + ' · palette ' + selected.family + '-' + selected.slot + ' · Du ' :
                    !emplacementMode ? 'Stock de palettes : ' + selected.stock + ' · emplacement ' + selected.family + '-' + selected.slot + ' · Réservée du ' : 'Réservé du ') + this._date(selected.start) + ' au ' + this._date(selected.end) +
                    ' · durée ' + Math.round((selected.end - selected.start) / 60000 * 10) / 10 + ' min.').appendTo(detail);
            }
        },
        _onStockFamily: function () {
            if (this.stockShowUnused && this.stockMode) {
                this.stockShowUnused[this.stockMode] = this.$('.optiman_stock_all').prop('checked');
            }
            this.stockPage = 0; this.stockSelected = null; this._renderStock();
        },
        _onStockSlot: function (event) { this.stockSelected = Number($(event.currentTarget).attr('data-reservation')); this._renderStock(); },
        _onStockPrevious: function () { this.stockPage = Math.max(0, this.stockPage - 1); this._renderStock(); },
        _onStockNext: function () { this.stockPage += 1; this._renderStock(); },
        _stockFirst: function () { this.stockStart = this.stockFirst; this._renderStock(); },
        _stockTimePrevious: function () { this.stockStart = Math.max(this.stockFirst, this.stockStart - this.stockMinutes * 60000); this._renderStock(); },
        _stockTimeNext: function () { if (this.stockStart + this.stockMinutes * 60000 < this.stockLast) { this.stockStart += this.stockMinutes * 60000; this._renderStock(); } },
        _stockZoom: function (event) {
            var minutes = Number($(event.currentTarget).attr('data-minutes'));
            if ([30, 120, 240, 1440, 10080].indexOf(minutes) >= 0) { this.stockMinutes = minutes; this._renderStock(); }
        }
    });
});
