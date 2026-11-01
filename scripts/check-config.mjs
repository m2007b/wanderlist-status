import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = yaml.load(await fs.readFile(path.join(root, '.upptimerc.yml'), 'utf8'));
assert.equal(config.owner, 'm2007b');
assert.equal(config.repo, 'wanderlist-status');
assert.equal(config['status-website'].cname, 'status.wanderlist.net');
assert.deepEqual(config.secrets, []);
assert.equal(config.sites.length, 4);
assert.equal(new Set(config.sites.map(site => site.slug)).size, config.sites.length);
for (const site of config.sites) {
  assert.equal(new URL(site.url).origin, 'https://www.wanderlist.net');
  assert.deepEqual(site.expectedStatusCodes, [200]);
  assert.ok(!site.method || site.method === 'GET', 'Checks must be read-only.');
  const regex = site.__dangerous__body_down_if_regex_missing;
  if (regex) {
    const pattern = new RegExp(regex);
    assert.equal(pattern.test('<html>Something went wrong</html>'), false);
    const fixtures = {
      blog: '{"posts": []}',
      'trip-data': '{"templates": []}',
      'ai-connections': '{"issuer": "https://www.wanderlist.net"}',
    };
    assert.equal(pattern.test(fixtures[site.slug]), true);
  }
}
for (const name of ['wanderlist-logo.png', 'favicon.png', 'favicon.svg', 'wanderlist-theme.css', 'monitor-freshness.js']) {
  assert.ok((await fs.stat(path.join(root, 'assets', name))).size > 0);
}
console.log('Configuration valid: four read-only checks, required branding assets, and custom domain.');

if (process.argv.includes('--live')) {
  const results = await Promise.all(config.sites.map(async site => {
    const start = performance.now();
    try {
      const response = await fetch(site.url, { signal: AbortSignal.timeout(30000) });
      const body = await response.text();
      const regex = site.__dangerous__body_down_if_regex_missing;
      const text = site.__dangerous__body_down_if_text_missing;
      const validBody = (!regex || new RegExp(regex).test(body)) && (!text || body.includes(text));
      const validStatus = site.expectedStatusCodes.includes(response.status);
      const ms = Math.round(performance.now() - start);
      return { name: site.name, status: !validStatus || !validBody ? 'down' : ms > site.maxResponseTime ? 'degraded' : 'up', code: response.status, ms, validBody };
    } catch (error) {
      return { name: site.name, status: 'down', error: error.message };
    }
  }));
  for (const result of results) console.log(JSON.stringify(result));
  if (results.some(result => result.status === 'down')) process.exitCode = 1;
}
