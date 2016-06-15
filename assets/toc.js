var autoToc = (function() {

    function getHeadingArray(container, headingStartLevel) {
        var array = [];
        var currentNode = document.querySelector(container + ' h' + headingStartLevel);
        var counter = 0;
        while (currentNode) {
            if (currentNode.tagName.match(/^H[1-9]$/)) {
                var id = "SECTION-" + ++counter;
                currentNode.setAttribute('id', id);
                array.push({
                    level: parseInt(currentNode.tagName.slice(1)),
                    text: currentNode.innerText,
                    id: id
                });
            }
            currentNode = currentNode.nextSibling;
        }
        return array;
    }

    function __multiplyString(tpl, times) {
        var s = "";
        for (var i = 0; i < times; i++) {
            s += tpl;
        }
        return s;
    }

    function getTocString(container, headingStartLevel) {
        var headingArray = getHeadingArray(container, headingStartLevel);
        var s = "";
        var depth = headingStartLevel - 1;
        headingArray.forEach(function(val) {
            if (depth != val.level) {
                if (depth < val.level) {
                    s += __multiplyString("<ol>", Math.abs(val.level - depth));
                } else {
                    s += __multiplyString("</ol>", Math.abs(val.level - depth));
                }
            }
            s += "<li><a href='#" + val.id + "'>" + val.text + "</a></li>";
            depth = val.level;
        });
        s += __multiplyString("</ol>", Math.abs(depth - headingStartLevel + 1));
        return s;
    }

    return function autoToc(opts) {
        opts = opts || {};
        var headingStartLevel = opts.headingStartLevel || 1;
        var container = opts.container;
        var target = opts.target;
        if (!container) {
            throw new Error('option container is not given');
        }
        if (!target) {
            throw new Error('option target is not given');
        }
        target = Object.prototype.toString.apply(target) == '[object String]' ? document.querySelector(target) : target;
        var tocString = getTocString(container, headingStartLevel);
        if (target && target.innerHTML) {
            target.innerHTML = tocString;
        }
    }

})();