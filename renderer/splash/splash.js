/**
 * splash.js — Controls the splash screen animation sequence
 */

const whiteBox = document.getElementById('white-box');
const visorText = document.getElementById('visor-text');
const revealCircle = document.getElementById('reveal-circle');
const bezelFrame = document.getElementById('bezel-frame');

// Animation sequence timing (in milliseconds) — ~5s total with close-back
const TIMING = {
  BEZEL_START: 0,         // Bezel starts immediately
  BEZEL_EXPAND: 900,      // Duration of bezel expansion from nothing
  BOX_EXPAND: 1200,       // Duration of box expansion
  TEXT_START: 1100,       // VISOR text fades in
  TEXT_FADE_IN: 600,      // Duration of text fade in
  TEXT_DISPLAY: 1200,     // Text stays visible
  TEXT_FADE_OUT: 600,     // Duration of text fade out
  SHRINK_START: 3800,     // Start closing back to the center
  SHRINK_DURATION: 900,   // Duration of shrink/vanish
  TOTAL_DURATION: 5000    // Total animation duration (~5.0s)
};

/**
 * Run the complete splash animation sequence
 */
function startSplashSequence() {
  // Respect reduced motion: keep it brief and subtle
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    bezelFrame.classList.add('bezel-visible');
    whiteBox.classList.add('expanding');
    visorText.classList.add('fade-in-text');
    setTimeout(() => {
      visorText.classList.remove('fade-in-text');
      visorText.classList.add('fade-out-text');
    }, 250);
    setTimeout(() => {
      whiteBox.style.opacity = '0';
      whiteBox.style.display = 'none';
      bezelFrame.style.opacity = '0';
      bezelFrame.style.display = 'none';
      if (window.visor && window.visor.splash && window.visor.splash.complete) {
        window.visor.splash.complete();
      }
    }, 600);
    return;
  }

  // Step 0: Expand bezel from center (starts immediately)
  setTimeout(() => {
    bezelFrame.classList.add('bezel-visible');
  }, TIMING.BEZEL_START);

  // Step 1: Expand the white box (while bezel is expanding)
  setTimeout(() => {
    whiteBox.classList.add('expanding');
  }, 200);

  // Step 2: Fade in VISOR text
  setTimeout(() => {
    visorText.classList.add('fade-in-text');
  }, TIMING.TEXT_START);

  // Step 3: Fade out VISOR text (after 1 second display)
  setTimeout(() => {
    visorText.classList.remove('fade-in-text');
    visorText.classList.add('fade-out-text');
  }, TIMING.TEXT_START + TIMING.TEXT_FADE_IN + TIMING.TEXT_DISPLAY);

  // Step 4: Close back to center (shrink + fade)
  setTimeout(() => {
    whiteBox.classList.remove('reveal-expanding'); // ensure no mask is active
    whiteBox.style.setProperty('--shrink-duration', `${TIMING.SHRINK_DURATION}ms`);
    whiteBox.classList.add('shrink-out');
    // Fade bezel towards the end to avoid abrupt cut
    setTimeout(() => bezelFrame.classList.add('bezel-fade-out'), Math.max(0, TIMING.SHRINK_DURATION - 600));
  }, TIMING.SHRINK_START);

  // Step 5: Final safety hide right before completion
  setTimeout(() => {
    whiteBox.style.opacity = '0';
    bezelFrame.style.opacity = '0';
  }, TIMING.TOTAL_DURATION - 100);

  // Step 6: Notify Electron that splash is complete
  setTimeout(() => {
    if (window.visor && window.visor.splash && window.visor.splash.complete) {
      window.visor.splash.complete();
    }
  }, TIMING.TOTAL_DURATION);

  // Robustness: also finish on animationend of the reveal
  const finishOnce = (() => {
    let done = false;
    return () => {
      if (done) return;
      done = true;
      try {
        whiteBox.style.opacity = '0';
        whiteBox.style.display = 'none';
        bezelFrame.style.opacity = '0';
        bezelFrame.style.display = 'none';
      } catch (_) {}
      if (window.visor && window.visor.splash && window.visor.splash.complete) {
        window.visor.splash.complete();
      }
    };
  })();

  whiteBox.addEventListener('animationend', (e) => {
    // Finish when the shrink completes
    if (e.animationName === 'shrinkBox') {
      finishOnce();
    }
  });

  // Safety timeout in case of throttling or unsupported CSS features
  setTimeout(finishOnce, TIMING.TOTAL_DURATION + 500);
}

// Start the sequence when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startSplashSequence);
} else {
  startSplashSequence();
}

// Debug: log animation milestones
console.log('[Splash] Animation sequence started (~5.0s total)');
setTimeout(() => console.log('[Splash] Bezel expand complete'), TIMING.BEZEL_EXPAND);
setTimeout(() => console.log('[Splash] Box expansion complete'), 200 + TIMING.BOX_EXPAND);
setTimeout(() => console.log('[Splash] Text fade in'), TIMING.TEXT_START);
setTimeout(() => console.log('[Splash] Text visible'), TIMING.TEXT_START + TIMING.TEXT_FADE_IN);
setTimeout(() => console.log('[Splash] Text fade out complete'), TIMING.TEXT_START + TIMING.TEXT_FADE_IN + TIMING.TEXT_DISPLAY + TIMING.TEXT_FADE_OUT);
setTimeout(() => console.log('[Splash] Closing back to center'), TIMING.SHRINK_START);
setTimeout(() => console.log('[Splash] Animation complete (~5.0s)'), TIMING.TOTAL_DURATION);
