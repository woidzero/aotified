// src/core/plugins.ts
var $2 = window.$ || window.JQuery;
if (!$2) {
  throw new Error("[aotified] jQuery not found on window");
}
$2.fn.wrapChildren = function(childSelector, wrapper) {
  return this.each(function() {
    $2(this).children(childSelector).wrapAll(wrapper);
  });
};
$2.fn.wrapSmart = function(wrapper) {
  return this.each(function() {
    const $w = typeof wrapper === "function" ? wrapper() : wrapper.clone();
    $2(this).before($w);
    $w.append(this);
  });
};
$2.fn.unpack = function() {
  return this.each(function() {
    const $this = $2(this);
    $this.replaceWith($this.contents());
  });
};
$2.fn.changeTag = function(tag) {
  tag = tag.replace(/[<>]/g, "");
  return this.map(function() {
    const oldEl = this;
    const $old = $2(oldEl);
    const newEl = document.createElement(tag);
    for (const attr of Array.from(oldEl.attributes)) {
      newEl.setAttribute(attr.name, attr.value);
    }
    $2(newEl).append($old.contents());
    oldEl.replaceWith(newEl);
    return newEl;
  });
};
$2.fn.replaceClass = function(from, to) {
  const fromList = from ? Array.isArray(from) ? from : [from] : [];
  const toList = to ? Array.isArray(to) ? to : [to] : [];
  return this.each(function() {
    const $el = $2(this);
    if (fromList.length) {
      $el.removeClass(fromList.join(" "));
    }
    if (from === "*") {
      $el.removeAttr("class");
    }
    if (toList.length) {
      $el.addClass(toList.join(" "));
    }
  });
};

// src/core/observer.ts
var sharedMutationObserver = null;
var observerEntries = [];
var observedRoots = new Set;
function getSharedMutationObserver() {
  if (sharedMutationObserver)
    return sharedMutationObserver;
  sharedMutationObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (let i = 0;i < m.addedNodes.length; i++) {
        const node = m.addedNodes[i];
        if (!(node instanceof Element))
          continue;
        for (const entry of observerEntries) {
          const root = entry.rootEl;
          if (root !== node && !root.contains(node))
            continue;
          if (node.matches(entry.selector))
            entry.handle(node);
          node.querySelectorAll?.(entry.selector).forEach((el) => entry.handle(el));
          if (node.parentElement?.matches(entry.selector))
            entry.handle(node.parentElement);
        }
      }
    }
  });
  return sharedMutationObserver;
}
function observeRoot(rootEl) {
  if (observedRoots.has(rootEl))
    return;
  observedRoots.add(rootEl);
  getSharedMutationObserver().observe(rootEl, { childList: true, subtree: true });
}
function Observer(selector, callback, {
  root = document,
  idle = false,
  intersection = false,
  intersectionOptions,
  live = false
} = {}) {
  const processed = live ? null : new WeakSet;
  const getRootEl = () => root?.[0] ?? root;
  const rootEl = getRootEl();
  const run = (el) => {
    if (!live && processed?.has(el))
      return;
    if (!live)
      processed?.add(el);
    const $el = $(el);
    const exec = () => callback.call($el);
    if (idle && "requestIdleCallback" in window) {
      requestIdleCallback(exec);
    } else {
      exec();
    }
  };
  const io = intersection && "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting)
        continue;
      run(e.target);
      io.unobserve(e.target);
    }
  }, intersectionOptions) : null;
  const handle = (el) => {
    if (io) {
      io.observe(el);
    } else {
      run(el);
    }
  };
  $(rootEl).find(selector).each((_, el) => handle(el));
  const entry = {
    selector,
    rootEl,
    handle,
    cleanup: () => {}
  };
  const stop = () => {
    const idx = observerEntries.indexOf(entry);
    if (idx !== -1)
      observerEntries.splice(idx, 1);
    const rootStillUsed = observerEntries.some((e) => e.rootEl === rootEl);
    if (!rootStillUsed) {
      observedRoots.delete(rootEl);
      if (sharedMutationObserver) {
        sharedMutationObserver.disconnect();
        sharedMutationObserver = null;
        observedRoots.clear();
        [...new Set(observerEntries.map((e) => e.rootEl))].forEach(observeRoot);
      }
    }
    io?.disconnect();
  };
  entry.cleanup = stop;
  observerEntries.push(entry);
  observeRoot(rootEl);
  return stop;
}

// src/core/logger.ts
class Logger {
  scope;
  clear;
  style;
  constructor(scope, clear = false, style) {
    this.scope = scope;
    this.clear = clear;
    this.style = style;
    if (this.clear)
      console.clear();
  }
  formatArgs(args, color) {
    return [
      `%c[${this.scope}]:`,
      `color: ${color}; font-weight: bold;`,
      ...args
    ];
  }
  log(...args) {
    console.log(...this.formatArgs(args, "white"));
  }
  info(...args) {
    console.info(...this.formatArgs(args, "#2196F3"));
  }
  debug(...args) {
    console.debug(...this.formatArgs(args, "gray"));
  }
  warn(...args) {
    console.warn(...this.formatArgs(args, "orange"));
  }
  error(...args) {
    console.error(...this.formatArgs(args, "red"));
  }
}

// src/core/hook.ts
function pathPatternToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]+");
  return new RegExp("^" + escaped + "$");
}
function Hook(path, callback) {
  let fired = false;
  const re = pathPatternToRegex(path);
  const check = () => {
    if (location.hostname.endsWith("albumoftheyear.org") && re.test(location.pathname)) {
      if (!fired) {
        fired = true;
        callback();
      }
    } else {
      fired = false;
    }
  };
  check();
}

// src/core/patcher.ts
$("#sortDrop").on("click", ".criticSort", function(e) {
  e.preventDefault();
  e.stopPropagation();
  const $btn = $(this);
  if (this.disabled)
    return;
  const $li = $btn.closest("li");
  const sort = $btn.attr("sort");
  $("#sortDrop li").removeAttr("class").find("button").prop("disabled", false);
  $li.addClass("current");
  $btn.prop("disabled", true);
  const $reviews = $("#criticReviewContainer .albumReviewRow");
  const sorted = $reviews.get().sort((a, b) => {
    const $a = $(a), $b = $(b);
    const dateAStr = $a.find(".albumReviewLinks .actionContainer:has(.date)").attr("title");
    const dateBStr = $b.find(".albumReviewLinks .actionContainer:has(.date)").attr("title");
    const dateA = dateAStr ? Number(new Date(dateAStr)) : 0;
    const dateB = dateBStr ? Number(new Date(dateBStr)) : 0;
    if (sort === "highest") {
      return parseInt($b.find(".albumReviewRating").text()) - parseInt($a.find(".albumReviewRating").text());
    }
    if (sort === "lowest") {
      return parseInt($a.find(".albumReviewRating").text()) - parseInt($b.find(".albumReviewRating").text());
    }
    if (sort === "newest") {
      return dateB - dateA;
    }
    if (sort === "oldest") {
      return dateA - dateB;
    }
    return 0;
  });
  $("#criticReviewContainer").empty().append(sorted);
});
(function() {
  const $box = $(".addCoverBox");
  if (!$box.length)
    return;
  const input = $box.find('input[type="file"]')[0];
  if (!input)
    return;
  $box.addClass("aotified-dropzone");
  $box.on("dragenter dragover", function(e) {
    e.preventDefault();
    e.stopPropagation();
    $box.addClass("aotified-dragover");
  });
  $box.on("dragleave dragend drop", function(e) {
    e.preventDefault();
    e.stopPropagation();
    $box.removeClass("aotified-dragover");
  });
  $box.on("drop", function(e) {
    const files = e.originalEvent?.dataTransfer?.files;
    if (!files || !files.length)
      return;
    const dt = new DataTransfer;
    for (const file of files) {
      dt.items.add(file);
    }
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
})();
window.toggle_visibility = function(id, id2) {
  const e = document.getElementById(id);
  const s = document.getElementById(id2);
  if (e)
    e.style.display = e.style.display === "block" ? "none" : "block";
  if (s)
    s.style.display = s.style.display === "block" ? "none" : "block";
};
window.ga = function() {
  return false;
};

// node_modules/@popperjs/core/lib/enums.js
var top = "top";
var bottom = "bottom";
var right = "right";
var left = "left";
var auto = "auto";
var basePlacements = [top, bottom, right, left];
var start = "start";
var end = "end";
var clippingParents = "clippingParents";
var viewport = "viewport";
var popper = "popper";
var reference = "reference";
var variationPlacements = /* @__PURE__ */ basePlacements.reduce(function(acc, placement) {
  return acc.concat([placement + "-" + start, placement + "-" + end]);
}, []);
var placements = /* @__PURE__ */ [].concat(basePlacements, [auto]).reduce(function(acc, placement) {
  return acc.concat([placement, placement + "-" + start, placement + "-" + end]);
}, []);
var beforeRead = "beforeRead";
var read = "read";
var afterRead = "afterRead";
var beforeMain = "beforeMain";
var main = "main";
var afterMain = "afterMain";
var beforeWrite = "beforeWrite";
var write = "write";
var afterWrite = "afterWrite";
var modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];
// node_modules/@popperjs/core/lib/dom-utils/getNodeName.js
function getNodeName(element) {
  return element ? (element.nodeName || "").toLowerCase() : null;
}

// node_modules/@popperjs/core/lib/dom-utils/getWindow.js
function getWindow(node) {
  if (node == null) {
    return window;
  }
  if (node.toString() !== "[object Window]") {
    var ownerDocument = node.ownerDocument;
    return ownerDocument ? ownerDocument.defaultView || window : window;
  }
  return node;
}

// node_modules/@popperjs/core/lib/dom-utils/instanceOf.js
function isElement(node) {
  var OwnElement = getWindow(node).Element;
  return node instanceof OwnElement || node instanceof Element;
}
function isHTMLElement(node) {
  var OwnElement = getWindow(node).HTMLElement;
  return node instanceof OwnElement || node instanceof HTMLElement;
}
function isShadowRoot(node) {
  if (typeof ShadowRoot === "undefined") {
    return false;
  }
  var OwnElement = getWindow(node).ShadowRoot;
  return node instanceof OwnElement || node instanceof ShadowRoot;
}

// node_modules/@popperjs/core/lib/modifiers/applyStyles.js
function applyStyles(_ref) {
  var state = _ref.state;
  Object.keys(state.elements).forEach(function(name) {
    var style = state.styles[name] || {};
    var attributes = state.attributes[name] || {};
    var element = state.elements[name];
    if (!isHTMLElement(element) || !getNodeName(element)) {
      return;
    }
    Object.assign(element.style, style);
    Object.keys(attributes).forEach(function(name2) {
      var value = attributes[name2];
      if (value === false) {
        element.removeAttribute(name2);
      } else {
        element.setAttribute(name2, value === true ? "" : value);
      }
    });
  });
}
function effect(_ref2) {
  var state = _ref2.state;
  var initialStyles = {
    popper: {
      position: state.options.strategy,
      left: "0",
      top: "0",
      margin: "0"
    },
    arrow: {
      position: "absolute"
    },
    reference: {}
  };
  Object.assign(state.elements.popper.style, initialStyles.popper);
  state.styles = initialStyles;
  if (state.elements.arrow) {
    Object.assign(state.elements.arrow.style, initialStyles.arrow);
  }
  return function() {
    Object.keys(state.elements).forEach(function(name) {
      var element = state.elements[name];
      var attributes = state.attributes[name] || {};
      var styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]);
      var style = styleProperties.reduce(function(style2, property) {
        style2[property] = "";
        return style2;
      }, {});
      if (!isHTMLElement(element) || !getNodeName(element)) {
        return;
      }
      Object.assign(element.style, style);
      Object.keys(attributes).forEach(function(attribute) {
        element.removeAttribute(attribute);
      });
    });
  };
}
var applyStyles_default = {
  name: "applyStyles",
  enabled: true,
  phase: "write",
  fn: applyStyles,
  effect,
  requires: ["computeStyles"]
};

// node_modules/@popperjs/core/lib/utils/getBasePlacement.js
function getBasePlacement(placement) {
  return placement.split("-")[0];
}

// node_modules/@popperjs/core/lib/utils/math.js
var max = Math.max;
var min = Math.min;
var round = Math.round;

// node_modules/@popperjs/core/lib/utils/userAgent.js
function getUAString() {
  var uaData = navigator.userAgentData;
  if (uaData != null && uaData.brands && Array.isArray(uaData.brands)) {
    return uaData.brands.map(function(item) {
      return item.brand + "/" + item.version;
    }).join(" ");
  }
  return navigator.userAgent;
}

// node_modules/@popperjs/core/lib/dom-utils/isLayoutViewport.js
function isLayoutViewport() {
  return !/^((?!chrome|android).)*safari/i.test(getUAString());
}

// node_modules/@popperjs/core/lib/dom-utils/getBoundingClientRect.js
function getBoundingClientRect(element, includeScale, isFixedStrategy) {
  if (includeScale === undefined) {
    includeScale = false;
  }
  if (isFixedStrategy === undefined) {
    isFixedStrategy = false;
  }
  var clientRect = element.getBoundingClientRect();
  var scaleX = 1;
  var scaleY = 1;
  if (includeScale && isHTMLElement(element)) {
    scaleX = element.offsetWidth > 0 ? round(clientRect.width) / element.offsetWidth || 1 : 1;
    scaleY = element.offsetHeight > 0 ? round(clientRect.height) / element.offsetHeight || 1 : 1;
  }
  var _ref = isElement(element) ? getWindow(element) : window, visualViewport = _ref.visualViewport;
  var addVisualOffsets = !isLayoutViewport() && isFixedStrategy;
  var x = (clientRect.left + (addVisualOffsets && visualViewport ? visualViewport.offsetLeft : 0)) / scaleX;
  var y = (clientRect.top + (addVisualOffsets && visualViewport ? visualViewport.offsetTop : 0)) / scaleY;
  var width = clientRect.width / scaleX;
  var height = clientRect.height / scaleY;
  return {
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
    x,
    y
  };
}

// node_modules/@popperjs/core/lib/dom-utils/getLayoutRect.js
function getLayoutRect(element) {
  var clientRect = getBoundingClientRect(element);
  var width = element.offsetWidth;
  var height = element.offsetHeight;
  if (Math.abs(clientRect.width - width) <= 1) {
    width = clientRect.width;
  }
  if (Math.abs(clientRect.height - height) <= 1) {
    height = clientRect.height;
  }
  return {
    x: element.offsetLeft,
    y: element.offsetTop,
    width,
    height
  };
}

// node_modules/@popperjs/core/lib/dom-utils/contains.js
function contains(parent, child) {
  var rootNode = child.getRootNode && child.getRootNode();
  if (parent.contains(child)) {
    return true;
  } else if (rootNode && isShadowRoot(rootNode)) {
    var next = child;
    do {
      if (next && parent.isSameNode(next)) {
        return true;
      }
      next = next.parentNode || next.host;
    } while (next);
  }
  return false;
}

// node_modules/@popperjs/core/lib/dom-utils/getComputedStyle.js
function getComputedStyle(element) {
  return getWindow(element).getComputedStyle(element);
}

// node_modules/@popperjs/core/lib/dom-utils/isTableElement.js
function isTableElement(element) {
  return ["table", "td", "th"].indexOf(getNodeName(element)) >= 0;
}

// node_modules/@popperjs/core/lib/dom-utils/getDocumentElement.js
function getDocumentElement(element) {
  return ((isElement(element) ? element.ownerDocument : element.document) || window.document).documentElement;
}

// node_modules/@popperjs/core/lib/dom-utils/getParentNode.js
function getParentNode(element) {
  if (getNodeName(element) === "html") {
    return element;
  }
  return element.assignedSlot || element.parentNode || (isShadowRoot(element) ? element.host : null) || getDocumentElement(element);
}

// node_modules/@popperjs/core/lib/dom-utils/getOffsetParent.js
function getTrueOffsetParent(element) {
  if (!isHTMLElement(element) || getComputedStyle(element).position === "fixed") {
    return null;
  }
  return element.offsetParent;
}
function getContainingBlock(element) {
  var isFirefox = /firefox/i.test(getUAString());
  var isIE = /Trident/i.test(getUAString());
  if (isIE && isHTMLElement(element)) {
    var elementCss = getComputedStyle(element);
    if (elementCss.position === "fixed") {
      return null;
    }
  }
  var currentNode = getParentNode(element);
  if (isShadowRoot(currentNode)) {
    currentNode = currentNode.host;
  }
  while (isHTMLElement(currentNode) && ["html", "body"].indexOf(getNodeName(currentNode)) < 0) {
    var css = getComputedStyle(currentNode);
    if (css.transform !== "none" || css.perspective !== "none" || css.contain === "paint" || ["transform", "perspective"].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === "filter" || isFirefox && css.filter && css.filter !== "none") {
      return currentNode;
    } else {
      currentNode = currentNode.parentNode;
    }
  }
  return null;
}
function getOffsetParent(element) {
  var window2 = getWindow(element);
  var offsetParent = getTrueOffsetParent(element);
  while (offsetParent && isTableElement(offsetParent) && getComputedStyle(offsetParent).position === "static") {
    offsetParent = getTrueOffsetParent(offsetParent);
  }
  if (offsetParent && (getNodeName(offsetParent) === "html" || getNodeName(offsetParent) === "body" && getComputedStyle(offsetParent).position === "static")) {
    return window2;
  }
  return offsetParent || getContainingBlock(element) || window2;
}

// node_modules/@popperjs/core/lib/utils/getMainAxisFromPlacement.js
function getMainAxisFromPlacement(placement) {
  return ["top", "bottom"].indexOf(placement) >= 0 ? "x" : "y";
}

// node_modules/@popperjs/core/lib/utils/within.js
function within(min2, value, max2) {
  return max(min2, min(value, max2));
}
function withinMaxClamp(min2, value, max2) {
  var v = within(min2, value, max2);
  return v > max2 ? max2 : v;
}

// node_modules/@popperjs/core/lib/utils/getFreshSideObject.js
function getFreshSideObject() {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };
}

