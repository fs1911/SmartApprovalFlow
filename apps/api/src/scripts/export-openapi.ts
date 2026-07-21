/**
 * Writes the current OpenAPI document to openapi.json.
 * The running app is the source of truth; this snapshot is committed so the
 * contract is reviewable in PRs and consumable by integration partners.
 *
 * Run: npm run openapi:export --workspace apps/api
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildApp } from '../app.js';

async function main() {
  const app = await buildApp();
  await app.ready();
  const doc = app.swagger();
  const here = dirname(fileURLToPath(import.meta.url));
  const out = resolve(here, '../../openapi.json');
  await writeFile(out, JSON.stringify(doc, null, 2), 'utf8');
  await app.close();
  console.log(`✅ OpenAPI written to ${out}`);
}

void main();
