var bluebird = require('bluebird');
var bodyParser = require('body-parser');
var compress = require('compression');
var express = require('express');
var favicon = require('serve-favicon');
var moment = require('moment');
var nunjucks = require('nunjucks');
var R = require('ramda');

var finn = require('../../index')

var app = express();
app.use(compress()); //nop
app.use(bodyParser.urlencoded({ extended: false }))
app.use(favicon(__dirname + '/public/favicon.png'));
app.use(express.static(__dirname + '/public'));

app.set('view engine', 'html');
app.set('views', __dirname + '/views');

var env = nunjucks.configure('views', {
    autoescape: true,
    express: app,
    watch: true
});

var root, key;
if (process.argv[2]) {
    key = process.argv[2].trim();
    root = 'https://cache.api.finn.no/iad/';
}
else {
    root = 'https://api.finn.no/iad/';
}

console.log("Client using API root", root, key ? "with key " + key : "with no key");
var client = new finn.FinnClient(root, key);

function jsonf(obj) {
    return '<div><pre><code>' + JSON.stringify(obj, null, 4) + '</code></pre></div>';
}

function jsonSummary(obj) {
    return '<details><summary>Show JSON</summary>' + jsonf(obj) + '</details>'
}

var getSearch = R.memoize(function(sid) {
    return client.search(sid);
});

function getAllSearches() {
    return client
        .getSearches()
        .map(R.pipe(R.prop('title'), getSearch), {concurrency: 1});
}       

function taxonomyHasChildren(root) {
    return R.some(R.prop('children'), root.children);
}

function makeFilterEntry(definition) {
    var filter = {
        definition: definition,
        title: definition.title
    }
    if (definition.isRange) {
        filter.type = "range";
    }
    else if (taxonomyHasChildren(definition.taxonomy)) {
        filter.type = "taxonomy";
    }
    else {
        filter.type = "select";
    }
    return filter;
}

env.addFilter('jsonf', jsonf);
env.addFilter('jsonSummary', jsonSummary);

var searchesFromDefinitions = R.pipe(
    R.map(R.pickAll(['id', 'title'])),
    R.sortBy(R.prop('title')));

app.get('/', function(req, res) {
    getAllSearches()
    .then(function(searches) {
        var searches = searchesFromDefinitions(searches);
        res.render('index', {searches: searches});
    });
});

app.get('/search/:searchid', function(req, res) {
    getSearch(req.params.searchid)
    .then(function(search) {
        var filters = R.pipe(
            R.prop('filters'),
            R.values,
            R.map(makeFilterEntry),
            R.sortBy(R.prop('title')))(search);

        res.render('search', {
            searchId: req.params.searchid,
            filters: filters,
            title: search.title
        });
    });
});

app.get('/result/:searchid', function(req, res) {
    client
        .search(req.params.searchid, req.query)
        .then(function(result) {
            res.render('result', {
                title: result.title,
                subtitle: result.subtitle,
                totalResults: result.totalResults,
                hits: result.entries
            });
        });
});

app.get('/ad/:adid', function(req, res) {
    client
        .getAd(req.params.adid)
        .then(function(ad) {
            res.render('ad', {ad: ad});
        });
});

function getSearchDefinitions() {
    return client
        .getSearchIds()
        .map(R.invoker(client.getSearchDefinition.bind(client)))
}

app.listen(3031, function() {
    console.log("Site up at http://localhost:" + 3031);
});