// node_modules/@popperjs/core/lib/utils/mergePaddingObject.js
function mergePaddingObject(paddingObject) {
  return Object.assign({}, getFreshSideObject(), paddingObject);
}

// node_modules/@popperjs/core/lib/utils/expandToHashMap.js
function expandToHashMap(value, keys) {
  return keys.reduce(function(hashMap, key) {
    hashMap[key] = value;
    return hashMap;
  }, {});
}

// node_modules/@popperjs/core/lib/modifiers/arrow.js
var toPaddingObject = function toPaddingObject2(padding, state) {
  padding = typeof padding === "function" ? padding(Object.assign({}, state.rects, {
    placement: state.placement
  })) : padding;
  return mergePaddingObject(typeof padding !== "number" ? padding : expandToHashMap(padding, basePlacements));
};
function arrow(_ref) {
  var _state$modifiersData$;
  var { state, name, options } = _ref;
  var arrowElement = state.elements.arrow;
  var popperOffsets = state.modifiersData.popperOffsets;
  var basePlacement = getBasePlacement(state.placement);
  var axis = getMainAxisFromPlacement(basePlacement);
  var isVertical = [left, right].indexOf(basePlacement) >= 0;
  var len = isVertical ? "height" : "width";
  if (!arrowElement || !popperOffsets) {
    return;
  }
  var paddingObject = toPaddingObject(options.padding, state);
  var arrowRect = getLayoutRect(arrowElement);
  var minProp = axis === "y" ? top : left;
  var maxProp = axis === "y" ? bottom : right;
  var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets[axis] - state.rects.popper[len];
  var startDiff = popperOffsets[axis] - state.rects.reference[axis];
  var arrowOffsetParent = getOffsetParent(arrowElement);
  var clientSize = arrowOffsetParent ? axis === "y" ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
  var centerToReference = endDiff / 2 - startDiff / 2;
  var min2 = paddingObject[minProp];
  var max2 = clientSize - arrowRect[len] - paddingObject[maxProp];
  var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
  var offset = within(min2, center, max2);
  var axisProp = axis;
  state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset, _state$modifiersData$.centerOffset = offset - center, _state$modifiersData$);
}
function effect2(_ref2) {
  var { state, options } = _ref2;
  var _options$element = options.element, arrowElement = _options$element === undefined ? "[data-popper-arrow]" : _options$element;
  if (arrowElement == null) {
    return;
  }
  if (typeof arrowElement === "string") {
    arrowElement = state.elements.popper.querySelector(arrowElement);
    if (!arrowElement) {
      return;
    }
  }
  if (!contains(state.elements.popper, arrowElement)) {
    return;
  }
  state.elements.arrow = arrowElement;
}
var arrow_default = {
  name: "arrow",
  enabled: true,
  phase: "main",
  fn: arrow,
  effect: effect2,
  requires: ["popperOffsets"],
  requiresIfExists: ["preventOverflow"]
};

// node_modules/@popperjs/core/lib/utils/getVariation.js
function getVariation(placement) {
  return placement.split("-")[1];
}

// node_modules/@popperjs/core/lib/modifiers/computeStyles.js
var unsetSides = {
  top: "auto",
  right: "auto",
  bottom: "auto",
  left: "auto"
};
function roundOffsetsByDPR(_ref, win) {
  var { x, y } = _ref;
  var dpr = win.devicePixelRatio || 1;
  return {
    x: round(x * dpr) / dpr || 0,
    y: round(y * dpr) / dpr || 0
  };
}
function mapToStyles(_ref2) {
  var _Object$assign2;
  var { popper: popper2, popperRect, placement, variation, offsets, position, gpuAcceleration, adaptive, roundOffsets, isFixed } = _ref2;
  var _offsets$x = offsets.x, x = _offsets$x === undefined ? 0 : _offsets$x, _offsets$y = offsets.y, y = _offsets$y === undefined ? 0 : _offsets$y;
  var _ref3 = typeof roundOffsets === "function" ? roundOffsets({
    x,
    y
  }) : {
    x,
    y
  };
  x = _ref3.x;
  y = _ref3.y;
  var hasX = offsets.hasOwnProperty("x");
  var hasY = offsets.hasOwnProperty("y");
  var sideX = left;
  var sideY = top;
  var win = window;
  if (adaptive) {
    var offsetParent = getOffsetParent(popper2);
    var heightProp = "clientHeight";
    var widthProp = "clientWidth";
    if (offsetParent === getWindow(popper2)) {
      offsetParent = getDocumentElement(popper2);
      if (getComputedStyle(offsetParent).position !== "static" && position === "absolute") {
        heightProp = "scrollHeight";
        widthProp = "scrollWidth";
      }
    }
    offsetParent = offsetParent;
    if (placement === top || (placement === left || placement === right) && variation === end) {
      sideY = bottom;
      var offsetY = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.height : offsetParent[heightProp];
      y -= offsetY - popperRect.height;
      y *= gpuAcceleration ? 1 : -1;
    }
    if (placement === left || (placement === top || placement === bottom) && variation === end) {
      sideX = right;
      var offsetX = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.width : offsetParent[widthProp];
      x -= offsetX - popperRect.width;
      x *= gpuAcceleration ? 1 : -1;
    }
  }
  var commonStyles = Object.assign({
    position
  }, adaptive && unsetSides);
  var _ref4 = roundOffsets === true ? roundOffsetsByDPR({
    x,
    y
  }, getWindow(popper2)) : {
    x,
    y
  };
  x = _ref4.x;
  y = _ref4.y;
  if (gpuAcceleration) {
    var _Object$assign;
    return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? "0" : "", _Object$assign[sideX] = hasX ? "0" : "", _Object$assign.transform = (win.devicePixelRatio || 1) <= 1 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
  }
  return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : "", _Object$assign2[sideX] = hasX ? x + "px" : "", _Object$assign2.transform = "", _Object$assign2));
}
function computeStyles(_ref5) {
  var { state, options } = _ref5;
  var _options$gpuAccelerat = options.gpuAcceleration, gpuAcceleration = _options$gpuAccelerat === undefined ? true : _options$gpuAccelerat, _options$adaptive = options.adaptive, adaptive = _options$adaptive === undefined ? true : _options$adaptive, _options$roundOffsets = options.roundOffsets, roundOffsets = _options$roundOffsets === undefined ? true : _options$roundOffsets;
  var commonStyles = {
    placement: getBasePlacement(state.placement),
    variation: getVariation(state.placement),
    popper: state.elements.popper,
    popperRect: state.rects.popper,
    gpuAcceleration,
    isFixed: state.options.strategy === "fixed"
  };
  if (state.modifiersData.popperOffsets != null) {
    state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
      offsets: state.modifiersData.popperOffsets,
      position: state.options.strategy,
      adaptive,
      roundOffsets
    })));
  }
  if (state.modifiersData.arrow != null) {
    state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
      offsets: state.modifiersData.arrow,
      position: "absolute",
      adaptive: false,
      roundOffsets
    })));
  }
  state.attributes.popper = Object.assign({}, state.attributes.popper, {
    "data-popper-placement": state.placement
  });
}
var computeStyles_default = {
  name: "computeStyles",
  enabled: true,
  phase: "beforeWrite",
  fn: computeStyles,
  data: {}
};

// node_modules/@popperjs/core/lib/modifiers/eventListeners.js
var passive = {
  passive: true
};
function effect3(_ref) {
  var { state, instance, options } = _ref;
  var _options$scroll = options.scroll, scroll = _options$scroll === undefined ? true : _options$scroll, _options$resize = options.resize, resize = _options$resize === undefined ? true : _options$resize;
  var window2 = getWindow(state.elements.popper);
  var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);
  if (scroll) {
    scrollParents.forEach(function(scrollParent) {
      scrollParent.addEventListener("scroll", instance.update, passive);
    });
  }
  if (resize) {
    window2.addEventListener("resize", instance.update, passive);
  }
  return function() {
    if (scroll) {
      scrollParents.forEach(function(scrollParent) {
        scrollParent.removeEventListener("scroll", instance.update, passive);
      });
    }
    if (resize) {
      window2.removeEventListener("resize", instance.update, passive);
    }
  };
}
var eventListeners_default = {
  name: "eventListeners",
  enabled: true,
  phase: "write",
  fn: function fn() {},
  effect: effect3,
  data: {}
};

// node_modules/@popperjs/core/lib/utils/getOppositePlacement.js
var hash = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
function getOppositePlacement(placement) {
  return placement.replace(/left|right|bottom|top/g, function(matched) {
    return hash[matched];
  });
}

// node_modules/@popperjs/core/lib/utils/getOppositeVariationPlacement.js
var hash2 = {
  start: "end",
  end: "start"
};
function getOppositeVariationPlacement(placement) {
  return placement.replace(/start|end/g, function(matched) {
    return hash2[matched];
  });
}

// node_modules/@popperjs/core/lib/dom-utils/getWindowScroll.js
function getWindowScroll(node) {
  var win = getWindow(node);
  var scrollLeft = win.pageXOffset;
  var scrollTop = win.pageYOffset;
  return {
    scrollLeft,
    scrollTop
  };
}

// node_modules/@popperjs/core/lib/dom-utils/getWindowScrollBarX.js
function getWindowScrollBarX(element) {
  return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
}

// node_modules/@popperjs/core/lib/dom-utils/getViewportRect.js
function getViewportRect(element, strategy) {
  var win = getWindow(element);
  var html = getDocumentElement(element);
  var visualViewport = win.visualViewport;
  var width = html.clientWidth;
  var height = html.clientHeight;
  var x = 0;
  var y = 0;
  if (visualViewport) {
    width = visualViewport.width;
    height = visualViewport.height;
    var layoutViewport = isLayoutViewport();
    if (layoutViewport || !layoutViewport && strategy === "fixed") {
      x = visualViewport.offsetLeft;
      y = visualViewport.offsetTop;
    }
  }
  return {
    width,
    height,
    x: x + getWindowScrollBarX(element),
    y
  };
}

// node_modules/@popperjs/core/lib/dom-utils/getDocumentRect.js
function getDocumentRect(element) {
  var _element$ownerDocumen;
  var html = getDocumentElement(element);
  var winScroll = getWindowScroll(element);
  var body = (_element$ownerDocumen = element.ownerDocument) == null ? undefined : _element$ownerDocumen.body;
  var width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
  var height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
  var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
  var y = -winScroll.scrollTop;
  if (getComputedStyle(body || html).direction === "rtl") {
    x += max(html.clientWidth, body ? body.clientWidth : 0) - width;
  }
  return {
    width,
    height,
    x,
    y
  };
}

// node_modules/@popperjs/core/lib/dom-utils/isScrollParent.js
function isScrollParent(element) {
  var _getComputedStyle = getComputedStyle(element), overflow = _getComputedStyle.overflow, overflowX = _getComputedStyle.overflowX, overflowY = _getComputedStyle.overflowY;
  return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
}

// node_modules/@popperjs/core/lib/dom-utils/getScrollParent.js
function getScrollParent(node) {
  if (["html", "body", "#document"].indexOf(getNodeName(node)) >= 0) {
    return node.ownerDocument.body;
  }
  if (isHTMLElement(node) && isScrollParent(node)) {
    return node;
  }
  return getScrollParent(getParentNode(node));
}

// node_modules/@popperjs/core/lib/dom-utils/listScrollParents.js
function listScrollParents(element, list) {
  var _element$ownerDocumen;
  if (list === undefined) {
    list = [];
  }
  var scrollParent = getScrollParent(element);
  var isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? undefined : _element$ownerDocumen.body);
  var win = getWindow(scrollParent);
  var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
  var updatedList = list.concat(target);
  return isBody ? updatedList : updatedList.concat(listScrollParents(getParentNode(target)));
}

// node_modules/@popperjs/core/lib/utils/rectToClientRect.js
function rectToClientRect(rect) {
  return Object.assign({}, rect, {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height
  });
}

// node_modules/@popperjs/core/lib/dom-utils/getClippingRect.js
function getInnerBoundingClientRect(element, strategy) {
  var rect = getBoundingClientRect(element, false, strategy === "fixed");
  rect.top = rect.top + element.clientTop;
  rect.left = rect.left + element.clientLeft;
  rect.bottom = rect.top + element.clientHeight;
  rect.right = rect.left + element.clientWidth;
  rect.width = element.clientWidth;
  rect.height = element.clientHeight;
  rect.x = rect.left;
  rect.y = rect.top;
  return rect;
}
function getClientRectFromMixedType(element, clippingParent, strategy) {
  return clippingParent === viewport ? rectToClientRect(getViewportRect(element, strategy)) : isElement(clippingParent) ? getInnerBoundingClientRect(clippingParent, strategy) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
}
function getClippingParents(element) {
  var clippingParents2 = listScrollParents(getParentNode(element));
  var canEscapeClipping = ["absolute", "fixed"].indexOf(getComputedStyle(element).position) >= 0;
  var clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;
  if (!isElement(clipperElement)) {
    return [];
  }
  return clippingParents2.filter(function(clippingParent) {
    return isElement(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== "body";
  });
}
function getClippingRect(element, boundary, rootBoundary, strategy) {
  var mainClippingParents = boundary === "clippingParents" ? getClippingParents(element) : [].concat(boundary);
  var clippingParents2 = [].concat(mainClippingParents, [rootBoundary]);
  var firstClippingParent = clippingParents2[0];
  var clippingRect = clippingParents2.reduce(function(accRect, clippingParent) {
    var rect = getClientRectFromMixedType(element, clippingParent, strategy);
    accRect.top = max(rect.top, accRect.top);
    accRect.right = min(rect.right, accRect.right);
    accRect.bottom = min(rect.bottom, accRect.bottom);
    accRect.left = max(rect.left, accRect.left);
    return accRect;
  }, getClientRectFromMixedType(element, firstClippingParent, strategy));
  clippingRect.width = clippingRect.right - clippingRect.left;
  clippingRect.height = clippingRect.bottom - clippingRect.top;
  clippingRect.x = clippingRect.left;
  clippingRect.y = clippingRect.top;
  return clippingRect;
}

// node_modules/@popperjs/core/lib/utils/computeOffsets.js
function computeOffsets(_ref) {
  var { reference: reference2, element, placement } = _ref;
  var basePlacement = placement ? getBasePlacement(placement) : null;
  var variation = placement ? getVariation(placement) : null;
  var commonX = reference2.x + reference2.width / 2 - element.width / 2;
  var commonY = reference2.y + reference2.height / 2 - element.height / 2;
  var offsets;
  switch (basePlacement) {
    case top:
      offsets = {
        x: commonX,
        y: reference2.y - element.height
      };
      break;
    case bottom:
      offsets = {
        x: commonX,
        y: reference2.y + reference2.height
      };
      break;
    case right:
      offsets = {
        x: reference2.x + reference2.width,
        y: commonY
      };
      break;
    case left:
      offsets = {
        x: reference2.x - element.width,
        y: commonY
      };
      break;
    default:
      offsets = {
        x: reference2.x,
        y: reference2.y
      };
  }
  var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;
  if (mainAxis != null) {
    var len = mainAxis === "y" ? "height" : "width";
    switch (variation) {
      case start:
        offsets[mainAxis] = offsets[mainAxis] - (reference2[len] / 2 - element[len] / 2);
        break;
      case end:
        offsets[mainAxis] = offsets[mainAxis] + (reference2[len] / 2 - element[len] / 2);
        break;
      default:
    }
  }
  return offsets;
}

// node_modules/@popperjs/core/lib/utils/detectOverflow.js
function detectOverflow(state, options) {
  if (options === undefined) {
    options = {};
  }
  var _options = options, _options$placement = _options.placement, placement = _options$placement === undefined ? state.placement : _options$placement, _options$strategy = _options.strategy, strategy = _options$strategy === undefined ? state.strategy : _options$strategy, _options$boundary = _options.boundary, boundary = _options$boundary === undefined ? clippingParents : _options$boundary, _options$rootBoundary = _options.rootBoundary, rootBoundary = _options$rootBoundary === undefined ? viewport : _options$rootBoundary, _options$elementConte = _options.elementContext, elementContext = _options$elementConte === undefined ? popper : _options$elementConte, _options$altBoundary = _options.altBoundary, altBoundary = _options$altBoundary === undefined ? false : _options$altBoundary, _options$padding = _options.padding, padding = _options$padding === undefined ? 0 : _options$padding;
  var paddingObject = mergePaddingObject(typeof padding !== "number" ? padding : expandToHashMap(padding, basePlacements));
  var altContext = elementContext === popper ? reference : popper;
  var popperRect = state.rects.popper;
  var element = state.elements[altBoundary ? altContext : elementContext];
  var clippingClientRect = getClippingRect(isElement(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary, strategy);
  var referenceClientRect = getBoundingClientRect(state.elements.reference);
  var popperOffsets = computeOffsets({
    reference: referenceClientRect,
    element: popperRect,
    strategy: "absolute",
    placement
  });
  var popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets));
  var elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect;
  var overflowOffsets = {
    top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
    bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
    left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
    right: elementClientRect.right - clippingClientRect.right + paddingObject.right
  };
  var offsetData = state.modifiersData.offset;
  if (elementContext === popper && offsetData) {
    var offset = offsetData[placement];
    Object.keys(overflowOffsets).forEach(function(key) {
      var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1;
      var axis = [top, bottom].indexOf(key) >= 0 ? "y" : "x";
      overflowOffsets[key] += offset[axis] * multiply;
    });
  }
  return overflowOffsets;
}

// node_modules/@popperjs/core/lib/utils/computeAutoPlacement.js
function computeAutoPlacement(state, options) {
  if (options === undefined) {
    options = {};
  }
  var _options = options, placement = _options.placement, boundary = _options.boundary, rootBoundary = _options.rootBoundary, padding = _options.padding, flipVariations = _options.flipVariations, _options$allowedAutoP = _options.allowedAutoPlacements, allowedAutoPlacements = _options$allowedAutoP === undefined ? placements : _options$allowedAutoP;
  var variation = getVariation(placement);
  var placements2 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function(placement2) {
    return getVariation(placement2) === variation;
  }) : basePlacements;
  var allowedPlacements = placements2.filter(function(placement2) {
    return allowedAutoPlacements.indexOf(placement2) >= 0;
  });
  if (allowedPlacements.length === 0) {
    allowedPlacements = placements2;
  }
  var overflows = allowedPlacements.reduce(function(acc, placement2) {
    acc[placement2] = detectOverflow(state, {
      placement: placement2,
      boundary,
      rootBoundary,
      padding
    })[getBasePlacement(placement2)];
    return acc;
  }, {});
  return Object.keys(overflows).sort(function(a, b) {
    return overflows[a] - overflows[b];
  });
}

