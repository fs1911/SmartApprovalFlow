import { readFileSync } from 'node:fs';
import type { E2EFixtures } from '../global-setup.js';
import { FIXTURES_PATH } from '../global-setup.js';

/** Load the token fixtures written by global-setup. */
export function loadFixtures(): E2EFixtures {
  return JSON.parse(readFileSync(FIXTURES_PATH, 'utf8')) as E2EFixtures;
}
