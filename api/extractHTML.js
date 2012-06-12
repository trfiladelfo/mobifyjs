(function (document, Mobify) {

var nodeName = function(node) {
        return node.nodeName.toLowerCase();
    }

    // Returns first element from jQuery, Zepto, or NodeList collection.
  , peel = function(element) {
        // nodeType check is here to ignore things like form elements (which do have length)
        if (element && !element.nodeType && (typeof element.length == "number")) return element[0];
        return element;
  }

    // Return a string for the opening tag of DOMElement `element`.
    // This function can be reused by templating, so it unwraps jQuery/Zepto objects if given
  , openTag = function(el) {
        var element = peel(el);
        if (!element) return '';

        var stringBuffer = [];

        [].forEach.call(element.attributes, function(attr) {
            stringBuffer.push(' ', attr.name, '="', attr.value.replace('"', '&quot;'), '"');
        })

        return '<' + nodeName(element) + stringBuffer.join('') + '>';
    }

    // Return a string for the closing tag of DOMElement `element`.
    // This function can be reused by templating, so it unwraps jQuery/Zepto objects if given
  , closeTag = function(el) {
        var element = peel(el);
        if (!element) return '';

        return '</' + nodeName(element) + '>';
    }

    // Return a string for the doctype of the current document.
  , doctype = function() {
        var doctypeEl = document.doctype || [].filter.call(document.childNodes, function(el) {
                return el.nodeType == Node.DOCUMENT_TYPE_NODE
            })[0];

        if (!doctypeEl) return '';

        return '<!DOCTYPE HTML'
            + (doctypeEl.publicId ? ' PUBLIC "' + doctypeEl.publicId + '"' : '')
            + (doctypeEl.systemId ? ' "' + doctypeEl.systemId + '"' : '')
            + '>';
    }

    // Returns a string of the unesacped content from a plaintext escaped `container`.
  , extractHTMLFromElement = function(container) {
        if (!container || !container.childNodes) return '';

        return [].map.call(container.childNodes, function(el) {
            var tagName = nodeName(el);
            if ((' ' + el.className + ' ').match(' mobify-ignore ')) return '';
            if (tagName == '#comment') return '<!--' + el.textContent + '-->';
            if (tagName == 'plaintext') return el.textContent;
            if (tagName == 'script' && ((/mobify\./.test(el.src) || /Mobify/.test(el.textContent)))) {
                return '';  
            }
            return el.outerHTML || el.nodeValue;
        }).join('');
    };  

var html = Mobify.html = {
    'openTag' : openTag
  , 'closeTag' : closeTag
  , 'extractHTMLFromElement' : extractHTMLFromElement
  , 'memo' : {}

    // Returns an object containing the state of the original page. Caches the object
    // in `extractedHTML` for later use.
  , 'extractHTML' : function() {
        if (html.memo.extracted) return html.memo.extracted;

        var headEl = document.getElementsByTagName('head')[0] || document.createElement('head')
          , bodyEl = document.getElementsByTagName('body')[0] || document.createElement('body')
          , htmlEl = document.getElementsByTagName('html')[0];

        return html.memo.extracted = {
            doctype: doctype()
          , htmlTag: openTag(htmlEl)
          , headTag: openTag(headEl)
          , bodyTag: openTag(bodyEl)
          , headContent: extractHTMLFromElement(headEl)
          , bodyContent: extractHTMLFromElement(bodyEl)
          , all : function() {
                // RR: I assume that Mobify escaping tag is placed in <head>. If so, the <plaintext>
                // it emits would capture the </head><body> boundary, as well as closing </body></html>
                return this.doctype + this.htmlTag + this.headTag + this.headContent + this.bodyContent;
            }
        };
    }

    // Rewrite document contents with provided markup via document.write() replacement.
    // If provided string is empty, capture the source markup from escaping tags.   
  , 'writeHTML' : function(markup) {
        markup = markup || html.extractHTML().all();
        if (html.memo) html.memo.written = markup;

        // We'll write markup a tick later, as Firefox logging is async
        // and gets interrupted if followed by synchronous document.open
        window.setTimeout(function(){
            // `document.open` clears events bound to `document`.
            // The special parameters prevent IE from creating a history entry
            document.open("text/html", "replace");

            // In Webkit, `document.write` immediately executes inline scripts 
            // not preceded by an external resource.
            document.write(markup);
            document.close();
        });
    }

  , 'unmobify' : function() {
        var unmobifier = function() {
            document.removeEventListener('DOMContentLoaded', unmobifier, false);
            html.writeHTML();
        }    

        if (/complete|loaded/.test(document.readyState)) {
            unmobifier();
        } else {
            document.addEventListener('DOMContentLoaded', unmobifier, false);
        }
    }
};

if (!Mobify.ark) {
    Mobify.api = 1;
    Mobify.html.unmobify();
}

})(document, Mobify);