// node_modules/@popperjs/core/lib/modifiers/flip.js
function getExpandedFallbackPlacements(placement) {
  if (getBasePlacement(placement) === auto) {
    return [];
  }
  var oppositePlacement = getOppositePlacement(placement);
  return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
}
function flip(_ref) {
  var { state, options, name } = _ref;
  if (state.modifiersData[name]._skip) {
    return;
  }
  var _options$mainAxis = options.mainAxis, checkMainAxis = _options$mainAxis === undefined ? true : _options$mainAxis, _options$altAxis = options.altAxis, checkAltAxis = _options$altAxis === undefined ? true : _options$altAxis, specifiedFallbackPlacements = options.fallbackPlacements, padding = options.padding, boundary = options.boundary, rootBoundary = options.rootBoundary, altBoundary = options.altBoundary, _options$flipVariatio = options.flipVariations, flipVariations = _options$flipVariatio === undefined ? true : _options$flipVariatio, allowedAutoPlacements = options.allowedAutoPlacements;
  var preferredPlacement = state.options.placement;
  var basePlacement = getBasePlacement(preferredPlacement);
  var isBasePlacement = basePlacement === preferredPlacement;
  var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
  var placements2 = [preferredPlacement].concat(fallbackPlacements).reduce(function(acc, placement2) {
    return acc.concat(getBasePlacement(placement2) === auto ? computeAutoPlacement(state, {
      placement: placement2,
      boundary,
      rootBoundary,
      padding,
      flipVariations,
      allowedAutoPlacements
    }) : placement2);
  }, []);
  var referenceRect = state.rects.reference;
  var popperRect = state.rects.popper;
  var checksMap = new Map;
  var makeFallbackChecks = true;
  var firstFittingPlacement = placements2[0];
  for (var i = 0;i < placements2.length; i++) {
    var placement = placements2[i];
    var _basePlacement = getBasePlacement(placement);
    var isStartVariation = getVariation(placement) === start;
    var isVertical = [top, bottom].indexOf(_basePlacement) >= 0;
    var len = isVertical ? "width" : "height";
    var overflow = detectOverflow(state, {
      placement,
      boundary,
      rootBoundary,
      altBoundary,
      padding
    });
    var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;
    if (referenceRect[len] > popperRect[len]) {
      mainVariationSide = getOppositePlacement(mainVariationSide);
    }
    var altVariationSide = getOppositePlacement(mainVariationSide);
    var checks = [];
    if (checkMainAxis) {
      checks.push(overflow[_basePlacement] <= 0);
    }
    if (checkAltAxis) {
      checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
    }
    if (checks.every(function(check) {
      return check;
    })) {
      firstFittingPlacement = placement;
      makeFallbackChecks = false;
      break;
    }
    checksMap.set(placement, checks);
  }
  if (makeFallbackChecks) {
    var numberOfChecks = flipVariations ? 3 : 1;
    var _loop = function _loop(_i2) {
      var fittingPlacement = placements2.find(function(placement2) {
        var checks2 = checksMap.get(placement2);
        if (checks2) {
          return checks2.slice(0, _i2).every(function(check) {
            return check;
          });
        }
      });
      if (fittingPlacement) {
        firstFittingPlacement = fittingPlacement;
        return "break";
      }
    };
    for (var _i = numberOfChecks;_i > 0; _i--) {
      var _ret = _loop(_i);
      if (_ret === "break")
        break;
    }
  }
  if (state.placement !== firstFittingPlacement) {
    state.modifiersData[name]._skip = true;
    state.placement = firstFittingPlacement;
    state.reset = true;
  }
}
var flip_default = {
  name: "flip",
  enabled: true,
  phase: "main",
  fn: flip,
  requiresIfExists: ["offset"],
  data: {
    _skip: false
  }
};

// node_modules/@popperjs/core/lib/modifiers/hide.js
function getSideOffsets(overflow, rect, preventedOffsets) {
  if (preventedOffsets === undefined) {
    preventedOffsets = {
      x: 0,
      y: 0
    };
  }
  return {
    top: overflow.top - rect.height - preventedOffsets.y,
    right: overflow.right - rect.width + preventedOffsets.x,
    bottom: overflow.bottom - rect.height + preventedOffsets.y,
    left: overflow.left - rect.width - preventedOffsets.x
  };
}
function isAnySideFullyClipped(overflow) {
  return [top, right, bottom, left].some(function(side) {
    return overflow[side] >= 0;
  });
}
function hide(_ref) {
  var { state, name } = _ref;
  var referenceRect = state.rects.reference;
  var popperRect = state.rects.popper;
  var preventedOffsets = state.modifiersData.preventOverflow;
  var referenceOverflow = detectOverflow(state, {
    elementContext: "reference"
  });
  var popperAltOverflow = detectOverflow(state, {
    altBoundary: true
  });
  var referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
  var popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets);
  var isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
  var hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
  state.modifiersData[name] = {
    referenceClippingOffsets,
    popperEscapeOffsets,
    isReferenceHidden,
    hasPopperEscaped
  };
  state.attributes.popper = Object.assign({}, state.attributes.popper, {
    "data-popper-reference-hidden": isReferenceHidden,
    "data-popper-escaped": hasPopperEscaped
  });
}
var hide_default = {
  name: "hide",
  enabled: true,
  phase: "main",
  requiresIfExists: ["preventOverflow"],
  fn: hide
};

// node_modules/@popperjs/core/lib/modifiers/offset.js
function distanceAndSkiddingToXY(placement, rects, offset) {
  var basePlacement = getBasePlacement(placement);
  var invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1;
  var _ref = typeof offset === "function" ? offset(Object.assign({}, rects, {
    placement
  })) : offset, skidding = _ref[0], distance = _ref[1];
  skidding = skidding || 0;
  distance = (distance || 0) * invertDistance;
  return [left, right].indexOf(basePlacement) >= 0 ? {
    x: distance,
    y: skidding
  } : {
    x: skidding,
    y: distance
  };
}
function offset(_ref2) {
  var { state, options, name } = _ref2;
  var _options$offset = options.offset, offset2 = _options$offset === undefined ? [0, 0] : _options$offset;
  var data = placements.reduce(function(acc, placement) {
    acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset2);
    return acc;
  }, {});
  var _data$state$placement = data[state.placement], x = _data$state$placement.x, y = _data$state$placement.y;
  if (state.modifiersData.popperOffsets != null) {
    state.modifiersData.popperOffsets.x += x;
    state.modifiersData.popperOffsets.y += y;
  }
  state.modifiersData[name] = data;
}
var offset_default = {
  name: "offset",
  enabled: true,
  phase: "main",
  requires: ["popperOffsets"],
  fn: offset
};

// node_modules/@popperjs/core/lib/modifiers/popperOffsets.js
function popperOffsets(_ref) {
  var { state, name } = _ref;
  state.modifiersData[name] = computeOffsets({
    reference: state.rects.reference,
    element: state.rects.popper,
    strategy: "absolute",
    placement: state.placement
  });
}
var popperOffsets_default = {
  name: "popperOffsets",
  enabled: true,
  phase: "read",
  fn: popperOffsets,
  data: {}
};

// node_modules/@popperjs/core/lib/utils/getAltAxis.js
function getAltAxis(axis) {
  return axis === "x" ? "y" : "x";
}

// node_modules/@popperjs/core/lib/modifiers/preventOverflow.js
function preventOverflow(_ref) {
  var { state, options, name } = _ref;
  var _options$mainAxis = options.mainAxis, checkMainAxis = _options$mainAxis === undefined ? true : _options$mainAxis, _options$altAxis = options.altAxis, checkAltAxis = _options$altAxis === undefined ? false : _options$altAxis, boundary = options.boundary, rootBoundary = options.rootBoundary, altBoundary = options.altBoundary, padding = options.padding, _options$tether = options.tether, tether = _options$tether === undefined ? true : _options$tether, _options$tetherOffset = options.tetherOffset, tetherOffset = _options$tetherOffset === undefined ? 0 : _options$tetherOffset;
  var overflow = detectOverflow(state, {
    boundary,
    rootBoundary,
    padding,
    altBoundary
  });
  var basePlacement = getBasePlacement(state.placement);
  var variation = getVariation(state.placement);
  var isBasePlacement = !variation;
  var mainAxis = getMainAxisFromPlacement(basePlacement);
  var altAxis = getAltAxis(mainAxis);
  var popperOffsets2 = state.modifiersData.popperOffsets;
  var referenceRect = state.rects.reference;
  var popperRect = state.rects.popper;
  var tetherOffsetValue = typeof tetherOffset === "function" ? tetherOffset(Object.assign({}, state.rects, {
    placement: state.placement
  })) : tetherOffset;
  var normalizedTetherOffsetValue = typeof tetherOffsetValue === "number" ? {
    mainAxis: tetherOffsetValue,
    altAxis: tetherOffsetValue
  } : Object.assign({
    mainAxis: 0,
    altAxis: 0
  }, tetherOffsetValue);
  var offsetModifierState = state.modifiersData.offset ? state.modifiersData.offset[state.placement] : null;
  var data = {
    x: 0,
    y: 0
  };
  if (!popperOffsets2) {
    return;
  }
  if (checkMainAxis) {
    var _offsetModifierState$;
    var mainSide = mainAxis === "y" ? top : left;
    var altSide = mainAxis === "y" ? bottom : right;
    var len = mainAxis === "y" ? "height" : "width";
    var offset2 = popperOffsets2[mainAxis];
    var min2 = offset2 + overflow[mainSide];
    var max2 = offset2 - overflow[altSide];
    var additive = tether ? -popperRect[len] / 2 : 0;
    var minLen = variation === start ? referenceRect[len] : popperRect[len];
    var maxLen = variation === start ? -popperRect[len] : -referenceRect[len];
    var arrowElement = state.elements.arrow;
    var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
      width: 0,
      height: 0
    };
    var arrowPaddingObject = state.modifiersData["arrow#persistent"] ? state.modifiersData["arrow#persistent"].padding : getFreshSideObject();
    var arrowPaddingMin = arrowPaddingObject[mainSide];
    var arrowPaddingMax = arrowPaddingObject[altSide];
    var arrowLen = within(0, referenceRect[len], arrowRect[len]);
    var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis : minLen - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis;
    var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis : maxLen + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis;
    var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
    var clientOffset = arrowOffsetParent ? mainAxis === "y" ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
    var offsetModifierValue = (_offsetModifierState$ = offsetModifierState == null ? undefined : offsetModifierState[mainAxis]) != null ? _offsetModifierState$ : 0;
    var tetherMin = offset2 + minOffset - offsetModifierValue - clientOffset;
    var tetherMax = offset2 + maxOffset - offsetModifierValue;
    var preventedOffset = within(tether ? min(min2, tetherMin) : min2, offset2, tether ? max(max2, tetherMax) : max2);
    popperOffsets2[mainAxis] = preventedOffset;
    data[mainAxis] = preventedOffset - offset2;
  }
  if (checkAltAxis) {
    var _offsetModifierState$2;
    var _mainSide = mainAxis === "x" ? top : left;
    var _altSide = mainAxis === "x" ? bottom : right;
    var _offset = popperOffsets2[altAxis];
    var _len = altAxis === "y" ? "height" : "width";
    var _min = _offset + overflow[_mainSide];
    var _max = _offset - overflow[_altSide];
    var isOriginSide = [top, left].indexOf(basePlacement) !== -1;
    var _offsetModifierValue = (_offsetModifierState$2 = offsetModifierState == null ? undefined : offsetModifierState[altAxis]) != null ? _offsetModifierState$2 : 0;
    var _tetherMin = isOriginSide ? _min : _offset - referenceRect[_len] - popperRect[_len] - _offsetModifierValue + normalizedTetherOffsetValue.altAxis;
    var _tetherMax = isOriginSide ? _offset + referenceRect[_len] + popperRect[_len] - _offsetModifierValue - normalizedTetherOffsetValue.altAxis : _max;
    var _preventedOffset = tether && isOriginSide ? withinMaxClamp(_tetherMin, _offset, _tetherMax) : within(tether ? _tetherMin : _min, _offset, tether ? _tetherMax : _max);
    popperOffsets2[altAxis] = _preventedOffset;
    data[altAxis] = _preventedOffset - _offset;
  }
  state.modifiersData[name] = data;
}
var preventOverflow_default = {
  name: "preventOverflow",
  enabled: true,
  phase: "main",
  fn: preventOverflow,
  requiresIfExists: ["offset"]
};
// node_modules/@popperjs/core/lib/dom-utils/getHTMLElementScroll.js
function getHTMLElementScroll(element) {
  return {
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop
  };
}

// node_modules/@popperjs/core/lib/dom-utils/getNodeScroll.js
function getNodeScroll(node) {
  if (node === getWindow(node) || !isHTMLElement(node)) {
    return getWindowScroll(node);
  } else {
    return getHTMLElementScroll(node);
  }
}

// node_modules/@popperjs/core/lib/dom-utils/getCompositeRect.js
function isElementScaled(element) {
  var rect = element.getBoundingClientRect();
  var scaleX = round(rect.width) / element.offsetWidth || 1;
  var scaleY = round(rect.height) / element.offsetHeight || 1;
  return scaleX !== 1 || scaleY !== 1;
}
function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
  if (isFixed === undefined) {
    isFixed = false;
  }
  var isOffsetParentAnElement = isHTMLElement(offsetParent);
  var offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent);
  var documentElement = getDocumentElement(offsetParent);
  var rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled, isFixed);
  var scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  var offsets = {
    x: 0,
    y: 0
  };
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isScrollParent(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isHTMLElement(offsetParent)) {
      offsets = getBoundingClientRect(offsetParent, true);
      offsets.x += offsetParent.clientLeft;
      offsets.y += offsetParent.clientTop;
    } else if (documentElement) {
      offsets.x = getWindowScrollBarX(documentElement);
    }
  }
  return {
    x: rect.left + scroll.scrollLeft - offsets.x,
    y: rect.top + scroll.scrollTop - offsets.y,
    width: rect.width,
    height: rect.height
  };
}

// node_modules/@popperjs/core/lib/utils/orderModifiers.js
function order(modifiers) {
  var map = new Map;
  var visited = new Set;
  var result = [];
  modifiers.forEach(function(modifier) {
    map.set(modifier.name, modifier);
  });
  function sort(modifier) {
    visited.add(modifier.name);
    var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
    requires.forEach(function(dep) {
      if (!visited.has(dep)) {
        var depModifier = map.get(dep);
        if (depModifier) {
          sort(depModifier);
        }
      }
    });
    result.push(modifier);
  }
  modifiers.forEach(function(modifier) {
    if (!visited.has(modifier.name)) {
      sort(modifier);
    }
  });
  return result;
}
function orderModifiers(modifiers) {
  var orderedModifiers = order(modifiers);
  return modifierPhases.reduce(function(acc, phase) {
    return acc.concat(orderedModifiers.filter(function(modifier) {
      return modifier.phase === phase;
    }));
  }, []);
}

// node_modules/@popperjs/core/lib/utils/debounce.js
function debounce(fn2) {
  var pending;
  return function() {
    if (!pending) {
      pending = new Promise(function(resolve) {
        Promise.resolve().then(function() {
          pending = undefined;
          resolve(fn2());
        });
      });
    }
    return pending;
  };
}

// node_modules/@popperjs/core/lib/utils/mergeByName.js
function mergeByName(modifiers) {
  var merged = modifiers.reduce(function(merged2, current) {
    var existing = merged2[current.name];
    merged2[current.name] = existing ? Object.assign({}, existing, current, {
      options: Object.assign({}, existing.options, current.options),
      data: Object.assign({}, existing.data, current.data)
    }) : current;
    return merged2;
  }, {});
  return Object.keys(merged).map(function(key) {
    return merged[key];
  });
}

