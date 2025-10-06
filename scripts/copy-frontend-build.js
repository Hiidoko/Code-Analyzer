#!/usr/bin/env node
/**
 * Copia a build do frontend (frontend/dist) para uma pasta servida pelo backend (backend/public)
 * executado após `npm run build` root.
 */
const { existsSync, rmSync, mkdirSync, cpSync } = require('fs');
const { join } = require('path');

const root = process.cwd();
const distFrontend = join(root, 'frontend', 'dist');
const backendPublic = join(root, 'backend', 'public');

if (!existsSync(distFrontend)) {
  console.error('[copy-frontend-build] Pasta não encontrada:', distFrontend);
  process.exit(1);
}

if (existsSync(backendPublic)) {
  rmSync(backendPublic, { recursive: true, force: true });
}
mkdirSync(backendPublic, { recursive: true });
cpSync(distFrontend, backendPublic, { recursive: true });
console.log('[copy-frontend-build] Build copiada para', backendPublic);
