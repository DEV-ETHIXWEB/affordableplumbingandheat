/**
 * Zero-dependency scroll-reveal. Runs once per page (Astro view-transition
 * aware), observes every [data-reveal] element, and flips a class when it
 * enters the viewport. Staggered groups set --reveal-delay via
 * [data-reveal-stagger] on the parent (see Reveal.astro).
 */
function initReveal(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    // No IO support: leave content visible rather than hiding it forever.
    return;
  }

  // Flip the CSS gate on now, in the same tick we start observing, so
  // content is never hidden without an observer that will unhide it.
  document.documentElement.classList.add('io-ready');

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );

  targets.forEach((el) => io.observe(el));
}

document.addEventListener('astro:page-load', initReveal);
