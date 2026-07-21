/**
 * Boots the HTTP server. Entry point for `npm run dev` / `npm start`.
 */
import { buildApp } from './app.js';
import { config } from './config.js';

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: config.API_PORT, host: config.API_HOST });
    app.log.info(`API listening on ${config.API_BASE_URL} — docs at ${config.API_BASE_URL}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
