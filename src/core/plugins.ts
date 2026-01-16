// @ts-ignore
const $: JQueryStatic = window.$ || window.JQuery;

if (!$) {
  throw new Error("[aotified] jQuery not found on window");
}

declare global {
  interface JQuery {
    wrapChildren(childSelector: string, wrapper: string): JQuery;
    wrapSmart(wrapper: JQuery | (() => JQuery)): JQuery;
    changeTag(tag: string): JQuery;
    unpack(): JQuery;
    replaceClass(from: string | string[], to?: string | string[]): JQuery;
  }
}

$.fn.wrapChildren = function (childSelector: string, wrapper: string) {
  return this.each(function () {
    $(this).children(childSelector).wrapAll(wrapper);
  });
};

$.fn.wrapSmart = function (wrapper: JQuery | (() => JQuery)) {
  return this.each(function () {
    const $w = typeof wrapper === "function" ? wrapper() : wrapper.clone();
    $(this).before($w);
    $w.append(this);
  });
};

$.fn.unpack = function () {
  return this.each(function () {
    const $this = $(this);
    $this.replaceWith($this.contents());
  });
};

$.fn.changeTag = function (tag: string): JQuery {
  tag = tag.replace(/[<>]/g, "");

  return this.map(function () {
    const oldEl = this as HTMLElement;
    const $old = $(oldEl);

    const newEl = document.createElement(tag);

    for (const attr of Array.from(oldEl.attributes)) {
      newEl.setAttribute(attr.name, attr.value);
    }

    $(newEl).append($old.contents());
    oldEl.replaceWith(newEl);

    return newEl;
  });
};

$.fn.replaceClass = function (
  from?: string | string[],
  to?: string | string[]
): JQuery {
  const fromList = from ? (Array.isArray(from) ? from : [from]) : [];
  const toList = to ? (Array.isArray(to) ? to : [to]) : [];

  return this.each(function () {
    const $el = $(this);

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

export {};
