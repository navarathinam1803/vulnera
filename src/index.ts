/**
 * RiskLens MCP Server
 *
 * Security assistant + pizza shop finder.
 * Load .env from project root so GITHUB_TOKEN is available when the server
 * is started by Cursor/IDE (which may use a different cwd).
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env from project root (works when running from dist/ or src/)
const projectRoot = resolve(__dirname, '..');
const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
}
// Also load from process.cwd() so local overrides work
dotenv.config();

/**
 * Bootstrap the application
 */
async function bootstrap() {
    // Create and start the MCP server
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
}

// Start the application
bootstrap().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
