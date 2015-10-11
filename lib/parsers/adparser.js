var DOMParser = require('xmldom').DOMParser;

var pu = require("./generic");

function parseAd(xmlText, models) {
    return parseAdDoc(new DOMParser().parseFromString(xmlText), models);
}

function parseAdDoc(doc, models) {
    var ret = parseAdMeta(doc.documentElement);
    ret.adId = pu.getFirstTagValue(doc.documentElement, "dc:identifier", "int");
    ret.links = pu.parseLinks(doc.documentElement);
    ret.categories = parseCategories(doc.documentElement);
    ret.location = getLocation(doc.documentElement);
    ret.mediaContent = pu.getMediaContent(doc.documentElement);
    ret.images = pu.getImages(doc.documentElement);
    ret.aData = pu.parseAData(doc.documentElement, models);
    return ret;
}

function parseAdMeta(doc) {
    return {
        title: pu.getFirstTagValue(doc, 'title'),
        updated: pu.getFirstTagValue(doc, 'updated', 'time'),
        published: pu.getFirstTagValue(doc, 'published', 'time'),
        expires: pu.getFirstTagValue(doc, 'age:expires', 'time'),
        edited: pu.getFirstTagValue(doc, 'app:edited', 'time'),
    };
}

function parseCategories(doc) {
    return pu.childrenOfType(doc, "category").map(function(e) {
        return {
            scheme: e.getAttribute("scheme"),
            term: e.getAttribute("term"),
            label: e.getAttribute("label")
        };
    });
}

function getLocation(doc) {
    var geoEle = pu.firstChildOfType(doc, "georss:point");
    var locEle = pu.firstChildOfType(doc, "finn:location");
    location = pu.parseLocation(locEle) || {};
    location.geo = pu.parseGeolocation(geoEle);
    return location;
}

module.exports.parse = parseAd;
