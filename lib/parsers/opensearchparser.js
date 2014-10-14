var DOMParser = require('xmldom').DOMParser;
var pu = require('./generic');

function parseOpenSearch(xmlText) {
    var doc = new DOMParser().parseFromString(xmlText);
    return {
        shortName: pu.getFirstTagValue(doc, 'ShortName'),
        longName: pu.getFirstTagValue(doc, 'LongName'),
        filters: parseFilters(doc),
        queries: parseQueries(doc)
    };
}

function parseFilters(ele) {
    var eles = pu.arrayFrom(ele.getElementsByTagName('f:filter'));
    return eles.map(function(e) {
        return {
            range: e.getAttribute('range') == 'true' ? true : false,
            name: e.getAttribute('name')
        };
    });
}

function parseQueries(ele) {
    var eles = pu.arrayFrom(ele.getElementsByTagName('Query'));
    return eles.filter(function(e) { return e.hasAttribute('f:sort') ;}).map(function(e) {
        return {
            sort: e.getAttribute('f:sort'),
            title: e.getAttribute('title'),
            selected: e.getAttribute('f:selected') == "true"
        };
    });
}

exports.parse = parseOpenSearch;