// node_modules/@popperjs/core/lib/createPopper.js
var DEFAULT_OPTIONS = {
  placement: "bottom",
  modifiers: [],
  strategy: "absolute"
};
function areValidElements() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0;_key < _len; _key++) {
    args[_key] = arguments[_key];
  }
  return !args.some(function(element) {
    return !(element && typeof element.getBoundingClientRect === "function");
  });
}
function popperGenerator(generatorOptions) {
  if (generatorOptions === undefined) {
    generatorOptions = {};
  }
  var _generatorOptions = generatorOptions, _generatorOptions$def = _generatorOptions.defaultModifiers, defaultModifiers = _generatorOptions$def === undefined ? [] : _generatorOptions$def, _generatorOptions$def2 = _generatorOptions.defaultOptions, defaultOptions = _generatorOptions$def2 === undefined ? DEFAULT_OPTIONS : _generatorOptions$def2;
  return function createPopper(reference2, popper2, options) {
    if (options === undefined) {
      options = defaultOptions;
    }
    var state = {
      placement: "bottom",
      orderedModifiers: [],
      options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions),
      modifiersData: {},
      elements: {
        reference: reference2,
        popper: popper2
      },
      attributes: {},
      styles: {}
    };
    var effectCleanupFns = [];
    var isDestroyed = false;
    var instance = {
      state,
      setOptions: function setOptions(setOptionsAction) {
        var options2 = typeof setOptionsAction === "function" ? setOptionsAction(state.options) : setOptionsAction;
        cleanupModifierEffects();
        state.options = Object.assign({}, defaultOptions, state.options, options2);
        state.scrollParents = {
          reference: isElement(reference2) ? listScrollParents(reference2) : reference2.contextElement ? listScrollParents(reference2.contextElement) : [],
          popper: listScrollParents(popper2)
        };
        var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers, state.options.modifiers)));
        state.orderedModifiers = orderedModifiers.filter(function(m) {
          return m.enabled;
        });
        runModifierEffects();
        return instance.update();
      },
      forceUpdate: function forceUpdate() {
        if (isDestroyed) {
          return;
        }
        var _state$elements = state.elements, reference3 = _state$elements.reference, popper3 = _state$elements.popper;
        if (!areValidElements(reference3, popper3)) {
          return;
        }
        state.rects = {
          reference: getCompositeRect(reference3, getOffsetParent(popper3), state.options.strategy === "fixed"),
          popper: getLayoutRect(popper3)
        };
        state.reset = false;
        state.placement = state.options.placement;
        state.orderedModifiers.forEach(function(modifier) {
          return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
        });
        for (var index = 0;index < state.orderedModifiers.length; index++) {
          if (state.reset === true) {
            state.reset = false;
            index = -1;
            continue;
          }
          var _state$orderedModifie = state.orderedModifiers[index], fn2 = _state$orderedModifie.fn, _state$orderedModifie2 = _state$orderedModifie.options, _options = _state$orderedModifie2 === undefined ? {} : _state$orderedModifie2, name = _state$orderedModifie.name;
          if (typeof fn2 === "function") {
            state = fn2({
              state,
              options: _options,
              name,
              instance
            }) || state;
          }
        }
      },
      update: debounce(function() {
        return new Promise(function(resolve) {
          instance.forceUpdate();
          resolve(state);
        });
      }),
      destroy: function destroy() {
        cleanupModifierEffects();
        isDestroyed = true;
      }
    };
    if (!areValidElements(reference2, popper2)) {
      return instance;
    }
    instance.setOptions(options).then(function(state2) {
      if (!isDestroyed && options.onFirstUpdate) {
        options.onFirstUpdate(state2);
      }
    });
    function runModifierEffects() {
      state.orderedModifiers.forEach(function(_ref) {
        var { name, options: _ref$options } = _ref, options2 = _ref$options === undefined ? {} : _ref$options, effect4 = _ref.effect;
        if (typeof effect4 === "function") {
          var cleanupFn = effect4({
            state,
            name,
            instance,
            options: options2
          });
          var noopFn = function noopFn() {};
          effectCleanupFns.push(cleanupFn || noopFn);
        }
      });
    }
    function cleanupModifierEffects() {
      effectCleanupFns.forEach(function(fn2) {
        return fn2();
      });
      effectCleanupFns = [];
    }
    return instance;
  };
}

// node_modules/@popperjs/core/lib/popper.js
var defaultModifiers = [eventListeners_default, popperOffsets_default, computeStyles_default, applyStyles_default, offset_default, flip_default, preventOverflow_default, arrow_default, hide_default];
var createPopper = /* @__PURE__ */ popperGenerator({
  defaultModifiers
});
// src/core/bootstrap.ts
var log = new Logger("aotified.bootstrap");
log.debug("initializing");
var $body = $("body");
var $header = $("#header");
var $nav = $("#nav");
var $centerContent = $("#centerContent");
var $footer = $(".footer");
var $footerButtons = $(".footerButtons");
var $overlay = $(".overlay");
log.debug("elements found: ", [$body, $header, $nav, $centerContent, $footer, $overlay]);
$header.changeTag("header");
$nav.changeTag("nav");
$(".clear, .adSpacer, noscript").remove();
$("header#header, nav#nav").wrapAll("<div class='pageTop'></div>");
$("body").each(function() {
  const $root = $(this);
  $root.addClass("aotified");
  $footer.add($footerButtons).wrapAll("<footer></footer>");
  $($centerContent).wrapAll("<main></main>");
});
Observer("body", function() {
  const $root = $(this);
  $root.children("br").remove();
}, { live: true });
Observer(".overlay", function() {
  const $inner = $(this).find("div.content div.inner");
  $inner.unpack();
}, { live: true });
var path = location.pathname;
(function pageContext() {
  const rules = [
    { regex: /album\/\d+-/, className: "album" },
    { regex: /artist\/\d+-/, className: "artist" },
    { regex: /user\/\d+-/, className: "user" }
  ];
  rules.forEach(({ regex, className }) => {
    if (regex.test(path)) {
      $("#centerContent").addClass(className);
      log.debug(`page context: ${className}`);
    }
  });
})();
$footer.children(".footerContent").replaceClass("*", "footer");
$footer.unpack();
Observer(".ratingText", function() {
  $(this).text(function(_, text) {
    return text.replace(" score", "");
  });
});
Observer("#albumOutput", function() {
  const $root = $(this);
  if ($root.children().length === 1 && $root.children(".adTagWide").length === 1) {
    $root.append("<div class='noResults'>No Releases</div>");
  }
}, { once: true });
Observer("#facets", function() {
  const $container = $(this);
  let $currentItem = null;
  $container.children().each(function() {
    const $el = $(this);
    if ($el.hasClass("facetItem"))
      return;
    if ($el.hasClass("center")) {
      $el.addClass("facetButton").removeClass("center");
      return;
    }
    if ($el.hasClass("facetTitle")) {
      $currentItem = $("<div class='facetItem'>");
      $el.before($currentItem);
      $currentItem.append($el);
      return;
    }
    if ($currentItem && $el.hasClass("facet")) {
      $currentItem.append($el);
    }
  });
}, { once: true });
$("#centerContent.album .fullWidth").replaceClass("*", "albumHeader");
$(".artistHeader, .albumHeader").each(function() {
  const $root = $(this);
  const $infoBox = $root.find(".artistTopBox.info, .albumTopBox.info");
  if ($infoBox.length) {
    const $detailBlock = $("<div class='detailsBlock'>");
    const $detailRow = $infoBox.children(".detailRow");
    $detailRow.wrapAll($detailBlock);
    const $tagBlock = $("<div class='tagBlock'>");
    $infoBox.find(".detailRow").filter(function() {
      return $(this).text().trim() === "Tags";
    }).remove();
    $infoBox.children(".tag").wrapAll($tagBlock);
  }
  if ($root.is(".artistHeader")) {
    $root.attr("id", "artist");
    const $headline = $root.children(".artistHeadline").replaceClass("*", "Hero_headline");
    const $imageBox = $root.children(".artistImage");
    const $topBox = $root.children(".artistTopBox").not(".info").addClass("ratings");
    const $infoBox2 = $root.children(".artistTopBox.info");
    const $artistCover = $("<div class='Hero__cover'>");
    const $artistDetails = $("<div class='Hero__details'>");
    const $artistBoxes = $("<div class='Hero__boxes'>");
    $imageBox.appendTo($artistCover);
    $artistBoxes.append($topBox, $infoBox2);
    $artistDetails.append($headline, $artistBoxes);
    $root.empty().append($artistCover, $artistDetails);
  } else if ($root.is(".albumHeader")) {
    $root.attr("id", "album");
    const $albumCover = $root.children(".albumTopBox.cover, .albumHeaderCover");
    const $albumBoxInfo = $root.children(".albumTopBox.info");
    const $albumBoxRating = $albumCover.next(".albumTopBox").addClass("ratings");
    const $albumHeadline = $root.children(".albumHeadline").replaceClass("*", "Hero__headline");
    const $albumDetails = $("<div class='Hero__details'>");
    const $albumBoxes = $("<div class='Hero__boxes'>");
    const $selectRow = $root.children(".selectRow");
    const $wideLeft = $root.parent().find(".wideLeft");
    const $linksSection = $("<div class='section' id='links'></div>");
    $wideLeft.children(".thirdPartyLinks").prependTo($linksSection);
    $linksSection.prepend($selectRow);
    $linksSection.prependTo($wideLeft);
    $albumBoxes.append($albumBoxRating, $albumBoxInfo);
    $albumCover.wrap("<div class='Hero__cover'>");
    $albumDetails.append($albumHeadline, $albumBoxes);
    $root.append($albumDetails);
  }
  $root.find("br").remove();
  $root.replaceClass("*", "Hero");
});
$("div:has(> .selectRow ~ .headline ~ .filterRow), div:has(> .selectRow ~ .filterRow)").each(function() {
  const $root = $(this);
  const $selectRow = $root.children(".selectRow");
  const $filterRow = $root.children(".filterRow");
  const $headline = $root.children(".headline");
  const $wrapper = $('<div class="controlsGroup"></div>');
  if ($headline.length) {
    $headline.after($wrapper);
    $wrapper.append($selectRow, $filterRow);
  } else {
    $selectRow.add($filterRow).wrapAll($wrapper);
  }
});
$(".albumButton").contents().filter(function() {
  return this.nodeType === 3 && this.textContent.trim();
}).wrap("<span></span>");
Observer(".yourRatingContainer .content", function() {
  const $root = $(this);
  const $ratingTextBoxContainer = $root.children(`.ratingTextBoxContainer`);
  const $albumActions = $root.children(".albumActions");
  $albumActions.add($ratingTextBoxContainer).wrapAll("<div class='userArea'></div>");
  $ratingTextBoxContainer.children("#ratingContainer").unpack();
  $ratingTextBoxContainer.unpack();
  $root.unpack();
}, { live: true });
Observer(".yourRatingContainer", function() {
  const $root = $(this);
  const $userArea = $root.children(".userArea");
  const $currentRatingBlock = $userArea.children("#currentRatingBlock");
  const $ratingBlock = $userArea.children("#ratingBlock");
  const $userRating = $("<div class='userRating'></div>");
  $userRating.append($currentRatingBlock, $ratingBlock);
  $userArea.prepend($userRating);
  if ($currentRatingBlock.length) {
    $ratingBlock.hide();
  }
});
$(".notificationRow").each(function() {
  const $row = $(this);
  let $block = $(".aotified-group.vertical");
  if (!$block.length) {
    $block = $("<div class='aotified-group vertical'></div>");
    $block.appendTo($row.parent());
  }
  $row.appendTo($block);
});
$(".logRow").each(function() {
  const $rows = $(".logRow");
  if (!$rows.length)
    return;
  let $block = $(".aotified-group.vertical");
  if (!$block.length) {
    $block = $("<div class='aotified-group vertical'></div>");
    $block.insertBefore($rows.first());
  }
  $rows.appendTo($block);
});
$(".thisDay").each(function() {
  const $row = $(this);
  let $block = $(".aotified-group");
  if (!$block.length) {
    $block = $("<div class='aotified-group'></div>");
    $block.appendTo($row.parent());
  }
  $row.appendTo($block);
});
$(".userBlock").each(function() {
  const $row = $(this);
  let $block = $(".aotified-group#users");
  if (!$block.length) {
    $block = $("<div class='aotified-group grid grid-5x2 gap-10' id='users'></div>");
    $block.appendTo($row.parent());
  }
  $row.appendTo($block);
});
$(".fullWidth").removeAttr("style");
$(".fullWidth").has(".profileAccount, .profileNav.small").replaceClass("*", "userNav");
$(".left").has(".fullWidth.bottomSquare").replaceClass("*", "aotified-panels");
$(".flexContainer").has(".fullWidth.bestHome, .fullWidth.anticipatedHome").replaceClass("*", "aotified-panels aotified-collections");
$(".aotified-collections .fullWidth").each(function() {
  const $root = $(this);
  if ($root.is(".anticipatedHome")) {
    $root.replaceClass("*", "aotified-panel").attr("id", "anticipated");
    $root.children(".albumBlock").wrapAll("<div class='releaseBlock'></div>");
  } else if ($root.is(".bestHome")) {
    $root.replaceClass("*", "aotified-panel").attr("id", "best");
    $root.children(".listItemSmall").replaceClass("*", "item").wrapAll("<div class='itemList small'></div>");
  }
  $root.addClass("aotified-panel");
});
$(".sectionHeading").each(function() {
  $(this).contents().filter(function() {
    return this.nodeType === 1 && /^(I|H1|H2|A)$/i.test(this.tagName) || this.nodeType === 3 && this.nodeValue.trim() !== "";
  }).wrapAll("<hgroup></hgroup>");
});
Observer(".sorttracklist", function() {
  $(this).remove();
}, { live: true });
Observer(".section", function() {
  const $section = $(this);
  $section.find(".menuDropFloatRight").each(function() {
    const $menu = $(this);
    const $headings = $section.children(".sectionHeading");
    const $headingsAbove = $headings.filter(function() {
      return this.compareDocumentPosition($menu[0]) & Node.DOCUMENT_POSITION_FOLLOWING;
    });
    if (!$headingsAbove.length)
      return;
    const $menuClone = $menu.clone(true, true);
    log.debug($menuClone);
    $headingsAbove.last().append($menuClone);
    $menu.hide();
    log.debug($menu);
  });
});
$("a").has(".donorBanner").unpack();
$(".rightBox.donorBanner").on("click", function() {
  window.location.href = "/subscribe/";
});
$("#sortDrop li").each(function() {
  const $li = $(this);
  if ($li.find("button.criticSort").length === 0) {
    const text = $li.text().trim();
    const $btn = $(`<button class='criticSort' year='2026' albumid='1537608' sort='highest'>${text}</button>`, {
      disabled: $li.hasClass("current")
    });
    $li.empty().append($btn);
  }
});
Observer("#accountLinks", function() {});
$(".sectionButton").wrapAll("<div class='aotified-group center'></div>");
$(".newsBlockLarge").wrapAll("<div class='aotified-group grid grid-3x2'></div>");
$(".bottomSquare").each(function() {
  $(this).children(".listItem").replaceClass("*", "aotified-list-item").wrapAll("<div class='aotified-list'></div>");
});
$(".popularHome .userReviewBlock").wrapAll("<div class='aotified-group no-wrap'></div>");
$(".userReviewBlock").each(function() {
  const $root = $(this);
  $root.addClass("aotified-review container");
  $root.attr("id", "user");
  const $cover = $root.children(".cover");
  const $title = $root.find("a:has(.artistTitle)");
  const $reviewHeader = $("<div class='aotified-review header'></div>");
  $reviewHeader.append($cover, $title);
  const $userName = $root.children(".userName");
  $userName.replaceClass("*", "aotified-label username small");
  const $profilePic = $root.children(".profilePic");
  $profilePic.replaceClass("*", "aotified-image pfp small");
  const $ratingBlock = $root.children(".ratingBlock");
  $ratingBlock.replaceClass("*", "aotified-rating box small");
  const $userHeader = $("<div class='aotified-review header user'></div>");
  $userHeader.append($profilePic, $userName, $ratingBlock);
  $root.prepend($reviewHeader, $userHeader);
  const $reviewText = $root.children(".reviewText");
  $reviewText.replaceClass("*", "aotified-review text small");
  const $actionBlock = $reviewText.next("div");
  $actionBlock.addClass("aotified-review actions box").removeAttr("style");
  $actionBlock.children(".actionContainer").each(function() {
    $(this).replaceClass("*", "aotified-review actions item");
  });
  $actionBlock.add($reviewText).wrapAll("<div class='aotified-review body'></div>");
  $root.removeClass("userReviewBlock");
});
Observer(".aotified-search-panel", function() {
  const $root = $(this);
  const $searchForm = $root.find(".searchForm");
  $searchForm.removeClass("halfWidth large");
  const $results = $root.children("#albumResults");
  $results.addClass("releaseContainer small");
  $results.appendTo($root);
  const $div = $searchForm.children("div:last");
  const $sectionHeading = $("<div class='sectionHeading'></div>");
  const $label = $searchForm.children("label");
  $label.changeTag("h2").text("Search (Apple Music)").appendTo($sectionHeading);
  $sectionHeading.prependTo($root);
  $div.unpack();
  $root.append($searchForm);
});
var $activeMenu = null;
var activePopper = null;
function closeMenu() {
  if (!$activeMenu)
    return;
  $activeMenu.removeClass("active");
  if (activePopper) {
    activePopper.destroy();
    activePopper = null;
  }
  $activeMenu = null;
}
$(".dotDropMenuContainer, .menuDropSelected").each(function() {
  const $root = $(this);
  if ($root.data("aotified"))
    return;
  $root.data("aotified", true);
  const isSortMenu = $root.hasClass("menuDropSelected");
  $root.on("click mouseenter mouseleave", function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  });
  const $btn = isSortMenu ? $root.children(".menuDropSelectedText") : $root.children(".dotDropMenuButton > button, .dotDropMenuButton, button").first();
  const $menu = $root.find(".dotDropDown, ul").first();
  if (isSortMenu)
    $menu.addClass("dotDropDown");
  $menu.children().each(function() {
    const $row = $(this);
    if ($row.hasClass("row")) {
      $row.changeTag("li");
      $row.removeAttr("class");
    }
  });
  if (!$btn.length || !$menu.length)
    return;
  $btn.on("click", function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if ($activeMenu && $activeMenu[0] === $menu[0]) {
      closeMenu();
      return;
    }
    closeMenu();
    $menu.addClass("active");
    activePopper = createPopper($btn[0], $menu[0], {
      placement: "bottom-end",
      modifiers: [
        { name: "offset", options: { offset: [0, 6] } },
        { name: "flip", options: { fallbackPlacements: ["top-end"] } },
        { name: "preventOverflow", options: { padding: 8 } }
      ]
    });
    $activeMenu = $menu;
  });
  $menu.on("click", (e) => e.stopPropagation());
});
$(document).on("click", closeMenu);
$(document).on("keydown", (e) => {
  if (e.key === "Escape")
    closeMenu();
});
Observer(".viewAll", function() {
  const $root = $(this);
  const $a = $root.children("a");
  if ($a.text().startsWith("Add")) {
    $a.empty().append($("<i class='fas fa-plus'></i>"));
    $root.unpack();
  }
});
$("#centerContent.artist").each(function() {
  const $fullWidth = $(".fullWidth").first();
  const $header2 = $fullWidth.children(".Hero");
  if (!$fullWidth.length || !$header2.length)
    return;
  if ($fullWidth.children(".artistContent").length)
    return;
  const $artistContent = $("<div>", { class: "artistContent" });
  let $node = $header2.next();
  while ($node.length) {
    const $next = $node.next();
    $artistContent.append($node);
    $node = $next;
  }
  $fullWidth.append($artistContent);
});
Observer("#albumOutput", function() {
  const $root = $(this);
  let $section = null;
  let $header2 = null;
  let $block = null;
  $root.children().each(function() {
    const $el = $(this);
    if ($el.hasClass("subHeadline")) {
      $section = $("<div>", { class: "releaseContainer" });
      $header2 = $("<div>", { class: "releaseHeader" });
      $block = $("<div>", { class: "releaseBlock" });
      $section.insertBefore($el);
      $section.append($header2, $block);
      $header2.append($el);
      return;
    }
    if (!$section || !$header2 || !$block)
      return;
    if ($el.hasClass("listenRow")) {
      $header2.append($el);
      return;
    }
    if ($el.hasClass("albumBlock")) {
      $el.addClass("slim");
      $block.append($el);
    }
  });
}, { once: true });
Observer("#facetContent #toggleSearch", function() {
  const $filterRow = $(".artistContent > .filterRow.buttons");
  const $toggleSearch = $("#facetContent > #toggleSearch");
  if (!$filterRow.length || !$toggleSearch.length)
    return;
  $toggleSearch.after($filterRow);
}, { once: true });
$(".artist .fullWidth").each(function() {
  const $root = $(this);
  const $mediaList = $root.find(".section.mediaList");
  const $relatedArtists = $root.find(".section.relatedArtists");
  const $footer2 = $("<div>", { class: "aotified-panels" });
  if ($mediaList.length)
    $footer2.append($mediaList);
  if ($relatedArtists.length)
    $footer2.append($relatedArtists);
  $root.append($footer2);
});
$(".relatedArtists").each(function() {
  const $root = $(this);
  const $artistBlocks = $root.find(".artistBlock");
  if (!$artistBlocks.length)
    return;
  const $group = $("<div class='aotified-group grid grid-5x2'>");
  $artistBlocks.each(function() {
    $group.append(this);
  });
  $root.append($group);
});
Observer(".anticipatedHome, .mobileScroll, #homeNewReleases, .section .mobileScroll", function() {
  const $root = $(this);
  const count = $root.find(".albumBlock").length;
  if (!count) {
    $root.remove();
    return;
  }
  $root.addClass("releaseBlock").addClass(`count-${count}`);
});
Observer(".wideLeft", function() {
  const $root = $(this);
  $root.removeAttr("style");
  if ($root.children(".releaseBlock").length)
    return;
  requestAnimationFrame(() => {
    const $albums = $root.children(".albumBlock");
    if (!$albums.length)
      return;
    if ($root.find(".sectionHeading").length)
      return;
    $("<div>", { class: "releaseBlock large" }).insertBefore($albums.first()).append($albums);
  });
});
Observer("#homeNewReleases .albumBlock, #albumOutput .albumBlock", function() {
  $(this).addClass("slim");
});
Observer(".ratingRow", function() {
  if ($(this).children(".ratingTextWrapper").length)
    return;
  const $texts = $(this).children(".ratingText");
  if ($texts.length < 2)
    return;
  $("<div/>", { class: "ratingTextWrapper" }).append($texts).appendTo(this);
});
Observer("section", function() {
  if ($(this).find('.sectionHeading h2 a[href="/recently-added/"]').length) {
    $(this).attr("id", "recentlyAdded");
  }
});
Observer(".albumCriticScoreBox, .albumUserScoreBox, .artistUserScoreBox, .artistCriticScoreBox", function() {
  const $box = $(this);
  if ($box.children(".ratingValue").length)
    return;
  const $ratingDetails = $("<div class='ratingDetails'>");
  const $ratingValue = $("<div class='ratingValue'>");
  $ratingDetails.prepend($box.children(".text"));
  $box.prepend($ratingDetails);
  $box.prepend($ratingValue);
  $ratingValue.append($box.children(".heading"));
  $box.find(`[itemprop="aggregateRating"]`).unpack();
  const $ratingItem = $box.children(".albumCriticScore, .albumUserScore, .artistUserScore, .artistCriticScore");
  $ratingItem.addClass("ratingItem").removeAttr("style").removeClass("albumCriticScore albumUserScore artistUserScore artistCriticScore");
  let score = "NR";
  const $rv = $ratingItem.find('[itemprop="ratingValue"]');
  const $rawScore = $rv.find(`a[href="#users"]`);
  if ($rawScore.length) {
    score = String($rawScore.attr("title"));
  } else {
    if ($rv.length) {
      score = $rv.text().trim();
    } else {
      const raw = $ratingItem.text().trim();
      if (!isNaN(Number(raw)))
        score = raw;
    }
  }
  log.debug(score);
  $rv.remove();
  $box.find("meta, #moreStatsLink").remove();
  $ratingItem.children("a[href='#users'], a[href='#critics']").remove();
  $ratingItem.contents().filter((_, node) => node.nodeType === Node.TEXT_NODE).remove();
  const $score = $("<div>", { id: "score", text: score });
  const $bar = $box.children(".ratingBar");
  $ratingItem.prepend($score);
  $ratingItem.append($bar);
  $ratingValue.append($ratingItem);
  $box.find(".text").each(function() {
    const $text = $(this);
    function findNode(predicate) {
      return $text.contents().filter(function() {
        return this.nodeType === 3 && this.nodeValue && predicate(this);
      });
    }
    if ($text.hasClass("gray") && $box.hasClass("albumUserScoreBox")) {
      $text.replaceClass("gray", "rows");
      const firstText = findNode((node) => node.nodeValue.trim()).first();
      const firstStrong = $text.children("strong").first();
      if (firstText.length && firstStrong.length) {
        firstText.add(firstStrong).wrapAll("<span></span>");
      }
      const $inner = $text.children("span[style]");
      $inner.removeAttr("style");
    }
    $ratingDetails.append($text);
  });
}, { live: true });
$(".ratingDetails .text").each(function() {
  const $textDiv = $(this);
  let html = $textDiv.html().replace(/\u00A0/g, " ");
  const match = html.match(/^(Based on)\s*(.*)$/);
  if (match) {
    const part1 = match[1];
    const part2 = match[2];
    $textDiv.addClass("numReviews");
    $textDiv.html(`<span>${part1}</span> <b>${part2}</b>`);
  }
});
$(".numReviews").each(function() {
  const $textDiv = $(this);
  const $parent = $textDiv.parent();
  $parent.prepend($textDiv);
});
Observer(".facetContent", function() {
  const $root = $(this);
  const $albums = $root.children(".albumBlock");
  if ($albums.length) {
    let $albumOutput = $root.children("#albumOutput");
    if (!$albumOutput.length) {
      $albumOutput = $("<div id='albumOutput'></div>");
      $albums.first().before($albumOutput);
    }
    $albums.appendTo($albumOutput);
  }
}, { live: true });
Observer("#facetContent:has(> .subHeadline)", function() {
  const $root = $(this);
  const $releaseContainer = $("<div class='releaseContainer'></div>");
  const $releaseBlock = $root.children("#albumOutput").addClass("aotified-releases").removeAttr("id");
  const $releaseHeaderItems = $root.children(".subHeadline, .listenRow.artist");
  if ($releaseHeaderItems.length) {
    $releaseHeaderItems.wrapAll("<div class='releaseHeader'></div>");
  }
  const $releaseHeader = $root.children(".releaseHeader");
  if ($releaseBlock.length || $releaseHeader.length) {
    $releaseContainer.append($releaseHeader, $releaseBlock);
    $root.append($releaseContainer);
  }
  $releaseContainer.wrap("<div id='albumOutput'></div>");
});
Observer(".artistFooter", function() {
  const $footer2 = $(this);
  let hasLiveSection = false;
  $footer2.children(".section").each(function() {
    const $section = $(this);
    if ($section.hasClass("relatedArtists")) {
      if ($section.find(".artistBlock").length)
        hasLiveSection = true;
      return;
    }
    if (!$section.find(".noDisplay").length) {
      hasLiveSection = true;
    }
  });
  if (!hasLiveSection) {
    $footer2.remove();
  }
});
$(".albumTitle > a").each(function() {
  const $a = $(this);
  const text = $a.text().replace(/\s+/g, " ").trim();
  if (!text)
    return;
  const match = text.match(/^(.+?)\s+[–—-]\s+(.+)$/);
  if (!match)
    return;
  const artist = match[1].trim();
  const title = match[2].trim();
  if (!artist || !title)
    return;
  $a.empty().append($("<span>", { class: "aotified-label artist", text: artist }), $("<span>", { class: "aotified-label title", text: title }));
});
$(".rightBox").has(".nextAlbumReview, .prevAlbumReview").each(function() {
  const $nav2 = $("<nav class='aotified-review nav'>");
  $(this).children("a").wrapAll($nav2);
  const $prev = $(".prevAlbumReview");
  $prev.replaceClass("*", "aotified-review nav item prev");
  const $next = $(".nextAlbumReview");
  $next.replaceClass("*", "aotified-review nav item next");
});
Hook("/album/corrections.php", function() {
  $("#correctionPage").unpack();
  $("#centerContent").addClass("correction");
  $(".section .section:not(#credits)").replaceClass("*", "aotified-panel");
  const $hero = $(".Hero");
  const $sectionInfo = $(".section:first");
  const $infoBox = $sectionInfo.children(".grayBox").replaceClass("*", "albumTopBox info slim").removeAttr("style");
  $infoBox.appendTo($hero.find(".Hero__boxes"));
  $sectionInfo.remove();
});
Hook("/notifications/", function() {
  $(".headline").filter(function() {
    return $(this).text().trim() === "Recent Notifications";
  }).text("Inbox");
});
Hook("/album/add-cover.php", function() {
  const $root = $("#centerContent");
  const $fullWidth = $root.children(".fullWidth");
  const $hero = $root.find("#album.Hero");
  const $title = $root.find("h1.headline");
  const $note = $title.next("div");
  const $searchBlock = $root.find(".searchForm");
  const $results = $root.find("#albumResults");
  const $uploadBox = $root.find(".addCoverBox");
  const $header2 = $('<div class="aotified-cover-header"></div>').append($hero);
  const $body2 = $('<div class="aotified-cover-body"></div>');
  const $heading = $('<div class="aotified-heading"></div>').append($title).append($note);
  const $grid = $('<div class="aotified-panels"></div>');
  const $searchPanel = $('<div class="aotified-panel aotified-search-panel"></div>').append($searchBlock).append($results);
  const $uploadPanel = $('<div class="aotified-panel aotified-upload-panel"></div>').append($uploadBox);
  $grid.append($searchPanel).append($uploadPanel);
  $body2.append($heading).append($grid);
  $fullWidth.append($body2).addClass("aotified-cover-card");
  $root.prepend($header2);
});
Hook("/user/*/album/*/", function() {
  const $wideLeft = $(".wideLeft");
  const $dotDropMenuContainer = $wideLeft.children(".dotDropMenuContainer");
  const $albumHeadline = $wideLeft.children(".albumHeadline");
  $albumHeadline.replaceClass("*", "aotified-review title");
  const $albumTitleA = $albumHeadline.find(".albumTitle a");
  const albumLink = $albumTitleA.attr("href");
  $albumTitleA.unpack();
  $albumHeadline.on("click", function() {
    window.location.href = albumLink ?? "";
  });
  $albumHeadline.children(".albumTitle").unpack();
  const $listenOn = $wideLeft.children(".listenOn");
  $listenOn.hide();
  const $reviewProfile = $wideLeft.children(".userReviewHeader").replaceClass("*", "aotified-review header user");
  $reviewProfile.children(".content").unpack();
  const $userReviewByline = $reviewProfile.children(".userReviewByline");
  $userReviewByline.unpack();
  const $profilePic = $reviewProfile.find(".image");
  const $profilePicA = $profilePic.children("a");
  const profileURL = $profilePicA.attr("href") ?? "";
  $profilePicA.unpack();
  $profilePic.replaceClass("*", "aotified-image pfp medium").prependTo($reviewProfile).on("click", function() {
    window.location.href = profileURL;
    return;
  });
  const $userName = $reviewProfile.children(".userName");
  $userName.replaceClass("*", "aotified-label username");
  const $reviewDate = $reviewProfile.children(".reviewDate");
  $reviewDate.replaceClass("*", "aotified-label date");
  const $userReviewScoreBox = $reviewProfile.children(".userReviewScoreBox");
  $userReviewScoreBox.replaceClass("*", "aotified-rating box large").children(".albumCriticScore").unpack();
  const $cover = $reviewProfile.children(".cover");
  const $reviewDetails = $("<div class='aotified-review details'></div>");
  $userName.add($reviewDate).wrapAll($reviewDetails);
  $reviewDetails.append($cover);
  const $reviewBody = $reviewProfile.next("div");
  $reviewBody.removeAttr("style").addClass("aotified-review body");
  const $reviewText = $reviewBody.children(".userReviewText");
  $reviewText.replaceClass("*", "aotified-review text").removeAttr("itemprop");
  const $reviewActions = $reviewBody.children(".albumReviewLinks");
  $reviewActions.replaceClass("*", "aotified-review actions box");
  $reviewActions.children(".review_like, .review_likes_container").wrapAll("<div class='aotified-review actions item'></div>");
  $reviewActions.children(".flag").replaceClass("*", "aotified-review actions item");
  const $sectionRelated = $(".section:has(.relatedRow)");
  $sectionRelated.remove();
  const $sectionComments = $(".section").has(".commentRow");
  $sectionComments.replaceClass("*", "aotified-section");
  $sectionComments.attr("id", "comments");
  const $sectionTracklist = $(".section").has(".trackListTable");
  $sectionTracklist.replaceClass("*", "aotified-section sub");
  const $sectionAlbums = $("<div class='aotified-section sub'></div>");
  $wideLeft.children(".albumBlock").wrapAll("<div class='aotified-releases small'></div>");
  const $releases = $wideLeft.children(".aotified-releases");
  const $sectionHeadingAlbums = $releases.prev(".sectionHeading");
  $sectionAlbums.append($sectionHeadingAlbums, $releases);
  $wideLeft.append($sectionAlbums);
  const $container = $("<div class='aotified-review container'></div>");
  const $reviewHeader = $("<div class='aotified-review header'></div>");
  $reviewHeader.append($cover, $albumHeadline, $dotDropMenuContainer);
  $container.append($wideLeft.contents());
  const $review = $("<div class='aotified-review large'></div>");
  $review.append($reviewHeader, $container);
  $wideLeft.append($sectionComments).prepend($review);
});
log.debug("initialized");

