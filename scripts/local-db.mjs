#!/usr/bin/env node
// Postgres embebido para desarrollo local — sin Docker, sin sudo.
// Uso:
//   node scripts/local-db.mjs start   → inicia el servidor (queda corriendo)
//   node scripts/local-db.mjs stop    → para el servidor
//   node scripts/local-db.mjs status  → muestra si está corriendo

import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, '.local-db/data');
const PID_FILE = resolve(ROOT, '.local-db/postgres.pid');
const USER = 'superapp';
const PASSWORD = 'superapp_dev';
const DB_NAME = 'superapp_hogar';
const PORT = 5432;

mkdirSync(resolve(ROOT, '.local-db'), { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

const cmd = process.argv[2] ?? 'start';

async function start() {
  const firstRun = !existsSync(DATA_DIR) || !existsSync(resolve(DATA_DIR, 'PG_VERSION'));

  if (firstRun) {
    console.log('[local-db] primera vez — inicializando Postgres...');
    await pg.initialise();
  }

  console.log('[local-db] arrancando Postgres en puerto', PORT);
  await pg.start();

  if (firstRun) {
    console.log('[local-db] creando base de datos', DB_NAME);
    try {
      await pg.createDatabase(DB_NAME);
    } catch (e) {
      if (!/already exists/i.test(String(e?.message))) throw e;
    }
  }

  writeFileSync(PID_FILE, String(process.pid));
  console.log('[local-db] LISTO');
  console.log(`[local-db] DATABASE_URL=postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}`);
  console.log('[local-db] (Ctrl+C para detener)');

  const shutdown = async () => {
    console.log('\n[local-db] deteniendo Postgres...');
    try { await pg.stop(); } catch {}
    try { unlinkSync(PID_FILE); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // mantenemos el proceso vivo
  setInterval(() => {}, 1 << 30);
}

async function stop() {
  if (!existsSync(PID_FILE)) {
    console.log('[local-db] no hay servidor corriendo (sin pid file)');
    return;
  }
  const pid = Number(readFileSync(PID_FILE, 'utf8').trim());
  console.log('[local-db] enviando SIGTERM a pid', pid);
  try {
    process.kill(pid, 'SIGTERM');
  } catch (e) {
    console.log('[local-db] proceso ya no existe — limpiando pid file');
  }
  try { unlinkSync(PID_FILE); } catch {}
}

function status() {
  if (!existsSync(PID_FILE)) {
    console.log('[local-db] DETENIDO');
    process.exit(1);
  }
  const pid = Number(readFileSync(PID_FILE, 'utf8').trim());
  try {
    process.kill(pid, 0);
    console.log('[local-db] CORRIENDO (pid', pid + ')');
  } catch {
    console.log('[local-db] pid file existe pero proceso no — DETENIDO');
    process.exit(1);
  }
}

if (cmd === 'start') await start();
else if (cmd === 'stop') await stop();
else if (cmd === 'status') status();
else {
  console.error('Uso: node scripts/local-db.mjs [start|stop|status]');
  process.exit(1);
}
