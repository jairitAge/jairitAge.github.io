'use client';

import { useEffect } from 'react';

/**
 * Marks which end of the page is within bouncing reach, so the canvas colour
 * behind the overscroll strip can match that edge of the background gradient.
 * See the html rules in globals.css — this only flips an attribute; the colours
 * themselves live in CSS and follow the active theme.
 */
export default function ScrollEdgeColor() {
  useEffect(() => {
    const root = document.documentElement;

    const update = () => {
      const scrollable = root.scrollHeight - window.innerHeight;
      // Switching at the midpoint keeps the attribute from thrashing while
      // scrolling; neither edge is reachable from there anyway.
      const nearBottom = scrollable > 0 && window.scrollY > scrollable / 2;
      if (nearBottom) root.setAttribute('data-scroll-edge', 'bottom');
      else root.removeAttribute('data-scroll-edge');
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      root.removeAttribute('data-scroll-edge');
    };
  }, []);

  return null;
}