// src/core/settings.ts
class Settings {
  schema = {};
  key = "__userscript_settings__";
  cache;
  constructor(modules) {
    this.cache = this.load();
    for (const mod of modules) {
      if (!this.cache[mod.name]) {
        this.cache[mod.name] = {};
      }
      const moduleCache = this.cache[mod.name];
      for (const feature of mod.features) {
        if (!(feature.name in moduleCache)) {
          moduleCache[feature.name] = feature.default ?? false;
        }
      }
    }
    this.save();
  }
  load() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || "{}");
    } catch {
      return {};
    }
  }
  save() {
    localStorage.setItem(this.key, JSON.stringify(this.cache));
  }
  isEnabled(module, feature) {
    return !!this.cache[module]?.[feature];
  }
  setEnabled(module, feature, value) {
    this.cache[module] ??= {};
    this.cache[module][feature] = value;
    this.save();
  }
  toggle(module, feature) {
    this.setEnabled(module, feature, !this.isEnabled(module, feature));
  }
  getModule(module) {
    return this.cache[module] ?? {};
  }
}

// src/core/composer.ts
class Feature {
  name;
  description;
  default = false;
  hidden = false;
  requires;
  cleanup;
  run;
  toggle;
  module;
  constructor(options) {
    if (options)
      Object.assign(this, options);
    const proto = Object.getPrototypeOf(this);
    for (const key of Object.getOwnPropertyNames(proto)) {
      const val = this[key];
      if (typeof val === "function" && key !== "constructor") {
        this[key] = val.bind(this);
      }
    }
  }
  shouldRun() {
    if (this.toggle)
      return this.toggle();
    return this.default;
  }
}

class Module {
  name;
  description;
  features = [];
  shared = {};
  settings;
  constructor(options, sharedInit) {
    this.name = options.name;
    this.description = options.description;
    if (sharedInit)
      sharedInit(this.shared);
  }
  loadFeatures(features) {
    this.features.push(...features);
    for (const feature of features) {
      feature.module = this;
      feature.shared = this.shared;
    }
  }
}

class Composer {
  modules;
  settings;
  constructor(modules) {
    this.modules = modules;
    this.settings = new Settings(modules);
    for (const module of this.modules) {
      module.settings = this.settings;
    }
  }
  start() {
    for (const module of this.modules) {
      this.startModule(module);
    }
  }
  startModule(module) {
    const logger = new Logger(`Module:${module.name}`);
    for (const feature of module.features) {
      if (!feature.shouldRun?.()) {
        logger.log(`feature "${feature.name}" skipped by toggle/default`);
        continue;
      }
      try {
        const ctx = {
          module,
          feature,
          settings: this.settings,
          logger: new Logger(`aotified.${module.name}/${feature.name}`)
        };
        const cleanup = feature.run(ctx);
        if (typeof cleanup === "function")
          feature.cleanup = cleanup;
      } catch (err) {
        logger.error(`failed to start feature "${feature.name}"`, err);
      }
    }
  }
  disableFeature(moduleName, featureName) {
    const module = this.modules.find((m) => m.name === moduleName);
    const feature = module?.features.find((f) => f.name === featureName);
    if (!feature)
      return;
    feature.cleanup?.();
    feature.cleanup = undefined;
    this.settings.setEnabled(moduleName, featureName, false);
  }
  enableFeature(moduleName, featureName) {
    this.settings.setEnabled(moduleName, featureName, true);
    this.start();
  }
}

