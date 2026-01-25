export function normalizeContent(content: OverlayContent): string {
  if (typeof content === "string") {
    return content;
  }

  if ((content as any).jquery) {
    return (content as JQuery).prop("outerHTML");
  }

  if (content instanceof HTMLElement) {
    return content.outerHTML;
  }

  throw new Error("unsupported content type");
}

export function positionMenu($btn: JQuery<HTMLElement>, $menu: JQuery<HTMLElement>) {
  const rect = $btn[0].getBoundingClientRect()

  $menu.css({
    top: rect.bottom,
    left: rect.right - ($menu.outerWidth() ?? 0),
  })
}