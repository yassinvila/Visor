/**
 * refreshAppIcon.js — Regenerates a valid PNG at assets/icons/appIcon.png
 * Useful if the icon file is corrupt or missing.
 */

const fs = require('fs');
const path = require('path');

// 1x1 transparent PNG (valid)
const BASE64_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

function main() {
  const outDir = path.resolve(__dirname, '..', 'assets', 'icons');
  const outPath = path.join(outDir, 'appIcon.png');

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const buf = Buffer.from(BASE64_PNG, 'base64');
  fs.writeFileSync(outPath, buf);
  console.log(`✓ Wrote valid PNG icon: ${outPath} (${buf.length} bytes)`);
}

main();
