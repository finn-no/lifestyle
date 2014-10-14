var DOMParser = require('xmldom').DOMParser;
var url = require("url");
var pu = require("./generic");


function parseSearchResult(xmlText, models) {
    return parseSearchResultDoc(new DOMParser().parseFromString(xmlText), models);
}

function parseSearchResultDoc(doc, models) {
    var meta = parseSearchMeta(doc);
    meta.entries = parseEntries(doc, models);
    meta.filters = parseFilters(doc.documentElement);
    meta.links = pu.parseLinks(doc.documentElement);
    meta.id = meta.links.self.split("/").pop().split("?")[0];
    meta.pages = pagesFromLinks(meta.links);
    return meta;
}

function parseSearchMeta(doc) {
    return {
        title: pu.getFirstTagValue(doc, 'title'),
        subtitle: pu.getFirstTagValue(doc, 'subtitle'),
        published: pu.getFirstTagValue(doc, 'updated', 'time'),
        totalResults: pu.getFirstTagValue(doc, 'os:totalResults', 'int')
    };
}

function pagesFromLinks(links) {
    var ret = {};
    var urlParts;

    urlParts = url.parse(links.first, true);
    ret.first = parseInt(urlParts.query.page || "1", 10);

    urlParts = url.parse(links.last, true);
    ret.last = parseInt(urlParts.query.page, 10);

    urlParts = url.parse(links.self, true);
    ret.current = parseInt(urlParts.query.page || "1", 10);

    if (links.prev) {
        urlParts = url.parse(links.prev, true);
        ret.prev = parseInt(urlParts.query.page || "1", 10);        
    }

    if (links.next) {
        urlParts = url.parse(links.next, true);
        ret.next = parseInt(urlParts.query.page || "1", 10);        
    }

    return ret;
}

function parseFilters(parent) {
    var filterEles = pu.childrenOfType(parent, "f:filter");
    var filters = filterEles.map(parseRootFilter);
    var ret = {};
    filters.forEach(function(e) {
        ret[e.name] = e;
    });
    return ret;
}

function parseRootFilter(root) {
    var filter = {
        name: root.getAttribute('name'),
        title: root.getAttribute('title'),
        isRange: root.getAttribute('range') == 'true' ? true : false
    };

    if (filter.isRange) {
        filter.fromArgName = filter.name + '_from';
        filter.toArgName = filter.name + '_to'; 
    }
    else {
        var taxonomy = pu.childrenOfType(root, 'f:Query').map(parseQueryFilter.bind(null, root.getAttribute('name')));
        filter.taxonomy = {
            title: filter.title,
            children: taxonomy
        };
    }
    return filter;
}

function parseQueryFilter(name, queryEle) {
    var innerFilters = pu.childrenOfType(queryEle, "f:filter");
    var children;
    if (innerFilters.length > 1) {
        throw new Error("assertion about nesting failed");
    }
    else if (innerFilters.length == 1) {
        var ele = innerFilters[0];
        var childName = ele.getAttribute('name');
        children = pu.childrenOfType(ele, 'f:Query').map(parseQueryFilter.bind(null, childName));
    }

    var ret = {
        title: queryEle.getAttribute('title'),
        value: queryEle.getAttribute('f:filter'),
        name: name,
    };

    if (children && children.length) {
        ret.children = children;    
    }

    return ret;
}

function getTaxonomy(root) {
    var queries = pu.childrenOfType(root, "f:Query");
    return queries.map(parseTaxonomyQuery.bind(null, root.getAttribute('name')));
}

function parseEntries(doc, models) {
    return pu.arrayFrom(doc.getElementsByTagName("entry")).map(parseEntry.bind(null, models));
}

function parseEntry(models, entryEle) {
    var ret = {
        adId: pu.getFirstTagValue(entryEle, 'dc:identifier'),
        title: pu.getFirstTagValue(entryEle, "title"),
        published: pu.getFirstTagValue(entryEle, "published", "time"),
        updated: pu.getFirstTagValue(entryEle, "updated", "time"),
        images: pu.getImages(entryEle),
        location: getLocation(entryEle),
        categories: parseCategories(entryEle),
        author: parseAuthor(entryEle),
        aData: pu.parseAData(entryEle, models)

    };
    return ret;
}

function parseAuthor(entryEle) {
    var ret = {};
    var authorTag = pu.firstChildOfType(entryEle, "author");
    pu.arrayFrom(authorTag && authorTag.childNodes).forEach(function(e) {
        if (e.nodeName) {
            ret[e.nodeName] = e.textContent;
        }
    });
    return ret;
}

function parseCategories(entryEle) {
    // fixme: should we know about types? like ad:private always beeing stringified bool?
    var ret = {};
    pu.childrenOfType(entryEle, 'category').forEach(function(e) {
        ret[e.getAttribute('scheme')] = {
            scheme: e.getAttribute('scheme'),
            term: e.getAttribute('term'),
            label: e.getAttribute('label')
        };
    });
    return ret;
}

function getLocation(entryEle) {
    var locEle = pu.firstChildOfType(entryEle, "finn:location");
    return pu.parseLocation(locEle) || {};
}

exports.parse = parseSearchResult;
