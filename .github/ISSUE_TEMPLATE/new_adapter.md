---
name: New adapter
about: Request or propose a new gateway/provider adapter
title: '[Adapter] Add support for <gateway-name>'
labels: enhancement, good first issue
assignees: ''
---

## Gateway / Provider

Name and link to the gateway or provider you'd like Mozart to support.

## Why it fits Mozart

Explain how this gateway fits the Mozart philosophy (gateway-first, no key duplication).

## Detection approach

How can Mozart detect this gateway without destructively modifying its config?

## Links

- Official docs: 
- API reference: 
- Config file location: 

## Checklist (for implementors)

- [ ] `src/adapters/<gateway>.ts` implementing `GatewayAdapter`
- [ ] Export from `src/adapters/index.ts` and `src/index.ts`
- [ ] Tests in `tests/`
- [ ] Example manifest in `examples/<gateway>/`
- [ ] Docs updated in `docs/ADAPTERS.md` and `docs/INTEGRATIONS.md`
- [ ] `docs/FEATURE_MATRIX.md` updated
