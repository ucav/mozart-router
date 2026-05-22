# Hermes Agent + Mozart

This directory contains the Mozart tool manifest for Hermes Agent.

## Files

- `mozart-tool.json` — Tool definition for Hermes Agent

## Integration

1. Install Mozart:
```bash
npm install mozart-router
```

2. Add the tool definition to your Hermes agent configuration

3. Call Mozart tools from your Hermes workflows:
```typescript
import { Mozart } from 'mozart-router';
const mozart = new Mozart();
const recommendation = await mozart.recommend(task);
```

## Status

Hermes Agent integration is currently a stub adapter with a full tool manifest. The adapter interface is complete and ready for integration, but real detection requires the Hermes Agent runtime environment.

This integration is community-maintained and is not officially affiliated with Hermes Agent.