// src/utils/utils.ts
function parseDate(text) {
  text = text.trim();
  if (text === "TBA")
    return 0;
  const date = Date.parse(text + " 2025");
  return isNaN(date) ? 0 : date;
}
function getYTID(url) {
  const regExp = /(?:youtube\.com\/(?:.*v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

// src/utils/sort.ts
function sort(type, $root) {
  const $items = $root.children(".albumBlock");
  const getValue = (el) => {
    const $el = $(el);
    switch (type) {
      case "comments":
        return parseInt($el.find(".comment_count").first().text().replace(/,/g, ""), 10) || 0;
      case "saved":
        return parseInt($el.find(".comment_count").last().text().replace(/,/g, ""), 10) || 0;
      case "date":
      default:
        return parseDate($el.find(".type").text());
    }
  };
  const sorted = $items.get().sort((a, b) => getValue(b) - getValue(a));
  $root.append(sorted);
}

// src/modules/global.ts
var Global = () => {
  const module = new Module({
    name: "Globals",
    description: "Global website features such as seasonal elements."
  });
  module.loadFeatures([
    new Feature({
      name: "Aotified",
      description: "root code",
      default: true,
      hidden: true,
      run: (ctx) => {
        ctx.logger.log(`aotified initializing`);
        $("body > span, body").each(function() {
          const $root = $(this);
          if ($root.prop("tagName") === "SPAN")
            $root.unpack();
        });
        Observer(".ratingText", function() {
          $(this).text(function(_, text) {
            return text.replace(" score", "");
          });
        });
        Observer(".overlay", function() {
          $(this).prependTo("body");
        });
        Observer(".overlay > .content", function() {
          const $content = $(this);
          let $header2 = $content.children("header");
          if (!$header2.length) {
            $header2 = $("<header></header>");
            $content.prepend($header2);
          }
          const $headerElements = $content.find(".close, .subHeadline, .heading");
          $headerElements.each(function() {
            $(this).appendTo($header2);
          });
          const $section = $content.children("section");
          if (!$section.length) {
            $content.children().not("header").wrapAll("<section></section>");
            $content.find(".center").unpack();
          }
          $content.removeAttr("style");
          $content.find("br, .clear").remove();
          ctx.logger.info($content);
        }, { once: false });
        Observer(".ratingRowContainer", function() {
          const $root = $(this);
          if ($root.find(".icon").length) {
            $root.addClass("user");
            const $ratingRow = $(this).find(".ratingRow");
            $ratingRow.find("span:has(> .deleteRatingBlock)").remove();
            const $message = $root.children("div[id^='message']");
            if ($message) {
              $message.unpack();
              $root.find("div[id^='deleteRating']").unpack();
              $root.find("div[id^='insertRating']").remove();
            }
            const $ratingIcons = $("<div class='ratingIcons'>");
            $ratingRow.find("a:has(.icon)").appendTo($ratingIcons);
            $root.append($ratingIcons);
          }
        });
      }
    }),
    new Feature({
      name: "More Sorts",
      description: "More sorting. Self-explanatory.",
      default: true,
      run: (ctx) => {
        ctx.logger.log(`enabled`);
        Observer(".anticipatedHome", function() {
          const $root = $(this);
          if ($root.find(".filterRow").length)
            return;
          const $sort = $(`
            <div class="filterRow">
              <div class="menuDropFloatRight albumSort">
                <div class="menuDropText">Sort</div>
                <ul class="menuDrop">
                  <li id="sort" class="menuDropSelected">
                    <div class="menuDropSelectedText">Release date</div>
                    <ul>
                      <li class="current" data-sort="date">Release date</li>
                      <li data-sort="comments">Comments</li>
                      <li data-sort="saved">Saved</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          `);
          $sort.on("click", "li[data-sort]", function(e) {
            e.preventDefault();
            const $item = $(this);
            const type = $item.data("sort");
            $sort.find("li[data-sort]").removeClass("current");
            $item.addClass("current");
            $sort.find(".menuDropSelectedText").text($item.text());
            requestAnimationFrame(() => {
              $(".releaseBlock").each(function() {
                sort(type, $(this));
              });
            });
          });
          $sort.insertAfter($root.find(".sectionHeading"));
        }, { once: true });
      }
    }),
    new Feature({
      name: "Wrap Ratings",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx) => {
        ctx.logger.log(`enabled`);
        return Observer(".artistCriticScoreBox, .artistUserScoreBox, .albumCriticScoreBox, .albumUserScoreBox", function() {
          const $root = $(this);
          let $ratingItem = $root.children(".ratingItem");
          const $score = $root.children(".artistCriticScore").first().length ? $root.children(".artistCriticScore") : $root.children(".artistUserScore");
          const $ratingBar = $root.children(".ratingBar");
          const $text = $root.children(".text");
          if (!$score.length || !$ratingBar.length || !$text.length)
            return;
          if (!$ratingItem.length) {
            $ratingItem = $("<div>", { class: "ratingItem" });
            $score.before($ratingItem);
            $ratingItem.append($score, $ratingBar);
          }
          if (!$ratingItem.closest(".ratingValue").length) {
            const $ratingValue = $("<div>", { class: "ratingValue" });
            $ratingItem.before($ratingValue);
            $ratingValue.append($ratingItem, $text);
          }
        });
      }
    }),
    new Feature({
      name: "Colorize Ratings",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx) => {
        ctx.logger.log(`enabled`);
        return Observer(".ratingBlock, .ratingItem", function() {
          const $el = $(this);
          const $bar = $el.find(".ratingBar");
          if (!$bar.length)
            return;
          $el.removeClass("green yellow red");
          if ($bar.hasClass("green"))
            $el.addClass("green");
          else if ($bar.hasClass("yellow"))
            $el.addClass("yellow");
          else if ($bar.hasClass("red"))
            $el.addClass("red");
        });
      }
    }),
    new Feature({
      name: "Show Logo",
      description: "Show [aotified] logo near AOTY logo.",
      default: true,
      run: (ctx) => {
        ctx.logger.log(`enabled`);
        $(`body`).addClass("aotified");
        $(".logoHead").append($("<div>", {
          id: "GOT_AOTIFIED",
          text: "[aotified]",
          css: {
            color: "gray",
            marginLeft: "5px"
          }
        }));
      }
    }),
    new Feature({
      name: "Ambience",
      description: "Ambience appearance.",
      default: true,
      run: () => {
        const $artwork = $(".albumTopBox.cover img, .artistImage img");
        if (!$artwork.length)
          return;
        const $bg = $artwork.clone();
        const src = $bg.attr("src");
        if (src) {
          $bg.attr("src", src.replace("https://cdn2.albumoftheyear.org/", "https://cdn.albumoftheyear.org/").replace(/\/\d+x0/, ""));
        }
        $bg.removeAttr("srcset");
        $bg.on("error", () => {
          $bg.attr("src", $artwork.attr("src"));
        });
        const $wrapper = $("<div>", { id: "aotified-ambience" }).append($bg);
        $("body").append($wrapper);
      }
    }),
    new Feature({
      name: "Global Font",
      description: "Global font styles.",
      default: true,
      run: (ctx) => {
        ctx.logger.log(`enabled`);
        $("<link>", {
          id: "aotified-inter-font",
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        }).appendTo("head");
        $("<style>", {
          id: "aotified-inter-style",
          text: `
            code, pre, kbd, samp {
              font-family: ui-monospace, SFMono-Regular, monospace !important;
            }

            *:not([class^="fa"], [class*=" fa"], [class^="fa-"], [class*="fal"]) {
              font-family: var(--zui-font-primary) !important;
            }
          `
        }).appendTo("head");
      }
    }),
    new Feature({
      name: "Seasonal",
      description: "Enable seasonal appearance such as snow.",
      default: false,
      run: (ctx) => {
        ctx.logger.log(`enabled`);
        const $canvas = $("<canvas>", { id: "aotified-snow" }).css({
          position: "fixed",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 9999
        });
        $("body").append($canvas);
        const canvas = $canvas[0];
        const cnv_ctx = canvas.getContext("2d");
        function resize() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
        resize();
        $(window).on("resize", resize);
        const flakes = Array.from({ length: 120 }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 2 + 0.5,
          d: Math.random() * 0.6 + 0.2
        }));
        function update() {
          for (const f of flakes) {
            f.y += f.d;
            if (f.y > canvas.height) {
              f.y = -10;
              f.x = Math.random() * canvas.width;
            }
          }
        }
        let rafId = null;
        function draw() {
          if (!cnv_ctx)
            return ctx.logger.error("can't get canvas context.");
          cnv_ctx.clearRect(0, 0, canvas.width, canvas.height);
          cnv_ctx.fillStyle = "rgba(255,255,255,0.8)";
          cnv_ctx.beginPath();
          for (const f of flakes) {
            cnv_ctx.moveTo(f.x, f.y);
            cnv_ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          }
          cnv_ctx.fill();
          update();
          rafId = requestAnimationFrame(draw);
        }
        draw();
        return () => {
          if (rafId != null)
            cancelAnimationFrame(rafId);
          $(window).off("resize", resize);
          $canvas.remove();
        };
      }
    })
  ]);
  return module;
};

