// Build script for Netlify and production deployment
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const assetsDir = path.join(publicDir, 'assets');

console.log('⚡ Starting build for production deployment...');

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
  const src = path.join(__dirname, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file} -> public/${file}`);
  }
});

// Copy assets
const srcAssets = path.join(__dirname, 'assets');
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
