import { useEffect, useRef } from 'react';

/**
 * Smooth two-layer cursor for the planner task list.
 *
 * Ported from the reference app (App V3.html): a 12px dot glued to the pointer,
 * trailed by a 32px ring that eases towards it with a 0.18 lerp. The ring only
 * animates while the pointer moves — the requestAnimationFrame loop stops once
 * the two are within 0.5px, which keeps idle CPU cost at zero.
 *
 * Scope: the cursor is revealed ONLY while the pointer is inside an element
 * carrying `data-mybac-cursor` (the planner timetable matrix — the list where
 * sessions are actually done). Everywhere else nothing changes and the native
 * cursor is left alone.
 *
 * Skipped entirely on touch-only devices and when the user asks for reduced
 * motion (the ring then snaps instead of trailing).
 */
export function PlannerCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Touch-only devices: keep the native behaviour
    if (!window.matchMedia || window.matchMedia('(hover: none)').matches) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let rafId: number | null = null;
    let zone: HTMLElement | null = null;
    let shown = false;

    const setShown = (next: boolean) => {
      if (next === shown) return;
      shown = next;
      dot.classList.toggle('on', next);
      ring.classList.toggle('on', next);
    };

    /** Snap the ring onto the dot (zone entry, reduced motion, resize) */
    const snapRing = () => {
      rx = mx;
      ry = my;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
    };

    const step = () => {
      const dx = mx - rx;
      const dy = my - ry;
      rx += dx * 0.18;
      ry += dy * 0.18;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      // Stop when the movement is invisible — saves CPU while idle
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        rafId = requestAnimationFrame(step);
      } else {
        rafId = null;
      }
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const isClickable = (el: HTMLElement | null) =>
      !!el &&
      (el.tagName === 'BUTTON' ||
        el.tagName === 'A' ||
        el.tagName === 'INPUT' ||
        el.tagName === 'SELECT' ||
        el.tagName === 'TEXTAREA' ||
        !!el.closest('button') ||
        !!el.closest('a') ||
        !!el.closest('[role="button"]'));

    const leaveZone = () => {
      zone?.classList.remove('mb-cur-active');
      zone = null;
      setShown(false);
      dot.classList.remove('hover', 'click');
      ring.classList.remove('hover');
      stopLoop();
    };

    const onMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const nextZone = (target?.closest?.('[data-mybac-cursor]') as HTMLElement | null) ?? null;

      if (nextZone !== zone) {
        zone?.classList.remove('mb-cur-active');
        zone = nextZone;
        zone?.classList.add('mb-cur-active');
        setShown(!!zone);
        mx = e.clientX;
        my = e.clientY;
        snapRing();
      }

      if (!zone) return;

      mx = e.clientX;
      my = e.clientY;
      dot.style.left = `${mx}px`;
      dot.style.top = `${my}px`;

      if (reduceMotion) {
        snapRing();
      } else if (rafId === null) {
        rafId = requestAnimationFrame(step);
      }

      const clickable = isClickable(target);
      dot.classList.toggle('hover', clickable);
      ring.classList.toggle('hover', clickable);
    };

    const onMouseDown = () => {
      if (zone) dot.classList.add('click');
    };

    const onMouseUp = () => dot.classList.remove('click');

    const onWindowLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) leaveZone();
    };

    const onResize = () => {
      if (zone) snapRing();
    };

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mousedown', onMouseDown, { passive: true });
    document.addEventListener('mouseup', onMouseUp, { passive: true });
    document.addEventListener('mouseout', onWindowLeave, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseout', onWindowLeave);
      window.removeEventListener('resize', onResize);
      stopLoop();
      zone?.classList.remove('mb-cur-active');
    };
  }, []);

  return (
    <>
      <div id="mb-cursor" ref={dotRef} aria-hidden="true" />
      <div id="mb-cursor-ring" ref={ringRef} aria-hidden="true" />
    </>
  );
}
