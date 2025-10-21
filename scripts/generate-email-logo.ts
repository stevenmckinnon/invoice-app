/**
 * Generate WWE logo PNG for email templates
 * This script creates a 128x128 PNG with the WWE logo in white on red background
 * 
 * Run this script when:
 * - You need to regenerate the email logo
 * - Brand colors have changed
 * - Logo design needs updating
 * 
 * Usage: npx tsx scripts/generate-email-logo.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

// SVG content with red background
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- Red background -->
  <rect width="128" height="128" fill="#cf1736" rx="16"/>
  
  <!-- WWE Logo in white, centered and scaled -->
  <g transform="translate(32, 32) scale(2.67)">
    <path fill="#ffffff" d="M24 1.047L15.67 18.08l-3.474-8.53-3.474 8.53L.393 1.048l3.228 8.977 3.286 8.5C3.874 19.334 1.332 20.46 0 21.75c.443-.168 3.47-1.24 7.409-1.927l1.21 3.129 1.552-3.518a36.769 36.769 0 0 1 3.96-.204l1.644 3.722 1.4-3.62c2.132.145 3.861.426 4.675.692 0 0 .92-1.962 1.338-2.866a54.838 54.838 0 0 0-5.138-.092l2.722-7.042zm-21.84.026L8.64 13.86l3.568-9.155 3.567 9.155 6.481-12.788-6.433 8.452-3.615-8.22-3.615 8.22zm10.036 13.776l1.115 2.523a42.482 42.482 0 0 0-2.363.306Z"/>
  </g>
</svg>`;

const generateLogos = async () => {
  const publicDir = path.join(process.cwd(), 'public');
  const svgPath = path.join(publicDir, 'email-logo.svg');
  const pngPath = path.join(publicDir, 'email-logo.png');

  // Write SVG file
  fs.writeFileSync(svgPath, svgContent);
  console.log('✅ Generated email logo SVG at:', svgPath);

  // Convert to PNG
  console.log('\n🔄 Converting to PNG...');
  await sharp(Buffer.from(svgContent))
    .png()
    .toFile(pngPath);

  console.log('✅ Generated email logo PNG at:', pngPath);
  console.log('\n📊 Image details:');
  console.log('   - Size: 128x128 pixels');
  console.log('   - Background: Red (#cf1736)');
  console.log('   - Logo: White');
  console.log('   - Format: PNG with transparency support');
};

generateLogos().catch(console.error);

