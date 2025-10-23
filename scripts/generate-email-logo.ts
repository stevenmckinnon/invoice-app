/**
 * Generate Caley logo PNG for email templates
 * This script creates a 128x128 PNG with the Caley logo in white on blue background
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

// Read the actual email-logo.svg file content
const svgFilePath = path.join(process.cwd(), 'public', 'email-logo.svg');
const svgContent = fs.readFileSync(svgFilePath, 'utf8');

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

