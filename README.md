
# Lifestyle — FINN API client

## Installation

Use the NPM dependency:

```
git://github.com/finn-no/hjorner#master
```

The package will be added to NPM once the API solidifies.

## Basic usage

```javascript
var lifestyle = require('lifestyle');
var client = new lifestyle.FinnClient("https://cache.api.finn.no", "my-api-key-here");
```

### Getting list of available searches

```javascript
client
    .getSearches()
    .then(console.log);
```

### Performing an open search

```javascript
client
    .search('agriculture-tools')
    .then(console.log);
```

## Performing a search with filters

```javascript
client
    .search('agriculture-tools', {q: 'deere', location: '20002'})
    .then(console.log);
```

Returns agriculture tools with free text search matching 'deere' in Østfold.

### Getting an ad

```javascript
client
    .getAd(52403704)
    .then(console.log);
```

### Combining search and result

To show text of the cheapest selveier apartment in Gamlebyen, you could do something like this:

```javascript
client
    .search('realestate-homes', { location: '1.20061.20512', ownership_type: 3, sort: 3 })
    .then(function(result) {
        var adId = result.entries[0].adId;
        return client.getAd(adId);
    })
    .then(function(ad) {
        console.log(ad.title, ad.links.alternate);
        ad.aData.general_text.forEach(function(e) {
            console.log(e.value.replace(/<br \/>/g, "\n"))
        });
    })
    .catch(function(err) {
        console.log("Error fetching ad:");
        console.log(err.stack);
    });
```

## API

### Constructor

FinnClient(apiRootUrl [, apiKey]);

Construct a new API client instance. The second argument is an optional API key. A valid API key is required to make requests from outside of the FINN network.

### getSearches

```javascript
client.getSearches();
```

getSearches returns a promise for an array of objects with a basic representation of the available searches. This can be used to further query the API for search details. The returned data is in the following format:

```javascript
[
    {
        title: 'agriculture-thresher',
        href: 'https://cache.api.finn.no/iad/search/agriculture-thresher',
        description: 'https://cache.api.finn.no/iad/search/agriculture-thresher/description'
    },
    {
        title: 'agriculture-tools',
        href: 'https://cache.api.finn.no/iad/search/agriculture-tools',
        description: 'https://cache.api.finn.no/iad/search/agriculture-tools/description'
    }
    ...
]
```

### getAd

```javascript
client.getAd(adId);
```

Returns a promise for an ad.

### getSearchDescription

```javascript
client.getSearchDescription(searchId);
```

Returns a promise for an OpenSearch search description document. searchId is a search id that can be found in the 'title' attribute in the result from getSearches().

### search

```javascript
client.search(searchId, params);
```

Returns a promise for a search result. Param is a map of values.

The available filter, sorters an params is available from search results and OpenSearch descriptions. So to render a search page, one might first do an open search to get a complete list of available filters.

## Parser API

The parsers for the various formats can be invoked without using the client. There are parsers for ad, search, OpenSearch and API root.

For example, assuming the adXmlString variable contains a string of XML representing an ad:

```javascript
var lifestyle = require('lifestyle');
var ad = lifestyle.parsers.ad.parse(adXmlString);
```

The parsers are available as `parsers.ad`, `parsers.apiroot`, `parsers.opensearch` and `parsers.search`.

## Requests

Performing an API action may result in multiple requests, as there might be additional resources required for processing the resource.

For example, performing a search will trigger at least 3 requests:

```javascript
client
    .search('realestate-homes', {q: 'eplehage'})
    .then(console.log);
```

- Fetch the API root, which contains the search URL.
- Fetch the search
- Fetch every aData model needed to parse the result items

The root, OpenSearch descriptions and models are all cached indefinitely once they have been fetched.

In some cases it might be desirable to populate caches on startup. This can be done by performing open searches. To populate all caches, this should be sufficient:

```javascript
client
    .getSearches()
    .map(function(search) {
        return client.search(search.title);
    });
```

## API root URLs and API keys

Currently the main API root URL is https://cache.api.finn.no/iad/ . Using this URL requires an API key. The API team manages API keys.

Inside the FINN network it's possible to use http://api.finn.no/iad/ , which requires no authentication.

## Promises

The library is promise based. The underlying promise implementation is bluebird, thus there are some additional methods available on the promise objects. Refer to the bluebird docs for details.

If you need node style callbacks, use one of the wrapper generators provided by bluebird or another promise library.

## Examples

The examples directory contains an example of using lifestyle with express to make a basic version of FINN.

In the examples/nfinn directory and run npm install. Then run  "node server.js".

This assumes you are on the FINN network and don't need an API key. To use a key, pass it in as an argument:

"node server.js my-key-here"

The first time the page loads it may take some time, as it populates caches on first pageload.

### To do

- Fix price and size aData in result
- Maybe move parsers into a separate package, as they are useful regardless of client used
- Tests
- Some more sensible error handling, like what happens if parser is handed invalid xml

