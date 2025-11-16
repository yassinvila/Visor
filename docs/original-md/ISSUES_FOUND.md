# Visor Codebase - Issues & Problems Found

Analysis Date: November 15, 2025

Critical Issues

1. Missing LLM Response Parsing in Main Process
Location: electron-main/main.js - Missing stepController callback setup
Severity: CRITICAL

2. Window.visor Type Mismatch - Missing `loadHistory` Method
Location: renderer/global.d.ts vs electron-main/preload.js
Severity: CRITICAL / HIGH

3. Race Condition: Overlay Ready Before Step Controller Is Ready
Location: electron-main/main.js
Severity: HIGH

... (full list in original file)

Recommended Fix Priority

Phase 1 (MUST FIX):
1. Add step forwarding to overlay
2. Implement concurrent guard
3. Initialize storage
4. Handle goal-not-set case

Phase 2 (SHOULD FIX):
5. Screenshot size validation
6. Error handling chain
7. Overlay fallback detection
8. Chat history error boundary

Phase 3 (NICE TO FIX):
9. Remove legacy code
10. Add retry logic
11. Improve logging
