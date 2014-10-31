var Promise = require('bluebird');
var R = require('ramda');
var request = Promise.promisify(require('request'));

function throwUnless200(responseAndData) {
    var response = responseAndData[0];
    if  (response && response.statusCode && response.statusCode !== 200) {
        var err = new Error("HTTP status " + response.statusCode + ": " + response.request.href);
        err.response = response;
        throw err;
    }
    return response;
}

function get(key, url, query) {
    var reqOpts = {
        uri: url,
        qs: query || {},
        useQuerystring: true,
        headers: {
            'User-Agent': 'lifestyle-0.0.1'
        }
    };

    if (key) { reqOpts.headers['x-FINN-apikey'] = key; }

    return request(reqOpts)
        .tap(throwUnless200)
        .then(R.prop(1));
}

module.exports = {get: get};