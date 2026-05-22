import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Mozart } from '../src/core/mozart';
import { MozartApiServer } from '../src/api/server';
import * as http from 'http';

function get(url: string): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: body });
        }
      });
    }).on('error', reject);
  });
}

function post(url: string, body: Record<string, unknown>): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr).toString() },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data });
        }
      });
    });
    req.write(bodyStr);
    req.end();
  });
}

describe('MozartApiServer', () => {
  let mozart: Mozart;
  let server: MozartApiServer;
  const PORT = 14444;

  beforeAll(async () => {
    mozart = new Mozart();
    // Seed with test data
    mozart.registry.addProvider({
      id: 'test-provider',
      name: 'Test Provider',
      source: 'manual',
      privacyLevel: 'cloud',
      status: 'available',
      lastCheckedAt: new Date().toISOString(),
    });
    mozart.registry.addModel({
      id: 'test-model',
      providerId: 'test-provider',
      displayName: 'Test Model',
      modality: ['text'],
      contextWindow: 128000,
      inputPrice: 1.0,
      outputPrice: 2.0,
      latencyClass: 'medium',
      qualityClass: 'high',
      strengths: ['coding', 'reasoning'],
      weaknesses: [],
      supportsTools: true,
      privacyLevel: 'cloud',
      availability: 'available',
      sourceConfidence: 'high',
      lastCheckedAt: new Date().toISOString(),
    });

    server = new MozartApiServer(mozart, { port: PORT });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('GET /health returns ok', async () => {
    const result = await get(`http://127.0.0.1:${PORT}/health`);
    expect(result.status).toBe(200);
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe('ok');
    expect(data.version).toBeDefined();
  });

  it('GET /v1/inventory returns inventory', async () => {
    const result = await get(`http://127.0.0.1:${PORT}/v1/inventory`);
    expect(result.status).toBe(200);
    const data = result.data as Record<string, unknown>;
    expect(data.providers).toBeDefined();
    expect(data.models).toBeDefined();
  });

  it('POST /v1/simulate returns routing decision', async () => {
    const result = await post(`http://127.0.0.1:${PORT}/v1/simulate`, {
      task: 'write a function to sort an array',
    });
    expect(result.status).toBe(200);
    const data = result.data as Record<string, unknown>;
    expect(data.selected_model).toBeDefined();
    expect(data.confidence).toBeDefined();
  });

  it('POST /v1/route returns full routing response', async () => {
    const result = await post(`http://127.0.0.1:${PORT}/v1/route`, {
      task: 'debug the authentication module',
      budget_mode: 'balanced',
      privacy_mode: 'balanced',
    });
    expect(result.status).toBe(200);
    const data = result.data as Record<string, unknown>;
    expect(data.selected_model).toBeDefined();
    expect(data.explanation).toBeDefined();
  });

  it('GET /v1/report returns report', async () => {
    // First simulate a task to populate session
    await post(`http://127.0.0.1:${PORT}/v1/simulate`, { task: 'test task' });

    const result = await get(`http://127.0.0.1:${PORT}/v1/report`);
    expect(result.status).toBe(200);
    const data = result.data as Record<string, unknown>;
    expect(data.report).toBeDefined();
  });

  it('POST /v1/explain returns explanation', async () => {
    await post(`http://127.0.0.1:${PORT}/v1/simulate`, { task: 'hello world' });

    const result = await post(`http://127.0.0.1:${PORT}/v1/explain`, {});
    expect(result.status).toBe(200);
    const data = result.data as Record<string, unknown>;
    expect(data.explanation).toBeDefined();
  });

  it('POST /v1/context/compress returns compression strategy', async () => {
    const result = await post(`http://127.0.0.1:${PORT}/v1/context/compress`, {
      content: 'short text',
      max_tokens: 100,
    });
    expect(result.status).toBe(200);
    const data = result.data as Record<string, unknown>;
    expect(data.strategy).toBeDefined();
  });

  it('POST /v1/policy/evaluate returns policy evaluation', async () => {
    const result = await post(`http://127.0.0.1:${PORT}/v1/policy/evaluate`, {
      task: 'write some code',
      budget_mode: 'lowest',
      privacy_mode: 'balanced',
    });
    expect(result.status).toBe(200);
    const data = result.data as Record<string, unknown>;
    expect(data.task_type).toBeDefined();
    expect(data.policy_evaluation).toBeDefined();
  });

  it('GET unknown endpoint returns 404', async () => {
    const result = await get(`http://127.0.0.1:${PORT}/v1/nonexistent`);
    expect(result.status).toBe(404);
  });
});
