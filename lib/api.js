var urllib = require('url');

var q = require('q');
var rp = require('./parsers/apirootparser');
var sp = require('./parsers/searchparser');
var ap = require('./parsers/adparser');
var pp = require('./parsers/profileparser');
var pu = require('./parsers/generic');

var httpclient = require('./httpclient');


function FinnClient(apiRoot, options) {
    options = options || {};
    this._apiKey = options.key;
    this._apiRoot = apiRoot;
    this._manifest = null;
    this._httpGet = options.key ? httpclient.getWithKey.bind(this, options.key) : httpclient.get.bind(this);
}

FinnClient.prototype = {
    connect: function() {
        var client = this; // le sigh
        return this
            ._httpGet(this._apiRoot)
            .then(rp.parse)
            .then(function(e) {
                client._manifest = e;
            })
            .then(client._fetchModels.bind(client))
            .then(function(){ return client; });
    },

    _fetchModels: function() {
        var client = this;
        var promises = this._manifest.models.map(function(url) {
           return this._httpGet(url).then(JSON.parse);
        }, client);

        return q.all(promises)
            .then(function(models) {
                var map = {};
                models.forEach(function(model) {
                    map[model.href] = model;
                });
                return map;
            })
            .then(function(modelMap){
                client._models = modelMap;
                return modelMap;
            });
    },

    search: function(searchId, query) {
        var client = this;
        var search = pu.arrayPluck(this._manifest.search, 'title', searchId);
        if (search) {
            var urlParts = urllib.parse(search.href);
            urlParts.query = query;
            return this._httpGet(urllib.format(urlParts))
                .then(function(e) {
                    return sp.parse(e, client._models);
                })
                .catch(console.log);
        }
        else {
            return r.reject(new Error("No such search: " + searchId));
        }
    },

    getAvailableSearches: function() {
        return this._manifest.search.map(function(e) {
            return e.title;
        });
    },

    getAd: function(urlOrAdId) {
        var client = this;
        urlOrAdId = (urlOrAdId).toString();
        var url = urlOrAdId;
        if (urlOrAdId.match(/^\d{8}$/)) {
            url = this._apiRoot + "ad/" + urlOrAdId;
        }

        return this._httpGet(url)
            .then(function(e) {
                return ap.parse(e, client._models);
            });
    },

    getProfile: function(authorization) {
        var url = "https://cache.api.finn.no/iad/user/1904505382/profile"
        return this._httpGet(url, this._apiKey, "de11403a331ac6f395ef9ccaef34bae747e113bbc72710a4cffa373679aa5917")
            .then(pp.parse);
    }
}

// returns a promise for a client
function connect(apiRoot, opts) {
    var client = new FinnClient(apiRoot, opts);
    return client.connect();
}

exports.connect = connect;
