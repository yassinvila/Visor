/**
 * demo-structured-logs.js — Demonstrates the structured logging system
 * 
 * Run this to see how logs are organized with VISOR_STRUCTURED_LOGS=true
 * Usage: node demo-structured-logs.js
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Set env vars BEFORE requiring storage
process.env.VISOR_STRUCTURED_LOGS = 'true';
process.env.VISOR_DATA_PATH = path.join(__dirname, 'demo-logs');

const storage = require('./electron-main/services/storage');

async function demo() {
  console.log('🎯 Structured Logging Demo\n');
  
  console.log('Configuration:');
  console.log(`  VISOR_STRUCTURED_LOGS: ${process.env.VISOR_STRUCTURED_LOGS}`);
  console.log(`  VISOR_DATA_PATH: ${process.env.VISOR_DATA_PATH}`);
  console.log(`  VISOR_MAX_LOG_SIZE_MB: ${process.env.VISOR_MAX_LOG_SIZE_MB || '10'}`);
  console.log(`  VISOR_MAX_LOG_FILES: ${process.env.VISOR_MAX_LOG_FILES || '30'}\n`);
  
  // Initialize storage
  console.log('📦 Initializing storage...');
  await storage.init();
  console.log('✓ Storage initialized\n');
  
  // Create some sessions
  console.log('💾 Creating sample sessions...');
  await storage.saveSession({
    id: 'session-001',
    goal: 'Open Photoshop and create new document',
    status: 'in-progress',
    createdAt: new Date().toISOString()
  });
  
  await storage.saveSession({
    id: 'session-002',
    goal: 'Export video from Premiere Pro',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  });
  console.log('✓ Created 2 sessions\n');
  
  // Log some steps
  console.log('📝 Logging steps...');
  await storage.logStep('session-001', {
    id: 'step-1',
    step_description: 'Click File menu',
    shape: 'arrow',
    bbox: { x: 0.1, y: 0.05, width: 0.05, height: 0.03 },
    label: 'File'
  });
  
  await storage.logStep('session-001', {
    id: 'step-2',
    step_description: 'Select New from dropdown',
    shape: 'circle',
    bbox: { x: 0.12, y: 0.1, width: 0.06, height: 0.03 },
    label: 'New'
  });
  
  await storage.logStep('session-002', {
    id: 'step-1',
    step_description: 'Open File > Export > Media',
    shape: 'arrow',
    bbox: { x: 0.1, y: 0.05, width: 0.05, height: 0.03 },
    label: 'Export'
  });
  console.log('✓ Logged 3 steps\n');
  
  // Save chat messages
  console.log('💬 Saving chat messages...');
  await storage.saveChatMessage({
    role: 'user',
    content: 'How do I create a new document in Photoshop?',
    sessionId: 'session-001'
  });
  
  await storage.saveChatMessage({
    role: 'assistant',
    content: 'I\'ll guide you through creating a new document in Photoshop.',
    sessionId: 'session-001'
  });
  console.log('✓ Saved 2 chat messages\n');
  
  // Log some errors
  console.log('❌ Logging errors...');
  await storage.logError(new Error('Failed to capture screenshot'));
  await storage.logError(new Error('LLM API timeout'));
  console.log('✓ Logged 2 errors\n');
  
  // Save settings
  console.log('⚙️  Saving settings...');
  await storage.saveSettings({
    autoAdvance: true,
    theme: 'dark',
    pointerMode: 'passthrough'
  });
  console.log('✓ Settings saved\n');
  
  // Get statistics
  console.log('📊 Storage statistics:');
  const stats = await storage.getStats();
  console.log(`  Total sessions: ${stats.totalSessions}`);
  console.log(`  Total steps: ${stats.totalSteps}`);
  console.log(`  Total chat messages: ${stats.totalChatMessages}`);
  console.log(`  Total errors: ${stats.totalErrors}`);
  console.log(`  Disk usage: ${stats.diskUsageMB} MB`);
  console.log(`  Structured logs: ${stats.structuredLogs ? 'YES' : 'NO'}\n`);
  
  // Show directory structure
  console.log('📁 Directory structure:');
  showTree(process.env.VISOR_DATA_PATH, '', 0);
  
  console.log('\n✅ Demo complete!');
  console.log('\n💡 Tips:');
  console.log('  • Log files are in JSONL format (one JSON object per line)');
  console.log('  • Logs rotate automatically when they exceed 10MB');
  console.log('  • Old logs are cleaned up after 30 days');
  console.log('  • Each session has its own file in sessions/');
  console.log('  • Daily logs are in logs/ (steps and chat)');
  console.log('  • Errors are in errors/ by date');
  console.log('\n🧹 Run `node removeTestData.js` to clean up demo-logs/');
}

function showTree(dir, prefix = '', depth = 0) {
  if (depth > 3) return;
  
  try {
    const items = fs.readdirSync(dir);
    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      const isDir = stats.isDirectory();
      
      const connector = isLast ? '└── ' : '├── ';
      const size = isDir ? '' : ` (${(stats.size / 1024).toFixed(2)} KB)`;
      const icon = isDir ? '📁' : '📄';
      
      console.log(`${prefix}${connector}${icon} ${item}${size}`);
      
      if (isDir) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        showTree(itemPath, newPrefix, depth + 1);
      }
    });
  } catch (error) {
    console.error(`Error reading ${dir}:`, error.message);
  }
}

// Run demo
demo().catch(console.error);
