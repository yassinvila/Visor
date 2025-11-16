/**
 * storage.js — Persistent JSON storage for sessions, steps, chat, settings, errors.
 *
 * Stores data under userData/visor/ (or VISOR_DATA_PATH if set).
 * Supports two modes:
 *  - Legacy: Single JSON files (default)
 *  - Structured: Organized directories with JSONL format (VISOR_STRUCTURED_LOGS=true)
 * 
 * Public API: init, saveSession, loadSession, listSessions, logStep, loadStepLogs,
 *             saveChatMessage, loadChatHistory, saveSettings, loadSettings, logError, clearAll, getStats
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');

const { app } = (() => {
  try {
    return require('electron');
  } catch (e) {
    return {};
  }
})();

// Compute data directory
const DATA_DIR = (() => {
  if (process.env.VISOR_DATA_PATH) return process.env.VISOR_DATA_PATH;
  if (app && app.getPath) return path.join(app.getPath('userData'), 'visor');
  return path.join(os.homedir() || '.', '.visor');
})();

// Subdirectories for structured logging
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const ERRORS_DIR = path.join(DATA_DIR, 'errors');

// Legacy file paths
const FILES = {
  sessions: 'sessions.json',
  steps: 'steps.json',
  chat: 'chat.json',
  settings: 'settings.json',
  errors: 'errors.json'
};

// Configuration
const USE_STRUCTURED_LOGS = process.env.VISOR_STRUCTURED_LOGS === 'true';
const MAX_LOG_SIZE_MB = parseInt(process.env.VISOR_MAX_LOG_SIZE_MB) || 10;
const MAX_LOG_FILES = parseInt(process.env.VISOR_MAX_LOG_FILES) || 30;

async function ensureDir() {
  try {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

/**
 * Get current date string for log files (YYYY-MM-DD)
 */
function getDateString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current timestamp string for log entries
 */
function getTimestamp() {
  return new Date().toISOString();
}

