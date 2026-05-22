# Skills and Tools — Mozart

Mozart exposes 7 skills callable by agents. Each skill has a typed definition (input/output schema) and integration manifests for OpenClaw, OpenCode, and Hermes Agent.

## Skill definitions

Located in `src/skills/definitions.ts`. Each skill implements the `SkillDefinition` interface:

```typescript
interface SkillDefinition {
  name: string;
  description: string;
  input: Record<string, SkillInputField>;
  output: Record<string, SkillOutputField>;
}
```

## Available skills

### mozart.route_model

Choose the best available model/provider/gateway for an AI task.

**Input:**
| Field | Type | Required |
|-------|------|----------|
| task | string | yes |
| context_size | number | no |
| privacy_mode | open \| balanced \| privacy_first \| local_only | no |
| budget_mode | lowest \| balanced \| quality | no |

**Output:** selected_gateway, selected_provider, selected_model, confidence, context_strategy, estimated_cost, fallback_chain, explanation

### mozart.explain_route

Explain why Mozart chose a specific model/provider for the last task.

**Output:** explanation (string)

### mozart.estimate_cost

Estimate token usage and cost for a task before execution.

**Input:** task, context (string), model (string, optional)

**Output:** estimated_input_tokens, estimated_output_tokens, estimated_cost, currency

### mozart.compress_context

Optimize and compress context to reduce token usage.

**Input:** content (string), max_tokens (number), strategy (string)

**Output:** strategy, original_tokens, compressed_tokens, compression_ratio

### mozart.privacy_check

Scan content for secrets, API keys, tokens before sending to models.

**Input:** content (string), privacy_mode (string, optional)

**Output:** allowed, findings (array), action, redacted_content

### mozart.fallback_plan

Generate a fallback execution plan.

**Input:** task (string), primary_model (string, optional)

**Output:** primary (object), fallbacks (array), retry_policy

### mozart.inventory

Return the current inventory of detected gateways, providers, and models.

**Output:** gateways (array), providers (array), models (array), generated_at

## Integration manifests

### OpenCode

Manifest: `examples/opencode/mozart-skill.json`

```json
{
  "name": "mozart.route_model",
  "type": "skill",
  "integration": { "package": "mozart-router", "method": "sdk" }
}
```

### OpenClaw

Manifest: `examples/openclaw/mozart-skill.yaml`

```yaml
skills:
  - name: mozart.route_model
    input: { task: { type: string, required: true } }
```

### Hermes Agent

Manifest: `examples/hermes/mozart-tool.json`

```json
{
  "name": "mozart.route_model",
  "type": "tool",
  "source": { "package": "mozart-router", "method": "sdk" }
}
```

### Generic tools

Manifest: `examples/generic-tools/mozart-tools.json`

A collection of all 7 skills in a generic JSON format suitable for any agent framework.

## Using skills from code

```typescript
import { Mozart, ALL_SKILLS } from 'mozart-router';

// Inspect skill definitions
for (const skill of ALL_SKILLS) {
  console.log(skill.name, Object.keys(skill.input));
}

// Use Mozart SDK directly
const mozart = new Mozart();
const route = await mozart.recommend('analyze this code for bugs');
```

## Adding a new skill

1. Add definition to `src/skills/definitions.ts`
2. Add to the `ALL_SKILLS` array
3. Implement the corresponding method in `Mozart` core
4. Add CLI command if needed
5. Update manifests in `examples/`
