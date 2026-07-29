import { useEffect, useRef, useState } from "react";

/**
 * Fires once when the element first scrolls into view, then disconnects.
 * Backs the Overview page's scroll-reveal sections — deliberately one-shot
 * and threshold-based rather than a spring/physics library, since the only
 * effect it drives is a fade + slight rise.
 */
export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
