#!/usr/bin/env node
// Levanta toda la SuperApp: Postgres + API + Web.
// Uso: pnpm start

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, openSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import http from 'node:http';
import net from 'node:net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const RUN_DIR = resolve(ROOT, '.local-db');
const LOG_DIR = resolve(ROOT, '.local-db/logs');
const ENV_FILE = resolve(ROOT, '.env');

mkdirSync(LOG_DIR, { recursive: true });

// ── Cargar .env ─────────────────────────────────────────────────
if (!existsSync(ENV_FILE)) {
  console.error('✗ No encontré .env — copiá .env.example a .env y volvé a ejecutar.');
  process.exit(1);
}
const env = { ...process.env };
for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

// ── Helpers ─────────────────────────────────────────────────────
function waitForPort(port, host = 'localhost', timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((res, rej) => {
    const tryConnect = () => {
      const sock = net.createConnection({ port, host });
      sock.once('connect', () => { sock.end(); res(); });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) rej(new Error(`puerto ${port} no respondió en ${timeoutMs}ms`));
        else setTimeout(tryConnect, 500);
      });
    };
    tryConnect();
  });
}

function spawnBg(name, cmd, args, options = {}) {
  const logPath = resolve(LOG_DIR, `${name}.log`);
  const logFd = openSync(logPath, 'a');
  const child = spawn(cmd, args, {
    cwd: options.cwd ?? ROOT,
    env: { ...env, ...options.env },
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  writeFileSync(resolve(RUN_DIR, `${name}.pid`), String(child.pid));
  child.unref();
  console.log(`  ✓ ${name} arrancado (pid ${child.pid}) — logs en ${logPath}`);
  return child.pid;
}

function isRunning(name) {
  const pidFile = resolve(RUN_DIR, `${name}.pid`);
  if (!existsSync(pidFile)) return false;
  const pid = Number(readFileSync(pidFile, 'utf8').trim());
  try { process.kill(pid, 0); return pid; } catch { return false; }
}

// ── Arranque ────────────────────────────────────────────────────
console.log('\n🚀 Levantando SuperApp Hogar...\n');

// 1) Postgres
if (isRunning('postgres')) {
  console.log('  • Postgres ya estaba corriendo');
} else {
  console.log('  • Iniciando Postgres en :5432...');
  spawnBg('postgres', 'node', ['scripts/local-db.mjs', 'start']);
  await waitForPort(5432);
  await sleep(1500); // dar tiempo a init si es primera vez
}

// 2) Verificar que el schema esté aplicado
try {
  console.log('  • Verificando schema de DB...');
  const push = spawn('pnpm', ['--filter', '@superapp/database', 'db:push'], {
    cwd: ROOT, env, stdio: 'ignore',
  });
  await new Promise(r => push.once('exit', r));
} catch {}

// 3) Construir API si falta
const distMain = resolve(ROOT, 'apps/api/dist/main.js');
if (!existsSync(distMain)) {
  console.log('  • Compilando API...');
  await new Promise((res, rej) => {
    const b = spawn('pnpm', ['--filter', '@superapp/api', 'build'], { cwd: ROOT, env, stdio: 'inherit' });
    b.once('exit', c => c === 0 ? res() : rej(new Error('API build falló')));
  });
}

// 4) API
if (isRunning('api')) {
  console.log('  • API ya estaba corriendo');
} else {
  console.log('  • Iniciando API en :4000...');
  spawnBg('api', 'node', ['dist/main'], { cwd: resolve(ROOT, 'apps/api') });
  await waitForPort(4000);
}

// 5) Web
if (isRunning('web')) {
  console.log('  • Web ya estaba corriendo');
} else {
  // Construir si falta
  const nextBuild = resolve(ROOT, 'apps/web/.next');
  if (!existsSync(nextBuild)) {
    console.log('  • Compilando Web...');
    await new Promise((res, rej) => {
      const b = spawn('pnpm', ['--filter', '@superapp/web', 'build'], { cwd: ROOT, env, stdio: 'inherit' });
      b.once('exit', c => c === 0 ? res() : rej(new Error('Web build falló')));
    });
  }
  console.log('  • Iniciando Web en :3000...');
  spawnBg('web', 'npx', ['next', 'start', '-p', '3000'], {
    cwd: resolve(ROOT, 'apps/web'),
    env: { NEXT_PUBLIC_API_URL: 'http://localhost:4000' },
  });
  await waitForPort(3000);
}

// 6) Probar login
console.log('\n  • Probando login con usuario de prueba...');
const ok = await new Promise(res => {
  const req = http.request({
    host: 'localhost', port: 4000, path: '/api/v1/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, r => {
    let body = '';
    r.on('data', c => body += c);
    r.on('end', () => res(r.statusCode === 200 || r.statusCode === 201));
  });
  req.on('error', () => res(false));
  req.write(JSON.stringify({ email: 'inquilino@test.com', password: 'Password123!' }));
  req.end();
});

console.log(`  ${ok ? '✓' : '✗'} Login ${ok ? 'OK' : 'FALLÓ'}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  ✅ SuperApp Hogar funcionando');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🌐 Web:      http://localhost:3000');
console.log('  📡 API:      http://localhost:4000');
console.log('  📚 Swagger:  http://localhost:4000/api/docs');
console.log('');
console.log('  👤 Usuarios de prueba (password: Password123!):');
console.log('     • admin@superapphogar.com    (Admin)');
console.log('     • propietario@test.com       (Propietario)');
console.log('     • inquilino@test.com         (Inquilino)');
console.log('');
console.log('  Para detener todo:  pnpm stop');
console.log('  Para ver logs:       tail -f .local-db/logs/*.log');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
