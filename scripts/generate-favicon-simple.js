/**
 * Simple script to generate favicon files from logo-300px.png
 * 
 * This script uses Node.js built-in modules and doesn't require sharp.
 * However, it requires ImageMagick's 'convert' command to be installed.
 * 
 * Alternative: Use online tools like:
 * - https://favicon.io/favicon-converter/
 * - https://convertio.co/png-ico/
 * - https://realfavicongenerator.net/
 * 
 * Usage:
 *   node scripts/generate-favicon-simple.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public');
const appDir = path.join(process.cwd(), 'src', 'app');
const logoPath = path.join(publicDir, 'logo-300px.png');

function checkImageMagick() {
  try {
    execSync('which convert', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function generateWithImageMagick() {
  if (!fs.existsSync(logoPath)) {
    console.error(`Error: ${logoPath} not found`);
    process.exit(1);
  }

  console.log('Generating favicon files using ImageMagick...\n');

  const sizes = [
    { size: 16, name: 'favicon-16x16.png', dir: publicDir },
    { size: 32, name: 'favicon-32x32.png', dir: publicDir },
    { size: 180, name: 'apple-touch-icon.png', dir: publicDir },
    { size: 32, name: 'icon.png', dir: appDir },
  ];

  sizes.forEach(({ size, name, dir }) => {
    const outputPath = path.join(dir, name);
    try {
      execSync(
        `convert "${logoPath}" -resize ${size}x${size} -background transparent -gravity center -extent ${size}x${size} "${outputPath}"`,
        { stdio: 'inherit' }
      );
      console.log(`✓ Created ${outputPath} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to create ${outputPath}:`, error.message);
    }
  });

  // Create favicon.ico from 32x32
  const favicon32Path = path.join(publicDir, 'favicon-32x32.png');
  const faviconIcoPath = path.join(publicDir, 'favicon.ico');
  
  try {
    execSync(
      `convert "${favicon32Path}" "${faviconIcoPath}"`,
      { stdio: 'inherit' }
    );
    console.log(`✓ Created ${faviconIcoPath}`);
  } catch (error) {
    console.error(`✗ Failed to create favicon.ico:`, error.message);
  }

  console.log('\n✓ Favicon generation complete!');
}

// Main
if (checkImageMagick()) {
  generateWithImageMagick();
} else {
  console.log('ImageMagick not found. Please use one of these options:\n');
  console.log('Option 1: Install ImageMagick');
  console.log('  macOS: brew install imagemagick');
  console.log('  Linux: sudo apt-get install imagemagick');
  console.log('  Windows: Download from https://imagemagick.org/\n');
  
  console.log('Option 2: Use online tools');
  console.log('  1. Go to https://favicon.io/favicon-converter/');
  console.log('  2. Upload public/logo-300px.png');
  console.log('  3. Download the generated files');
  console.log('  4. Place favicon.ico in public/ folder');
  console.log('  5. Place icon.png (32x32) in src/app/ folder\n');
  
  console.log('Option 3: Use sharp (requires npm install)');
  console.log('  npm install --save-dev sharp');
  console.log('  npx tsx scripts/generate-favicon.ts\n');
}
