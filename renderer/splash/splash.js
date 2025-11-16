/**
 * splash.js — Controls the splash screen animation sequence
 */

const whiteBox = document.getElementById('white-box');
const visorText = document.getElementById('visor-text');
const revealCircle = document.getElementById('reveal-circle');
const bezelFrame = document.getElementById('bezel-frame');

// Animation sequence timing (in milliseconds) - Scaled to 5 seconds
const TIMING = {
  BEZEL_START: 0,        // Bezel starts immediately
  BEZEL_EXPAND: 700,     // Duration of bezel expansion from nothing
  BOX_EXPAND: 850,       // Duration of box expansion
  TEXT_START: 1200,      // VISOR text fades in
  TEXT_FADE_IN: 550,     // Duration of text fade in
  TEXT_DISPLAY: 700,     // Text stays visible
  TEXT_FADE_OUT: 450,    // Duration of text fade out
  REVEAL_START: 3000,    // Reveal starts (from edges inward)
  REVEAL_EXPAND: 1800,   // Duration of reveal (from edges to center)
  TOTAL_DURATION: 5000   // Total animation duration (5 seconds)
};

/**
 * Run the complete splash animation sequence
 */
function startSplashSequence() {
  // Step 0: Expand bezel from center (starts immediately)
  setTimeout(() => {
    bezelFrame.classList.add('bezel-visible');
  }, TIMING.BEZEL_START);

  // Step 1: Expand the white box (while bezel is expanding)
  setTimeout(() => {
    whiteBox.classList.add('expanding');
  }, 200);

  // Step 2: Fade in VISOR text at 1.7s
  setTimeout(() => {
    visorText.classList.add('fade-in-text');
  }, TIMING.TEXT_START);

  // Step 3: Fade out VISOR text (after 1 second display)
  setTimeout(() => {
    visorText.classList.remove('fade-in-text');
    visorText.classList.add('fade-out-text');
  }, TIMING.TEXT_START + TIMING.TEXT_FADE_IN + TIMING.TEXT_DISPLAY);

  // Step 4: Start the reveal - transparency comes from edges inward
  setTimeout(() => {
    // Initialize mask with full white coverage (will shrink from edges)
    whiteBox.style.webkitMaskImage = 'radial-gradient(circle at center, white 150%, transparent 190%)';
    whiteBox.style.maskImage = 'radial-gradient(circle at center, white 150%, transparent 190%)';
    
    revealCircle.classList.add('reveal-expanding');
    
    // Animate the mask - transparency flows from edges to center
    animateRevealMask();
  }, TIMING.REVEAL_START);

  // Step 5: Fade out bezel as reveal completes
  setTimeout(() => {
    bezelFrame.style.transition = 'opacity 0.8s ease-out';
    bezelFrame.style.opacity = '0';
  }, TIMING.REVEAL_START + 600);

  // Step 6: Notify Electron that splash is complete
  setTimeout(() => {
    if (window.visor && window.visor.splash && window.visor.splash.complete) {
      window.visor.splash.complete();
    }
  }, TIMING.TOTAL_DURATION);
}

/**
 * Animate the mask to create transparency coming from edges (inverted)
 */
function animateRevealMask() {
  const startTime = Date.now();
  const duration = TIMING.REVEAL_EXPAND;
  
  function updateMask() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Smooth easing for fluid animation
    const eased = progress * progress * (3 - 2 * progress); // Smooth step
    
    // INVERTED: Start with full coverage (150%) and shrink to 0
    // This makes transparency come from edges toward center
    const circleSize = (1 - eased) * 150;
    
    // Gradient edge for smooth, fluid opacity transition
    const softEdge = 40 - (eased * 20); // Wide gradient edge for fluid transparency
    
    // Inverted mask: white area shrinks, transparent area grows from edges
    whiteBox.style.webkitMaskImage = `radial-gradient(circle at center, white ${circleSize}%, transparent ${circleSize + softEdge}%)`;
    whiteBox.style.maskImage = `radial-gradient(circle at center, white ${circleSize}%, transparent ${circleSize + softEdge}%)`;
    
    // Gradually fade entire white box for ultra-smooth transition
    const opacityFade = 1 - (eased * eased); // Quadratic fade for smoothness
    whiteBox.style.opacity = `${opacityFade}`;
    
    if (progress < 1) {
      requestAnimationFrame(updateMask);
    } else {
      // Fully transparent at the end
      whiteBox.style.opacity = '0';
    }
  }
  
  requestAnimationFrame(updateMask);
}

// Start the sequence when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startSplashSequence);
} else {
  startSplashSequence();
}

// Debug: log animation milestones (5 second timeline)
console.log('[Splash] Animation sequence started (5s total)');
setTimeout(() => console.log('[Splash] Bezel expand complete'), TIMING.BEZEL_EXPAND);
setTimeout(() => console.log('[Splash] Box expansion complete'), 200 + TIMING.BOX_EXPAND);
setTimeout(() => console.log('[Splash] Text fade in'), TIMING.TEXT_START);
setTimeout(() => console.log('[Splash] Text visible'), TIMING.TEXT_START + TIMING.TEXT_FADE_IN);
setTimeout(() => console.log('[Splash] Text fade out complete'), TIMING.TEXT_START + TIMING.TEXT_FADE_IN + TIMING.TEXT_DISPLAY + TIMING.TEXT_FADE_OUT);
setTimeout(() => console.log('[Splash] Reveal from edges (inverted)'), TIMING.REVEAL_START);
setTimeout(() => console.log('[Splash] Animation complete (5s)'), TIMING.TOTAL_DURATION);
