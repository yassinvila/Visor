/**
 * storage.js — Persistent JSON storage for sessions, steps, chat, settings, errors.
 *
 * Stores data under userData/visor/ (or VISOR_DATA_PATH if set).
 * Public API: init, saveSession, loadSession, listSessions, logStep, loadStepLogs,
 *             saveChatMessage, loadChatHistory, saveSettings, loadSettings, logError, clearAll
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const { app } = (() => {
  try {
    return require('electron');
  } catch (e) {
    return {};
  }
})();

const DATA_DIR = (() => {
  if (process.env.VISOR_DATA_PATH) return process.env.VISOR_DATA_PATH;
  if (app && app.getPath) return path.join(app.getPath('userData'), 'visor');
  return path.join(os.homedir() || '.', '.visor');
})();

const FILES = {
  sessions: 'sessions.json',
  steps: 'steps.json',
  chat: 'chat.json',
  settings: 'settings.json',
  errors: 'errors.json'
};

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function readJSON(name, defaultValue = []) {
  const file = path.join(DATA_DIR, FILES[name]);
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

async function writeJSON(name, data) {
  const file = path.join(DATA_DIR, FILES[name]);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

async function init() {
  await ensureDir();
  // Ensure files exist (write defaults if missing)
  await Promise.all([
    writeJSON('sessions', await readJSON('sessions', [])),
    writeJSON('steps', await readJSON('steps', [])),
    writeJSON('chat', await readJSON('chat', [])),
    writeJSON('settings', await readJSON('settings', {})),
    writeJSON('errors', await readJSON('errors', []))
  ]);
}

// Sessions
async function saveSession(session) {
  const sessions = await readJSON('sessions', []);
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) sessions[idx] = { ...sessions[idx], ...session };
  else sessions.push(session);
  await writeJSON('sessions', sessions);
  return session;
}

async function loadSession(sessionId) {
  const sessions = await readJSON('sessions', []);
  return sessions.find(s => s.id === sessionId) || null;
}

async function listSessions() {
  return await readJSON('sessions', []);
}

// Steps (append-only)
async function logStep(sessionId, step, meta = {}) {
  const steps = await readJSON('steps', []);
  const entry = {
    sessionId,
    stepId: step.id || (meta.stepId || `s_${Date.now()}`),
    hintText: step.hintText || step.description || null,
    bbox: step.bbox || null,
    isFinal: !!step.isFinal,
    timestamp: Date.now(),
    meta
  };
  steps.push(entry);
  await writeJSON('steps', steps);
  return entry;
}

async function loadStepLogs(sessionId = null) {
  const steps = await readJSON('steps', []);
  return sessionId ? steps.filter(s => s.sessionId === sessionId) : steps;
}

// Chat
async function saveChatMessage(message) {
  const chat = await readJSON('chat', []);
  const msg = {
    id: message.id || `m_${Date.now()}`,
    role: message.role || 'user',
    text: message.text || '',
    timestamp: message.timestamp || Date.now(),
    sessionId: message.sessionId || null
  };
  chat.push(msg);
  await writeJSON('chat', chat);
  return msg;
}

async function loadChatHistory(sessionId = null, limit = 100) {
  const chat = await readJSON('chat', []);
  const filtered = sessionId ? chat.filter(m => m.sessionId === sessionId) : chat;
  return filtered.slice(-limit);
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
async function logError(err) {
  const errors = await readJSON('errors', []);
  const entry = {
    id: `e_${Date.now()}`,
    message: err?.message || String(err),
    stack: err?.stack || null,
    timestamp: Date.now()
  };
  errors.push(entry);
  await writeJSON('errors', errors);
  return entry;
}

// Utility: clear all (for tests)
async function clearAll() {
  await Promise.all(
    Object.values(FILES).map(f => fs.unlink(path.join(DATA_DIR, f)).catch(() => {}))
  );
  await init();
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
  saveSettings,
  loadSettings,
  logError,
  clearAll,
  _DATA_DIR: DATA_DIR
};
