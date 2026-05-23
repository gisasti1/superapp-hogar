#!/usr/bin/env node
// Detiene Postgres + API + Web.
// Uso: pnpm stop

import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const RUN_DIR = resolve(ROOT, '.local-db');

console.log('\n🛑 Deteniendo SuperApp...\n');

for (const name of ['web', 'api', 'postgres']) {
  const pidFile = resolve(RUN_DIR, `${name}.pid`);
  if (!existsSync(pidFile)) {
    console.log(`  • ${name}: no estaba corriendo`);
    continue;
  }
  const pid = Number(readFileSync(pidFile, 'utf8').trim());
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`  ✓ ${name} (pid ${pid}) detenido`);
  } catch {
    console.log(`  • ${name}: ya estaba detenido`);
  }
  try { unlinkSync(pidFile); } catch {}
}

console.log('\n✅ Todo detenido.\n');
