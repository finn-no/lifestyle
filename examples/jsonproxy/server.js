var R = require('ramda');
var express = require('express');
var nomnom = require('nomnom');
var lifestyle = require('../../index')

const DEFAULT_AUTH_ROOT = "https://cache.api.finn.no/iad/";
const DEFAULT_NOAUTH_ROOT = "http://api.finn.no/iad/";

var app, client;

var sendJson = R.curry(function(res, data) {
    res.json(data);
});

function installRoutes(app) {
    app.get('/', function(req, res) {
        res.sendFile(__dirname + '/index.html');
    });

    app.get('/searches/', function(req, res) {
        client
            .getSearches()
            .then(R.pluck('title'))
            .then(sendJson(res));
    });

    app.get('/search/', function(req, res) {
        client
            .search(req.query.searchid, R.omit('searchid', req.query))
            .then(sendJson(res));
    });

    app.get('/description/', function(req, res) {
        client
            .getSearchDescription(req.query.searchid)
            .then(sendJson(res));
    });

    app.get('/ad/', function(req, res) {
        client
            .getAd(req.query.adid)
            .then(sendJson(res));
    });
}

function initClient(opts) {
    console.log("Client using API root", opts.root, opts.key ? "with key " + opts.key : "with no key");
    client = new lifestyle.FinnClient(opts.root, opts.key);
}

function runServer(app, opts) {
    app.listen(opts.port, function() {
        console.log("Proxy up at http://localhost:" + opts.port);
    });
}

function main(opts) {
    app = express();
    app.set('json spaces', 4);
    initClient(opts);
    installRoutes(app);
    runServer(app, opts);
}

function getOptions() {
    var opts = nomnom
        .script('lifestyleproxy')
        .options({
            port: {
                string: '-p PORT, --port=PORT',
                help: 'Port the proxy will listen on',
                default: 3031,
            },
            root: {
                string: '-r API_ROOT, --root=API_ROOT',
                help: "URL to the root of the API to be proxied"
            },
            key: {
                string: '-k KEY, --key=KEY',
                help: 'API key to use when talking to the proxied API'
            },
        }).parse();

    if (!opts.root) {
        opts.root = opts.key ? DEFAULT_AUTH_ROOT : DEFAULT_NOAUTH_ROOT;
    }

    return opts;
}

main(getOptions());
