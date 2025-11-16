# Visor Services Testing Plan

Current Environment Status

Fixed Issues:
- LAPTOP_VERSION changed from `L` to `macbook-pro-14` (valid)
- VISOR_USE_REAL_CAPTURE set to `false` for test mode (no screenshot needed)
- OPENROUTER_API_KEY present

Test Execution Order

Phase 1: Diagnostics
Run: `node scripts/diagnoseTLM.js`

Phase 2: Service Integration Tests
Run: `VISOR_USE_REAL_CAPTURE=false node scripts/testServices.js`

Phase 3: Unit Tests
Run: `node scripts/testServicesUnit.js`

Components Not Yet Tested

- IPC Communication Layer
- Electron Windows
- React Components
- Full End-to-End

Environment Variables Verified

- OPENROUTER_API_KEY: set
- VISOR_USE_REAL_CAPTURE: false
- LAPTOP_VERSION: macbook-pro-14

Quick Start Commands

- node scripts/diagnoseTLM.js
- node scripts/testServices.js
- node scripts/testServicesUnit.js
- node scripts/testLLM.js (requires API key)
