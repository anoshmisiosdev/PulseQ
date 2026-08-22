import { useEffect, useRef } from "react";

/**
 * One shared scroll scheduler for the whole page.
 *
 * The landing page's scroll work — nav band, hero tilt, reveals, the pinned
 * flow scene and the signal feed — all runs off a single "scroll"/"resize"
 * listener and a single requestAnimationFrame chain. Per-effect listeners are
 * what previously turned one wheel spin into a forced-layout storm; keeping
 * every reader in one `paint()` pass also keeps the two scroll scenes in sync
 * with each other, which is why the page deliberately uses no scroll library
 * and no IntersectionObserver for animation.
 *
 * Lives in lib/ rather than beside the page so the regression test can import
 * it without rendering the page.
 */

const callbacks = new Set<() => void>();
let handle = 0;
let bound = false;

function run() {
  handle = 0;
  callbacks.forEach((cb) => cb());
}

function schedule() {
  if (!handle) handle = requestAnimationFrame(run);
}

/**
 * Add a callback to the shared scheduler, binding the page-wide
 * "scroll"/"resize" listener on first use. Returns an unsubscribe.
 */
export function subscribeRafScroll(cb: () => void): () => void {
  if (!bound) {
    bound = true;
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
  }
  callbacks.add(cb);
  schedule();
  return () => callbacks.delete(cb);
}

/**
 * Subscribe to scroll, coalesced to one callback per frame.
 *
 * The callback is read through a ref, so an inline arrow that closes over
 * fresh state doesn't resubscribe on every render.
 */
export function useRafScroll(onScroll: () => void, enabled = true) {
  const ref = useRef(onScroll);
  ref.current = onScroll;

  useEffect(() => {
    if (!enabled) return;
    return subscribeRafScroll(() => ref.current());
  }, [enabled]);
}
