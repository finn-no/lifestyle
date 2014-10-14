var DOMParser = require('xmldom').DOMParser;
var pu = require('./generic');

function parseApiRoot(xmlText) {
    return parseWorkspaces(new DOMParser().parseFromString(xmlText));
}

function parseWorkspaces(doc) {
    return {
        search: parseSearchWorkspace(doc),
        models: parseModelsWorkspace(doc),
        ad: parseAdWorkspace(doc)
    };
}

function parseAdWorkspace(root) {
    var ele = getWorkspaceFor(root, 'ad');
    var templateEle = pu.firstChildOfType(ele, 'f:template');
    return {
        template: templateEle.getAttribute('href')
    };
}

function parseModelsWorkspace(root) {
    var ele = getWorkspaceFor(root, 'models');
    return pu.arrayFrom(ele.getElementsByTagName('atom:link')).map(function(e){
        return {
            href: e.getAttribute('href'),
            title: e.getAttribute('title')
        }
    });
}

function parseSearchWorkspace(root) {
    var ele = getWorkspaceFor(root, 'searches');
    return pu.arrayFrom(ele.getElementsByTagName('collection')).map(parseCollection);
}

function parseCollection(ele) {
    var url = ele.getAttribute('href');
    var linkEle = ele.getElementsByTagName('atom:link')[0];

    return {
        title: linkEle.getAttribute('title'),
        href: ele.getAttribute('href'),
        description: linkEle.getAttribute('href')
    };
}

function getWorkspaceFor(doc, title) {
    var eles = pu.arrayFrom(doc.getElementsByTagName('atom:title')).filter(function(e) {
        return e.textContent.trim() == title;
    });
    return eles.length ? eles[0].parentNode : null;
}

function getTitle(root) {
    var eles = pu.arrayFrom(root.getElementsByTagName('atom:title'));
    return eles.length ? eles[0].textContent : null;
}

exports.parse = parseApiRoot;
