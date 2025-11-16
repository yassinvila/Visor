# Apple-Inspired Bezel SVG Collection

High-fidelity, scalable vector bezels following Apple's industrial design language.

## 📐 Included Designs

### 1. **apple-bezel.svg** (Light/Silver)
Premium aluminum finish with subtle gradients and chamfered edges.

**Style:**
- Silver/aluminum gradient
- Soft shadows and highlights
- Polished metal appearance
- Aspect ratio: 3:2 (1200×800)
- Corner radius: 64px (iPhone/iPad-like)

**Best for:**
- Light mode splash screens
- Premium product presentations
- MacBook/iPad aesthetic

---

### 2. **apple-bezel-dark.svg** (Space Gray/Midnight)
Dark variant with anodized aluminum look.

**Style:**
- Space Gray to Midnight gradient
- Deeper shadows
- OLED black screen area
- Aspect ratio: 3:2 (1200×800)
- Corner radius: 64px

**Best for:**
- Dark mode splash screens
- iPhone Pro/Apple Watch aesthetic
- Night-time interfaces

---

### 3. **apple-bezel-minimal.svg** (Ultra-Clean)
Simplified iOS-style bezel with minimal details.

**Style:**
- Pure white/soft gradient
- Thin bezel (12px width)
- Ultra-soft shadows
- Aspect ratio: 10:7 (1000×700)
- Corner radius: 52px

**Best for:**
- iOS splash screens
- Clean, modern interfaces
- Focus on content over frame

---

## 🎨 Design Features

### All Bezels Include:
- ✅ Smooth rounded corners (Apple-style radius)
- ✅ Subtle chamfering and edge highlights
- ✅ Soft, diffused shadows
- ✅ Premium gradient fills
- ✅ Inner screen cutout (black area for content)
- ✅ Scalable vector format (infinite resolution)
- ✅ Clean, minimalistic appearance

### Technical Specs:
- **Format:** SVG (Scalable Vector Graphics)
- **Color space:** RGB
- **Gradients:** Linear gradients for depth
- **Filters:** Gaussian blur for soft shadows
- **Stroke width:** Sub-pixel precision (0.5px)
- **Preserves aspect ratio:** Yes

---

## 💻 Usage Examples

### **1. As Splash Screen Background**

```html
<!-- In splash.html -->
<div id="splash-container">
  <img src="apple-bezel.svg" class="bezel-frame" />
  <div class="content">
    <!-- Your content here -->
  </div>
</div>
```

```css
.bezel-frame {
  position: absolute;
  width: 90vw;
  height: auto;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
}
```

---

### **2. As CSS Background**

```css
.splash-container {
  background-image: url('apple-bezel.svg');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
```

---

### **3. Inline in React/HTML**

```javascript
import AppleBezel from './apple-bezel.svg';

function SplashScreen() {
  return (
    <div className="splash">
      <img src={AppleBezel} alt="" />
    </div>
  );
}
```

---

### **4. As SVG Component**

```javascript
// Copy SVG content directly into JSX
export function BezelFrame() {
  return (
    <svg viewBox="0 0 1200 800" className="bezel">
      {/* SVG content */}
    </svg>
  );
}
```

---

## 🎯 Customization

### **Change Corner Radius:**
Find `rx="64" ry="64"` and modify values (e.g., `rx="48"` for tighter corners)

### **Adjust Bezel Thickness:**
Modify the inner rectangle position:
```svg
<!-- Thicker bezel: increase offset -->
<rect x="80" y="80" width="1040" height="640" rx="48" ry="48"/>

<!-- Thinner bezel: decrease offset -->
<rect x="50" y="50" width="1100" height="700" rx="48" ry="48"/>
```

### **Change Colors:**
Modify gradient stop colors:
```svg
<linearGradient id="bezelGradient">
  <stop offset="0%" style="stop-color:#YOUR_COLOR"/>
  <stop offset="100%" style="stop-color:#YOUR_COLOR"/>
</linearGradient>
```

### **Aspect Ratios:**
Change `viewBox` to match your needs:
- 16:9 → `viewBox="0 0 1600 900"`
- 4:3 → `viewBox="0 0 1200 900"`
- Square → `viewBox="0 0 1000 1000"`

---

## 📏 Dimensions Reference

| Bezel | ViewBox | Aspect | Frame Width | Corner Radius |
|-------|---------|--------|-------------|---------------|
| Light | 1200×800 | 3:2 | 20px | 64px |
| Dark | 1200×800 | 3:2 | 20px | 64px |
| Minimal | 1000×700 | 10:7 | 12px | 52px |

---

## 🎨 Color Palette

### Light Bezel:
- Primary: `#f5f5f7` (Apple Silver)
- Highlight: `#fafafa` (Polished Top)
- Shadow: `#e8e8ed` (Subtle Base)
- Screen: `#000000` (95% opacity)

### Dark Bezel:
- Primary: `#2c2c2e` (Space Gray)
- Highlight: `#3a3a3c` (Top Edge)
- Shadow: `#1c1c1e` (Midnight)
- Screen: `#000000` (Pure OLED)

### Minimal:
- Primary: `#ffffff` (Pure White)
- Subtle: `#f8f8f8` (Soft Gradient)
- Screen: `#000000` (Pure Black)

---

## 🚀 Integration with Visor Splash

To use these bezels in your splash animation:

1. **Add bezel as background layer:**
   ```html
   <!-- In splash.html -->
   <div id="bezel-frame">
     <img src="apple-bezel.svg" />
   </div>
   <div id="splash-container">
     <!-- Existing splash content -->
   </div>
   ```

2. **Style for proper layering:**
   ```css
   #bezel-frame {
     position: fixed;
     top: 0;
     left: 0;
     width: 100vw;
     height: 100vh;
     display: flex;
     align-items: center;
     justify-content: center;
     z-index: 1;
   }
   
   #bezel-frame img {
     width: 85vw;
     height: auto;
     pointer-events: none;
   }
   ```

3. **Ensure splash content appears inside bezel:**
   Position your content to match the inner screen area.

---

## 📱 Responsive Behavior

All bezels are fully responsive:
- **Desktop:** Scales to fit viewport
- **Tablet:** Maintains aspect ratio
- **Mobile:** Adapts to screen size
- **High-DPI:** Crisp on Retina displays

---

## ✨ Advanced Techniques

### **Animated Bezel Entrance:**
```css
@keyframes bezelFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.bezel-frame {
  animation: bezelFadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### **Glowing Effect:**
```css
.bezel-frame {
  filter: drop-shadow(0 0 40px rgba(255,255,255,0.1));
}
```

---

## 🎯 Design Philosophy

These bezels follow Apple's core design principles:

1. **Simplicity** — Clean, uncluttered appearance
2. **Attention to Detail** — Subtle gradients and highlights
3. **Premium Materials** — Aluminum/glass appearance
4. **Functional Beauty** — Frame enhances, doesn't distract
5. **Consistency** — Familiar Apple aesthetic across devices

---

**Created for:** Visor Splash Animation  
**Style Reference:** iOS, iPadOS, macOS  
**Format:** SVG (Scalable Vector Graphics)  
**License:** Use freely within Visor project
