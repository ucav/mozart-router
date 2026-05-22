import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { Mozart } from '../core/mozart';

// Lightweight local dashboard served inline by the API server.
// No framework, no build step, no external dependencies.
// Pure HTML/CSS served by the existing Node.js http server.

export function dashboardHtml(mozart: Mozart): string {
  const snapshot = mozart.getInventory();
  const activeGateways = snapshot.gateways.filter((g) => g.detected);
  const report = mozart.generateReport();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mozart Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0d1117;color:#c9d1d9;padding:2rem}
h1{color:#58a6ff;font-size:1.5rem;margin-bottom:.5rem}
h2{color:#f0f6fc;font-size:1.1rem;margin:1.5rem 0 .5rem;border-bottom:1px solid #21262d;padding-bottom:.25rem}
.sub{color:#8b949e;font-size:.85rem;margin-bottom:1.5rem}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem}
.card{background:#161b22;border:1px solid #21262d;border-radius:6px;padding:1rem}
.card .value{font-size:1.8rem;font-weight:600;color:#58a6ff}
.card .label{font-size:.8rem;color:#8b949e;margin-top:.25rem}
table{width:100%;border-collapse:collapse;margin-top:.5rem}
th,td{text-align:left;padding:.5rem .75rem;border-bottom:1px solid #21262d;font-size:.85rem}
th{color:#8b949e;font-weight:500}
.green{color:#3fb950}
.yellow{color:#d29922}
.red{color:#f85149}
.tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:.75rem;font-weight:500}
.tag-green{background:#23863633;color:#3fb950;border:1px solid #238636}
.tag-yellow{background:#9e6a0333;color:#d29922;border:1px solid #9e6a03}
.tag-gray{background:#21262d;color:#8b949e;border:1px solid #30363d}
.proto{background:#161b22;border-left:3px solid #58a6ff;padding:.75rem 1rem;margin:1rem 0;border-radius:4px;font-size:.85rem;color:#8b949e}
pre{background:#161b22;border-radius:4px;padding:.75rem;font-size:.8rem;overflow-x:auto;margin-top:.5rem;border:1px solid #21262d}
</style>
</head>
<body>
<h1>Mozart Dashboard</h1>
<p class="sub">Local conductor for AI agents — v0.1.0</p>

<div class="proto">Gateways execute. Mozart decides.<br>Do not rebuild what the gateway already does. Detect it, understand it, orchestrate it.</div>

<h2>Overview</h2>
<div class="cards">
<div class="card"><div class="value">${activeGateways.length}</div><div class="label">Active Gateways</div></div>
<div class="card"><div class="value">${snapshot.providers.length}</div><div class="label">Providers</div></div>
<div class="card"><div class="value">${snapshot.models.length}</div><div class="label">Models</div></div>
<div class="card"><div class="value">${snapshot.models.filter((m) => m.privacyLevel === 'local').length}</div><div class="label">Local Models</div></div>
</div>

<h2>Gateways</h2>
<table>
<tr><th>Gateway</th><th>Status</th><th>Models</th></tr>
${snapshot.gateways.map((g) => `
<tr>
  <td>${g.gatewayName}</td>
  <td><span class="tag ${g.detected ? 'tag-green' : 'tag-gray'}">${g.status}</span></td>
  <td>${snapshot.models.filter((m) => m.gatewayId === g.gatewayId).length}</td>
</tr>`).join('')}
</table>

<h2>Models</h2>
<table>
<tr><th>Model</th><th>Provider</th><th>Gateway</th><th>Privacy</th><th>Quality</th></tr>
${snapshot.models.map((m) => `
<tr>
  <td>${m.id}</td>
  <td>${m.providerId}</td>
  <td>${m.gatewayId ?? '-'}</td>
  <td><span class="tag ${m.privacyLevel === 'local' ? 'tag-green' : 'tag-yellow'}">${m.privacyLevel}</span></td>
  <td>${m.qualityClass}</td>
</tr>`).join('')}
</table>

<h2>Session Report</h2>
<pre>${report}</pre>

<h2>API Endpoints</h2>
<pre>
GET  /health
GET  /v1/inventory
POST /v1/route
POST /v1/simulate
POST /v1/explain
GET  /v1/report
POST /v1/context/compress
POST /v1/policy/evaluate
</pre>

<p style="margin-top:2rem;color:#30363d;font-size:.75rem">Mozart v0.1.0 — MIT License — <a href="https://github.com/ucav/mozart-router" style="color:#30363d">github.com/ucav/mozart-router</a></p>
</body>
</html>`;
}
