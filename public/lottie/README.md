# NetPad Logo - Lottie Animations

## Files Included

| File | Description | Duration | Loop |
|------|-------------|----------|------|
| `netpad-entrance.json` | Staggered fade + scale entrance | 2s | No |
| `netpad-writing-loop.json` | Pencil writing motion | 1.5s | Yes |
| `netpad-pulse-loop.json` | Gentle breathing effect | 2s | Yes |
| `netpad-logo-final.svg` | Source vector file | — | — |

## Quick Start

### HTML/Vanilla JS

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
<div id="logo" style="width: 200px; height: 200px;"></div>
<script>
  lottie.loadAnimation({
    container: document.getElementById('logo'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: './netpad-pulse-loop.json'
  });
</script>
```

### React

```bash
npm install lottie-react
```

```jsx
import Lottie from 'lottie-react';
import pulseAnimation from './netpad-pulse-loop.json';

function Logo() {
  return <Lottie animationData={pulseAnimation} loop={true} />;
}
```

### React Native

```bash
npm install lottie-react-native
```

```jsx
import LottieView from 'lottie-react-native';

<LottieView
  source={require('./netpad-pulse-loop.json')}
  autoPlay
  loop
/>
```

## Animation Details

- **Frame Rate**: 60fps
- **Canvas Size**: 512 × 512px
- **Layers**: 5 (robot-shield, pencil-tip, pencil-body, pencil-ferrule, pencil-eraser)

## Customization

Edit these files at [LottieFiles Editor](https://lottiefiles.com/editor) to:
- Adjust timing and easing
- Change colors
- Add additional effects
