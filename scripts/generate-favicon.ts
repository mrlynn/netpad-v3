/**
 * Script to generate favicon.ico from logo-300px.png
 * 
 * Usage:
 *   npx tsx scripts/generate-favicon.ts
 * 
 * Requirements:
 *   npm install --save-dev sharp @types/sharp
 */

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generateFavicon() {
  const inputPath = join(process.cwd(), 'public', 'logo-300px.png');
  const outputPath = join(process.cwd(), 'public', 'favicon.ico');
  const appIconPath = join(process.cwd(), 'src', 'app', 'icon.png');

  try {
    console.log('Generating favicon from logo...');
    
    // Generate favicon.ico (16x16, 32x32, 48x48 sizes in one ICO file)
    // Note: sharp doesn't directly support ICO format, so we'll create PNGs
    // and provide instructions for ICO conversion, or use a different approach
    
    // For Next.js app directory, we can use icon.png (PNG format is fine)
    // Generate 32x32 icon for app directory
    await sharp(inputPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(appIconPath);
    
    console.log(`✓ Created ${appIconPath} (32x32)`);
    
    // Also create a 16x16 version for the public folder
    await sharp(inputPath)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(join(process.cwd(), 'public', 'favicon-16x16.png'));
    
    console.log(`✓ Created public/favicon-16x16.png (16x16)`);
    
    // Create 32x32 version for public folder
    await sharp(inputPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(join(process.cwd(), 'public', 'favicon-32x32.png'));
    
    console.log(`✓ Created public/favicon-32x32.png (32x32)`);
    
    // Create apple-touch-icon (180x180)
    await sharp(inputPath)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(join(process.cwd(), 'public', 'apple-touch-icon.png'));
    
    console.log(`✓ Created public/apple-touch-icon.png (180x180)`);
    
    console.log('\n✓ Favicon generation complete!');
    console.log('\nNote: For a true .ico file, you can:');
    console.log('  1. Use an online converter (e.g., https://convertio.co/png-ico/)');
    console.log('  2. Use ImageMagick: convert favicon-32x32.png favicon.ico');
    console.log('  3. Next.js will automatically use icon.png from the app directory');
    
  } catch (error) {
    console.error('Error generating favicon:', error);
    process.exit(1);
  }
}

generateFavicon();
