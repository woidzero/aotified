export function Observer<T extends JQuery = JQuery>(
  selector: string,
  callback: (this: T) => void | Promise<void>,
  {
    root = document,
    idle = false,
    intersection = false,
    intersectionOptions,
  }: ObserveOptions = {}
) {
  const getRootEl = (): ParentNode =>
    (root as JQuery)?.[0] ?? (root as ParentNode);

  const run = (el: Element) => {
    const $el = $(el) as T;

    const exec = () => callback.call($el);

    if (idle && "requestIdleCallback" in window) {
      requestIdleCallback(exec);
    } else {
      exec();
    }
  };

  const io =
    intersection && "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            run(e.target);
            io!.unobserve(e.target);
          }
        }, intersectionOptions)
      : null;

  const handle = (el: Element) => {
    if (io) {
      io.observe(el);
    } else {
      run(el);
    }
  };

  $(getRootEl())
    .find(selector)
    .each((_, el) => handle(el));

  /**
   * mutation observer
   */
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (let i = 0; i < m.addedNodes.length; i++) {
        const node = m.addedNodes[i];
        if (!(node instanceof Element)) continue;

        if (node.matches(selector)) handle(node);

        node.querySelectorAll?.(selector).forEach((el) => handle(el));
        
        if (node.parentElement?.matches(selector)) {
          handle(node.parentElement);
        }
      }
    }
  });

  observer.observe(getRootEl(), {
    childList: true,
    subtree: true,
  });

  const stop = () => {
    observer.disconnect();
    io?.disconnect();
  };

  return stop;
}
