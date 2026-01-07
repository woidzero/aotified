import { parseDate } from "./utils";

export function sort(type: string, $root: JQuery<HTMLElement>) {
  const $items = $root.children(".albumBlock");

  const getValue = (el: HTMLElement) => {
    const $el = $(el);

    switch (type) {
      case "comments":
        return (
          parseInt(
            $el.find(".comment_count").first().text().replace(/,/g, ""),
            10
          ) || 0
        );

      case "saved":
        return (
          parseInt(
            $el.find(".comment_count").last().text().replace(/,/g, ""),
            10
          ) || 0
        );

      case "date":
      default:
        return parseDate($el.find(".type").text());
    }
  };

  const sorted = $items.get().sort((a, b) => getValue(b) - getValue(a));

  $root.append(sorted);
}
