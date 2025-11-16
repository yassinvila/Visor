# Visor Services Testing Plan (concise)

Phase 1: Diagnostics
Run: `node scripts/diagnoseTLM.js`

Phase 2: Service Integration Tests
Run: `VISOR_USE_REAL_CAPTURE=false node scripts/testServices.js`

Phase 3: Unit Tests
Run: `node scripts/testServicesUnit.js`

Next Actions

1. Run `testServices.js` to verify service isolation
2. Run `testServicesUnit.js` to verify all unit tests
3. Investigate LLM provider error in `testLLM.js`
