# Delegated Execution — Mozart

Mozart delegates execution to existing gateways. It does not become a gateway itself.

## Architecture

```
Agent → Mozart → Gateway → Provider
        (decide)  (execute)
```

Mozart sits in the decision position. The gateway sits in the execution position. This separation is intentional and permanent.

## Execution targets

When Mozart selects a route, it produces an `ExecutionTarget`:

```typescript
interface ExecutionTarget {
  adapter: string;        // Which adapter handles this
  gateway?: string;       // Which gateway
  provider: string;       // Which provider
  model: string;          // Which model
  baseUrl?: string;       // Where to send the request
  requiresApiKey?: boolean;
  apiKeyManagedBy: 'gateway' | 'env' | 'manual' | 'none';
  method: 'gateway_call' | 'tool_call' | 'direct_http' | 'local_exec';
}
```

Key field: `apiKeyManagedBy` — Mozart never stores the key, only records who manages it.

## Execution flow

1. Mozart routes the task → produces `RouteDecision`
2. Mozart delegates to the adapter → adapter provides `ExecutionTarget`
3. Mozart calls `adapter.execute()` → adapter handles the HTTP call
4. Mozart returns the result → gateway never exposed

## Adapter responsibility

Adapters are responsible for:
- Detecting the gateway
- Reading its config (without raw keys)
- Providing execution targets
- Executing calls when possible

Mozart is responsible for:
- Classifying tasks
- Scoring models
- Selecting the best route
- Delegating to the right adapter

## When execution is not available

If an adapter doesn't support execution (or the gateway isn't accessible):

- Mozart returns a recommendation (recommend-only)
- The user/agent sends the call themselves using their existing gateway
- Mozart's recommendation includes the exact model, provider, and rationale

This is the preferred mode. Execution is optional.
