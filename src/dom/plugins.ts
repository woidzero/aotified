// @ts-ignore
const $ = window.jQuery || window.$;

if (!$) {
  throw new Error("[aotified] jQuery not found on window");
}

declare global {
  interface JQuery {
    wrapSmart(wrapper: JQuery | (() => JQuery)): JQuery;
    unwrapSmart(): JQuery;
    changeTag(tag: string): JQuery;
    replaceClass(from: string | string[], to?: string | string[]): JQuery;
  }
}

$.fn.wrapSmart = function (wrapper) {
  return this.each(function () {
    const $w = typeof wrapper === "function" ? wrapper() : wrapper.clone();
    $(this).before($w);
    $w.append(this);
  });
};

$.fn.unwrapSmart = function () {
  return this.each(function () {
    const $this = $(this);
    $this.replaceWith($this.contents());
  });
};

$.fn.changeTag = function (tag: string) {
  tag = tag.replace(/[<>]/g, "");

  return this.map(function () {
    const $old = $(this);
    const $new = $(`<${tag}/>`, $old.attr());

    $new.append($old.contents());
    $old.replaceWith($new);

    return $new.get(0);
  });
};

$.fn.replaceClass = function (from, to) {
  const fromList = Array.isArray(from) ? from : [from];
  const toList = to ? (Array.isArray(to) ? to : [to]) : [];

  return this.each(function () {
    const $el = $(this);
    if (fromList.length) $el.removeClass(fromList.join(" "));
    if (toList.length) $el.addClass(toList.join(" "));
  });
};

export {};
