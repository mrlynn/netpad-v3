# Creating a Favicon from the Logo

This guide explains how to create a favicon.ico and related icon files from `logo-300px.png`.

## Quick Options

### Option 1: Online Tool (Easiest)
1. Go to [favicon.io/favicon-converter/](https://favicon.io/favicon-converter/)
2. Upload `public/logo-300px.png`
3. Download the generated files
4. Place `favicon.ico` in the `public/` folder
5. The tool will also generate other sizes you can use

### Option 2: Using ImageMagick (Command Line)
If you have ImageMagick installed:

```bash
# Generate different sizes
convert public/logo-300px.png -resize 16x16 public/favicon-16x16.png
convert public/logo-300px.png -resize 32x32 public/favicon-32x32.png
convert public/logo-300px.png -resize 180x180 public/apple-touch-icon.png

# Create favicon.ico (multi-size ICO file)
convert public/favicon-16x16.png public/favicon-32x32.png public/favicon.ico

# For Next.js app directory, also create icon.png
convert public/logo-300px.png -resize 32x32 src/app/icon.png
```

### Option 3: Using the Script
If you have ImageMagick installed:

```bash
node scripts/generate-favicon-simple.js
```

Or if you install sharp:

```bash
npm install --save-dev sharp @types/sharp
npx tsx scripts/generate-favicon.ts
```

## File Locations

For Next.js 13+ with App Router:

- **`src/app/icon.png`** - Next.js will automatically use this (32x32 recommended)
- **`public/favicon.ico`** - Traditional favicon (16x16, 32x32, 48x48)
- **`public/favicon-16x16.png`** - Modern browsers
- **`public/favicon-32x32.png`** - Modern browsers
- **`public/apple-touch-icon.png`** - iOS home screen (180x180)

## Next.js Automatic Detection

Next.js 13+ automatically detects:
- `src/app/icon.png` or `src/app/icon.ico` - Used as the favicon
- `src/app/apple-icon.png` - Used for Apple touch icon

The metadata in `src/app/layout.tsx` is already configured to reference these files.

## Testing

After generating the favicon:
1. Restart your Next.js dev server
2. Check the browser tab - you should see the favicon
3. Clear browser cache if it doesn't appear immediately
