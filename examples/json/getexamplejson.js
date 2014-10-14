var fs = require("fs");
var R = require('ramda');
var api = require("../../index");

var root = "https://cache.api.finn.no/iad/";
var key = process.argv[2].trim();
var client = new api.FinnClient(root, key);

var saveFile = R.curry(function(filename, data) {
	fs.writeFileSync(filename, JSON.stringify(data, null, 4));
});

client
	.getRoot()
	.then(saveFile('root.json'));

client
	.getSearches()
	.then(saveFile('searches.json'))

client
	.getSearchDescription('realestate-homes')
	.then(saveFile('realestate-homes.opensearch.json'));

client
	.search('realestate-homes')
	.tap(saveFile('realestate-homes.result.json'))
	.then(function(result) {
		return client.getAd(result.entries[0].adId);
	})
	.then(saveFile('realestate-homes.ad.json'))
