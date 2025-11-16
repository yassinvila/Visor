# Visor Splash Animation

Beautiful startup loading sequence for the Visor app.

## Animation Sequence

1. **White Box Expansion** (1.2s)
   - Small white box appears in center (100×100px)
   - Smoothly expands to fill entire screen
   - Uses cubic-bezier easing for smooth animation

2. **Text Fade In** (0.8s)
   - "VISOR" text fades in at center
   - Subtle scale animation for polish

3. **Text Display** (1.2s)
   - Text remains visible

4. **Text Fade Out** (0.6s)
   - Text fades out with slight scale

5. **Reveal Circle** (2s)
   - Transparent circle starts from center
   - Expands outward revealing the app beneath
   - Soft semi-transparent border edge
   - White background fades as circle expands

**Total Duration:** ~5.5 seconds

## Files

- `electron-main/windows/splashWindow.js` - Window creation logic
- `renderer/splash/splash.html` - HTML structure
- `renderer/splash/splash.css` - Styles and animations
- `renderer/splash/splash.js` - Animation sequence controller
- `test-splash.js` - Standalone test script

## Usage

### In Full App

The splash is automatically shown on app startup. Main windows appear after the animation completes.

### Testing Standalone

```bash
# Test just the splash animation
npm start test-splash.js
# or
electron test-splash.js
```

### Customization

Edit timing constants in `renderer/splash/splash.js`:

```javascript
const TIMING = {
  BOX_EXPAND: 1200,      // Box expansion duration
  TEXT_FADE_IN: 800,     // Text fade in duration
  TEXT_DISPLAY: 1200,    // How long text stays visible
  TEXT_FADE_OUT: 600,    // Text fade out duration
  REVEAL_EXPAND: 2000,   // Reveal circle expansion
  TOTAL_DURATION: 5500   // Total duration
};
```

Edit visual styles in `renderer/splash/splash.css`:

```css
#white-box {
  width: 100px;        /* Initial box size */
  height: 100px;
  border-radius: 8px;  /* Initial corner radius */
}

#visor-text {
  font-size: 72px;     /* Text size */
  letter-spacing: 8px; /* Letter spacing */
  color: #1a1a1a;      /* Text color */
}
```

## Technical Details

### Transparent Reveal Effect

The expanding transparent circle uses CSS `mask-image` with a radial gradient:

```javascript
// Creates expanding transparency from center
whiteBox.style.maskImage = 
  `radial-gradient(circle at center, 
    transparent ${circleSize}%, 
    white ${circleSize + softEdge}%)`;
```

### Smooth Easing

All animations use `cubic-bezier(0.4, 0, 0.2, 1)` for professional motion feel.

### Performance

- Uses CSS transforms (hardware accelerated)
- RequestAnimationFrame for smooth 60fps
- No layout thrashing or reflows

## Integration

The splash integrates with main.js:

1. `app.whenReady()` creates splash window
2. Splash animation runs automatically
3. When complete, fires `splash:complete` IPC event
4. Main process closes splash and creates main windows
5. macOS activation handler re-shows splash if needed