// node_modules/preact/dist/preact.module.js
var n;
var l;
var u;
var t;
var i;
var o;
var r;
var e;
var f;
var c;
var s;
var a;
var h;
var p = {};
var v = [];
var y = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
var d = Array.isArray;
function w(n2, l2) {
  for (var u2 in l2)
    n2[u2] = l2[u2];
  return n2;
}
function g(n2) {
  n2 && n2.parentNode && n2.parentNode.removeChild(n2);
}
function _(l2, u2, t2) {
  var i2, o2, r2, e2 = {};
  for (r2 in u2)
    r2 == "key" ? i2 = u2[r2] : r2 == "ref" ? o2 = u2[r2] : e2[r2] = u2[r2];
  if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n.call(arguments, 2) : t2), typeof l2 == "function" && l2.defaultProps != null)
    for (r2 in l2.defaultProps)
      e2[r2] === undefined && (e2[r2] = l2.defaultProps[r2]);
  return m(l2, e2, i2, o2, null);
}
function m(n2, t2, i2, o2, r2) {
  var e2 = { type: n2, props: t2, key: i2, ref: o2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: r2 == null ? ++u : r2, __i: -1, __u: 0 };
  return r2 == null && l.vnode != null && l.vnode(e2), e2;
}
function k(n2) {
  return n2.children;
}
function x(n2, l2) {
  this.props = n2, this.context = l2;
}
function S(n2, l2) {
  if (l2 == null)
    return n2.__ ? S(n2.__, n2.__i + 1) : null;
  for (var u2;l2 < n2.__k.length; l2++)
    if ((u2 = n2.__k[l2]) != null && u2.__e != null)
      return u2.__e;
  return typeof n2.type == "function" ? S(n2) : null;
}
function C(n2) {
  var l2, u2;
  if ((n2 = n2.__) != null && n2.__c != null) {
    for (n2.__e = n2.__c.base = null, l2 = 0;l2 < n2.__k.length; l2++)
      if ((u2 = n2.__k[l2]) != null && u2.__e != null) {
        n2.__e = n2.__c.base = u2.__e;
        break;
      }
    return C(n2);
  }
}
function M(n2) {
  (!n2.__d && (n2.__d = true) && i.push(n2) && !$3.__r++ || o != l.debounceRendering) && ((o = l.debounceRendering) || r)($3);
}
function $3() {
  for (var n2, u2, t2, o2, r2, f2, c2, s2 = 1;i.length; )
    i.length > s2 && i.sort(e), n2 = i.shift(), s2 = i.length, n2.__d && (t2 = undefined, o2 = undefined, r2 = (o2 = (u2 = n2).__v).__e, f2 = [], c2 = [], u2.__P && ((t2 = w({}, o2)).__v = o2.__v + 1, l.vnode && l.vnode(t2), O(u2.__P, t2, o2, u2.__n, u2.__P.namespaceURI, 32 & o2.__u ? [r2] : null, f2, r2 == null ? S(o2) : r2, !!(32 & o2.__u), c2), t2.__v = o2.__v, t2.__.__k[t2.__i] = t2, N(f2, t2, c2), o2.__e = o2.__ = null, t2.__e != r2 && C(t2)));
  $3.__r = 0;
}
function I(n2, l2, u2, t2, i2, o2, r2, e2, f2, c2, s2) {
  var a2, h2, y2, d2, w2, g2, _2, m2 = t2 && t2.__k || v, b = l2.length;
  for (f2 = P(u2, l2, m2, f2, b), a2 = 0;a2 < b; a2++)
    (y2 = u2.__k[a2]) != null && (h2 = y2.__i == -1 ? p : m2[y2.__i] || p, y2.__i = a2, g2 = O(n2, y2, h2, i2, o2, r2, e2, f2, c2, s2), d2 = y2.__e, y2.ref && h2.ref != y2.ref && (h2.ref && B(h2.ref, null, y2), s2.push(y2.ref, y2.__c || d2, y2)), w2 == null && d2 != null && (w2 = d2), (_2 = !!(4 & y2.__u)) || h2.__k === y2.__k ? f2 = A(y2, f2, n2, _2) : typeof y2.type == "function" && g2 !== undefined ? f2 = g2 : d2 && (f2 = d2.nextSibling), y2.__u &= -7);
  return u2.__e = w2, f2;
}
function P(n2, l2, u2, t2, i2) {
  var o2, r2, e2, f2, c2, s2 = u2.length, a2 = s2, h2 = 0;
  for (n2.__k = new Array(i2), o2 = 0;o2 < i2; o2++)
    (r2 = l2[o2]) != null && typeof r2 != "boolean" && typeof r2 != "function" ? (typeof r2 == "string" || typeof r2 == "number" || typeof r2 == "bigint" || r2.constructor == String ? r2 = n2.__k[o2] = m(null, r2, null, null, null) : d(r2) ? r2 = n2.__k[o2] = m(k, { children: r2 }, null, null, null) : r2.constructor === undefined && r2.__b > 0 ? r2 = n2.__k[o2] = m(r2.type, r2.props, r2.key, r2.ref ? r2.ref : null, r2.__v) : n2.__k[o2] = r2, f2 = o2 + h2, r2.__ = n2, r2.__b = n2.__b + 1, e2 = null, (c2 = r2.__i = L(r2, u2, f2, a2)) != -1 && (a2--, (e2 = u2[c2]) && (e2.__u |= 2)), e2 == null || e2.__v == null ? (c2 == -1 && (i2 > s2 ? h2-- : i2 < s2 && h2++), typeof r2.type != "function" && (r2.__u |= 4)) : c2 != f2 && (c2 == f2 - 1 ? h2-- : c2 == f2 + 1 ? h2++ : (c2 > f2 ? h2-- : h2++, r2.__u |= 4))) : n2.__k[o2] = null;
  if (a2)
    for (o2 = 0;o2 < s2; o2++)
      (e2 = u2[o2]) != null && (2 & e2.__u) == 0 && (e2.__e == t2 && (t2 = S(e2)), D(e2, e2));
  return t2;
}
function A(n2, l2, u2, t2) {
  var i2, o2;
  if (typeof n2.type == "function") {
    for (i2 = n2.__k, o2 = 0;i2 && o2 < i2.length; o2++)
      i2[o2] && (i2[o2].__ = n2, l2 = A(i2[o2], l2, u2, t2));
    return l2;
  }
  n2.__e != l2 && (t2 && (l2 && n2.type && !l2.parentNode && (l2 = S(n2)), u2.insertBefore(n2.__e, l2 || null)), l2 = n2.__e);
  do {
    l2 = l2 && l2.nextSibling;
  } while (l2 != null && l2.nodeType == 8);
  return l2;
}
function L(n2, l2, u2, t2) {
  var i2, o2, r2, e2 = n2.key, f2 = n2.type, c2 = l2[u2], s2 = c2 != null && (2 & c2.__u) == 0;
  if (c2 === null && e2 == null || s2 && e2 == c2.key && f2 == c2.type)
    return u2;
  if (t2 > (s2 ? 1 : 0)) {
    for (i2 = u2 - 1, o2 = u2 + 1;i2 >= 0 || o2 < l2.length; )
      if ((c2 = l2[r2 = i2 >= 0 ? i2-- : o2++]) != null && (2 & c2.__u) == 0 && e2 == c2.key && f2 == c2.type)
        return r2;
  }
  return -1;
}
function T(n2, l2, u2) {
  l2[0] == "-" ? n2.setProperty(l2, u2 == null ? "" : u2) : n2[l2] = u2 == null ? "" : typeof u2 != "number" || y.test(l2) ? u2 : u2 + "px";
}
function j(n2, l2, u2, t2, i2) {
  var o2, r2;
  n:
    if (l2 == "style")
      if (typeof u2 == "string")
        n2.style.cssText = u2;
      else {
        if (typeof t2 == "string" && (n2.style.cssText = t2 = ""), t2)
          for (l2 in t2)
            u2 && l2 in u2 || T(n2.style, l2, "");
        if (u2)
          for (l2 in u2)
            t2 && u2[l2] == t2[l2] || T(n2.style, l2, u2[l2]);
      }
    else if (l2[0] == "o" && l2[1] == "n")
      o2 = l2 != (l2 = l2.replace(f, "$1")), r2 = l2.toLowerCase(), l2 = r2 in n2 || l2 == "onFocusOut" || l2 == "onFocusIn" ? r2.slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + o2] = u2, u2 ? t2 ? u2.u = t2.u : (u2.u = c, n2.addEventListener(l2, o2 ? a : s, o2)) : n2.removeEventListener(l2, o2 ? a : s, o2);
    else {
      if (i2 == "http://www.w3.org/2000/svg")
        l2 = l2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if (l2 != "width" && l2 != "height" && l2 != "href" && l2 != "list" && l2 != "form" && l2 != "tabIndex" && l2 != "download" && l2 != "rowSpan" && l2 != "colSpan" && l2 != "role" && l2 != "popover" && l2 in n2)
        try {
          n2[l2] = u2 == null ? "" : u2;
          break n;
        } catch (n3) {}
      typeof u2 == "function" || (u2 == null || u2 === false && l2[4] != "-" ? n2.removeAttribute(l2) : n2.setAttribute(l2, l2 == "popover" && u2 == 1 ? "" : u2));
    }
}
function F(n2) {
  return function(u2) {
    if (this.l) {
      var t2 = this.l[u2.type + n2];
      if (u2.t == null)
        u2.t = c++;
      else if (u2.t < t2.u)
        return;
      return t2(l.event ? l.event(u2) : u2);
    }
  };
}
function O(n2, u2, t2, i2, o2, r2, e2, f2, c2, s2) {
  var a2, h2, p2, v2, y2, _2, m2, b, S2, C2, M2, $4, P2, A2, H, L2, T2, j2 = u2.type;
  if (u2.constructor !== undefined)
    return null;
  128 & t2.__u && (c2 = !!(32 & t2.__u), r2 = [f2 = u2.__e = t2.__e]), (a2 = l.__b) && a2(u2);
  n:
    if (typeof j2 == "function")
      try {
        if (b = u2.props, S2 = "prototype" in j2 && j2.prototype.render, C2 = (a2 = j2.contextType) && i2[a2.__c], M2 = a2 ? C2 ? C2.props.value : a2.__ : i2, t2.__c ? m2 = (h2 = u2.__c = t2.__c).__ = h2.__E : (S2 ? u2.__c = h2 = new j2(b, M2) : (u2.__c = h2 = new x(b, M2), h2.constructor = j2, h2.render = E), C2 && C2.sub(h2), h2.state || (h2.state = {}), h2.__n = i2, p2 = h2.__d = true, h2.__h = [], h2._sb = []), S2 && h2.__s == null && (h2.__s = h2.state), S2 && j2.getDerivedStateFromProps != null && (h2.__s == h2.state && (h2.__s = w({}, h2.__s)), w(h2.__s, j2.getDerivedStateFromProps(b, h2.__s))), v2 = h2.props, y2 = h2.state, h2.__v = u2, p2)
          S2 && j2.getDerivedStateFromProps == null && h2.componentWillMount != null && h2.componentWillMount(), S2 && h2.componentDidMount != null && h2.__h.push(h2.componentDidMount);
        else {
          if (S2 && j2.getDerivedStateFromProps == null && b !== v2 && h2.componentWillReceiveProps != null && h2.componentWillReceiveProps(b, M2), u2.__v == t2.__v || !h2.__e && h2.shouldComponentUpdate != null && h2.shouldComponentUpdate(b, h2.__s, M2) === false) {
            for (u2.__v != t2.__v && (h2.props = b, h2.state = h2.__s, h2.__d = false), u2.__e = t2.__e, u2.__k = t2.__k, u2.__k.some(function(n3) {
              n3 && (n3.__ = u2);
            }), $4 = 0;$4 < h2._sb.length; $4++)
              h2.__h.push(h2._sb[$4]);
            h2._sb = [], h2.__h.length && e2.push(h2);
            break n;
          }
          h2.componentWillUpdate != null && h2.componentWillUpdate(b, h2.__s, M2), S2 && h2.componentDidUpdate != null && h2.__h.push(function() {
            h2.componentDidUpdate(v2, y2, _2);
          });
        }
        if (h2.context = M2, h2.props = b, h2.__P = n2, h2.__e = false, P2 = l.__r, A2 = 0, S2) {
          for (h2.state = h2.__s, h2.__d = false, P2 && P2(u2), a2 = h2.render(h2.props, h2.state, h2.context), H = 0;H < h2._sb.length; H++)
            h2.__h.push(h2._sb[H]);
          h2._sb = [];
        } else
          do {
            h2.__d = false, P2 && P2(u2), a2 = h2.render(h2.props, h2.state, h2.context), h2.state = h2.__s;
          } while (h2.__d && ++A2 < 25);
        h2.state = h2.__s, h2.getChildContext != null && (i2 = w(w({}, i2), h2.getChildContext())), S2 && !p2 && h2.getSnapshotBeforeUpdate != null && (_2 = h2.getSnapshotBeforeUpdate(v2, y2)), L2 = a2, a2 != null && a2.type === k && a2.key == null && (L2 = V(a2.props.children)), f2 = I(n2, d(L2) ? L2 : [L2], u2, t2, i2, o2, r2, e2, f2, c2, s2), h2.base = u2.__e, u2.__u &= -161, h2.__h.length && e2.push(h2), m2 && (h2.__E = h2.__ = null);
      } catch (n3) {
        if (u2.__v = null, c2 || r2 != null)
          if (n3.then) {
            for (u2.__u |= c2 ? 160 : 128;f2 && f2.nodeType == 8 && f2.nextSibling; )
              f2 = f2.nextSibling;
            r2[r2.indexOf(f2)] = null, u2.__e = f2;
          } else {
            for (T2 = r2.length;T2--; )
              g(r2[T2]);
            z(u2);
          }
        else
          u2.__e = t2.__e, u2.__k = t2.__k, n3.then || z(u2);
        l.__e(n3, u2, t2);
      }
    else
      r2 == null && u2.__v == t2.__v ? (u2.__k = t2.__k, u2.__e = t2.__e) : f2 = u2.__e = q(t2.__e, u2, t2, i2, o2, r2, e2, c2, s2);
  return (a2 = l.diffed) && a2(u2), 128 & u2.__u ? undefined : f2;
}
function z(n2) {
  n2 && n2.__c && (n2.__c.__e = true), n2 && n2.__k && n2.__k.forEach(z);
}
function N(n2, u2, t2) {
  for (var i2 = 0;i2 < t2.length; i2++)
    B(t2[i2], t2[++i2], t2[++i2]);
  l.__c && l.__c(u2, n2), n2.some(function(u3) {
    try {
      n2 = u3.__h, u3.__h = [], n2.some(function(n3) {
        n3.call(u3);
      });
    } catch (n3) {
      l.__e(n3, u3.__v);
    }
  });
}
function V(n2) {
  return typeof n2 != "object" || n2 == null || n2.__b && n2.__b > 0 ? n2 : d(n2) ? n2.map(V) : w({}, n2);
}
function q(u2, t2, i2, o2, r2, e2, f2, c2, s2) {
  var a2, h2, v2, y2, w2, _2, m2, b = i2.props || p, k2 = t2.props, x2 = t2.type;
  if (x2 == "svg" ? r2 = "http://www.w3.org/2000/svg" : x2 == "math" ? r2 = "http://www.w3.org/1998/Math/MathML" : r2 || (r2 = "http://www.w3.org/1999/xhtml"), e2 != null) {
    for (a2 = 0;a2 < e2.length; a2++)
      if ((w2 = e2[a2]) && "setAttribute" in w2 == !!x2 && (x2 ? w2.localName == x2 : w2.nodeType == 3)) {
        u2 = w2, e2[a2] = null;
        break;
      }
  }
  if (u2 == null) {
    if (x2 == null)
      return document.createTextNode(k2);
    u2 = document.createElementNS(r2, x2, k2.is && k2), c2 && (l.__m && l.__m(t2, e2), c2 = false), e2 = null;
  }
  if (x2 == null)
    b === k2 || c2 && u2.data == k2 || (u2.data = k2);
  else {
    if (e2 = e2 && n.call(u2.childNodes), !c2 && e2 != null)
      for (b = {}, a2 = 0;a2 < u2.attributes.length; a2++)
        b[(w2 = u2.attributes[a2]).name] = w2.value;
    for (a2 in b)
      if (w2 = b[a2], a2 == "children")
        ;
      else if (a2 == "dangerouslySetInnerHTML")
        v2 = w2;
      else if (!(a2 in k2)) {
        if (a2 == "value" && "defaultValue" in k2 || a2 == "checked" && "defaultChecked" in k2)
          continue;
        j(u2, a2, null, w2, r2);
      }
    for (a2 in k2)
      w2 = k2[a2], a2 == "children" ? y2 = w2 : a2 == "dangerouslySetInnerHTML" ? h2 = w2 : a2 == "value" ? _2 = w2 : a2 == "checked" ? m2 = w2 : c2 && typeof w2 != "function" || b[a2] === w2 || j(u2, a2, w2, b[a2], r2);
    if (h2)
      c2 || v2 && (h2.__html == v2.__html || h2.__html == u2.innerHTML) || (u2.innerHTML = h2.__html), t2.__k = [];
    else if (v2 && (u2.innerHTML = ""), I(t2.type == "template" ? u2.content : u2, d(y2) ? y2 : [y2], t2, i2, o2, x2 == "foreignObject" ? "http://www.w3.org/1999/xhtml" : r2, e2, f2, e2 ? e2[0] : i2.__k && S(i2, 0), c2, s2), e2 != null)
      for (a2 = e2.length;a2--; )
        g(e2[a2]);
    c2 || (a2 = "value", x2 == "progress" && _2 == null ? u2.removeAttribute("value") : _2 != null && (_2 !== u2[a2] || x2 == "progress" && !_2 || x2 == "option" && _2 != b[a2]) && j(u2, a2, _2, b[a2], r2), a2 = "checked", m2 != null && m2 != u2[a2] && j(u2, a2, m2, b[a2], r2));
  }
  return u2;
}
function B(n2, u2, t2) {
  try {
    if (typeof n2 == "function") {
      var i2 = typeof n2.__u == "function";
      i2 && n2.__u(), i2 && u2 == null || (n2.__u = n2(u2));
    } else
      n2.current = u2;
  } catch (n3) {
    l.__e(n3, t2);
  }
}
function D(n2, u2, t2) {
  var i2, o2;
  if (l.unmount && l.unmount(n2), (i2 = n2.ref) && (i2.current && i2.current != n2.__e || B(i2, null, u2)), (i2 = n2.__c) != null) {
    if (i2.componentWillUnmount)
      try {
        i2.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u2);
      }
    i2.base = i2.__P = null;
  }
  if (i2 = n2.__k)
    for (o2 = 0;o2 < i2.length; o2++)
      i2[o2] && D(i2[o2], u2, t2 || typeof n2.type != "function");
  t2 || g(n2.__e), n2.__c = n2.__ = n2.__e = undefined;
}
function E(n2, l2, u2) {
  return this.constructor(n2, u2);
}
n = v.slice, l = { __e: function(n2, l2, u2, t2) {
  for (var i2, o2, r2;l2 = l2.__; )
    if ((i2 = l2.__c) && !i2.__)
      try {
        if ((o2 = i2.constructor) && o2.getDerivedStateFromError != null && (i2.setState(o2.getDerivedStateFromError(n2)), r2 = i2.__d), i2.componentDidCatch != null && (i2.componentDidCatch(n2, t2 || {}), r2 = i2.__d), r2)
          return i2.__E = i2;
      } catch (l3) {
        n2 = l3;
      }
  throw n2;
} }, u = 0, t = function(n2) {
  return n2 != null && n2.constructor === undefined;
}, x.prototype.setState = function(n2, l2) {
  var u2;
  u2 = this.__s != null && this.__s != this.state ? this.__s : this.__s = w({}, this.state), typeof n2 == "function" && (n2 = n2(w({}, u2), this.props)), n2 && w(u2, n2), n2 != null && this.__v && (l2 && this._sb.push(l2), M(this));
}, x.prototype.forceUpdate = function(n2) {
  this.__v && (this.__e = true, n2 && this.__h.push(n2), M(this));
}, x.prototype.render = k, i = [], r = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l2) {
  return n2.__v.__b - l2.__v.__b;
}, $3.__r = 0, f = /(PointerCapture)$|Capture$/i, c = 0, s = F(false), a = F(true), h = 0;