async function readJSON(name, defaultValue = []) {
  const file = path.join(DATA_DIR, FILES[name]);
  try {
    const raw = await fsPromises.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

async function writeJSON(name, data) {
  const file = path.join(DATA_DIR, FILES[name]);
  const tmp = `${file}.tmp`;
  await fsPromises.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fsPromises.rename(tmp, file);
}

async function init() {
  await ensureDir();
  
  if (USE_STRUCTURED_LOGS) {
    // Create structured directories
    await fsPromises.mkdir(SESSIONS_DIR, { recursive: true });
    await fsPromises.mkdir(LOGS_DIR, { recursive: true });
    await fsPromises.mkdir(ERRORS_DIR, { recursive: true });
    console.log(`[Storage] Initialized with structured logging at ${DATA_DIR}`);
    
    // Cleanup old logs
    await cleanupOldLogs();
  } else {
    // Ensure legacy files exist (write defaults if missing)
    await Promise.all([
      writeJSON('sessions', await readJSON('sessions', [])),
      writeJSON('steps', await readJSON('steps', [])),
      writeJSON('chat', await readJSON('chat', [])),
      writeJSON('settings', await readJSON('settings', {})),
      writeJSON('errors', await readJSON('errors', []))
    ]);
    console.log(`[Storage] Initialized at ${DATA_DIR}`);
  }
}

// Sessions
async function saveSession(session) {
  if (USE_STRUCTURED_LOGS) {
    // Save as individual file
    const sessionFile = path.join(SESSIONS_DIR, `${session.id}.json`);
    const data = {
      ...session,
      lastModified: getTimestamp()
    };
    await fsPromises.writeFile(sessionFile, JSON.stringify(data, null, 2));
    return session;
  } else {
    // Legacy: append to sessions array
    const sessions = await readJSON('sessions', []);
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = { ...sessions[idx], ...session };
    else sessions.push(session);
    await writeJSON('sessions', sessions);
    return session;
  }
}

async function loadSession(sessionId) {
  if (USE_STRUCTURED_LOGS) {
    const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);
    try {
      const content = await fsPromises.readFile(sessionFile, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  } else {
    const sessions = await readJSON('sessions', []);
    return sessions.find(s => s.id === sessionId) || null;
  }
}

async function listSessions() {
  if (USE_STRUCTURED_LOGS) {
    try {
      const files = await fsPromises.readdir(SESSIONS_DIR);
      const sessions = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fsPromises.readFile(path.join(SESSIONS_DIR, file), 'utf8');
          sessions.push(JSON.parse(content));
        }
      }
      return sessions.sort((a, b) => 
        new Date(b.lastModified || 0) - new Date(a.lastModified || 0)
      );
    } catch (e) {
      return [];
    }
  } else {
    return await readJSON('sessions', []);
  }
}

/**
 * Rotate log file if it exceeds max size
 */
async function rotateLogIfNeeded(logFile) {
  try {
    const stats = await fsPromises.stat(logFile);
    const sizeMB = stats.size / (1024 * 1024);
    
    if (sizeMB > MAX_LOG_SIZE_MB) {
      const timestamp = Date.now();
      const rotatedFile = logFile.replace('.jsonl', `.${timestamp}.jsonl`);
      await fsPromises.rename(logFile, rotatedFile);
      console.log(`[Storage] Rotated log file: ${path.basename(rotatedFile)}`);
    }
  } catch (error) {
    // File might not exist yet, ignore
  }
}

/**
 * Cleanup old log files (keep only MAX_LOG_FILES most recent)
 */
async function cleanupOldLogs() {
  try {
    const dirs = [LOGS_DIR, ERRORS_DIR];
    
    for (const dir of dirs) {
      try {
        const files = await fsPromises.readdir(dir);
        const fileStats = await Promise.all(
          files
            .filter(f => f.endsWith('.jsonl'))
            .map(async f => {
              const filePath = path.join(dir, f);
              const stats = await fsPromises.stat(filePath);
              return { name: f, path: filePath, time: stats.mtime.getTime() };
            })
        );
        
        // Sort by time, newest first
        fileStats.sort((a, b) => b.time - a.time);
        
        // Delete files beyond MAX_LOG_FILES
        for (let i = MAX_LOG_FILES; i < fileStats.length; i++) {
          await fsPromises.unlink(fileStats[i].path);
          console.log(`[Storage] Deleted old log: ${fileStats[i].name}`);
        }
      } catch (e) {
        // Directory might not exist yet
      }
    }
  } catch (error) {
    console.error('[Storage] Failed to cleanup old logs:', error);
  }
}

// Steps (append-only)
async function logStep(sessionId, step, meta = {}) {
  const entry = {
    timestamp: getTimestamp(),
    sessionId,
    stepId: step.id || (meta.stepId || `s_${Date.now()}`),
    hintText: step.step_description || step.hintText || step.description || null,
    bbox: step.bbox || null,
    shape: step.shape || null,
    label: step.label || null,
    isFinal: !!step.is_final_step || !!step.isFinal,
    meta
  };
  
  if (USE_STRUCTURED_LOGS) {
    // Append to session's log file (JSONL format)
    const logFile = path.join(LOGS_DIR, `${sessionId}.jsonl`);
    await rotateLogIfNeeded(logFile);
    await fsPromises.appendFile(logFile, JSON.stringify(entry) + '\n');
  } else {
    // Legacy: append to steps array
    const steps = await readJSON('steps', []);
    steps.push(entry);
    await writeJSON('steps', steps);
  }
  
  return entry;
}

async function loadStepLogs(sessionId = null) {
  const steps = await readJSON('steps', []);
  return sessionId ? steps.filter(s => s.sessionId === sessionId) : steps;
}

// Chat
async function saveChatMessage(message) {
  const entry = {
    timestamp: getTimestamp(),
    id: message.id || `m_${Date.now()}`,
    role: message.role,
    text: message.text || message.content || '',
    sessionId: message.sessionId || null
  };

  if (USE_STRUCTURED_LOGS) {
    const dateStr = getDateString();
    const chatFile = path.join(LOGS_DIR, `chat-${dateStr}.jsonl`);
    await fsPromises.appendFile(chatFile, JSON.stringify(entry) + '\n');
    return entry;
  } else {
    const messages = await readJSON('chat', []);
    messages.push(entry);
    await writeJSON('chat', messages);
    return entry;
  }
}

async function loadChatHistory(sessionId, limit = 50) {
  if (USE_STRUCTURED_LOGS) {
    try {
      const files = await fsPromises.readdir(LOGS_DIR);
      const chatFiles = files
        .filter(f => f.startsWith('chat-') && f.endsWith('.jsonl'))
        .sort()
        .reverse();

      const messages = [];
      for (const file of chatFiles) {
        const content = await fsPromises.readFile(path.join(LOGS_DIR, file), 'utf8');
        const lines = content.trim().split('\n').reverse(); // Most recent first
        
        for (const line of lines) {
          if (!line) continue;
          try {
            const entry = JSON.parse(line);
            if (!sessionId || entry.sessionId === sessionId) {
              messages.push(entry);
            }
          } catch (e) {
            // Skip malformed lines
          }
          if (messages.length >= limit) break;
        }
        
        if (messages.length >= limit) break;
      }
      
      return messages.reverse().slice(-limit);
    } catch (e) {
      return [];
    }
  } else {
    const messages = await readJSON('chat', []);
    let filtered = messages;
    if (sessionId) {
      filtered = messages.filter(m => m.sessionId === sessionId);
    }
    return filtered.slice(-limit);
  }
}

// Clear chat history
async function clearChatHistory() {
  if (USE_STRUCTURED_LOGS) {
    try {
      const files = await fsPromises.readdir(LOGS_DIR);
      const chatFiles = files.filter(f => f.startsWith('chat-') && f.endsWith('.jsonl'));
      await Promise.all(
        chatFiles.map(f => fsPromises.unlink(path.join(LOGS_DIR, f)).catch(() => {}))
      );
      return true;
    } catch (e) {
      return false;
    }
  } else {
    await writeJSON('chat', []);
    return true;
  }
}

// Settings
async function saveSettings(obj) {
  const current = await readJSON('settings', {});
  const merged = { ...current, ...obj };
  await writeJSON('settings', merged);
  return merged;
}

async function loadSettings() {
  return await readJSON('settings', {});
}

// Errors (append)
// Errors (append-only)
async function logError(error) {
  const entry = {
    id: (error && error.id) || `e_${Date.now()}`,
    timestamp: getTimestamp(),
    message: error.message || String(error),
    stack: error.stack || null,
    type: error.name || 'Error'
  };

  if (USE_STRUCTURED_LOGS) {
    const dateStr = getDateString();
    const errorFile = path.join(ERRORS_DIR, `${dateStr}.jsonl`);
    await fsPromises.appendFile(errorFile, JSON.stringify(entry) + '\n');
    return entry;
  } else {
    const errors = await readJSON('errors', []);
    errors.push(entry);
    await writeJSON('errors', errors);
    return entry;
  }
}

// Utility: clear all (for tests)
// Utility
async function clearAll() {
  try {
    if (fs.existsSync(DATA_DIR)) {
      await fsPromises.rm(DATA_DIR, { recursive: true, force: true });
    }
    await init();
    return true;
  } catch (error) {
    console.error('[Storage] Failed to clear storage:', error);
    return false;
  }
}

/**
 * Get storage statistics
 */
async function getStats() {
  try {
    const stats = {
      dataDir: DATA_DIR,
      structuredLogs: USE_STRUCTURED_LOGS,
      totalSessions: 0,
      totalSteps: 0,
      totalChatMessages: 0,
      totalErrors: 0,
      diskUsageMB: 0
    };

    if (USE_STRUCTURED_LOGS) {
      try {
        const sessionFiles = await fsPromises.readdir(SESSIONS_DIR);
        stats.totalSessions = sessionFiles.filter(f => f.endsWith('.json')).length;
      } catch (e) {}
      
      // Count log entries
      try {
        const logFiles = await fsPromises.readdir(LOGS_DIR);
        for (const file of logFiles.filter(f => f.endsWith('.jsonl'))) {
          const content = await fsPromises.readFile(path.join(LOGS_DIR, file), 'utf8');
          const lines = content.trim().split('\n').filter(l => l);
          if (file.startsWith('chat-')) {
            stats.totalChatMessages += lines.length;
          } else {
            stats.totalSteps += lines.length;
          }
        }
      } catch (e) {}
      
      // Count errors
      try {
        const errorFiles = await fsPromises.readdir(ERRORS_DIR);
        for (const file of errorFiles.filter(f => f.endsWith('.jsonl'))) {
          const content = await fsPromises.readFile(path.join(ERRORS_DIR, file), 'utf8');
          stats.totalErrors += content.trim().split('\n').filter(l => l).length;
        }
      } catch (e) {}
    } else {
      // Legacy file counts
      try {
        const sessions = await readJSON('sessions', []);
        stats.totalSessions = sessions.length;
      } catch (e) {}
      
      try {
        const steps = await readJSON('steps', []);
        stats.totalSteps = steps.length;
      } catch (e) {}
      
      try {
        const chat = await readJSON('chat', []);
        stats.totalChatMessages = chat.length;
      } catch (e) {}
      
      try {
        const errors = await readJSON('errors', []);
        stats.totalErrors = errors.length;
      } catch (e) {}
    }

    // Calculate disk usage
    const getDirSize = async (dir) => {
      let size = 0;
      if (!fs.existsSync(dir)) return 0;
      try {
        const items = await fsPromises.readdir(dir, { withFileTypes: true });
        for (const item of items) {
          const itemPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            size += await getDirSize(itemPath);
          } else {
            const stats = await fsPromises.stat(itemPath);
            size += stats.size;
          }
        }
      } catch (e) {}
      return size;
    };
    
    const totalSize = await getDirSize(DATA_DIR);
    stats.diskUsageMB = (totalSize / (1024 * 1024)).toFixed(2);

    return stats;
  } catch (error) {
    console.error('[Storage] Failed to get stats:', error);
    return null;
  }
}

module.exports = {
  init,
  saveSession,
  loadSession,
  listSessions,
  logStep,
  loadStepLogs,
  saveChatMessage,
  loadChatHistory,
  clearChatHistory,
  saveSettings,
  loadSettings,
  logError,
  clearAll,
  getStats,
  _DATA_DIR: DATA_DIR
};
