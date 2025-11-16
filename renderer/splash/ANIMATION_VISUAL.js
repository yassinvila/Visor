/**
 * VISOR Splash Animation - Visual Timeline
 * 
 * Frame-by-frame visualization of the animation sequence
 */

/*
═══════════════════════════════════════════════════════════════
PHASE 1: WHITE BOX EXPANSION (0ms - 1200ms)
═══════════════════════════════════════════════════════════════

0ms:              600ms:            1200ms:
┌────────┐        ┌──────────┐      ┌────────────┐
│        │        │          │      │            │
│  ┌─┐   │   →    │   ┌──┐   │  →   │            │
│  └─┘   │        │   └──┘   │      │            │
│        │        │          │      │            │
└────────┘        └──────────┘      └────────────┘
  100x100          ~500x500         Full Screen
  8px radius       4px radius       0px radius


═══════════════════════════════════════════════════════════════
PHASE 2: TEXT FADE IN (1400ms - 2200ms)
═══════════════════════════════════════════════════════════════

1400ms:           1800ms:           2200ms:
┌────────────┐    ┌────────────┐    ┌────────────┐
│            │    │            │    │            │
│            │    │            │    │   VISOR    │
│            │    │   V I S    │    │            │
│            │    │            │    │            │
└────────────┘    └────────────┘    └────────────┘
opacity: 0        opacity: 0.5      opacity: 1
scale: 0.95       scale: 0.97       scale: 1


═══════════════════════════════════════════════════════════════
PHASE 3: TEXT DISPLAY (2200ms - 3400ms)
═══════════════════════════════════════════════════════════════

2200ms - 3400ms:
┌────────────┐
│            │
│   VISOR    │  ← Text stays visible
│            │
│            │
└────────────┘
opacity: 1
(steady state)


═══════════════════════════════════════════════════════════════
PHASE 4: TEXT FADE OUT (3400ms - 4000ms)
═══════════════════════════════════════════════════════════════

3400ms:           3700ms:           4000ms:
┌────────────┐    ┌────────────┐    ┌────────────┐
│            │    │            │    │            │
│   VISOR    │    │   V I S    │    │            │
│            │    │            │    │            │
│            │    │            │    │            │
└────────────┘    └────────────┘    └────────────┘
opacity: 1        opacity: 0.5      opacity: 0
scale: 1          scale: 1.02       scale: 1.05


═══════════════════════════════════════════════════════════════
PHASE 5: REVEAL CIRCLE (4300ms - 6300ms)
═══════════════════════════════════════════════════════════════

4300ms:           5000ms:           5800ms:           6300ms:
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│            │    │            │    │ ░░░░░░░░░░ │    │            │
│     ●      │    │    ╱──╲    │    │░          ░│    │  [App BG]  │
│            │    │   │    │   │    │░  [App]   ░│    │            │
│            │    │    ╲__╱    │    │░          ░│    │  Visible   │
└────────────┘    └────────────┘    └─░░░░░░░░░░─┘    └────────────┘
   0px dia          400px dia         1200px dia       Full Screen
   ░ = soft edge    ░ = soft edge     ░ = soft edge    Fully transparent
   white BG         white + transp    mostly transp    App showing


KEY:
━━━  White background
░░░  Semi-transparent soft edge
[ ]  Transparent area (app visible through)
●    Tiny circle (invisible initially)


═══════════════════════════════════════════════════════════════
TECHNICAL IMPLEMENTATION
═══════════════════════════════════════════════════════════════

CSS Mask Gradient (Phase 5):
```css
mask-image: radial-gradient(
  circle at center,
  transparent 0%,      ← Inner (fully transparent)
  transparent 50%,     ← Grows from 0→150%
  white 60%            ← Outer edge (soft transition)
);
```

Timeline Summary:
─────────────────────────────────────────────────────────────
0ms          1200ms      2200ms  3400ms 4000ms     6300ms
│             │           │       │      │          │
│ Box Expand  │  Text In  │ Hold  │ Out  │  Reveal  │ Done
│◄───────────►│◄─────────►│◄─────►│◄────►│◄────────►│
  1200ms        800ms      1200ms  600ms    2000ms
─────────────────────────────────────────────────────────────
                        5500ms Total


═══════════════════════════════════════════════════════════════
ANIMATION CURVES
═══════════════════════════════════════════════════════════════

All animations use: cubic-bezier(0.4, 0, 0.2, 1)

Progress curve:
  1.0 │           ╭────
      │         ╱
  0.5 │       ╱
      │     ╱
  0.0 │───╯
      └───────────────
      0    0.5    1.0
          Time

Properties:
- Slow start (ease-out beginning)
- Fast middle
- Slow end (ease-in finish)
- Natural, organic motion
- Matches Material Design standard easing


═══════════════════════════════════════════════════════════════
TRANSPARENCY EFFECT BREAKDOWN
═══════════════════════════════════════════════════════════════

White Box Layer Structure:
┌─────────────────────────────────────┐
│  Window (transparent background)    │
│  ┌───────────────────────────────┐  │
│  │  White Box (solid white)      │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  Mask (radial gradient) │  │  │
│  │  │    - Center: transparent│  │  │
│  │  │    - Edge: opaque       │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

Result:
- White box starts fully opaque
- Mask creates transparent hole in center
- Hole expands outward
- App window visible through transparent area
- Soft edge creates smooth border
- Eventually entire splash becomes transparent

*/

console.log('This file is for documentation only - see visual ASCII art above');
