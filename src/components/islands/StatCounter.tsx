import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'motion/react';

interface Props {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

// Starts at the real final value (not 0): server-rendered markup, no-JS
// visitors, and the brief pre-hydration window all show the correct number
// immediately. The count-up is a progressive enhancement layered on top,
// only once the element is in view, and skipped entirely for
// prefers-reduced-motion.
export default function StatCounter({ value, suffix = '', prefix = '', duration = 1.6 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(value);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!isInView || animatedRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    animatedRef.current = true;
    setDisplay(0);
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest))
    });
    return () => controls.stop();
  }, [isInView, value, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString('en-US')}
      {suffix}
    </span>
  );
}
