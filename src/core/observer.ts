type ObserverEntry = {
  selector: string;
  rootEl: ParentNode;
  handle: (el: Element) => void;
  cleanup: () => void;
};

let sharedMutationObserver: MutationObserver | null = null;
const observerEntries: ObserverEntry[] = [];
const observedRoots = new Set<ParentNode>();

function getSharedMutationObserver(): MutationObserver {
  if (sharedMutationObserver) return sharedMutationObserver;
  sharedMutationObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (let i = 0; i < m.addedNodes.length; i++) {
        const node = m.addedNodes[i];
        if (!(node instanceof Element)) continue;
        for (const entry of observerEntries) {
          const root = entry.rootEl;
          if (root !== node && !(root as Node).contains(node)) continue;
          if (node.matches(entry.selector)) entry.handle(node);
          node.querySelectorAll?.(entry.selector).forEach((el) => entry.handle(el));
          if (node.parentElement?.matches(entry.selector)) entry.handle(node.parentElement);
        }
      }
    }
  });
  return sharedMutationObserver;
}

function observeRoot(rootEl: ParentNode) {
  if (observedRoots.has(rootEl)) return;
  observedRoots.add(rootEl);
  getSharedMutationObserver().observe(rootEl, { childList: true, subtree: true });
}


export function Observer<T extends JQuery = JQuery>(
  selector: string,
  callback: (this: T) => void | Promise<void>,
  {
    root = document,
    idle = false,
    intersection = false,
    intersectionOptions,
    live = false,
  }: ObserveOptions & { live?: boolean } = {}
) {
  const processed = live ? null : new WeakSet<Element>();

  const getRootEl = (): ParentNode =>
    (root as JQuery)?.[0] ?? (root as ParentNode);

  const rootEl = getRootEl();

  const run = (el: Element) => {
    if (!live && processed?.has(el)) return;
    if (!live) processed?.add(el);

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

  $(rootEl)
    .find(selector)
    .each((_, el) => handle(el));

  const entry: ObserverEntry = {
    selector,
    rootEl,
    handle,
    cleanup: () => {},
  };

  const stop = () => {
    const idx = observerEntries.indexOf(entry);
    if (idx !== -1) observerEntries.splice(idx, 1);
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
