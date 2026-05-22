# Contributing to Mozart

Mozart is a gateway-first, agent-first, integration-first orchestration layer for AI agents. Contributions are welcome.

## Core principle

```
Do not rebuild what the gateway already does.
Detect it, understand it, orchestrate it.
```

Every contribution must respect this principle. Mozart adds intelligence on top of gateways — it does not replace them.

## Getting started

```bash
git clone https://github.com/ucav/mozart-router.git
cd mozart-router
npm install
npm run build
npm run test
npm run lint
```

## Project structure

```
src/
  types/         — All TypeScript interfaces
  core/          — Mozart orchestrator, inventory, session, cache, persistence
  adapters/      — Gateway adapters (one per gateway/tool)
  routing/       — Task classifier, router, scorer, fallback, multi-stage
  policy/        — Policy engine, profiles, YAML config loader
  privacy/       — Privacy guard
  context/       — Context optimizer
  cost/          — Cost and token estimator
  explain/       — Explainability engine
  logs/          — Logger + secret redactor
  skills/        — Skill definitions
  cli/           — CLI entry point
  api/           — HTTP API server + middleware proxy
  utils/         — DealsForge, CanRunIt stubs
tests/           — Vitest test files
docs/            — Documentation
examples/        — Integration manifests and usage examples
reports/         — Audit and build reports
```

## Adding a new adapter

1. Create `src/adapters/your-gateway.ts`
2. Implement the `GatewayAdapter` interface from `src/types/index.ts`
3. Export from `src/adapters/index.ts` and `src/index.ts`
4. Register in `src/cli/main.ts`
5. Add tests in `tests/`
6. Add manifest in `examples/`
7. Document in `docs/ADAPTERS.md` and `docs/INTEGRATIONS.md`
8. Update `docs/FEATURE_MATRIX.md`

## Adapter requirements

- **Detect** the gateway without changing its configuration
- **Read** existing config — never request API keys that the gateway already manages
- **Reference** keys abstractly (`apiKeyManagedBy: 'gateway'`), never store or log them
- **Delegate** execution to the gateway when possible
- **Fall back** to recommend-only gracefully

## Code style

- TypeScript with strict mode
- No `any` unless absolutely necessary
- No comments unless explaining something non-obvious
- Match existing patterns (look at neighboring files)
- Tests required for all new modules

## Testing

```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run build         # TypeScript compilation
npm run lint          # Type checking (tsc --noEmit)
```

## Pull request process

1. Fork the repo
2. Create a feature branch
3. Add tests for your changes
4. Ensure `npm run build`, `npm run test`, `npm run lint` pass
5. Update documentation if needed
6. Open a PR against `master`

## License

MIT — contributions are licensed under the same terms.
