# Visor Codebase - Complete Analysis

Last Updated: November 15, 2025
Project: Visor — AI-powered desktop task guidance overlay
Architecture: Electron + React + TypeScript + Node.js

Executive Summary

Visor is an Electron-based AI co-pilot that provides step-by-step guidance for desktop workflows by overlaying visual instructions directly on the screen. Users describe tasks in a chat interface; Visor captures screenshots, sends them to an LLM (via OpenRouter), parses structured responses, and renders interactive overlays with arrows, circles, and tooltips to guide users through complex tasks.

Key Statistics:
- Total Files: ~65 files across backend, frontend, config, and scripts
- Total Lines: ~6,000+ (backend ~2,700, frontend ~1,200, config/scripts ~1,600, docs ~500)
- Technology Stack: Electron, Node.js, React, TypeScript, Vite
- Backend Services: 4 core services (screenCapture, stepController, storage, LLM client)
- LLM Provider: OpenRouter (default model: gpt-4o-mini)
- Storage: Dual-mode persistence (Legacy JSON / Structured JSONL with rotation)
- Test Coverage: 6 test/utility scripts + comprehensive unit test suite (30 tests, all passing)
- Current Status: Production-ready with enhanced structured logging system

Architecture Overview

High-Level Data Flow

User Chat Input → Chat Window ←IPC→ Main Process → stepController.setGoal() → screenCapture.captureCurrentScreen() → llmClient.sendCompletion() → parser.parseStepResponse() → Overlay Window ← IPC ← Main Process sends overlay:step → Visual Highlight → User follows instruction → "Done" → stepController.markDone() → requestNextStep() [loop]

Directory Structure

See original file for full tree. Key folders: electron-main, renderer, scripts, config, assets.

Key Modules

- electron-main/main.js — App entry, window creation, IPC setup
- electron-main/preload.js — Context bridge (window.visor API)
- electron-main/ipc/overlayIPC.js — Overlay ↔ Main IPC handlers
- electron-main/ipc/chatIPC.js — Chat ↔ Main IPC handlers
- electron-main/windows/overlayWindow.js — Transparent guidance overlay
- electron-main/windows/chatWindow.js — Task input chat panel
- electron-main/llm/client.js — OpenRouter API wrapper
- electron-main/llm/parser.js — LLM response validation & parsing
- electron-main/llm/prompts.js — System prompt templates
- electron-main/services/stepController.js — Main orchestration state machine
- electron-main/services/storage.js — JSON persistence layer
- electron-main/services/screenCapture.js — Platform-agnostic capture

Testing & Diagnostics

Multiple scripts: scripts/diagnoseTLM.js, scripts/testLLM.js, scripts/testServices.js, scripts/testServicesUnit.js.
Comprehensive unit/integration tests collected in electron-mainTEST.js / scripts/testServicesUnit.js (report: ~30 tests, passing in analysis).

Recommendations & Next Steps

- Prioritize fixes: enforce isFetching guard, protect against overlay→goal race, add LLM retry/backoff, route parser errors to overlay UI.
- Add tests to cover race/concurrency cases and LLM transient failures.
- Clean up legacy renderer code and confirm build inputs (Vite config).