// node_modules/preact-render-to-string/dist/index.module.js
var r2 = "diffed";
var o2 = "__c";
var i2 = "__s";
var a2 = "__c";
var c2 = "__k";
var u2 = "__d";
var s2 = "__s";
var l2 = /[\s\n\\/='"\0<>]/;
var f2 = /^(xlink|xmlns|xml)([A-Z])/;
var p2 = /^(?:accessK|auto[A-Z]|cell|ch|col|cont|cross|dateT|encT|form[A-Z]|frame|hrefL|inputM|maxL|minL|noV|playsI|popoverT|readO|rowS|src[A-Z]|tabI|useM|item[A-Z])/;
var h2 = /^ac|^ali|arabic|basel|cap|clipPath$|clipRule$|color|dominant|enable|fill|flood|font|glyph[^R]|horiz|image|letter|lighting|marker[^WUH]|overline|panose|pointe|paint|rendering|shape|stop|strikethrough|stroke|text[^L]|transform|underline|unicode|units|^v[^i]|^w|^xH/;
var d2 = new Set(["draggable", "spellcheck"]);
function v2(e2) {
  e2.__g !== undefined ? e2.__g |= 8 : e2[u2] = true;
}
function m2(e2) {
  e2.__g !== undefined ? e2.__g &= -9 : e2[u2] = false;
}
function y2(e2) {
  return e2.__g !== undefined ? !!(8 & e2.__g) : e2[u2] === true;
}
var _2 = /["&<]/;
function g2(e2) {
  if (e2.length === 0 || _2.test(e2) === false)
    return e2;
  for (var t2 = 0, n2 = 0, r3 = "", o3 = "";n2 < e2.length; n2++) {
    switch (e2.charCodeAt(n2)) {
      case 34:
        o3 = "&quot;";
        break;
      case 38:
        o3 = "&amp;";
        break;
      case 60:
        o3 = "&lt;";
        break;
      default:
        continue;
    }
    n2 !== t2 && (r3 += e2.slice(t2, n2)), r3 += o3, t2 = n2 + 1;
  }
  return n2 !== t2 && (r3 += e2.slice(t2, n2)), r3;
}
var b = {};
var x2 = new Set(["animation-iteration-count", "border-image-outset", "border-image-slice", "border-image-width", "box-flex", "box-flex-group", "box-ordinal-group", "column-count", "fill-opacity", "flex", "flex-grow", "flex-negative", "flex-order", "flex-positive", "flex-shrink", "flood-opacity", "font-weight", "grid-column", "grid-row", "line-clamp", "line-height", "opacity", "order", "orphans", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit", "stroke-opacity", "stroke-width", "tab-size", "widows", "z-index", "zoom"]);
var k2 = /[A-Z]/g;
function w2(e2) {
  var t2 = "";
  for (var n2 in e2) {
    var r3 = e2[n2];
    if (r3 != null && r3 !== "") {
      var o3 = n2[0] == "-" ? n2 : b[n2] || (b[n2] = n2.replace(k2, "-$&").toLowerCase()), i3 = ";";
      typeof r3 != "number" || o3.startsWith("--") || x2.has(o3) || (i3 = "px;"), t2 = t2 + o3 + ":" + r3 + i3;
    }
  }
  return t2 || undefined;
}
function C2() {
  this.__d = true;
}
function A2(e2, t2) {
  return { __v: e2, context: t2, props: e2.props, setState: C2, forceUpdate: C2, __d: true, __h: new Array(0) };
}
var D2;
var P2;
var $4;
var U;
var F2 = {};
var M2 = [];
var W = Array.isArray;
var z2 = Object.assign;
var H = "";
var N2 = "<!--$s-->";
var q2 = "<!--/$s-->";
function B2(a3, u3, s3) {
  var l3 = l[i2];
  l[i2] = true, D2 = l.__b, P2 = l[r2], $4 = l.__r, U = l.unmount;
  var f3 = _(k, null);
  f3[c2] = [a3];
  try {
    var p3 = O2(a3, u3 || F2, false, undefined, f3, false, s3);
    return W(p3) ? p3.join(H) : p3;
  } catch (e2) {
    if (e2.then)
      throw new Error('Use "renderToStringAsync" for suspenseful rendering.');
    throw e2;
  } finally {
    l[o2] && l[o2](a3, M2), l[i2] = l3, M2.length = 0;
  }
}
function I2(e2, t2) {
  var n2, r3 = e2.type, o3 = true;
  return e2[a2] ? (o3 = false, (n2 = e2[a2]).state = n2[s2]) : n2 = new r3(e2.props, t2), e2[a2] = n2, n2.__v = e2, n2.props = e2.props, n2.context = t2, v2(n2), n2.state == null && (n2.state = F2), n2[s2] == null && (n2[s2] = n2.state), r3.getDerivedStateFromProps ? n2.state = z2({}, n2.state, r3.getDerivedStateFromProps(n2.props, n2.state)) : o3 && n2.componentWillMount ? (n2.componentWillMount(), n2.state = n2[s2] !== n2.state ? n2[s2] : n2.state) : !o3 && n2.componentWillUpdate && n2.componentWillUpdate(), $4 && $4(e2), n2.render(n2.props, n2.state, t2);
}
function O2(t2, r3, o3, i3, u3, _3, b2) {
  if (t2 == null || t2 === true || t2 === false || t2 === H)
    return H;
  var x3 = typeof t2;
  if (x3 != "object")
    return x3 == "function" ? H : x3 == "string" ? g2(t2) : t2 + H;
  if (W(t2)) {
    var k3, C3 = H;
    u3[c2] = t2;
    for (var S2 = t2.length, L2 = 0;L2 < S2; L2++) {
      var E2 = t2[L2];
      if (E2 != null && typeof E2 != "boolean") {
        var j2, T2 = O2(E2, r3, o3, i3, u3, _3, b2);
        typeof T2 == "string" ? C3 += T2 : (k3 || (k3 = new Array(S2)), C3 && k3.push(C3), C3 = H, W(T2) ? (j2 = k3).push.apply(j2, T2) : k3.push(T2));
      }
    }
    return k3 ? (C3 && k3.push(C3), k3) : C3;
  }
  if (t2.constructor !== undefined)
    return H;
  t2.__ = u3, D2 && D2(t2);
  var { type: Z, props: M3 } = t2;
  if (typeof Z == "function") {
    var B3, V2, K, J = r3;
    if (Z === k) {
      if ("tpl" in M3) {
        for (var Q = H, X = 0;X < M3.tpl.length; X++)
          if (Q += M3.tpl[X], M3.exprs && X < M3.exprs.length) {
            var Y = M3.exprs[X];
            if (Y == null)
              continue;
            typeof Y != "object" || Y.constructor !== undefined && !W(Y) ? Q += Y : Q += O2(Y, r3, o3, i3, t2, _3, b2);
          }
        return Q;
      }
      if ("UNSTABLE_comment" in M3)
        return "<!--" + g2(M3.UNSTABLE_comment) + "-->";
      V2 = M3.children;
    } else {
      if ((B3 = Z.contextType) != null) {
        var ee = r3[B3.__c];
        J = ee ? ee.props.value : B3.__;
      }
      var te = Z.prototype && typeof Z.prototype.render == "function";
      if (te)
        V2 = I2(t2, J), K = t2[a2];
      else {
        t2[a2] = K = A2(t2, J);
        for (var ne = 0;y2(K) && ne++ < 25; ) {
          m2(K), $4 && $4(t2);
          try {
            V2 = Z.call(K, M3, J);
          } catch (e2) {
            throw _3 && e2 && typeof e2.then == "function" && (t2._suspended = true), e2;
          }
        }
        v2(K);
      }
      if (K.getChildContext != null && (r3 = z2({}, r3, K.getChildContext())), te && l.errorBoundaries && (Z.getDerivedStateFromError || K.componentDidCatch)) {
        V2 = V2 != null && V2.type === k && V2.key == null && V2.props.tpl == null ? V2.props.children : V2;
        try {
          return O2(V2, r3, o3, i3, t2, _3, false);
        } catch (e2) {
          return Z.getDerivedStateFromError && (K[s2] = Z.getDerivedStateFromError(e2)), K.componentDidCatch && K.componentDidCatch(e2, F2), y2(K) ? (V2 = I2(t2, r3), (K = t2[a2]).getChildContext != null && (r3 = z2({}, r3, K.getChildContext())), O2(V2 = V2 != null && V2.type === k && V2.key == null && V2.props.tpl == null ? V2.props.children : V2, r3, o3, i3, t2, _3, b2)) : H;
        } finally {
          P2 && P2(t2), U && U(t2);
        }
      }
    }
    V2 = V2 != null && V2.type === k && V2.key == null && V2.props.tpl == null ? V2.props.children : V2;
    try {
      var re = O2(V2, r3, o3, i3, t2, _3, b2);
      return P2 && P2(t2), l.unmount && l.unmount(t2), t2._suspended ? typeof re == "string" ? N2 + re + q2 : W(re) ? (re.unshift(N2), re.push(q2), re) : re.then(function(e2) {
        return N2 + e2 + q2;
      }) : re;
    } catch (n2) {
      if (!_3 && b2 && b2.onError) {
        var oe = function e(n3) {
          return b2.onError(n3, t2, function(t3, n4) {
            try {
              return O2(t3, r3, o3, i3, n4, _3, b2);
            } catch (t4) {
              return e(t4);
            }
          });
        }(n2);
        if (oe !== undefined)
          return oe;
        var ie = l.__e;
        return ie && ie(n2, t2), H;
      }
      if (!_3)
        throw n2;
      if (!n2 || typeof n2.then != "function")
        throw n2;
      return n2.then(function e() {
        try {
          var n3 = O2(V2, r3, o3, i3, t2, _3, b2);
          return t2._suspended ? N2 + n3 + q2 : n3;
        } catch (t3) {
          if (!t3 || typeof t3.then != "function")
            throw t3;
          return t3.then(e);
        }
      });
    }
  }
  var ae, ce = "<" + Z, ue = H;
  for (var se in M3) {
    var le = M3[se];
    if (typeof (le = G(le) ? le.value : le) != "function" || se === "class" || se === "className") {
      switch (se) {
        case "children":
          ae = le;
          continue;
        case "key":
        case "ref":
        case "__self":
        case "__source":
          continue;
        case "htmlFor":
          if ("for" in M3)
            continue;
          se = "for";
          break;
        case "className":
          if ("class" in M3)
            continue;
          se = "class";
          break;
        case "defaultChecked":
          se = "checked";
          break;
        case "defaultSelected":
          se = "selected";
          break;
        case "defaultValue":
        case "value":
          switch (se = "value", Z) {
            case "textarea":
              ae = le;
              continue;
            case "select":
              i3 = le;
              continue;
            case "option":
              i3 != le || "selected" in M3 || (ce += " selected");
          }
          break;
        case "dangerouslySetInnerHTML":
          ue = le && le.__html;
          continue;
        case "style":
          typeof le == "object" && (le = w2(le));
          break;
        case "acceptCharset":
          se = "accept-charset";
          break;
        case "httpEquiv":
          se = "http-equiv";
          break;
        default:
          if (f2.test(se))
            se = se.replace(f2, "$1:$2").toLowerCase();
          else {
            if (l2.test(se))
              continue;
            se[4] !== "-" && !d2.has(se) || le == null ? o3 ? h2.test(se) && (se = se === "panose1" ? "panose-1" : se.replace(/([A-Z])/g, "-$1").toLowerCase()) : p2.test(se) && (se = se.toLowerCase()) : le += H;
          }
      }
      le != null && le !== false && (ce = le === true || le === H ? ce + " " + se : ce + " " + se + '="' + (typeof le == "string" ? g2(le) : le + H) + '"');
    }
  }
  if (l2.test(Z))
    throw new Error(Z + " is not a valid HTML tag name in " + ce + ">");
  if (ue || (typeof ae == "string" ? ue = g2(ae) : ae != null && ae !== false && ae !== true && (ue = O2(ae, r3, Z === "svg" || Z !== "foreignObject" && o3, i3, t2, _3, b2))), P2 && P2(t2), U && U(t2), !ue && R.has(Z))
    return ce + "/>";
  var fe = "</" + Z + ">", pe = ce + ">";
  return W(ue) ? [pe].concat(ue, [fe]) : typeof ue != "string" ? [pe, ue, fe] : pe + ue + fe;
}
var R = new Set(["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"]);
function G(e2) {
  return e2 !== null && typeof e2 == "object" && typeof e2.peek == "function" && "value" in e2;
}

// src/utils/dom.ts
function normalizeContent(content) {
  if (typeof content === "string") {
    return content;
  }
  if (content.jquery) {
    return content.prop("outerHTML");
  }
  if (content instanceof HTMLElement) {
    return content.outerHTML;
  }
  throw new Error("unsupported content type");
}
// node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
var f3 = 0;
function u3(e2, t2, n2, o3, i3, u4) {
  t2 || (t2 = {});
  var a3, c3, p3 = t2;
  if ("ref" in p3)
    for (c3 in p3 = {}, t2)
      c3 == "ref" ? a3 = t2[c3] : p3[c3] = t2[c3];
  var l3 = { type: e2, props: p3, key: n2, ref: a3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: --f3, __i: -1, __u: 0, __source: i3, __self: u4 };
  if (typeof e2 == "function" && (a3 = e2.defaultProps))
    for (c3 in a3)
      p3[c3] === undefined && (p3[c3] = a3[c3]);
  return l.vnode && l.vnode(l3), l3;
}

// src/components/Overlay.tsx
function Overlay(options) {
  const html = normalizeContent(options.content);
  const markup = B2(/* @__PURE__ */ u3("div", {
    class: "content",
    id: options.id,
    children: [
      /* @__PURE__ */ u3("header", {
        children: [
          /* @__PURE__ */ u3("div", {
            class: "close",
            children: /* @__PURE__ */ u3("button", {
              class: "overlayClose",
              children: /* @__PURE__ */ u3("i", {
                class: "far fa-times-circle"
              }, undefined, false, undefined, this)
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ u3("div", {
            class: "heading",
            children: [
              options.heading.icon && /* @__PURE__ */ u3("i", {
                class: "fas fa-" + options.heading.icon
              }, undefined, false, undefined, this),
              /* @__PURE__ */ u3("span", {
                children: options.heading.label
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ u3("section", {
        dangerouslySetInnerHTML: { __html: html }
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this));
  const $overlay2 = $(".overlay");
  $overlay2.children().remove();
  const $el = $(markup).hide();
  $el.find(".overlayClose").on("click", () => $el.remove());
  $overlay2.append($el);
  return $el.show();
}

// src/modules/album.ts
var Album = () => {
  const mod = new Module({
    name: "Albums",
    description: "Album page related features."
  });
  const ALBUM_ID = location.pathname.match(/album\/(\d+)-/)?.[1];
  if (ALBUM_ID) {
    mod.loadFeatures([
      new Feature({
        name: "Embedded Videos",
        description: "Shows embedded video if available",
        default: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          let video_url;
          Observer(".album:has(.albumTopBox.cover.video)", function() {
            const $root = $(this);
            const $link = $root.find(".albumLinksFlex a:has(.albumButton.youtube)");
            video_url = $link.attr("href");
            if (video_url) {
              ctx.logger.log(`video: ${video_url}`);
              const videoId = getYTID(video_url);
              if (!videoId) {
                alert("Неверная YouTube ссылка");
                return;
              }
              const $iframe = $("<iframe>", {
                src: `https://www.youtube.com/embed/${videoId}`,
                frameborder: 0,
                allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
                allowfullscreen: true
              });
              $root.find(".showImage").on("click", function(e2) {
                e2.preventDefault();
                e2.stopPropagation();
                Overlay({
                  id: "AOTIFIED_videoEmbed",
                  heading: { label: "Video", icon: "camera" },
                  content: $iframe
                });
              });
            }
          });
        }
      }),
      new Feature({
        name: "More Stats",
        description: "Fix album page layout and ratings.",
        default: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          Observer("#moreStats", async function() {
            const $box = $(this);
            $box.html("<div class='loader'/>");
            try {
              const res = await fetch("/scripts/moreStatsAlbum.php", {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                  "X-Requested-With": "XMLHttpRequest"
                },
                body: `albumID=${ALBUM_ID}`,
                credentials: "same-origin"
              });
              if (!res.ok)
                throw new Error(res.statusText);
              $box.children("loading").remove();
              $box.html(await res.text());
              ctx.logger.log("showStats initialized");
            } catch (err) {
              ctx.logger.error("moreStats failed", err);
              $box.addClass("error");
            }
          }, { once: true });
        }
      }),
      new Feature({
        name: "Sort Tracklist",
        description: "Sort tracklist by date, comments, saved.",
        default: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          $(".rightBox.trackList").each(function() {
            const $root = $("#tracklist");
            if (!$root.length)
              return;
            const $table = $root.find(".trackListTable tbody");
            if (!$table.length)
              return;
            const original = $table.find("tr").toArray();
            const $container = $("<div class='aotified-ui sorting'><span>Sorting by: </span> <button class='button'>number</button></div>");
            $root.find(".sectionHeading").after($container);
            const $btn = $container.children(".button");
            let mode = 0;
            function getRating(tr) {
              return parseFloat($(tr).find(".trackRating span").text().trim()) || 0;
            }
            function getTitle(tr) {
              return $(tr).find(".trackTitle a").text().trim().toLowerCase();
            }
            $btn.on("click", function() {
              const rows = $table.find("tr").toArray();
              if (mode === 0) {
                rows.sort((a3, b2) => getRating(b2) - getRating(a3));
                $btn.text("rating");
              } else if (mode === 1) {
                rows.sort((a3, b2) => getTitle(a3).localeCompare(getTitle(b2)));
                $btn.text("title");
              } else {
                $table.append(original);
                $btn.text("number");
                mode = 0;
                return;
              }
              $table.append(rows);
              mode++;
            });
          });
        }
      })
    ]);
  }
  return mod;
};

// src/modules/artist.ts
var Artist = () => {
  const mod = new Module({
    name: "Artists",
    description: "Artist page related features."
  });
  const ARTIST_ID = location.pathname.match(/artist\/(\d+)-/)?.[1];
  if (ARTIST_ID) {
    mod.loadFeatures([
      new Feature({
        name: "More Releases",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
        }
      })
    ]);
  }
  return mod;
};

// src/modules/user.ts
var User = () => {
  const module = new Module({
    name: "Users",
    description: "Users related settings."
  });
  const USERNAME = location.pathname.match(/^\/user\/([^/]+)\/?$/)?.[1];
  if (!USERNAME) {
    return module;
  }
  $("#centerContent").addClass("user");
  module.loadFeatures([
    new Feature({
      name: "Wrap Profile",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx) => {
        ctx.logger.log(`enabled`);
        Observer(".profileContent", function() {
          const $root = $(this);
          if ($root.data("releaseWrapped"))
            return;
          $root.data("releaseWrapped", true);
          const $headings = $root.children(".sectionHeading").not("#favSection .sectionHeading");
          $headings.each(function() {
            const $heading = $(this);
            const $releaseContainer = $("<div class='releaseContainer'>");
            const $releaseBlock = $("<div class='releaseBlock'>");
            $heading.nextUntil(".sectionHeading", ".albumBlock").addClass("user").appendTo($releaseBlock);
            if (!$releaseBlock.children().length)
              return;
            $heading.wrap($releaseContainer);
            $releaseBlock.insertAfter($heading);
          });
        });
        Observer("#centerContent.user", function() {
          const $root = $(this);
          const pfp = $(".profileImage img").attr("src");
          ctx.logger.debug(pfp);
          const $profileLayout = $root.children(".flexContainer");
          $profileLayout.removeClass("flexContainer");
          $profileLayout.addClass("profileLayout");
          const $profileSidebar = $profileLayout.children(".rightContent");
          $profileSidebar.removeClass("rightContent");
          $profileSidebar.addClass("profileSidebar");
          $profileSidebar.find(".rightBox:has(.tag)").wrapChildren(".tag", "<div class='tagBlock'>");
          $profileSidebar.find(`.rightBox:has(a[href^="/user/"])`).wrapChildren(`a`, "<div class='usersBlock'>");
          const $profileContent = $profileLayout.children(".wideLeft");
          $profileContent.removeClass("wideLeft alignTop");
          $profileContent.addClass("profileContent");
          const $fullWidth = $root.children(".fullWidth:has(> #profileHead)");
          const $profileHead = $fullWidth.children("#profileHead");
          const $profileInfo = $profileHead.children(".profileHeadLeft").replaceClass("*", "rightBox profileInfo");
          const $profileStats = $profileHead.children(".profileHeadRight").replaceClass("*", "rightBox profileStats");
          $profileStats.children(".profileStatContainer").replaceClass("*", "statsBlock").wrapAll("<div class='statsContainer'></div>");
          $profileStats.prepend(`<h2 class="sectionHeading">Stats</h2>`);
          const $profileNav = $fullWidth.children(".profileNav");
          $profileContent.prepend($profileNav);
          const $profileText = $fullWidth.find(".headline.profile");
          $profileText.each(function() {
            const $span = $(this).children("span").addClass("profileName").removeAttr("style");
            const $donor = $(this).children(".donor");
            if ($span.length && $donor.length) {
              $span.append($donor);
            }
          });
          $profileText.find(".profileName").each(function() {
            const node = this.childNodes[0];
            if (node && node.nodeType === 3) {
              const span = document.createElement("span");
              span.className = "nickname";
              span.textContent = node.textContent;
              this.replaceChild(span, node);
            }
          });
          $profileHead.unpack();
          $fullWidth.unpack();
          $profileSidebar.insertBefore($profileContent);
          $profileSidebar.prepend($profileStats);
          $profileSidebar.prepend($profileInfo);
        });
        Observer("#favBlock", function() {
          $(this).addClass("releaseBlock");
        });
        Observer(".profileContent", function() {
          const $root = $(this);
          const $headings = $root.children(".sectionHeading");
          $headings.each(function(_3) {
            const $heading = $(this);
            const $releaseBlock = $("<div class='releaseBlock'>");
            const $releaseContainer = $("<div class='releaseContainer'>");
            $heading.nextUntil(".sectionHeading", ".albumBlock").addClass("user").appendTo($releaseBlock);
            $heading.wrapSmart($releaseContainer);
            $releaseBlock.insertAfter($heading);
          });
        });
      }
    }),
    new Feature({
      name: "Badges",
      description: "Show custom badges under user names",
      default: true,
      run: (ctx) => {
        ctx.logger.log(`enabled`);
        Observer(".profileSidebar", function() {
          const $root = $(this);
          const $profileDetails = $root.find(".profileHeadText").replaceClass("*", "profileDetails");
          const $profileBadges = $("<div class='profileBadges'>");
          const now = new Date;
          const memberSinceText = $root.find("div:contains('Member since')").first().text().trim().replace("StatsContributions", "").replace("Member since ", "");
          const memberDate = new Date(memberSinceText);
          let years = now.getFullYear() - memberDate.getFullYear();
          const hasHadAnniversary = now.getMonth() > memberDate.getMonth() || now.getMonth() === memberDate.getMonth() && now.getDate() >= memberDate.getDate();
          if (!hasHadAnniversary) {
            years--;
          }
          console.log(years);
          const $yearBadge = $(`<div class='badge year'><span id="year">${years}</span><span>year</span></div>`);
          let $devBadge = $(`<div class='badge dev'><span>DEV</span></div>`);
          if (USERNAME === "woidzero") {
            $profileBadges.append($devBadge);
          } else if (USERNAME === "rob") {
            $devBadge = $(`<div class='badge dev'><span>AOTY</span></div>`);
            $profileBadges.append($devBadge);
          }
          if (years > 0) {
            $profileBadges.append($yearBadge);
          }
          $profileDetails.append($profileBadges);
        });
      }
    })
  ]);
  return module;
};

// src/modules/images.ts
var Images = () => {
  const module = new Module({
    name: "Images",
    description: "Images related settings."
  });
  module.loadFeatures([
    new Feature({
      name: "Upgrade Images",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx) => {
        ctx.logger.log(`enabled`);
        return Observer("img", function() {
          const $img = $(this);
          if ($img.data("upgraded"))
            return;
          $img.data("upgraded", true);
          const SIZE = "700";
          const src = $img.attr("src");
          if (!src)
            return;
          if (!/\/\d+x0\//.test(src) || src.includes(`${SIZE}x0`))
            return;
          const upgraded = src.replace(/\/\d+x0\//, `/${SIZE}x0/`);
          const preloader = new Image;
          preloader.src = upgraded;
          preloader.onload = () => {
            $img.attr("src", upgraded);
            ctx.logger.debug("upgraded image:", upgraded);
          };
          preloader.onerror = (e2) => {
            ctx.logger.warn("image upgrade failed:", upgraded, e2);
          };
        });
      }
    })
  ]);
  return module;
};

// src/main.ts
var composer = new Composer([Global(), Album(), Artist(), User(), Images()]);
composer.start();

//# debugId=6B55770B2D4639F764756E2164756E21
//# sourceMappingURL=main.js.map
