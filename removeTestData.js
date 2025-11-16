/**
 * removeTestData.js — Cleanup script for test data directories
 * 
 * Run this after testing to remove temporary test files
 * Usage: node removeTestData.js
 */

const fs = require('fs');
const path = require('path');

const TEST_DIRECTORIES = [
  path.join(__dirname, 'test-data-temp'),
  path.join(__dirname, 'test-storage-verify'),
  path.join(__dirname, 'demo-logs')
];

function removeDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      // Show what's inside before deletion
      const items = fs.readdirSync(dirPath);
      const size = (getDirSize(dirPath) / 1024).toFixed(2);
      
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✓ Removed: ${dirPath}`);
      console.log(`  (${items.length} items, ${size} KB)`);
      return true;
    } else {
      console.log(`⚠ Not found: ${dirPath}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error removing ${dirPath}:`, error.message);
    return false;
  }
}

function getDirSize(dirPath) {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    const itemPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      size += getDirSize(itemPath);
    } else {
      size += fs.statSync(itemPath).size;
    }
  }
  return size;
}

console.log('🧹 Cleaning up test data directories...\n');

let removed = 0;
let notFound = 0;
let errors = 0;

TEST_DIRECTORIES.forEach(dir => {
  const result = removeDirectory(dir);
  if (result === true) removed++;
  else if (result === false) notFound++;
  else errors++;
});

console.log('\n' + '═'.repeat(50));
console.log('CLEANUP SUMMARY');
console.log('═'.repeat(50));
console.log(`✓ Removed: ${removed}`);
console.log(`⚠ Not found: ${notFound}`);
if (errors > 0) console.log(`✗ Errors: ${errors}`);
console.log('═'.repeat(50));

process.exit(errors > 0 ? 1 : 0);
