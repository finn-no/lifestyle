
function arrayFrom(iterable) { 
    return Array.prototype.slice.call(iterable);
}

function arrayFind(iterable, predicate) {
    return arrayFrom(iterable).filter(function(e) { return predicate(e); })[0]; 
}

function arrayPluck(iterable, key, value) {
    return arrayFrom(iterable).filter(function(e) { return e[key] == value; })[0];
}

function parseLinks(parent) {
    var ret = {};

    arrayFrom(childrenOfType(parent, 'link')).forEach(function(e) {
        ret[e.getAttribute('rel')] = e.getAttribute('href');
    });

    return ret;
}

function childrenOfType(parent, name) {
    return arrayFrom(parent.childNodes).filter(function(e) {
        return e.nodeName == name;
    });
}

function firstChildOfType(parent, name) {
    return childrenOfType(parent, name)[0];
}

function parseLocation(locEle) {
    var ret = {};
    arrayFrom(locEle.childNodes).forEach(function(e) {
        if (e.nodeType != 1) { return; }
        var key = e.localName;
        key = key.replace(/-\w/g, function(e) { return e[1].toUpperCase(); });
        ret[key] = e.textContent;
    });
    return ret;
}

function getTypedAttrs(ele, attrDefs) {
    var ret = {};
    attrDefs.map(function(e) {
        var parts = e.split(":");
        var name = parts[0];
        var type = parts[1];
        var val = ele.getAttribute(name);
        ret[name] = typeConvert(val, type);
    });
    return ret;
} 

function typeConvert(value, targetType) {
    switch (targetType) {
        case "int":
            return parseInt(value, 10);
        case "float":
            return parseFloat(value);
        case "time":
            return new Date(value);
        default:
            return value;
    }
}

function getFirstTagValue(doc, tagName, typeName) {
    var eles = doc.getElementsByTagName(tagName);
    if (eles.length) {
        return typeConvert(eles[0].textContent, typeName);
    }
    return null;
}

function getImages(container) {
    // fixme: include floor plan fix here
    return getMediaContent(container).filter(function(e) {
        return e.medium == "image";
    });
}

function getMediaContent(container) {
    return childrenOfType(container, "media:content").map(function(e){
        var ret = getTypedAttrs(e, ['url', 'width:int', 'height:int', 'type', 'medium']);
        var descEle = firstChildOfType(e, "media:description");
        if (descEle) {
            ret.description = descEle.textContent;
        }
        return ret;
    });
}

function parsePrices(children) {
    children = arrayFrom(children).filter(function(e) {
      return e.nodeName == "finn:price";
    });

    var ret = {};
    children.forEach(function(e) {
        ret[e.getAttribute('name')] = parseInt(e.getAttribute('value'));
    });
    return ret;
}

function getModelDef(models, name) {
    return arrayFind(models, function(e) { return e.name == name; });
}

function parseAData(doc, models) {
    var aDataEle = doc.getElementsByTagName("finn:adata")[0];
    var modelUri = aDataEle.getAttribute("model");

    if (!modelUri || !models || !models[modelUri]) {
        // fixme: what should error policy be?
        // Should probably support a non-throwy version that ignores adata?
        throw new MissingModelError(modelUri);
    }

    var model = models[modelUri];
    var ret = parseFinnFields(model["field-definitions"], aDataEle);
    ret.prices = parsePrices(aDataEle.childNodes);
    return ret;
}

function parseFinnFields(models, root) {
    var fields = childrenOfType(root, "finn:field");
    var ret = {};
    fields.forEach(function(e) {
        ret[e.getAttribute('name')] = parseFinnField(models, e);
    });
    return ret;
}

function parseFinnField(models, ele) {
    var name = ele.getAttribute("name");
    // return name
    var model = getModelDef(models, name);
    if (!model) {
        throw new Error("Missing model definition for " + name);
    }
    return parseFinnValue(model, ele);
}

function parseFinnValue(model, ele) {
    if (model['multi-value']) {
        return parseFinnMultiValue(model, ele);
    }
    else {
        return parseFinnSingleValue(model, ele);
    }
}

function parseFinnMultiValue(model, ele) {
    var children = childrenOfType(ele, "finn:value");
    return children.map(parseFinnSingleValue.bind(null, model));
}

function parseFinnSingleValue(model, ele) {
    var type = model.type;

    if (type == "complex") {
        return parseFinnFields(model.children, ele);
    }
    else {
        var value = ele.getAttribute("value") || ele.textContent;
        return castValue(type, value);
    }
}

function castValue(type, value) {
    switch (type) {
        case "boolean":
            return value == "true";
        case "number":
            return parseFloat(value);
        case "string":
        default:
            return value;
    }
}

function MissingModelError(url) {
    this.message = "Missing model required for parsing:" + url;
    this.missingModelUri = url;
    this.name = "MissingModelError";
    Error.captureStackTrace(this, MissingModelError);
}
MissingModelError.prototype = Object.create(Error.prototype);
MissingModelError.prototype.constructor = MissingModelError;

module.exports = {
    MissingModelError: MissingModelError,
    getFirstTagValue: getFirstTagValue,
    getImages: getImages,
    getMediaContent: getMediaContent,
    parseLinks: parseLinks,
    childrenOfType: childrenOfType,
    firstChildOfType: firstChildOfType,
    parseLocation: parseLocation,
    parseAData: parseAData,
    arrayFrom: arrayFrom,
    arrayFind: arrayFind,
    arrayPluck: arrayPluck
};
