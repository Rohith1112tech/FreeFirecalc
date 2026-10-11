// Build script for Netlify and production deployment
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const assetsDir = path.join(publicDir, 'assets');

console.log('⚡ Starting build for production deployment...');
console.log('Source root directory:', rootDir);
console.log('Target public directory:', publicDir);

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Files to copy to public root
const rootFiles = ['index.html', 'style.css', 'app.js'];
rootFiles.forEach((file) => {
  const src = path.join(rootDir, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file} -> public/${file}`);
  } else {
    console.warn(`⚠️ File not found: ${src}`);
  }
});

// Copy assets
const srcAssets = path.join(rootDir, 'assets');
if (fs.existsSync(srcAssets)) {
  const files = fs.readdirSync(srcAssets);
  files.forEach((f) => {
    const src = path.join(srcAssets, f);
    const dest = path.join(assetsDir, f);
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied asset assets/${f} -> public/assets/${f}`);
  });
}

console.log('\n🎉 Build successful! Production bundle ready in /public folder.');
