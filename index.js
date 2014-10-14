module.exports = {
    FinnClient: require("./lib/client").FinnClient,
    parsers: {
        ad: require('./lib/parsers/adparser'),
        apiroot: require('./lib/parsers/apirootparser'),
        opensearch: require('./lib/parsers/opensearchparser'),
        search: require('./lib/parsers/searchparser')
    }
};