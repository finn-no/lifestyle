var Promise = require('bluebird');
var R = require('ramda');

var httpclient = require('./httpclient');
var rootparser = require('./parsers/apirootparser');
var opensearchparser = require('./parsers/opensearchparser');
var searchparser = require('./parsers/searchparser');
var adparser = require('./parsers/adparser');
var MissingModelError = require('./parsers/generic').MissingModelError;

// maybe refactor some of this to memoized functions?
function cachingInto(name, fun) {
    return function(key) {
        var self = this;

        if (this[name] !== undefined && key && this[name][key]) {
            return Promise.resolve(this[name][key]);
        }
        else if (this[name] && !key) {
            return Promise.resolve(this[name]);
        }
        else {
            return fun
                .call(this, key)
                .tap(function(val) {
                    if (key) {
                        self[name][key] = val;
                    }
                    else {
                        self[name] = val;
                    }
                });
        }
    }
}

function FinnClient(root, key) {
    this.apiRootUrl = root;
    this.key = key;
    this.searchModels = null;
    this.root = null;
    this._openSearchDescriptions = {};
    this._httpGet = R.curryN(2, httpclient.get)(key);
    this._httpGetQuery = R.curry(httpclient.get)(key);
    this._models = {};
}

FinnClient.prototype = {
    _getSearch: function(sid) {
        return this
            .getRoot()
            .then(R.pipe(R.prop('search'), R.find(R.propEq('title', sid))));
    },

    _fetchModel: cachingInto('_models', function(url) {
        return this
            ._httpGet(url)
            .then(JSON.parse);
    }),

    _makeAdUrl: function(adId) {
        return this
            .getRoot()
            .then(function(root) {
                var template = root.ad.template;
                return template.replace('{id}', adId);
            });
    },

    _parseWithModels: function(parser, data) {
        var self = this;
        return Promise
            .bind(this)
            .then(R.lPartial(parser, data, this._models))
            .catch(MissingModelError, function(error) {
                return this
                    ._fetchModel(error.missingModelUri)
                    .then(function() { return self._parseWithModels(parser, data); });
            });
   },

    getRoot: cachingInto('root', function() {
        return this
            ._httpGet(this.apiRootUrl)
            .then(rootparser.parse);
    }),

    search: function(sid, args) {
        var parse = this._parseWithModels.bind(this, searchparser.parse);
        var search = R.flip(this._httpGetQuery)(args);
        return this
            ._getSearch(sid)
            .then(R.pipe(R.prop('href'), search))
            .then(parse);
    },

    getAd: function(adId) {
        var parse = this._parseWithModels.bind(this, adparser.parse);
        return this
            ._makeAdUrl(adId)
            .then(this._httpGet)
            .then(parse)
    },

    getSearches: function() {
        return this
            .getRoot()
            .then(R.pipe(R.prop('search')));
    },

    getSearchDescription: cachingInto('_openSearchDescriptions', function(sid) {
        return this
            ._getSearch(sid)
            .then(R.pipe(R.prop('description'), this._httpGet))
            .then(opensearchparser.parse);
    }),

};

module.exports.FinnClient = FinnClient;