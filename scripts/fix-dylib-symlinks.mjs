#!/usr/bin/env node
// El binario beta de @embedded-postgres/darwin-arm64 trae las libs con
// versiones completas (ej: libzstd.1.5.7.dylib) pero los binarios buscan
// los nombres cortos (libzstd.1.dylib). Este script crea los symlinks.

import { readdirSync, symlinkSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = resolve(
  __dirname,
  '../node_modules/.pnpm/@embedded-postgres+darwin-arm64@18.3.0-beta.17/node_modules/@embedded-postgres/darwin-arm64/native/lib',
);

if (!existsSync(LIB_DIR)) {
  console.error('[fix-dylib] no encontré el directorio:', LIB_DIR);
  process.exit(1);
}

const files = readdirSync(LIB_DIR).filter(f => f.endsWith('.dylib'));
let created = 0;

for (const file of files) {
  // libzstd.1.5.7.dylib → base=libzstd, versions=[1,5,7]
  const match = file.match(/^(.+?)\.([0-9.]+)\.dylib$/);
  if (!match) continue;
  const [, base, versionStr] = match;
  const parts = versionStr.split('.');
  if (parts.length < 2) continue;

  for (let i = 1; i < parts.length; i++) {
    const shortVer = parts.slice(0, i).join('.');
    const target = `${base}.${shortVer}.dylib`;
    const targetPath = resolve(LIB_DIR, target);
    if (existsSync(targetPath)) continue;
    try {
      symlinkSync(file, targetPath);
      created++;
    } catch (e) {
      console.warn('[fix-dylib] no pude crear', target, '—', e.message);
    }
  }

  // También crear el nombre base sin versión (libicui18n.dylib → libicui18n.77.1.dylib)
  const baseTarget = `${base}.dylib`;
  const baseTargetPath = resolve(LIB_DIR, baseTarget);
  if (!existsSync(baseTargetPath)) {
    try {
      symlinkSync(file, baseTargetPath);
      created++;
    } catch (e) {
      console.warn('[fix-dylib] no pude crear', baseTarget, '—', e.message);
    }
  }
}

console.log(`[fix-dylib] OK — ${created} symlinks creados`);
