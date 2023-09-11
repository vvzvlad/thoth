/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/@mozilla/readability/Readability-readerable.js":
/*!*********************************************************************!*\
  !*** ./node_modules/@mozilla/readability/Readability-readerable.js ***!
  \*********************************************************************/
/***/ ((module) => {

/* eslint-env es6:false */
/*
 * Copyright (c) 2010 Arc90 Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * This code is heavily based on Arc90's readability.js (1.7.1) script
 * available at: http://code.google.com/p/arc90labs-readability
 */

var REGEXPS = {
  // NOTE: These two regular expressions are duplicated in
  // Readability.js. Please keep both copies in sync.
  unlikelyCandidates: /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
  okMaybeItsACandidate: /and|article|body|column|content|main|shadow/i,
};

function isNodeVisible(node) {
  // Have to null-check node.style and node.className.indexOf to deal with SVG and MathML nodes.
  return (!node.style || node.style.display != "none")
    && !node.hasAttribute("hidden")
    //check for "fallback-image" so that wikimedia math images are displayed
    && (!node.hasAttribute("aria-hidden") || node.getAttribute("aria-hidden") != "true" || (node.className && node.className.indexOf && node.className.indexOf("fallback-image") !== -1));
}

/**
 * Decides whether or not the document is reader-able without parsing the whole thing.
 * @param {Object} options Configuration object.
 * @param {number} [options.minContentLength=140] The minimum node content length used to decide if the document is readerable.
 * @param {number} [options.minScore=20] The minumum cumulated 'score' used to determine if the document is readerable.
 * @param {Function} [options.visibilityChecker=isNodeVisible] The function used to determine if a node is visible.
 * @return {boolean} Whether or not we suspect Readability.parse() will suceeed at returning an article object.
 */
function isProbablyReaderable(doc, options = {}) {
  // For backward compatibility reasons 'options' can either be a configuration object or the function used
  // to determine if a node is visible.
  if (typeof options == "function") {
    options = { visibilityChecker: options };
  }

  var defaultOptions = { minScore: 20, minContentLength: 140, visibilityChecker: isNodeVisible };
  options = Object.assign(defaultOptions, options);

  var nodes = doc.querySelectorAll("p, pre, article");

  // Get <div> nodes which have <br> node(s) and append them into the `nodes` variable.
  // Some articles' DOM structures might look like
  // <div>
  //   Sentences<br>
  //   <br>
  //   Sentences<br>
  // </div>
  var brNodes = doc.querySelectorAll("div > br");
  if (brNodes.length) {
    var set = new Set(nodes);
    [].forEach.call(brNodes, function (node) {
      set.add(node.parentNode);
    });
    nodes = Array.from(set);
  }

  var score = 0;
  // This is a little cheeky, we use the accumulator 'score' to decide what to return from
  // this callback:
  return [].some.call(nodes, function (node) {
    if (!options.visibilityChecker(node)) {
      return false;
    }

    var matchString = node.className + " " + node.id;
    if (REGEXPS.unlikelyCandidates.test(matchString) &&
        !REGEXPS.okMaybeItsACandidate.test(matchString)) {
      return false;
    }

    if (node.matches("li p")) {
      return false;
    }

    var textContentLength = node.textContent.trim().length;
    if (textContentLength < options.minContentLength) {
      return false;
    }

    score += Math.sqrt(textContentLength - options.minContentLength);

    if (score > options.minScore) {
      return true;
    }
    return false;
  });
}

if (true) {
  module.exports = isProbablyReaderable;
}


/***/ }),

/***/ "./node_modules/@mozilla/readability/Readability.js":
/*!**********************************************************!*\
  !*** ./node_modules/@mozilla/readability/Readability.js ***!
  \**********************************************************/
/***/ ((module) => {

/*eslint-env es6:false*/
/*
 * Copyright (c) 2010 Arc90 Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * This code is heavily based on Arc90's readability.js (1.7.1) script
 * available at: http://code.google.com/p/arc90labs-readability
 */

/**
 * Public constructor.
 * @param {HTMLDocument} doc     The document to parse.
 * @param {Object}       options The options object.
 */
function Readability(doc, options) {
  // In some older versions, people passed a URI as the first argument. Cope:
  if (options && options.documentElement) {
    doc = options;
    options = arguments[2];
  } else if (!doc || !doc.documentElement) {
    throw new Error("First argument to Readability constructor should be a document object.");
  }
  options = options || {};

  this._doc = doc;
  this._docJSDOMParser = this._doc.firstChild.__JSDOMParser__;
  this._articleTitle = null;
  this._articleByline = null;
  this._articleDir = null;
  this._articleSiteName = null;
  this._attempts = [];

  // Configurable options
  this._debug = !!options.debug;
  this._maxElemsToParse = options.maxElemsToParse || this.DEFAULT_MAX_ELEMS_TO_PARSE;
  this._nbTopCandidates = options.nbTopCandidates || this.DEFAULT_N_TOP_CANDIDATES;
  this._charThreshold = options.charThreshold || this.DEFAULT_CHAR_THRESHOLD;
  this._classesToPreserve = this.CLASSES_TO_PRESERVE.concat(options.classesToPreserve || []);
  this._keepClasses = !!options.keepClasses;
  this._serializer = options.serializer || function(el) {
    return el.innerHTML;
  };
  this._disableJSONLD = !!options.disableJSONLD;

  // Start with all flags set
  this._flags = this.FLAG_STRIP_UNLIKELYS |
                this.FLAG_WEIGHT_CLASSES |
                this.FLAG_CLEAN_CONDITIONALLY;


  // Control whether log messages are sent to the console
  if (this._debug) {
    let logNode = function(node) {
      if (node.nodeType == node.TEXT_NODE) {
        return `${node.nodeName} ("${node.textContent}")`;
      }
      let attrPairs = Array.from(node.attributes || [], function(attr) {
        return `${attr.name}="${attr.value}"`;
      }).join(" ");
      return `<${node.localName} ${attrPairs}>`;
    };
    this.log = function () {
      if (typeof dump !== "undefined") {
        var msg = Array.prototype.map.call(arguments, function(x) {
          return (x && x.nodeName) ? logNode(x) : x;
        }).join(" ");
        dump("Reader: (Readability) " + msg + "\n");
      } else if (typeof console !== "undefined") {
        let args = Array.from(arguments, arg => {
          if (arg && arg.nodeType == this.ELEMENT_NODE) {
            return logNode(arg);
          }
          return arg;
        });
        args.unshift("Reader: (Readability)");
        console.log.apply(console, args);
      }
    };
  } else {
    this.log = function () {};
  }
}

Readability.prototype = {
  FLAG_STRIP_UNLIKELYS: 0x1,
  FLAG_WEIGHT_CLASSES: 0x2,
  FLAG_CLEAN_CONDITIONALLY: 0x4,

  // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,

  // Max number of nodes supported by this parser. Default: 0 (no limit)
  DEFAULT_MAX_ELEMS_TO_PARSE: 0,

  // The number of top candidates to consider when analysing how
  // tight the competition is among candidates.
  DEFAULT_N_TOP_CANDIDATES: 5,

  // Element tags to score by default.
  DEFAULT_TAGS_TO_SCORE: "section,h2,h3,h4,h5,h6,p,td,pre".toUpperCase().split(","),

  // The default number of chars an article must have in order to return a result
  DEFAULT_CHAR_THRESHOLD: 500,

  // All of the regular expressions in use within readability.
  // Defined up here so we don't instantiate them repeatedly in loops.
  REGEXPS: {
    // NOTE: These two regular expressions are duplicated in
    // Readability-readerable.js. Please keep both copies in sync.
    unlikelyCandidates: /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
    okMaybeItsACandidate: /and|article|body|column|content|main|shadow/i,

    positive: /article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,
    negative: /-ad-|hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|foot|footer|footnote|gdpr|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|tool|widget/i,
    extraneous: /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single|utility/i,
    byline: /byline|author|dateline|writtenby|p-author/i,
    replaceFonts: /<(\/?)font[^>]*>/gi,
    normalize: /\s{2,}/g,
    videos: /\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,
    shareElements: /(\b|_)(share|sharedaddy)(\b|_)/i,
    nextLink: /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
    prevLink: /(prev|earl|old|new|<|«)/i,
    tokenize: /\W+/g,
    whitespace: /^\s*$/,
    hasContent: /\S$/,
    hashUrl: /^#.+/,
    srcsetUrl: /(\S+)(\s+[\d.]+[xw])?(\s*(?:,|$))/g,
    b64DataUrl: /^data:\s*([^\s;,]+)\s*;\s*base64\s*,/i,
    // See: https://schema.org/Article
    jsonLdArticleTypes: /^Article|AdvertiserContentArticle|NewsArticle|AnalysisNewsArticle|AskPublicNewsArticle|BackgroundNewsArticle|OpinionNewsArticle|ReportageNewsArticle|ReviewNewsArticle|Report|SatiricalArticle|ScholarlyArticle|MedicalScholarlyArticle|SocialMediaPosting|BlogPosting|LiveBlogPosting|DiscussionForumPosting|TechArticle|APIReference$/
  },

  UNLIKELY_ROLES: [ "menu", "menubar", "complementary", "navigation", "alert", "alertdialog", "dialog" ],

  DIV_TO_P_ELEMS: new Set([ "BLOCKQUOTE", "DL", "DIV", "IMG", "OL", "P", "PRE", "TABLE", "UL" ]),

  ALTER_TO_DIV_EXCEPTIONS: ["DIV", "ARTICLE", "SECTION", "P"],

  PRESENTATIONAL_ATTRIBUTES: [ "align", "background", "bgcolor", "border", "cellpadding", "cellspacing", "frame", "hspace", "rules", "style", "valign", "vspace" ],

  DEPRECATED_SIZE_ATTRIBUTE_ELEMS: [ "TABLE", "TH", "TD", "HR", "PRE" ],

  // The commented out elements qualify as phrasing content but tend to be
  // removed by readability when put into paragraphs, so we ignore them here.
  PHRASING_ELEMS: [
    // "CANVAS", "IFRAME", "SVG", "VIDEO",
    "ABBR", "AUDIO", "B", "BDO", "BR", "BUTTON", "CITE", "CODE", "DATA",
    "DATALIST", "DFN", "EM", "EMBED", "I", "IMG", "INPUT", "KBD", "LABEL",
    "MARK", "MATH", "METER", "NOSCRIPT", "OBJECT", "OUTPUT", "PROGRESS", "Q",
    "RUBY", "SAMP", "SCRIPT", "SELECT", "SMALL", "SPAN", "STRONG", "SUB",
    "SUP", "TEXTAREA", "TIME", "VAR", "WBR"
  ],

  // These are the classes that readability sets itself.
  CLASSES_TO_PRESERVE: [ "page" ],

  // These are the list of HTML entities that need to be escaped.
  HTML_ESCAPE_MAP: {
    "lt": "<",
    "gt": ">",
    "amp": "&",
    "quot": '"',
    "apos": "'",
  },

  /**
   * Run any post-process modifications to article content as necessary.
   *
   * @param Element
   * @return void
  **/
  _postProcessContent: function(articleContent) {
    // Readability cannot open relative uris so we convert them to absolute uris.
    this._fixRelativeUris(articleContent);

    this._simplifyNestedElements(articleContent);

    if (!this._keepClasses) {
      // Remove classes.
      this._cleanClasses(articleContent);
    }
  },

  /**
   * Iterates over a NodeList, calls `filterFn` for each node and removes node
   * if function returned `true`.
   *
   * If function is not passed, removes all the nodes in node list.
   *
   * @param NodeList nodeList The nodes to operate on
   * @param Function filterFn the function to use as a filter
   * @return void
   */
  _removeNodes: function(nodeList, filterFn) {
    // Avoid ever operating on live node lists.
    if (this._docJSDOMParser && nodeList._isLiveNodeList) {
      throw new Error("Do not pass live node lists to _removeNodes");
    }
    for (var i = nodeList.length - 1; i >= 0; i--) {
      var node = nodeList[i];
      var parentNode = node.parentNode;
      if (parentNode) {
        if (!filterFn || filterFn.call(this, node, i, nodeList)) {
          parentNode.removeChild(node);
        }
      }
    }
  },

  /**
   * Iterates over a NodeList, and calls _setNodeTag for each node.
   *
   * @param NodeList nodeList The nodes to operate on
   * @param String newTagName the new tag name to use
   * @return void
   */
  _replaceNodeTags: function(nodeList, newTagName) {
    // Avoid ever operating on live node lists.
    if (this._docJSDOMParser && nodeList._isLiveNodeList) {
      throw new Error("Do not pass live node lists to _replaceNodeTags");
    }
    for (const node of nodeList) {
      this._setNodeTag(node, newTagName);
    }
  },

  /**
   * Iterate over a NodeList, which doesn't natively fully implement the Array
   * interface.
   *
   * For convenience, the current object context is applied to the provided
   * iterate function.
   *
   * @param  NodeList nodeList The NodeList.
   * @param  Function fn       The iterate function.
   * @return void
   */
  _forEachNode: function(nodeList, fn) {
    Array.prototype.forEach.call(nodeList, fn, this);
  },

  /**
   * Iterate over a NodeList, and return the first node that passes
   * the supplied test function
   *
   * For convenience, the current object context is applied to the provided
   * test function.
   *
   * @param  NodeList nodeList The NodeList.
   * @param  Function fn       The test function.
   * @return void
   */
  _findNode: function(nodeList, fn) {
    return Array.prototype.find.call(nodeList, fn, this);
  },

  /**
   * Iterate over a NodeList, return true if any of the provided iterate
   * function calls returns true, false otherwise.
   *
   * For convenience, the current object context is applied to the
   * provided iterate function.
   *
   * @param  NodeList nodeList The NodeList.
   * @param  Function fn       The iterate function.
   * @return Boolean
   */
  _someNode: function(nodeList, fn) {
    return Array.prototype.some.call(nodeList, fn, this);
  },

  /**
   * Iterate over a NodeList, return true if all of the provided iterate
   * function calls return true, false otherwise.
   *
   * For convenience, the current object context is applied to the
   * provided iterate function.
   *
   * @param  NodeList nodeList The NodeList.
   * @param  Function fn       The iterate function.
   * @return Boolean
   */
  _everyNode: function(nodeList, fn) {
    return Array.prototype.every.call(nodeList, fn, this);
  },

  /**
   * Concat all nodelists passed as arguments.
   *
   * @return ...NodeList
   * @return Array
   */
  _concatNodeLists: function() {
    var slice = Array.prototype.slice;
    var args = slice.call(arguments);
    var nodeLists = args.map(function(list) {
      return slice.call(list);
    });
    return Array.prototype.concat.apply([], nodeLists);
  },

  _getAllNodesWithTag: function(node, tagNames) {
    if (node.querySelectorAll) {
      return node.querySelectorAll(tagNames.join(","));
    }
    return [].concat.apply([], tagNames.map(function(tag) {
      var collection = node.getElementsByTagName(tag);
      return Array.isArray(collection) ? collection : Array.from(collection);
    }));
  },

  /**
   * Removes the class="" attribute from every element in the given
   * subtree, except those that match CLASSES_TO_PRESERVE and
   * the classesToPreserve array from the options object.
   *
   * @param Element
   * @return void
   */
  _cleanClasses: function(node) {
    var classesToPreserve = this._classesToPreserve;
    var className = (node.getAttribute("class") || "")
      .split(/\s+/)
      .filter(function(cls) {
        return classesToPreserve.indexOf(cls) != -1;
      })
      .join(" ");

    if (className) {
      node.setAttribute("class", className);
    } else {
      node.removeAttribute("class");
    }

    for (node = node.firstElementChild; node; node = node.nextElementSibling) {
      this._cleanClasses(node);
    }
  },

  /**
   * Converts each <a> and <img> uri in the given element to an absolute URI,
   * ignoring #ref URIs.
   *
   * @param Element
   * @return void
   */
  _fixRelativeUris: function(articleContent) {
    var baseURI = this._doc.baseURI;
    var documentURI = this._doc.documentURI;
    function toAbsoluteURI(uri) {
      // Leave hash links alone if the base URI matches the document URI:
      if (baseURI == documentURI && uri.charAt(0) == "#") {
        return uri;
      }

      // Otherwise, resolve against base URI:
      try {
        return new URL(uri, baseURI).href;
      } catch (ex) {
        // Something went wrong, just return the original:
      }
      return uri;
    }

    var links = this._getAllNodesWithTag(articleContent, ["a"]);
    this._forEachNode(links, function(link) {
      var href = link.getAttribute("href");
      if (href) {
        // Remove links with javascript: URIs, since
        // they won't work after scripts have been removed from the page.
        if (href.indexOf("javascript:") === 0) {
          // if the link only contains simple text content, it can be converted to a text node
          if (link.childNodes.length === 1 && link.childNodes[0].nodeType === this.TEXT_NODE) {
            var text = this._doc.createTextNode(link.textContent);
            link.parentNode.replaceChild(text, link);
          } else {
            // if the link has multiple children, they should all be preserved
            var container = this._doc.createElement("span");
            while (link.firstChild) {
              container.appendChild(link.firstChild);
            }
            link.parentNode.replaceChild(container, link);
          }
        } else {
          link.setAttribute("href", toAbsoluteURI(href));
        }
      }
    });

    var medias = this._getAllNodesWithTag(articleContent, [
      "img", "picture", "figure", "video", "audio", "source"
    ]);

    this._forEachNode(medias, function(media) {
      var src = media.getAttribute("src");
      var poster = media.getAttribute("poster");
      var srcset = media.getAttribute("srcset");

      if (src) {
        media.setAttribute("src", toAbsoluteURI(src));
      }

      if (poster) {
        media.setAttribute("poster", toAbsoluteURI(poster));
      }

      if (srcset) {
        var newSrcset = srcset.replace(this.REGEXPS.srcsetUrl, function(_, p1, p2, p3) {
          return toAbsoluteURI(p1) + (p2 || "") + p3;
        });

        media.setAttribute("srcset", newSrcset);
      }
    });
  },

  _simplifyNestedElements: function(articleContent) {
    var node = articleContent;

    while (node) {
      if (node.parentNode && ["DIV", "SECTION"].includes(node.tagName) && !(node.id && node.id.startsWith("readability"))) {
        if (this._isElementWithoutContent(node)) {
          node = this._removeAndGetNext(node);
          continue;
        } else if (this._hasSingleTagInsideElement(node, "DIV") || this._hasSingleTagInsideElement(node, "SECTION")) {
          var child = node.children[0];
          for (var i = 0; i < node.attributes.length; i++) {
            child.setAttribute(node.attributes[i].name, node.attributes[i].value);
          }
          node.parentNode.replaceChild(child, node);
          node = child;
          continue;
        }
      }

      node = this._getNextNode(node);
    }
  },

  /**
   * Get the article title as an H1.
   *
   * @return string
   **/
  _getArticleTitle: function() {
    var doc = this._doc;
    var curTitle = "";
    var origTitle = "";

    try {
      curTitle = origTitle = doc.title.trim();

      // If they had an element with id "title" in their HTML
      if (typeof curTitle !== "string")
        curTitle = origTitle = this._getInnerText(doc.getElementsByTagName("title")[0]);
    } catch (e) {/* ignore exceptions setting the title. */}

    var titleHadHierarchicalSeparators = false;
    function wordCount(str) {
      return str.split(/\s+/).length;
    }

    // If there's a separator in the title, first remove the final part
    if ((/ [\|\-\\\/>»] /).test(curTitle)) {
      titleHadHierarchicalSeparators = / [\\\/>»] /.test(curTitle);
      curTitle = origTitle.replace(/(.*)[\|\-\\\/>»] .*/gi, "$1");

      // If the resulting title is too short (3 words or fewer), remove
      // the first part instead:
      if (wordCount(curTitle) < 3)
        curTitle = origTitle.replace(/[^\|\-\\\/>»]*[\|\-\\\/>»](.*)/gi, "$1");
    } else if (curTitle.indexOf(": ") !== -1) {
      // Check if we have an heading containing this exact string, so we
      // could assume it's the full title.
      var headings = this._concatNodeLists(
        doc.getElementsByTagName("h1"),
        doc.getElementsByTagName("h2")
      );
      var trimmedTitle = curTitle.trim();
      var match = this._someNode(headings, function(heading) {
        return heading.textContent.trim() === trimmedTitle;
      });

      // If we don't, let's extract the title out of the original title string.
      if (!match) {
        curTitle = origTitle.substring(origTitle.lastIndexOf(":") + 1);

        // If the title is now too short, try the first colon instead:
        if (wordCount(curTitle) < 3) {
          curTitle = origTitle.substring(origTitle.indexOf(":") + 1);
          // But if we have too many words before the colon there's something weird
          // with the titles and the H tags so let's just use the original title instead
        } else if (wordCount(origTitle.substr(0, origTitle.indexOf(":"))) > 5) {
          curTitle = origTitle;
        }
      }
    } else if (curTitle.length > 150 || curTitle.length < 15) {
      var hOnes = doc.getElementsByTagName("h1");

      if (hOnes.length === 1)
        curTitle = this._getInnerText(hOnes[0]);
    }

    curTitle = curTitle.trim().replace(this.REGEXPS.normalize, " ");
    // If we now have 4 words or fewer as our title, and either no
    // 'hierarchical' separators (\, /, > or ») were found in the original
    // title or we decreased the number of words by more than 1 word, use
    // the original title.
    var curTitleWordCount = wordCount(curTitle);
    if (curTitleWordCount <= 4 &&
        (!titleHadHierarchicalSeparators ||
         curTitleWordCount != wordCount(origTitle.replace(/[\|\-\\\/>»]+/g, "")) - 1)) {
      curTitle = origTitle;
    }

    return curTitle;
  },

  /**
   * Prepare the HTML document for readability to scrape it.
   * This includes things like stripping javascript, CSS, and handling terrible markup.
   *
   * @return void
   **/
  _prepDocument: function() {
    var doc = this._doc;

    // Remove all style tags in head
    this._removeNodes(this._getAllNodesWithTag(doc, ["style"]));

    if (doc.body) {
      this._replaceBrs(doc.body);
    }

    this._replaceNodeTags(this._getAllNodesWithTag(doc, ["font"]), "SPAN");
  },

  /**
   * Finds the next node, starting from the given node, and ignoring
   * whitespace in between. If the given node is an element, the same node is
   * returned.
   */
  _nextNode: function (node) {
    var next = node;
    while (next
        && (next.nodeType != this.ELEMENT_NODE)
        && this.REGEXPS.whitespace.test(next.textContent)) {
      next = next.nextSibling;
    }
    return next;
  },

  /**
   * Replaces 2 or more successive <br> elements with a single <p>.
   * Whitespace between <br> elements are ignored. For example:
   *   <div>foo<br>bar<br> <br><br>abc</div>
   * will become:
   *   <div>foo<br>bar<p>abc</p></div>
   */
  _replaceBrs: function (elem) {
    this._forEachNode(this._getAllNodesWithTag(elem, ["br"]), function(br) {
      var next = br.nextSibling;

      // Whether 2 or more <br> elements have been found and replaced with a
      // <p> block.
      var replaced = false;

      // If we find a <br> chain, remove the <br>s until we hit another node
      // or non-whitespace. This leaves behind the first <br> in the chain
      // (which will be replaced with a <p> later).
      while ((next = this._nextNode(next)) && (next.tagName == "BR")) {
        replaced = true;
        var brSibling = next.nextSibling;
        next.parentNode.removeChild(next);
        next = brSibling;
      }

      // If we removed a <br> chain, replace the remaining <br> with a <p>. Add
      // all sibling nodes as children of the <p> until we hit another <br>
      // chain.
      if (replaced) {
        var p = this._doc.createElement("p");
        br.parentNode.replaceChild(p, br);

        next = p.nextSibling;
        while (next) {
          // If we've hit another <br><br>, we're done adding children to this <p>.
          if (next.tagName == "BR") {
            var nextElem = this._nextNode(next.nextSibling);
            if (nextElem && nextElem.tagName == "BR")
              break;
          }

          if (!this._isPhrasingContent(next))
            break;

          // Otherwise, make this node a child of the new <p>.
          var sibling = next.nextSibling;
          p.appendChild(next);
          next = sibling;
        }

        while (p.lastChild && this._isWhitespace(p.lastChild)) {
          p.removeChild(p.lastChild);
        }

        if (p.parentNode.tagName === "P")
          this._setNodeTag(p.parentNode, "DIV");
      }
    });
  },

  _setNodeTag: function (node, tag) {
    this.log("_setNodeTag", node, tag);
    if (this._docJSDOMParser) {
      node.localName = tag.toLowerCase();
      node.tagName = tag.toUpperCase();
      return node;
    }

    var replacement = node.ownerDocument.createElement(tag);
    while (node.firstChild) {
      replacement.appendChild(node.firstChild);
    }
    node.parentNode.replaceChild(replacement, node);
    if (node.readability)
      replacement.readability = node.readability;

    for (var i = 0; i < node.attributes.length; i++) {
      try {
        replacement.setAttribute(node.attributes[i].name, node.attributes[i].value);
      } catch (ex) {
        /* it's possible for setAttribute() to throw if the attribute name
         * isn't a valid XML Name. Such attributes can however be parsed from
         * source in HTML docs, see https://github.com/whatwg/html/issues/4275,
         * so we can hit them here and then throw. We don't care about such
         * attributes so we ignore them.
         */
      }
    }
    return replacement;
  },

  /**
   * Prepare the article node for display. Clean out any inline styles,
   * iframes, forms, strip extraneous <p> tags, etc.
   *
   * @param Element
   * @return void
   **/
  _prepArticle: function(articleContent) {
    this._cleanStyles(articleContent);

    // Check for data tables before we continue, to avoid removing items in
    // those tables, which will often be isolated even though they're
    // visually linked to other content-ful elements (text, images, etc.).
    this._markDataTables(articleContent);

    this._fixLazyImages(articleContent);

    // Clean out junk from the article content
    this._cleanConditionally(articleContent, "form");
    this._cleanConditionally(articleContent, "fieldset");
    this._clean(articleContent, "object");
    this._clean(articleContent, "embed");
    this._clean(articleContent, "footer");
    this._clean(articleContent, "link");
    this._clean(articleContent, "aside");

    // Clean out elements with little content that have "share" in their id/class combinations from final top candidates,
    // which means we don't remove the top candidates even they have "share".

    var shareElementThreshold = this.DEFAULT_CHAR_THRESHOLD;

    this._forEachNode(articleContent.children, function (topCandidate) {
      this._cleanMatchedNodes(topCandidate, function (node, matchString) {
        return this.REGEXPS.shareElements.test(matchString) && node.textContent.length < shareElementThreshold;
      });
    });

    this._clean(articleContent, "iframe");
    this._clean(articleContent, "input");
    this._clean(articleContent, "textarea");
    this._clean(articleContent, "select");
    this._clean(articleContent, "button");
    this._cleanHeaders(articleContent);

    // Do these last as the previous stuff may have removed junk
    // that will affect these
    this._cleanConditionally(articleContent, "table");
    this._cleanConditionally(articleContent, "ul");
    this._cleanConditionally(articleContent, "div");

    // replace H1 with H2 as H1 should be only title that is displayed separately
    this._replaceNodeTags(this._getAllNodesWithTag(articleContent, ["h1"]), "h2");

    // Remove extra paragraphs
    this._removeNodes(this._getAllNodesWithTag(articleContent, ["p"]), function (paragraph) {
      var imgCount = paragraph.getElementsByTagName("img").length;
      var embedCount = paragraph.getElementsByTagName("embed").length;
      var objectCount = paragraph.getElementsByTagName("object").length;
      // At this point, nasty iframes have been removed, only remain embedded video ones.
      var iframeCount = paragraph.getElementsByTagName("iframe").length;
      var totalCount = imgCount + embedCount + objectCount + iframeCount;

      return totalCount === 0 && !this._getInnerText(paragraph, false);
    });

    this._forEachNode(this._getAllNodesWithTag(articleContent, ["br"]), function(br) {
      var next = this._nextNode(br.nextSibling);
      if (next && next.tagName == "P")
        br.parentNode.removeChild(br);
    });

    // Remove single-cell tables
    this._forEachNode(this._getAllNodesWithTag(articleContent, ["table"]), function(table) {
      var tbody = this._hasSingleTagInsideElement(table, "TBODY") ? table.firstElementChild : table;
      if (this._hasSingleTagInsideElement(tbody, "TR")) {
        var row = tbody.firstElementChild;
        if (this._hasSingleTagInsideElement(row, "TD")) {
          var cell = row.firstElementChild;
          cell = this._setNodeTag(cell, this._everyNode(cell.childNodes, this._isPhrasingContent) ? "P" : "DIV");
          table.parentNode.replaceChild(cell, table);
        }
      }
    });
  },

  /**
   * Initialize a node with the readability object. Also checks the
   * className/id for special names to add to its score.
   *
   * @param Element
   * @return void
  **/
  _initializeNode: function(node) {
    node.readability = {"contentScore": 0};

    switch (node.tagName) {
      case "DIV":
        node.readability.contentScore += 5;
        break;

      case "PRE":
      case "TD":
      case "BLOCKQUOTE":
        node.readability.contentScore += 3;
        break;

      case "ADDRESS":
      case "OL":
      case "UL":
      case "DL":
      case "DD":
      case "DT":
      case "LI":
      case "FORM":
        node.readability.contentScore -= 3;
        break;

      case "H1":
      case "H2":
      case "H3":
      case "H4":
      case "H5":
      case "H6":
      case "TH":
        node.readability.contentScore -= 5;
        break;
    }

    node.readability.contentScore += this._getClassWeight(node);
  },

  _removeAndGetNext: function(node) {
    var nextNode = this._getNextNode(node, true);
    node.parentNode.removeChild(node);
    return nextNode;
  },

  /**
   * Traverse the DOM from node to node, starting at the node passed in.
   * Pass true for the second parameter to indicate this node itself
   * (and its kids) are going away, and we want the next node over.
   *
   * Calling this in a loop will traverse the DOM depth-first.
   */
  _getNextNode: function(node, ignoreSelfAndKids) {
    // First check for kids if those aren't being ignored
    if (!ignoreSelfAndKids && node.firstElementChild) {
      return node.firstElementChild;
    }
    // Then for siblings...
    if (node.nextElementSibling) {
      return node.nextElementSibling;
    }
    // And finally, move up the parent chain *and* find a sibling
    // (because this is depth-first traversal, we will have already
    // seen the parent nodes themselves).
    do {
      node = node.parentNode;
    } while (node && !node.nextElementSibling);
    return node && node.nextElementSibling;
  },

  // compares second text to first one
  // 1 = same text, 0 = completely different text
  // works the way that it splits both texts into words and then finds words that are unique in second text
  // the result is given by the lower length of unique parts
  _textSimilarity: function(textA, textB) {
    var tokensA = textA.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean);
    var tokensB = textB.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean);
    if (!tokensA.length || !tokensB.length) {
      return 0;
    }
    var uniqTokensB = tokensB.filter(token => !tokensA.includes(token));
    var distanceB = uniqTokensB.join(" ").length / tokensB.join(" ").length;
    return 1 - distanceB;
  },

  _checkByline: function(node, matchString) {
    if (this._articleByline) {
      return false;
    }

    if (node.getAttribute !== undefined) {
      var rel = node.getAttribute("rel");
      var itemprop = node.getAttribute("itemprop");
    }

    if ((rel === "author" || (itemprop && itemprop.indexOf("author") !== -1) || this.REGEXPS.byline.test(matchString)) && this._isValidByline(node.textContent)) {
      this._articleByline = node.textContent.trim();
      return true;
    }

    return false;
  },

  _getNodeAncestors: function(node, maxDepth) {
    maxDepth = maxDepth || 0;
    var i = 0, ancestors = [];
    while (node.parentNode) {
      ancestors.push(node.parentNode);
      if (maxDepth && ++i === maxDepth)
        break;
      node = node.parentNode;
    }
    return ancestors;
  },

  /***
   * grabArticle - Using a variety of metrics (content score, classname, element types), find the content that is
   *         most likely to be the stuff a user wants to read. Then return it wrapped up in a div.
   *
   * @param page a document to run upon. Needs to be a full document, complete with body.
   * @return Element
  **/
  _grabArticle: function (page) {
    this.log("**** grabArticle ****");
    var doc = this._doc;
    var isPaging = page !== null;
    page = page ? page : this._doc.body;

    // We can't grab an article if we don't have a page!
    if (!page) {
      this.log("No body found in document. Abort.");
      return null;
    }

    var pageCacheHtml = page.innerHTML;

    while (true) {
      this.log("Starting grabArticle loop");
      var stripUnlikelyCandidates = this._flagIsActive(this.FLAG_STRIP_UNLIKELYS);

      // First, node prepping. Trash nodes that look cruddy (like ones with the
      // class name "comment", etc), and turn divs into P tags where they have been
      // used inappropriately (as in, where they contain no other block level elements.)
      var elementsToScore = [];
      var node = this._doc.documentElement;

      let shouldRemoveTitleHeader = true;

      while (node) {

        if (node.tagName === "HTML") {
          this._articleLang = node.getAttribute("lang");
        }

        var matchString = node.className + " " + node.id;

        if (!this._isProbablyVisible(node)) {
          this.log("Removing hidden node - " + matchString);
          node = this._removeAndGetNext(node);
          continue;
        }

        // Check to see if this node is a byline, and remove it if it is.
        if (this._checkByline(node, matchString)) {
          node = this._removeAndGetNext(node);
          continue;
        }

        if (shouldRemoveTitleHeader && this._headerDuplicatesTitle(node)) {
          this.log("Removing header: ", node.textContent.trim(), this._articleTitle.trim());
          shouldRemoveTitleHeader = false;
          node = this._removeAndGetNext(node);
          continue;
        }

        // Remove unlikely candidates
        if (stripUnlikelyCandidates) {
          if (this.REGEXPS.unlikelyCandidates.test(matchString) &&
              !this.REGEXPS.okMaybeItsACandidate.test(matchString) &&
              !this._hasAncestorTag(node, "table") &&
              !this._hasAncestorTag(node, "code") &&
              node.tagName !== "BODY" &&
              node.tagName !== "A") {
            this.log("Removing unlikely candidate - " + matchString);
            node = this._removeAndGetNext(node);
            continue;
          }

          if (this.UNLIKELY_ROLES.includes(node.getAttribute("role"))) {
            this.log("Removing content with role " + node.getAttribute("role") + " - " + matchString);
            node = this._removeAndGetNext(node);
            continue;
          }
        }

        // Remove DIV, SECTION, and HEADER nodes without any content(e.g. text, image, video, or iframe).
        if ((node.tagName === "DIV" || node.tagName === "SECTION" || node.tagName === "HEADER" ||
             node.tagName === "H1" || node.tagName === "H2" || node.tagName === "H3" ||
             node.tagName === "H4" || node.tagName === "H5" || node.tagName === "H6") &&
            this._isElementWithoutContent(node)) {
          node = this._removeAndGetNext(node);
          continue;
        }

        if (this.DEFAULT_TAGS_TO_SCORE.indexOf(node.tagName) !== -1) {
          elementsToScore.push(node);
        }

        // Turn all divs that don't have children block level elements into p's
        if (node.tagName === "DIV") {
          // Put phrasing content into paragraphs.
          var p = null;
          var childNode = node.firstChild;
          while (childNode) {
            var nextSibling = childNode.nextSibling;
            if (this._isPhrasingContent(childNode)) {
              if (p !== null) {
                p.appendChild(childNode);
              } else if (!this._isWhitespace(childNode)) {
                p = doc.createElement("p");
                node.replaceChild(p, childNode);
                p.appendChild(childNode);
              }
            } else if (p !== null) {
              while (p.lastChild && this._isWhitespace(p.lastChild)) {
                p.removeChild(p.lastChild);
              }
              p = null;
            }
            childNode = nextSibling;
          }

          // Sites like http://mobile.slate.com encloses each paragraph with a DIV
          // element. DIVs with only a P element inside and no text content can be
          // safely converted into plain P elements to avoid confusing the scoring
          // algorithm with DIVs with are, in practice, paragraphs.
          if (this._hasSingleTagInsideElement(node, "P") && this._getLinkDensity(node) < 0.25) {
            var newNode = node.children[0];
            node.parentNode.replaceChild(newNode, node);
            node = newNode;
            elementsToScore.push(node);
          } else if (!this._hasChildBlockElement(node)) {
            node = this._setNodeTag(node, "P");
            elementsToScore.push(node);
          }
        }
        node = this._getNextNode(node);
      }

      /**
       * Loop through all paragraphs, and assign a score to them based on how content-y they look.
       * Then add their score to their parent node.
       *
       * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
      **/
      var candidates = [];
      this._forEachNode(elementsToScore, function(elementToScore) {
        if (!elementToScore.parentNode || typeof(elementToScore.parentNode.tagName) === "undefined")
          return;

        // If this paragraph is less than 25 characters, don't even count it.
        var innerText = this._getInnerText(elementToScore);
        if (innerText.length < 25)
          return;

        // Exclude nodes with no ancestor.
        var ancestors = this._getNodeAncestors(elementToScore, 5);
        if (ancestors.length === 0)
          return;

        var contentScore = 0;

        // Add a point for the paragraph itself as a base.
        contentScore += 1;

        // Add points for any commas within this paragraph.
        contentScore += innerText.split(",").length;

        // For every 100 characters in this paragraph, add another point. Up to 3 points.
        contentScore += Math.min(Math.floor(innerText.length / 100), 3);

        // Initialize and score ancestors.
        this._forEachNode(ancestors, function(ancestor, level) {
          if (!ancestor.tagName || !ancestor.parentNode || typeof(ancestor.parentNode.tagName) === "undefined")
            return;

          if (typeof(ancestor.readability) === "undefined") {
            this._initializeNode(ancestor);
            candidates.push(ancestor);
          }

          // Node score divider:
          // - parent:             1 (no division)
          // - grandparent:        2
          // - great grandparent+: ancestor level * 3
          if (level === 0)
            var scoreDivider = 1;
          else if (level === 1)
            scoreDivider = 2;
          else
            scoreDivider = level * 3;
          ancestor.readability.contentScore += contentScore / scoreDivider;
        });
      });

      // After we've calculated scores, loop through all of the possible
      // candidate nodes we found and find the one with the highest score.
      var topCandidates = [];
      for (var c = 0, cl = candidates.length; c < cl; c += 1) {
        var candidate = candidates[c];

        // Scale the final candidates score based on link density. Good content
        // should have a relatively small link density (5% or less) and be mostly
        // unaffected by this operation.
        var candidateScore = candidate.readability.contentScore * (1 - this._getLinkDensity(candidate));
        candidate.readability.contentScore = candidateScore;

        this.log("Candidate:", candidate, "with score " + candidateScore);

        for (var t = 0; t < this._nbTopCandidates; t++) {
          var aTopCandidate = topCandidates[t];

          if (!aTopCandidate || candidateScore > aTopCandidate.readability.contentScore) {
            topCandidates.splice(t, 0, candidate);
            if (topCandidates.length > this._nbTopCandidates)
              topCandidates.pop();
            break;
          }
        }
      }

      var topCandidate = topCandidates[0] || null;
      var neededToCreateTopCandidate = false;
      var parentOfTopCandidate;

      // If we still have no top candidate, just use the body as a last resort.
      // We also have to copy the body node so it is something we can modify.
      if (topCandidate === null || topCandidate.tagName === "BODY") {
        // Move all of the page's children into topCandidate
        topCandidate = doc.createElement("DIV");
        neededToCreateTopCandidate = true;
        // Move everything (not just elements, also text nodes etc.) into the container
        // so we even include text directly in the body:
        while (page.firstChild) {
          this.log("Moving child out:", page.firstChild);
          topCandidate.appendChild(page.firstChild);
        }

        page.appendChild(topCandidate);

        this._initializeNode(topCandidate);
      } else if (topCandidate) {
        // Find a better top candidate node if it contains (at least three) nodes which belong to `topCandidates` array
        // and whose scores are quite closed with current `topCandidate` node.
        var alternativeCandidateAncestors = [];
        for (var i = 1; i < topCandidates.length; i++) {
          if (topCandidates[i].readability.contentScore / topCandidate.readability.contentScore >= 0.75) {
            alternativeCandidateAncestors.push(this._getNodeAncestors(topCandidates[i]));
          }
        }
        var MINIMUM_TOPCANDIDATES = 3;
        if (alternativeCandidateAncestors.length >= MINIMUM_TOPCANDIDATES) {
          parentOfTopCandidate = topCandidate.parentNode;
          while (parentOfTopCandidate.tagName !== "BODY") {
            var listsContainingThisAncestor = 0;
            for (var ancestorIndex = 0; ancestorIndex < alternativeCandidateAncestors.length && listsContainingThisAncestor < MINIMUM_TOPCANDIDATES; ancestorIndex++) {
              listsContainingThisAncestor += Number(alternativeCandidateAncestors[ancestorIndex].includes(parentOfTopCandidate));
            }
            if (listsContainingThisAncestor >= MINIMUM_TOPCANDIDATES) {
              topCandidate = parentOfTopCandidate;
              break;
            }
            parentOfTopCandidate = parentOfTopCandidate.parentNode;
          }
        }
        if (!topCandidate.readability) {
          this._initializeNode(topCandidate);
        }

        // Because of our bonus system, parents of candidates might have scores
        // themselves. They get half of the node. There won't be nodes with higher
        // scores than our topCandidate, but if we see the score going *up* in the first
        // few steps up the tree, that's a decent sign that there might be more content
        // lurking in other places that we want to unify in. The sibling stuff
        // below does some of that - but only if we've looked high enough up the DOM
        // tree.
        parentOfTopCandidate = topCandidate.parentNode;
        var lastScore = topCandidate.readability.contentScore;
        // The scores shouldn't get too low.
        var scoreThreshold = lastScore / 3;
        while (parentOfTopCandidate.tagName !== "BODY") {
          if (!parentOfTopCandidate.readability) {
            parentOfTopCandidate = parentOfTopCandidate.parentNode;
            continue;
          }
          var parentScore = parentOfTopCandidate.readability.contentScore;
          if (parentScore < scoreThreshold)
            break;
          if (parentScore > lastScore) {
            // Alright! We found a better parent to use.
            topCandidate = parentOfTopCandidate;
            break;
          }
          lastScore = parentOfTopCandidate.readability.contentScore;
          parentOfTopCandidate = parentOfTopCandidate.parentNode;
        }

        // If the top candidate is the only child, use parent instead. This will help sibling
        // joining logic when adjacent content is actually located in parent's sibling node.
        parentOfTopCandidate = topCandidate.parentNode;
        while (parentOfTopCandidate.tagName != "BODY" && parentOfTopCandidate.children.length == 1) {
          topCandidate = parentOfTopCandidate;
          parentOfTopCandidate = topCandidate.parentNode;
        }
        if (!topCandidate.readability) {
          this._initializeNode(topCandidate);
        }
      }

      // Now that we have the top candidate, look through its siblings for content
      // that might also be related. Things like preambles, content split by ads
      // that we removed, etc.
      var articleContent = doc.createElement("DIV");
      if (isPaging)
        articleContent.id = "readability-content";

      var siblingScoreThreshold = Math.max(10, topCandidate.readability.contentScore * 0.2);
      // Keep potential top candidate's parent node to try to get text direction of it later.
      parentOfTopCandidate = topCandidate.parentNode;
      var siblings = parentOfTopCandidate.children;

      for (var s = 0, sl = siblings.length; s < sl; s++) {
        var sibling = siblings[s];
        var append = false;

        this.log("Looking at sibling node:", sibling, sibling.readability ? ("with score " + sibling.readability.contentScore) : "");
        this.log("Sibling has score", sibling.readability ? sibling.readability.contentScore : "Unknown");

        if (sibling === topCandidate) {
          append = true;
        } else {
          var contentBonus = 0;

          // Give a bonus if sibling nodes and top candidates have the example same classname
          if (sibling.className === topCandidate.className && topCandidate.className !== "")
            contentBonus += topCandidate.readability.contentScore * 0.2;

          if (sibling.readability &&
              ((sibling.readability.contentScore + contentBonus) >= siblingScoreThreshold)) {
            append = true;
          } else if (sibling.nodeName === "P") {
            var linkDensity = this._getLinkDensity(sibling);
            var nodeContent = this._getInnerText(sibling);
            var nodeLength = nodeContent.length;

            if (nodeLength > 80 && linkDensity < 0.25) {
              append = true;
            } else if (nodeLength < 80 && nodeLength > 0 && linkDensity === 0 &&
                       nodeContent.search(/\.( |$)/) !== -1) {
              append = true;
            }
          }
        }

        if (append) {
          this.log("Appending node:", sibling);

          if (this.ALTER_TO_DIV_EXCEPTIONS.indexOf(sibling.nodeName) === -1) {
            // We have a node that isn't a common block level element, like a form or td tag.
            // Turn it into a div so it doesn't get filtered out later by accident.
            this.log("Altering sibling:", sibling, "to div.");

            sibling = this._setNodeTag(sibling, "DIV");
          }

          articleContent.appendChild(sibling);
          // Fetch children again to make it compatible
          // with DOM parsers without live collection support.
          siblings = parentOfTopCandidate.children;
          // siblings is a reference to the children array, and
          // sibling is removed from the array when we call appendChild().
          // As a result, we must revisit this index since the nodes
          // have been shifted.
          s -= 1;
          sl -= 1;
        }
      }

      if (this._debug)
        this.log("Article content pre-prep: " + articleContent.innerHTML);
      // So we have all of the content that we need. Now we clean it up for presentation.
      this._prepArticle(articleContent);
      if (this._debug)
        this.log("Article content post-prep: " + articleContent.innerHTML);

      if (neededToCreateTopCandidate) {
        // We already created a fake div thing, and there wouldn't have been any siblings left
        // for the previous loop, so there's no point trying to create a new div, and then
        // move all the children over. Just assign IDs and class names here. No need to append
        // because that already happened anyway.
        topCandidate.id = "readability-page-1";
        topCandidate.className = "page";
      } else {
        var div = doc.createElement("DIV");
        div.id = "readability-page-1";
        div.className = "page";
        while (articleContent.firstChild) {
          div.appendChild(articleContent.firstChild);
        }
        articleContent.appendChild(div);
      }

      if (this._debug)
        this.log("Article content after paging: " + articleContent.innerHTML);

      var parseSuccessful = true;

      // Now that we've gone through the full algorithm, check to see if
      // we got any meaningful content. If we didn't, we may need to re-run
      // grabArticle with different flags set. This gives us a higher likelihood of
      // finding the content, and the sieve approach gives us a higher likelihood of
      // finding the -right- content.
      var textLength = this._getInnerText(articleContent, true).length;
      if (textLength < this._charThreshold) {
        parseSuccessful = false;
        page.innerHTML = pageCacheHtml;

        if (this._flagIsActive(this.FLAG_STRIP_UNLIKELYS)) {
          this._removeFlag(this.FLAG_STRIP_UNLIKELYS);
          this._attempts.push({articleContent: articleContent, textLength: textLength});
        } else if (this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) {
          this._removeFlag(this.FLAG_WEIGHT_CLASSES);
          this._attempts.push({articleContent: articleContent, textLength: textLength});
        } else if (this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) {
          this._removeFlag(this.FLAG_CLEAN_CONDITIONALLY);
          this._attempts.push({articleContent: articleContent, textLength: textLength});
        } else {
          this._attempts.push({articleContent: articleContent, textLength: textLength});
          // No luck after removing flags, just return the longest text we found during the different loops
          this._attempts.sort(function (a, b) {
            return b.textLength - a.textLength;
          });

          // But first check if we actually have something
          if (!this._attempts[0].textLength) {
            return null;
          }

          articleContent = this._attempts[0].articleContent;
          parseSuccessful = true;
        }
      }

      if (parseSuccessful) {
        // Find out text direction from ancestors of final top candidate.
        var ancestors = [parentOfTopCandidate, topCandidate].concat(this._getNodeAncestors(parentOfTopCandidate));
        this._someNode(ancestors, function(ancestor) {
          if (!ancestor.tagName)
            return false;
          var articleDir = ancestor.getAttribute("dir");
          if (articleDir) {
            this._articleDir = articleDir;
            return true;
          }
          return false;
        });
        return articleContent;
      }
    }
  },

  /**
   * Check whether the input string could be a byline.
   * This verifies that the input is a string, and that the length
   * is less than 100 chars.
   *
   * @param possibleByline {string} - a string to check whether its a byline.
   * @return Boolean - whether the input string is a byline.
   */
  _isValidByline: function(byline) {
    if (typeof byline == "string" || byline instanceof String) {
      byline = byline.trim();
      return (byline.length > 0) && (byline.length < 100);
    }
    return false;
  },

  /**
   * Converts some of the common HTML entities in string to their corresponding characters.
   *
   * @param str {string} - a string to unescape.
   * @return string without HTML entity.
   */
  _unescapeHtmlEntities: function(str) {
    if (!str) {
      return str;
    }

    var htmlEscapeMap = this.HTML_ESCAPE_MAP;
    return str.replace(/&(quot|amp|apos|lt|gt);/g, function(_, tag) {
      return htmlEscapeMap[tag];
    }).replace(/&#(?:x([0-9a-z]{1,4})|([0-9]{1,4}));/gi, function(_, hex, numStr) {
      var num = parseInt(hex || numStr, hex ? 16 : 10);
      return String.fromCharCode(num);
    });
  },

  /**
   * Try to extract metadata from JSON-LD object.
   * For now, only Schema.org objects of type Article or its subtypes are supported.
   * @return Object with any metadata that could be extracted (possibly none)
   */
  _getJSONLD: function (doc) {
    var scripts = this._getAllNodesWithTag(doc, ["script"]);

    var metadata;

    this._forEachNode(scripts, function(jsonLdElement) {
      if (!metadata && jsonLdElement.getAttribute("type") === "application/ld+json") {
        try {
          // Strip CDATA markers if present
          var content = jsonLdElement.textContent.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "");
          var parsed = JSON.parse(content);
          if (
            !parsed["@context"] ||
            !parsed["@context"].match(/^https?\:\/\/schema\.org$/)
          ) {
            return;
          }

          if (!parsed["@type"] && Array.isArray(parsed["@graph"])) {
            parsed = parsed["@graph"].find(function(it) {
              return (it["@type"] || "").match(
                this.REGEXPS.jsonLdArticleTypes
              );
            });
          }

          if (
            !parsed ||
            !parsed["@type"] ||
            !parsed["@type"].match(this.REGEXPS.jsonLdArticleTypes)
          ) {
            return;
          }

          metadata = {};

          if (typeof parsed.name === "string" && typeof parsed.headline === "string" && parsed.name !== parsed.headline) {
            // we have both name and headline element in the JSON-LD. They should both be the same but some websites like aktualne.cz
            // put their own name into "name" and the article title to "headline" which confuses Readability. So we try to check if either
            // "name" or "headline" closely matches the html title, and if so, use that one. If not, then we use "name" by default.

            var title = this._getArticleTitle();
            var nameMatches = this._textSimilarity(parsed.name, title) > 0.75;
            var headlineMatches = this._textSimilarity(parsed.headline, title) > 0.75;

            if (headlineMatches && !nameMatches) {
              metadata.title = parsed.headline;
            } else {
              metadata.title = parsed.name;
            }
          } else if (typeof parsed.name === "string") {
            metadata.title = parsed.name.trim();
          } else if (typeof parsed.headline === "string") {
            metadata.title = parsed.headline.trim();
          }
          if (parsed.author) {
            if (typeof parsed.author.name === "string") {
              metadata.byline = parsed.author.name.trim();
            } else if (Array.isArray(parsed.author) && parsed.author[0] && typeof parsed.author[0].name === "string") {
              metadata.byline = parsed.author
                .filter(function(author) {
                  return author && typeof author.name === "string";
                })
                .map(function(author) {
                  return author.name.trim();
                })
                .join(", ");
            }
          }
          if (typeof parsed.description === "string") {
            metadata.excerpt = parsed.description.trim();
          }
          if (
            parsed.publisher &&
            typeof parsed.publisher.name === "string"
          ) {
            metadata.siteName = parsed.publisher.name.trim();
          }
          return;
        } catch (err) {
          this.log(err.message);
        }
      }
    });
    return metadata ? metadata : {};
  },

  /**
   * Attempts to get excerpt and byline metadata for the article.
   *
   * @param {Object} jsonld — object containing any metadata that
   * could be extracted from JSON-LD object.
   *
   * @return Object with optional "excerpt" and "byline" properties
   */
  _getArticleMetadata: function(jsonld) {
    var metadata = {};
    var values = {};
    var metaElements = this._doc.getElementsByTagName("meta");

    // property is a space-separated list of values
    var propertyPattern = /\s*(dc|dcterm|og|twitter)\s*:\s*(author|creator|description|title|site_name)\s*/gi;

    // name is a single value
    var namePattern = /^\s*(?:(dc|dcterm|og|twitter|weibo:(article|webpage))\s*[\.:]\s*)?(author|creator|description|title|site_name)\s*$/i;

    // Find description tags.
    this._forEachNode(metaElements, function(element) {
      var elementName = element.getAttribute("name");
      var elementProperty = element.getAttribute("property");
      var content = element.getAttribute("content");
      if (!content) {
        return;
      }
      var matches = null;
      var name = null;

      if (elementProperty) {
        matches = elementProperty.match(propertyPattern);
        if (matches) {
          // Convert to lowercase, and remove any whitespace
          // so we can match below.
          name = matches[0].toLowerCase().replace(/\s/g, "");
          // multiple authors
          values[name] = content.trim();
        }
      }
      if (!matches && elementName && namePattern.test(elementName)) {
        name = elementName;
        if (content) {
          // Convert to lowercase, remove any whitespace, and convert dots
          // to colons so we can match below.
          name = name.toLowerCase().replace(/\s/g, "").replace(/\./g, ":");
          values[name] = content.trim();
        }
      }
    });

    // get title
    metadata.title = jsonld.title ||
                     values["dc:title"] ||
                     values["dcterm:title"] ||
                     values["og:title"] ||
                     values["weibo:article:title"] ||
                     values["weibo:webpage:title"] ||
                     values["title"] ||
                     values["twitter:title"];

    if (!metadata.title) {
      metadata.title = this._getArticleTitle();
    }

    // get author
    metadata.byline = jsonld.byline ||
                      values["dc:creator"] ||
                      values["dcterm:creator"] ||
                      values["author"];

    // get description
    metadata.excerpt = jsonld.excerpt ||
                       values["dc:description"] ||
                       values["dcterm:description"] ||
                       values["og:description"] ||
                       values["weibo:article:description"] ||
                       values["weibo:webpage:description"] ||
                       values["description"] ||
                       values["twitter:description"];

    // get site name
    metadata.siteName = jsonld.siteName ||
                        values["og:site_name"];

    // in many sites the meta value is escaped with HTML entities,
    // so here we need to unescape it
    metadata.title = this._unescapeHtmlEntities(metadata.title);
    metadata.byline = this._unescapeHtmlEntities(metadata.byline);
    metadata.excerpt = this._unescapeHtmlEntities(metadata.excerpt);
    metadata.siteName = this._unescapeHtmlEntities(metadata.siteName);

    return metadata;
  },

  /**
   * Check if node is image, or if node contains exactly only one image
   * whether as a direct child or as its descendants.
   *
   * @param Element
  **/
  _isSingleImage: function(node) {
    if (node.tagName === "IMG") {
      return true;
    }

    if (node.children.length !== 1 || node.textContent.trim() !== "") {
      return false;
    }

    return this._isSingleImage(node.children[0]);
  },

  /**
   * Find all <noscript> that are located after <img> nodes, and which contain only one
   * <img> element. Replace the first image with the image from inside the <noscript> tag,
   * and remove the <noscript> tag. This improves the quality of the images we use on
   * some sites (e.g. Medium).
   *
   * @param Element
  **/
  _unwrapNoscriptImages: function(doc) {
    // Find img without source or attributes that might contains image, and remove it.
    // This is done to prevent a placeholder img is replaced by img from noscript in next step.
    var imgs = Array.from(doc.getElementsByTagName("img"));
    this._forEachNode(imgs, function(img) {
      for (var i = 0; i < img.attributes.length; i++) {
        var attr = img.attributes[i];
        switch (attr.name) {
          case "src":
          case "srcset":
          case "data-src":
          case "data-srcset":
            return;
        }

        if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
          return;
        }
      }

      img.parentNode.removeChild(img);
    });

    // Next find noscript and try to extract its image
    var noscripts = Array.from(doc.getElementsByTagName("noscript"));
    this._forEachNode(noscripts, function(noscript) {
      // Parse content of noscript and make sure it only contains image
      var tmp = doc.createElement("div");
      tmp.innerHTML = noscript.innerHTML;
      if (!this._isSingleImage(tmp)) {
        return;
      }

      // If noscript has previous sibling and it only contains image,
      // replace it with noscript content. However we also keep old
      // attributes that might contains image.
      var prevElement = noscript.previousElementSibling;
      if (prevElement && this._isSingleImage(prevElement)) {
        var prevImg = prevElement;
        if (prevImg.tagName !== "IMG") {
          prevImg = prevElement.getElementsByTagName("img")[0];
        }

        var newImg = tmp.getElementsByTagName("img")[0];
        for (var i = 0; i < prevImg.attributes.length; i++) {
          var attr = prevImg.attributes[i];
          if (attr.value === "") {
            continue;
          }

          if (attr.name === "src" || attr.name === "srcset" || /\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
            if (newImg.getAttribute(attr.name) === attr.value) {
              continue;
            }

            var attrName = attr.name;
            if (newImg.hasAttribute(attrName)) {
              attrName = "data-old-" + attrName;
            }

            newImg.setAttribute(attrName, attr.value);
          }
        }

        noscript.parentNode.replaceChild(tmp.firstElementChild, prevElement);
      }
    });
  },

  /**
   * Removes script tags from the document.
   *
   * @param Element
  **/
  _removeScripts: function(doc) {
    this._removeNodes(this._getAllNodesWithTag(doc, ["script"]), function(scriptNode) {
      scriptNode.nodeValue = "";
      scriptNode.removeAttribute("src");
      return true;
    });
    this._removeNodes(this._getAllNodesWithTag(doc, ["noscript"]));
  },

  /**
   * Check if this node has only whitespace and a single element with given tag
   * Returns false if the DIV node contains non-empty text nodes
   * or if it contains no element with given tag or more than 1 element.
   *
   * @param Element
   * @param string tag of child element
  **/
  _hasSingleTagInsideElement: function(element, tag) {
    // There should be exactly 1 element child with given tag
    if (element.children.length != 1 || element.children[0].tagName !== tag) {
      return false;
    }

    // And there should be no text nodes with real content
    return !this._someNode(element.childNodes, function(node) {
      return node.nodeType === this.TEXT_NODE &&
             this.REGEXPS.hasContent.test(node.textContent);
    });
  },

  _isElementWithoutContent: function(node) {
    return node.nodeType === this.ELEMENT_NODE &&
      node.textContent.trim().length == 0 &&
      (node.children.length == 0 ||
       node.children.length == node.getElementsByTagName("br").length + node.getElementsByTagName("hr").length);
  },

  /**
   * Determine whether element has any children block level elements.
   *
   * @param Element
   */
  _hasChildBlockElement: function (element) {
    return this._someNode(element.childNodes, function(node) {
      return this.DIV_TO_P_ELEMS.has(node.tagName) ||
             this._hasChildBlockElement(node);
    });
  },

  /***
   * Determine if a node qualifies as phrasing content.
   * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Phrasing_content
  **/
  _isPhrasingContent: function(node) {
    return node.nodeType === this.TEXT_NODE || this.PHRASING_ELEMS.indexOf(node.tagName) !== -1 ||
      ((node.tagName === "A" || node.tagName === "DEL" || node.tagName === "INS") &&
        this._everyNode(node.childNodes, this._isPhrasingContent));
  },

  _isWhitespace: function(node) {
    return (node.nodeType === this.TEXT_NODE && node.textContent.trim().length === 0) ||
           (node.nodeType === this.ELEMENT_NODE && node.tagName === "BR");
  },

  /**
   * Get the inner text of a node - cross browser compatibly.
   * This also strips out any excess whitespace to be found.
   *
   * @param Element
   * @param Boolean normalizeSpaces (default: true)
   * @return string
  **/
  _getInnerText: function(e, normalizeSpaces) {
    normalizeSpaces = (typeof normalizeSpaces === "undefined") ? true : normalizeSpaces;
    var textContent = e.textContent.trim();

    if (normalizeSpaces) {
      return textContent.replace(this.REGEXPS.normalize, " ");
    }
    return textContent;
  },

  /**
   * Get the number of times a string s appears in the node e.
   *
   * @param Element
   * @param string - what to split on. Default is ","
   * @return number (integer)
  **/
  _getCharCount: function(e, s) {
    s = s || ",";
    return this._getInnerText(e).split(s).length - 1;
  },

  /**
   * Remove the style attribute on every e and under.
   * TODO: Test if getElementsByTagName(*) is faster.
   *
   * @param Element
   * @return void
  **/
  _cleanStyles: function(e) {
    if (!e || e.tagName.toLowerCase() === "svg")
      return;

    // Remove `style` and deprecated presentational attributes
    for (var i = 0; i < this.PRESENTATIONAL_ATTRIBUTES.length; i++) {
      e.removeAttribute(this.PRESENTATIONAL_ATTRIBUTES[i]);
    }

    if (this.DEPRECATED_SIZE_ATTRIBUTE_ELEMS.indexOf(e.tagName) !== -1) {
      e.removeAttribute("width");
      e.removeAttribute("height");
    }

    var cur = e.firstElementChild;
    while (cur !== null) {
      this._cleanStyles(cur);
      cur = cur.nextElementSibling;
    }
  },

  /**
   * Get the density of links as a percentage of the content
   * This is the amount of text that is inside a link divided by the total text in the node.
   *
   * @param Element
   * @return number (float)
  **/
  _getLinkDensity: function(element) {
    var textLength = this._getInnerText(element).length;
    if (textLength === 0)
      return 0;

    var linkLength = 0;

    // XXX implement _reduceNodeList?
    this._forEachNode(element.getElementsByTagName("a"), function(linkNode) {
      var href = linkNode.getAttribute("href");
      var coefficient = href && this.REGEXPS.hashUrl.test(href) ? 0.3 : 1;
      linkLength += this._getInnerText(linkNode).length * coefficient;
    });

    return linkLength / textLength;
  },

  /**
   * Get an elements class/id weight. Uses regular expressions to tell if this
   * element looks good or bad.
   *
   * @param Element
   * @return number (Integer)
  **/
  _getClassWeight: function(e) {
    if (!this._flagIsActive(this.FLAG_WEIGHT_CLASSES))
      return 0;

    var weight = 0;

    // Look for a special classname
    if (typeof(e.className) === "string" && e.className !== "") {
      if (this.REGEXPS.negative.test(e.className))
        weight -= 25;

      if (this.REGEXPS.positive.test(e.className))
        weight += 25;
    }

    // Look for a special ID
    if (typeof(e.id) === "string" && e.id !== "") {
      if (this.REGEXPS.negative.test(e.id))
        weight -= 25;

      if (this.REGEXPS.positive.test(e.id))
        weight += 25;
    }

    return weight;
  },

  /**
   * Clean a node of all elements of type "tag".
   * (Unless it's a youtube/vimeo video. People love movies.)
   *
   * @param Element
   * @param string tag to clean
   * @return void
   **/
  _clean: function(e, tag) {
    var isEmbed = ["object", "embed", "iframe"].indexOf(tag) !== -1;

    this._removeNodes(this._getAllNodesWithTag(e, [tag]), function(element) {
      // Allow youtube and vimeo videos through as people usually want to see those.
      if (isEmbed) {
        // First, check the elements attributes to see if any of them contain youtube or vimeo
        for (var i = 0; i < element.attributes.length; i++) {
          if (this.REGEXPS.videos.test(element.attributes[i].value)) {
            return false;
          }
        }

        // For embed with <object> tag, check inner HTML as well.
        if (element.tagName === "object" && this.REGEXPS.videos.test(element.innerHTML)) {
          return false;
        }
      }

      return true;
    });
  },

  /**
   * Check if a given node has one of its ancestor tag name matching the
   * provided one.
   * @param  HTMLElement node
   * @param  String      tagName
   * @param  Number      maxDepth
   * @param  Function    filterFn a filter to invoke to determine whether this node 'counts'
   * @return Boolean
   */
  _hasAncestorTag: function(node, tagName, maxDepth, filterFn) {
    maxDepth = maxDepth || 3;
    tagName = tagName.toUpperCase();
    var depth = 0;
    while (node.parentNode) {
      if (maxDepth > 0 && depth > maxDepth)
        return false;
      if (node.parentNode.tagName === tagName && (!filterFn || filterFn(node.parentNode)))
        return true;
      node = node.parentNode;
      depth++;
    }
    return false;
  },

  /**
   * Return an object indicating how many rows and columns this table has.
   */
  _getRowAndColumnCount: function(table) {
    var rows = 0;
    var columns = 0;
    var trs = table.getElementsByTagName("tr");
    for (var i = 0; i < trs.length; i++) {
      var rowspan = trs[i].getAttribute("rowspan") || 0;
      if (rowspan) {
        rowspan = parseInt(rowspan, 10);
      }
      rows += (rowspan || 1);

      // Now look for column-related info
      var columnsInThisRow = 0;
      var cells = trs[i].getElementsByTagName("td");
      for (var j = 0; j < cells.length; j++) {
        var colspan = cells[j].getAttribute("colspan") || 0;
        if (colspan) {
          colspan = parseInt(colspan, 10);
        }
        columnsInThisRow += (colspan || 1);
      }
      columns = Math.max(columns, columnsInThisRow);
    }
    return {rows: rows, columns: columns};
  },

  /**
   * Look for 'data' (as opposed to 'layout') tables, for which we use
   * similar checks as
   * https://searchfox.org/mozilla-central/rev/f82d5c549f046cb64ce5602bfd894b7ae807c8f8/accessible/generic/TableAccessible.cpp#19
   */
  _markDataTables: function(root) {
    var tables = root.getElementsByTagName("table");
    for (var i = 0; i < tables.length; i++) {
      var table = tables[i];
      var role = table.getAttribute("role");
      if (role == "presentation") {
        table._readabilityDataTable = false;
        continue;
      }
      var datatable = table.getAttribute("datatable");
      if (datatable == "0") {
        table._readabilityDataTable = false;
        continue;
      }
      var summary = table.getAttribute("summary");
      if (summary) {
        table._readabilityDataTable = true;
        continue;
      }

      var caption = table.getElementsByTagName("caption")[0];
      if (caption && caption.childNodes.length > 0) {
        table._readabilityDataTable = true;
        continue;
      }

      // If the table has a descendant with any of these tags, consider a data table:
      var dataTableDescendants = ["col", "colgroup", "tfoot", "thead", "th"];
      var descendantExists = function(tag) {
        return !!table.getElementsByTagName(tag)[0];
      };
      if (dataTableDescendants.some(descendantExists)) {
        this.log("Data table because found data-y descendant");
        table._readabilityDataTable = true;
        continue;
      }

      // Nested tables indicate a layout table:
      if (table.getElementsByTagName("table")[0]) {
        table._readabilityDataTable = false;
        continue;
      }

      var sizeInfo = this._getRowAndColumnCount(table);
      if (sizeInfo.rows >= 10 || sizeInfo.columns > 4) {
        table._readabilityDataTable = true;
        continue;
      }
      // Now just go by size entirely:
      table._readabilityDataTable = sizeInfo.rows * sizeInfo.columns > 10;
    }
  },

  /* convert images and figures that have properties like data-src into images that can be loaded without JS */
  _fixLazyImages: function (root) {
    this._forEachNode(this._getAllNodesWithTag(root, ["img", "picture", "figure"]), function (elem) {
      // In some sites (e.g. Kotaku), they put 1px square image as base64 data uri in the src attribute.
      // So, here we check if the data uri is too short, just might as well remove it.
      if (elem.src && this.REGEXPS.b64DataUrl.test(elem.src)) {
        // Make sure it's not SVG, because SVG can have a meaningful image in under 133 bytes.
        var parts = this.REGEXPS.b64DataUrl.exec(elem.src);
        if (parts[1] === "image/svg+xml") {
          return;
        }

        // Make sure this element has other attributes which contains image.
        // If it doesn't, then this src is important and shouldn't be removed.
        var srcCouldBeRemoved = false;
        for (var i = 0; i < elem.attributes.length; i++) {
          var attr = elem.attributes[i];
          if (attr.name === "src") {
            continue;
          }

          if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
            srcCouldBeRemoved = true;
            break;
          }
        }

        // Here we assume if image is less than 100 bytes (or 133B after encoded to base64)
        // it will be too small, therefore it might be placeholder image.
        if (srcCouldBeRemoved) {
          var b64starts = elem.src.search(/base64\s*/i) + 7;
          var b64length = elem.src.length - b64starts;
          if (b64length < 133) {
            elem.removeAttribute("src");
          }
        }
      }

      // also check for "null" to work around https://github.com/jsdom/jsdom/issues/2580
      if ((elem.src || (elem.srcset && elem.srcset != "null")) && elem.className.toLowerCase().indexOf("lazy") === -1) {
        return;
      }

      for (var j = 0; j < elem.attributes.length; j++) {
        attr = elem.attributes[j];
        if (attr.name === "src" || attr.name === "srcset" || attr.name === "alt") {
          continue;
        }
        var copyTo = null;
        if (/\.(jpg|jpeg|png|webp)\s+\d/.test(attr.value)) {
          copyTo = "srcset";
        } else if (/^\s*\S+\.(jpg|jpeg|png|webp)\S*\s*$/.test(attr.value)) {
          copyTo = "src";
        }
        if (copyTo) {
          //if this is an img or picture, set the attribute directly
          if (elem.tagName === "IMG" || elem.tagName === "PICTURE") {
            elem.setAttribute(copyTo, attr.value);
          } else if (elem.tagName === "FIGURE" && !this._getAllNodesWithTag(elem, ["img", "picture"]).length) {
            //if the item is a <figure> that does not contain an image or picture, create one and place it inside the figure
            //see the nytimes-3 testcase for an example
            var img = this._doc.createElement("img");
            img.setAttribute(copyTo, attr.value);
            elem.appendChild(img);
          }
        }
      }
    });
  },

  _getTextDensity: function(e, tags) {
    var textLength = this._getInnerText(e, true).length;
    if (textLength === 0) {
      return 0;
    }
    var childrenLength = 0;
    var children = this._getAllNodesWithTag(e, tags);
    this._forEachNode(children, (child) => childrenLength += this._getInnerText(child, true).length);
    return childrenLength / textLength;
  },

  /**
   * Clean an element of all tags of type "tag" if they look fishy.
   * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
   *
   * @return void
   **/
  _cleanConditionally: function(e, tag) {
    if (!this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY))
      return;

    // Gather counts for other typical elements embedded within.
    // Traverse backwards so we can remove nodes at the same time
    // without effecting the traversal.
    //
    // TODO: Consider taking into account original contentScore here.
    this._removeNodes(this._getAllNodesWithTag(e, [tag]), function(node) {
      // First check if this node IS data table, in which case don't remove it.
      var isDataTable = function(t) {
        return t._readabilityDataTable;
      };

      var isList = tag === "ul" || tag === "ol";
      if (!isList) {
        var listLength = 0;
        var listNodes = this._getAllNodesWithTag(node, ["ul", "ol"]);
        this._forEachNode(listNodes, (list) => listLength += this._getInnerText(list).length);
        isList = listLength / this._getInnerText(node).length > 0.9;
      }

      if (tag === "table" && isDataTable(node)) {
        return false;
      }

      // Next check if we're inside a data table, in which case don't remove it as well.
      if (this._hasAncestorTag(node, "table", -1, isDataTable)) {
        return false;
      }

      if (this._hasAncestorTag(node, "code")) {
        return false;
      }

      var weight = this._getClassWeight(node);

      this.log("Cleaning Conditionally", node);

      var contentScore = 0;

      if (weight + contentScore < 0) {
        return true;
      }

      if (this._getCharCount(node, ",") < 10) {
        // If there are not very many commas, and the number of
        // non-paragraph elements is more than paragraphs or other
        // ominous signs, remove the element.
        var p = node.getElementsByTagName("p").length;
        var img = node.getElementsByTagName("img").length;
        var li = node.getElementsByTagName("li").length - 100;
        var input = node.getElementsByTagName("input").length;
        var headingDensity = this._getTextDensity(node, ["h1", "h2", "h3", "h4", "h5", "h6"]);

        var embedCount = 0;
        var embeds = this._getAllNodesWithTag(node, ["object", "embed", "iframe"]);

        for (var i = 0; i < embeds.length; i++) {
          // If this embed has attribute that matches video regex, don't delete it.
          for (var j = 0; j < embeds[i].attributes.length; j++) {
            if (this.REGEXPS.videos.test(embeds[i].attributes[j].value)) {
              return false;
            }
          }

          // For embed with <object> tag, check inner HTML as well.
          if (embeds[i].tagName === "object" && this.REGEXPS.videos.test(embeds[i].innerHTML)) {
            return false;
          }

          embedCount++;
        }

        var linkDensity = this._getLinkDensity(node);
        var contentLength = this._getInnerText(node).length;

        var haveToRemove =
          (img > 1 && p / img < 0.5 && !this._hasAncestorTag(node, "figure")) ||
          (!isList && li > p) ||
          (input > Math.floor(p/3)) ||
          (!isList && headingDensity < 0.9 && contentLength < 25 && (img === 0 || img > 2) && !this._hasAncestorTag(node, "figure")) ||
          (!isList && weight < 25 && linkDensity > 0.2) ||
          (weight >= 25 && linkDensity > 0.5) ||
          ((embedCount === 1 && contentLength < 75) || embedCount > 1);
        return haveToRemove;
      }
      return false;
    });
  },

  /**
   * Clean out elements that match the specified conditions
   *
   * @param Element
   * @param Function determines whether a node should be removed
   * @return void
   **/
  _cleanMatchedNodes: function(e, filter) {
    var endOfSearchMarkerNode = this._getNextNode(e, true);
    var next = this._getNextNode(e);
    while (next && next != endOfSearchMarkerNode) {
      if (filter.call(this, next, next.className + " " + next.id)) {
        next = this._removeAndGetNext(next);
      } else {
        next = this._getNextNode(next);
      }
    }
  },

  /**
   * Clean out spurious headers from an Element.
   *
   * @param Element
   * @return void
  **/
  _cleanHeaders: function(e) {
    let headingNodes = this._getAllNodesWithTag(e, ["h1", "h2"]);
    this._removeNodes(headingNodes, function(node) {
      let shouldRemove = this._getClassWeight(node) < 0;
      if (shouldRemove) {
        this.log("Removing header with low class weight:", node);
      }
      return shouldRemove;
    });
  },

  /**
   * Check if this node is an H1 or H2 element whose content is mostly
   * the same as the article title.
   *
   * @param Element  the node to check.
   * @return boolean indicating whether this is a title-like header.
   */
  _headerDuplicatesTitle: function(node) {
    if (node.tagName != "H1" && node.tagName != "H2") {
      return false;
    }
    var heading = this._getInnerText(node, false);
    this.log("Evaluating similarity of header:", heading, this._articleTitle);
    return this._textSimilarity(this._articleTitle, heading) > 0.75;
  },

  _flagIsActive: function(flag) {
    return (this._flags & flag) > 0;
  },

  _removeFlag: function(flag) {
    this._flags = this._flags & ~flag;
  },

  _isProbablyVisible: function(node) {
    // Have to null-check node.style and node.className.indexOf to deal with SVG and MathML nodes.
    return (!node.style || node.style.display != "none")
      && !node.hasAttribute("hidden")
      //check for "fallback-image" so that wikimedia math images are displayed
      && (!node.hasAttribute("aria-hidden") || node.getAttribute("aria-hidden") != "true" || (node.className && node.className.indexOf && node.className.indexOf("fallback-image") !== -1));
  },

  /**
   * Runs readability.
   *
   * Workflow:
   *  1. Prep the document by removing script tags, css, etc.
   *  2. Build readability's DOM tree.
   *  3. Grab the article content from the current dom tree.
   *  4. Replace the current DOM tree with the new one.
   *  5. Read peacefully.
   *
   * @return void
   **/
  parse: function () {
    // Avoid parsing too large documents, as per configuration option
    if (this._maxElemsToParse > 0) {
      var numTags = this._doc.getElementsByTagName("*").length;
      if (numTags > this._maxElemsToParse) {
        throw new Error("Aborting parsing document; " + numTags + " elements found");
      }
    }

    // Unwrap image from noscript
    this._unwrapNoscriptImages(this._doc);

    // Extract JSON-LD metadata before removing scripts
    var jsonLd = this._disableJSONLD ? {} : this._getJSONLD(this._doc);

    // Remove script tags from the document.
    this._removeScripts(this._doc);

    this._prepDocument();

    var metadata = this._getArticleMetadata(jsonLd);
    this._articleTitle = metadata.title;

    var articleContent = this._grabArticle();
    if (!articleContent)
      return null;

    this.log("Grabbed: " + articleContent.innerHTML);

    this._postProcessContent(articleContent);

    // If we haven't found an excerpt in the article's metadata, use the article's
    // first paragraph as the excerpt. This is used for displaying a preview of
    // the article's content.
    if (!metadata.excerpt) {
      var paragraphs = articleContent.getElementsByTagName("p");
      if (paragraphs.length > 0) {
        metadata.excerpt = paragraphs[0].textContent.trim();
      }
    }

    var textContent = articleContent.textContent;
    return {
      title: this._articleTitle,
      byline: metadata.byline || this._articleByline,
      dir: this._articleDir,
      lang: this._articleLang,
      content: this._serializer(articleContent),
      textContent: textContent,
      length: textContent.length,
      excerpt: metadata.excerpt,
      siteName: metadata.siteName || this._articleSiteName
    };
  }
};

if (true) {
  module.exports = Readability;
}


/***/ }),

/***/ "./node_modules/@mozilla/readability/index.js":
/*!****************************************************!*\
  !*** ./node_modules/@mozilla/readability/index.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Readability = __webpack_require__(/*! ./Readability */ "./node_modules/@mozilla/readability/Readability.js");
var isProbablyReaderable = __webpack_require__(/*! ./Readability-readerable */ "./node_modules/@mozilla/readability/Readability-readerable.js");

module.exports = {
  Readability: Readability,
  isProbablyReaderable: isProbablyReaderable
};


/***/ }),

/***/ "./node_modules/webextension-polyfill/dist/browser-polyfill.js":
/*!*********************************************************************!*\
  !*** ./node_modules/webextension-polyfill/dist/browser-polyfill.js ***!
  \*********************************************************************/
/***/ (function(module, exports) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (global, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [module], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var mod; }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function (module) {
  /* webextension-polyfill - v0.9.0 - Fri Mar 25 2022 17:00:23 */

  /* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */

  /* vim: set sts=2 sw=2 et tw=80: */

  /* This Source Code Form is subject to the terms of the Mozilla Public
   * License, v. 2.0. If a copy of the MPL was not distributed with this
   * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
  "use strict";

  if (typeof globalThis != "object" || typeof chrome != "object" || !chrome || !chrome.runtime || !chrome.runtime.id) {
    throw new Error("This script should only be loaded in a browser extension.");
  }

  if (typeof globalThis.browser === "undefined" || Object.getPrototypeOf(globalThis.browser) !== Object.prototype) {
    const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE = "The message port closed before a response was received.";
    const SEND_RESPONSE_DEPRECATION_WARNING = "Returning a Promise is the preferred way to send a reply from an onMessage/onMessageExternal listener, as the sendResponse will be removed from the specs (See https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage)"; // Wrapping the bulk of this polyfill in a one-time-use function is a minor
    // optimization for Firefox. Since Spidermonkey does not fully parse the
    // contents of a function until the first time it's called, and since it will
    // never actually need to be called, this allows the polyfill to be included
    // in Firefox nearly for free.

    const wrapAPIs = extensionAPIs => {
      // NOTE: apiMetadata is associated to the content of the api-metadata.json file
      // at build time by replacing the following "include" with the content of the
      // JSON file.
      const apiMetadata = {
        "alarms": {
          "clear": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "clearAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "get": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "getAll": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "bookmarks": {
          "create": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "get": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getChildren": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getRecent": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getSubTree": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getTree": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "move": {
            "minArgs": 2,
            "maxArgs": 2
          },
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeTree": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "search": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "update": {
            "minArgs": 2,
            "maxArgs": 2
          }
        },
        "browserAction": {
          "disable": {
            "minArgs": 0,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "enable": {
            "minArgs": 0,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "getBadgeBackgroundColor": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getBadgeText": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getPopup": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getTitle": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "openPopup": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "setBadgeBackgroundColor": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "setBadgeText": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "setIcon": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "setPopup": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "setTitle": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          }
        },
        "browsingData": {
          "remove": {
            "minArgs": 2,
            "maxArgs": 2
          },
          "removeCache": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeCookies": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeDownloads": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeFormData": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeHistory": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeLocalStorage": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removePasswords": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removePluginData": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "settings": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "commands": {
          "getAll": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "contextMenus": {
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "update": {
            "minArgs": 2,
            "maxArgs": 2
          }
        },
        "cookies": {
          "get": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getAll": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getAllCookieStores": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "set": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "devtools": {
          "inspectedWindow": {
            "eval": {
              "minArgs": 1,
              "maxArgs": 2,
              "singleCallbackArg": false
            }
          },
          "panels": {
            "create": {
              "minArgs": 3,
              "maxArgs": 3,
              "singleCallbackArg": true
            },
            "elements": {
              "createSidebarPane": {
                "minArgs": 1,
                "maxArgs": 1
              }
            }
          }
        },
        "downloads": {
          "cancel": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "download": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "erase": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getFileIcon": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "open": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "pause": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeFile": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "resume": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "search": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "show": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          }
        },
        "extension": {
          "isAllowedFileSchemeAccess": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "isAllowedIncognitoAccess": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "history": {
          "addUrl": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "deleteAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "deleteRange": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "deleteUrl": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getVisits": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "search": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "i18n": {
          "detectLanguage": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getAcceptLanguages": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "identity": {
          "launchWebAuthFlow": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "idle": {
          "queryState": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "management": {
          "get": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "getSelf": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "setEnabled": {
            "minArgs": 2,
            "maxArgs": 2
          },
          "uninstallSelf": {
            "minArgs": 0,
            "maxArgs": 1
          }
        },
        "notifications": {
          "clear": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "create": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "getAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "getPermissionLevel": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "update": {
            "minArgs": 2,
            "maxArgs": 2
          }
        },
        "pageAction": {
          "getPopup": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getTitle": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "hide": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "setIcon": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "setPopup": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "setTitle": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "show": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          }
        },
        "permissions": {
          "contains": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "request": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "runtime": {
          "getBackgroundPage": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "getPlatformInfo": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "openOptionsPage": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "requestUpdateCheck": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "sendMessage": {
            "minArgs": 1,
            "maxArgs": 3
          },
          "sendNativeMessage": {
            "minArgs": 2,
            "maxArgs": 2
          },
          "setUninstallURL": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "sessions": {
          "getDevices": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "getRecentlyClosed": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "restore": {
            "minArgs": 0,
            "maxArgs": 1
          }
        },
        "storage": {
          "local": {
            "clear": {
              "minArgs": 0,
              "maxArgs": 0
            },
            "get": {
              "minArgs": 0,
              "maxArgs": 1
            },
            "getBytesInUse": {
              "minArgs": 0,
              "maxArgs": 1
            },
            "remove": {
              "minArgs": 1,
              "maxArgs": 1
            },
            "set": {
              "minArgs": 1,
              "maxArgs": 1
            }
          },
          "managed": {
            "get": {
              "minArgs": 0,
              "maxArgs": 1
            },
            "getBytesInUse": {
              "minArgs": 0,
              "maxArgs": 1
            }
          },
          "sync": {
            "clear": {
              "minArgs": 0,
              "maxArgs": 0
            },
            "get": {
              "minArgs": 0,
              "maxArgs": 1
            },
            "getBytesInUse": {
              "minArgs": 0,
              "maxArgs": 1
            },
            "remove": {
              "minArgs": 1,
              "maxArgs": 1
            },
            "set": {
              "minArgs": 1,
              "maxArgs": 1
            }
          }
        },
        "tabs": {
          "captureVisibleTab": {
            "minArgs": 0,
            "maxArgs": 2
          },
          "create": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "detectLanguage": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "discard": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "duplicate": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "executeScript": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "get": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getCurrent": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "getZoom": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "getZoomSettings": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "goBack": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "goForward": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "highlight": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "insertCSS": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "move": {
            "minArgs": 2,
            "maxArgs": 2
          },
          "query": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "reload": {
            "minArgs": 0,
            "maxArgs": 2
          },
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeCSS": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "sendMessage": {
            "minArgs": 2,
            "maxArgs": 3
          },
          "setZoom": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "setZoomSettings": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "update": {
            "minArgs": 1,
            "maxArgs": 2
          }
        },
        "topSites": {
          "get": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "webNavigation": {
          "getAllFrames": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getFrame": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "webRequest": {
          "handlerBehaviorChanged": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "windows": {
          "create": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "get": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "getAll": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "getCurrent": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "getLastFocused": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "update": {
            "minArgs": 2,
            "maxArgs": 2
          }
        }
      };

      if (Object.keys(apiMetadata).length === 0) {
        throw new Error("api-metadata.json has not been included in browser-polyfill");
      }
      /**
       * A WeakMap subclass which creates and stores a value for any key which does
       * not exist when accessed, but behaves exactly as an ordinary WeakMap
       * otherwise.
       *
       * @param {function} createItem
       *        A function which will be called in order to create the value for any
       *        key which does not exist, the first time it is accessed. The
       *        function receives, as its only argument, the key being created.
       */


      class DefaultWeakMap extends WeakMap {
        constructor(createItem, items = undefined) {
          super(items);
          this.createItem = createItem;
        }

        get(key) {
          if (!this.has(key)) {
            this.set(key, this.createItem(key));
          }

          return super.get(key);
        }

      }
      /**
       * Returns true if the given object is an object with a `then` method, and can
       * therefore be assumed to behave as a Promise.
       *
       * @param {*} value The value to test.
       * @returns {boolean} True if the value is thenable.
       */


      const isThenable = value => {
        return value && typeof value === "object" && typeof value.then === "function";
      };
      /**
       * Creates and returns a function which, when called, will resolve or reject
       * the given promise based on how it is called:
       *
       * - If, when called, `chrome.runtime.lastError` contains a non-null object,
       *   the promise is rejected with that value.
       * - If the function is called with exactly one argument, the promise is
       *   resolved to that value.
       * - Otherwise, the promise is resolved to an array containing all of the
       *   function's arguments.
       *
       * @param {object} promise
       *        An object containing the resolution and rejection functions of a
       *        promise.
       * @param {function} promise.resolve
       *        The promise's resolution function.
       * @param {function} promise.reject
       *        The promise's rejection function.
       * @param {object} metadata
       *        Metadata about the wrapped method which has created the callback.
       * @param {boolean} metadata.singleCallbackArg
       *        Whether or not the promise is resolved with only the first
       *        argument of the callback, alternatively an array of all the
       *        callback arguments is resolved. By default, if the callback
       *        function is invoked with only a single argument, that will be
       *        resolved to the promise, while all arguments will be resolved as
       *        an array if multiple are given.
       *
       * @returns {function}
       *        The generated callback function.
       */


      const makeCallback = (promise, metadata) => {
        return (...callbackArgs) => {
          if (extensionAPIs.runtime.lastError) {
            promise.reject(new Error(extensionAPIs.runtime.lastError.message));
          } else if (metadata.singleCallbackArg || callbackArgs.length <= 1 && metadata.singleCallbackArg !== false) {
            promise.resolve(callbackArgs[0]);
          } else {
            promise.resolve(callbackArgs);
          }
        };
      };

      const pluralizeArguments = numArgs => numArgs == 1 ? "argument" : "arguments";
      /**
       * Creates a wrapper function for a method with the given name and metadata.
       *
       * @param {string} name
       *        The name of the method which is being wrapped.
       * @param {object} metadata
       *        Metadata about the method being wrapped.
       * @param {integer} metadata.minArgs
       *        The minimum number of arguments which must be passed to the
       *        function. If called with fewer than this number of arguments, the
       *        wrapper will raise an exception.
       * @param {integer} metadata.maxArgs
       *        The maximum number of arguments which may be passed to the
       *        function. If called with more than this number of arguments, the
       *        wrapper will raise an exception.
       * @param {boolean} metadata.singleCallbackArg
       *        Whether or not the promise is resolved with only the first
       *        argument of the callback, alternatively an array of all the
       *        callback arguments is resolved. By default, if the callback
       *        function is invoked with only a single argument, that will be
       *        resolved to the promise, while all arguments will be resolved as
       *        an array if multiple are given.
       *
       * @returns {function(object, ...*)}
       *       The generated wrapper function.
       */


      const wrapAsyncFunction = (name, metadata) => {
        return function asyncFunctionWrapper(target, ...args) {
          if (args.length < metadata.minArgs) {
            throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
          }

          if (args.length > metadata.maxArgs) {
            throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
          }

          return new Promise((resolve, reject) => {
            if (metadata.fallbackToNoCallback) {
              // This API method has currently no callback on Chrome, but it return a promise on Firefox,
              // and so the polyfill will try to call it with a callback first, and it will fallback
              // to not passing the callback if the first call fails.
              try {
                target[name](...args, makeCallback({
                  resolve,
                  reject
                }, metadata));
              } catch (cbError) {
                console.warn(`${name} API method doesn't seem to support the callback parameter, ` + "falling back to call it without a callback: ", cbError);
                target[name](...args); // Update the API method metadata, so that the next API calls will not try to
                // use the unsupported callback anymore.

                metadata.fallbackToNoCallback = false;
                metadata.noCallback = true;
                resolve();
              }
            } else if (metadata.noCallback) {
              target[name](...args);
              resolve();
            } else {
              target[name](...args, makeCallback({
                resolve,
                reject
              }, metadata));
            }
          });
        };
      };
      /**
       * Wraps an existing method of the target object, so that calls to it are
       * intercepted by the given wrapper function. The wrapper function receives,
       * as its first argument, the original `target` object, followed by each of
       * the arguments passed to the original method.
       *
       * @param {object} target
       *        The original target object that the wrapped method belongs to.
       * @param {function} method
       *        The method being wrapped. This is used as the target of the Proxy
       *        object which is created to wrap the method.
       * @param {function} wrapper
       *        The wrapper function which is called in place of a direct invocation
       *        of the wrapped method.
       *
       * @returns {Proxy<function>}
       *        A Proxy object for the given method, which invokes the given wrapper
       *        method in its place.
       */


      const wrapMethod = (target, method, wrapper) => {
        return new Proxy(method, {
          apply(targetMethod, thisObj, args) {
            return wrapper.call(thisObj, target, ...args);
          }

        });
      };

      let hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
      /**
       * Wraps an object in a Proxy which intercepts and wraps certain methods
       * based on the given `wrappers` and `metadata` objects.
       *
       * @param {object} target
       *        The target object to wrap.
       *
       * @param {object} [wrappers = {}]
       *        An object tree containing wrapper functions for special cases. Any
       *        function present in this object tree is called in place of the
       *        method in the same location in the `target` object tree. These
       *        wrapper methods are invoked as described in {@see wrapMethod}.
       *
       * @param {object} [metadata = {}]
       *        An object tree containing metadata used to automatically generate
       *        Promise-based wrapper functions for asynchronous. Any function in
       *        the `target` object tree which has a corresponding metadata object
       *        in the same location in the `metadata` tree is replaced with an
       *        automatically-generated wrapper function, as described in
       *        {@see wrapAsyncFunction}
       *
       * @returns {Proxy<object>}
       */

      const wrapObject = (target, wrappers = {}, metadata = {}) => {
        let cache = Object.create(null);
        let handlers = {
          has(proxyTarget, prop) {
            return prop in target || prop in cache;
          },

          get(proxyTarget, prop, receiver) {
            if (prop in cache) {
              return cache[prop];
            }

            if (!(prop in target)) {
              return undefined;
            }

            let value = target[prop];

            if (typeof value === "function") {
              // This is a method on the underlying object. Check if we need to do
              // any wrapping.
              if (typeof wrappers[prop] === "function") {
                // We have a special-case wrapper for this method.
                value = wrapMethod(target, target[prop], wrappers[prop]);
              } else if (hasOwnProperty(metadata, prop)) {
                // This is an async method that we have metadata for. Create a
                // Promise wrapper for it.
                let wrapper = wrapAsyncFunction(prop, metadata[prop]);
                value = wrapMethod(target, target[prop], wrapper);
              } else {
                // This is a method that we don't know or care about. Return the
                // original method, bound to the underlying object.
                value = value.bind(target);
              }
            } else if (typeof value === "object" && value !== null && (hasOwnProperty(wrappers, prop) || hasOwnProperty(metadata, prop))) {
              // This is an object that we need to do some wrapping for the children
              // of. Create a sub-object wrapper for it with the appropriate child
              // metadata.
              value = wrapObject(value, wrappers[prop], metadata[prop]);
            } else if (hasOwnProperty(metadata, "*")) {
              // Wrap all properties in * namespace.
              value = wrapObject(value, wrappers[prop], metadata["*"]);
            } else {
              // We don't need to do any wrapping for this property,
              // so just forward all access to the underlying object.
              Object.defineProperty(cache, prop, {
                configurable: true,
                enumerable: true,

                get() {
                  return target[prop];
                },

                set(value) {
                  target[prop] = value;
                }

              });
              return value;
            }

            cache[prop] = value;
            return value;
          },

          set(proxyTarget, prop, value, receiver) {
            if (prop in cache) {
              cache[prop] = value;
            } else {
              target[prop] = value;
            }

            return true;
          },

          defineProperty(proxyTarget, prop, desc) {
            return Reflect.defineProperty(cache, prop, desc);
          },

          deleteProperty(proxyTarget, prop) {
            return Reflect.deleteProperty(cache, prop);
          }

        }; // Per contract of the Proxy API, the "get" proxy handler must return the
        // original value of the target if that value is declared read-only and
        // non-configurable. For this reason, we create an object with the
        // prototype set to `target` instead of using `target` directly.
        // Otherwise we cannot return a custom object for APIs that
        // are declared read-only and non-configurable, such as `chrome.devtools`.
        //
        // The proxy handlers themselves will still use the original `target`
        // instead of the `proxyTarget`, so that the methods and properties are
        // dereferenced via the original targets.

        let proxyTarget = Object.create(target);
        return new Proxy(proxyTarget, handlers);
      };
      /**
       * Creates a set of wrapper functions for an event object, which handles
       * wrapping of listener functions that those messages are passed.
       *
       * A single wrapper is created for each listener function, and stored in a
       * map. Subsequent calls to `addListener`, `hasListener`, or `removeListener`
       * retrieve the original wrapper, so that  attempts to remove a
       * previously-added listener work as expected.
       *
       * @param {DefaultWeakMap<function, function>} wrapperMap
       *        A DefaultWeakMap object which will create the appropriate wrapper
       *        for a given listener function when one does not exist, and retrieve
       *        an existing one when it does.
       *
       * @returns {object}
       */


      const wrapEvent = wrapperMap => ({
        addListener(target, listener, ...args) {
          target.addListener(wrapperMap.get(listener), ...args);
        },

        hasListener(target, listener) {
          return target.hasListener(wrapperMap.get(listener));
        },

        removeListener(target, listener) {
          target.removeListener(wrapperMap.get(listener));
        }

      });

      const onRequestFinishedWrappers = new DefaultWeakMap(listener => {
        if (typeof listener !== "function") {
          return listener;
        }
        /**
         * Wraps an onRequestFinished listener function so that it will return a
         * `getContent()` property which returns a `Promise` rather than using a
         * callback API.
         *
         * @param {object} req
         *        The HAR entry object representing the network request.
         */


        return function onRequestFinished(req) {
          const wrappedReq = wrapObject(req, {}
          /* wrappers */
          , {
            getContent: {
              minArgs: 0,
              maxArgs: 0
            }
          });
          listener(wrappedReq);
        };
      }); // Keep track if the deprecation warning has been logged at least once.

      let loggedSendResponseDeprecationWarning = false;
      const onMessageWrappers = new DefaultWeakMap(listener => {
        if (typeof listener !== "function") {
          return listener;
        }
        /**
         * Wraps a message listener function so that it may send responses based on
         * its return value, rather than by returning a sentinel value and calling a
         * callback. If the listener function returns a Promise, the response is
         * sent when the promise either resolves or rejects.
         *
         * @param {*} message
         *        The message sent by the other end of the channel.
         * @param {object} sender
         *        Details about the sender of the message.
         * @param {function(*)} sendResponse
         *        A callback which, when called with an arbitrary argument, sends
         *        that value as a response.
         * @returns {boolean}
         *        True if the wrapped listener returned a Promise, which will later
         *        yield a response. False otherwise.
         */


        return function onMessage(message, sender, sendResponse) {
          let didCallSendResponse = false;
          let wrappedSendResponse;
          let sendResponsePromise = new Promise(resolve => {
            wrappedSendResponse = function (response) {
              if (!loggedSendResponseDeprecationWarning) {
                console.warn(SEND_RESPONSE_DEPRECATION_WARNING, new Error().stack);
                loggedSendResponseDeprecationWarning = true;
              }

              didCallSendResponse = true;
              resolve(response);
            };
          });
          let result;

          try {
            result = listener(message, sender, wrappedSendResponse);
          } catch (err) {
            result = Promise.reject(err);
          }

          const isResultThenable = result !== true && isThenable(result); // If the listener didn't returned true or a Promise, or called
          // wrappedSendResponse synchronously, we can exit earlier
          // because there will be no response sent from this listener.

          if (result !== true && !isResultThenable && !didCallSendResponse) {
            return false;
          } // A small helper to send the message if the promise resolves
          // and an error if the promise rejects (a wrapped sendMessage has
          // to translate the message into a resolved promise or a rejected
          // promise).


          const sendPromisedResult = promise => {
            promise.then(msg => {
              // send the message value.
              sendResponse(msg);
            }, error => {
              // Send a JSON representation of the error if the rejected value
              // is an instance of error, or the object itself otherwise.
              let message;

              if (error && (error instanceof Error || typeof error.message === "string")) {
                message = error.message;
              } else {
                message = "An unexpected error occurred";
              }

              sendResponse({
                __mozWebExtensionPolyfillReject__: true,
                message
              });
            }).catch(err => {
              // Print an error on the console if unable to send the response.
              console.error("Failed to send onMessage rejected reply", err);
            });
          }; // If the listener returned a Promise, send the resolved value as a
          // result, otherwise wait the promise related to the wrappedSendResponse
          // callback to resolve and send it as a response.


          if (isResultThenable) {
            sendPromisedResult(result);
          } else {
            sendPromisedResult(sendResponsePromise);
          } // Let Chrome know that the listener is replying.


          return true;
        };
      });

      const wrappedSendMessageCallback = ({
        reject,
        resolve
      }, reply) => {
        if (extensionAPIs.runtime.lastError) {
          // Detect when none of the listeners replied to the sendMessage call and resolve
          // the promise to undefined as in Firefox.
          // See https://github.com/mozilla/webextension-polyfill/issues/130
          if (extensionAPIs.runtime.lastError.message === CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE) {
            resolve();
          } else {
            reject(new Error(extensionAPIs.runtime.lastError.message));
          }
        } else if (reply && reply.__mozWebExtensionPolyfillReject__) {
          // Convert back the JSON representation of the error into
          // an Error instance.
          reject(new Error(reply.message));
        } else {
          resolve(reply);
        }
      };

      const wrappedSendMessage = (name, metadata, apiNamespaceObj, ...args) => {
        if (args.length < metadata.minArgs) {
          throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
        }

        if (args.length > metadata.maxArgs) {
          throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
        }

        return new Promise((resolve, reject) => {
          const wrappedCb = wrappedSendMessageCallback.bind(null, {
            resolve,
            reject
          });
          args.push(wrappedCb);
          apiNamespaceObj.sendMessage(...args);
        });
      };

      const staticWrappers = {
        devtools: {
          network: {
            onRequestFinished: wrapEvent(onRequestFinishedWrappers)
          }
        },
        runtime: {
          onMessage: wrapEvent(onMessageWrappers),
          onMessageExternal: wrapEvent(onMessageWrappers),
          sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
            minArgs: 1,
            maxArgs: 3
          })
        },
        tabs: {
          sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
            minArgs: 2,
            maxArgs: 3
          })
        }
      };
      const settingMetadata = {
        clear: {
          minArgs: 1,
          maxArgs: 1
        },
        get: {
          minArgs: 1,
          maxArgs: 1
        },
        set: {
          minArgs: 1,
          maxArgs: 1
        }
      };
      apiMetadata.privacy = {
        network: {
          "*": settingMetadata
        },
        services: {
          "*": settingMetadata
        },
        websites: {
          "*": settingMetadata
        }
      };
      return wrapObject(extensionAPIs, staticWrappers, apiMetadata);
    }; // The build process adds a UMD wrapper around this file, which makes the
    // `module` variable available.


    module.exports = wrapAPIs(chrome);
  } else {
    module.exports = globalThis.browser;
  }
});
//# sourceMappingURL=browser-polyfill.js.map


/***/ }),

/***/ "./scripts/actions.js":
/*!****************************!*\
  !*** ./scripts/actions.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "messageActions": () => (/* binding */ messageActions),
/* harmony export */   "parseDocument": () => (/* binding */ parseDocument)
/* harmony export */ });
/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! webextension-polyfill */ "./node_modules/webextension-polyfill/dist/browser-polyfill.js");
/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__);


const messageActions = createConstantObject('PARSE_DOCUMENT');

async function parseDocument(tabId) {
  return sendAction(tabId, messageActions.PARSE_DOCUMENT);
}

async function sendAction(tabId, action) {
  try {
    return await webextension_polyfill__WEBPACK_IMPORTED_MODULE_0___default().tabs.sendMessage(tabId, { action });
  } catch (err) {
    throw new Error(`send action (action=${action}): ${err}`);
  }
}

function createConstantObject(...names) {
  const constants = {};

  for (const name of names)
    constants[name] = name;

  return Object.freeze(constants);
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!****************************!*\
  !*** ./scripts/content.js ***!
  \****************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! webextension-polyfill */ "./node_modules/webextension-polyfill/dist/browser-polyfill.js");
/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mozilla_readability__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mozilla/readability */ "./node_modules/@mozilla/readability/index.js");
/* harmony import */ var _mozilla_readability__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mozilla_readability__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _actions__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./actions */ "./scripts/actions.js");




webextension_polyfill__WEBPACK_IMPORTED_MODULE_0___default().runtime.onMessage.addListener(onMessage);

async function onMessage({ action }, sender, sendResponse) {
  if (action !== _actions__WEBPACK_IMPORTED_MODULE_2__.messageActions.PARSE_DOCUMENT)
    throw new Error(`unknown action: ${action}`);

  const readability = new _mozilla_readability__WEBPACK_IMPORTED_MODULE_1__.Readability(document.cloneNode(true));
  const data = readability.parse();

  return data;
}

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTCxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7O0FBRUE7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBOztBQUVBLHdDQUF3QyxNQUFNO0FBQzlDO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLEtBQUs7QUFDTCxHQUFHOztBQUVIO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBLDBCQUEwQiw0QkFBNEI7QUFDdEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsTUFBTSxXQUFXOztBQUVqQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPOztBQUVQO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxvQkFBb0IsNEJBQTRCO0FBQ2hEO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCOztBQUV4QjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esc0JBQXNCLDJCQUEyQjtBQUNqRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0Esd0JBQXdCLCtCQUErQjtBQUN2RDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEtBQUs7QUFDTCxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTCxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTCxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0Esb0JBQW9CLDJDQUEyQztBQUMvRDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVB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QUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtB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QUFFOUMsMEJBQTBCLDZEQUFXO0FBQ3JDOztBQUVBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9icm93c2VyLWV4dGVuc2lvbi8uL25vZGVfbW9kdWxlcy9AbW96aWxsYS9yZWFkYWJpbGl0eS9SZWFkYWJpbGl0eS1yZWFkZXJhYmxlLmpzIiwid2VicGFjazovL2Jyb3dzZXItZXh0ZW5zaW9uLy4vbm9kZV9tb2R1bGVzL0Btb3ppbGxhL3JlYWRhYmlsaXR5L1JlYWRhYmlsaXR5LmpzIiwid2VicGFjazovL2Jyb3dzZXItZXh0ZW5zaW9uLy4vbm9kZV9tb2R1bGVzL0Btb3ppbGxhL3JlYWRhYmlsaXR5L2luZGV4LmpzIiwid2VicGFjazovL2Jyb3dzZXItZXh0ZW5zaW9uLy4vbm9kZV9tb2R1bGVzL3dlYmV4dGVuc2lvbi1wb2x5ZmlsbC9kaXN0L2Jyb3dzZXItcG9seWZpbGwuanMiLCJ3ZWJwYWNrOi8vYnJvd3Nlci1leHRlbnNpb24vLi9zY3JpcHRzL2FjdGlvbnMuanMiLCJ3ZWJwYWNrOi8vYnJvd3Nlci1leHRlbnNpb24vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vYnJvd3Nlci1leHRlbnNpb24vd2VicGFjay9ydW50aW1lL2NvbXBhdCBnZXQgZGVmYXVsdCBleHBvcnQiLCJ3ZWJwYWNrOi8vYnJvd3Nlci1leHRlbnNpb24vd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL2Jyb3dzZXItZXh0ZW5zaW9uL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vYnJvd3Nlci1leHRlbnNpb24vd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9icm93c2VyLWV4dGVuc2lvbi8uL3NjcmlwdHMvY29udGVudC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZW52IGVzNjpmYWxzZSAqL1xuLypcbiAqIENvcHlyaWdodCAoYykgMjAxMCBBcmM5MCBJbmNcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuLypcbiAqIFRoaXMgY29kZSBpcyBoZWF2aWx5IGJhc2VkIG9uIEFyYzkwJ3MgcmVhZGFiaWxpdHkuanMgKDEuNy4xKSBzY3JpcHRcbiAqIGF2YWlsYWJsZSBhdDogaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2FyYzkwbGFicy1yZWFkYWJpbGl0eVxuICovXG5cbnZhciBSRUdFWFBTID0ge1xuICAvLyBOT1RFOiBUaGVzZSB0d28gcmVndWxhciBleHByZXNzaW9ucyBhcmUgZHVwbGljYXRlZCBpblxuICAvLyBSZWFkYWJpbGl0eS5qcy4gUGxlYXNlIGtlZXAgYm90aCBjb3BpZXMgaW4gc3luYy5cbiAgdW5saWtlbHlDYW5kaWRhdGVzOiAvLWFkLXxhaTJodG1sfGJhbm5lcnxicmVhZGNydW1ic3xjb21ieHxjb21tZW50fGNvbW11bml0eXxjb3Zlci13cmFwfGRpc3F1c3xleHRyYXxmb290ZXJ8Z2RwcnxoZWFkZXJ8bGVnZW5kc3xtZW51fHJlbGF0ZWR8cmVtYXJrfHJlcGxpZXN8cnNzfHNob3V0Ym94fHNpZGViYXJ8c2t5c2NyYXBlcnxzb2NpYWx8c3BvbnNvcnxzdXBwbGVtZW50YWx8YWQtYnJlYWt8YWdlZ2F0ZXxwYWdpbmF0aW9ufHBhZ2VyfHBvcHVwfHlvbS1yZW1vdGUvaSxcbiAgb2tNYXliZUl0c0FDYW5kaWRhdGU6IC9hbmR8YXJ0aWNsZXxib2R5fGNvbHVtbnxjb250ZW50fG1haW58c2hhZG93L2ksXG59O1xuXG5mdW5jdGlvbiBpc05vZGVWaXNpYmxlKG5vZGUpIHtcbiAgLy8gSGF2ZSB0byBudWxsLWNoZWNrIG5vZGUuc3R5bGUgYW5kIG5vZGUuY2xhc3NOYW1lLmluZGV4T2YgdG8gZGVhbCB3aXRoIFNWRyBhbmQgTWF0aE1MIG5vZGVzLlxuICByZXR1cm4gKCFub2RlLnN0eWxlIHx8IG5vZGUuc3R5bGUuZGlzcGxheSAhPSBcIm5vbmVcIilcbiAgICAmJiAhbm9kZS5oYXNBdHRyaWJ1dGUoXCJoaWRkZW5cIilcbiAgICAvL2NoZWNrIGZvciBcImZhbGxiYWNrLWltYWdlXCIgc28gdGhhdCB3aWtpbWVkaWEgbWF0aCBpbWFnZXMgYXJlIGRpc3BsYXllZFxuICAgICYmICghbm9kZS5oYXNBdHRyaWJ1dGUoXCJhcmlhLWhpZGRlblwiKSB8fCBub2RlLmdldEF0dHJpYnV0ZShcImFyaWEtaGlkZGVuXCIpICE9IFwidHJ1ZVwiIHx8IChub2RlLmNsYXNzTmFtZSAmJiBub2RlLmNsYXNzTmFtZS5pbmRleE9mICYmIG5vZGUuY2xhc3NOYW1lLmluZGV4T2YoXCJmYWxsYmFjay1pbWFnZVwiKSAhPT0gLTEpKTtcbn1cblxuLyoqXG4gKiBEZWNpZGVzIHdoZXRoZXIgb3Igbm90IHRoZSBkb2N1bWVudCBpcyByZWFkZXItYWJsZSB3aXRob3V0IHBhcnNpbmcgdGhlIHdob2xlIHRoaW5nLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQ29uZmlndXJhdGlvbiBvYmplY3QuXG4gKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWluQ29udGVudExlbmd0aD0xNDBdIFRoZSBtaW5pbXVtIG5vZGUgY29udGVudCBsZW5ndGggdXNlZCB0byBkZWNpZGUgaWYgdGhlIGRvY3VtZW50IGlzIHJlYWRlcmFibGUuXG4gKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWluU2NvcmU9MjBdIFRoZSBtaW51bXVtIGN1bXVsYXRlZCAnc2NvcmUnIHVzZWQgdG8gZGV0ZXJtaW5lIGlmIHRoZSBkb2N1bWVudCBpcyByZWFkZXJhYmxlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW29wdGlvbnMudmlzaWJpbGl0eUNoZWNrZXI9aXNOb2RlVmlzaWJsZV0gVGhlIGZ1bmN0aW9uIHVzZWQgdG8gZGV0ZXJtaW5lIGlmIGEgbm9kZSBpcyB2aXNpYmxlLlxuICogQHJldHVybiB7Ym9vbGVhbn0gV2hldGhlciBvciBub3Qgd2Ugc3VzcGVjdCBSZWFkYWJpbGl0eS5wYXJzZSgpIHdpbGwgc3VjZWVlZCBhdCByZXR1cm5pbmcgYW4gYXJ0aWNsZSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIGlzUHJvYmFibHlSZWFkZXJhYmxlKGRvYywgb3B0aW9ucyA9IHt9KSB7XG4gIC8vIEZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IHJlYXNvbnMgJ29wdGlvbnMnIGNhbiBlaXRoZXIgYmUgYSBjb25maWd1cmF0aW9uIG9iamVjdCBvciB0aGUgZnVuY3Rpb24gdXNlZFxuICAvLyB0byBkZXRlcm1pbmUgaWYgYSBub2RlIGlzIHZpc2libGUuXG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBvcHRpb25zID0geyB2aXNpYmlsaXR5Q2hlY2tlcjogb3B0aW9ucyB9O1xuICB9XG5cbiAgdmFyIGRlZmF1bHRPcHRpb25zID0geyBtaW5TY29yZTogMjAsIG1pbkNvbnRlbnRMZW5ndGg6IDE0MCwgdmlzaWJpbGl0eUNoZWNrZXI6IGlzTm9kZVZpc2libGUgfTtcbiAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpO1xuXG4gIHZhciBub2RlcyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsKFwicCwgcHJlLCBhcnRpY2xlXCIpO1xuXG4gIC8vIEdldCA8ZGl2PiBub2RlcyB3aGljaCBoYXZlIDxicj4gbm9kZShzKSBhbmQgYXBwZW5kIHRoZW0gaW50byB0aGUgYG5vZGVzYCB2YXJpYWJsZS5cbiAgLy8gU29tZSBhcnRpY2xlcycgRE9NIHN0cnVjdHVyZXMgbWlnaHQgbG9vayBsaWtlXG4gIC8vIDxkaXY+XG4gIC8vICAgU2VudGVuY2VzPGJyPlxuICAvLyAgIDxicj5cbiAgLy8gICBTZW50ZW5jZXM8YnI+XG4gIC8vIDwvZGl2PlxuICB2YXIgYnJOb2RlcyA9IGRvYy5xdWVyeVNlbGVjdG9yQWxsKFwiZGl2ID4gYnJcIik7XG4gIGlmIChick5vZGVzLmxlbmd0aCkge1xuICAgIHZhciBzZXQgPSBuZXcgU2V0KG5vZGVzKTtcbiAgICBbXS5mb3JFYWNoLmNhbGwoYnJOb2RlcywgZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgIHNldC5hZGQobm9kZS5wYXJlbnROb2RlKTtcbiAgICB9KTtcbiAgICBub2RlcyA9IEFycmF5LmZyb20oc2V0KTtcbiAgfVxuXG4gIHZhciBzY29yZSA9IDA7XG4gIC8vIFRoaXMgaXMgYSBsaXR0bGUgY2hlZWt5LCB3ZSB1c2UgdGhlIGFjY3VtdWxhdG9yICdzY29yZScgdG8gZGVjaWRlIHdoYXQgdG8gcmV0dXJuIGZyb21cbiAgLy8gdGhpcyBjYWxsYmFjazpcbiAgcmV0dXJuIFtdLnNvbWUuY2FsbChub2RlcywgZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAoIW9wdGlvbnMudmlzaWJpbGl0eUNoZWNrZXIobm9kZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgbWF0Y2hTdHJpbmcgPSBub2RlLmNsYXNzTmFtZSArIFwiIFwiICsgbm9kZS5pZDtcbiAgICBpZiAoUkVHRVhQUy51bmxpa2VseUNhbmRpZGF0ZXMudGVzdChtYXRjaFN0cmluZykgJiZcbiAgICAgICAgIVJFR0VYUFMub2tNYXliZUl0c0FDYW5kaWRhdGUudGVzdChtYXRjaFN0cmluZykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAobm9kZS5tYXRjaGVzKFwibGkgcFwiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciB0ZXh0Q29udGVudExlbmd0aCA9IG5vZGUudGV4dENvbnRlbnQudHJpbSgpLmxlbmd0aDtcbiAgICBpZiAodGV4dENvbnRlbnRMZW5ndGggPCBvcHRpb25zLm1pbkNvbnRlbnRMZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBzY29yZSArPSBNYXRoLnNxcnQodGV4dENvbnRlbnRMZW5ndGggLSBvcHRpb25zLm1pbkNvbnRlbnRMZW5ndGgpO1xuXG4gICAgaWYgKHNjb3JlID4gb3B0aW9ucy5taW5TY29yZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gaXNQcm9iYWJseVJlYWRlcmFibGU7XG59XG4iLCIvKmVzbGludC1lbnYgZXM2OmZhbHNlKi9cbi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTAgQXJjOTAgSW5jXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbi8qXG4gKiBUaGlzIGNvZGUgaXMgaGVhdmlseSBiYXNlZCBvbiBBcmM5MCdzIHJlYWRhYmlsaXR5LmpzICgxLjcuMSkgc2NyaXB0XG4gKiBhdmFpbGFibGUgYXQ6IGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9hcmM5MGxhYnMtcmVhZGFiaWxpdHlcbiAqL1xuXG4vKipcbiAqIFB1YmxpYyBjb25zdHJ1Y3Rvci5cbiAqIEBwYXJhbSB7SFRNTERvY3VtZW50fSBkb2MgICAgIFRoZSBkb2N1bWVudCB0byBwYXJzZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSAgICAgICBvcHRpb25zIFRoZSBvcHRpb25zIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gUmVhZGFiaWxpdHkoZG9jLCBvcHRpb25zKSB7XG4gIC8vIEluIHNvbWUgb2xkZXIgdmVyc2lvbnMsIHBlb3BsZSBwYXNzZWQgYSBVUkkgYXMgdGhlIGZpcnN0IGFyZ3VtZW50LiBDb3BlOlxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRvY3VtZW50RWxlbWVudCkge1xuICAgIGRvYyA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IGFyZ3VtZW50c1syXTtcbiAgfSBlbHNlIGlmICghZG9jIHx8ICFkb2MuZG9jdW1lbnRFbGVtZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgdG8gUmVhZGFiaWxpdHkgY29uc3RydWN0b3Igc2hvdWxkIGJlIGEgZG9jdW1lbnQgb2JqZWN0LlwiKTtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB0aGlzLl9kb2MgPSBkb2M7XG4gIHRoaXMuX2RvY0pTRE9NUGFyc2VyID0gdGhpcy5fZG9jLmZpcnN0Q2hpbGQuX19KU0RPTVBhcnNlcl9fO1xuICB0aGlzLl9hcnRpY2xlVGl0bGUgPSBudWxsO1xuICB0aGlzLl9hcnRpY2xlQnlsaW5lID0gbnVsbDtcbiAgdGhpcy5fYXJ0aWNsZURpciA9IG51bGw7XG4gIHRoaXMuX2FydGljbGVTaXRlTmFtZSA9IG51bGw7XG4gIHRoaXMuX2F0dGVtcHRzID0gW107XG5cbiAgLy8gQ29uZmlndXJhYmxlIG9wdGlvbnNcbiAgdGhpcy5fZGVidWcgPSAhIW9wdGlvbnMuZGVidWc7XG4gIHRoaXMuX21heEVsZW1zVG9QYXJzZSA9IG9wdGlvbnMubWF4RWxlbXNUb1BhcnNlIHx8IHRoaXMuREVGQVVMVF9NQVhfRUxFTVNfVE9fUEFSU0U7XG4gIHRoaXMuX25iVG9wQ2FuZGlkYXRlcyA9IG9wdGlvbnMubmJUb3BDYW5kaWRhdGVzIHx8IHRoaXMuREVGQVVMVF9OX1RPUF9DQU5ESURBVEVTO1xuICB0aGlzLl9jaGFyVGhyZXNob2xkID0gb3B0aW9ucy5jaGFyVGhyZXNob2xkIHx8IHRoaXMuREVGQVVMVF9DSEFSX1RIUkVTSE9MRDtcbiAgdGhpcy5fY2xhc3Nlc1RvUHJlc2VydmUgPSB0aGlzLkNMQVNTRVNfVE9fUFJFU0VSVkUuY29uY2F0KG9wdGlvbnMuY2xhc3Nlc1RvUHJlc2VydmUgfHwgW10pO1xuICB0aGlzLl9rZWVwQ2xhc3NlcyA9ICEhb3B0aW9ucy5rZWVwQ2xhc3NlcztcbiAgdGhpcy5fc2VyaWFsaXplciA9IG9wdGlvbnMuc2VyaWFsaXplciB8fCBmdW5jdGlvbihlbCkge1xuICAgIHJldHVybiBlbC5pbm5lckhUTUw7XG4gIH07XG4gIHRoaXMuX2Rpc2FibGVKU09OTEQgPSAhIW9wdGlvbnMuZGlzYWJsZUpTT05MRDtcblxuICAvLyBTdGFydCB3aXRoIGFsbCBmbGFncyBzZXRcbiAgdGhpcy5fZmxhZ3MgPSB0aGlzLkZMQUdfU1RSSVBfVU5MSUtFTFlTIHxcbiAgICAgICAgICAgICAgICB0aGlzLkZMQUdfV0VJR0hUX0NMQVNTRVMgfFxuICAgICAgICAgICAgICAgIHRoaXMuRkxBR19DTEVBTl9DT05ESVRJT05BTExZO1xuXG5cbiAgLy8gQ29udHJvbCB3aGV0aGVyIGxvZyBtZXNzYWdlcyBhcmUgc2VudCB0byB0aGUgY29uc29sZVxuICBpZiAodGhpcy5fZGVidWcpIHtcbiAgICBsZXQgbG9nTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIGlmIChub2RlLm5vZGVUeXBlID09IG5vZGUuVEVYVF9OT0RFKSB7XG4gICAgICAgIHJldHVybiBgJHtub2RlLm5vZGVOYW1lfSAoXCIke25vZGUudGV4dENvbnRlbnR9XCIpYDtcbiAgICAgIH1cbiAgICAgIGxldCBhdHRyUGFpcnMgPSBBcnJheS5mcm9tKG5vZGUuYXR0cmlidXRlcyB8fCBbXSwgZnVuY3Rpb24oYXR0cikge1xuICAgICAgICByZXR1cm4gYCR7YXR0ci5uYW1lfT1cIiR7YXR0ci52YWx1ZX1cImA7XG4gICAgICB9KS5qb2luKFwiIFwiKTtcbiAgICAgIHJldHVybiBgPCR7bm9kZS5sb2NhbE5hbWV9ICR7YXR0clBhaXJzfT5gO1xuICAgIH07XG4gICAgdGhpcy5sb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodHlwZW9mIGR1bXAgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgdmFyIG1zZyA9IEFycmF5LnByb3RvdHlwZS5tYXAuY2FsbChhcmd1bWVudHMsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICByZXR1cm4gKHggJiYgeC5ub2RlTmFtZSkgPyBsb2dOb2RlKHgpIDogeDtcbiAgICAgICAgfSkuam9pbihcIiBcIik7XG4gICAgICAgIGR1bXAoXCJSZWFkZXI6IChSZWFkYWJpbGl0eSkgXCIgKyBtc2cgKyBcIlxcblwiKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbnNvbGUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgbGV0IGFyZ3MgPSBBcnJheS5mcm9tKGFyZ3VtZW50cywgYXJnID0+IHtcbiAgICAgICAgICBpZiAoYXJnICYmIGFyZy5ub2RlVHlwZSA9PSB0aGlzLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgcmV0dXJuIGxvZ05vZGUoYXJnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgICAgfSk7XG4gICAgICAgIGFyZ3MudW5zaGlmdChcIlJlYWRlcjogKFJlYWRhYmlsaXR5KVwiKTtcbiAgICAgICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJncyk7XG4gICAgICB9XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmxvZyA9IGZ1bmN0aW9uICgpIHt9O1xuICB9XG59XG5cblJlYWRhYmlsaXR5LnByb3RvdHlwZSA9IHtcbiAgRkxBR19TVFJJUF9VTkxJS0VMWVM6IDB4MSxcbiAgRkxBR19XRUlHSFRfQ0xBU1NFUzogMHgyLFxuICBGTEFHX0NMRUFOX0NPTkRJVElPTkFMTFk6IDB4NCxcblxuICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvTm9kZS9ub2RlVHlwZVxuICBFTEVNRU5UX05PREU6IDEsXG4gIFRFWFRfTk9ERTogMyxcblxuICAvLyBNYXggbnVtYmVyIG9mIG5vZGVzIHN1cHBvcnRlZCBieSB0aGlzIHBhcnNlci4gRGVmYXVsdDogMCAobm8gbGltaXQpXG4gIERFRkFVTFRfTUFYX0VMRU1TX1RPX1BBUlNFOiAwLFxuXG4gIC8vIFRoZSBudW1iZXIgb2YgdG9wIGNhbmRpZGF0ZXMgdG8gY29uc2lkZXIgd2hlbiBhbmFseXNpbmcgaG93XG4gIC8vIHRpZ2h0IHRoZSBjb21wZXRpdGlvbiBpcyBhbW9uZyBjYW5kaWRhdGVzLlxuICBERUZBVUxUX05fVE9QX0NBTkRJREFURVM6IDUsXG5cbiAgLy8gRWxlbWVudCB0YWdzIHRvIHNjb3JlIGJ5IGRlZmF1bHQuXG4gIERFRkFVTFRfVEFHU19UT19TQ09SRTogXCJzZWN0aW9uLGgyLGgzLGg0LGg1LGg2LHAsdGQscHJlXCIudG9VcHBlckNhc2UoKS5zcGxpdChcIixcIiksXG5cbiAgLy8gVGhlIGRlZmF1bHQgbnVtYmVyIG9mIGNoYXJzIGFuIGFydGljbGUgbXVzdCBoYXZlIGluIG9yZGVyIHRvIHJldHVybiBhIHJlc3VsdFxuICBERUZBVUxUX0NIQVJfVEhSRVNIT0xEOiA1MDAsXG5cbiAgLy8gQWxsIG9mIHRoZSByZWd1bGFyIGV4cHJlc3Npb25zIGluIHVzZSB3aXRoaW4gcmVhZGFiaWxpdHkuXG4gIC8vIERlZmluZWQgdXAgaGVyZSBzbyB3ZSBkb24ndCBpbnN0YW50aWF0ZSB0aGVtIHJlcGVhdGVkbHkgaW4gbG9vcHMuXG4gIFJFR0VYUFM6IHtcbiAgICAvLyBOT1RFOiBUaGVzZSB0d28gcmVndWxhciBleHByZXNzaW9ucyBhcmUgZHVwbGljYXRlZCBpblxuICAgIC8vIFJlYWRhYmlsaXR5LXJlYWRlcmFibGUuanMuIFBsZWFzZSBrZWVwIGJvdGggY29waWVzIGluIHN5bmMuXG4gICAgdW5saWtlbHlDYW5kaWRhdGVzOiAvLWFkLXxhaTJodG1sfGJhbm5lcnxicmVhZGNydW1ic3xjb21ieHxjb21tZW50fGNvbW11bml0eXxjb3Zlci13cmFwfGRpc3F1c3xleHRyYXxmb290ZXJ8Z2RwcnxoZWFkZXJ8bGVnZW5kc3xtZW51fHJlbGF0ZWR8cmVtYXJrfHJlcGxpZXN8cnNzfHNob3V0Ym94fHNpZGViYXJ8c2t5c2NyYXBlcnxzb2NpYWx8c3BvbnNvcnxzdXBwbGVtZW50YWx8YWQtYnJlYWt8YWdlZ2F0ZXxwYWdpbmF0aW9ufHBhZ2VyfHBvcHVwfHlvbS1yZW1vdGUvaSxcbiAgICBva01heWJlSXRzQUNhbmRpZGF0ZTogL2FuZHxhcnRpY2xlfGJvZHl8Y29sdW1ufGNvbnRlbnR8bWFpbnxzaGFkb3cvaSxcblxuICAgIHBvc2l0aXZlOiAvYXJ0aWNsZXxib2R5fGNvbnRlbnR8ZW50cnl8aGVudHJ5fGgtZW50cnl8bWFpbnxwYWdlfHBhZ2luYXRpb258cG9zdHx0ZXh0fGJsb2d8c3RvcnkvaSxcbiAgICBuZWdhdGl2ZTogLy1hZC18aGlkZGVufF5oaWQkfCBoaWQkfCBoaWQgfF5oaWQgfGJhbm5lcnxjb21ieHxjb21tZW50fGNvbS18Y29udGFjdHxmb290fGZvb3Rlcnxmb290bm90ZXxnZHByfG1hc3RoZWFkfG1lZGlhfG1ldGF8b3V0YnJhaW58cHJvbW98cmVsYXRlZHxzY3JvbGx8c2hhcmV8c2hvdXRib3h8c2lkZWJhcnxza3lzY3JhcGVyfHNwb25zb3J8c2hvcHBpbmd8dGFnc3x0b29sfHdpZGdldC9pLFxuICAgIGV4dHJhbmVvdXM6IC9wcmludHxhcmNoaXZlfGNvbW1lbnR8ZGlzY3Vzc3xlW1xcLV0/bWFpbHxzaGFyZXxyZXBseXxhbGx8bG9naW58c2lnbnxzaW5nbGV8dXRpbGl0eS9pLFxuICAgIGJ5bGluZTogL2J5bGluZXxhdXRob3J8ZGF0ZWxpbmV8d3JpdHRlbmJ5fHAtYXV0aG9yL2ksXG4gICAgcmVwbGFjZUZvbnRzOiAvPChcXC8/KWZvbnRbXj5dKj4vZ2ksXG4gICAgbm9ybWFsaXplOiAvXFxzezIsfS9nLFxuICAgIHZpZGVvczogL1xcL1xcLyh3d3dcXC4pPygoZGFpbHltb3Rpb258eW91dHViZXx5b3V0dWJlLW5vY29va2llfHBsYXllclxcLnZpbWVvfHZcXC5xcSlcXC5jb218KGFyY2hpdmV8dXBsb2FkXFwud2lraW1lZGlhKVxcLm9yZ3xwbGF5ZXJcXC50d2l0Y2hcXC50dikvaSxcbiAgICBzaGFyZUVsZW1lbnRzOiAvKFxcYnxfKShzaGFyZXxzaGFyZWRhZGR5KShcXGJ8XykvaSxcbiAgICBuZXh0TGluazogLyhuZXh0fHdlaXRlcnxjb250aW51ZXw+KFteXFx8XXwkKXzCuyhbXlxcfF18JCkpL2ksXG4gICAgcHJldkxpbms6IC8ocHJldnxlYXJsfG9sZHxuZXd8PHzCqykvaSxcbiAgICB0b2tlbml6ZTogL1xcVysvZyxcbiAgICB3aGl0ZXNwYWNlOiAvXlxccyokLyxcbiAgICBoYXNDb250ZW50OiAvXFxTJC8sXG4gICAgaGFzaFVybDogL14jLisvLFxuICAgIHNyY3NldFVybDogLyhcXFMrKShcXHMrW1xcZC5dK1t4d10pPyhcXHMqKD86LHwkKSkvZyxcbiAgICBiNjREYXRhVXJsOiAvXmRhdGE6XFxzKihbXlxcczssXSspXFxzKjtcXHMqYmFzZTY0XFxzKiwvaSxcbiAgICAvLyBTZWU6IGh0dHBzOi8vc2NoZW1hLm9yZy9BcnRpY2xlXG4gICAganNvbkxkQXJ0aWNsZVR5cGVzOiAvXkFydGljbGV8QWR2ZXJ0aXNlckNvbnRlbnRBcnRpY2xlfE5ld3NBcnRpY2xlfEFuYWx5c2lzTmV3c0FydGljbGV8QXNrUHVibGljTmV3c0FydGljbGV8QmFja2dyb3VuZE5ld3NBcnRpY2xlfE9waW5pb25OZXdzQXJ0aWNsZXxSZXBvcnRhZ2VOZXdzQXJ0aWNsZXxSZXZpZXdOZXdzQXJ0aWNsZXxSZXBvcnR8U2F0aXJpY2FsQXJ0aWNsZXxTY2hvbGFybHlBcnRpY2xlfE1lZGljYWxTY2hvbGFybHlBcnRpY2xlfFNvY2lhbE1lZGlhUG9zdGluZ3xCbG9nUG9zdGluZ3xMaXZlQmxvZ1Bvc3Rpbmd8RGlzY3Vzc2lvbkZvcnVtUG9zdGluZ3xUZWNoQXJ0aWNsZXxBUElSZWZlcmVuY2UkL1xuICB9LFxuXG4gIFVOTElLRUxZX1JPTEVTOiBbIFwibWVudVwiLCBcIm1lbnViYXJcIiwgXCJjb21wbGVtZW50YXJ5XCIsIFwibmF2aWdhdGlvblwiLCBcImFsZXJ0XCIsIFwiYWxlcnRkaWFsb2dcIiwgXCJkaWFsb2dcIiBdLFxuXG4gIERJVl9UT19QX0VMRU1TOiBuZXcgU2V0KFsgXCJCTE9DS1FVT1RFXCIsIFwiRExcIiwgXCJESVZcIiwgXCJJTUdcIiwgXCJPTFwiLCBcIlBcIiwgXCJQUkVcIiwgXCJUQUJMRVwiLCBcIlVMXCIgXSksXG5cbiAgQUxURVJfVE9fRElWX0VYQ0VQVElPTlM6IFtcIkRJVlwiLCBcIkFSVElDTEVcIiwgXCJTRUNUSU9OXCIsIFwiUFwiXSxcblxuICBQUkVTRU5UQVRJT05BTF9BVFRSSUJVVEVTOiBbIFwiYWxpZ25cIiwgXCJiYWNrZ3JvdW5kXCIsIFwiYmdjb2xvclwiLCBcImJvcmRlclwiLCBcImNlbGxwYWRkaW5nXCIsIFwiY2VsbHNwYWNpbmdcIiwgXCJmcmFtZVwiLCBcImhzcGFjZVwiLCBcInJ1bGVzXCIsIFwic3R5bGVcIiwgXCJ2YWxpZ25cIiwgXCJ2c3BhY2VcIiBdLFxuXG4gIERFUFJFQ0FURURfU0laRV9BVFRSSUJVVEVfRUxFTVM6IFsgXCJUQUJMRVwiLCBcIlRIXCIsIFwiVERcIiwgXCJIUlwiLCBcIlBSRVwiIF0sXG5cbiAgLy8gVGhlIGNvbW1lbnRlZCBvdXQgZWxlbWVudHMgcXVhbGlmeSBhcyBwaHJhc2luZyBjb250ZW50IGJ1dCB0ZW5kIHRvIGJlXG4gIC8vIHJlbW92ZWQgYnkgcmVhZGFiaWxpdHkgd2hlbiBwdXQgaW50byBwYXJhZ3JhcGhzLCBzbyB3ZSBpZ25vcmUgdGhlbSBoZXJlLlxuICBQSFJBU0lOR19FTEVNUzogW1xuICAgIC8vIFwiQ0FOVkFTXCIsIFwiSUZSQU1FXCIsIFwiU1ZHXCIsIFwiVklERU9cIixcbiAgICBcIkFCQlJcIiwgXCJBVURJT1wiLCBcIkJcIiwgXCJCRE9cIiwgXCJCUlwiLCBcIkJVVFRPTlwiLCBcIkNJVEVcIiwgXCJDT0RFXCIsIFwiREFUQVwiLFxuICAgIFwiREFUQUxJU1RcIiwgXCJERk5cIiwgXCJFTVwiLCBcIkVNQkVEXCIsIFwiSVwiLCBcIklNR1wiLCBcIklOUFVUXCIsIFwiS0JEXCIsIFwiTEFCRUxcIixcbiAgICBcIk1BUktcIiwgXCJNQVRIXCIsIFwiTUVURVJcIiwgXCJOT1NDUklQVFwiLCBcIk9CSkVDVFwiLCBcIk9VVFBVVFwiLCBcIlBST0dSRVNTXCIsIFwiUVwiLFxuICAgIFwiUlVCWVwiLCBcIlNBTVBcIiwgXCJTQ1JJUFRcIiwgXCJTRUxFQ1RcIiwgXCJTTUFMTFwiLCBcIlNQQU5cIiwgXCJTVFJPTkdcIiwgXCJTVUJcIixcbiAgICBcIlNVUFwiLCBcIlRFWFRBUkVBXCIsIFwiVElNRVwiLCBcIlZBUlwiLCBcIldCUlwiXG4gIF0sXG5cbiAgLy8gVGhlc2UgYXJlIHRoZSBjbGFzc2VzIHRoYXQgcmVhZGFiaWxpdHkgc2V0cyBpdHNlbGYuXG4gIENMQVNTRVNfVE9fUFJFU0VSVkU6IFsgXCJwYWdlXCIgXSxcblxuICAvLyBUaGVzZSBhcmUgdGhlIGxpc3Qgb2YgSFRNTCBlbnRpdGllcyB0aGF0IG5lZWQgdG8gYmUgZXNjYXBlZC5cbiAgSFRNTF9FU0NBUEVfTUFQOiB7XG4gICAgXCJsdFwiOiBcIjxcIixcbiAgICBcImd0XCI6IFwiPlwiLFxuICAgIFwiYW1wXCI6IFwiJlwiLFxuICAgIFwicXVvdFwiOiAnXCInLFxuICAgIFwiYXBvc1wiOiBcIidcIixcbiAgfSxcblxuICAvKipcbiAgICogUnVuIGFueSBwb3N0LXByb2Nlc3MgbW9kaWZpY2F0aW9ucyB0byBhcnRpY2xlIGNvbnRlbnQgYXMgbmVjZXNzYXJ5LlxuICAgKlxuICAgKiBAcGFyYW0gRWxlbWVudFxuICAgKiBAcmV0dXJuIHZvaWRcbiAgKiovXG4gIF9wb3N0UHJvY2Vzc0NvbnRlbnQ6IGZ1bmN0aW9uKGFydGljbGVDb250ZW50KSB7XG4gICAgLy8gUmVhZGFiaWxpdHkgY2Fubm90IG9wZW4gcmVsYXRpdmUgdXJpcyBzbyB3ZSBjb252ZXJ0IHRoZW0gdG8gYWJzb2x1dGUgdXJpcy5cbiAgICB0aGlzLl9maXhSZWxhdGl2ZVVyaXMoYXJ0aWNsZUNvbnRlbnQpO1xuXG4gICAgdGhpcy5fc2ltcGxpZnlOZXN0ZWRFbGVtZW50cyhhcnRpY2xlQ29udGVudCk7XG5cbiAgICBpZiAoIXRoaXMuX2tlZXBDbGFzc2VzKSB7XG4gICAgICAvLyBSZW1vdmUgY2xhc3Nlcy5cbiAgICAgIHRoaXMuX2NsZWFuQ2xhc3NlcyhhcnRpY2xlQ29udGVudCk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBJdGVyYXRlcyBvdmVyIGEgTm9kZUxpc3QsIGNhbGxzIGBmaWx0ZXJGbmAgZm9yIGVhY2ggbm9kZSBhbmQgcmVtb3ZlcyBub2RlXG4gICAqIGlmIGZ1bmN0aW9uIHJldHVybmVkIGB0cnVlYC5cbiAgICpcbiAgICogSWYgZnVuY3Rpb24gaXMgbm90IHBhc3NlZCwgcmVtb3ZlcyBhbGwgdGhlIG5vZGVzIGluIG5vZGUgbGlzdC5cbiAgICpcbiAgICogQHBhcmFtIE5vZGVMaXN0IG5vZGVMaXN0IFRoZSBub2RlcyB0byBvcGVyYXRlIG9uXG4gICAqIEBwYXJhbSBGdW5jdGlvbiBmaWx0ZXJGbiB0aGUgZnVuY3Rpb24gdG8gdXNlIGFzIGEgZmlsdGVyXG4gICAqIEByZXR1cm4gdm9pZFxuICAgKi9cbiAgX3JlbW92ZU5vZGVzOiBmdW5jdGlvbihub2RlTGlzdCwgZmlsdGVyRm4pIHtcbiAgICAvLyBBdm9pZCBldmVyIG9wZXJhdGluZyBvbiBsaXZlIG5vZGUgbGlzdHMuXG4gICAgaWYgKHRoaXMuX2RvY0pTRE9NUGFyc2VyICYmIG5vZGVMaXN0Ll9pc0xpdmVOb2RlTGlzdCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRG8gbm90IHBhc3MgbGl2ZSBub2RlIGxpc3RzIHRvIF9yZW1vdmVOb2Rlc1wiKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IG5vZGVMaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgbm9kZSA9IG5vZGVMaXN0W2ldO1xuICAgICAgdmFyIHBhcmVudE5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBpZiAoIWZpbHRlckZuIHx8IGZpbHRlckZuLmNhbGwodGhpcywgbm9kZSwgaSwgbm9kZUxpc3QpKSB7XG4gICAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogSXRlcmF0ZXMgb3ZlciBhIE5vZGVMaXN0LCBhbmQgY2FsbHMgX3NldE5vZGVUYWcgZm9yIGVhY2ggbm9kZS5cbiAgICpcbiAgICogQHBhcmFtIE5vZGVMaXN0IG5vZGVMaXN0IFRoZSBub2RlcyB0byBvcGVyYXRlIG9uXG4gICAqIEBwYXJhbSBTdHJpbmcgbmV3VGFnTmFtZSB0aGUgbmV3IHRhZyBuYW1lIHRvIHVzZVxuICAgKiBAcmV0dXJuIHZvaWRcbiAgICovXG4gIF9yZXBsYWNlTm9kZVRhZ3M6IGZ1bmN0aW9uKG5vZGVMaXN0LCBuZXdUYWdOYW1lKSB7XG4gICAgLy8gQXZvaWQgZXZlciBvcGVyYXRpbmcgb24gbGl2ZSBub2RlIGxpc3RzLlxuICAgIGlmICh0aGlzLl9kb2NKU0RPTVBhcnNlciAmJiBub2RlTGlzdC5faXNMaXZlTm9kZUxpc3QpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkRvIG5vdCBwYXNzIGxpdmUgbm9kZSBsaXN0cyB0byBfcmVwbGFjZU5vZGVUYWdzXCIpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZUxpc3QpIHtcbiAgICAgIHRoaXMuX3NldE5vZGVUYWcobm9kZSwgbmV3VGFnTmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBJdGVyYXRlIG92ZXIgYSBOb2RlTGlzdCwgd2hpY2ggZG9lc24ndCBuYXRpdmVseSBmdWxseSBpbXBsZW1lbnQgdGhlIEFycmF5XG4gICAqIGludGVyZmFjZS5cbiAgICpcbiAgICogRm9yIGNvbnZlbmllbmNlLCB0aGUgY3VycmVudCBvYmplY3QgY29udGV4dCBpcyBhcHBsaWVkIHRvIHRoZSBwcm92aWRlZFxuICAgKiBpdGVyYXRlIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIE5vZGVMaXN0IG5vZGVMaXN0IFRoZSBOb2RlTGlzdC5cbiAgICogQHBhcmFtICBGdW5jdGlvbiBmbiAgICAgICBUaGUgaXRlcmF0ZSBmdW5jdGlvbi5cbiAgICogQHJldHVybiB2b2lkXG4gICAqL1xuICBfZm9yRWFjaE5vZGU6IGZ1bmN0aW9uKG5vZGVMaXN0LCBmbikge1xuICAgIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwobm9kZUxpc3QsIGZuLCB0aGlzKTtcbiAgfSxcblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGEgTm9kZUxpc3QsIGFuZCByZXR1cm4gdGhlIGZpcnN0IG5vZGUgdGhhdCBwYXNzZXNcbiAgICogdGhlIHN1cHBsaWVkIHRlc3QgZnVuY3Rpb25cbiAgICpcbiAgICogRm9yIGNvbnZlbmllbmNlLCB0aGUgY3VycmVudCBvYmplY3QgY29udGV4dCBpcyBhcHBsaWVkIHRvIHRoZSBwcm92aWRlZFxuICAgKiB0ZXN0IGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gIE5vZGVMaXN0IG5vZGVMaXN0IFRoZSBOb2RlTGlzdC5cbiAgICogQHBhcmFtICBGdW5jdGlvbiBmbiAgICAgICBUaGUgdGVzdCBmdW5jdGlvbi5cbiAgICogQHJldHVybiB2b2lkXG4gICAqL1xuICBfZmluZE5vZGU6IGZ1bmN0aW9uKG5vZGVMaXN0LCBmbikge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuZmluZC5jYWxsKG5vZGVMaXN0LCBmbiwgdGhpcyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb3ZlciBhIE5vZGVMaXN0LCByZXR1cm4gdHJ1ZSBpZiBhbnkgb2YgdGhlIHByb3ZpZGVkIGl0ZXJhdGVcbiAgICogZnVuY3Rpb24gY2FsbHMgcmV0dXJucyB0cnVlLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqXG4gICAqIEZvciBjb252ZW5pZW5jZSwgdGhlIGN1cnJlbnQgb2JqZWN0IGNvbnRleHQgaXMgYXBwbGllZCB0byB0aGVcbiAgICogcHJvdmlkZWQgaXRlcmF0ZSBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtICBOb2RlTGlzdCBub2RlTGlzdCBUaGUgTm9kZUxpc3QuXG4gICAqIEBwYXJhbSAgRnVuY3Rpb24gZm4gICAgICAgVGhlIGl0ZXJhdGUgZnVuY3Rpb24uXG4gICAqIEByZXR1cm4gQm9vbGVhblxuICAgKi9cbiAgX3NvbWVOb2RlOiBmdW5jdGlvbihub2RlTGlzdCwgZm4pIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNvbWUuY2FsbChub2RlTGlzdCwgZm4sIHRoaXMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJdGVyYXRlIG92ZXIgYSBOb2RlTGlzdCwgcmV0dXJuIHRydWUgaWYgYWxsIG9mIHRoZSBwcm92aWRlZCBpdGVyYXRlXG4gICAqIGZ1bmN0aW9uIGNhbGxzIHJldHVybiB0cnVlLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqXG4gICAqIEZvciBjb252ZW5pZW5jZSwgdGhlIGN1cnJlbnQgb2JqZWN0IGNvbnRleHQgaXMgYXBwbGllZCB0byB0aGVcbiAgICogcHJvdmlkZWQgaXRlcmF0ZSBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtICBOb2RlTGlzdCBub2RlTGlzdCBUaGUgTm9kZUxpc3QuXG4gICAqIEBwYXJhbSAgRnVuY3Rpb24gZm4gICAgICAgVGhlIGl0ZXJhdGUgZnVuY3Rpb24uXG4gICAqIEByZXR1cm4gQm9vbGVhblxuICAgKi9cbiAgX2V2ZXJ5Tm9kZTogZnVuY3Rpb24obm9kZUxpc3QsIGZuKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5ldmVyeS5jYWxsKG5vZGVMaXN0LCBmbiwgdGhpcyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbmNhdCBhbGwgbm9kZWxpc3RzIHBhc3NlZCBhcyBhcmd1bWVudHMuXG4gICAqXG4gICAqIEByZXR1cm4gLi4uTm9kZUxpc3RcbiAgICogQHJldHVybiBBcnJheVxuICAgKi9cbiAgX2NvbmNhdE5vZGVMaXN0czogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHZhciBub2RlTGlzdHMgPSBhcmdzLm1hcChmdW5jdGlvbihsaXN0KSB7XG4gICAgICByZXR1cm4gc2xpY2UuY2FsbChsaXN0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShbXSwgbm9kZUxpc3RzKTtcbiAgfSxcblxuICBfZ2V0QWxsTm9kZXNXaXRoVGFnOiBmdW5jdGlvbihub2RlLCB0YWdOYW1lcykge1xuICAgIGlmIChub2RlLnF1ZXJ5U2VsZWN0b3JBbGwpIHtcbiAgICAgIHJldHVybiBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwodGFnTmFtZXMuam9pbihcIixcIikpO1xuICAgIH1cbiAgICByZXR1cm4gW10uY29uY2F0LmFwcGx5KFtdLCB0YWdOYW1lcy5tYXAoZnVuY3Rpb24odGFnKSB7XG4gICAgICB2YXIgY29sbGVjdGlvbiA9IG5vZGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUodGFnKTtcbiAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KGNvbGxlY3Rpb24pID8gY29sbGVjdGlvbiA6IEFycmF5LmZyb20oY29sbGVjdGlvbik7XG4gICAgfSkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIHRoZSBjbGFzcz1cIlwiIGF0dHJpYnV0ZSBmcm9tIGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIGdpdmVuXG4gICAqIHN1YnRyZWUsIGV4Y2VwdCB0aG9zZSB0aGF0IG1hdGNoIENMQVNTRVNfVE9fUFJFU0VSVkUgYW5kXG4gICAqIHRoZSBjbGFzc2VzVG9QcmVzZXJ2ZSBhcnJheSBmcm9tIHRoZSBvcHRpb25zIG9iamVjdC5cbiAgICpcbiAgICogQHBhcmFtIEVsZW1lbnRcbiAgICogQHJldHVybiB2b2lkXG4gICAqL1xuICBfY2xlYW5DbGFzc2VzOiBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIGNsYXNzZXNUb1ByZXNlcnZlID0gdGhpcy5fY2xhc3Nlc1RvUHJlc2VydmU7XG4gICAgdmFyIGNsYXNzTmFtZSA9IChub2RlLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpIHx8IFwiXCIpXG4gICAgICAuc3BsaXQoL1xccysvKVxuICAgICAgLmZpbHRlcihmdW5jdGlvbihjbHMpIHtcbiAgICAgICAgcmV0dXJuIGNsYXNzZXNUb1ByZXNlcnZlLmluZGV4T2YoY2xzKSAhPSAtMTtcbiAgICAgIH0pXG4gICAgICAuam9pbihcIiBcIik7XG5cbiAgICBpZiAoY2xhc3NOYW1lKSB7XG4gICAgICBub2RlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKFwiY2xhc3NcIik7XG4gICAgfVxuXG4gICAgZm9yIChub2RlID0gbm9kZS5maXJzdEVsZW1lbnRDaGlsZDsgbm9kZTsgbm9kZSA9IG5vZGUubmV4dEVsZW1lbnRTaWJsaW5nKSB7XG4gICAgICB0aGlzLl9jbGVhbkNsYXNzZXMobm9kZSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBlYWNoIDxhPiBhbmQgPGltZz4gdXJpIGluIHRoZSBnaXZlbiBlbGVtZW50IHRvIGFuIGFic29sdXRlIFVSSSxcbiAgICogaWdub3JpbmcgI3JlZiBVUklzLlxuICAgKlxuICAgKiBAcGFyYW0gRWxlbWVudFxuICAgKiBAcmV0dXJuIHZvaWRcbiAgICovXG4gIF9maXhSZWxhdGl2ZVVyaXM6IGZ1bmN0aW9uKGFydGljbGVDb250ZW50KSB7XG4gICAgdmFyIGJhc2VVUkkgPSB0aGlzLl9kb2MuYmFzZVVSSTtcbiAgICB2YXIgZG9jdW1lbnRVUkkgPSB0aGlzLl9kb2MuZG9jdW1lbnRVUkk7XG4gICAgZnVuY3Rpb24gdG9BYnNvbHV0ZVVSSSh1cmkpIHtcbiAgICAgIC8vIExlYXZlIGhhc2ggbGlua3MgYWxvbmUgaWYgdGhlIGJhc2UgVVJJIG1hdGNoZXMgdGhlIGRvY3VtZW50IFVSSTpcbiAgICAgIGlmIChiYXNlVVJJID09IGRvY3VtZW50VVJJICYmIHVyaS5jaGFyQXQoMCkgPT0gXCIjXCIpIHtcbiAgICAgICAgcmV0dXJuIHVyaTtcbiAgICAgIH1cblxuICAgICAgLy8gT3RoZXJ3aXNlLCByZXNvbHZlIGFnYWluc3QgYmFzZSBVUkk6XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gbmV3IFVSTCh1cmksIGJhc2VVUkkpLmhyZWY7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAvLyBTb21ldGhpbmcgd2VudCB3cm9uZywganVzdCByZXR1cm4gdGhlIG9yaWdpbmFsOlxuICAgICAgfVxuICAgICAgcmV0dXJuIHVyaTtcbiAgICB9XG5cbiAgICB2YXIgbGlua3MgPSB0aGlzLl9nZXRBbGxOb2Rlc1dpdGhUYWcoYXJ0aWNsZUNvbnRlbnQsIFtcImFcIl0pO1xuICAgIHRoaXMuX2ZvckVhY2hOb2RlKGxpbmtzLCBmdW5jdGlvbihsaW5rKSB7XG4gICAgICB2YXIgaHJlZiA9IGxpbmsuZ2V0QXR0cmlidXRlKFwiaHJlZlwiKTtcbiAgICAgIGlmIChocmVmKSB7XG4gICAgICAgIC8vIFJlbW92ZSBsaW5rcyB3aXRoIGphdmFzY3JpcHQ6IFVSSXMsIHNpbmNlXG4gICAgICAgIC8vIHRoZXkgd29uJ3Qgd29yayBhZnRlciBzY3JpcHRzIGhhdmUgYmVlbiByZW1vdmVkIGZyb20gdGhlIHBhZ2UuXG4gICAgICAgIGlmIChocmVmLmluZGV4T2YoXCJqYXZhc2NyaXB0OlwiKSA9PT0gMCkge1xuICAgICAgICAgIC8vIGlmIHRoZSBsaW5rIG9ubHkgY29udGFpbnMgc2ltcGxlIHRleHQgY29udGVudCwgaXQgY2FuIGJlIGNvbnZlcnRlZCB0byBhIHRleHQgbm9kZVxuICAgICAgICAgIGlmIChsaW5rLmNoaWxkTm9kZXMubGVuZ3RoID09PSAxICYmIGxpbmsuY2hpbGROb2Rlc1swXS5ub2RlVHlwZSA9PT0gdGhpcy5URVhUX05PREUpIHtcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gdGhpcy5fZG9jLmNyZWF0ZVRleHROb2RlKGxpbmsudGV4dENvbnRlbnQpO1xuICAgICAgICAgICAgbGluay5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZCh0ZXh0LCBsaW5rKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gaWYgdGhlIGxpbmsgaGFzIG11bHRpcGxlIGNoaWxkcmVuLCB0aGV5IHNob3VsZCBhbGwgYmUgcHJlc2VydmVkXG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gdGhpcy5fZG9jLmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICAgICAgd2hpbGUgKGxpbmsuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobGluay5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpbmsucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoY29udGFpbmVyLCBsaW5rKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGluay5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsIHRvQWJzb2x1dGVVUkkoaHJlZikpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgbWVkaWFzID0gdGhpcy5fZ2V0QWxsTm9kZXNXaXRoVGFnKGFydGljbGVDb250ZW50LCBbXG4gICAgICBcImltZ1wiLCBcInBpY3R1cmVcIiwgXCJmaWd1cmVcIiwgXCJ2aWRlb1wiLCBcImF1ZGlvXCIsIFwic291cmNlXCJcbiAgICBdKTtcblxuICAgIHRoaXMuX2ZvckVhY2hOb2RlKG1lZGlhcywgZnVuY3Rpb24obWVkaWEpIHtcbiAgICAgIHZhciBzcmMgPSBtZWRpYS5nZXRBdHRyaWJ1dGUoXCJzcmNcIik7XG4gICAgICB2YXIgcG9zdGVyID0gbWVkaWEuZ2V0QXR0cmlidXRlKFwicG9zdGVyXCIpO1xuICAgICAgdmFyIHNyY3NldCA9IG1lZGlhLmdldEF0dHJpYnV0ZShcInNyY3NldFwiKTtcblxuICAgICAgaWYgKHNyYykge1xuICAgICAgICBtZWRpYS5zZXRBdHRyaWJ1dGUoXCJzcmNcIiwgdG9BYnNvbHV0ZVVSSShzcmMpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBvc3Rlcikge1xuICAgICAgICBtZWRpYS5zZXRBdHRyaWJ1dGUoXCJwb3N0ZXJcIiwgdG9BYnNvbHV0ZVVSSShwb3N0ZXIpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNyY3NldCkge1xuICAgICAgICB2YXIgbmV3U3Jjc2V0ID0gc3Jjc2V0LnJlcGxhY2UodGhpcy5SRUdFWFBTLnNyY3NldFVybCwgZnVuY3Rpb24oXywgcDEsIHAyLCBwMykge1xuICAgICAgICAgIHJldHVybiB0b0Fic29sdXRlVVJJKHAxKSArIChwMiB8fCBcIlwiKSArIHAzO1xuICAgICAgICB9KTtcblxuICAgICAgICBtZWRpYS5zZXRBdHRyaWJ1dGUoXCJzcmNzZXRcIiwgbmV3U3Jjc2V0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBfc2ltcGxpZnlOZXN0ZWRFbGVtZW50czogZnVuY3Rpb24oYXJ0aWNsZUNvbnRlbnQpIHtcbiAgICB2YXIgbm9kZSA9IGFydGljbGVDb250ZW50O1xuXG4gICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgIGlmIChub2RlLnBhcmVudE5vZGUgJiYgW1wiRElWXCIsIFwiU0VDVElPTlwiXS5pbmNsdWRlcyhub2RlLnRhZ05hbWUpICYmICEobm9kZS5pZCAmJiBub2RlLmlkLnN0YXJ0c1dpdGgoXCJyZWFkYWJpbGl0eVwiKSkpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzRWxlbWVudFdpdGhvdXRDb250ZW50KG5vZGUpKSB7XG4gICAgICAgICAgbm9kZSA9IHRoaXMuX3JlbW92ZUFuZEdldE5leHQobm9kZSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5faGFzU2luZ2xlVGFnSW5zaWRlRWxlbWVudChub2RlLCBcIkRJVlwiKSB8fCB0aGlzLl9oYXNTaW5nbGVUYWdJbnNpZGVFbGVtZW50KG5vZGUsIFwiU0VDVElPTlwiKSkge1xuICAgICAgICAgIHZhciBjaGlsZCA9IG5vZGUuY2hpbGRyZW5bMF07XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2RlLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNoaWxkLnNldEF0dHJpYnV0ZShub2RlLmF0dHJpYnV0ZXNbaV0ubmFtZSwgbm9kZS5hdHRyaWJ1dGVzW2ldLnZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChjaGlsZCwgbm9kZSk7XG4gICAgICAgICAgbm9kZSA9IGNoaWxkO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIG5vZGUgPSB0aGlzLl9nZXROZXh0Tm9kZShub2RlKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCB0aGUgYXJ0aWNsZSB0aXRsZSBhcyBhbiBIMS5cbiAgICpcbiAgICogQHJldHVybiBzdHJpbmdcbiAgICoqL1xuICBfZ2V0QXJ0aWNsZVRpdGxlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZG9jID0gdGhpcy5fZG9jO1xuICAgIHZhciBjdXJUaXRsZSA9IFwiXCI7XG4gICAgdmFyIG9yaWdUaXRsZSA9IFwiXCI7XG5cbiAgICB0cnkge1xuICAgICAgY3VyVGl0bGUgPSBvcmlnVGl0bGUgPSBkb2MudGl0bGUudHJpbSgpO1xuXG4gICAgICAvLyBJZiB0aGV5IGhhZCBhbiBlbGVtZW50IHdpdGggaWQgXCJ0aXRsZVwiIGluIHRoZWlyIEhUTUxcbiAgICAgIGlmICh0eXBlb2YgY3VyVGl0bGUgIT09IFwic3RyaW5nXCIpXG4gICAgICAgIGN1clRpdGxlID0gb3JpZ1RpdGxlID0gdGhpcy5fZ2V0SW5uZXJUZXh0KGRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInRpdGxlXCIpWzBdKTtcbiAgICB9IGNhdGNoIChlKSB7LyogaWdub3JlIGV4Y2VwdGlvbnMgc2V0dGluZyB0aGUgdGl0bGUuICovfVxuXG4gICAgdmFyIHRpdGxlSGFkSGllcmFyY2hpY2FsU2VwYXJhdG9ycyA9IGZhbHNlO1xuICAgIGZ1bmN0aW9uIHdvcmRDb3VudChzdHIpIHtcbiAgICAgIHJldHVybiBzdHIuc3BsaXQoL1xccysvKS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUncyBhIHNlcGFyYXRvciBpbiB0aGUgdGl0bGUsIGZpcnN0IHJlbW92ZSB0aGUgZmluYWwgcGFydFxuICAgIGlmICgoLyBbXFx8XFwtXFxcXFxcLz7Cu10gLykudGVzdChjdXJUaXRsZSkpIHtcbiAgICAgIHRpdGxlSGFkSGllcmFyY2hpY2FsU2VwYXJhdG9ycyA9IC8gW1xcXFxcXC8+wrtdIC8udGVzdChjdXJUaXRsZSk7XG4gICAgICBjdXJUaXRsZSA9IG9yaWdUaXRsZS5yZXBsYWNlKC8oLiopW1xcfFxcLVxcXFxcXC8+wrtdIC4qL2dpLCBcIiQxXCIpO1xuXG4gICAgICAvLyBJZiB0aGUgcmVzdWx0aW5nIHRpdGxlIGlzIHRvbyBzaG9ydCAoMyB3b3JkcyBvciBmZXdlciksIHJlbW92ZVxuICAgICAgLy8gdGhlIGZpcnN0IHBhcnQgaW5zdGVhZDpcbiAgICAgIGlmICh3b3JkQ291bnQoY3VyVGl0bGUpIDwgMylcbiAgICAgICAgY3VyVGl0bGUgPSBvcmlnVGl0bGUucmVwbGFjZSgvW15cXHxcXC1cXFxcXFwvPsK7XSpbXFx8XFwtXFxcXFxcLz7Cu10oLiopL2dpLCBcIiQxXCIpO1xuICAgIH0gZWxzZSBpZiAoY3VyVGl0bGUuaW5kZXhPZihcIjogXCIpICE9PSAtMSkge1xuICAgICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSBhbiBoZWFkaW5nIGNvbnRhaW5pbmcgdGhpcyBleGFjdCBzdHJpbmcsIHNvIHdlXG4gICAgICAvLyBjb3VsZCBhc3N1bWUgaXQncyB0aGUgZnVsbCB0aXRsZS5cbiAgICAgIHZhciBoZWFkaW5ncyA9IHRoaXMuX2NvbmNhdE5vZGVMaXN0cyhcbiAgICAgICAgZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaDFcIiksXG4gICAgICAgIGRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImgyXCIpXG4gICAgICApO1xuICAgICAgdmFyIHRyaW1tZWRUaXRsZSA9IGN1clRpdGxlLnRyaW0oKTtcbiAgICAgIHZhciBtYXRjaCA9IHRoaXMuX3NvbWVOb2RlKGhlYWRpbmdzLCBmdW5jdGlvbihoZWFkaW5nKSB7XG4gICAgICAgIHJldHVybiBoZWFkaW5nLnRleHRDb250ZW50LnRyaW0oKSA9PT0gdHJpbW1lZFRpdGxlO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIElmIHdlIGRvbid0LCBsZXQncyBleHRyYWN0IHRoZSB0aXRsZSBvdXQgb2YgdGhlIG9yaWdpbmFsIHRpdGxlIHN0cmluZy5cbiAgICAgIGlmICghbWF0Y2gpIHtcbiAgICAgICAgY3VyVGl0bGUgPSBvcmlnVGl0bGUuc3Vic3RyaW5nKG9yaWdUaXRsZS5sYXN0SW5kZXhPZihcIjpcIikgKyAxKTtcblxuICAgICAgICAvLyBJZiB0aGUgdGl0bGUgaXMgbm93IHRvbyBzaG9ydCwgdHJ5IHRoZSBmaXJzdCBjb2xvbiBpbnN0ZWFkOlxuICAgICAgICBpZiAod29yZENvdW50KGN1clRpdGxlKSA8IDMpIHtcbiAgICAgICAgICBjdXJUaXRsZSA9IG9yaWdUaXRsZS5zdWJzdHJpbmcob3JpZ1RpdGxlLmluZGV4T2YoXCI6XCIpICsgMSk7XG4gICAgICAgICAgLy8gQnV0IGlmIHdlIGhhdmUgdG9vIG1hbnkgd29yZHMgYmVmb3JlIHRoZSBjb2xvbiB0aGVyZSdzIHNvbWV0aGluZyB3ZWlyZFxuICAgICAgICAgIC8vIHdpdGggdGhlIHRpdGxlcyBhbmQgdGhlIEggdGFncyBzbyBsZXQncyBqdXN0IHVzZSB0aGUgb3JpZ2luYWwgdGl0bGUgaW5zdGVhZFxuICAgICAgICB9IGVsc2UgaWYgKHdvcmRDb3VudChvcmlnVGl0bGUuc3Vic3RyKDAsIG9yaWdUaXRsZS5pbmRleE9mKFwiOlwiKSkpID4gNSkge1xuICAgICAgICAgIGN1clRpdGxlID0gb3JpZ1RpdGxlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjdXJUaXRsZS5sZW5ndGggPiAxNTAgfHwgY3VyVGl0bGUubGVuZ3RoIDwgMTUpIHtcbiAgICAgIHZhciBoT25lcyA9IGRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImgxXCIpO1xuXG4gICAgICBpZiAoaE9uZXMubGVuZ3RoID09PSAxKVxuICAgICAgICBjdXJUaXRsZSA9IHRoaXMuX2dldElubmVyVGV4dChoT25lc1swXSk7XG4gICAgfVxuXG4gICAgY3VyVGl0bGUgPSBjdXJUaXRsZS50cmltKCkucmVwbGFjZSh0aGlzLlJFR0VYUFMubm9ybWFsaXplLCBcIiBcIik7XG4gICAgLy8gSWYgd2Ugbm93IGhhdmUgNCB3b3JkcyBvciBmZXdlciBhcyBvdXIgdGl0bGUsIGFuZCBlaXRoZXIgbm9cbiAgICAvLyAnaGllcmFyY2hpY2FsJyBzZXBhcmF0b3JzIChcXCwgLywgPiBvciDCuykgd2VyZSBmb3VuZCBpbiB0aGUgb3JpZ2luYWxcbiAgICAvLyB0aXRsZSBvciB3ZSBkZWNyZWFzZWQgdGhlIG51bWJlciBvZiB3b3JkcyBieSBtb3JlIHRoYW4gMSB3b3JkLCB1c2VcbiAgICAvLyB0aGUgb3JpZ2luYWwgdGl0bGUuXG4gICAgdmFyIGN1clRpdGxlV29yZENvdW50ID0gd29yZENvdW50KGN1clRpdGxlKTtcbiAgICBpZiAoY3VyVGl0bGVXb3JkQ291bnQgPD0gNCAmJlxuICAgICAgICAoIXRpdGxlSGFkSGllcmFyY2hpY2FsU2VwYXJhdG9ycyB8fFxuICAgICAgICAgY3VyVGl0bGVXb3JkQ291bnQgIT0gd29yZENvdW50KG9yaWdUaXRsZS5yZXBsYWNlKC9bXFx8XFwtXFxcXFxcLz7Cu10rL2csIFwiXCIpKSAtIDEpKSB7XG4gICAgICBjdXJUaXRsZSA9IG9yaWdUaXRsZTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3VyVGl0bGU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFByZXBhcmUgdGhlIEhUTUwgZG9jdW1lbnQgZm9yIHJlYWRhYmlsaXR5IHRvIHNjcmFwZSBpdC5cbiAgICogVGhpcyBpbmNsdWRlcyB0aGluZ3MgbGlrZSBzdHJpcHBpbmcgamF2YXNjcmlwdCwgQ1NTLCBhbmQgaGFuZGxpbmcgdGVycmlibGUgbWFya3VwLlxuICAgKlxuICAgKiBAcmV0dXJuIHZvaWRcbiAgICoqL1xuICBfcHJlcERvY3VtZW50OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZG9jID0gdGhpcy5fZG9jO1xuXG4gICAgLy8gUmVtb3ZlIGFsbCBzdHlsZSB0YWdzIGluIGhlYWRcbiAgICB0aGlzLl9yZW1vdmVOb2Rlcyh0aGlzLl9nZXRBbGxOb2Rlc1dpdGhUYWcoZG9jLCBbXCJzdHlsZVwiXSkpO1xuXG4gICAgaWYgKGRvYy5ib2R5KSB7XG4gICAgICB0aGlzLl9yZXBsYWNlQnJzKGRvYy5ib2R5KTtcbiAgICB9XG5cbiAgICB0aGlzLl9yZXBsYWNlTm9kZVRhZ3ModGhpcy5fZ2V0QWxsTm9kZXNXaXRoVGFnKGRvYywgW1wiZm9udFwiXSksIFwiU1BBTlwiKTtcbiAgfSxcblxuICAvKipcbiAgICogRmluZHMgdGhlIG5leHQgbm9kZSwgc3RhcnRpbmcgZnJvbSB0aGUgZ2l2ZW4gbm9kZSwgYW5kIGlnbm9yaW5nXG4gICAqIHdoaXRlc3BhY2UgaW4gYmV0d2Vlbi4gSWYgdGhlIGdpdmVuIG5vZGUgaXMgYW4gZWxlbWVudCwgdGhlIHNhbWUgbm9kZSBpc1xuICAgKiByZXR1cm5lZC5cbiAgICovXG4gIF9uZXh0Tm9kZTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICB2YXIgbmV4dCA9IG5vZGU7XG4gICAgd2hpbGUgKG5leHRcbiAgICAgICAgJiYgKG5leHQubm9kZVR5cGUgIT0gdGhpcy5FTEVNRU5UX05PREUpXG4gICAgICAgICYmIHRoaXMuUkVHRVhQUy53aGl0ZXNwYWNlLnRlc3QobmV4dC50ZXh0Q29udGVudCkpIHtcbiAgICAgIG5leHQgPSBuZXh0Lm5leHRTaWJsaW5nO1xuICAgIH1cbiAgICByZXR1cm4gbmV4dDtcbiAgfSxcblxuICAvKipcbiAgICogUmVwbGFjZXMgMiBvciBtb3JlIHN1Y2Nlc3NpdmUgPGJyPiBlbGVtZW50cyB3aXRoIGEgc2luZ2xlIDxwPi5cbiAgICogV2hpdGVzcGFjZSBiZXR3ZWVuIDxicj4gZWxlbWVudHMgYXJlIGlnbm9yZWQuIEZvciBleGFtcGxlOlxuICAgKiAgIDxkaXY+Zm9vPGJyPmJhcjxicj4gPGJyPjxicj5hYmM8L2Rpdj5cbiAgICogd2lsbCBiZWNvbWU6XG4gICAqICAgPGRpdj5mb288YnI+YmFyPHA+YWJjPC9wPjwvZGl2PlxuICAgKi9cbiAgX3JlcGxhY2VCcnM6IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgdGhpcy5fZm9yRWFjaE5vZGUodGhpcy5fZ2V0QWxsTm9kZXNXaXRoVGFnKGVsZW0sIFtcImJyXCJdKSwgZnVuY3Rpb24oYnIpIHtcbiAgICAgIHZhciBuZXh0ID0gYnIubmV4dFNpYmxpbmc7XG5cbiAgICAgIC8vIFdoZXRoZXIgMiBvciBtb3JlIDxicj4gZWxlbWVudHMgaGF2ZSBiZWVuIGZvdW5kIGFuZCByZXBsYWNlZCB3aXRoIGFcbiAgICAgIC8vIDxwPiBibG9jay5cbiAgICAgIHZhciByZXBsYWNlZCA9IGZhbHNlO1xuXG4gICAgICAvLyBJZiB3ZSBmaW5kIGEgPGJyPiBjaGFpbiwgcmVtb3ZlIHRoZSA8YnI+cyB1bnRpbCB3ZSBoaXQgYW5vdGhlciBub2RlXG4gICAgICAvLyBvciBub24td2hpdGVzcGFjZS4gVGhpcyBsZWF2ZXMgYmVoaW5kIHRoZSBmaXJzdCA8YnI+IGluIHRoZSBjaGFpblxuICAgICAgLy8gKHdoaWNoIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCBhIDxwPiBsYXRlcikuXG4gICAgICB3aGlsZSAoKG5leHQgPSB0aGlzLl9uZXh0Tm9kZShuZXh0KSkgJiYgKG5leHQudGFnTmFtZSA9PSBcIkJSXCIpKSB7XG4gICAgICAgIHJlcGxhY2VkID0gdHJ1ZTtcbiAgICAgICAgdmFyIGJyU2libGluZyA9IG5leHQubmV4dFNpYmxpbmc7XG4gICAgICAgIG5leHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChuZXh0KTtcbiAgICAgICAgbmV4dCA9IGJyU2libGluZztcbiAgICAgIH1cblxuICAgICAgLy8gSWYgd2UgcmVtb3ZlZCBhIDxicj4gY2hhaW4sIHJlcGxhY2UgdGhlIHJlbWFpbmluZyA8YnI+IHdpdGggYSA8cD4uIEFkZFxuICAgICAgLy8gYWxsIHNpYmxpbmcgbm9kZXMgYXMgY2hpbGRyZW4gb2YgdGhlIDxwPiB1bnRpbCB3ZSBoaXQgYW5vdGhlciA8YnI+XG4gICAgICAvLyBjaGFpbi5cbiAgICAgIGlmIChyZXBsYWNlZCkge1xuICAgICAgICB2YXIgcCA9IHRoaXMuX2RvYy5jcmVhdGVFbGVtZW50KFwicFwiKTtcbiAgICAgICAgYnIucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQocCwgYnIpO1xuXG4gICAgICAgIG5leHQgPSBwLm5leHRTaWJsaW5nO1xuICAgICAgICB3aGlsZSAobmV4dCkge1xuICAgICAgICAgIC8vIElmIHdlJ3ZlIGhpdCBhbm90aGVyIDxicj48YnI+LCB3ZSdyZSBkb25lIGFkZGluZyBjaGlsZHJlbiB0byB0aGlzIDxwPi5cbiAgICAgICAgICBpZiAobmV4dC50YWdOYW1lID09IFwiQlJcIikge1xuICAgICAgICAgICAgdmFyIG5leHRFbGVtID0gdGhpcy5fbmV4dE5vZGUobmV4dC5uZXh0U2libGluZyk7XG4gICAgICAgICAgICBpZiAobmV4dEVsZW0gJiYgbmV4dEVsZW0udGFnTmFtZSA9PSBcIkJSXCIpXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghdGhpcy5faXNQaHJhc2luZ0NvbnRlbnQobmV4dCkpXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIC8vIE90aGVyd2lzZSwgbWFrZSB0aGlzIG5vZGUgYSBjaGlsZCBvZiB0aGUgbmV3IDxwPi5cbiAgICAgICAgICB2YXIgc2libGluZyA9IG5leHQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgcC5hcHBlbmRDaGlsZChuZXh0KTtcbiAgICAgICAgICBuZXh0ID0gc2libGluZztcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChwLmxhc3RDaGlsZCAmJiB0aGlzLl9pc1doaXRlc3BhY2UocC5sYXN0Q2hpbGQpKSB7XG4gICAgICAgICAgcC5yZW1vdmVDaGlsZChwLmxhc3RDaGlsZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocC5wYXJlbnROb2RlLnRhZ05hbWUgPT09IFwiUFwiKVxuICAgICAgICAgIHRoaXMuX3NldE5vZGVUYWcocC5wYXJlbnROb2RlLCBcIkRJVlwiKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBfc2V0Tm9kZVRhZzogZnVuY3Rpb24gKG5vZGUsIHRhZykge1xuICAgIHRoaXMubG9nKFwiX3NldE5vZGVUYWdcIiwgbm9kZSwgdGFnKTtcbiAgICBpZiAodGhpcy5fZG9jSlNET01QYXJzZXIpIHtcbiAgICAgIG5vZGUubG9jYWxOYW1lID0gdGFnLnRvTG93ZXJDYXNlKCk7XG4gICAgICBub2RlLnRhZ05hbWUgPSB0YWcudG9VcHBlckNhc2UoKTtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cblxuICAgIHZhciByZXBsYWNlbWVudCA9IG5vZGUub3duZXJEb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZyk7XG4gICAgd2hpbGUgKG5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgcmVwbGFjZW1lbnQuYXBwZW5kQ2hpbGQobm9kZS5maXJzdENoaWxkKTtcbiAgICB9XG4gICAgbm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChyZXBsYWNlbWVudCwgbm9kZSk7XG4gICAgaWYgKG5vZGUucmVhZGFiaWxpdHkpXG4gICAgICByZXBsYWNlbWVudC5yZWFkYWJpbGl0eSA9IG5vZGUucmVhZGFiaWxpdHk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGUuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVwbGFjZW1lbnQuc2V0QXR0cmlidXRlKG5vZGUuYXR0cmlidXRlc1tpXS5uYW1lLCBub2RlLmF0dHJpYnV0ZXNbaV0udmFsdWUpO1xuICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgLyogaXQncyBwb3NzaWJsZSBmb3Igc2V0QXR0cmlidXRlKCkgdG8gdGhyb3cgaWYgdGhlIGF0dHJpYnV0ZSBuYW1lXG4gICAgICAgICAqIGlzbid0IGEgdmFsaWQgWE1MIE5hbWUuIFN1Y2ggYXR0cmlidXRlcyBjYW4gaG93ZXZlciBiZSBwYXJzZWQgZnJvbVxuICAgICAgICAgKiBzb3VyY2UgaW4gSFRNTCBkb2NzLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3doYXR3Zy9odG1sL2lzc3Vlcy80Mjc1LFxuICAgICAgICAgKiBzbyB3ZSBjYW4gaGl0IHRoZW0gaGVyZSBhbmQgdGhlbiB0aHJvdy4gV2UgZG9uJ3QgY2FyZSBhYm91dCBzdWNoXG4gICAgICAgICAqIGF0dHJpYnV0ZXMgc28gd2UgaWdub3JlIHRoZW0uXG4gICAgICAgICAqL1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVwbGFjZW1lbnQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFByZXBhcmUgdGhlIGFydGljbGUgbm9kZSBmb3IgZGlzcGxheS4gQ2xlYW4gb3V0IGFueSBpbmxpbmUgc3R5bGVzLFxuICAgKiBpZnJhbWVzLCBmb3Jtcywgc3RyaXAgZXh0cmFuZW91cyA8cD4gdGFncywgZXRjLlxuICAgKlxuICAgKiBAcGFyYW0gRWxlbWVudFxuICAgKiBAcmV0dXJuIHZvaWRcbiAgICoqL1xuICBfcHJlcEFydGljbGU6IGZ1bmN0aW9uKGFydGljbGVDb250ZW50KSB7XG4gICAgdGhpcy5fY2xlYW5TdHlsZXMoYXJ0aWNsZUNvbnRlbnQpO1xuXG4gICAgLy8gQ2hlY2sgZm9yIGRhdGEgdGFibGVzIGJlZm9yZSB3ZSBjb250aW51ZSwgdG8gYXZvaWQgcmVtb3ZpbmcgaXRlbXMgaW5cbiAgICAvLyB0aG9zZSB0YWJsZXMsIHdoaWNoIHdpbGwgb2Z0ZW4gYmUgaXNvbGF0ZWQgZXZlbiB0aG91Z2ggdGhleSdyZVxuICAgIC8vIHZpc3VhbGx5IGxpbmtlZCB0byBvdGhlciBjb250ZW50LWZ1bCBlbGVtZW50cyAodGV4dCwgaW1hZ2VzLCBldGMuKS5cbiAgICB0aGlzLl9tYXJrRGF0YVRhYmxlcyhhcnRpY2xlQ29udGVudCk7XG5cbiAgICB0aGlzLl9maXhMYXp5SW1hZ2VzKGFydGljbGVDb250ZW50KTtcblxuICAgIC8vIENsZWFuIG91dCBqdW5rIGZyb20gdGhlIGFydGljbGUgY29udGVudFxuICAgIHRoaXMuX2NsZWFuQ29uZGl0aW9uYWxseShhcnRpY2xlQ29udGVudCwgXCJmb3JtXCIpO1xuICAgIHRoaXMuX2NsZWFuQ29uZGl0aW9uYWxseShhcnRpY2xlQ29udGVudCwgXCJmaWVsZHNldFwiKTtcbiAgICB0aGlzLl9jbGVhbihhcnRpY2xlQ29udGVudCwgXCJvYmplY3RcIik7XG4gICAgdGhpcy5fY2xlYW4oYXJ0aWNsZUNvbnRlbnQsIFwiZW1iZWRcIik7XG4gICAgdGhpcy5fY2xlYW4oYXJ0aWNsZUNvbnRlbnQsIFwiZm9vdGVyXCIpO1xuICAgIHRoaXMuX2NsZWFuKGFydGljbGVDb250ZW50LCBcImxpbmtcIik7XG4gICAgdGhpcy5fY2xlYW4oYXJ0aWNsZUNvbnRlbnQsIFwiYXNpZGVcIik7XG5cbiAgICAvLyBDbGVhbiBvdXQgZWxlbWVudHMgd2l0aCBsaXR0bGUgY29udGVudCB0aGF0IGhhdmUgXCJzaGFyZVwiIGluIHRoZWlyIGlkL2NsYXNzIGNvbWJpbmF0aW9ucyBmcm9tIGZpbmFsIHRvcCBjYW5kaWRhdGVzLFxuICAgIC8vIHdoaWNoIG1lYW5zIHdlIGRvbid0IHJlbW92ZSB0aGUgdG9wIGNhbmRpZGF0ZXMgZXZlbiB0aGV5IGhhdmUgXCJzaGFyZVwiLlxuXG4gICAgdmFyIHNoYXJlRWxlbWVudFRocmVzaG9sZCA9IHRoaXMuREVGQVVMVF9DSEFSX1RIUkVTSE9MRDtcblxuICAgIHRoaXMuX2ZvckVhY2hOb2RlKGFydGljbGVDb250ZW50LmNoaWxkcmVuLCBmdW5jdGlvbiAodG9wQ2FuZGlkYXRlKSB7XG4gICAgICB0aGlzLl9jbGVhbk1hdGNoZWROb2Rlcyh0b3BDYW5kaWRhdGUsIGZ1bmN0aW9uIChub2RlLCBtYXRjaFN0cmluZykge1xuICAgICAgICByZXR1cm4gdGhpcy5SRUdFWFBTLnNoYXJlRWxlbWVudHMudGVzdChtYXRjaFN0cmluZykgJiYgbm9kZS50ZXh0Q29udGVudC5sZW5ndGggPCBzaGFyZUVsZW1lbnRUaHJlc2hvbGQ7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRoaXMuX2NsZWFuKGFydGljbGVDb250ZW50LCBcImlmcmFtZVwiKTtcbiAgICB0aGlzLl9jbGVhbihhcnRpY2xlQ29udGVudCwgXCJpbnB1dFwiKTtcbiAgICB0aGlzLl9jbGVhbihhcnRpY2xlQ29udGVudCwgXCJ0ZXh0YXJlYVwiKTtcbiAgICB0aGlzLl9jbGVhbihhcnRpY2xlQ29udGVudCwgXCJzZWxlY3RcIik7XG4gICAgdGhpcy5fY2xlYW4oYXJ0aWNsZUNvbnRlbnQsIFwiYnV0dG9uXCIpO1xuICAgIHRoaXMuX2NsZWFuSGVhZGVycyhhcnRpY2xlQ29udGVudCk7XG5cbiAgICAvLyBEbyB0aGVzZSBsYXN0IGFzIHRoZSBwcmV2aW91cyBzdHVmZiBtYXkgaGF2ZSByZW1vdmVkIGp1bmtcbiAgICAvLyB0aGF0IHdpbGwgYWZmZWN0IHRoZXNlXG4gICAgdGhpcy5fY2xlYW5Db25kaXRpb25hbGx5KGFydGljbGVDb250ZW50LCBcInRhYmxlXCIpO1xuICAgIHRoaXMuX2NsZWFuQ29uZGl0aW9uYWxseShhcnRpY2xlQ29udGVudCwgXCJ1bFwiKTtcbiAgICB0aGlzLl9jbGVhbkNvbmRpdGlvbmFsbHkoYXJ0aWNsZUNvbnRlbnQsIFwiZGl2XCIpO1xuXG4gICAgLy8gcmVwbGFjZSBIMSB3aXRoIEgyIGFzIEgxIHNob3VsZCBiZSBvbmx5IHRpdGxlIHRoYXQgaXMgZGlzcGxheWVkIHNlcGFyYXRlbHlcbiAgICB0aGlzLl9yZXBsYWNlTm9kZVRhZ3ModGhpcy5fZ2V0QWxsTm9kZXNXaXRoVGFnKGFydGljbGVDb250ZW50LCBbXCJoMVwiXSksIFwiaDJcIik7XG5cbiAgICAvLyBSZW1vdmUgZXh0cmEgcGFyYWdyYXBoc1xuICAgIHRoaXMuX3JlbW92ZU5vZGVzKHRoaXMuX2dldEFsbE5vZGVzV2l0aFRhZyhhcnRpY2xlQ29udGVudCwgW1wicFwiXSksIGZ1bmN0aW9uIChwYXJhZ3JhcGgpIHtcbiAgICAgIHZhciBpbWdDb3VudCA9IHBhcmFncmFwaC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImltZ1wiKS5sZW5ndGg7XG4gICAgICB2YXIgZW1iZWRDb3VudCA9IHBhcmFncmFwaC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImVtYmVkXCIpLmxlbmd0aDtcbiAgICAgIHZhciBvYmplY3RDb3VudCA9IHBhcmFncmFwaC5nZXRFbGVtZW50c0J5VGFnTmFtZShcIm9iamVjdFwiKS5sZW5ndGg7XG4gICAgICAvLyBBdCB0aGlzIHBvaW50LCBuYXN0eSBpZnJhbWVzIGhhdmUgYmVlbiByZW1vdmVkLCBvbmx5IHJlbWFpbiBlbWJlZGRlZCB2aWRlbyBvbmVzLlxuICAgICAgdmFyIGlmcmFtZUNvdW50ID0gcGFyYWdyYXBoLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaWZyYW1lXCIpLmxlbmd0aDtcbiAgICAgIHZhciB0b3RhbENvdW50ID0gaW1nQ291bnQgKyBlbWJlZENvdW50ICsgb2JqZWN0Q291bnQgKyBpZnJhbWVDb3VudDtcblxuICAgICAgcmV0dXJuIHRvdGFsQ291bnQgPT09IDAgJiYgIXRoaXMuX2dldElubmVyVGV4dChwYXJhZ3JhcGgsIGZhbHNlKTtcbiAgICB9KTtcblxuICAgIHRoaXMuX2ZvckVhY2hOb2RlKHRoaXMuX2dldEFsbE5vZGVzV2l0aFRhZyhhcnRpY2xlQ29udGVudCwgW1wiYnJcIl0pLCBmdW5jdGlvbihicikge1xuICAgICAgdmFyIG5leHQgPSB0aGlzLl9uZXh0Tm9kZShici5uZXh0U2libGluZyk7XG4gICAgICBpZiAobmV4dCAmJiBuZXh0LnRhZ05hbWUgPT0gXCJQXCIpXG4gICAgICAgIGJyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoYnIpO1xuICAgIH0pO1xuXG4gICAgLy8gUmVtb3ZlIHNpbmdsZS1jZWxsIHRhYmxlc1xuICAgIHRoaXMuX2ZvckVhY2hOb2RlKHRoaXMuX2dldEFsbE5vZGVzV2l0aFRhZyhhcnRpY2xlQ29udGVudCwgW1widGFibGVcIl0pLCBmdW5jdGlvbih0YWJsZSkge1xuICAgICAgdmFyIHRib2R5ID0gdGhpcy5faGFzU2luZ2xlVGFnSW5zaWRlRWxlbWVudCh0YWJsZSwgXCJUQk9EWVwiKSA/IHRhYmxlLmZpcnN0RWxlbWVudENoaWxkIDogdGFibGU7XG4gICAgICBpZiAodGhpcy5faGFzU2luZ2xlVGFnSW5zaWRlRWxlbWVudCh0Ym9keSwgXCJUUlwiKSkge1xuICAgICAgICB2YXIgcm93ID0gdGJvZHkuZmlyc3RFbGVtZW50Q2hpbGQ7XG4gICAgICAgIGlmICh0aGlzLl9oYXNTaW5nbGVUYWdJbnNpZGVFbGVtZW50KHJvdywgXCJURFwiKSkge1xuICAgICAgICAgIHZhciBjZWxsID0gcm93LmZpcnN0RWxlbWVudENoaWxkO1xuICAgICAgICAgIGNlbGwgPSB0aGlzLl9zZXROb2RlVGFnKGNlbGwsIHRoaXMuX2V2ZXJ5Tm9kZShjZWxsLmNoaWxkTm9kZXMsIHRoaXMuX2lzUGhyYXNpbmdDb250ZW50KSA/IFwiUFwiIDogXCJESVZcIik7XG4gICAgICAgICAgdGFibGUucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoY2VsbCwgdGFibGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYSBub2RlIHdpdGggdGhlIHJlYWRhYmlsaXR5IG9iamVjdC4gQWxzbyBjaGVja3MgdGhlXG4gICAqIGNsYXNzTmFtZS9pZCBmb3Igc3BlY2lhbCBuYW1lcyB0byBhZGQgdG8gaXRzIHNjb3JlLlxuICAgKlxuICAgKiBAcGFyYW0gRWxlbWVudFxuICAgKiBAcmV0dXJuIHZvaWRcbiAgKiovXG4gIF9pbml0aWFsaXplTm9kZTogZnVuY3Rpb24obm9kZSkge1xuICAgIG5vZGUucmVhZGFiaWxpdHkgPSB7XCJjb250ZW50U2NvcmVcIjogMH07XG5cbiAgICBzd2l0Y2ggKG5vZGUudGFnTmFtZSkge1xuICAgICAgY2FzZSBcIkRJVlwiOlxuICAgICAgICBub2RlLnJlYWRhYmlsaXR5LmNvbnRlbnRTY29yZSArPSA1O1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBcIlBSRVwiOlxuICAgICAgY2FzZSBcIlREXCI6XG4gICAgICBjYXNlIFwiQkxPQ0tRVU9URVwiOlxuICAgICAgICBub2RlLnJlYWRhYmlsaXR5LmNvbnRlbnRTY29yZSArPSAzO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBcIkFERFJFU1NcIjpcbiAgICAgIGNhc2UgXCJPTFwiOlxuICAgICAgY2FzZSBcIlVMXCI6XG4gICAgICBjYXNlIFwiRExcIjpcbiAgICAgIGNhc2UgXCJERFwiOlxuICAgICAgY2FzZSBcIkRUXCI6XG4gICAgICBjYXNlIFwiTElcIjpcbiAgICAgIGNhc2UgXCJGT1JNXCI6XG4gICAgICAgIG5vZGUucmVhZGFiaWxpdHkuY29udGVudFNjb3JlIC09IDM7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiSDFcIjpcbiAgICAgIGNhc2UgXCJIMlwiOlxuICAgICAgY2FzZSBcIkgzXCI6XG4gICAgICBjYXNlIFwiSDRcIjpcbiAgICAgIGNhc2UgXCJINVwiOlxuICAgICAgY2FzZSBcIkg2XCI6XG4gICAgICBjYXNlIFwiVEhcIjpcbiAgICAgICAgbm9kZS5yZWFkYWJpbGl0eS5jb250ZW50U2NvcmUgLT0gNTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgbm9kZS5yZWFkYWJpbGl0eS5jb250ZW50U2NvcmUgKz0gdGhpcy5fZ2V0Q2xhc3NXZWlnaHQobm9kZSk7XG4gIH0sXG5cbiAgX3JlbW92ZUFuZEdldE5leHQ6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgbmV4dE5vZGUgPSB0aGlzLl9nZXROZXh0Tm9kZShub2RlLCB0cnVlKTtcbiAgICBub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgcmV0dXJuIG5leHROb2RlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUcmF2ZXJzZSB0aGUgRE9NIGZyb20gbm9kZSB0byBub2RlLCBzdGFydGluZyBhdCB0aGUgbm9kZSBwYXNzZWQgaW4uXG4gICAqIFBhc3MgdHJ1ZSBmb3IgdGhlIHNlY29uZCBwYXJhbWV0ZXIgdG8gaW5kaWNhdGUgdGhpcyBub2RlIGl0c2VsZlxuICAgKiAoYW5kIGl0cyBraWRzKSBhcmUgZ29pbmcgYXdheSwgYW5kIHdlIHdhbnQgdGhlIG5leHQgbm9kZSBvdmVyLlxuICAgKlxuICAgKiBDYWxsaW5nIHRoaXMgaW4gYSBsb29wIHdpbGwgdHJhdmVyc2UgdGhlIERPTSBkZXB0aC1maXJzdC5cbiAgICovXG4gIF9nZXROZXh0Tm9kZTogZnVuY3Rpb24obm9kZSwgaWdub3JlU2VsZkFuZEtpZHMpIHtcbiAgICAvLyBGaXJzdCBjaGVjayBmb3Iga2lkcyBpZiB0aG9zZSBhcmVuJ3QgYmVpbmcgaWdub3JlZFxuICAgIGlmICghaWdub3JlU2VsZkFuZEtpZHMgJiYgbm9kZS5maXJzdEVsZW1lbnRDaGlsZCkge1xuICAgICAgcmV0dXJuIG5vZGUuZmlyc3RFbGVtZW50Q2hpbGQ7XG4gICAgfVxuICAgIC8vIFRoZW4gZm9yIHNpYmxpbmdzLi4uXG4gICAgaWYgKG5vZGUubmV4dEVsZW1lbnRTaWJsaW5nKSB7XG4gICAgICByZXR1cm4gbm9kZS5uZXh0RWxlbWVudFNpYmxpbmc7XG4gICAgfVxuICAgIC8vIEFuZCBmaW5hbGx5LCBtb3ZlIHVwIHRoZSBwYXJlbnQgY2hhaW4gKmFuZCogZmluZCBhIHNpYmxpbmdcbiAgICAvLyAoYmVjYXVzZSB0aGlzIGlzIGRlcHRoLWZpcnN0IHRyYXZlcnNhbCwgd2Ugd2lsbCBoYXZlIGFscmVhZHlcbiAgICAvLyBzZWVuIHRoZSBwYXJlbnQgbm9kZXMgdGhlbXNlbHZlcykuXG4gICAgZG8ge1xuICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICB9IHdoaWxlIChub2RlICYmICFub2RlLm5leHRFbGVtZW50U2libGluZyk7XG4gICAgcmV0dXJuIG5vZGUgJiYgbm9kZS5uZXh0RWxlbWVudFNpYmxpbmc7XG4gIH0sXG5cbiAgLy8gY29tcGFyZXMgc2Vjb25kIHRleHQgdG8gZmlyc3Qgb25lXG4gIC8vIDEgPSBzYW1lIHRleHQsIDAgPSBjb21wbGV0ZWx5IGRpZmZlcmVudCB0ZXh0XG4gIC8vIHdvcmtzIHRoZSB3YXkgdGhhdCBpdCBzcGxpdHMgYm90aCB0ZXh0cyBpbnRvIHdvcmRzIGFuZCB0aGVuIGZpbmRzIHdvcmRzIHRoYXQgYXJlIHVuaXF1ZSBpbiBzZWNvbmQgdGV4dFxuICAvLyB0aGUgcmVzdWx0IGlzIGdpdmVuIGJ5IHRoZSBsb3dlciBsZW5ndGggb2YgdW5pcXVlIHBhcnRzXG4gIF90ZXh0U2ltaWxhcml0eTogZnVuY3Rpb24odGV4dEEsIHRleHRCKSB7XG4gICAgdmFyIHRva2Vuc0EgPSB0ZXh0QS50b0xvd2VyQ2FzZSgpLnNwbGl0KHRoaXMuUkVHRVhQUy50b2tlbml6ZSkuZmlsdGVyKEJvb2xlYW4pO1xuICAgIHZhciB0b2tlbnNCID0gdGV4dEIudG9Mb3dlckNhc2UoKS5zcGxpdCh0aGlzLlJFR0VYUFMudG9rZW5pemUpLmZpbHRlcihCb29sZWFuKTtcbiAgICBpZiAoIXRva2Vuc0EubGVuZ3RoIHx8ICF0b2tlbnNCLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHZhciB1bmlxVG9rZW5zQiA9IHRva2Vuc0IuZmlsdGVyKHRva2VuID0+ICF0b2tlbnNBLmluY2x1ZGVzKHRva2VuKSk7XG4gICAgdmFyIGRpc3RhbmNlQiA9IHVuaXFUb2tlbnNCLmpvaW4oXCIgXCIpLmxlbmd0aCAvIHRva2Vuc0Iuam9pbihcIiBcIikubGVuZ3RoO1xuICAgIHJldHVybiAxIC0gZGlzdGFuY2VCO1xuICB9LFxuXG4gIF9jaGVja0J5bGluZTogZnVuY3Rpb24obm9kZSwgbWF0Y2hTdHJpbmcpIHtcbiAgICBpZiAodGhpcy5fYXJ0aWNsZUJ5bGluZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChub2RlLmdldEF0dHJpYnV0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgcmVsID0gbm9kZS5nZXRBdHRyaWJ1dGUoXCJyZWxcIik7XG4gICAgICB2YXIgaXRlbXByb3AgPSBub2RlLmdldEF0dHJpYnV0ZShcIml0ZW1wcm9wXCIpO1xuICAgIH1cblxuICAgIGlmICgocmVsID09PSBcImF1dGhvclwiIHx8IChpdGVtcHJvcCAmJiBpdGVtcHJvcC5pbmRleE9mKFwiYXV0aG9yXCIpICE9PSAtMSkgfHwgdGhpcy5SRUdFWFBTLmJ5bGluZS50ZXN0KG1hdGNoU3RyaW5nKSkgJiYgdGhpcy5faXNWYWxpZEJ5bGluZShub2RlLnRleHRDb250ZW50KSkge1xuICAgICAgdGhpcy5fYXJ0aWNsZUJ5bGluZSA9IG5vZGUudGV4dENvbnRlbnQudHJpbSgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIF9nZXROb2RlQW5jZXN0b3JzOiBmdW5jdGlvbihub2RlLCBtYXhEZXB0aCkge1xuICAgIG1heERlcHRoID0gbWF4RGVwdGggfHwgMDtcbiAgICB2YXIgaSA9IDAsIGFuY2VzdG9ycyA9IFtdO1xuICAgIHdoaWxlIChub2RlLnBhcmVudE5vZGUpIHtcbiAgICAgIGFuY2VzdG9ycy5wdXNoKG5vZGUucGFyZW50Tm9kZSk7XG4gICAgICBpZiAobWF4RGVwdGggJiYgKytpID09PSBtYXhEZXB0aClcbiAgICAgICAgYnJlYWs7XG4gICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gYW5jZXN0b3JzO1xuICB9LFxuXG4gIC8qKipcbiAgICogZ3JhYkFydGljbGUgLSBVc2luZyBhIHZhcmlldHkgb2YgbWV0cmljcyAoY29udGVudCBzY29yZSwgY2xhc3NuYW1lLCBlbGVtZW50IHR5cGVzKSwgZmluZCB0aGUgY29udGVudCB0aGF0IGlzXG4gICAqICAgICAgICAgbW9zdCBsaWtlbHkgdG8gYmUgdGhlIHN0dWZmIGEgdXNlciB3YW50cyB0byByZWFkLiBUaGVuIHJldHVybiBpdCB3cmFwcGVkIHVwIGluIGEgZGl2LlxuICAgKlxuICAgKiBAcGFyYW0gcGFnZSBhIGRvY3VtZW50IHRvIHJ1biB1cG9uLiBOZWVkcyB0byBiZSBhIGZ1bGwgZG9jdW1lbnQsIGNvbXBsZXRlIHdpdGggYm9keS5cbiAgICogQHJldHVybiBFbGVtZW50XG4gICoqL1xuICBfZ3JhYkFydGljbGU6IGZ1bmN0aW9uIChwYWdlKSB7XG4gICAgdGhpcy5sb2coXCIqKioqIGdyYWJBcnRpY2xlICoqKipcIik7XG4gICAgdmFyIGRvYyA9IHRoaXMuX2RvYztcbiAgICB2YXIgaXNQYWdpbmcgPSBwYWdlICE9PSBudWxsO1xuICAgIHBhZ2UgPSBwYWdlID8gcGFnZSA6IHRoaXMuX2RvYy5ib2R5O1xuXG4gICAgLy8gV2UgY2FuJ3QgZ3JhYiBhbiBhcnRpY2xlIGlmIHdlIGRvbid0IGhhdmUgYSBwYWdlIVxuICAgIGlmICghcGFnZSkge1xuICAgICAgdGhpcy5sb2coXCJObyBib2R5IGZvdW5kIGluIGRvY3VtZW50LiBBYm9ydC5cIik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgcGFnZUNhY2hlSHRtbCA9IHBhZ2UuaW5uZXJIVE1MO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHRoaXMubG9nKFwiU3RhcnRpbmcgZ3JhYkFydGljbGUgbG9vcFwiKTtcbiAgICAgIHZhciBzdHJpcFVubGlrZWx5Q2FuZGlkYXRlcyA9IHRoaXMuX2ZsYWdJc0FjdGl2ZSh0aGlzLkZMQUdfU1RSSVBfVU5MSUtFTFlTKTtcblxuICAgICAgLy8gRmlyc3QsIG5vZGUgcHJlcHBpbmcuIFRyYXNoIG5vZGVzIHRoYXQgbG9vayBjcnVkZHkgKGxpa2Ugb25lcyB3aXRoIHRoZVxuICAgICAgLy8gY2xhc3MgbmFtZSBcImNvbW1lbnRcIiwgZXRjKSwgYW5kIHR1cm4gZGl2cyBpbnRvIFAgdGFncyB3aGVyZSB0aGV5IGhhdmUgYmVlblxuICAgICAgLy8gdXNlZCBpbmFwcHJvcHJpYXRlbHkgKGFzIGluLCB3aGVyZSB0aGV5IGNvbnRhaW4gbm8gb3RoZXIgYmxvY2sgbGV2ZWwgZWxlbWVudHMuKVxuICAgICAgdmFyIGVsZW1lbnRzVG9TY29yZSA9IFtdO1xuICAgICAgdmFyIG5vZGUgPSB0aGlzLl9kb2MuZG9jdW1lbnRFbGVtZW50O1xuXG4gICAgICBsZXQgc2hvdWxkUmVtb3ZlVGl0bGVIZWFkZXIgPSB0cnVlO1xuXG4gICAgICB3aGlsZSAobm9kZSkge1xuXG4gICAgICAgIGlmIChub2RlLnRhZ05hbWUgPT09IFwiSFRNTFwiKSB7XG4gICAgICAgICAgdGhpcy5fYXJ0aWNsZUxhbmcgPSBub2RlLmdldEF0dHJpYnV0ZShcImxhbmdcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbWF0Y2hTdHJpbmcgPSBub2RlLmNsYXNzTmFtZSArIFwiIFwiICsgbm9kZS5pZDtcblxuICAgICAgICBpZiAoIXRoaXMuX2lzUHJvYmFibHlWaXNpYmxlKG5vZGUpKSB7XG4gICAgICAgICAgdGhpcy5sb2coXCJSZW1vdmluZyBoaWRkZW4gbm9kZSAtIFwiICsgbWF0Y2hTdHJpbmcpO1xuICAgICAgICAgIG5vZGUgPSB0aGlzLl9yZW1vdmVBbmRHZXROZXh0KG5vZGUpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoaXMgbm9kZSBpcyBhIGJ5bGluZSwgYW5kIHJlbW92ZSBpdCBpZiBpdCBpcy5cbiAgICAgICAgaWYgKHRoaXMuX2NoZWNrQnlsaW5lKG5vZGUsIG1hdGNoU3RyaW5nKSkge1xuICAgICAgICAgIG5vZGUgPSB0aGlzLl9yZW1vdmVBbmRHZXROZXh0KG5vZGUpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNob3VsZFJlbW92ZVRpdGxlSGVhZGVyICYmIHRoaXMuX2hlYWRlckR1cGxpY2F0ZXNUaXRsZShub2RlKSkge1xuICAgICAgICAgIHRoaXMubG9nKFwiUmVtb3ZpbmcgaGVhZGVyOiBcIiwgbm9kZS50ZXh0Q29udGVudC50cmltKCksIHRoaXMuX2FydGljbGVUaXRsZS50cmltKCkpO1xuICAgICAgICAgIHNob3VsZFJlbW92ZVRpdGxlSGVhZGVyID0gZmFsc2U7XG4gICAgICAgICAgbm9kZSA9IHRoaXMuX3JlbW92ZUFuZEdldE5leHQobm9kZSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW1vdmUgdW5saWtlbHkgY2FuZGlkYXRlc1xuICAgICAgICBpZiAoc3RyaXBVbmxpa2VseUNhbmRpZGF0ZXMpIHtcbiAgICAgICAgICBpZiAodGhpcy5SRUdFWFBTLnVubGlrZWx5Q2FuZGlkYXRlcy50ZXN0KG1hdGNoU3RyaW5nKSAmJlxuICAgICAgICAgICAgICAhdGhpcy5SRUdFWFBTLm9rTWF5YmVJdHNBQ2FuZGlkYXRlLnRlc3QobWF0Y2hTdHJpbmcpICYmXG4gICAgICAgICAgICAgICF0aGlzLl9oYXNBbmNlc3RvclRhZyhub2RlLCBcInRhYmxlXCIpICYmXG4gICAgICAgICAgICAgICF0aGlzLl9oYXNBbmNlc3RvclRhZyhub2RlLCBcImNvZGVcIikgJiZcbiAgICAgICAgICAgICAgbm9kZS50YWdOYW1lICE9PSBcIkJPRFlcIiAmJlxuICAgICAgICAgICAgICBub2RlLnRhZ05hbWUgIT09IFwiQVwiKSB7XG4gICAgICAgICAgICB0aGlzLmxvZyhcIlJlbW92aW5nIHVubGlrZWx5IGNhbmRpZGF0ZSAtIFwiICsgbWF0Y2hTdHJpbmcpO1xuICAgICAgICAgICAgbm9kZSA9IHRoaXMuX3JlbW92ZUFuZEdldE5leHQobm9kZSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodGhpcy5VTkxJS0VMWV9ST0xFUy5pbmNsdWRlcyhub2RlLmdldEF0dHJpYnV0ZShcInJvbGVcIikpKSB7XG4gICAgICAgICAgICB0aGlzLmxvZyhcIlJlbW92aW5nIGNvbnRlbnQgd2l0aCByb2xlIFwiICsgbm9kZS5nZXRBdHRyaWJ1dGUoXCJyb2xlXCIpICsgXCIgLSBcIiArIG1hdGNoU3RyaW5nKTtcbiAgICAgICAgICAgIG5vZGUgPSB0aGlzLl9yZW1vdmVBbmRHZXROZXh0KG5vZGUpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIERJViwgU0VDVElPTiwgYW5kIEhFQURFUiBub2RlcyB3aXRob3V0IGFueSBjb250ZW50KGUuZy4gdGV4dCwgaW1hZ2UsIHZpZGVvLCBvciBpZnJhbWUpLlxuICAgICAgICBpZiAoKG5vZGUudGFnTmFtZSA9PT0gXCJESVZcIiB8fCBub2RlLnRhZ05hbWUgPT09IFwiU0VDVElPTlwiIHx8IG5vZGUudGFnTmFtZSA9PT0gXCJIRUFERVJcIiB8fFxuICAgICAgICAgICAgIG5vZGUudGFnTmFtZSA9PT0gXCJIMVwiIHx8IG5vZGUudGFnTmFtZSA9PT0gXCJIMlwiIHx8IG5vZGUudGFnTmFtZSA9PT0gXCJIM1wiIHx8XG4gICAgICAgICAgICAgbm9kZS50YWdOYW1lID09PSBcIkg0XCIgfHwgbm9kZS50YWdOYW1lID09PSBcIkg1XCIgfHwgbm9kZS50YWdOYW1lID09PSBcIkg2XCIpICYmXG4gICAgICAgICAgICB0aGlzLl9pc0VsZW1lbnRXaXRob3V0Q29udGVudChub2RlKSkge1xuICAgICAgICAgIG5vZGUgPSB0aGlzLl9yZW1vdmVBbmRHZXROZXh0KG5vZGUpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuREVGQVVMVF9UQUdTX1RPX1NDT1JFLmluZGV4T2Yobm9kZS50YWdOYW1lKSAhPT0gLTEpIHtcbiAgICAgICAgICBlbGVtZW50c1RvU2NvcmUucHVzaChub2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFR1cm4gYWxsIGRpdnMgdGhhdCBkb24ndCBoYXZlIGNoaWxkcmVuIGJsb2NrIGxldmVsIGVsZW1lbnRzIGludG8gcCdzXG4gICAgICAgIGlmIChub2RlLnRhZ05hbWUgPT09IFwiRElWXCIpIHtcbiAgICAgICAgICAvLyBQdXQgcGhyYXNpbmcgY29udGVudCBpbnRvIHBhcmFncmFwaHMuXG4gICAgICAgICAgdmFyIHAgPSBudWxsO1xuICAgICAgICAgIHZhciBjaGlsZE5vZGUgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgd2hpbGUgKGNoaWxkTm9kZSkge1xuICAgICAgICAgICAgdmFyIG5leHRTaWJsaW5nID0gY2hpbGROb2RlLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzUGhyYXNpbmdDb250ZW50KGNoaWxkTm9kZSkpIHtcbiAgICAgICAgICAgICAgaWYgKHAgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBwLmFwcGVuZENoaWxkKGNoaWxkTm9kZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2lzV2hpdGVzcGFjZShjaGlsZE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgcCA9IGRvYy5jcmVhdGVFbGVtZW50KFwicFwiKTtcbiAgICAgICAgICAgICAgICBub2RlLnJlcGxhY2VDaGlsZChwLCBjaGlsZE5vZGUpO1xuICAgICAgICAgICAgICAgIHAuYXBwZW5kQ2hpbGQoY2hpbGROb2RlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHdoaWxlIChwLmxhc3RDaGlsZCAmJiB0aGlzLl9pc1doaXRlc3BhY2UocC5sYXN0Q2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgcC5yZW1vdmVDaGlsZChwLmxhc3RDaGlsZCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjaGlsZE5vZGUgPSBuZXh0U2libGluZztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTaXRlcyBsaWtlIGh0dHA6Ly9tb2JpbGUuc2xhdGUuY29tIGVuY2xvc2VzIGVhY2ggcGFyYWdyYXBoIHdpdGggYSBESVZcbiAgICAgICAgICAvLyBlbGVtZW50LiBESVZzIHdpdGggb25seSBhIFAgZWxlbWVudCBpbnNpZGUgYW5kIG5vIHRleHQgY29udGVudCBjYW4gYmVcbiAgICAgICAgICAvLyBzYWZlbHkgY29udmVydGVkIGludG8gcGxhaW4gUCBlbGVtZW50cyB0byBhdm9pZCBjb25mdXNpbmcgdGhlIHNjb3JpbmdcbiAgICAgICAgICAvLyBhbGdvcml0aG0gd2l0aCBESVZzIHdpdGggYXJlLCBpbiBwcmFjdGljZSwgcGFyYWdyYXBocy5cbiAgICAgICAgICBpZiAodGhpcy5faGFzU2luZ2xlVGFnSW5zaWRlRWxlbWVudChub2RlLCBcIlBcIikgJiYgdGhpcy5fZ2V0TGlua0RlbnNpdHkobm9kZSkgPCAwLjI1KSB7XG4gICAgICAgICAgICB2YXIgbmV3Tm9kZSA9IG5vZGUuY2hpbGRyZW5bMF07XG4gICAgICAgICAgICBub2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIG5vZGUpO1xuICAgICAgICAgICAgbm9kZSA9IG5ld05vZGU7XG4gICAgICAgICAgICBlbGVtZW50c1RvU2NvcmUucHVzaChub2RlKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLl9oYXNDaGlsZEJsb2NrRWxlbWVudChub2RlKSkge1xuICAgICAgICAgICAgbm9kZSA9IHRoaXMuX3NldE5vZGVUYWcobm9kZSwgXCJQXCIpO1xuICAgICAgICAgICAgZWxlbWVudHNUb1Njb3JlLnB1c2gobm9kZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG5vZGUgPSB0aGlzLl9nZXROZXh0Tm9kZShub2RlKTtcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBMb29wIHRocm91Z2ggYWxsIHBhcmFncmFwaHMsIGFuZCBhc3NpZ24gYSBzY29yZSB0byB0aGVtIGJhc2VkIG9uIGhvdyBjb250ZW50LXkgdGhleSBsb29rLlxuICAgICAgICogVGhlbiBhZGQgdGhlaXIgc2NvcmUgdG8gdGhlaXIgcGFyZW50IG5vZGUuXG4gICAgICAgKlxuICAgICAgICogQSBzY29yZSBpcyBkZXRlcm1pbmVkIGJ5IHRoaW5ncyBsaWtlIG51bWJlciBvZiBjb21tYXMsIGNsYXNzIG5hbWVzLCBldGMuIE1heWJlIGV2ZW50dWFsbHkgbGluayBkZW5zaXR5LlxuICAgICAgKiovXG4gICAgICB2YXIgY2FuZGlkYXRlcyA9IFtdO1xuICAgICAgdGhpcy5fZm9yRWFjaE5vZGUoZWxlbWVudHNUb1Njb3JlLCBmdW5jdGlvbihlbGVtZW50VG9TY29yZSkge1xuICAgICAgICBpZiAoIWVsZW1lbnRUb1Njb3JlLnBhcmVudE5vZGUgfHwgdHlwZW9mKGVsZW1lbnRUb1Njb3JlLnBhcmVudE5vZGUudGFnTmFtZSkgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIC8vIElmIHRoaXMgcGFyYWdyYXBoIGlzIGxlc3MgdGhhbiAyNSBjaGFyYWN0ZXJzLCBkb24ndCBldmVuIGNvdW50IGl0LlxuICAgICAgICB2YXIgaW5uZXJUZXh0ID0gdGhpcy5fZ2V0SW5uZXJUZXh0KGVsZW1lbnRUb1Njb3JlKTtcbiAgICAgICAgaWYgKGlubmVyVGV4dC5sZW5ndGggPCAyNSlcbiAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gRXhjbHVkZSBub2RlcyB3aXRoIG5vIGFuY2VzdG9yLlxuICAgICAgICB2YXIgYW5jZXN0b3JzID0gdGhpcy5fZ2V0Tm9kZUFuY2VzdG9ycyhlbGVtZW50VG9TY29yZSwgNSk7XG4gICAgICAgIGlmIChhbmNlc3RvcnMubGVuZ3RoID09PSAwKVxuICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB2YXIgY29udGVudFNjb3JlID0gMDtcblxuICAgICAgICAvLyBBZGQgYSBwb2ludCBmb3IgdGhlIHBhcmFncmFwaCBpdHNlbGYgYXMgYSBiYXNlLlxuICAgICAgICBjb250ZW50U2NvcmUgKz0gMTtcblxuICAgICAgICAvLyBBZGQgcG9pbnRzIGZvciBhbnkgY29tbWFzIHdpdGhpbiB0aGlzIHBhcmFncmFwaC5cbiAgICAgICAgY29udGVudFNjb3JlICs9IGlubmVyVGV4dC5zcGxpdChcIixcIikubGVuZ3RoO1xuXG4gICAgICAgIC8vIEZvciBldmVyeSAxMDAgY2hhcmFjdGVycyBpbiB0aGlzIHBhcmFncmFwaCwgYWRkIGFub3RoZXIgcG9pbnQuIFVwIHRvIDMgcG9pbnRzLlxuICAgICAgICBjb250ZW50U2NvcmUgKz0gTWF0aC5taW4oTWF0aC5mbG9vcihpbm5lclRleHQubGVuZ3RoIC8gMTAwKSwgMyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhbmQgc2NvcmUgYW5jZXN0b3JzLlxuICAgICAgICB0aGlzLl9mb3JFYWNoTm9kZShhbmNlc3RvcnMsIGZ1bmN0aW9uKGFuY2VzdG9yLCBsZXZlbCkge1xuICAgICAgICAgIGlmICghYW5jZXN0b3IudGFnTmFtZSB8fCAhYW5jZXN0b3IucGFyZW50Tm9kZSB8fCB0eXBlb2YoYW5jZXN0b3IucGFyZW50Tm9kZS50YWdOYW1lKSA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgIGlmICh0eXBlb2YoYW5jZXN0b3IucmVhZGFiaWxpdHkpID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICB0aGlzLl9pbml0aWFsaXplTm9kZShhbmNlc3Rvcik7XG4gICAgICAgICAgICBjYW5kaWRhdGVzLnB1c2goYW5jZXN0b3IpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIE5vZGUgc2NvcmUgZGl2aWRlcjpcbiAgICAgICAgICAvLyAtIHBhcmVudDogICAgICAgICAgICAgMSAobm8gZGl2aXNpb24pXG4gICAgICAgICAgLy8gLSBncmFuZHBhcmVudDogICAgICAgIDJcbiAgICAgICAgICAvLyAtIGdyZWF0IGdyYW5kcGFyZW50KzogYW5jZXN0b3IgbGV2ZWwgKiAzXG4gICAgICAgICAgaWYgKGxldmVsID09PSAwKVxuICAgICAgICAgICAgdmFyIHNjb3JlRGl2aWRlciA9IDE7XG4gICAgICAgICAgZWxzZSBpZiAobGV2ZWwgPT09IDEpXG4gICAgICAgICAgICBzY29yZURpdmlkZXIgPSAyO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNjb3JlRGl2aWRlciA9IGxldmVsICogMztcbiAgICAgICAgICBhbmNlc3Rvci5yZWFkYWJpbGl0eS5jb250ZW50U2NvcmUgKz0gY29udGVudFNjb3JlIC8gc2NvcmVEaXZpZGVyO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBZnRlciB3ZSd2ZSBjYWxjdWxhdGVkIHNjb3JlcywgbG9vcCB0aHJvdWdoIGFsbCBvZiB0aGUgcG9zc2libGVcbiAgICAgIC8vIGNhbmRpZGF0ZSBub2RlcyB3ZSBmb3VuZCBhbmQgZmluZCB0aGUgb25lIHdpdGggdGhlIGhpZ2hlc3Qgc2NvcmUuXG4gICAgICB2YXIgdG9wQ2FuZGlkYXRlcyA9IFtdO1xuICAgICAgZm9yICh2YXIgYyA9IDAsIGNsID0gY2FuZGlkYXRlcy5sZW5ndGg7IGMgPCBjbDsgYyArPSAxKSB7XG4gICAgICAgIHZhciBjYW5kaWRhdGUgPSBjYW5kaWRhdGVzW2NdO1xuXG4gICAgICAgIC8vIFNjYWxlIHRoZSBmaW5hbCBjYW5kaWRhdGVzIHNjb3JlIGJhc2VkIG9uIGxpbmsgZGVuc2l0eS4gR29vZCBjb250ZW50XG4gICAgICAgIC8vIHNob3VsZCBoYXZlIGEgcmVsYXRpdmVseSBzbWFsbCBsaW5rIGRlbnNpdHkgKDUlIG9yIGxlc3MpIGFuZCBiZSBtb3N0bHlcbiAgICAgICAgLy8gdW5hZmZlY3RlZCBieSB0aGlzIG9wZXJhdGlvbi5cbiAgICAgICAgdmFyIGNhbmRpZGF0ZVNjb3JlID0gY2FuZGlkYXRlLnJlYWRhYmlsaXR5LmNvbnRlbnRTY29yZSAqICgxIC0gdGhpcy5fZ2V0TGlua0RlbnNpdHkoY2FuZGlkYXRlKSk7XG4gICAgICAgIGNhbmRpZGF0ZS5yZWFkYWJpbGl0eS5jb250ZW50U2NvcmUgPSBjYW5kaWRhdGVTY29yZTtcblxuICAgICAgICB0aGlzLmxvZyhcIkNhbmRpZGF0ZTpcIiwgY2FuZGlkYXRlLCBcIndpdGggc2NvcmUgXCIgKyBjYW5kaWRhdGVTY29yZSk7XG5cbiAgICAgICAgZm9yICh2YXIgdCA9IDA7IHQgPCB0aGlzLl9uYlRvcENhbmRpZGF0ZXM7IHQrKykge1xuICAgICAgICAgIHZhciBhVG9wQ2FuZGlkYXRlID0gdG9wQ2FuZGlkYXRlc1t0XTtcblxuICAgICAgICAgIGlmICghYVRvcENhbmRpZGF0ZSB8fCBjYW5kaWRhdGVTY29yZSA+IGFUb3BDYW5kaWRhdGUucmVhZGFiaWxpdHkuY29udGVudFNjb3JlKSB7XG4gICAgICAgICAgICB0b3BDYW5kaWRhdGVzLnNwbGljZSh0LCAwLCBjYW5kaWRhdGUpO1xuICAgICAgICAgICAgaWYgKHRvcENhbmRpZGF0ZXMubGVuZ3RoID4gdGhpcy5fbmJUb3BDYW5kaWRhdGVzKVxuICAgICAgICAgICAgICB0b3BDYW5kaWRhdGVzLnBvcCgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciB0b3BDYW5kaWRhdGUgPSB0b3BDYW5kaWRhdGVzWzBdIHx8IG51bGw7XG4gICAgICB2YXIgbmVlZGVkVG9DcmVhdGVUb3BDYW5kaWRhdGUgPSBmYWxzZTtcbiAgICAgIHZhciBwYXJlbnRPZlRvcENhbmRpZGF0ZTtcblxuICAgICAgLy8gSWYgd2Ugc3RpbGwgaGF2ZSBubyB0b3AgY2FuZGlkYXRlLCBqdXN0IHVzZSB0aGUgYm9keSBhcyBhIGxhc3QgcmVzb3J0LlxuICAgICAgLy8gV2UgYWxzbyBoYXZlIHRvIGNvcHkgdGhlIGJvZHkgbm9kZSBzbyBpdCBpcyBzb21ldGhpbmcgd2UgY2FuIG1vZGlmeS5cbiAgICAgIGlmICh0b3BDYW5kaWRhdGUgPT09IG51bGwgfHwgdG9wQ2FuZGlkYXRlLnRhZ05hbWUgPT09IFwiQk9EWVwiKSB7XG4gICAgICAgIC8vIE1vdmUgYWxsIG9mIHRoZSBwYWdlJ3MgY2hpbGRyZW4gaW50byB0b3BDYW5kaWRhdGVcbiAgICAgICAgdG9wQ2FuZGlkYXRlID0gZG9jLmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XG4gICAgICAgIG5lZWRlZFRvQ3JlYXRlVG9wQ2FuZGlkYXRlID0gdHJ1ZTtcbiAgICAgICAgLy8gTW92ZSBldmVyeXRoaW5nIChub3QganVzdCBlbGVtZW50cywgYWxzbyB0ZXh0IG5vZGVzIGV0Yy4pIGludG8gdGhlIGNvbnRhaW5lclxuICAgICAgICAvLyBzbyB3ZSBldmVuIGluY2x1ZGUgdGV4dCBkaXJlY3RseSBpbiB0aGUgYm9keTpcbiAgICAgICAgd2hpbGUgKHBhZ2UuZmlyc3RDaGlsZCkge1xuICAgICAgICAgIHRoaXMubG9nKFwiTW92aW5nIGNoaWxkIG91dDpcIiwgcGFnZS5maXJzdENoaWxkKTtcbiAgICAgICAgICB0b3BDYW5kaWRhdGUuYXBwZW5kQ2hpbGQocGFnZS5maXJzdENoaWxkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhZ2UuYXBwZW5kQ2hpbGQodG9wQ2FuZGlkYXRlKTtcblxuICAgICAgICB0aGlzLl9pbml0aWFsaXplTm9kZSh0b3BDYW5kaWRhdGUpO1xuICAgICAgfSBlbHNlIGlmICh0b3BDYW5kaWRhdGUpIHtcbiAgICAgICAgLy8gRmluZCBhIGJldHRlciB0b3AgY2FuZGlkYXRlIG5vZGUgaWYgaXQgY29udGFpbnMgKGF0IGxlYXN0IHRocmVlKSBub2RlcyB3aGljaCBiZWxvbmcgdG8gYHRvcENhbmRpZGF0ZXNgIGFycmF5XG4gICAgICAgIC8vIGFuZCB3aG9zZSBzY29yZXMgYXJlIHF1aXRlIGNsb3NlZCB3aXRoIGN1cnJlbnQgYHRvcENhbmRpZGF0ZWAgbm9kZS5cbiAgICAgICAgdmFyIGFsdGVybmF0aXZlQ2FuZGlkYXRlQW5jZXN0b3JzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgdG9wQ2FuZGlkYXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmICh0b3BDYW5kaWRhdGVzW2ldLnJlYWRhYmlsaXR5LmNvbnRlbnRTY29yZSAvIHRvcENhbmRpZGF0ZS5yZWFkYWJpbGl0eS5jb250ZW50U2NvcmUgPj0gMC43NSkge1xuICAgICAgICAgICAgYWx0ZXJuYXRpdmVDYW5kaWRhdGVBbmNlc3RvcnMucHVzaCh0aGlzLl9nZXROb2RlQW5jZXN0b3JzKHRvcENhbmRpZGF0ZXNbaV0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIE1JTklNVU1fVE9QQ0FORElEQVRFUyA9IDM7XG4gICAgICAgIGlmIChhbHRlcm5hdGl2ZUNhbmRpZGF0ZUFuY2VzdG9ycy5sZW5ndGggPj0gTUlOSU1VTV9UT1BDQU5ESURBVEVTKSB7XG4gICAgICAgICAgcGFyZW50T2ZUb3BDYW5kaWRhdGUgPSB0b3BDYW5kaWRhdGUucGFyZW50Tm9kZTtcbiAgICAgICAgICB3aGlsZSAocGFyZW50T2ZUb3BDYW5kaWRhdGUudGFnTmFtZSAhPT0gXCJCT0RZXCIpIHtcbiAgICAgICAgICAgIHZhciBsaXN0c0NvbnRhaW5pbmdUaGlzQW5jZXN0b3IgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgYW5jZXN0b3JJbmRleCA9IDA7IGFuY2VzdG9ySW5kZXggPCBhbHRlcm5hdGl2ZUNhbmRpZGF0ZUFuY2VzdG9ycy5sZW5ndGggJiYgbGlzdHNDb250YWluaW5nVGhpc0FuY2VzdG9yIDwgTUlOSU1VTV9UT1BDQU5ESURBVEVTOyBhbmNlc3RvckluZGV4KyspIHtcbiAgICAgICAgICAgICAgbGlzdHNDb250YWluaW5nVGhpc0FuY2VzdG9yICs9IE51bWJlcihhbHRlcm5hdGl2ZUNhbmRpZGF0ZUFuY2VzdG9yc1thbmNlc3RvckluZGV4XS5pbmNsdWRlcyhwYXJlbnRPZlRvcENhbmRpZGF0ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGxpc3RzQ29udGFpbmluZ1RoaXNBbmNlc3RvciA+PSBNSU5JTVVNX1RPUENBTkRJREFURVMpIHtcbiAgICAgICAgICAgICAgdG9wQ2FuZGlkYXRlID0gcGFyZW50T2ZUb3BDYW5kaWRhdGU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGFyZW50T2ZUb3BDYW5kaWRhdGUgPSBwYXJlbnRPZlRvcENhbmRpZGF0ZS5wYXJlbnROb2RlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRvcENhbmRpZGF0ZS5yZWFkYWJpbGl0eSkge1xuICAgICAgICAgIHRoaXMuX2luaXRpYWxpemVOb2RlKHRvcENhbmRpZGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCZWNhdXNlIG9mIG91ciBib251cyBzeXN0ZW0sIHBhcmVudHMgb2YgY2FuZGlkYXRlcyBtaWdodCBoYXZlIHNjb3Jlc1xuICAgICAgICAvLyB0aGVtc2VsdmVzLiBUaGV5IGdldCBoYWxmIG9mIHRoZSBub2RlLiBUaGVyZSB3b24ndCBiZSBub2RlcyB3aXRoIGhpZ2hlclxuICAgICAgICAvLyBzY29yZXMgdGhhbiBvdXIgdG9wQ2FuZGlkYXRlLCBidXQgaWYgd2Ugc2VlIHRoZSBzY29yZSBnb2luZyAqdXAqIGluIHRoZSBmaXJzdFxuICAgICAgICAvLyBmZXcgc3RlcHMgdXAgdGhlIHRyZWUsIHRoYXQncyBhIGRlY2VudCBzaWduIHRoYXQgdGhlcmUgbWlnaHQgYmUgbW9yZSBjb250ZW50XG4gICAgICAgIC8vIGx1cmtpbmcgaW4gb3RoZXIgcGxhY2VzIHRoYXQgd2Ugd2FudCB0byB1bmlmeSBpbi4gVGhlIHNpYmxpbmcgc3R1ZmZcbiAgICAgICAgLy8gYmVsb3cgZG9lcyBzb21lIG9mIHRoYXQgLSBidXQgb25seSBpZiB3ZSd2ZSBsb29rZWQgaGlnaCBlbm91Z2ggdXAgdGhlIERPTVxuICAgICAgICAvLyB0cmVlLlxuICAgICAgICBwYXJlbnRPZlRvcENhbmRpZGF0ZSA9IHRvcENhbmRpZGF0ZS5wYXJlbnROb2RlO1xuICAgICAgICB2YXIgbGFzdFNjb3JlID0gdG9wQ2FuZGlkYXRlLnJlYWRhYmlsaXR5LmNvbnRlbnRTY29yZTtcbiAgICAgICAgLy8gVGhlIHNjb3JlcyBzaG91bGRuJ3QgZ2V0IHRvbyBsb3cuXG4gICAgICAgIHZhciBzY29yZVRocmVzaG9sZCA9IGxhc3RTY29yZSAvIDM7XG4gICAgICAgIHdoaWxlIChwYXJlbnRPZlRvcENhbmRpZGF0ZS50YWdOYW1lICE9PSBcIkJPRFlcIikge1xuICAgICAgICAgIGlmICghcGFyZW50T2ZUb3BDYW5kaWRhdGUucmVhZGFiaWxpdHkpIHtcbiAgICAgICAgICAgIHBhcmVudE9mVG9wQ2FuZGlkYXRlID0gcGFyZW50T2ZUb3BDYW5kaWRhdGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcGFyZW50U2NvcmUgPSBwYXJlbnRPZlRvcENhbmRpZGF0ZS5yZWFkYWJpbGl0eS5jb250ZW50U2NvcmU7XG4gICAgICAgICAgaWYgKHBhcmVudFNjb3JlIDwgc2NvcmVUaHJlc2hvbGQpXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBpZiAocGFyZW50U2NvcmUgPiBsYXN0U2NvcmUpIHtcbiAgICAgICAgICAgIC8vIEFscmlnaHQhIFdlIGZvdW5kIGEgYmV0dGVyIHBhcmVudCB0byB1c2UuXG4gICAgICAgICAgICB0b3BDYW5kaWRhdGUgPSBwYXJlbnRPZlRvcENhbmRpZGF0ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsYXN0U2NvcmUgPSBwYXJlbnRPZlRvcENhbmRpZGF0ZS5yZWFkYWJpbGl0eS5jb250ZW50U2NvcmU7XG4gICAgICAgICAgcGFyZW50T2ZUb3BDYW5kaWRhdGUgPSBwYXJlbnRPZlRvcENhbmRpZGF0ZS5wYXJlbnROb2RlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhlIHRvcCBjYW5kaWRhdGUgaXMgdGhlIG9ubHkgY2hpbGQsIHVzZSBwYXJlbnQgaW5zdGVhZC4gVGhpcyB3aWxsIGhlbHAgc2libGluZ1xuICAgICAgICAvLyBqb2luaW5nIGxvZ2ljIHdoZW4gYWRqYWNlbnQgY29udGVudCBpcyBhY3R1YWxseSBsb2NhdGVkIGluIHBhcmVudCdzIHNpYmxpbmcgbm9kZS5cbiAgICAgICAgcGFyZW50T2ZUb3BDYW5kaWRhdGUgPSB0b3BDYW5kaWRhdGUucGFyZW50Tm9kZTtcbiAgICAgICAgd2hpbGUgKHBhcmVudE9mVG9wQ2FuZGlkYXRlLnRhZ05hbWUgIT0gXCJCT0RZXCIgJiYgcGFyZW50T2ZUb3BDYW5kaWRhdGUuY2hpbGRyZW4ubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICB0b3BDYW5kaWRhdGUgPSBwYXJlbnRPZlRvcENhbmRpZGF0ZTtcbiAgICAgICAgICBwYXJlbnRPZlRvcENhbmRpZGF0ZSA9IHRvcENhbmRpZGF0ZS5wYXJlbnROb2RlO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdG9wQ2FuZGlkYXRlLnJlYWRhYmlsaXR5KSB7XG4gICAgICAgICAgdGhpcy5faW5pdGlhbGl6ZU5vZGUodG9wQ2FuZGlkYXRlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBOb3cgdGhhdCB3ZSBoYXZlIHRoZSB0b3AgY2FuZGlkYXRlLCBsb29rIHRocm91Z2ggaXRzIHNpYmxpbmdzIGZvciBjb250ZW50XG4gICAgICAvLyB0aGF0IG1pZ2h0IGFsc28gYmUgcmVsYXRlZC4gVGhpbmdzIGxpa2UgcHJlYW1ibGVzLCBjb250ZW50IHNwbGl0IGJ5IGFkc1xuICAgICAgLy8gdGhhdCB3ZSByZW1vdmVkLCBldGMuXG4gICAgICB2YXIgYXJ0aWNsZUNvbnRlbnQgPSBkb2MuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcbiAgICAgIGlmIChpc1BhZ2luZylcbiAgICAgICAgYXJ0aWNsZUNvbnRlbnQuaWQgPSBcInJlYWRhYmlsaXR5LWNvbnRlbnRcIjtcblxuICAgICAgdmFyIHNpYmxpbmdTY29yZVRocmVzaG9sZCA9IE1hdGgubWF4KDEwLCB0b3BDYW5kaWRhdGUucmVhZGFiaWxpdHkuY29udGVudFNjb3JlICogMC4yKTtcbiAgICAgIC8vIEtlZXAgcG90ZW50aWFsIHRvcCBjYW5kaWRhdGUncyBwYXJlbnQgbm9kZSB0byB0cnkgdG8gZ2V0IHRleHQgZGlyZWN0aW9uIG9mIGl0IGxhdGVyLlxuICAgICAgcGFyZW50T2ZUb3BDYW5kaWRhdGUgPSB0b3BDYW5kaWRhdGUucGFyZW50Tm9kZTtcbiAgICAgIHZhciBzaWJsaW5ncyA9IHBhcmVudE9mVG9wQ2FuZGlkYXRlLmNoaWxkcmVuO1xuXG4gICAgICBmb3IgKHZhciBzID0gMCwgc2wgPSBzaWJsaW5ncy5sZW5ndGg7IHMgPCBzbDsgcysrKSB7XG4gICAgICAgIHZhciBzaWJsaW5nID0gc2libGluZ3Nbc107XG4gICAgICAgIHZhciBhcHBlbmQgPSBmYWxzZTtcblxuICAgICAgICB0aGlzLmxvZyhcIkxvb2tpbmcgYXQgc2libGluZyBub2RlOlwiLCBzaWJsaW5nLCBzaWJsaW5nLnJlYWRhYmlsaXR5ID8gKFwid2l0aCBzY29yZSBcIiArIHNpYmxpbmcucmVhZGFiaWxpdHkuY29udGVudFNjb3JlKSA6IFwiXCIpO1xuICAgICAgICB0aGlzLmxvZyhcIlNpYmxpbmcgaGFzIHNjb3JlXCIsIHNpYmxpbmcucmVhZGFiaWxpdHkgPyBzaWJsaW5nLnJlYWRhYmlsaXR5LmNvbnRlbnRTY29yZSA6IFwiVW5rbm93blwiKTtcblxuICAgICAgICBpZiAoc2libGluZyA9PT0gdG9wQ2FuZGlkYXRlKSB7XG4gICAgICAgICAgYXBwZW5kID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgY29udGVudEJvbnVzID0gMDtcblxuICAgICAgICAgIC8vIEdpdmUgYSBib251cyBpZiBzaWJsaW5nIG5vZGVzIGFuZCB0b3AgY2FuZGlkYXRlcyBoYXZlIHRoZSBleGFtcGxlIHNhbWUgY2xhc3NuYW1lXG4gICAgICAgICAgaWYgKHNpYmxpbmcuY2xhc3NOYW1lID09PSB0b3BDYW5kaWRhdGUuY2xhc3NOYW1lICYmIHRvcENhbmRpZGF0ZS5jbGFzc05hbWUgIT09IFwiXCIpXG4gICAgICAgICAgICBjb250ZW50Qm9udXMgKz0gdG9wQ2FuZGlkYXRlLnJlYWRhYmlsaXR5LmNvbnRlbnRTY29yZSAqIDAuMjtcblxuICAgICAgICAgIGlmIChzaWJsaW5nLnJlYWRhYmlsaXR5ICYmXG4gICAgICAgICAgICAgICgoc2libGluZy5yZWFkYWJpbGl0eS5jb250ZW50U2NvcmUgKyBjb250ZW50Qm9udXMpID49IHNpYmxpbmdTY29yZVRocmVzaG9sZCkpIHtcbiAgICAgICAgICAgIGFwcGVuZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChzaWJsaW5nLm5vZGVOYW1lID09PSBcIlBcIikge1xuICAgICAgICAgICAgdmFyIGxpbmtEZW5zaXR5ID0gdGhpcy5fZ2V0TGlua0RlbnNpdHkoc2libGluZyk7XG4gICAgICAgICAgICB2YXIgbm9kZUNvbnRlbnQgPSB0aGlzLl9nZXRJbm5lclRleHQoc2libGluZyk7XG4gICAgICAgICAgICB2YXIgbm9kZUxlbmd0aCA9IG5vZGVDb250ZW50Lmxlbmd0aDtcblxuICAgICAgICAgICAgaWYgKG5vZGVMZW5ndGggPiA4MCAmJiBsaW5rRGVuc2l0eSA8IDAuMjUpIHtcbiAgICAgICAgICAgICAgYXBwZW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZUxlbmd0aCA8IDgwICYmIG5vZGVMZW5ndGggPiAwICYmIGxpbmtEZW5zaXR5ID09PSAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb250ZW50LnNlYXJjaCgvXFwuKCB8JCkvKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgYXBwZW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXBwZW5kKSB7XG4gICAgICAgICAgdGhpcy5sb2coXCJBcHBlbmRpbmcgbm9kZTpcIiwgc2libGluZyk7XG5cbiAgICAgICAgICBpZiAodGhpcy5BTFRFUl9UT19ESVZfRVhDRVBUSU9OUy5pbmRleE9mKHNpYmxpbmcubm9kZU5hbWUpID09PSAtMSkge1xuICAgICAgICAgICAgLy8gV2UgaGF2ZSBhIG5vZGUgdGhhdCBpc24ndCBhIGNvbW1vbiBibG9jayBsZXZlbCBlbGVtZW50LCBsaWtlIGEgZm9ybSBvciB0ZCB0YWcuXG4gICAgICAgICAgICAvLyBUdXJuIGl0IGludG8gYSBkaXYgc28gaXQgZG9lc24ndCBnZXQgZmlsdGVyZWQgb3V0IGxhdGVyIGJ5IGFjY2lkZW50LlxuICAgICAgICAgICAgdGhpcy5sb2coXCJBbHRlcmluZyBzaWJsaW5nOlwiLCBzaWJsaW5nLCBcInRvIGRpdi5cIik7XG5cbiAgICAgICAgICAgIHNpYmxpbmcgPSB0aGlzLl9zZXROb2RlVGFnKHNpYmxpbmcsIFwiRElWXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGFydGljbGVDb250ZW50LmFwcGVuZENoaWxkKHNpYmxpbmcpO1xuICAgICAgICAgIC8vIEZldGNoIGNoaWxkcmVuIGFnYWluIHRvIG1ha2UgaXQgY29tcGF0aWJsZVxuICAgICAgICAgIC8vIHdpdGggRE9NIHBhcnNlcnMgd2l0aG91dCBsaXZlIGNvbGxlY3Rpb24gc3VwcG9ydC5cbiAgICAgICAgICBzaWJsaW5ncyA9IHBhcmVudE9mVG9wQ2FuZGlkYXRlLmNoaWxkcmVuO1xuICAgICAgICAgIC8vIHNpYmxpbmdzIGlzIGEgcmVmZXJlbmNlIHRvIHRoZSBjaGlsZHJlbiBhcnJheSwgYW5kXG4gICAgICAgICAgLy8gc2libGluZyBpcyByZW1vdmVkIGZyb20gdGhlIGFycmF5IHdoZW4gd2UgY2FsbCBhcHBlbmRDaGlsZCgpLlxuICAgICAgICAgIC8vIEFzIGEgcmVzdWx0LCB3ZSBtdXN0IHJldmlzaXQgdGhpcyBpbmRleCBzaW5jZSB0aGUgbm9kZXNcbiAgICAgICAgICAvLyBoYXZlIGJlZW4gc2hpZnRlZC5cbiAgICAgICAgICBzIC09IDE7XG4gICAgICAgICAgc2wgLT0gMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fZGVidWcpXG4gICAgICAgIHRoaXMubG9nKFwiQXJ0aWNsZSBjb250ZW50IHByZS1wcmVwOiBcIiArIGFydGljbGVDb250ZW50LmlubmVySFRNTCk7XG4gICAgICAvLyBTbyB3ZSBoYXZlIGFsbCBvZiB0aGUgY29udGVudCB0aGF0IHdlIG5lZWQuIE5vdyB3ZSBjbGVhbiBpdCB1cCBmb3IgcHJlc2VudGF0aW9uLlxuICAgICAgdGhpcy5fcHJlcEFydGljbGUoYXJ0aWNsZUNvbnRlbnQpO1xuICAgICAgaWYgKHRoaXMuX2RlYnVnKVxuICAgICAgICB0aGlzLmxvZyhcIkFydGljbGUgY29udGVudCBwb3N0LXByZXA6IFwiICsgYXJ0aWNsZUNvbnRlbnQuaW5uZXJIVE1MKTtcblxuICAgICAgaWYgKG5lZWRlZFRvQ3JlYXRlVG9wQ2FuZGlkYXRlKSB7XG4gICAgICAgIC8vIFdlIGFscmVhZHkgY3JlYXRlZCBhIGZha2UgZGl2IHRoaW5nLCBhbmQgdGhlcmUgd291bGRuJ3QgaGF2ZSBiZWVuIGFueSBzaWJsaW5ncyBsZWZ0XG4gICAgICAgIC8vIGZvciB0aGUgcHJldmlvdXMgbG9vcCwgc28gdGhlcmUncyBubyBwb2ludCB0cnlpbmcgdG8gY3JlYXRlIGEgbmV3IGRpdiwgYW5kIHRoZW5cbiAgICAgICAgLy8gbW92ZSBhbGwgdGhlIGNoaWxkcmVuIG92ZXIuIEp1c3QgYXNzaWduIElEcyBhbmQgY2xhc3MgbmFtZXMgaGVyZS4gTm8gbmVlZCB0byBhcHBlbmRcbiAgICAgICAgLy8gYmVjYXVzZSB0aGF0IGFscmVhZHkgaGFwcGVuZWQgYW55d2F5LlxuICAgICAgICB0b3BDYW5kaWRhdGUuaWQgPSBcInJlYWRhYmlsaXR5LXBhZ2UtMVwiO1xuICAgICAgICB0b3BDYW5kaWRhdGUuY2xhc3NOYW1lID0gXCJwYWdlXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZGl2ID0gZG9jLmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XG4gICAgICAgIGRpdi5pZCA9IFwicmVhZGFiaWxpdHktcGFnZS0xXCI7XG4gICAgICAgIGRpdi5jbGFzc05hbWUgPSBcInBhZ2VcIjtcbiAgICAgICAgd2hpbGUgKGFydGljbGVDb250ZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICBkaXYuYXBwZW5kQ2hpbGQoYXJ0aWNsZUNvbnRlbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgIH1cbiAgICAgICAgYXJ0aWNsZUNvbnRlbnQuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2RlYnVnKVxuICAgICAgICB0aGlzLmxvZyhcIkFydGljbGUgY29udGVudCBhZnRlciBwYWdpbmc6IFwiICsgYXJ0aWNsZUNvbnRlbnQuaW5uZXJIVE1MKTtcblxuICAgICAgdmFyIHBhcnNlU3VjY2Vzc2Z1bCA9IHRydWU7XG5cbiAgICAgIC8vIE5vdyB0aGF0IHdlJ3ZlIGdvbmUgdGhyb3VnaCB0aGUgZnVsbCBhbGdvcml0aG0sIGNoZWNrIHRvIHNlZSBpZlxuICAgICAgLy8gd2UgZ290IGFueSBtZWFuaW5nZnVsIGNvbnRlbnQuIElmIHdlIGRpZG4ndCwgd2UgbWF5IG5lZWQgdG8gcmUtcnVuXG4gICAgICAvLyBncmFiQXJ0aWNsZSB3aXRoIGRpZmZlcmVudCBmbGFncyBzZXQuIFRoaXMgZ2l2ZXMgdXMgYSBoaWdoZXIgbGlrZWxpaG9vZCBvZlxuICAgICAgLy8gZmluZGluZyB0aGUgY29udGVudCwgYW5kIHRoZSBzaWV2ZSBhcHByb2FjaCBnaXZlcyB1cyBhIGhpZ2hlciBsaWtlbGlob29kIG9mXG4gICAgICAvLyBmaW5kaW5nIHRoZSAtcmlnaHQtIGNvbnRlbnQuXG4gICAgICB2YXIgdGV4dExlbmd0aCA9IHRoaXMuX2dldElubmVyVGV4dChhcnRpY2xlQ29udGVudCwgdHJ1ZSkubGVuZ3RoO1xuICAgICAgaWYgKHRleHRMZW5ndGggPCB0aGlzLl9jaGFyVGhyZXNob2xkKSB7XG4gICAgICAgIHBhcnNlU3VjY2Vzc2Z1bCA9IGZhbHNlO1xuICAgICAgICBwYWdlLmlubmVySFRNTCA9IHBhZ2VDYWNoZUh0bWw7XG5cbiAgICAgICAgaWYgKHRoaXMuX2ZsYWdJc0FjdGl2ZSh0aGlzLkZMQUdfU1RSSVBfVU5MSUtFTFlTKSkge1xuICAgICAgICAgIHRoaXMuX3JlbW92ZUZsYWcodGhpcy5GTEFHX1NUUklQX1VOTElLRUxZUyk7XG4gICAgICAgICAgdGhpcy5fYXR0ZW1wdHMucHVzaCh7YXJ0aWNsZUNvbnRlbnQ6IGFydGljbGVDb250ZW50LCB0ZXh0TGVuZ3RoOiB0ZXh0TGVuZ3RofSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fZmxhZ0lzQWN0aXZlKHRoaXMuRkxBR19XRUlHSFRfQ0xBU1NFUykpIHtcbiAgICAgICAgICB0aGlzLl9yZW1vdmVGbGFnKHRoaXMuRkxBR19XRUlHSFRfQ0xBU1NFUyk7XG4gICAgICAgICAgdGhpcy5fYXR0ZW1wdHMucHVzaCh7YXJ0aWNsZUNvbnRlbnQ6IGFydGljbGVDb250ZW50LCB0ZXh0TGVuZ3RoOiB0ZXh0TGVuZ3RofSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fZmxhZ0lzQWN0aXZlKHRoaXMuRkxBR19DTEVBTl9DT05ESVRJT05BTExZKSkge1xuICAgICAgICAgIHRoaXMuX3JlbW92ZUZsYWcodGhpcy5GTEFHX0NMRUFOX0NPTkRJVElPTkFMTFkpO1xuICAgICAgICAgIHRoaXMuX2F0dGVtcHRzLnB1c2goe2FydGljbGVDb250ZW50OiBhcnRpY2xlQ29udGVudCwgdGV4dExlbmd0aDogdGV4dExlbmd0aH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2F0dGVtcHRzLnB1c2goe2FydGljbGVDb250ZW50OiBhcnRpY2xlQ29udGVudCwgdGV4dExlbmd0aDogdGV4dExlbmd0aH0pO1xuICAgICAgICAgIC8vIE5vIGx1Y2sgYWZ0ZXIgcmVtb3ZpbmcgZmxhZ3MsIGp1c3QgcmV0dXJuIHRoZSBsb25nZXN0IHRleHQgd2UgZm91bmQgZHVyaW5nIHRoZSBkaWZmZXJlbnQgbG9vcHNcbiAgICAgICAgICB0aGlzLl9hdHRlbXB0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYi50ZXh0TGVuZ3RoIC0gYS50ZXh0TGVuZ3RoO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gQnV0IGZpcnN0IGNoZWNrIGlmIHdlIGFjdHVhbGx5IGhhdmUgc29tZXRoaW5nXG4gICAgICAgICAgaWYgKCF0aGlzLl9hdHRlbXB0c1swXS50ZXh0TGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBhcnRpY2xlQ29udGVudCA9IHRoaXMuX2F0dGVtcHRzWzBdLmFydGljbGVDb250ZW50O1xuICAgICAgICAgIHBhcnNlU3VjY2Vzc2Z1bCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHBhcnNlU3VjY2Vzc2Z1bCkge1xuICAgICAgICAvLyBGaW5kIG91dCB0ZXh0IGRpcmVjdGlvbiBmcm9tIGFuY2VzdG9ycyBvZiBmaW5hbCB0b3AgY2FuZGlkYXRlLlxuICAgICAgICB2YXIgYW5jZXN0b3JzID0gW3BhcmVudE9mVG9wQ2FuZGlkYXRlLCB0b3BDYW5kaWRhdGVdLmNvbmNhdCh0aGlzLl9nZXROb2RlQW5jZXN0b3JzKHBhcmVudE9mVG9wQ2FuZGlkYXRlKSk7XG4gICAgICAgIHRoaXMuX3NvbWVOb2RlKGFuY2VzdG9ycywgZnVuY3Rpb24oYW5jZXN0b3IpIHtcbiAgICAgICAgICBpZiAoIWFuY2VzdG9yLnRhZ05hbWUpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgdmFyIGFydGljbGVEaXIgPSBhbmNlc3Rvci5nZXRBdHRyaWJ1dGUoXCJkaXJcIik7XG4gICAgICAgICAgaWYgKGFydGljbGVEaXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2FydGljbGVEaXIgPSBhcnRpY2xlRGlyO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBhcnRpY2xlQ29udGVudDtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgdGhlIGlucHV0IHN0cmluZyBjb3VsZCBiZSBhIGJ5bGluZS5cbiAgICogVGhpcyB2ZXJpZmllcyB0aGF0IHRoZSBpbnB1dCBpcyBhIHN0cmluZywgYW5kIHRoYXQgdGhlIGxlbmd0aFxuICAgKiBpcyBsZXNzIHRoYW4gMTAwIGNoYXJzLlxuICAgKlxuICAgKiBAcGFyYW0gcG9zc2libGVCeWxpbmUge3N0cmluZ30gLSBhIHN0cmluZyB0byBjaGVjayB3aGV0aGVyIGl0cyBhIGJ5bGluZS5cbiAgICogQHJldHVybiBCb29sZWFuIC0gd2hldGhlciB0aGUgaW5wdXQgc3RyaW5nIGlzIGEgYnlsaW5lLlxuICAgKi9cbiAgX2lzVmFsaWRCeWxpbmU6IGZ1bmN0aW9uKGJ5bGluZSkge1xuICAgIGlmICh0eXBlb2YgYnlsaW5lID09IFwic3RyaW5nXCIgfHwgYnlsaW5lIGluc3RhbmNlb2YgU3RyaW5nKSB7XG4gICAgICBieWxpbmUgPSBieWxpbmUudHJpbSgpO1xuICAgICAgcmV0dXJuIChieWxpbmUubGVuZ3RoID4gMCkgJiYgKGJ5bGluZS5sZW5ndGggPCAxMDApO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIHNvbWUgb2YgdGhlIGNvbW1vbiBIVE1MIGVudGl0aWVzIGluIHN0cmluZyB0byB0aGVpciBjb3JyZXNwb25kaW5nIGNoYXJhY3RlcnMuXG4gICAqXG4gICAqIEBwYXJhbSBzdHIge3N0cmluZ30gLSBhIHN0cmluZyB0byB1bmVzY2FwZS5cbiAgICogQHJldHVybiBzdHJpbmcgd2l0aG91dCBIVE1MIGVudGl0eS5cbiAgICovXG4gIF91bmVzY2FwZUh0bWxFbnRpdGllczogZnVuY3Rpb24oc3RyKSB7XG4gICAgaWYgKCFzdHIpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuXG4gICAgdmFyIGh0bWxFc2NhcGVNYXAgPSB0aGlzLkhUTUxfRVNDQVBFX01BUDtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoLyYocXVvdHxhbXB8YXBvc3xsdHxndCk7L2csIGZ1bmN0aW9uKF8sIHRhZykge1xuICAgICAgcmV0dXJuIGh0bWxFc2NhcGVNYXBbdGFnXTtcbiAgICB9KS5yZXBsYWNlKC8mIyg/OngoWzAtOWEtel17MSw0fSl8KFswLTldezEsNH0pKTsvZ2ksIGZ1bmN0aW9uKF8sIGhleCwgbnVtU3RyKSB7XG4gICAgICB2YXIgbnVtID0gcGFyc2VJbnQoaGV4IHx8IG51bVN0ciwgaGV4ID8gMTYgOiAxMCk7XG4gICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShudW0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUcnkgdG8gZXh0cmFjdCBtZXRhZGF0YSBmcm9tIEpTT04tTEQgb2JqZWN0LlxuICAgKiBGb3Igbm93LCBvbmx5IFNjaGVtYS5vcmcgb2JqZWN0cyBvZiB0eXBlIEFydGljbGUgb3IgaXRzIHN1YnR5cGVzIGFyZSBzdXBwb3J0ZWQuXG4gICAqIEByZXR1cm4gT2JqZWN0IHdpdGggYW55IG1ldGFkYXRhIHRoYXQgY291bGQgYmUgZXh0cmFjdGVkIChwb3NzaWJseSBub25lKVxuICAgKi9cbiAgX2dldEpTT05MRDogZnVuY3Rpb24gKGRvYykge1xuICAgIHZhciBzY3JpcHRzID0gdGhpcy5fZ2V0QWxsTm9kZXNXaXRoVGFnKGRvYywgW1wic2NyaXB0XCJdKTtcblxuICAgIHZhciBtZXRhZGF0YTtcblxuICAgIHRoaXMuX2ZvckVhY2hOb2RlKHNjcmlwdHMsIGZ1bmN0aW9uKGpzb25MZEVsZW1lbnQpIHtcbiAgICAgIGlmICghbWV0YWRhdGEgJiYganNvbkxkRWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJ0eXBlXCIpID09PSBcImFwcGxpY2F0aW9uL2xkK2pzb25cIikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIFN0cmlwIENEQVRBIG1hcmtlcnMgaWYgcHJlc2VudFxuICAgICAgICAgIHZhciBjb250ZW50ID0ganNvbkxkRWxlbWVudC50ZXh0Q29udGVudC5yZXBsYWNlKC9eXFxzKjwhXFxbQ0RBVEFcXFt8XFxdXFxdPlxccyokL2csIFwiXCIpO1xuICAgICAgICAgIHZhciBwYXJzZWQgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICFwYXJzZWRbXCJAY29udGV4dFwiXSB8fFxuICAgICAgICAgICAgIXBhcnNlZFtcIkBjb250ZXh0XCJdLm1hdGNoKC9eaHR0cHM/XFw6XFwvXFwvc2NoZW1hXFwub3JnJC8pXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFwYXJzZWRbXCJAdHlwZVwiXSAmJiBBcnJheS5pc0FycmF5KHBhcnNlZFtcIkBncmFwaFwiXSkpIHtcbiAgICAgICAgICAgIHBhcnNlZCA9IHBhcnNlZFtcIkBncmFwaFwiXS5maW5kKGZ1bmN0aW9uKGl0KSB7XG4gICAgICAgICAgICAgIHJldHVybiAoaXRbXCJAdHlwZVwiXSB8fCBcIlwiKS5tYXRjaChcbiAgICAgICAgICAgICAgICB0aGlzLlJFR0VYUFMuanNvbkxkQXJ0aWNsZVR5cGVzXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhcGFyc2VkIHx8XG4gICAgICAgICAgICAhcGFyc2VkW1wiQHR5cGVcIl0gfHxcbiAgICAgICAgICAgICFwYXJzZWRbXCJAdHlwZVwiXS5tYXRjaCh0aGlzLlJFR0VYUFMuanNvbkxkQXJ0aWNsZVR5cGVzKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG1ldGFkYXRhID0ge307XG5cbiAgICAgICAgICBpZiAodHlwZW9mIHBhcnNlZC5uYW1lID09PSBcInN0cmluZ1wiICYmIHR5cGVvZiBwYXJzZWQuaGVhZGxpbmUgPT09IFwic3RyaW5nXCIgJiYgcGFyc2VkLm5hbWUgIT09IHBhcnNlZC5oZWFkbGluZSkge1xuICAgICAgICAgICAgLy8gd2UgaGF2ZSBib3RoIG5hbWUgYW5kIGhlYWRsaW5lIGVsZW1lbnQgaW4gdGhlIEpTT04tTEQuIFRoZXkgc2hvdWxkIGJvdGggYmUgdGhlIHNhbWUgYnV0IHNvbWUgd2Vic2l0ZXMgbGlrZSBha3R1YWxuZS5jelxuICAgICAgICAgICAgLy8gcHV0IHRoZWlyIG93biBuYW1lIGludG8gXCJuYW1lXCIgYW5kIHRoZSBhcnRpY2xlIHRpdGxlIHRvIFwiaGVhZGxpbmVcIiB3aGljaCBjb25mdXNlcyBSZWFkYWJpbGl0eS4gU28gd2UgdHJ5IHRvIGNoZWNrIGlmIGVpdGhlclxuICAgICAgICAgICAgLy8gXCJuYW1lXCIgb3IgXCJoZWFkbGluZVwiIGNsb3NlbHkgbWF0Y2hlcyB0aGUgaHRtbCB0aXRsZSwgYW5kIGlmIHNvLCB1c2UgdGhhdCBvbmUuIElmIG5vdCwgdGhlbiB3ZSB1c2UgXCJuYW1lXCIgYnkgZGVmYXVsdC5cblxuICAgICAgICAgICAgdmFyIHRpdGxlID0gdGhpcy5fZ2V0QXJ0aWNsZVRpdGxlKCk7XG4gICAgICAgICAgICB2YXIgbmFtZU1hdGNoZXMgPSB0aGlzLl90ZXh0U2ltaWxhcml0eShwYXJzZWQubmFtZSwgdGl0bGUpID4gMC43NTtcbiAgICAgICAgICAgIHZhciBoZWFkbGluZU1hdGNoZXMgPSB0aGlzLl90ZXh0U2ltaWxhcml0eShwYXJzZWQuaGVhZGxpbmUsIHRpdGxlKSA+IDAuNzU7XG5cbiAgICAgICAgICAgIGlmIChoZWFkbGluZU1hdGNoZXMgJiYgIW5hbWVNYXRjaGVzKSB7XG4gICAgICAgICAgICAgIG1ldGFkYXRhLnRpdGxlID0gcGFyc2VkLmhlYWRsaW5lO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWV0YWRhdGEudGl0bGUgPSBwYXJzZWQubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXJzZWQubmFtZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgbWV0YWRhdGEudGl0bGUgPSBwYXJzZWQubmFtZS50cmltKCk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyc2VkLmhlYWRsaW5lID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBtZXRhZGF0YS50aXRsZSA9IHBhcnNlZC5oZWFkbGluZS50cmltKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwYXJzZWQuYXV0aG9yKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhcnNlZC5hdXRob3IubmFtZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICBtZXRhZGF0YS5ieWxpbmUgPSBwYXJzZWQuYXV0aG9yLm5hbWUudHJpbSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHBhcnNlZC5hdXRob3IpICYmIHBhcnNlZC5hdXRob3JbMF0gJiYgdHlwZW9mIHBhcnNlZC5hdXRob3JbMF0ubmFtZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICBtZXRhZGF0YS5ieWxpbmUgPSBwYXJzZWQuYXV0aG9yXG4gICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihhdXRob3IpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBhdXRob3IgJiYgdHlwZW9mIGF1dGhvci5uYW1lID09PSBcInN0cmluZ1wiO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihhdXRob3IpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBhdXRob3IubmFtZS50cmltKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuam9pbihcIiwgXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIHBhcnNlZC5kZXNjcmlwdGlvbiA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgbWV0YWRhdGEuZXhjZXJwdCA9IHBhcnNlZC5kZXNjcmlwdGlvbi50cmltKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHBhcnNlZC5wdWJsaXNoZXIgJiZcbiAgICAgICAgICAgIHR5cGVvZiBwYXJzZWQucHVibGlzaGVyLm5hbWUgPT09IFwic3RyaW5nXCJcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIG1ldGFkYXRhLnNpdGVOYW1lID0gcGFyc2VkLnB1Ymxpc2hlci5uYW1lLnRyaW0oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB0aGlzLmxvZyhlcnIubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWV0YWRhdGEgPyBtZXRhZGF0YSA6IHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byBnZXQgZXhjZXJwdCBhbmQgYnlsaW5lIG1ldGFkYXRhIGZvciB0aGUgYXJ0aWNsZS5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGpzb25sZCDigJQgb2JqZWN0IGNvbnRhaW5pbmcgYW55IG1ldGFkYXRhIHRoYXRcbiAgICogY291bGQgYmUgZXh0cmFjdGVkIGZyb20gSlNPTi1MRCBvYmplY3QuXG4gICAqXG4gICAqIEByZXR1cm4gT2JqZWN0IHdpdGggb3B0aW9uYWwgXCJleGNlcnB0XCIgYW5kIFwiYnlsaW5lXCIgcHJvcGVydGllc1xuICAgKi9cbiAgX2dldEFydGljbGVNZXRhZGF0YTogZnVuY3Rpb24oanNvbmxkKSB7XG4gICAgdmFyIG1ldGFkYXRhID0ge307XG4gICAgdmFyIHZhbHVlcyA9IHt9O1xuICAgIHZhciBtZXRhRWxlbWVudHMgPSB0aGlzLl9kb2MuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJtZXRhXCIpO1xuXG4gICAgLy8gcHJvcGVydHkgaXMgYSBzcGFjZS1zZXBhcmF0ZWQgbGlzdCBvZiB2YWx1ZXNcbiAgICB2YXIgcHJvcGVydHlQYXR0ZXJuID0gL1xccyooZGN8ZGN0ZXJtfG9nfHR3aXR0ZXIpXFxzKjpcXHMqKGF1dGhvcnxjcmVhdG9yfGRlc2NyaXB0aW9ufHRpdGxlfHNpdGVfbmFtZSlcXHMqL2dpO1xuXG4gICAgLy8gbmFtZSBpcyBhIHNpbmdsZSB2YWx1ZVxuICAgIHZhciBuYW1lUGF0dGVybiA9IC9eXFxzKig/OihkY3xkY3Rlcm18b2d8dHdpdHRlcnx3ZWlibzooYXJ0aWNsZXx3ZWJwYWdlKSlcXHMqW1xcLjpdXFxzKik/KGF1dGhvcnxjcmVhdG9yfGRlc2NyaXB0aW9ufHRpdGxlfHNpdGVfbmFtZSlcXHMqJC9pO1xuXG4gICAgLy8gRmluZCBkZXNjcmlwdGlvbiB0YWdzLlxuICAgIHRoaXMuX2ZvckVhY2hOb2RlKG1ldGFFbGVtZW50cywgZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgdmFyIGVsZW1lbnROYW1lID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJuYW1lXCIpO1xuICAgICAgdmFyIGVsZW1lbnRQcm9wZXJ0eSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKFwicHJvcGVydHlcIik7XG4gICAgICB2YXIgY29udGVudCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiY29udGVudFwiKTtcbiAgICAgIGlmICghY29udGVudCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgbWF0Y2hlcyA9IG51bGw7XG4gICAgICB2YXIgbmFtZSA9IG51bGw7XG5cbiAgICAgIGlmIChlbGVtZW50UHJvcGVydHkpIHtcbiAgICAgICAgbWF0Y2hlcyA9IGVsZW1lbnRQcm9wZXJ0eS5tYXRjaChwcm9wZXJ0eVBhdHRlcm4pO1xuICAgICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICAgIC8vIENvbnZlcnQgdG8gbG93ZXJjYXNlLCBhbmQgcmVtb3ZlIGFueSB3aGl0ZXNwYWNlXG4gICAgICAgICAgLy8gc28gd2UgY2FuIG1hdGNoIGJlbG93LlxuICAgICAgICAgIG5hbWUgPSBtYXRjaGVzWzBdLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXFxzL2csIFwiXCIpO1xuICAgICAgICAgIC8vIG11bHRpcGxlIGF1dGhvcnNcbiAgICAgICAgICB2YWx1ZXNbbmFtZV0gPSBjb250ZW50LnRyaW0oKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFtYXRjaGVzICYmIGVsZW1lbnROYW1lICYmIG5hbWVQYXR0ZXJuLnRlc3QoZWxlbWVudE5hbWUpKSB7XG4gICAgICAgIG5hbWUgPSBlbGVtZW50TmFtZTtcbiAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAvLyBDb252ZXJ0IHRvIGxvd2VyY2FzZSwgcmVtb3ZlIGFueSB3aGl0ZXNwYWNlLCBhbmQgY29udmVydCBkb3RzXG4gICAgICAgICAgLy8gdG8gY29sb25zIHNvIHdlIGNhbiBtYXRjaCBiZWxvdy5cbiAgICAgICAgICBuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1xccy9nLCBcIlwiKS5yZXBsYWNlKC9cXC4vZywgXCI6XCIpO1xuICAgICAgICAgIHZhbHVlc1tuYW1lXSA9IGNvbnRlbnQudHJpbSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBnZXQgdGl0bGVcbiAgICBtZXRhZGF0YS50aXRsZSA9IGpzb25sZC50aXRsZSB8fFxuICAgICAgICAgICAgICAgICAgICAgdmFsdWVzW1wiZGM6dGl0bGVcIl0gfHxcbiAgICAgICAgICAgICAgICAgICAgIHZhbHVlc1tcImRjdGVybTp0aXRsZVwiXSB8fFxuICAgICAgICAgICAgICAgICAgICAgdmFsdWVzW1wib2c6dGl0bGVcIl0gfHxcbiAgICAgICAgICAgICAgICAgICAgIHZhbHVlc1tcIndlaWJvOmFydGljbGU6dGl0bGVcIl0gfHxcbiAgICAgICAgICAgICAgICAgICAgIHZhbHVlc1tcIndlaWJvOndlYnBhZ2U6dGl0bGVcIl0gfHxcbiAgICAgICAgICAgICAgICAgICAgIHZhbHVlc1tcInRpdGxlXCJdIHx8XG4gICAgICAgICAgICAgICAgICAgICB2YWx1ZXNbXCJ0d2l0dGVyOnRpdGxlXCJdO1xuXG4gICAgaWYgKCFtZXRhZGF0YS50aXRsZSkge1xuICAgICAgbWV0YWRhdGEudGl0bGUgPSB0aGlzLl9nZXRBcnRpY2xlVGl0bGUoKTtcbiAgICB9XG5cbiAgICAvLyBnZXQgYXV0aG9yXG4gICAgbWV0YWRhdGEuYnlsaW5lID0ganNvbmxkLmJ5bGluZSB8fFxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlc1tcImRjOmNyZWF0b3JcIl0gfHxcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXNbXCJkY3Rlcm06Y3JlYXRvclwiXSB8fFxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlc1tcImF1dGhvclwiXTtcblxuICAgIC8vIGdldCBkZXNjcmlwdGlvblxuICAgIG1ldGFkYXRhLmV4Y2VycHQgPSBqc29ubGQuZXhjZXJwdCB8fFxuICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXNbXCJkYzpkZXNjcmlwdGlvblwiXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXNbXCJkY3Rlcm06ZGVzY3JpcHRpb25cIl0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzW1wib2c6ZGVzY3JpcHRpb25cIl0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzW1wid2VpYm86YXJ0aWNsZTpkZXNjcmlwdGlvblwiXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXNbXCJ3ZWlibzp3ZWJwYWdlOmRlc2NyaXB0aW9uXCJdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgIHZhbHVlc1tcImRlc2NyaXB0aW9uXCJdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgIHZhbHVlc1tcInR3aXR0ZXI6ZGVzY3JpcHRpb25cIl07XG5cbiAgICAvLyBnZXQgc2l0ZSBuYW1lXG4gICAgbWV0YWRhdGEuc2l0ZU5hbWUgPSBqc29ubGQuc2l0ZU5hbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlc1tcIm9nOnNpdGVfbmFtZVwiXTtcblxuICAgIC8vIGluIG1hbnkgc2l0ZXMgdGhlIG1ldGEgdmFsdWUgaXMgZXNjYXBlZCB3aXRoIEhUTUwgZW50aXRpZXMsXG4gICAgLy8gc28gaGVyZSB3ZSBuZWVkIHRvIHVuZXNjYXBlIGl0XG4gICAgbWV0YWRhdGEudGl0bGUgPSB0aGlzLl91bmVzY2FwZUh0bWxFbnRpdGllcyhtZXRhZGF0YS50aXRsZSk7XG4gICAgbWV0YWRhdGEuYnlsaW5lID0gdGhpcy5fdW5lc2NhcGVIdG1sRW50aXRpZXMobWV0YWRhdGEuYnlsaW5lKTtcbiAgICBtZXRhZGF0YS5leGNlcnB0ID0gdGhpcy5fdW5lc2NhcGVIdG1sRW50aXRpZXMobWV0YWRhdGEuZXhjZXJwdCk7XG4gICAgbWV0YWRhdGEuc2l0ZU5hbWUgPSB0aGlzLl91bmVzY2FwZUh0bWxFbnRpdGllcyhtZXRhZGF0YS5zaXRlTmFtZSk7XG5cbiAgICByZXR1cm4gbWV0YWRhdGE7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIG5vZGUgaXMgaW1hZ2UsIG9yIGlmIG5vZGUgY29udGFpbnMgZXhhY3RseSBvbmx5IG9uZSBpbWFnZVxuICAgKiB3aGV0aGVyIGFzIGEgZGlyZWN0IGNoaWxkIG9yIGFzIGl0cyBkZXNjZW5kYW50cy5cbiAgICpcbiAgICogQHBhcmFtIEVsZW1lbnRcbiAgKiovXG4gIF9pc1NpbmdsZUltYWdlOiBmdW5jdGlvbihub2RlKSB7XG4gICAgaWYgKG5vZGUudGFnTmFtZSA9PT0gXCJJTUdcIikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKG5vZGUuY2hpbGRyZW4ubGVuZ3RoICE9PSAxIHx8IG5vZGUudGV4dENvbnRlbnQudHJpbSgpICE9PSBcIlwiKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2lzU2luZ2xlSW1hZ2Uobm9kZS5jaGlsZHJlblswXSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEZpbmQgYWxsIDxub3NjcmlwdD4gdGhhdCBhcmUgbG9jYXRlZCBhZnRlciA8aW1nPiBub2RlcywgYW5kIHdoaWNoIGNvbnRhaW4gb25seSBvbmVcbiAgICogPGltZz4gZWxlbWVudC4gUmVwbGFjZSB0aGUgZmlyc3QgaW1hZ2Ugd2l0aCB0aGUgaW1hZ2UgZnJvbSBpbnNpZGUgdGhlIDxub3NjcmlwdD4gdGFnLFxuICAgKiBhbmQgcmVtb3ZlIHRoZSA8bm9zY3JpcHQ+IHRhZy4gVGhpcyBpbXByb3ZlcyB0aGUgcXVhbGl0eSBvZiB0aGUgaW1hZ2VzIHdlIHVzZSBvblxuICAgKiBzb21lIHNpdGVzIChlLmcuIE1lZGl1bSkuXG4gICAqXG4gICAqIEBwYXJhbSBFbGVtZW50XG4gICoqL1xuICBfdW53cmFwTm9zY3JpcHRJbWFnZXM6IGZ1bmN0aW9uKGRvYykge1xuICAgIC8vIEZpbmQgaW1nIHdpdGhvdXQgc291cmNlIG9yIGF0dHJpYnV0ZXMgdGhhdCBtaWdodCBjb250YWlucyBpbWFnZSwgYW5kIHJlbW92ZSBpdC5cbiAgICAvLyBUaGlzIGlzIGRvbmUgdG8gcHJldmVudCBhIHBsYWNlaG9sZGVyIGltZyBpcyByZXBsYWNlZCBieSBpbWcgZnJvbSBub3NjcmlwdCBpbiBuZXh0IHN0ZXAuXG4gICAgdmFyIGltZ3MgPSBBcnJheS5mcm9tKGRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImltZ1wiKSk7XG4gICAgdGhpcy5fZm9yRWFjaE5vZGUoaW1ncywgZnVuY3Rpb24oaW1nKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGltZy5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBhdHRyID0gaW1nLmF0dHJpYnV0ZXNbaV07XG4gICAgICAgIHN3aXRjaCAoYXR0ci5uYW1lKSB7XG4gICAgICAgICAgY2FzZSBcInNyY1wiOlxuICAgICAgICAgIGNhc2UgXCJzcmNzZXRcIjpcbiAgICAgICAgICBjYXNlIFwiZGF0YS1zcmNcIjpcbiAgICAgICAgICBjYXNlIFwiZGF0YS1zcmNzZXRcIjpcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgvXFwuKGpwZ3xqcGVnfHBuZ3x3ZWJwKS9pLnRlc3QoYXR0ci52YWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaW1nLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoaW1nKTtcbiAgICB9KTtcblxuICAgIC8vIE5leHQgZmluZCBub3NjcmlwdCBhbmQgdHJ5IHRvIGV4dHJhY3QgaXRzIGltYWdlXG4gICAgdmFyIG5vc2NyaXB0cyA9IEFycmF5LmZyb20oZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibm9zY3JpcHRcIikpO1xuICAgIHRoaXMuX2ZvckVhY2hOb2RlKG5vc2NyaXB0cywgZnVuY3Rpb24obm9zY3JpcHQpIHtcbiAgICAgIC8vIFBhcnNlIGNvbnRlbnQgb2Ygbm9zY3JpcHQgYW5kIG1ha2Ugc3VyZSBpdCBvbmx5IGNvbnRhaW5zIGltYWdlXG4gICAgICB2YXIgdG1wID0gZG9jLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICB0bXAuaW5uZXJIVE1MID0gbm9zY3JpcHQuaW5uZXJIVE1MO1xuICAgICAgaWYgKCF0aGlzLl9pc1NpbmdsZUltYWdlKHRtcCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBub3NjcmlwdCBoYXMgcHJldmlvdXMgc2libGluZyBhbmQgaXQgb25seSBjb250YWlucyBpbWFnZSxcbiAgICAgIC8vIHJlcGxhY2UgaXQgd2l0aCBub3NjcmlwdCBjb250ZW50LiBIb3dldmVyIHdlIGFsc28ga2VlcCBvbGRcbiAgICAgIC8vIGF0dHJpYnV0ZXMgdGhhdCBtaWdodCBjb250YWlucyBpbWFnZS5cbiAgICAgIHZhciBwcmV2RWxlbWVudCA9IG5vc2NyaXB0LnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG4gICAgICBpZiAocHJldkVsZW1lbnQgJiYgdGhpcy5faXNTaW5nbGVJbWFnZShwcmV2RWxlbWVudCkpIHtcbiAgICAgICAgdmFyIHByZXZJbWcgPSBwcmV2RWxlbWVudDtcbiAgICAgICAgaWYgKHByZXZJbWcudGFnTmFtZSAhPT0gXCJJTUdcIikge1xuICAgICAgICAgIHByZXZJbWcgPSBwcmV2RWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImltZ1wiKVswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuZXdJbWcgPSB0bXAuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbWdcIilbMF07XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJldkltZy5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGF0dHIgPSBwcmV2SW1nLmF0dHJpYnV0ZXNbaV07XG4gICAgICAgICAgaWYgKGF0dHIudmFsdWUgPT09IFwiXCIpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChhdHRyLm5hbWUgPT09IFwic3JjXCIgfHwgYXR0ci5uYW1lID09PSBcInNyY3NldFwiIHx8IC9cXC4oanBnfGpwZWd8cG5nfHdlYnApL2kudGVzdChhdHRyLnZhbHVlKSkge1xuICAgICAgICAgICAgaWYgKG5ld0ltZy5nZXRBdHRyaWJ1dGUoYXR0ci5uYW1lKSA9PT0gYXR0ci52YWx1ZSkge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGF0dHJOYW1lID0gYXR0ci5uYW1lO1xuICAgICAgICAgICAgaWYgKG5ld0ltZy5oYXNBdHRyaWJ1dGUoYXR0ck5hbWUpKSB7XG4gICAgICAgICAgICAgIGF0dHJOYW1lID0gXCJkYXRhLW9sZC1cIiArIGF0dHJOYW1lO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXdJbWcuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBhdHRyLnZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBub3NjcmlwdC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZCh0bXAuZmlyc3RFbGVtZW50Q2hpbGQsIHByZXZFbGVtZW50KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlcyBzY3JpcHQgdGFncyBmcm9tIHRoZSBkb2N1bWVudC5cbiAgICpcbiAgICogQHBhcmFtIEVsZW1lbnRcbiAgKiovXG4gIF9yZW1vdmVTY3JpcHRzOiBmdW5jdGlvbihkb2MpIHtcbiAgICB0aGlzLl9yZW1vdmVOb2Rlcyh0aGlzLl9nZXRBbGxOb2Rlc1dpdGhUYWcoZG9jLCBbXCJzY3JpcHRcIl0pLCBmdW5jdGlvbihzY3JpcHROb2RlKSB7XG4gICAgICBzY3JpcHROb2RlLm5vZGVWYWx1ZSA9IFwiXCI7XG4gICAgICBzY3JpcHROb2RlLnJlbW92ZUF0dHJpYnV0ZShcInNyY1wiKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMuX3JlbW92ZU5vZGVzKHRoaXMuX2dldEFsbE5vZGVzV2l0aFRhZyhkb2MsIFtcIm5vc2NyaXB0XCJdKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRoaXMgbm9kZSBoYXMgb25seSB3aGl0ZXNwYWNlIGFuZCBhIHNpbmdsZSBlbGVtZW50IHdpdGggZ2l2ZW4gdGFnXG4gICAqIFJldHVybnMgZmFsc2UgaWYgdGhlIERJViBub2RlIGNvbnRhaW5zIG5vbi1lbXB0eSB0ZXh0IG5vZGVzXG4gICAqIG9yIGlmIGl0IGNvbnRhaW5zIG5vIGVsZW1lbnQgd2l0aCBnaXZlbiB0YWcgb3IgbW9yZSB0aGFuIDEgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIEVsZW1lbnRcbiAgICogQHBhcmFtIHN0cmluZyB0YWcgb2YgY2hpbGQgZWxlbWVudFxuICAqKi9cbiAgX2hhc1NpbmdsZVRhZ0luc2lkZUVsZW1lbnQ6IGZ1bmN0aW9uKGVsZW1lbnQsIHRhZykge1xuICAgIC8vIFRoZXJlIHNob3VsZCBiZSBleGFjdGx5IDEgZWxlbWVudCBjaGlsZCB3aXRoIGdpdmVuIHRhZ1xuICAgIGlmIChlbGVtZW50LmNoaWxkcmVuLmxlbmd0aCAhPSAxIHx8IGVsZW1lbnQuY2hpbGRyZW5bMF0udGFnTmFtZSAhPT0gdGFnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gQW5kIHRoZXJlIHNob3VsZCBiZSBubyB0ZXh0IG5vZGVzIHdpdGggcmVhbCBjb250ZW50XG4gICAgcmV0dXJuICF0aGlzLl9zb21lTm9kZShlbGVtZW50LmNoaWxkTm9kZXMsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHJldHVybiBub2RlLm5vZGVUeXBlID09PSB0aGlzLlRFWFRfTk9ERSAmJlxuICAgICAgICAgICAgIHRoaXMuUkVHRVhQUy5oYXNDb250ZW50LnRlc3Qobm9kZS50ZXh0Q29udGVudCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX2lzRWxlbWVudFdpdGhvdXRDb250ZW50OiBmdW5jdGlvbihub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUubm9kZVR5cGUgPT09IHRoaXMuRUxFTUVOVF9OT0RFICYmXG4gICAgICBub2RlLnRleHRDb250ZW50LnRyaW0oKS5sZW5ndGggPT0gMCAmJlxuICAgICAgKG5vZGUuY2hpbGRyZW4ubGVuZ3RoID09IDAgfHxcbiAgICAgICBub2RlLmNoaWxkcmVuLmxlbmd0aCA9PSBub2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYnJcIikubGVuZ3RoICsgbm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhyXCIpLmxlbmd0aCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIERldGVybWluZSB3aGV0aGVyIGVsZW1lbnQgaGFzIGFueSBjaGlsZHJlbiBibG9jayBsZXZlbCBlbGVtZW50cy5cbiAgICpcbiAgICogQHBhcmFtIEVsZW1lbnRcbiAgICovXG4gIF9oYXNDaGlsZEJsb2NrRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy5fc29tZU5vZGUoZWxlbWVudC5jaGlsZE5vZGVzLCBmdW5jdGlvbihub2RlKSB7XG4gICAgICByZXR1cm4gdGhpcy5ESVZfVE9fUF9FTEVNUy5oYXMobm9kZS50YWdOYW1lKSB8fFxuICAgICAgICAgICAgIHRoaXMuX2hhc0NoaWxkQmxvY2tFbGVtZW50KG5vZGUpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKipcbiAgICogRGV0ZXJtaW5lIGlmIGEgbm9kZSBxdWFsaWZpZXMgYXMgcGhyYXNpbmcgY29udGVudC5cbiAgICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvR3VpZGUvSFRNTC9Db250ZW50X2NhdGVnb3JpZXMjUGhyYXNpbmdfY29udGVudFxuICAqKi9cbiAgX2lzUGhyYXNpbmdDb250ZW50OiBmdW5jdGlvbihub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUubm9kZVR5cGUgPT09IHRoaXMuVEVYVF9OT0RFIHx8IHRoaXMuUEhSQVNJTkdfRUxFTVMuaW5kZXhPZihub2RlLnRhZ05hbWUpICE9PSAtMSB8fFxuICAgICAgKChub2RlLnRhZ05hbWUgPT09IFwiQVwiIHx8IG5vZGUudGFnTmFtZSA9PT0gXCJERUxcIiB8fCBub2RlLnRhZ05hbWUgPT09IFwiSU5TXCIpICYmXG4gICAgICAgIHRoaXMuX2V2ZXJ5Tm9kZShub2RlLmNoaWxkTm9kZXMsIHRoaXMuX2lzUGhyYXNpbmdDb250ZW50KSk7XG4gIH0sXG5cbiAgX2lzV2hpdGVzcGFjZTogZnVuY3Rpb24obm9kZSkge1xuICAgIHJldHVybiAobm9kZS5ub2RlVHlwZSA9PT0gdGhpcy5URVhUX05PREUgJiYgbm9kZS50ZXh0Q29udGVudC50cmltKCkubGVuZ3RoID09PSAwKSB8fFxuICAgICAgICAgICAobm9kZS5ub2RlVHlwZSA9PT0gdGhpcy5FTEVNRU5UX05PREUgJiYgbm9kZS50YWdOYW1lID09PSBcIkJSXCIpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGlubmVyIHRleHQgb2YgYSBub2RlIC0gY3Jvc3MgYnJvd3NlciBjb21wYXRpYmx5LlxuICAgKiBUaGlzIGFsc28gc3RyaXBzIG91dCBhbnkgZXhjZXNzIHdoaXRlc3BhY2UgdG8gYmUgZm91bmQuXG4gICAqXG4gICAqIEBwYXJhbSBFbGVtZW50XG4gICAqIEBwYXJhbSBCb29sZWFuIG5vcm1hbGl6ZVNwYWNlcyAoZGVmYXVsdDogdHJ1ZSlcbiAgICogQHJldHVybiBzdHJpbmdcbiAgKiovXG4gIF9nZXRJbm5lclRleHQ6IGZ1bmN0aW9uKGUsIG5vcm1hbGl6ZVNwYWNlcykge1xuICAgIG5vcm1hbGl6ZVNwYWNlcyA9ICh0eXBlb2Ygbm9ybWFsaXplU3BhY2VzID09PSBcInVuZGVmaW5lZFwiKSA/IHRydWUgOiBub3JtYWxpemVTcGFjZXM7XG4gICAgdmFyIHRleHRDb250ZW50ID0gZS50ZXh0Q29udGVudC50cmltKCk7XG5cbiAgICBpZiAobm9ybWFsaXplU3BhY2VzKSB7XG4gICAgICByZXR1cm4gdGV4dENvbnRlbnQucmVwbGFjZSh0aGlzLlJFR0VYUFMubm9ybWFsaXplLCBcIiBcIik7XG4gICAgfVxuICAgIHJldHVybiB0ZXh0Q29udGVudDtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IHRoZSBudW1iZXIgb2YgdGltZXMgYSBzdHJpbmcgcyBhcHBlYXJzIGluIHRoZSBub2RlIGUuXG4gICAqXG4gICAqIEBwYXJhbSBFbGVtZW50XG4gICAqIEBwYXJhbSBzdHJpbmcgLSB3aGF0IHRvIHNwbGl0IG9uLiBEZWZhdWx0IGlzIFwiLFwiXG4gICAqIEByZXR1cm4gbnVtYmVyIChpbnRlZ2VyKVxuICAqKi9cbiAgX2dldENoYXJDb3VudDogZnVuY3Rpb24oZSwgcykge1xuICAgIHMgPSBzIHx8IFwiLFwiO1xuICAgIHJldHVybiB0aGlzLl9nZXRJbm5lclRleHQoZSkuc3BsaXQocykubGVuZ3RoIC0gMTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBzdHlsZSBhdHRyaWJ1dGUgb24gZXZlcnkgZSBhbmQgdW5kZXIuXG4gICAqIFRPRE86IFRlc3QgaWYgZ2V0RWxlbWVudHNCeVRhZ05hbWUoKikgaXMgZmFzdGVyLlxuICAgKlxuICAgKiBAcGFyYW0gRWxlbWVudFxuICAgKiBAcmV0dXJuIHZvaWRcbiAgKiovXG4gIF9jbGVhblN0eWxlczogZnVuY3Rpb24oZSkge1xuICAgIGlmICghZSB8fCBlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJzdmdcIilcbiAgICAgIHJldHVybjtcblxuICAgIC8vIFJlbW92ZSBgc3R5bGVgIGFuZCBkZXByZWNhdGVkIHByZXNlbnRhdGlvbmFsIGF0dHJpYnV0ZXNcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuUFJFU0VOVEFUSU9OQUxfQVRUUklCVVRFUy5sZW5ndGg7IGkrKykge1xuICAgICAgZS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5QUkVTRU5UQVRJT05BTF9BVFRSSUJVVEVTW2ldKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5ERVBSRUNBVEVEX1NJWkVfQVRUUklCVVRFX0VMRU1TLmluZGV4T2YoZS50YWdOYW1lKSAhPT0gLTEpIHtcbiAgICAgIGUucmVtb3ZlQXR0cmlidXRlKFwid2lkdGhcIik7XG4gICAgICBlLnJlbW92ZUF0dHJpYnV0ZShcImhlaWdodFwiKTtcbiAgICB9XG5cbiAgICB2YXIgY3VyID0gZS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICB3aGlsZSAoY3VyICE9PSBudWxsKSB7XG4gICAgICB0aGlzLl9jbGVhblN0eWxlcyhjdXIpO1xuICAgICAgY3VyID0gY3VyLm5leHRFbGVtZW50U2libGluZztcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZGVuc2l0eSBvZiBsaW5rcyBhcyBhIHBlcmNlbnRhZ2Ugb2YgdGhlIGNvbnRlbnRcbiAgICogVGhpcyBpcyB0aGUgYW1vdW50IG9mIHRleHQgdGhhdCBpcyBpbnNpZGUgYSBsaW5rIGRpdmlkZWQgYnkgdGhlIHRvdGFsIHRleHQgaW4gdGhlIG5vZGUuXG4gICAqXG4gICAqIEBwYXJhbSBFbGVtZW50XG4gICAqIEByZXR1cm4gbnVtYmVyIChmbG9hdClcbiAgKiovXG4gIF9nZXRMaW5rRGVuc2l0eTogZnVuY3Rpb24oZWxlbWVudCkge1xuICAgIHZhciB0ZXh0TGVuZ3RoID0gdGhpcy5fZ2V0SW5uZXJUZXh0KGVsZW1lbnQpLmxlbmd0aDtcbiAgICBpZiAodGV4dExlbmd0aCA9PT0gMClcbiAgICAgIHJldHVybiAwO1xuXG4gICAgdmFyIGxpbmtMZW5ndGggPSAwO1xuXG4gICAgLy8gWFhYIGltcGxlbWVudCBfcmVkdWNlTm9kZUxpc3Q/XG4gICAgdGhpcy5fZm9yRWFjaE5vZGUoZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImFcIiksIGZ1bmN0aW9uKGxpbmtOb2RlKSB7XG4gICAgICB2YXIgaHJlZiA9IGxpbmtOb2RlLmdldEF0dHJpYnV0ZShcImhyZWZcIik7XG4gICAgICB2YXIgY29lZmZpY2llbnQgPSBocmVmICYmIHRoaXMuUkVHRVhQUy5oYXNoVXJsLnRlc3QoaHJlZikgPyAwLjMgOiAxO1xuICAgICAgbGlua0xlbmd0aCArPSB0aGlzLl9nZXRJbm5lclRleHQobGlua05vZGUpLmxlbmd0aCAqIGNvZWZmaWNpZW50O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGxpbmtMZW5ndGggLyB0ZXh0TGVuZ3RoO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgYW4gZWxlbWVudHMgY2xhc3MvaWQgd2VpZ2h0LiBVc2VzIHJlZ3VsYXIgZXhwcmVzc2lvbnMgdG8gdGVsbCBpZiB0aGlzXG4gICAqIGVsZW1lbnQgbG9va3MgZ29vZCBvciBiYWQuXG4gICAqXG4gICAqIEBwYXJhbSBFbGVtZW50XG4gICAqIEByZXR1cm4gbnVtYmVyIChJbnRlZ2VyKVxuICAqKi9cbiAgX2dldENsYXNzV2VpZ2h0OiBmdW5jdGlvbihlKSB7XG4gICAgaWYgKCF0aGlzLl9mbGFnSXNBY3RpdmUodGhpcy5GTEFHX1dFSUdIVF9DTEFTU0VTKSlcbiAgICAgIHJldHVybiAwO1xuXG4gICAgdmFyIHdlaWdodCA9IDA7XG5cbiAgICAvLyBMb29rIGZvciBhIHNwZWNpYWwgY2xhc3NuYW1lXG4gICAgaWYgKHR5cGVvZihlLmNsYXNzTmFtZSkgPT09IFwic3RyaW5nXCIgJiYgZS5jbGFzc05hbWUgIT09IFwiXCIpIHtcbiAgICAgIGlmICh0aGlzLlJFR0VYUFMubmVnYXRpdmUudGVzdChlLmNsYXNzTmFtZSkpXG4gICAgICAgIHdlaWdodCAtPSAyNTtcblxuICAgICAgaWYgKHRoaXMuUkVHRVhQUy5wb3NpdGl2ZS50ZXN0KGUuY2xhc3NOYW1lKSlcbiAgICAgICAgd2VpZ2h0ICs9IDI1O1xuICAgIH1cblxuICAgIC8vIExvb2sgZm9yIGEgc3BlY2lhbCBJRFxuICAgIGlmICh0eXBlb2YoZS5pZCkgPT09IFwic3RyaW5nXCIgJiYgZS5pZCAhPT0gXCJcIikge1xuICAgICAgaWYgKHRoaXMuUkVHRVhQUy5uZWdhdGl2ZS50ZXN0KGUuaWQpKVxuICAgICAgICB3ZWlnaHQgLT0gMjU7XG5cbiAgICAgIGlmICh0aGlzLlJFR0VYUFMucG9zaXRpdmUudGVzdChlLmlkKSlcbiAgICAgICAgd2VpZ2h0ICs9IDI1O1xuICAgIH1cblxuICAgIHJldHVybiB3ZWlnaHQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENsZWFuIGEgbm9kZSBvZiBhbGwgZWxlbWVudHMgb2YgdHlwZSBcInRhZ1wiLlxuICAgKiAoVW5sZXNzIGl0J3MgYSB5b3V0dWJlL3ZpbWVvIHZpZGVvLiBQZW9wbGUgbG92ZSBtb3ZpZXMuKVxuICAgKlxuICAgKiBAcGFyYW0gRWxlbWVudFxuICAgKiBAcGFyYW0gc3RyaW5nIHRhZyB0byBjbGVhblxuICAgKiBAcmV0dXJuIHZvaWRcbiAgICoqL1xuICBfY2xlYW46IGZ1bmN0aW9uKGUsIHRhZykge1xuICAgIHZhciBpc0VtYmVkID0gW1wib2JqZWN0XCIsIFwiZW1iZWRcIiwgXCJpZnJhbWVcIl0uaW5kZXhPZih0YWcpICE9PSAtMTtcblxuICAgIHRoaXMuX3JlbW92ZU5vZGVzKHRoaXMuX2dldEFsbE5vZGVzV2l0aFRhZyhlLCBbdGFnXSksIGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgIC8vIEFsbG93IHlvdXR1YmUgYW5kIHZpbWVvIHZpZGVvcyB0aHJvdWdoIGFzIHBlb3BsZSB1c3VhbGx5IHdhbnQgdG8gc2VlIHRob3NlLlxuICAgICAgaWYgKGlzRW1iZWQpIHtcbiAgICAgICAgLy8gRmlyc3QsIGNoZWNrIHRoZSBlbGVtZW50cyBhdHRyaWJ1dGVzIHRvIHNlZSBpZiBhbnkgb2YgdGhlbSBjb250YWluIHlvdXR1YmUgb3IgdmltZW9cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50LmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAodGhpcy5SRUdFWFBTLnZpZGVvcy50ZXN0KGVsZW1lbnQuYXR0cmlidXRlc1tpXS52YWx1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGb3IgZW1iZWQgd2l0aCA8b2JqZWN0PiB0YWcsIGNoZWNrIGlubmVyIEhUTUwgYXMgd2VsbC5cbiAgICAgICAgaWYgKGVsZW1lbnQudGFnTmFtZSA9PT0gXCJvYmplY3RcIiAmJiB0aGlzLlJFR0VYUFMudmlkZW9zLnRlc3QoZWxlbWVudC5pbm5lckhUTUwpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBhIGdpdmVuIG5vZGUgaGFzIG9uZSBvZiBpdHMgYW5jZXN0b3IgdGFnIG5hbWUgbWF0Y2hpbmcgdGhlXG4gICAqIHByb3ZpZGVkIG9uZS5cbiAgICogQHBhcmFtICBIVE1MRWxlbWVudCBub2RlXG4gICAqIEBwYXJhbSAgU3RyaW5nICAgICAgdGFnTmFtZVxuICAgKiBAcGFyYW0gIE51bWJlciAgICAgIG1heERlcHRoXG4gICAqIEBwYXJhbSAgRnVuY3Rpb24gICAgZmlsdGVyRm4gYSBmaWx0ZXIgdG8gaW52b2tlIHRvIGRldGVybWluZSB3aGV0aGVyIHRoaXMgbm9kZSAnY291bnRzJ1xuICAgKiBAcmV0dXJuIEJvb2xlYW5cbiAgICovXG4gIF9oYXNBbmNlc3RvclRhZzogZnVuY3Rpb24obm9kZSwgdGFnTmFtZSwgbWF4RGVwdGgsIGZpbHRlckZuKSB7XG4gICAgbWF4RGVwdGggPSBtYXhEZXB0aCB8fCAzO1xuICAgIHRhZ05hbWUgPSB0YWdOYW1lLnRvVXBwZXJDYXNlKCk7XG4gICAgdmFyIGRlcHRoID0gMDtcbiAgICB3aGlsZSAobm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICBpZiAobWF4RGVwdGggPiAwICYmIGRlcHRoID4gbWF4RGVwdGgpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChub2RlLnBhcmVudE5vZGUudGFnTmFtZSA9PT0gdGFnTmFtZSAmJiAoIWZpbHRlckZuIHx8IGZpbHRlckZuKG5vZGUucGFyZW50Tm9kZSkpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgICBkZXB0aCsrO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybiBhbiBvYmplY3QgaW5kaWNhdGluZyBob3cgbWFueSByb3dzIGFuZCBjb2x1bW5zIHRoaXMgdGFibGUgaGFzLlxuICAgKi9cbiAgX2dldFJvd0FuZENvbHVtbkNvdW50OiBmdW5jdGlvbih0YWJsZSkge1xuICAgIHZhciByb3dzID0gMDtcbiAgICB2YXIgY29sdW1ucyA9IDA7XG4gICAgdmFyIHRycyA9IHRhYmxlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidHJcIik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciByb3dzcGFuID0gdHJzW2ldLmdldEF0dHJpYnV0ZShcInJvd3NwYW5cIikgfHwgMDtcbiAgICAgIGlmIChyb3dzcGFuKSB7XG4gICAgICAgIHJvd3NwYW4gPSBwYXJzZUludChyb3dzcGFuLCAxMCk7XG4gICAgICB9XG4gICAgICByb3dzICs9IChyb3dzcGFuIHx8IDEpO1xuXG4gICAgICAvLyBOb3cgbG9vayBmb3IgY29sdW1uLXJlbGF0ZWQgaW5mb1xuICAgICAgdmFyIGNvbHVtbnNJblRoaXNSb3cgPSAwO1xuICAgICAgdmFyIGNlbGxzID0gdHJzW2ldLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGRcIik7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNlbGxzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBjb2xzcGFuID0gY2VsbHNbal0uZ2V0QXR0cmlidXRlKFwiY29sc3BhblwiKSB8fCAwO1xuICAgICAgICBpZiAoY29sc3Bhbikge1xuICAgICAgICAgIGNvbHNwYW4gPSBwYXJzZUludChjb2xzcGFuLCAxMCk7XG4gICAgICAgIH1cbiAgICAgICAgY29sdW1uc0luVGhpc1JvdyArPSAoY29sc3BhbiB8fCAxKTtcbiAgICAgIH1cbiAgICAgIGNvbHVtbnMgPSBNYXRoLm1heChjb2x1bW5zLCBjb2x1bW5zSW5UaGlzUm93KTtcbiAgICB9XG4gICAgcmV0dXJuIHtyb3dzOiByb3dzLCBjb2x1bW5zOiBjb2x1bW5zfTtcbiAgfSxcblxuICAvKipcbiAgICogTG9vayBmb3IgJ2RhdGEnIChhcyBvcHBvc2VkIHRvICdsYXlvdXQnKSB0YWJsZXMsIGZvciB3aGljaCB3ZSB1c2VcbiAgICogc2ltaWxhciBjaGVja3MgYXNcbiAgICogaHR0cHM6Ly9zZWFyY2hmb3gub3JnL21vemlsbGEtY2VudHJhbC9yZXYvZjgyZDVjNTQ5ZjA0NmNiNjRjZTU2MDJiZmQ4OTRiN2FlODA3YzhmOC9hY2Nlc3NpYmxlL2dlbmVyaWMvVGFibGVBY2Nlc3NpYmxlLmNwcCMxOVxuICAgKi9cbiAgX21hcmtEYXRhVGFibGVzOiBmdW5jdGlvbihyb290KSB7XG4gICAgdmFyIHRhYmxlcyA9IHJvb3QuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ0YWJsZVwiKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhYmxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHRhYmxlID0gdGFibGVzW2ldO1xuICAgICAgdmFyIHJvbGUgPSB0YWJsZS5nZXRBdHRyaWJ1dGUoXCJyb2xlXCIpO1xuICAgICAgaWYgKHJvbGUgPT0gXCJwcmVzZW50YXRpb25cIikge1xuICAgICAgICB0YWJsZS5fcmVhZGFiaWxpdHlEYXRhVGFibGUgPSBmYWxzZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgZGF0YXRhYmxlID0gdGFibGUuZ2V0QXR0cmlidXRlKFwiZGF0YXRhYmxlXCIpO1xuICAgICAgaWYgKGRhdGF0YWJsZSA9PSBcIjBcIikge1xuICAgICAgICB0YWJsZS5fcmVhZGFiaWxpdHlEYXRhVGFibGUgPSBmYWxzZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgc3VtbWFyeSA9IHRhYmxlLmdldEF0dHJpYnV0ZShcInN1bW1hcnlcIik7XG4gICAgICBpZiAoc3VtbWFyeSkge1xuICAgICAgICB0YWJsZS5fcmVhZGFiaWxpdHlEYXRhVGFibGUgPSB0cnVlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGNhcHRpb24gPSB0YWJsZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhcHRpb25cIilbMF07XG4gICAgICBpZiAoY2FwdGlvbiAmJiBjYXB0aW9uLmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgICB0YWJsZS5fcmVhZGFiaWxpdHlEYXRhVGFibGUgPSB0cnVlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIHRhYmxlIGhhcyBhIGRlc2NlbmRhbnQgd2l0aCBhbnkgb2YgdGhlc2UgdGFncywgY29uc2lkZXIgYSBkYXRhIHRhYmxlOlxuICAgICAgdmFyIGRhdGFUYWJsZURlc2NlbmRhbnRzID0gW1wiY29sXCIsIFwiY29sZ3JvdXBcIiwgXCJ0Zm9vdFwiLCBcInRoZWFkXCIsIFwidGhcIl07XG4gICAgICB2YXIgZGVzY2VuZGFudEV4aXN0cyA9IGZ1bmN0aW9uKHRhZykge1xuICAgICAgICByZXR1cm4gISF0YWJsZS5nZXRFbGVtZW50c0J5VGFnTmFtZSh0YWcpWzBdO1xuICAgICAgfTtcbiAgICAgIGlmIChkYXRhVGFibGVEZXNjZW5kYW50cy5zb21lKGRlc2NlbmRhbnRFeGlzdHMpKSB7XG4gICAgICAgIHRoaXMubG9nKFwiRGF0YSB0YWJsZSBiZWNhdXNlIGZvdW5kIGRhdGEteSBkZXNjZW5kYW50XCIpO1xuICAgICAgICB0YWJsZS5fcmVhZGFiaWxpdHlEYXRhVGFibGUgPSB0cnVlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gTmVzdGVkIHRhYmxlcyBpbmRpY2F0ZSBhIGxheW91dCB0YWJsZTpcbiAgICAgIGlmICh0YWJsZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInRhYmxlXCIpWzBdKSB7XG4gICAgICAgIHRhYmxlLl9yZWFkYWJpbGl0eURhdGFUYWJsZSA9IGZhbHNlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNpemVJbmZvID0gdGhpcy5fZ2V0Um93QW5kQ29sdW1uQ291bnQodGFibGUpO1xuICAgICAgaWYgKHNpemVJbmZvLnJvd3MgPj0gMTAgfHwgc2l6ZUluZm8uY29sdW1ucyA+IDQpIHtcbiAgICAgICAgdGFibGUuX3JlYWRhYmlsaXR5RGF0YVRhYmxlID0gdHJ1ZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBOb3cganVzdCBnbyBieSBzaXplIGVudGlyZWx5OlxuICAgICAgdGFibGUuX3JlYWRhYmlsaXR5RGF0YVRhYmxlID0gc2l6ZUluZm8ucm93cyAqIHNpemVJbmZvLmNvbHVtbnMgPiAxMDtcbiAgICB9XG4gIH0sXG5cbiAgLyogY29udmVydCBpbWFnZXMgYW5kIGZpZ3VyZXMgdGhhdCBoYXZlIHByb3BlcnRpZXMgbGlrZSBkYXRhLXNyYyBpbnRvIGltYWdlcyB0aGF0IGNhbiBiZSBsb2FkZWQgd2l0aG91dCBKUyAqL1xuICBfZml4TGF6eUltYWdlczogZnVuY3Rpb24gKHJvb3QpIHtcbiAgICB0aGlzLl9mb3JFYWNoTm9kZSh0aGlzLl9nZXRBbGxOb2Rlc1dpdGhUYWcocm9vdCwgW1wiaW1nXCIsIFwicGljdHVyZVwiLCBcImZpZ3VyZVwiXSksIGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAvLyBJbiBzb21lIHNpdGVzIChlLmcuIEtvdGFrdSksIHRoZXkgcHV0IDFweCBzcXVhcmUgaW1hZ2UgYXMgYmFzZTY0IGRhdGEgdXJpIGluIHRoZSBzcmMgYXR0cmlidXRlLlxuICAgICAgLy8gU28sIGhlcmUgd2UgY2hlY2sgaWYgdGhlIGRhdGEgdXJpIGlzIHRvbyBzaG9ydCwganVzdCBtaWdodCBhcyB3ZWxsIHJlbW92ZSBpdC5cbiAgICAgIGlmIChlbGVtLnNyYyAmJiB0aGlzLlJFR0VYUFMuYjY0RGF0YVVybC50ZXN0KGVsZW0uc3JjKSkge1xuICAgICAgICAvLyBNYWtlIHN1cmUgaXQncyBub3QgU1ZHLCBiZWNhdXNlIFNWRyBjYW4gaGF2ZSBhIG1lYW5pbmdmdWwgaW1hZ2UgaW4gdW5kZXIgMTMzIGJ5dGVzLlxuICAgICAgICB2YXIgcGFydHMgPSB0aGlzLlJFR0VYUFMuYjY0RGF0YVVybC5leGVjKGVsZW0uc3JjKTtcbiAgICAgICAgaWYgKHBhcnRzWzFdID09PSBcImltYWdlL3N2Zyt4bWxcIikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2Ugc3VyZSB0aGlzIGVsZW1lbnQgaGFzIG90aGVyIGF0dHJpYnV0ZXMgd2hpY2ggY29udGFpbnMgaW1hZ2UuXG4gICAgICAgIC8vIElmIGl0IGRvZXNuJ3QsIHRoZW4gdGhpcyBzcmMgaXMgaW1wb3J0YW50IGFuZCBzaG91bGRuJ3QgYmUgcmVtb3ZlZC5cbiAgICAgICAgdmFyIHNyY0NvdWxkQmVSZW1vdmVkID0gZmFsc2U7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGF0dHIgPSBlbGVtLmF0dHJpYnV0ZXNbaV07XG4gICAgICAgICAgaWYgKGF0dHIubmFtZSA9PT0gXCJzcmNcIikge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKC9cXC4oanBnfGpwZWd8cG5nfHdlYnApL2kudGVzdChhdHRyLnZhbHVlKSkge1xuICAgICAgICAgICAgc3JjQ291bGRCZVJlbW92ZWQgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGVyZSB3ZSBhc3N1bWUgaWYgaW1hZ2UgaXMgbGVzcyB0aGFuIDEwMCBieXRlcyAob3IgMTMzQiBhZnRlciBlbmNvZGVkIHRvIGJhc2U2NClcbiAgICAgICAgLy8gaXQgd2lsbCBiZSB0b28gc21hbGwsIHRoZXJlZm9yZSBpdCBtaWdodCBiZSBwbGFjZWhvbGRlciBpbWFnZS5cbiAgICAgICAgaWYgKHNyY0NvdWxkQmVSZW1vdmVkKSB7XG4gICAgICAgICAgdmFyIGI2NHN0YXJ0cyA9IGVsZW0uc3JjLnNlYXJjaCgvYmFzZTY0XFxzKi9pKSArIDc7XG4gICAgICAgICAgdmFyIGI2NGxlbmd0aCA9IGVsZW0uc3JjLmxlbmd0aCAtIGI2NHN0YXJ0cztcbiAgICAgICAgICBpZiAoYjY0bGVuZ3RoIDwgMTMzKSB7XG4gICAgICAgICAgICBlbGVtLnJlbW92ZUF0dHJpYnV0ZShcInNyY1wiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gYWxzbyBjaGVjayBmb3IgXCJudWxsXCIgdG8gd29yayBhcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2pzZG9tL2pzZG9tL2lzc3Vlcy8yNTgwXG4gICAgICBpZiAoKGVsZW0uc3JjIHx8IChlbGVtLnNyY3NldCAmJiBlbGVtLnNyY3NldCAhPSBcIm51bGxcIikpICYmIGVsZW0uY2xhc3NOYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihcImxhenlcIikgPT09IC0xKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBlbGVtLmF0dHJpYnV0ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgYXR0ciA9IGVsZW0uYXR0cmlidXRlc1tqXTtcbiAgICAgICAgaWYgKGF0dHIubmFtZSA9PT0gXCJzcmNcIiB8fCBhdHRyLm5hbWUgPT09IFwic3Jjc2V0XCIgfHwgYXR0ci5uYW1lID09PSBcImFsdFwiKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvcHlUbyA9IG51bGw7XG4gICAgICAgIGlmICgvXFwuKGpwZ3xqcGVnfHBuZ3x3ZWJwKVxccytcXGQvLnRlc3QoYXR0ci52YWx1ZSkpIHtcbiAgICAgICAgICBjb3B5VG8gPSBcInNyY3NldFwiO1xuICAgICAgICB9IGVsc2UgaWYgKC9eXFxzKlxcUytcXC4oanBnfGpwZWd8cG5nfHdlYnApXFxTKlxccyokLy50ZXN0KGF0dHIudmFsdWUpKSB7XG4gICAgICAgICAgY29weVRvID0gXCJzcmNcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29weVRvKSB7XG4gICAgICAgICAgLy9pZiB0aGlzIGlzIGFuIGltZyBvciBwaWN0dXJlLCBzZXQgdGhlIGF0dHJpYnV0ZSBkaXJlY3RseVxuICAgICAgICAgIGlmIChlbGVtLnRhZ05hbWUgPT09IFwiSU1HXCIgfHwgZWxlbS50YWdOYW1lID09PSBcIlBJQ1RVUkVcIikge1xuICAgICAgICAgICAgZWxlbS5zZXRBdHRyaWJ1dGUoY29weVRvLCBhdHRyLnZhbHVlKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGVsZW0udGFnTmFtZSA9PT0gXCJGSUdVUkVcIiAmJiAhdGhpcy5fZ2V0QWxsTm9kZXNXaXRoVGFnKGVsZW0sIFtcImltZ1wiLCBcInBpY3R1cmVcIl0pLmxlbmd0aCkge1xuICAgICAgICAgICAgLy9pZiB0aGUgaXRlbSBpcyBhIDxmaWd1cmU+IHRoYXQgZG9lcyBub3QgY29udGFpbiBhbiBpbWFnZSBvciBwaWN0dXJlLCBjcmVhdGUgb25lIGFuZCBwbGFjZSBpdCBpbnNpZGUgdGhlIGZpZ3VyZVxuICAgICAgICAgICAgLy9zZWUgdGhlIG55dGltZXMtMyB0ZXN0Y2FzZSBmb3IgYW4gZXhhbXBsZVxuICAgICAgICAgICAgdmFyIGltZyA9IHRoaXMuX2RvYy5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xuICAgICAgICAgICAgaW1nLnNldEF0dHJpYnV0ZShjb3B5VG8sIGF0dHIudmFsdWUpO1xuICAgICAgICAgICAgZWxlbS5hcHBlbmRDaGlsZChpbWcpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIF9nZXRUZXh0RGVuc2l0eTogZnVuY3Rpb24oZSwgdGFncykge1xuICAgIHZhciB0ZXh0TGVuZ3RoID0gdGhpcy5fZ2V0SW5uZXJUZXh0KGUsIHRydWUpLmxlbmd0aDtcbiAgICBpZiAodGV4dExlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHZhciBjaGlsZHJlbkxlbmd0aCA9IDA7XG4gICAgdmFyIGNoaWxkcmVuID0gdGhpcy5fZ2V0QWxsTm9kZXNXaXRoVGFnKGUsIHRhZ3MpO1xuICAgIHRoaXMuX2ZvckVhY2hOb2RlKGNoaWxkcmVuLCAoY2hpbGQpID0+IGNoaWxkcmVuTGVuZ3RoICs9IHRoaXMuX2dldElubmVyVGV4dChjaGlsZCwgdHJ1ZSkubGVuZ3RoKTtcbiAgICByZXR1cm4gY2hpbGRyZW5MZW5ndGggLyB0ZXh0TGVuZ3RoO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDbGVhbiBhbiBlbGVtZW50IG9mIGFsbCB0YWdzIG9mIHR5cGUgXCJ0YWdcIiBpZiB0aGV5IGxvb2sgZmlzaHkuXG4gICAqIFwiRmlzaHlcIiBpcyBhbiBhbGdvcml0aG0gYmFzZWQgb24gY29udGVudCBsZW5ndGgsIGNsYXNzbmFtZXMsIGxpbmsgZGVuc2l0eSwgbnVtYmVyIG9mIGltYWdlcyAmIGVtYmVkcywgZXRjLlxuICAgKlxuICAgKiBAcmV0dXJuIHZvaWRcbiAgICoqL1xuICBfY2xlYW5Db25kaXRpb25hbGx5OiBmdW5jdGlvbihlLCB0YWcpIHtcbiAgICBpZiAoIXRoaXMuX2ZsYWdJc0FjdGl2ZSh0aGlzLkZMQUdfQ0xFQU5fQ09ORElUSU9OQUxMWSkpXG4gICAgICByZXR1cm47XG5cbiAgICAvLyBHYXRoZXIgY291bnRzIGZvciBvdGhlciB0eXBpY2FsIGVsZW1lbnRzIGVtYmVkZGVkIHdpdGhpbi5cbiAgICAvLyBUcmF2ZXJzZSBiYWNrd2FyZHMgc28gd2UgY2FuIHJlbW92ZSBub2RlcyBhdCB0aGUgc2FtZSB0aW1lXG4gICAgLy8gd2l0aG91dCBlZmZlY3RpbmcgdGhlIHRyYXZlcnNhbC5cbiAgICAvL1xuICAgIC8vIFRPRE86IENvbnNpZGVyIHRha2luZyBpbnRvIGFjY291bnQgb3JpZ2luYWwgY29udGVudFNjb3JlIGhlcmUuXG4gICAgdGhpcy5fcmVtb3ZlTm9kZXModGhpcy5fZ2V0QWxsTm9kZXNXaXRoVGFnKGUsIFt0YWddKSwgZnVuY3Rpb24obm9kZSkge1xuICAgICAgLy8gRmlyc3QgY2hlY2sgaWYgdGhpcyBub2RlIElTIGRhdGEgdGFibGUsIGluIHdoaWNoIGNhc2UgZG9uJ3QgcmVtb3ZlIGl0LlxuICAgICAgdmFyIGlzRGF0YVRhYmxlID0gZnVuY3Rpb24odCkge1xuICAgICAgICByZXR1cm4gdC5fcmVhZGFiaWxpdHlEYXRhVGFibGU7XG4gICAgICB9O1xuXG4gICAgICB2YXIgaXNMaXN0ID0gdGFnID09PSBcInVsXCIgfHwgdGFnID09PSBcIm9sXCI7XG4gICAgICBpZiAoIWlzTGlzdCkge1xuICAgICAgICB2YXIgbGlzdExlbmd0aCA9IDA7XG4gICAgICAgIHZhciBsaXN0Tm9kZXMgPSB0aGlzLl9nZXRBbGxOb2Rlc1dpdGhUYWcobm9kZSwgW1widWxcIiwgXCJvbFwiXSk7XG4gICAgICAgIHRoaXMuX2ZvckVhY2hOb2RlKGxpc3ROb2RlcywgKGxpc3QpID0+IGxpc3RMZW5ndGggKz0gdGhpcy5fZ2V0SW5uZXJUZXh0KGxpc3QpLmxlbmd0aCk7XG4gICAgICAgIGlzTGlzdCA9IGxpc3RMZW5ndGggLyB0aGlzLl9nZXRJbm5lclRleHQobm9kZSkubGVuZ3RoID4gMC45O1xuICAgICAgfVxuXG4gICAgICBpZiAodGFnID09PSBcInRhYmxlXCIgJiYgaXNEYXRhVGFibGUobm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBOZXh0IGNoZWNrIGlmIHdlJ3JlIGluc2lkZSBhIGRhdGEgdGFibGUsIGluIHdoaWNoIGNhc2UgZG9uJ3QgcmVtb3ZlIGl0IGFzIHdlbGwuXG4gICAgICBpZiAodGhpcy5faGFzQW5jZXN0b3JUYWcobm9kZSwgXCJ0YWJsZVwiLCAtMSwgaXNEYXRhVGFibGUpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2hhc0FuY2VzdG9yVGFnKG5vZGUsIFwiY29kZVwiKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHZhciB3ZWlnaHQgPSB0aGlzLl9nZXRDbGFzc1dlaWdodChub2RlKTtcblxuICAgICAgdGhpcy5sb2coXCJDbGVhbmluZyBDb25kaXRpb25hbGx5XCIsIG5vZGUpO1xuXG4gICAgICB2YXIgY29udGVudFNjb3JlID0gMDtcblxuICAgICAgaWYgKHdlaWdodCArIGNvbnRlbnRTY29yZSA8IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9nZXRDaGFyQ291bnQobm9kZSwgXCIsXCIpIDwgMTApIHtcbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vdCB2ZXJ5IG1hbnkgY29tbWFzLCBhbmQgdGhlIG51bWJlciBvZlxuICAgICAgICAvLyBub24tcGFyYWdyYXBoIGVsZW1lbnRzIGlzIG1vcmUgdGhhbiBwYXJhZ3JhcGhzIG9yIG90aGVyXG4gICAgICAgIC8vIG9taW5vdXMgc2lnbnMsIHJlbW92ZSB0aGUgZWxlbWVudC5cbiAgICAgICAgdmFyIHAgPSBub2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicFwiKS5sZW5ndGg7XG4gICAgICAgIHZhciBpbWcgPSBub2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW1nXCIpLmxlbmd0aDtcbiAgICAgICAgdmFyIGxpID0gbm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImxpXCIpLmxlbmd0aCAtIDEwMDtcbiAgICAgICAgdmFyIGlucHV0ID0gbm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImlucHV0XCIpLmxlbmd0aDtcbiAgICAgICAgdmFyIGhlYWRpbmdEZW5zaXR5ID0gdGhpcy5fZ2V0VGV4dERlbnNpdHkobm9kZSwgW1wiaDFcIiwgXCJoMlwiLCBcImgzXCIsIFwiaDRcIiwgXCJoNVwiLCBcImg2XCJdKTtcblxuICAgICAgICB2YXIgZW1iZWRDb3VudCA9IDA7XG4gICAgICAgIHZhciBlbWJlZHMgPSB0aGlzLl9nZXRBbGxOb2Rlc1dpdGhUYWcobm9kZSwgW1wib2JqZWN0XCIsIFwiZW1iZWRcIiwgXCJpZnJhbWVcIl0pO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW1iZWRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgLy8gSWYgdGhpcyBlbWJlZCBoYXMgYXR0cmlidXRlIHRoYXQgbWF0Y2hlcyB2aWRlbyByZWdleCwgZG9uJ3QgZGVsZXRlIGl0LlxuICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZW1iZWRzW2ldLmF0dHJpYnV0ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLlJFR0VYUFMudmlkZW9zLnRlc3QoZW1iZWRzW2ldLmF0dHJpYnV0ZXNbal0udmFsdWUpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBGb3IgZW1iZWQgd2l0aCA8b2JqZWN0PiB0YWcsIGNoZWNrIGlubmVyIEhUTUwgYXMgd2VsbC5cbiAgICAgICAgICBpZiAoZW1iZWRzW2ldLnRhZ05hbWUgPT09IFwib2JqZWN0XCIgJiYgdGhpcy5SRUdFWFBTLnZpZGVvcy50ZXN0KGVtYmVkc1tpXS5pbm5lckhUTUwpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZW1iZWRDb3VudCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxpbmtEZW5zaXR5ID0gdGhpcy5fZ2V0TGlua0RlbnNpdHkobm9kZSk7XG4gICAgICAgIHZhciBjb250ZW50TGVuZ3RoID0gdGhpcy5fZ2V0SW5uZXJUZXh0KG5vZGUpLmxlbmd0aDtcblxuICAgICAgICB2YXIgaGF2ZVRvUmVtb3ZlID1cbiAgICAgICAgICAoaW1nID4gMSAmJiBwIC8gaW1nIDwgMC41ICYmICF0aGlzLl9oYXNBbmNlc3RvclRhZyhub2RlLCBcImZpZ3VyZVwiKSkgfHxcbiAgICAgICAgICAoIWlzTGlzdCAmJiBsaSA+IHApIHx8XG4gICAgICAgICAgKGlucHV0ID4gTWF0aC5mbG9vcihwLzMpKSB8fFxuICAgICAgICAgICghaXNMaXN0ICYmIGhlYWRpbmdEZW5zaXR5IDwgMC45ICYmIGNvbnRlbnRMZW5ndGggPCAyNSAmJiAoaW1nID09PSAwIHx8IGltZyA+IDIpICYmICF0aGlzLl9oYXNBbmNlc3RvclRhZyhub2RlLCBcImZpZ3VyZVwiKSkgfHxcbiAgICAgICAgICAoIWlzTGlzdCAmJiB3ZWlnaHQgPCAyNSAmJiBsaW5rRGVuc2l0eSA+IDAuMikgfHxcbiAgICAgICAgICAod2VpZ2h0ID49IDI1ICYmIGxpbmtEZW5zaXR5ID4gMC41KSB8fFxuICAgICAgICAgICgoZW1iZWRDb3VudCA9PT0gMSAmJiBjb250ZW50TGVuZ3RoIDwgNzUpIHx8IGVtYmVkQ291bnQgPiAxKTtcbiAgICAgICAgcmV0dXJuIGhhdmVUb1JlbW92ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQ2xlYW4gb3V0IGVsZW1lbnRzIHRoYXQgbWF0Y2ggdGhlIHNwZWNpZmllZCBjb25kaXRpb25zXG4gICAqXG4gICAqIEBwYXJhbSBFbGVtZW50XG4gICAqIEBwYXJhbSBGdW5jdGlvbiBkZXRlcm1pbmVzIHdoZXRoZXIgYSBub2RlIHNob3VsZCBiZSByZW1vdmVkXG4gICAqIEByZXR1cm4gdm9pZFxuICAgKiovXG4gIF9jbGVhbk1hdGNoZWROb2RlczogZnVuY3Rpb24oZSwgZmlsdGVyKSB7XG4gICAgdmFyIGVuZE9mU2VhcmNoTWFya2VyTm9kZSA9IHRoaXMuX2dldE5leHROb2RlKGUsIHRydWUpO1xuICAgIHZhciBuZXh0ID0gdGhpcy5fZ2V0TmV4dE5vZGUoZSk7XG4gICAgd2hpbGUgKG5leHQgJiYgbmV4dCAhPSBlbmRPZlNlYXJjaE1hcmtlck5vZGUpIHtcbiAgICAgIGlmIChmaWx0ZXIuY2FsbCh0aGlzLCBuZXh0LCBuZXh0LmNsYXNzTmFtZSArIFwiIFwiICsgbmV4dC5pZCkpIHtcbiAgICAgICAgbmV4dCA9IHRoaXMuX3JlbW92ZUFuZEdldE5leHQobmV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0ID0gdGhpcy5fZ2V0TmV4dE5vZGUobmV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBDbGVhbiBvdXQgc3B1cmlvdXMgaGVhZGVycyBmcm9tIGFuIEVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBFbGVtZW50XG4gICAqIEByZXR1cm4gdm9pZFxuICAqKi9cbiAgX2NsZWFuSGVhZGVyczogZnVuY3Rpb24oZSkge1xuICAgIGxldCBoZWFkaW5nTm9kZXMgPSB0aGlzLl9nZXRBbGxOb2Rlc1dpdGhUYWcoZSwgW1wiaDFcIiwgXCJoMlwiXSk7XG4gICAgdGhpcy5fcmVtb3ZlTm9kZXMoaGVhZGluZ05vZGVzLCBmdW5jdGlvbihub2RlKSB7XG4gICAgICBsZXQgc2hvdWxkUmVtb3ZlID0gdGhpcy5fZ2V0Q2xhc3NXZWlnaHQobm9kZSkgPCAwO1xuICAgICAgaWYgKHNob3VsZFJlbW92ZSkge1xuICAgICAgICB0aGlzLmxvZyhcIlJlbW92aW5nIGhlYWRlciB3aXRoIGxvdyBjbGFzcyB3ZWlnaHQ6XCIsIG5vZGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNob3VsZFJlbW92ZTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgaWYgdGhpcyBub2RlIGlzIGFuIEgxIG9yIEgyIGVsZW1lbnQgd2hvc2UgY29udGVudCBpcyBtb3N0bHlcbiAgICogdGhlIHNhbWUgYXMgdGhlIGFydGljbGUgdGl0bGUuXG4gICAqXG4gICAqIEBwYXJhbSBFbGVtZW50ICB0aGUgbm9kZSB0byBjaGVjay5cbiAgICogQHJldHVybiBib29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0aGlzIGlzIGEgdGl0bGUtbGlrZSBoZWFkZXIuXG4gICAqL1xuICBfaGVhZGVyRHVwbGljYXRlc1RpdGxlOiBmdW5jdGlvbihub2RlKSB7XG4gICAgaWYgKG5vZGUudGFnTmFtZSAhPSBcIkgxXCIgJiYgbm9kZS50YWdOYW1lICE9IFwiSDJcIikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgaGVhZGluZyA9IHRoaXMuX2dldElubmVyVGV4dChub2RlLCBmYWxzZSk7XG4gICAgdGhpcy5sb2coXCJFdmFsdWF0aW5nIHNpbWlsYXJpdHkgb2YgaGVhZGVyOlwiLCBoZWFkaW5nLCB0aGlzLl9hcnRpY2xlVGl0bGUpO1xuICAgIHJldHVybiB0aGlzLl90ZXh0U2ltaWxhcml0eSh0aGlzLl9hcnRpY2xlVGl0bGUsIGhlYWRpbmcpID4gMC43NTtcbiAgfSxcblxuICBfZmxhZ0lzQWN0aXZlOiBmdW5jdGlvbihmbGFnKSB7XG4gICAgcmV0dXJuICh0aGlzLl9mbGFncyAmIGZsYWcpID4gMDtcbiAgfSxcblxuICBfcmVtb3ZlRmxhZzogZnVuY3Rpb24oZmxhZykge1xuICAgIHRoaXMuX2ZsYWdzID0gdGhpcy5fZmxhZ3MgJiB+ZmxhZztcbiAgfSxcblxuICBfaXNQcm9iYWJseVZpc2libGU6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAvLyBIYXZlIHRvIG51bGwtY2hlY2sgbm9kZS5zdHlsZSBhbmQgbm9kZS5jbGFzc05hbWUuaW5kZXhPZiB0byBkZWFsIHdpdGggU1ZHIGFuZCBNYXRoTUwgbm9kZXMuXG4gICAgcmV0dXJuICghbm9kZS5zdHlsZSB8fCBub2RlLnN0eWxlLmRpc3BsYXkgIT0gXCJub25lXCIpXG4gICAgICAmJiAhbm9kZS5oYXNBdHRyaWJ1dGUoXCJoaWRkZW5cIilcbiAgICAgIC8vY2hlY2sgZm9yIFwiZmFsbGJhY2staW1hZ2VcIiBzbyB0aGF0IHdpa2ltZWRpYSBtYXRoIGltYWdlcyBhcmUgZGlzcGxheWVkXG4gICAgICAmJiAoIW5vZGUuaGFzQXR0cmlidXRlKFwiYXJpYS1oaWRkZW5cIikgfHwgbm9kZS5nZXRBdHRyaWJ1dGUoXCJhcmlhLWhpZGRlblwiKSAhPSBcInRydWVcIiB8fCAobm9kZS5jbGFzc05hbWUgJiYgbm9kZS5jbGFzc05hbWUuaW5kZXhPZiAmJiBub2RlLmNsYXNzTmFtZS5pbmRleE9mKFwiZmFsbGJhY2staW1hZ2VcIikgIT09IC0xKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJ1bnMgcmVhZGFiaWxpdHkuXG4gICAqXG4gICAqIFdvcmtmbG93OlxuICAgKiAgMS4gUHJlcCB0aGUgZG9jdW1lbnQgYnkgcmVtb3Zpbmcgc2NyaXB0IHRhZ3MsIGNzcywgZXRjLlxuICAgKiAgMi4gQnVpbGQgcmVhZGFiaWxpdHkncyBET00gdHJlZS5cbiAgICogIDMuIEdyYWIgdGhlIGFydGljbGUgY29udGVudCBmcm9tIHRoZSBjdXJyZW50IGRvbSB0cmVlLlxuICAgKiAgNC4gUmVwbGFjZSB0aGUgY3VycmVudCBET00gdHJlZSB3aXRoIHRoZSBuZXcgb25lLlxuICAgKiAgNS4gUmVhZCBwZWFjZWZ1bGx5LlxuICAgKlxuICAgKiBAcmV0dXJuIHZvaWRcbiAgICoqL1xuICBwYXJzZTogZnVuY3Rpb24gKCkge1xuICAgIC8vIEF2b2lkIHBhcnNpbmcgdG9vIGxhcmdlIGRvY3VtZW50cywgYXMgcGVyIGNvbmZpZ3VyYXRpb24gb3B0aW9uXG4gICAgaWYgKHRoaXMuX21heEVsZW1zVG9QYXJzZSA+IDApIHtcbiAgICAgIHZhciBudW1UYWdzID0gdGhpcy5fZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiKlwiKS5sZW5ndGg7XG4gICAgICBpZiAobnVtVGFncyA+IHRoaXMuX21heEVsZW1zVG9QYXJzZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBYm9ydGluZyBwYXJzaW5nIGRvY3VtZW50OyBcIiArIG51bVRhZ3MgKyBcIiBlbGVtZW50cyBmb3VuZFwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBVbndyYXAgaW1hZ2UgZnJvbSBub3NjcmlwdFxuICAgIHRoaXMuX3Vud3JhcE5vc2NyaXB0SW1hZ2VzKHRoaXMuX2RvYyk7XG5cbiAgICAvLyBFeHRyYWN0IEpTT04tTEQgbWV0YWRhdGEgYmVmb3JlIHJlbW92aW5nIHNjcmlwdHNcbiAgICB2YXIganNvbkxkID0gdGhpcy5fZGlzYWJsZUpTT05MRCA/IHt9IDogdGhpcy5fZ2V0SlNPTkxEKHRoaXMuX2RvYyk7XG5cbiAgICAvLyBSZW1vdmUgc2NyaXB0IHRhZ3MgZnJvbSB0aGUgZG9jdW1lbnQuXG4gICAgdGhpcy5fcmVtb3ZlU2NyaXB0cyh0aGlzLl9kb2MpO1xuXG4gICAgdGhpcy5fcHJlcERvY3VtZW50KCk7XG5cbiAgICB2YXIgbWV0YWRhdGEgPSB0aGlzLl9nZXRBcnRpY2xlTWV0YWRhdGEoanNvbkxkKTtcbiAgICB0aGlzLl9hcnRpY2xlVGl0bGUgPSBtZXRhZGF0YS50aXRsZTtcblxuICAgIHZhciBhcnRpY2xlQ29udGVudCA9IHRoaXMuX2dyYWJBcnRpY2xlKCk7XG4gICAgaWYgKCFhcnRpY2xlQ29udGVudClcbiAgICAgIHJldHVybiBudWxsO1xuXG4gICAgdGhpcy5sb2coXCJHcmFiYmVkOiBcIiArIGFydGljbGVDb250ZW50LmlubmVySFRNTCk7XG5cbiAgICB0aGlzLl9wb3N0UHJvY2Vzc0NvbnRlbnQoYXJ0aWNsZUNvbnRlbnQpO1xuXG4gICAgLy8gSWYgd2UgaGF2ZW4ndCBmb3VuZCBhbiBleGNlcnB0IGluIHRoZSBhcnRpY2xlJ3MgbWV0YWRhdGEsIHVzZSB0aGUgYXJ0aWNsZSdzXG4gICAgLy8gZmlyc3QgcGFyYWdyYXBoIGFzIHRoZSBleGNlcnB0LiBUaGlzIGlzIHVzZWQgZm9yIGRpc3BsYXlpbmcgYSBwcmV2aWV3IG9mXG4gICAgLy8gdGhlIGFydGljbGUncyBjb250ZW50LlxuICAgIGlmICghbWV0YWRhdGEuZXhjZXJwdCkge1xuICAgICAgdmFyIHBhcmFncmFwaHMgPSBhcnRpY2xlQ29udGVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInBcIik7XG4gICAgICBpZiAocGFyYWdyYXBocy5sZW5ndGggPiAwKSB7XG4gICAgICAgIG1ldGFkYXRhLmV4Y2VycHQgPSBwYXJhZ3JhcGhzWzBdLnRleHRDb250ZW50LnRyaW0oKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdGV4dENvbnRlbnQgPSBhcnRpY2xlQ29udGVudC50ZXh0Q29udGVudDtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6IHRoaXMuX2FydGljbGVUaXRsZSxcbiAgICAgIGJ5bGluZTogbWV0YWRhdGEuYnlsaW5lIHx8IHRoaXMuX2FydGljbGVCeWxpbmUsXG4gICAgICBkaXI6IHRoaXMuX2FydGljbGVEaXIsXG4gICAgICBsYW5nOiB0aGlzLl9hcnRpY2xlTGFuZyxcbiAgICAgIGNvbnRlbnQ6IHRoaXMuX3NlcmlhbGl6ZXIoYXJ0aWNsZUNvbnRlbnQpLFxuICAgICAgdGV4dENvbnRlbnQ6IHRleHRDb250ZW50LFxuICAgICAgbGVuZ3RoOiB0ZXh0Q29udGVudC5sZW5ndGgsXG4gICAgICBleGNlcnB0OiBtZXRhZGF0YS5leGNlcnB0LFxuICAgICAgc2l0ZU5hbWU6IG1ldGFkYXRhLnNpdGVOYW1lIHx8IHRoaXMuX2FydGljbGVTaXRlTmFtZVxuICAgIH07XG4gIH1cbn07XG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gUmVhZGFiaWxpdHk7XG59XG4iLCJ2YXIgUmVhZGFiaWxpdHkgPSByZXF1aXJlKFwiLi9SZWFkYWJpbGl0eVwiKTtcbnZhciBpc1Byb2JhYmx5UmVhZGVyYWJsZSA9IHJlcXVpcmUoXCIuL1JlYWRhYmlsaXR5LXJlYWRlcmFibGVcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBSZWFkYWJpbGl0eTogUmVhZGFiaWxpdHksXG4gIGlzUHJvYmFibHlSZWFkZXJhYmxlOiBpc1Byb2JhYmx5UmVhZGVyYWJsZVxufTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShcIndlYmV4dGVuc2lvbi1wb2x5ZmlsbFwiLCBbXCJtb2R1bGVcIl0sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgZmFjdG9yeShtb2R1bGUpO1xuICB9IGVsc2Uge1xuICAgIHZhciBtb2QgPSB7XG4gICAgICBleHBvcnRzOiB7fVxuICAgIH07XG4gICAgZmFjdG9yeShtb2QpO1xuICAgIGdsb2JhbC5icm93c2VyID0gbW9kLmV4cG9ydHM7XG4gIH1cbn0pKHR5cGVvZiBnbG9iYWxUaGlzICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHRoaXMsIGZ1bmN0aW9uIChtb2R1bGUpIHtcbiAgLyogd2ViZXh0ZW5zaW9uLXBvbHlmaWxsIC0gdjAuOS4wIC0gRnJpIE1hciAyNSAyMDIyIDE3OjAwOjIzICovXG5cbiAgLyogLSotIE1vZGU6IGluZGVudC10YWJzLW1vZGU6IG5pbDsganMtaW5kZW50LWxldmVsOiAyIC0qLSAqL1xuXG4gIC8qIHZpbTogc2V0IHN0cz0yIHN3PTIgZXQgdHc9ODA6ICovXG5cbiAgLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICAgKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gICAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uICovXG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIGlmICh0eXBlb2YgZ2xvYmFsVGhpcyAhPSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjaHJvbWUgIT0gXCJvYmplY3RcIiB8fCAhY2hyb21lIHx8ICFjaHJvbWUucnVudGltZSB8fCAhY2hyb21lLnJ1bnRpbWUuaWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHNjcmlwdCBzaG91bGQgb25seSBiZSBsb2FkZWQgaW4gYSBicm93c2VyIGV4dGVuc2lvbi5cIik7XG4gIH1cblxuICBpZiAodHlwZW9mIGdsb2JhbFRoaXMuYnJvd3NlciA9PT0gXCJ1bmRlZmluZWRcIiB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoZ2xvYmFsVGhpcy5icm93c2VyKSAhPT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgIGNvbnN0IENIUk9NRV9TRU5EX01FU1NBR0VfQ0FMTEJBQ0tfTk9fUkVTUE9OU0VfTUVTU0FHRSA9IFwiVGhlIG1lc3NhZ2UgcG9ydCBjbG9zZWQgYmVmb3JlIGEgcmVzcG9uc2Ugd2FzIHJlY2VpdmVkLlwiO1xuICAgIGNvbnN0IFNFTkRfUkVTUE9OU0VfREVQUkVDQVRJT05fV0FSTklORyA9IFwiUmV0dXJuaW5nIGEgUHJvbWlzZSBpcyB0aGUgcHJlZmVycmVkIHdheSB0byBzZW5kIGEgcmVwbHkgZnJvbSBhbiBvbk1lc3NhZ2Uvb25NZXNzYWdlRXh0ZXJuYWwgbGlzdGVuZXIsIGFzIHRoZSBzZW5kUmVzcG9uc2Ugd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIHNwZWNzIChTZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZG9jcy9Nb3ppbGxhL0FkZC1vbnMvV2ViRXh0ZW5zaW9ucy9BUEkvcnVudGltZS9vbk1lc3NhZ2UpXCI7IC8vIFdyYXBwaW5nIHRoZSBidWxrIG9mIHRoaXMgcG9seWZpbGwgaW4gYSBvbmUtdGltZS11c2UgZnVuY3Rpb24gaXMgYSBtaW5vclxuICAgIC8vIG9wdGltaXphdGlvbiBmb3IgRmlyZWZveC4gU2luY2UgU3BpZGVybW9ua2V5IGRvZXMgbm90IGZ1bGx5IHBhcnNlIHRoZVxuICAgIC8vIGNvbnRlbnRzIG9mIGEgZnVuY3Rpb24gdW50aWwgdGhlIGZpcnN0IHRpbWUgaXQncyBjYWxsZWQsIGFuZCBzaW5jZSBpdCB3aWxsXG4gICAgLy8gbmV2ZXIgYWN0dWFsbHkgbmVlZCB0byBiZSBjYWxsZWQsIHRoaXMgYWxsb3dzIHRoZSBwb2x5ZmlsbCB0byBiZSBpbmNsdWRlZFxuICAgIC8vIGluIEZpcmVmb3ggbmVhcmx5IGZvciBmcmVlLlxuXG4gICAgY29uc3Qgd3JhcEFQSXMgPSBleHRlbnNpb25BUElzID0+IHtcbiAgICAgIC8vIE5PVEU6IGFwaU1ldGFkYXRhIGlzIGFzc29jaWF0ZWQgdG8gdGhlIGNvbnRlbnQgb2YgdGhlIGFwaS1tZXRhZGF0YS5qc29uIGZpbGVcbiAgICAgIC8vIGF0IGJ1aWxkIHRpbWUgYnkgcmVwbGFjaW5nIHRoZSBmb2xsb3dpbmcgXCJpbmNsdWRlXCIgd2l0aCB0aGUgY29udGVudCBvZiB0aGVcbiAgICAgIC8vIEpTT04gZmlsZS5cbiAgICAgIGNvbnN0IGFwaU1ldGFkYXRhID0ge1xuICAgICAgICBcImFsYXJtc1wiOiB7XG4gICAgICAgICAgXCJjbGVhclwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImNsZWFyQWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiYm9va21hcmtzXCI6IHtcbiAgICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldENoaWxkcmVuXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0UmVjZW50XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0U3ViVHJlZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFRyZWVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlVHJlZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlYXJjaFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImJyb3dzZXJBY3Rpb25cIjoge1xuICAgICAgICAgIFwiZGlzYWJsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImVuYWJsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEJhZGdlQmFja2dyb3VuZENvbG9yXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QmFkZ2VUZXh0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0UG9wdXBcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRUaXRsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIm9wZW5Qb3B1cFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldEJhZGdlQmFja2dyb3VuZENvbG9yXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0QmFkZ2VUZXh0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0SWNvblwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFBvcHVwXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0VGl0bGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJicm93c2luZ0RhdGFcIjoge1xuICAgICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlQ2FjaGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVDb29raWVzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlRG93bmxvYWRzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlRm9ybURhdGFcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVIaXN0b3J5XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlTG9jYWxTdG9yYWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlUGFzc3dvcmRzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlUGx1Z2luRGF0YVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldHRpbmdzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiY29tbWFuZHNcIjoge1xuICAgICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiY29udGV4dE1lbnVzXCI6IHtcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImNvb2tpZXNcIjoge1xuICAgICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QWxsQ29va2llU3RvcmVzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiZGV2dG9vbHNcIjoge1xuICAgICAgICAgIFwiaW5zcGVjdGVkV2luZG93XCI6IHtcbiAgICAgICAgICAgIFwiZXZhbFwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMixcbiAgICAgICAgICAgICAgXCJzaW5nbGVDYWxsYmFja0FyZ1wiOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJwYW5lbHNcIjoge1xuICAgICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMyxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDMsXG4gICAgICAgICAgICAgIFwic2luZ2xlQ2FsbGJhY2tBcmdcIjogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZWxlbWVudHNcIjoge1xuICAgICAgICAgICAgICBcImNyZWF0ZVNpZGViYXJQYW5lXCI6IHtcbiAgICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImRvd25sb2Fkc1wiOiB7XG4gICAgICAgICAgXCJjYW5jZWxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkb3dubG9hZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImVyYXNlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0RmlsZUljb25cIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJvcGVuXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicGF1c2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVGaWxlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVzdW1lXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2VhcmNoXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2hvd1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImV4dGVuc2lvblwiOiB7XG4gICAgICAgICAgXCJpc0FsbG93ZWRGaWxlU2NoZW1lQWNjZXNzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiaXNBbGxvd2VkSW5jb2duaXRvQWNjZXNzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiaGlzdG9yeVwiOiB7XG4gICAgICAgICAgXCJhZGRVcmxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkZWxldGVBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkZWxldGVSYW5nZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImRlbGV0ZVVybFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFZpc2l0c1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlYXJjaFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImkxOG5cIjoge1xuICAgICAgICAgIFwiZGV0ZWN0TGFuZ3VhZ2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRBY2NlcHRMYW5ndWFnZXNcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJpZGVudGl0eVwiOiB7XG4gICAgICAgICAgXCJsYXVuY2hXZWJBdXRoRmxvd1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImlkbGVcIjoge1xuICAgICAgICAgIFwicXVlcnlTdGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm1hbmFnZW1lbnRcIjoge1xuICAgICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0U2VsZlwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldEVuYWJsZWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1bmluc3RhbGxTZWxmXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwibm90aWZpY2F0aW9uc1wiOiB7XG4gICAgICAgICAgXCJjbGVhclwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFBlcm1pc3Npb25MZXZlbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInBhZ2VBY3Rpb25cIjoge1xuICAgICAgICAgIFwiZ2V0UG9wdXBcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRUaXRsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImhpZGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRJY29uXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0UG9wdXBcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRUaXRsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNob3dcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJwZXJtaXNzaW9uc1wiOiB7XG4gICAgICAgICAgXCJjb250YWluc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlcXVlc3RcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJydW50aW1lXCI6IHtcbiAgICAgICAgICBcImdldEJhY2tncm91bmRQYWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0UGxhdGZvcm1JbmZvXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwib3Blbk9wdGlvbnNQYWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVxdWVzdFVwZGF0ZUNoZWNrXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2VuZE1lc3NhZ2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogM1xuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZW5kTmF0aXZlTWVzc2FnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFVuaW5zdGFsbFVSTFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInNlc3Npb25zXCI6IHtcbiAgICAgICAgICBcImdldERldmljZXNcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRSZWNlbnRseUNsb3NlZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlc3RvcmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzdG9yYWdlXCI6IHtcbiAgICAgICAgICBcImxvY2FsXCI6IHtcbiAgICAgICAgICAgIFwiY2xlYXJcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZ2V0Qnl0ZXNJblVzZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJzZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwibWFuYWdlZFwiOiB7XG4gICAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZ2V0Qnl0ZXNJblVzZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzeW5jXCI6IHtcbiAgICAgICAgICAgIFwiY2xlYXJcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZ2V0Qnl0ZXNJblVzZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJzZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwidGFic1wiOiB7XG4gICAgICAgICAgXCJjYXB0dXJlVmlzaWJsZVRhYlwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImRldGVjdExhbmd1YWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZGlzY2FyZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImR1cGxpY2F0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImV4ZWN1dGVTY3JpcHRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRDdXJyZW50XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0Wm9vbVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFpvb21TZXR0aW5nc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdvQmFja1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdvRm9yd2FyZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImhpZ2hsaWdodFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImluc2VydENTU1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIm1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJxdWVyeVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbG9hZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUNTU1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlbmRNZXNzYWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDNcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0Wm9vbVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFpvb21TZXR0aW5nc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInRvcFNpdGVzXCI6IHtcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIndlYk5hdmlnYXRpb25cIjoge1xuICAgICAgICAgIFwiZ2V0QWxsRnJhbWVzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0RnJhbWVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ3ZWJSZXF1ZXN0XCI6IHtcbiAgICAgICAgICBcImhhbmRsZXJCZWhhdmlvckNoYW5nZWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ3aW5kb3dzXCI6IHtcbiAgICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEN1cnJlbnRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRMYXN0Rm9jdXNlZFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBpZiAoT2JqZWN0LmtleXMoYXBpTWV0YWRhdGEpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJhcGktbWV0YWRhdGEuanNvbiBoYXMgbm90IGJlZW4gaW5jbHVkZWQgaW4gYnJvd3Nlci1wb2x5ZmlsbFwiKTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogQSBXZWFrTWFwIHN1YmNsYXNzIHdoaWNoIGNyZWF0ZXMgYW5kIHN0b3JlcyBhIHZhbHVlIGZvciBhbnkga2V5IHdoaWNoIGRvZXNcbiAgICAgICAqIG5vdCBleGlzdCB3aGVuIGFjY2Vzc2VkLCBidXQgYmVoYXZlcyBleGFjdGx5IGFzIGFuIG9yZGluYXJ5IFdlYWtNYXBcbiAgICAgICAqIG90aGVyd2lzZS5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjcmVhdGVJdGVtXG4gICAgICAgKiAgICAgICAgQSBmdW5jdGlvbiB3aGljaCB3aWxsIGJlIGNhbGxlZCBpbiBvcmRlciB0byBjcmVhdGUgdGhlIHZhbHVlIGZvciBhbnlcbiAgICAgICAqICAgICAgICBrZXkgd2hpY2ggZG9lcyBub3QgZXhpc3QsIHRoZSBmaXJzdCB0aW1lIGl0IGlzIGFjY2Vzc2VkLiBUaGVcbiAgICAgICAqICAgICAgICBmdW5jdGlvbiByZWNlaXZlcywgYXMgaXRzIG9ubHkgYXJndW1lbnQsIHRoZSBrZXkgYmVpbmcgY3JlYXRlZC5cbiAgICAgICAqL1xuXG5cbiAgICAgIGNsYXNzIERlZmF1bHRXZWFrTWFwIGV4dGVuZHMgV2Vha01hcCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGNyZWF0ZUl0ZW0sIGl0ZW1zID0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgc3VwZXIoaXRlbXMpO1xuICAgICAgICAgIHRoaXMuY3JlYXRlSXRlbSA9IGNyZWF0ZUl0ZW07XG4gICAgICAgIH1cblxuICAgICAgICBnZXQoa2V5KSB7XG4gICAgICAgICAgaWYgKCF0aGlzLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICB0aGlzLnNldChrZXksIHRoaXMuY3JlYXRlSXRlbShrZXkpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gc3VwZXIuZ2V0KGtleSk7XG4gICAgICAgIH1cblxuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIG9iamVjdCBpcyBhbiBvYmplY3Qgd2l0aCBhIGB0aGVuYCBtZXRob2QsIGFuZCBjYW5cbiAgICAgICAqIHRoZXJlZm9yZSBiZSBhc3N1bWVkIHRvIGJlaGF2ZSBhcyBhIFByb21pc2UuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gdGVzdC5cbiAgICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyB0aGVuYWJsZS5cbiAgICAgICAqL1xuXG5cbiAgICAgIGNvbnN0IGlzVGhlbmFibGUgPSB2YWx1ZSA9PiB7XG4gICAgICAgIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHZhbHVlLnRoZW4gPT09IFwiZnVuY3Rpb25cIjtcbiAgICAgIH07XG4gICAgICAvKipcbiAgICAgICAqIENyZWF0ZXMgYW5kIHJldHVybnMgYSBmdW5jdGlvbiB3aGljaCwgd2hlbiBjYWxsZWQsIHdpbGwgcmVzb2x2ZSBvciByZWplY3RcbiAgICAgICAqIHRoZSBnaXZlbiBwcm9taXNlIGJhc2VkIG9uIGhvdyBpdCBpcyBjYWxsZWQ6XG4gICAgICAgKlxuICAgICAgICogLSBJZiwgd2hlbiBjYWxsZWQsIGBjaHJvbWUucnVudGltZS5sYXN0RXJyb3JgIGNvbnRhaW5zIGEgbm9uLW51bGwgb2JqZWN0LFxuICAgICAgICogICB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCB3aXRoIHRoYXQgdmFsdWUuXG4gICAgICAgKiAtIElmIHRoZSBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCBleGFjdGx5IG9uZSBhcmd1bWVudCwgdGhlIHByb21pc2UgaXNcbiAgICAgICAqICAgcmVzb2x2ZWQgdG8gdGhhdCB2YWx1ZS5cbiAgICAgICAqIC0gT3RoZXJ3aXNlLCB0aGUgcHJvbWlzZSBpcyByZXNvbHZlZCB0byBhbiBhcnJheSBjb250YWluaW5nIGFsbCBvZiB0aGVcbiAgICAgICAqICAgZnVuY3Rpb24ncyBhcmd1bWVudHMuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IHByb21pc2VcbiAgICAgICAqICAgICAgICBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgcmVzb2x1dGlvbiBhbmQgcmVqZWN0aW9uIGZ1bmN0aW9ucyBvZiBhXG4gICAgICAgKiAgICAgICAgcHJvbWlzZS5cbiAgICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IHByb21pc2UucmVzb2x2ZVxuICAgICAgICogICAgICAgIFRoZSBwcm9taXNlJ3MgcmVzb2x1dGlvbiBmdW5jdGlvbi5cbiAgICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IHByb21pc2UucmVqZWN0XG4gICAgICAgKiAgICAgICAgVGhlIHByb21pc2UncyByZWplY3Rpb24gZnVuY3Rpb24uXG4gICAgICAgKiBAcGFyYW0ge29iamVjdH0gbWV0YWRhdGFcbiAgICAgICAqICAgICAgICBNZXRhZGF0YSBhYm91dCB0aGUgd3JhcHBlZCBtZXRob2Qgd2hpY2ggaGFzIGNyZWF0ZWQgdGhlIGNhbGxiYWNrLlxuICAgICAgICogQHBhcmFtIHtib29sZWFufSBtZXRhZGF0YS5zaW5nbGVDYWxsYmFja0FyZ1xuICAgICAgICogICAgICAgIFdoZXRoZXIgb3Igbm90IHRoZSBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggb25seSB0aGUgZmlyc3RcbiAgICAgICAqICAgICAgICBhcmd1bWVudCBvZiB0aGUgY2FsbGJhY2ssIGFsdGVybmF0aXZlbHkgYW4gYXJyYXkgb2YgYWxsIHRoZVxuICAgICAgICogICAgICAgIGNhbGxiYWNrIGFyZ3VtZW50cyBpcyByZXNvbHZlZC4gQnkgZGVmYXVsdCwgaWYgdGhlIGNhbGxiYWNrXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24gaXMgaW52b2tlZCB3aXRoIG9ubHkgYSBzaW5nbGUgYXJndW1lbnQsIHRoYXQgd2lsbCBiZVxuICAgICAgICogICAgICAgIHJlc29sdmVkIHRvIHRoZSBwcm9taXNlLCB3aGlsZSBhbGwgYXJndW1lbnRzIHdpbGwgYmUgcmVzb2x2ZWQgYXNcbiAgICAgICAqICAgICAgICBhbiBhcnJheSBpZiBtdWx0aXBsZSBhcmUgZ2l2ZW4uXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge2Z1bmN0aW9ufVxuICAgICAgICogICAgICAgIFRoZSBnZW5lcmF0ZWQgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICAgKi9cblxuXG4gICAgICBjb25zdCBtYWtlQ2FsbGJhY2sgPSAocHJvbWlzZSwgbWV0YWRhdGEpID0+IHtcbiAgICAgICAgcmV0dXJuICguLi5jYWxsYmFja0FyZ3MpID0+IHtcbiAgICAgICAgICBpZiAoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgcHJvbWlzZS5yZWplY3QobmV3IEVycm9yKGV4dGVuc2lvbkFQSXMucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSkpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWV0YWRhdGEuc2luZ2xlQ2FsbGJhY2tBcmcgfHwgY2FsbGJhY2tBcmdzLmxlbmd0aCA8PSAxICYmIG1ldGFkYXRhLnNpbmdsZUNhbGxiYWNrQXJnICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgcHJvbWlzZS5yZXNvbHZlKGNhbGxiYWNrQXJnc1swXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHByb21pc2UucmVzb2x2ZShjYWxsYmFja0FyZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHBsdXJhbGl6ZUFyZ3VtZW50cyA9IG51bUFyZ3MgPT4gbnVtQXJncyA9PSAxID8gXCJhcmd1bWVudFwiIDogXCJhcmd1bWVudHNcIjtcbiAgICAgIC8qKlxuICAgICAgICogQ3JlYXRlcyBhIHdyYXBwZXIgZnVuY3Rpb24gZm9yIGEgbWV0aG9kIHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIG1ldGFkYXRhLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAgICAgKiAgICAgICAgVGhlIG5hbWUgb2YgdGhlIG1ldGhvZCB3aGljaCBpcyBiZWluZyB3cmFwcGVkLlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IG1ldGFkYXRhXG4gICAgICAgKiAgICAgICAgTWV0YWRhdGEgYWJvdXQgdGhlIG1ldGhvZCBiZWluZyB3cmFwcGVkLlxuICAgICAgICogQHBhcmFtIHtpbnRlZ2VyfSBtZXRhZGF0YS5taW5BcmdzXG4gICAgICAgKiAgICAgICAgVGhlIG1pbmltdW0gbnVtYmVyIG9mIGFyZ3VtZW50cyB3aGljaCBtdXN0IGJlIHBhc3NlZCB0byB0aGVcbiAgICAgICAqICAgICAgICBmdW5jdGlvbi4gSWYgY2FsbGVkIHdpdGggZmV3ZXIgdGhhbiB0aGlzIG51bWJlciBvZiBhcmd1bWVudHMsIHRoZVxuICAgICAgICogICAgICAgIHdyYXBwZXIgd2lsbCByYWlzZSBhbiBleGNlcHRpb24uXG4gICAgICAgKiBAcGFyYW0ge2ludGVnZXJ9IG1ldGFkYXRhLm1heEFyZ3NcbiAgICAgICAqICAgICAgICBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXJndW1lbnRzIHdoaWNoIG1heSBiZSBwYXNzZWQgdG8gdGhlXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24uIElmIGNhbGxlZCB3aXRoIG1vcmUgdGhhbiB0aGlzIG51bWJlciBvZiBhcmd1bWVudHMsIHRoZVxuICAgICAgICogICAgICAgIHdyYXBwZXIgd2lsbCByYWlzZSBhbiBleGNlcHRpb24uXG4gICAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG1ldGFkYXRhLnNpbmdsZUNhbGxiYWNrQXJnXG4gICAgICAgKiAgICAgICAgV2hldGhlciBvciBub3QgdGhlIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCBvbmx5IHRoZSBmaXJzdFxuICAgICAgICogICAgICAgIGFyZ3VtZW50IG9mIHRoZSBjYWxsYmFjaywgYWx0ZXJuYXRpdmVseSBhbiBhcnJheSBvZiBhbGwgdGhlXG4gICAgICAgKiAgICAgICAgY2FsbGJhY2sgYXJndW1lbnRzIGlzIHJlc29sdmVkLiBCeSBkZWZhdWx0LCBpZiB0aGUgY2FsbGJhY2tcbiAgICAgICAqICAgICAgICBmdW5jdGlvbiBpcyBpbnZva2VkIHdpdGggb25seSBhIHNpbmdsZSBhcmd1bWVudCwgdGhhdCB3aWxsIGJlXG4gICAgICAgKiAgICAgICAgcmVzb2x2ZWQgdG8gdGhlIHByb21pc2UsIHdoaWxlIGFsbCBhcmd1bWVudHMgd2lsbCBiZSByZXNvbHZlZCBhc1xuICAgICAgICogICAgICAgIGFuIGFycmF5IGlmIG11bHRpcGxlIGFyZSBnaXZlbi5cbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJucyB7ZnVuY3Rpb24ob2JqZWN0LCAuLi4qKX1cbiAgICAgICAqICAgICAgIFRoZSBnZW5lcmF0ZWQgd3JhcHBlciBmdW5jdGlvbi5cbiAgICAgICAqL1xuXG5cbiAgICAgIGNvbnN0IHdyYXBBc3luY0Z1bmN0aW9uID0gKG5hbWUsIG1ldGFkYXRhKSA9PiB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBhc3luY0Z1bmN0aW9uV3JhcHBlcih0YXJnZXQsIC4uLmFyZ3MpIHtcbiAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPCBtZXRhZGF0YS5taW5BcmdzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGF0IGxlYXN0ICR7bWV0YWRhdGEubWluQXJnc30gJHtwbHVyYWxpemVBcmd1bWVudHMobWV0YWRhdGEubWluQXJncyl9IGZvciAke25hbWV9KCksIGdvdCAke2FyZ3MubGVuZ3RofWApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IG1ldGFkYXRhLm1heEFyZ3MpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXQgbW9zdCAke21ldGFkYXRhLm1heEFyZ3N9ICR7cGx1cmFsaXplQXJndW1lbnRzKG1ldGFkYXRhLm1heEFyZ3MpfSBmb3IgJHtuYW1lfSgpLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKG1ldGFkYXRhLmZhbGxiYWNrVG9Ob0NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgQVBJIG1ldGhvZCBoYXMgY3VycmVudGx5IG5vIGNhbGxiYWNrIG9uIENocm9tZSwgYnV0IGl0IHJldHVybiBhIHByb21pc2Ugb24gRmlyZWZveCxcbiAgICAgICAgICAgICAgLy8gYW5kIHNvIHRoZSBwb2x5ZmlsbCB3aWxsIHRyeSB0byBjYWxsIGl0IHdpdGggYSBjYWxsYmFjayBmaXJzdCwgYW5kIGl0IHdpbGwgZmFsbGJhY2tcbiAgICAgICAgICAgICAgLy8gdG8gbm90IHBhc3NpbmcgdGhlIGNhbGxiYWNrIGlmIHRoZSBmaXJzdCBjYWxsIGZhaWxzLlxuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtuYW1lXSguLi5hcmdzLCBtYWtlQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZSxcbiAgICAgICAgICAgICAgICAgIHJlamVjdFxuICAgICAgICAgICAgICAgIH0sIG1ldGFkYXRhKSk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGNiRXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYCR7bmFtZX0gQVBJIG1ldGhvZCBkb2Vzbid0IHNlZW0gdG8gc3VwcG9ydCB0aGUgY2FsbGJhY2sgcGFyYW1ldGVyLCBgICsgXCJmYWxsaW5nIGJhY2sgdG8gY2FsbCBpdCB3aXRob3V0IGEgY2FsbGJhY2s6IFwiLCBjYkVycm9yKTtcbiAgICAgICAgICAgICAgICB0YXJnZXRbbmFtZV0oLi4uYXJncyk7IC8vIFVwZGF0ZSB0aGUgQVBJIG1ldGhvZCBtZXRhZGF0YSwgc28gdGhhdCB0aGUgbmV4dCBBUEkgY2FsbHMgd2lsbCBub3QgdHJ5IHRvXG4gICAgICAgICAgICAgICAgLy8gdXNlIHRoZSB1bnN1cHBvcnRlZCBjYWxsYmFjayBhbnltb3JlLlxuXG4gICAgICAgICAgICAgICAgbWV0YWRhdGEuZmFsbGJhY2tUb05vQ2FsbGJhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBtZXRhZGF0YS5ub0NhbGxiYWNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWV0YWRhdGEubm9DYWxsYmFjaykge1xuICAgICAgICAgICAgICB0YXJnZXRbbmFtZV0oLi4uYXJncyk7XG4gICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRhcmdldFtuYW1lXSguLi5hcmdzLCBtYWtlQ2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHJlc29sdmUsXG4gICAgICAgICAgICAgICAgcmVqZWN0XG4gICAgICAgICAgICAgIH0sIG1ldGFkYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgICAgLyoqXG4gICAgICAgKiBXcmFwcyBhbiBleGlzdGluZyBtZXRob2Qgb2YgdGhlIHRhcmdldCBvYmplY3QsIHNvIHRoYXQgY2FsbHMgdG8gaXQgYXJlXG4gICAgICAgKiBpbnRlcmNlcHRlZCBieSB0aGUgZ2l2ZW4gd3JhcHBlciBmdW5jdGlvbi4gVGhlIHdyYXBwZXIgZnVuY3Rpb24gcmVjZWl2ZXMsXG4gICAgICAgKiBhcyBpdHMgZmlyc3QgYXJndW1lbnQsIHRoZSBvcmlnaW5hbCBgdGFyZ2V0YCBvYmplY3QsIGZvbGxvd2VkIGJ5IGVhY2ggb2ZcbiAgICAgICAqIHRoZSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBvcmlnaW5hbCBtZXRob2QuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldFxuICAgICAgICogICAgICAgIFRoZSBvcmlnaW5hbCB0YXJnZXQgb2JqZWN0IHRoYXQgdGhlIHdyYXBwZWQgbWV0aG9kIGJlbG9uZ3MgdG8uXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBtZXRob2RcbiAgICAgICAqICAgICAgICBUaGUgbWV0aG9kIGJlaW5nIHdyYXBwZWQuIFRoaXMgaXMgdXNlZCBhcyB0aGUgdGFyZ2V0IG9mIHRoZSBQcm94eVxuICAgICAgICogICAgICAgIG9iamVjdCB3aGljaCBpcyBjcmVhdGVkIHRvIHdyYXAgdGhlIG1ldGhvZC5cbiAgICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IHdyYXBwZXJcbiAgICAgICAqICAgICAgICBUaGUgd3JhcHBlciBmdW5jdGlvbiB3aGljaCBpcyBjYWxsZWQgaW4gcGxhY2Ugb2YgYSBkaXJlY3QgaW52b2NhdGlvblxuICAgICAgICogICAgICAgIG9mIHRoZSB3cmFwcGVkIG1ldGhvZC5cbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJucyB7UHJveHk8ZnVuY3Rpb24+fVxuICAgICAgICogICAgICAgIEEgUHJveHkgb2JqZWN0IGZvciB0aGUgZ2l2ZW4gbWV0aG9kLCB3aGljaCBpbnZva2VzIHRoZSBnaXZlbiB3cmFwcGVyXG4gICAgICAgKiAgICAgICAgbWV0aG9kIGluIGl0cyBwbGFjZS5cbiAgICAgICAqL1xuXG5cbiAgICAgIGNvbnN0IHdyYXBNZXRob2QgPSAodGFyZ2V0LCBtZXRob2QsIHdyYXBwZXIpID0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eShtZXRob2QsIHtcbiAgICAgICAgICBhcHBseSh0YXJnZXRNZXRob2QsIHRoaXNPYmosIGFyZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiB3cmFwcGVyLmNhbGwodGhpc09iaiwgdGFyZ2V0LCAuLi5hcmdzKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBsZXQgaGFzT3duUHJvcGVydHkgPSBGdW5jdGlvbi5jYWxsLmJpbmQoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSk7XG4gICAgICAvKipcbiAgICAgICAqIFdyYXBzIGFuIG9iamVjdCBpbiBhIFByb3h5IHdoaWNoIGludGVyY2VwdHMgYW5kIHdyYXBzIGNlcnRhaW4gbWV0aG9kc1xuICAgICAgICogYmFzZWQgb24gdGhlIGdpdmVuIGB3cmFwcGVyc2AgYW5kIGBtZXRhZGF0YWAgb2JqZWN0cy5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0XG4gICAgICAgKiAgICAgICAgVGhlIHRhcmdldCBvYmplY3QgdG8gd3JhcC5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge29iamVjdH0gW3dyYXBwZXJzID0ge31dXG4gICAgICAgKiAgICAgICAgQW4gb2JqZWN0IHRyZWUgY29udGFpbmluZyB3cmFwcGVyIGZ1bmN0aW9ucyBmb3Igc3BlY2lhbCBjYXNlcy4gQW55XG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24gcHJlc2VudCBpbiB0aGlzIG9iamVjdCB0cmVlIGlzIGNhbGxlZCBpbiBwbGFjZSBvZiB0aGVcbiAgICAgICAqICAgICAgICBtZXRob2QgaW4gdGhlIHNhbWUgbG9jYXRpb24gaW4gdGhlIGB0YXJnZXRgIG9iamVjdCB0cmVlLiBUaGVzZVxuICAgICAgICogICAgICAgIHdyYXBwZXIgbWV0aG9kcyBhcmUgaW52b2tlZCBhcyBkZXNjcmliZWQgaW4ge0BzZWUgd3JhcE1ldGhvZH0uXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IFttZXRhZGF0YSA9IHt9XVxuICAgICAgICogICAgICAgIEFuIG9iamVjdCB0cmVlIGNvbnRhaW5pbmcgbWV0YWRhdGEgdXNlZCB0byBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlXG4gICAgICAgKiAgICAgICAgUHJvbWlzZS1iYXNlZCB3cmFwcGVyIGZ1bmN0aW9ucyBmb3IgYXN5bmNocm9ub3VzLiBBbnkgZnVuY3Rpb24gaW5cbiAgICAgICAqICAgICAgICB0aGUgYHRhcmdldGAgb2JqZWN0IHRyZWUgd2hpY2ggaGFzIGEgY29ycmVzcG9uZGluZyBtZXRhZGF0YSBvYmplY3RcbiAgICAgICAqICAgICAgICBpbiB0aGUgc2FtZSBsb2NhdGlvbiBpbiB0aGUgYG1ldGFkYXRhYCB0cmVlIGlzIHJlcGxhY2VkIHdpdGggYW5cbiAgICAgICAqICAgICAgICBhdXRvbWF0aWNhbGx5LWdlbmVyYXRlZCB3cmFwcGVyIGZ1bmN0aW9uLCBhcyBkZXNjcmliZWQgaW5cbiAgICAgICAqICAgICAgICB7QHNlZSB3cmFwQXN5bmNGdW5jdGlvbn1cbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJucyB7UHJveHk8b2JqZWN0Pn1cbiAgICAgICAqL1xuXG4gICAgICBjb25zdCB3cmFwT2JqZWN0ID0gKHRhcmdldCwgd3JhcHBlcnMgPSB7fSwgbWV0YWRhdGEgPSB7fSkgPT4ge1xuICAgICAgICBsZXQgY2FjaGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICBsZXQgaGFuZGxlcnMgPSB7XG4gICAgICAgICAgaGFzKHByb3h5VGFyZ2V0LCBwcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvcCBpbiB0YXJnZXQgfHwgcHJvcCBpbiBjYWNoZTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZ2V0KHByb3h5VGFyZ2V0LCBwcm9wLCByZWNlaXZlcikge1xuICAgICAgICAgICAgaWYgKHByb3AgaW4gY2FjaGUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlW3Byb3BdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIShwcm9wIGluIHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHZhbHVlID0gdGFyZ2V0W3Byb3BdO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIG1ldGhvZCBvbiB0aGUgdW5kZXJseWluZyBvYmplY3QuIENoZWNrIGlmIHdlIG5lZWQgdG8gZG9cbiAgICAgICAgICAgICAgLy8gYW55IHdyYXBwaW5nLlxuICAgICAgICAgICAgICBpZiAodHlwZW9mIHdyYXBwZXJzW3Byb3BdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBoYXZlIGEgc3BlY2lhbC1jYXNlIHdyYXBwZXIgZm9yIHRoaXMgbWV0aG9kLlxuICAgICAgICAgICAgICAgIHZhbHVlID0gd3JhcE1ldGhvZCh0YXJnZXQsIHRhcmdldFtwcm9wXSwgd3JhcHBlcnNbcHJvcF0pO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhhc093blByb3BlcnR5KG1ldGFkYXRhLCBwcm9wKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYW4gYXN5bmMgbWV0aG9kIHRoYXQgd2UgaGF2ZSBtZXRhZGF0YSBmb3IuIENyZWF0ZSBhXG4gICAgICAgICAgICAgICAgLy8gUHJvbWlzZSB3cmFwcGVyIGZvciBpdC5cbiAgICAgICAgICAgICAgICBsZXQgd3JhcHBlciA9IHdyYXBBc3luY0Z1bmN0aW9uKHByb3AsIG1ldGFkYXRhW3Byb3BdKTtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHdyYXBNZXRob2QodGFyZ2V0LCB0YXJnZXRbcHJvcF0sIHdyYXBwZXIpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBtZXRob2QgdGhhdCB3ZSBkb24ndCBrbm93IG9yIGNhcmUgYWJvdXQuIFJldHVybiB0aGVcbiAgICAgICAgICAgICAgICAvLyBvcmlnaW5hbCBtZXRob2QsIGJvdW5kIHRvIHRoZSB1bmRlcmx5aW5nIG9iamVjdC5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmJpbmQodGFyZ2V0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdmFsdWUgIT09IG51bGwgJiYgKGhhc093blByb3BlcnR5KHdyYXBwZXJzLCBwcm9wKSB8fCBoYXNPd25Qcm9wZXJ0eShtZXRhZGF0YSwgcHJvcCkpKSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgaXMgYW4gb2JqZWN0IHRoYXQgd2UgbmVlZCB0byBkbyBzb21lIHdyYXBwaW5nIGZvciB0aGUgY2hpbGRyZW5cbiAgICAgICAgICAgICAgLy8gb2YuIENyZWF0ZSBhIHN1Yi1vYmplY3Qgd3JhcHBlciBmb3IgaXQgd2l0aCB0aGUgYXBwcm9wcmlhdGUgY2hpbGRcbiAgICAgICAgICAgICAgLy8gbWV0YWRhdGEuXG4gICAgICAgICAgICAgIHZhbHVlID0gd3JhcE9iamVjdCh2YWx1ZSwgd3JhcHBlcnNbcHJvcF0sIG1ldGFkYXRhW3Byb3BdKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaGFzT3duUHJvcGVydHkobWV0YWRhdGEsIFwiKlwiKSkge1xuICAgICAgICAgICAgICAvLyBXcmFwIGFsbCBwcm9wZXJ0aWVzIGluICogbmFtZXNwYWNlLlxuICAgICAgICAgICAgICB2YWx1ZSA9IHdyYXBPYmplY3QodmFsdWUsIHdyYXBwZXJzW3Byb3BdLCBtZXRhZGF0YVtcIipcIl0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gV2UgZG9uJ3QgbmVlZCB0byBkbyBhbnkgd3JhcHBpbmcgZm9yIHRoaXMgcHJvcGVydHksXG4gICAgICAgICAgICAgIC8vIHNvIGp1c3QgZm9yd2FyZCBhbGwgYWNjZXNzIHRvIHRoZSB1bmRlcmx5aW5nIG9iamVjdC5cbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNhY2hlLCBwcm9wLCB7XG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG5cbiAgICAgICAgICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BdO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzZXQodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWNoZVtwcm9wXSA9IHZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICBzZXQocHJveHlUYXJnZXQsIHByb3AsIHZhbHVlLCByZWNlaXZlcikge1xuICAgICAgICAgICAgaWYgKHByb3AgaW4gY2FjaGUpIHtcbiAgICAgICAgICAgICAgY2FjaGVbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRhcmdldFtwcm9wXSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZGVmaW5lUHJvcGVydHkocHJveHlUYXJnZXQsIHByb3AsIGRlc2MpIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlZmluZVByb3BlcnR5KGNhY2hlLCBwcm9wLCBkZXNjKTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZGVsZXRlUHJvcGVydHkocHJveHlUYXJnZXQsIHByb3ApIHtcbiAgICAgICAgICAgIHJldHVybiBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KGNhY2hlLCBwcm9wKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfTsgLy8gUGVyIGNvbnRyYWN0IG9mIHRoZSBQcm94eSBBUEksIHRoZSBcImdldFwiIHByb3h5IGhhbmRsZXIgbXVzdCByZXR1cm4gdGhlXG4gICAgICAgIC8vIG9yaWdpbmFsIHZhbHVlIG9mIHRoZSB0YXJnZXQgaWYgdGhhdCB2YWx1ZSBpcyBkZWNsYXJlZCByZWFkLW9ubHkgYW5kXG4gICAgICAgIC8vIG5vbi1jb25maWd1cmFibGUuIEZvciB0aGlzIHJlYXNvbiwgd2UgY3JlYXRlIGFuIG9iamVjdCB3aXRoIHRoZVxuICAgICAgICAvLyBwcm90b3R5cGUgc2V0IHRvIGB0YXJnZXRgIGluc3RlYWQgb2YgdXNpbmcgYHRhcmdldGAgZGlyZWN0bHkuXG4gICAgICAgIC8vIE90aGVyd2lzZSB3ZSBjYW5ub3QgcmV0dXJuIGEgY3VzdG9tIG9iamVjdCBmb3IgQVBJcyB0aGF0XG4gICAgICAgIC8vIGFyZSBkZWNsYXJlZCByZWFkLW9ubHkgYW5kIG5vbi1jb25maWd1cmFibGUsIHN1Y2ggYXMgYGNocm9tZS5kZXZ0b29sc2AuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZSBwcm94eSBoYW5kbGVycyB0aGVtc2VsdmVzIHdpbGwgc3RpbGwgdXNlIHRoZSBvcmlnaW5hbCBgdGFyZ2V0YFxuICAgICAgICAvLyBpbnN0ZWFkIG9mIHRoZSBgcHJveHlUYXJnZXRgLCBzbyB0aGF0IHRoZSBtZXRob2RzIGFuZCBwcm9wZXJ0aWVzIGFyZVxuICAgICAgICAvLyBkZXJlZmVyZW5jZWQgdmlhIHRoZSBvcmlnaW5hbCB0YXJnZXRzLlxuXG4gICAgICAgIGxldCBwcm94eVRhcmdldCA9IE9iamVjdC5jcmVhdGUodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eShwcm94eVRhcmdldCwgaGFuZGxlcnMpO1xuICAgICAgfTtcbiAgICAgIC8qKlxuICAgICAgICogQ3JlYXRlcyBhIHNldCBvZiB3cmFwcGVyIGZ1bmN0aW9ucyBmb3IgYW4gZXZlbnQgb2JqZWN0LCB3aGljaCBoYW5kbGVzXG4gICAgICAgKiB3cmFwcGluZyBvZiBsaXN0ZW5lciBmdW5jdGlvbnMgdGhhdCB0aG9zZSBtZXNzYWdlcyBhcmUgcGFzc2VkLlxuICAgICAgICpcbiAgICAgICAqIEEgc2luZ2xlIHdyYXBwZXIgaXMgY3JlYXRlZCBmb3IgZWFjaCBsaXN0ZW5lciBmdW5jdGlvbiwgYW5kIHN0b3JlZCBpbiBhXG4gICAgICAgKiBtYXAuIFN1YnNlcXVlbnQgY2FsbHMgdG8gYGFkZExpc3RlbmVyYCwgYGhhc0xpc3RlbmVyYCwgb3IgYHJlbW92ZUxpc3RlbmVyYFxuICAgICAgICogcmV0cmlldmUgdGhlIG9yaWdpbmFsIHdyYXBwZXIsIHNvIHRoYXQgIGF0dGVtcHRzIHRvIHJlbW92ZSBhXG4gICAgICAgKiBwcmV2aW91c2x5LWFkZGVkIGxpc3RlbmVyIHdvcmsgYXMgZXhwZWN0ZWQuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtEZWZhdWx0V2Vha01hcDxmdW5jdGlvbiwgZnVuY3Rpb24+fSB3cmFwcGVyTWFwXG4gICAgICAgKiAgICAgICAgQSBEZWZhdWx0V2Vha01hcCBvYmplY3Qgd2hpY2ggd2lsbCBjcmVhdGUgdGhlIGFwcHJvcHJpYXRlIHdyYXBwZXJcbiAgICAgICAqICAgICAgICBmb3IgYSBnaXZlbiBsaXN0ZW5lciBmdW5jdGlvbiB3aGVuIG9uZSBkb2VzIG5vdCBleGlzdCwgYW5kIHJldHJpZXZlXG4gICAgICAgKiAgICAgICAgYW4gZXhpc3Rpbmcgb25lIHdoZW4gaXQgZG9lcy5cbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAgICovXG5cblxuICAgICAgY29uc3Qgd3JhcEV2ZW50ID0gd3JhcHBlck1hcCA9PiAoe1xuICAgICAgICBhZGRMaXN0ZW5lcih0YXJnZXQsIGxpc3RlbmVyLCAuLi5hcmdzKSB7XG4gICAgICAgICAgdGFyZ2V0LmFkZExpc3RlbmVyKHdyYXBwZXJNYXAuZ2V0KGxpc3RlbmVyKSwgLi4uYXJncyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFzTGlzdGVuZXIodGFyZ2V0LCBsaXN0ZW5lcikge1xuICAgICAgICAgIHJldHVybiB0YXJnZXQuaGFzTGlzdGVuZXIod3JhcHBlck1hcC5nZXQobGlzdGVuZXIpKTtcbiAgICAgICAgfSxcblxuICAgICAgICByZW1vdmVMaXN0ZW5lcih0YXJnZXQsIGxpc3RlbmVyKSB7XG4gICAgICAgICAgdGFyZ2V0LnJlbW92ZUxpc3RlbmVyKHdyYXBwZXJNYXAuZ2V0KGxpc3RlbmVyKSk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IG9uUmVxdWVzdEZpbmlzaGVkV3JhcHBlcnMgPSBuZXcgRGVmYXVsdFdlYWtNYXAobGlzdGVuZXIgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICByZXR1cm4gbGlzdGVuZXI7XG4gICAgICAgIH1cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdyYXBzIGFuIG9uUmVxdWVzdEZpbmlzaGVkIGxpc3RlbmVyIGZ1bmN0aW9uIHNvIHRoYXQgaXQgd2lsbCByZXR1cm4gYVxuICAgICAgICAgKiBgZ2V0Q29udGVudCgpYCBwcm9wZXJ0eSB3aGljaCByZXR1cm5zIGEgYFByb21pc2VgIHJhdGhlciB0aGFuIHVzaW5nIGFcbiAgICAgICAgICogY2FsbGJhY2sgQVBJLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVxXG4gICAgICAgICAqICAgICAgICBUaGUgSEFSIGVudHJ5IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIG5ldHdvcmsgcmVxdWVzdC5cbiAgICAgICAgICovXG5cblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gb25SZXF1ZXN0RmluaXNoZWQocmVxKSB7XG4gICAgICAgICAgY29uc3Qgd3JhcHBlZFJlcSA9IHdyYXBPYmplY3QocmVxLCB7fVxuICAgICAgICAgIC8qIHdyYXBwZXJzICovXG4gICAgICAgICAgLCB7XG4gICAgICAgICAgICBnZXRDb250ZW50OiB7XG4gICAgICAgICAgICAgIG1pbkFyZ3M6IDAsXG4gICAgICAgICAgICAgIG1heEFyZ3M6IDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBsaXN0ZW5lcih3cmFwcGVkUmVxKTtcbiAgICAgICAgfTtcbiAgICAgIH0pOyAvLyBLZWVwIHRyYWNrIGlmIHRoZSBkZXByZWNhdGlvbiB3YXJuaW5nIGhhcyBiZWVuIGxvZ2dlZCBhdCBsZWFzdCBvbmNlLlxuXG4gICAgICBsZXQgbG9nZ2VkU2VuZFJlc3BvbnNlRGVwcmVjYXRpb25XYXJuaW5nID0gZmFsc2U7XG4gICAgICBjb25zdCBvbk1lc3NhZ2VXcmFwcGVycyA9IG5ldyBEZWZhdWx0V2Vha01hcChsaXN0ZW5lciA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIHJldHVybiBsaXN0ZW5lcjtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogV3JhcHMgYSBtZXNzYWdlIGxpc3RlbmVyIGZ1bmN0aW9uIHNvIHRoYXQgaXQgbWF5IHNlbmQgcmVzcG9uc2VzIGJhc2VkIG9uXG4gICAgICAgICAqIGl0cyByZXR1cm4gdmFsdWUsIHJhdGhlciB0aGFuIGJ5IHJldHVybmluZyBhIHNlbnRpbmVsIHZhbHVlIGFuZCBjYWxsaW5nIGFcbiAgICAgICAgICogY2FsbGJhY2suIElmIHRoZSBsaXN0ZW5lciBmdW5jdGlvbiByZXR1cm5zIGEgUHJvbWlzZSwgdGhlIHJlc3BvbnNlIGlzXG4gICAgICAgICAqIHNlbnQgd2hlbiB0aGUgcHJvbWlzZSBlaXRoZXIgcmVzb2x2ZXMgb3IgcmVqZWN0cy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHsqfSBtZXNzYWdlXG4gICAgICAgICAqICAgICAgICBUaGUgbWVzc2FnZSBzZW50IGJ5IHRoZSBvdGhlciBlbmQgb2YgdGhlIGNoYW5uZWwuXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZW5kZXJcbiAgICAgICAgICogICAgICAgIERldGFpbHMgYWJvdXQgdGhlIHNlbmRlciBvZiB0aGUgbWVzc2FnZS5cbiAgICAgICAgICogQHBhcmFtIHtmdW5jdGlvbigqKX0gc2VuZFJlc3BvbnNlXG4gICAgICAgICAqICAgICAgICBBIGNhbGxiYWNrIHdoaWNoLCB3aGVuIGNhbGxlZCB3aXRoIGFuIGFyYml0cmFyeSBhcmd1bWVudCwgc2VuZHNcbiAgICAgICAgICogICAgICAgIHRoYXQgdmFsdWUgYXMgYSByZXNwb25zZS5cbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICAgICAqICAgICAgICBUcnVlIGlmIHRoZSB3cmFwcGVkIGxpc3RlbmVyIHJldHVybmVkIGEgUHJvbWlzZSwgd2hpY2ggd2lsbCBsYXRlclxuICAgICAgICAgKiAgICAgICAgeWllbGQgYSByZXNwb25zZS4gRmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgKi9cblxuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBvbk1lc3NhZ2UobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpIHtcbiAgICAgICAgICBsZXQgZGlkQ2FsbFNlbmRSZXNwb25zZSA9IGZhbHNlO1xuICAgICAgICAgIGxldCB3cmFwcGVkU2VuZFJlc3BvbnNlO1xuICAgICAgICAgIGxldCBzZW5kUmVzcG9uc2VQcm9taXNlID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICB3cmFwcGVkU2VuZFJlc3BvbnNlID0gZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgIGlmICghbG9nZ2VkU2VuZFJlc3BvbnNlRGVwcmVjYXRpb25XYXJuaW5nKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFNFTkRfUkVTUE9OU0VfREVQUkVDQVRJT05fV0FSTklORywgbmV3IEVycm9yKCkuc3RhY2spO1xuICAgICAgICAgICAgICAgIGxvZ2dlZFNlbmRSZXNwb25zZURlcHJlY2F0aW9uV2FybmluZyA9IHRydWU7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBkaWRDYWxsU2VuZFJlc3BvbnNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGxldCByZXN1bHQ7XG5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gbGlzdGVuZXIobWVzc2FnZSwgc2VuZGVyLCB3cmFwcGVkU2VuZFJlc3BvbnNlKTtcbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IFByb21pc2UucmVqZWN0KGVycik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgaXNSZXN1bHRUaGVuYWJsZSA9IHJlc3VsdCAhPT0gdHJ1ZSAmJiBpc1RoZW5hYmxlKHJlc3VsdCk7IC8vIElmIHRoZSBsaXN0ZW5lciBkaWRuJ3QgcmV0dXJuZWQgdHJ1ZSBvciBhIFByb21pc2UsIG9yIGNhbGxlZFxuICAgICAgICAgIC8vIHdyYXBwZWRTZW5kUmVzcG9uc2Ugc3luY2hyb25vdXNseSwgd2UgY2FuIGV4aXQgZWFybGllclxuICAgICAgICAgIC8vIGJlY2F1c2UgdGhlcmUgd2lsbCBiZSBubyByZXNwb25zZSBzZW50IGZyb20gdGhpcyBsaXN0ZW5lci5cblxuICAgICAgICAgIGlmIChyZXN1bHQgIT09IHRydWUgJiYgIWlzUmVzdWx0VGhlbmFibGUgJiYgIWRpZENhbGxTZW5kUmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9IC8vIEEgc21hbGwgaGVscGVyIHRvIHNlbmQgdGhlIG1lc3NhZ2UgaWYgdGhlIHByb21pc2UgcmVzb2x2ZXNcbiAgICAgICAgICAvLyBhbmQgYW4gZXJyb3IgaWYgdGhlIHByb21pc2UgcmVqZWN0cyAoYSB3cmFwcGVkIHNlbmRNZXNzYWdlIGhhc1xuICAgICAgICAgIC8vIHRvIHRyYW5zbGF0ZSB0aGUgbWVzc2FnZSBpbnRvIGEgcmVzb2x2ZWQgcHJvbWlzZSBvciBhIHJlamVjdGVkXG4gICAgICAgICAgLy8gcHJvbWlzZSkuXG5cblxuICAgICAgICAgIGNvbnN0IHNlbmRQcm9taXNlZFJlc3VsdCA9IHByb21pc2UgPT4ge1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKG1zZyA9PiB7XG4gICAgICAgICAgICAgIC8vIHNlbmQgdGhlIG1lc3NhZ2UgdmFsdWUuXG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZShtc2cpO1xuICAgICAgICAgICAgfSwgZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAvLyBTZW5kIGEgSlNPTiByZXByZXNlbnRhdGlvbiBvZiB0aGUgZXJyb3IgaWYgdGhlIHJlamVjdGVkIHZhbHVlXG4gICAgICAgICAgICAgIC8vIGlzIGFuIGluc3RhbmNlIG9mIGVycm9yLCBvciB0aGUgb2JqZWN0IGl0c2VsZiBvdGhlcndpc2UuXG4gICAgICAgICAgICAgIGxldCBtZXNzYWdlO1xuXG4gICAgICAgICAgICAgIGlmIChlcnJvciAmJiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciB8fCB0eXBlb2YgZXJyb3IubWVzc2FnZSA9PT0gXCJzdHJpbmdcIikpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gZXJyb3IubWVzc2FnZTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gXCJBbiB1bmV4cGVjdGVkIGVycm9yIG9jY3VycmVkXCI7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgICAgICAgIF9fbW96V2ViRXh0ZW5zaW9uUG9seWZpbGxSZWplY3RfXzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgICAgLy8gUHJpbnQgYW4gZXJyb3Igb24gdGhlIGNvbnNvbGUgaWYgdW5hYmxlIHRvIHNlbmQgdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHNlbmQgb25NZXNzYWdlIHJlamVjdGVkIHJlcGx5XCIsIGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9OyAvLyBJZiB0aGUgbGlzdGVuZXIgcmV0dXJuZWQgYSBQcm9taXNlLCBzZW5kIHRoZSByZXNvbHZlZCB2YWx1ZSBhcyBhXG4gICAgICAgICAgLy8gcmVzdWx0LCBvdGhlcndpc2Ugd2FpdCB0aGUgcHJvbWlzZSByZWxhdGVkIHRvIHRoZSB3cmFwcGVkU2VuZFJlc3BvbnNlXG4gICAgICAgICAgLy8gY2FsbGJhY2sgdG8gcmVzb2x2ZSBhbmQgc2VuZCBpdCBhcyBhIHJlc3BvbnNlLlxuXG5cbiAgICAgICAgICBpZiAoaXNSZXN1bHRUaGVuYWJsZSkge1xuICAgICAgICAgICAgc2VuZFByb21pc2VkUmVzdWx0KHJlc3VsdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbmRQcm9taXNlZFJlc3VsdChzZW5kUmVzcG9uc2VQcm9taXNlKTtcbiAgICAgICAgICB9IC8vIExldCBDaHJvbWUga25vdyB0aGF0IHRoZSBsaXN0ZW5lciBpcyByZXBseWluZy5cblxuXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgICB9KTtcblxuICAgICAgY29uc3Qgd3JhcHBlZFNlbmRNZXNzYWdlQ2FsbGJhY2sgPSAoe1xuICAgICAgICByZWplY3QsXG4gICAgICAgIHJlc29sdmVcbiAgICAgIH0sIHJlcGx5KSA9PiB7XG4gICAgICAgIGlmIChleHRlbnNpb25BUElzLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgLy8gRGV0ZWN0IHdoZW4gbm9uZSBvZiB0aGUgbGlzdGVuZXJzIHJlcGxpZWQgdG8gdGhlIHNlbmRNZXNzYWdlIGNhbGwgYW5kIHJlc29sdmVcbiAgICAgICAgICAvLyB0aGUgcHJvbWlzZSB0byB1bmRlZmluZWQgYXMgaW4gRmlyZWZveC5cbiAgICAgICAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEvd2ViZXh0ZW5zaW9uLXBvbHlmaWxsL2lzc3Vlcy8xMzBcbiAgICAgICAgICBpZiAoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlID09PSBDSFJPTUVfU0VORF9NRVNTQUdFX0NBTExCQUNLX05PX1JFU1BPTlNFX01FU1NBR0UpIHtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihleHRlbnNpb25BUElzLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocmVwbHkgJiYgcmVwbHkuX19tb3pXZWJFeHRlbnNpb25Qb2x5ZmlsbFJlamVjdF9fKSB7XG4gICAgICAgICAgLy8gQ29udmVydCBiYWNrIHRoZSBKU09OIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBlcnJvciBpbnRvXG4gICAgICAgICAgLy8gYW4gRXJyb3IgaW5zdGFuY2UuXG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihyZXBseS5tZXNzYWdlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZShyZXBseSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHdyYXBwZWRTZW5kTWVzc2FnZSA9IChuYW1lLCBtZXRhZGF0YSwgYXBpTmFtZXNwYWNlT2JqLCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA8IG1ldGFkYXRhLm1pbkFyZ3MpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGF0IGxlYXN0ICR7bWV0YWRhdGEubWluQXJnc30gJHtwbHVyYWxpemVBcmd1bWVudHMobWV0YWRhdGEubWluQXJncyl9IGZvciAke25hbWV9KCksIGdvdCAke2FyZ3MubGVuZ3RofWApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gbWV0YWRhdGEubWF4QXJncykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXQgbW9zdCAke21ldGFkYXRhLm1heEFyZ3N9ICR7cGx1cmFsaXplQXJndW1lbnRzKG1ldGFkYXRhLm1heEFyZ3MpfSBmb3IgJHtuYW1lfSgpLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgY29uc3Qgd3JhcHBlZENiID0gd3JhcHBlZFNlbmRNZXNzYWdlQ2FsbGJhY2suYmluZChudWxsLCB7XG4gICAgICAgICAgICByZXNvbHZlLFxuICAgICAgICAgICAgcmVqZWN0XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYXJncy5wdXNoKHdyYXBwZWRDYik7XG4gICAgICAgICAgYXBpTmFtZXNwYWNlT2JqLnNlbmRNZXNzYWdlKC4uLmFyZ3MpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHN0YXRpY1dyYXBwZXJzID0ge1xuICAgICAgICBkZXZ0b29sczoge1xuICAgICAgICAgIG5ldHdvcms6IHtcbiAgICAgICAgICAgIG9uUmVxdWVzdEZpbmlzaGVkOiB3cmFwRXZlbnQob25SZXF1ZXN0RmluaXNoZWRXcmFwcGVycylcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJ1bnRpbWU6IHtcbiAgICAgICAgICBvbk1lc3NhZ2U6IHdyYXBFdmVudChvbk1lc3NhZ2VXcmFwcGVycyksXG4gICAgICAgICAgb25NZXNzYWdlRXh0ZXJuYWw6IHdyYXBFdmVudChvbk1lc3NhZ2VXcmFwcGVycyksXG4gICAgICAgICAgc2VuZE1lc3NhZ2U6IHdyYXBwZWRTZW5kTWVzc2FnZS5iaW5kKG51bGwsIFwic2VuZE1lc3NhZ2VcIiwge1xuICAgICAgICAgICAgbWluQXJnczogMSxcbiAgICAgICAgICAgIG1heEFyZ3M6IDNcbiAgICAgICAgICB9KVxuICAgICAgICB9LFxuICAgICAgICB0YWJzOiB7XG4gICAgICAgICAgc2VuZE1lc3NhZ2U6IHdyYXBwZWRTZW5kTWVzc2FnZS5iaW5kKG51bGwsIFwic2VuZE1lc3NhZ2VcIiwge1xuICAgICAgICAgICAgbWluQXJnczogMixcbiAgICAgICAgICAgIG1heEFyZ3M6IDNcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29uc3Qgc2V0dGluZ01ldGFkYXRhID0ge1xuICAgICAgICBjbGVhcjoge1xuICAgICAgICAgIG1pbkFyZ3M6IDEsXG4gICAgICAgICAgbWF4QXJnczogMVxuICAgICAgICB9LFxuICAgICAgICBnZXQ6IHtcbiAgICAgICAgICBtaW5BcmdzOiAxLFxuICAgICAgICAgIG1heEFyZ3M6IDFcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiB7XG4gICAgICAgICAgbWluQXJnczogMSxcbiAgICAgICAgICBtYXhBcmdzOiAxXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBhcGlNZXRhZGF0YS5wcml2YWN5ID0ge1xuICAgICAgICBuZXR3b3JrOiB7XG4gICAgICAgICAgXCIqXCI6IHNldHRpbmdNZXRhZGF0YVxuICAgICAgICB9LFxuICAgICAgICBzZXJ2aWNlczoge1xuICAgICAgICAgIFwiKlwiOiBzZXR0aW5nTWV0YWRhdGFcbiAgICAgICAgfSxcbiAgICAgICAgd2Vic2l0ZXM6IHtcbiAgICAgICAgICBcIipcIjogc2V0dGluZ01ldGFkYXRhXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICByZXR1cm4gd3JhcE9iamVjdChleHRlbnNpb25BUElzLCBzdGF0aWNXcmFwcGVycywgYXBpTWV0YWRhdGEpO1xuICAgIH07IC8vIFRoZSBidWlsZCBwcm9jZXNzIGFkZHMgYSBVTUQgd3JhcHBlciBhcm91bmQgdGhpcyBmaWxlLCB3aGljaCBtYWtlcyB0aGVcbiAgICAvLyBgbW9kdWxlYCB2YXJpYWJsZSBhdmFpbGFibGUuXG5cblxuICAgIG1vZHVsZS5leHBvcnRzID0gd3JhcEFQSXMoY2hyb21lKTtcbiAgfSBlbHNlIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGdsb2JhbFRoaXMuYnJvd3NlcjtcbiAgfVxufSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1icm93c2VyLXBvbHlmaWxsLmpzLm1hcFxuIiwiaW1wb3J0IGJyb3dzZXIgZnJvbSAnd2ViZXh0ZW5zaW9uLXBvbHlmaWxsJztcblxuZXhwb3J0IGNvbnN0IG1lc3NhZ2VBY3Rpb25zID0gY3JlYXRlQ29uc3RhbnRPYmplY3QoJ1BBUlNFX0RPQ1VNRU5UJyk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZURvY3VtZW50KHRhYklkKSB7XG4gIHJldHVybiBzZW5kQWN0aW9uKHRhYklkLCBtZXNzYWdlQWN0aW9ucy5QQVJTRV9ET0NVTUVOVCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNlbmRBY3Rpb24odGFiSWQsIGFjdGlvbikge1xuICB0cnkge1xuICAgIHJldHVybiBhd2FpdCBicm93c2VyLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgYWN0aW9uIH0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHNlbmQgYWN0aW9uIChhY3Rpb249JHthY3Rpb259KTogJHtlcnJ9YCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlQ29uc3RhbnRPYmplY3QoLi4ubmFtZXMpIHtcbiAgY29uc3QgY29uc3RhbnRzID0ge307XG5cbiAgZm9yIChjb25zdCBuYW1lIG9mIG5hbWVzKVxuICAgIGNvbnN0YW50c1tuYW1lXSA9IG5hbWU7XG5cbiAgcmV0dXJuIE9iamVjdC5mcmVlemUoY29uc3RhbnRzKTtcbn1cbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gKG1vZHVsZSkgPT4ge1xuXHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cblx0XHQoKSA9PiAobW9kdWxlWydkZWZhdWx0J10pIDpcblx0XHQoKSA9PiAobW9kdWxlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgeyBhOiBnZXR0ZXIgfSk7XG5cdHJldHVybiBnZXR0ZXI7XG59OyIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJpbXBvcnQgYnJvd3NlciBmcm9tICd3ZWJleHRlbnNpb24tcG9seWZpbGwnO1xuaW1wb3J0IHsgUmVhZGFiaWxpdHkgfSBmcm9tICdAbW96aWxsYS9yZWFkYWJpbGl0eSc7XG5pbXBvcnQgeyBtZXNzYWdlQWN0aW9ucyB9IGZyb20gJy4vYWN0aW9ucyc7XG5cbmJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIob25NZXNzYWdlKTtcblxuYXN5bmMgZnVuY3Rpb24gb25NZXNzYWdlKHsgYWN0aW9uIH0sIHNlbmRlciwgc2VuZFJlc3BvbnNlKSB7XG4gIGlmIChhY3Rpb24gIT09IG1lc3NhZ2VBY3Rpb25zLlBBUlNFX0RPQ1VNRU5UKVxuICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBhY3Rpb246ICR7YWN0aW9ufWApO1xuXG4gIGNvbnN0IHJlYWRhYmlsaXR5ID0gbmV3IFJlYWRhYmlsaXR5KGRvY3VtZW50LmNsb25lTm9kZSh0cnVlKSk7XG4gIGNvbnN0IGRhdGEgPSByZWFkYWJpbGl0eS5wYXJzZSgpO1xuXG4gIHJldHVybiBkYXRhO1xufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9