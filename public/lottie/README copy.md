# NetPad Logo - Lottie Animations

## Files

| File | Animation | Duration | Loop |
|------|-----------|----------|------|
| `netpad-v2-entrance.json` | Fade + scale bounce entrance | 2s | No |
| `netpad-v2-pulse.json` | Breathing/heartbeat effect | 2s | Yes |
| `netpad-v2-writing.json` | Subtle rotation oscillation | 1.5s | Yes |

## Usage

### React
```jsx
import Lottie from 'lottie-react';
import pulseAnimation from './netpad-v2-pulse.json';

function Logo() {
  return <Lottie animationData={pulseAnimation} loop />;
}
```

### Vanilla JS
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
<div id="logo"></div>
<script>
lottie.loadAnimation({
  container: document.getElementById('logo'),
  path: './netpad-v2-pulse.json',
  loop: true,
  autoplay: true
});
</script>
```
