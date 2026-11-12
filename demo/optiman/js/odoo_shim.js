/*
 * OPTIMAN — démonstration statique
 * ---------------------------------------------------------------------------
 * Le Gantt de cette page est le code du module Odoo 12 « optiman_dev »
 * (optiman_gantt.js, optiman_stock.js, optiman_gantt.css et son gabarit QWeb),
 * copié tel quel. Ce fichier fournit, à la place du client web Odoo, le strict
 * nécessaire pour l'exécuter :
 *   - le système de modules odoo.define / require ;
 *   - les classes avec extend, include et this._super ;
 *   - un widget d'action minimal (gabarit, événements, cycle de vie) ;
 *   - des réponses RPC servies par le jeu de données enregistré
 *     (data/scenario.js) : read, search_read, search_count, get_stock_view.
 * Aucun serveur n'est contacté et aucun calcul d'ordonnancement n'est exécuté :
 * le planning affiché est un résultat enregistré.
 */
(function (window) {
    'use strict';

    var $ = window.jQuery;
    var DATA = window.OPTIMAN_DEMO_DATA;
    var document = window.document;

    if (!$ || !DATA || !window.OPTIMAN_TEMPLATES) {
        var loading = document.getElementById('demo-loading');
        if (loading) { loading.textContent = 'La démonstration n’a pas pu charger ses fichiers. Rechargez la page.'; }
        throw new Error('OPTIMAN demo: jQuery, data/scenario.js or js/optiman_templates.js is missing.');
    }

    // ------------------------------------------------------------------ dates
    function pad(value) { return value < 10 ? '0' + value : String(value); }

    function parseUtc(value) {
        var match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(value));
        if (!match) { return NaN; }
        return Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +(match[6] || 0));
    }

    function formatUtc(milliseconds) {
        var date = new Date(milliseconds);
        return date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate()) + ' ' +
            pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()) + ':' + pad(date.getUTCSeconds());
    }

    // The module only uses moment.utc(value).valueOf() and .format('YYYY-MM-DD HH:mm:ss').
    if (!window.moment) {
        window.moment = {
            utc: function (value) {
                var milliseconds = typeof value === 'number' ? value : parseUtc(value);
                return {
                    valueOf: function () { return milliseconds; },
                    isValid: function () { return !isNaN(milliseconds); },
                    format: function () { return formatUtc(milliseconds); }
                };
            }
        };
    }

    // The module only uses _.extend and _.uniq.
    if (!window._) {
        window._ = {
            extend: function (target) {
                for (var i = 1; i < arguments.length; i++) {
                    var source = arguments[i];
                    if (source) { for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } }
                }
                return target;
            },
            uniq: function (list) {
                var result = [];
                list.forEach(function (item) { if (result.indexOf(item) < 0) { result.push(item); } });
                return result;
            }
        };
    }

    // ---------------------------------------------------------------- classes
    var usesSuper = /\b_super\b/;

    function withSuper(method, parentMethod) {
        return function () {
            var saved = this._super;
            this._super = parentMethod || function () {};
            try { return method.apply(this, arguments); }
            finally { this._super = saved; }
        };
    }

    function assign(proto, properties, parents) {
        Object.keys(properties).forEach(function (name) {
            var value = properties[name];
            proto[name] = typeof value === 'function' && usesSuper.test(Function.prototype.toString.call(value)) ?
                withSuper(value, parents[name]) : value;
        });
    }

    function Class() {}
    Class.extend = function (properties) {
        var Parent = this;
        function Child() {
            if (typeof this.init === 'function') { this.init.apply(this, arguments); }
        }
        Child.prototype = Object.create(Parent.prototype);
        Child.prototype.constructor = Child;
        assign(Child.prototype, properties || {}, Parent.prototype);
        Child.extend = Class.extend;
        Child.include = Class.include;
        return Child;
    };
    // include() patches a class in place; the replaced implementation becomes _super.
    Class.include = function (properties) {
        var proto = this.prototype;
        var previous = {};
        Object.keys(properties).forEach(function (name) { previous[name] = proto[name]; });
        assign(proto, properties, previous);
    };

    // -------------------------------------------------------------- templates
    var templateDocument = null;

    function toHtml(node) {
        if (node.nodeType === 3 || node.nodeType === 4) { return document.createTextNode(node.nodeValue); }
        if (node.nodeType !== 1) { return null; }
        var element = document.createElement(node.nodeName);
        Array.prototype.forEach.call(node.attributes, function (attribute) {
            element.setAttribute(attribute.name, attribute.value);
        });
        Array.prototype.forEach.call(node.childNodes, function (child) {
            var converted = toHtml(child);
            if (converted) { element.appendChild(converted); }
        });
        return element;
    }

    // The module template has no dynamic QWeb directive: its XML is rebuilt as HTML nodes.
    function renderTemplate(name) {
        if (!templateDocument) {
            templateDocument = new window.DOMParser().parseFromString(
                String(window.OPTIMAN_TEMPLATES).replace(/^\s+/, ''), 'text/xml');
        }
        var templates = templateDocument.getElementsByTagName('t');
        for (var i = 0; i < templates.length; i++) {
            if (templates[i].getAttribute('t-name') !== name) { continue; }
            for (var child = templates[i].firstChild; child; child = child.nextSibling) {
                if (child.nodeType === 1) {
                    // Traduit avant que le module ne relise les textes du gabarit.
                    var rendered = toHtml(child);
                    return window.DEMO_I18N ? window.DEMO_I18N.dom(rendered) : rendered;
                }
            }
        }
        throw new Error('Gabarit introuvable : ' + name);
    }

    // ------------------------------------------------------- recorded dataset
    var store = (function () {
        var strings = DATA.ops.strings;
        var planId = DATA.plan.id;
        function text(index) { return index ? strings[index] : false; }
        var operations = DATA.ops.rows.map(function (row, index) {
            return {
                id: index + 1, plan_id: planId,
                of_id: text(row[0]), phase: row[1], type_op: text(row[2]), machine: text(row[3]),
                operateur: text(row[4]), montage_num: row[5], piece_idx: row[6], pieces_label: text(row[7]),
                type_montage: text(row[8]), a_vide: row[9] === 1, emplacement: row[10],
                type_palette: text(row[11]),
                start_datetime: formatUtc(row[12] * 1000), end_datetime: formatUtc(row[13] * 1000),
                duree: row[14], duree_operateur: row[15], segment_num: row[16], segment_count: row[17],
                pause_exchange: row[18] === 1
            };
        });
        var lines = DATA.lines.map(function (line) {
            var copy = {plan_id: planId};
            Object.keys(line).forEach(function (key) { copy[key] = line[key]; });
            return copy;
        });
        return {
            'optiman.dev.plan': [DATA.plan],
            'optiman.dev.line': lines,
            'optiman.dev.operation': operations
        };
    })();

    // Records are stored in these orders, so matching requests need no sort.
    var naturalOrder = {'optiman.dev.operation': 'start_datetime,id', 'optiman.dev.line': 'sequence,id'};
    var stockJson = JSON.stringify(DATA.stock);

    // ---------------------------------------------------------- Odoo domains
    function isEmpty(value) { return value === false || value === null || value === undefined || value === ''; }

    function leaf(field, operator, value) {
        switch (operator) {
        case '=': return function (record) { return isEmpty(value) ? isEmpty(record[field]) : record[field] === value; };
        case '!=': return function (record) { return isEmpty(value) ? !isEmpty(record[field]) : record[field] !== value; };
        case '<': return function (record) { return record[field] < value; };
        case '<=': return function (record) { return record[field] <= value; };
        case '>': return function (record) { return record[field] > value; };
        case '>=': return function (record) { return record[field] >= value; };
        case 'in': return function (record) { return value.indexOf(record[field]) >= 0; };
        case 'not in': return function (record) { return value.indexOf(record[field]) < 0; };
        }
        throw new Error('Opérateur de domaine non géré : ' + operator);
    }

    // Same rule as Odoo's normalize_domain: leaves are joined by an implicit '&'.
    function normalize(domain) {
        var result = [];
        var expected = 1;
        domain.forEach(function (token) {
            if (expected === 0) { result.unshift('&'); expected = 1; }
            if (Array.isArray(token)) { expected -= 1; }
            else if (token === '&' || token === '|') { expected += 1; }
            result.push(token);
        });
        return result;
    }

    function compileDomain(domain) {
        var tokens = normalize(domain || []);
        var position = 0;
        function next() {
            var token = tokens[position++];
            if (token === '&' || token === '|') {
                var left = next();
                var right = next();
                return token === '&' ? function (record) { return left(record) && right(record); } :
                    function (record) { return left(record) || right(record); };
            }
            if (token === '!') {
                var operand = next();
                return function (record) { return !operand(record); };
            }
            return leaf(token[0], token[1], token[2]);
        }
        return tokens.length ? next() : function () { return true; };
    }

    function search(model, domain, orderBy, limit) {
        var records = store[model];
        if (!records) { throw new Error('Modèle absent de la démonstration : ' + model); }
        var keep = compileDomain(domain);
        var order = (orderBy || []).map(function (item) { return item.name + (item.asc === false ? ' desc' : ''); }).join(',');
        var found = [];
        var i;
        if (!order || order === naturalOrder[model]) {
            for (i = 0; i < records.length && !(limit && found.length >= limit); i++) {
                if (keep(records[i])) { found.push(records[i]); }
            }
            return found;
        }
        for (i = 0; i < records.length; i++) { if (keep(records[i])) { found.push(records[i]); } }
        found.sort(function (a, b) {
            for (var k = 0; k < orderBy.length; k++) {
                var name = orderBy[k].name;
                var direction = orderBy[k].asc === false ? -1 : 1;
                if (a[name] < b[name]) { return -direction; }
                if (a[name] > b[name]) { return direction; }
            }
            return 0;
        });
        return limit ? found.slice(0, limit) : found;
    }

    function project(record, fields) {
        var result = {id: record.id};
        (fields || Object.keys(record)).forEach(function (name) { result[name] = record[name]; });
        return result;
    }

    // ------------------------------------------------------------------- RPC
    var EXPORT_METHODS = {action_export_robot: 'robot', action_export_operateur: 'operateur',
        action_export_cnc: 'cnc', action_export_unity: 'unity'};

    function respond(params) {
        var model = params.model;
        var method = params.method;
        var args = params.args || [];
        if (method === 'search_read') {
            return search(model, params.domain, params.orderBy, params.limit).map(function (record) {
                return project(record, params.fields);
            });
        }
        if (method === 'search_count') { return search(model, args[0], null, 0).length; }
        if (method === 'read') {
            var ids = args[0] || [];
            return (store[model] || []).filter(function (record) { return ids.indexOf(record.id) >= 0; })
                .map(function (record) { return project(record, args[1]); });
        }
        if (model === 'optiman.dev.plan' && method === 'get_stock_view') {
            // A fresh copy each time: the stock view converts its dates in place.
            return JSON.parse(stockJson);
        }
        if (model === 'optiman.dev.plan' && EXPORT_METHODS[method]) {
            return {type: 'ir.actions.client', tag: 'optiman_dev_export_csv',
                params: {plan_id: DATA.plan.id, kind: EXPORT_METHODS[method]}};
        }
        throw new Error('Appel non disponible dans la démonstration : ' + model + '.' + method);
    }

    function rpc(params) {
        var deferred = $.Deferred();
        window.setTimeout(function () {
            try { deferred.resolve(respond(params)); }
            catch (error) {
                if (window.console) { window.console.error(error); }
                deferred.reject(error);
            }
        }, 25);
        return deferred.promise();
    }

    // ---------------------------------------------------------------- actions
    var actionHandler = null;
    var actionRegistry = Object.create(null);

    function doAction(action, widget) {
        return $.when(actionHandler ? actionHandler(action, widget) : undefined);
    }

    // ----------------------------------------------------------------- widget
    var AbstractAction = Class.extend({
        template: null,
        events: {},

        init: function () {
            this.__destroyed = false;
            this.$el = null;
            this.el = null;
        },

        willStart: function () { return $.when(); },

        start: function () { return $.when(); },

        $: function (selector) { return this.$el.find(selector); },

        isDestroyed: function () { return this.__destroyed; },

        destroy: function () {
            this.__destroyed = true;
            if (this.$el) { this.$el.off('.optiman_demo').remove(); }
        },

        _rpc: function (params) { return rpc(params); },

        do_action: function (action) { return doAction(action, this); },

        appendTo: function (target) {
            var self = this;
            return $.when(this.willStart()).then(function () {
                self.$el = $(renderTemplate(self.template));
                self.el = self.$el[0];
                Object.keys(self.events || {}).forEach(function (key) {
                    var match = /^(\S+)\s*(.*)$/.exec(key);
                    var method = self.events[key];
                    // Late binding by name, so that include() overrides apply.
                    self.$el.on(match[1] + '.optiman_demo', match[2] || null, function () {
                        var handler = typeof method === 'string' ? self[method] : method;
                        return handler.apply(self, arguments);
                    });
                });
                self.$el.appendTo(target);
                return self.start();
            }).then(function () { return self; });
        }
    });

    // ---------------------------------------------------------------- modules
    var modules = Object.create(null);

    function require(name) {
        if (!(name in modules)) { throw new Error('Module Odoo non fourni par la démonstration : ' + name); }
        return modules[name];
    }

    modules['web.AbstractAction'] = AbstractAction;
    modules['web.core'] = {
        // Comme dans Odoo, _t renvoie le texte dans la langue choisie (voir demo_i18n.js).
        _t: function (text) { return window.DEMO_I18N ? window.DEMO_I18N.t(text) : text; },
        action_registry: {
            add: function (tag, Action) { actionRegistry[tag] = Action; return this; },
            get: function (tag) { return actionRegistry[tag]; }
        }
    };
    modules['web.field_utils'] = {format: {datetime: function (value) { return value.format(); }}};
    modules['web.session'] = {user_context: {tz: DATA.plan.tz || 'Europe/Paris', lang: 'fr_FR'}};

    window.odoo = {
        define: function (name, factory) { modules[name] = factory(require); },
        demo: {
            data: DATA,
            records: store,
            parseUtc: parseUtc,
            onAction: function (handler) { actionHandler = handler; },
            mount: function (tag, params, target) {
                var Action = actionRegistry[tag];
                if (!Action) { throw new Error('Action inconnue : ' + tag); }
                return new Action(null, {type: 'ir.actions.client', tag: tag, params: params}).appendTo(target);
            }
        }
    };
})(window);
