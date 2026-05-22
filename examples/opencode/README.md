# OpenCode + Mozart

This directory contains the Mozart skill manifest for OpenCode.

## Files

- `mozart-skill.json` — Skill definition for OpenCode

## Integration

1. Install Mozart:
```bash
npm install mozart-router
```

2. Copy the skill manifest to your OpenCode skills directory

3. Import and use in your agent code:
```typescript
import { Mozart } from 'mozart-router';

const mozart = new Mozart();
const route = await mozart.recommend('refactor the auth module');
```

## Status

OpenCode integration is a real detection adapter. Mozart detects OpenCode installation via environment variables and data directory. For full model routing, use Mozart alongside your existing OpenCode provider configuration.

This integration is community-maintained and is not officially affiliated with OpenCode.
