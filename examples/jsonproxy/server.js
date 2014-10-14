var R = require('ramda');
var bluebird = require('bluebird');
var express = require('express');
var lifestyle = require('../../index')

var app = express();
app.set('json spaces', 4); 

var root, key;
if (process.argv[2]) {
    key = process.argv[2].trim();
    root = 'https://cache.api.finn.no/iad/';
}
else {
    root = 'https://api.finn.no/iad/';
}

console.log("Client using API root", root, key ? "with key " + key : "with no key");
var client = new lifestyle.FinnClient(root, key);

var sendJson = R.curry(function(res, data) {
    res.json(data);
});

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

app.listen(3032, function() {
    console.log("Site up at http://localhost:" + 3031);
});
