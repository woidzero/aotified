import { h } from "preact";
import render from "preact-render-to-string";
import { normalizeContent } from "../utils/dom";

export function Overlay(options: OverlayProps): JQuery {
  const html = normalizeContent(options.content);

  const markup = render(
    <div class="content" id={options.id}>
      <header>
        <div class="close">
          <button class="overlayClose">
            <i class="far fa-times-circle"></i>
          </button>
        </div>

        <div class="heading">
          {options.heading.icon && (
            <i class={"fas fa-" + options.heading.icon}></i>
          )}
          <span>{options.heading.label}</span>
        </div>
      </header>

      <section dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );

  const $overlay = $(".overlay");
  $overlay.children().remove();

  const $el = $(markup).hide();
  $el.find(".overlayClose").on("click", () => $el.remove());

  $overlay.append($el);
  return $el.show();
}
