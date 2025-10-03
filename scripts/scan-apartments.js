#!/usr/bin/env node
/**
 * Scan assets/imgs/Mặt bằng căn hộ and generate a sorted manifest at assets/apartments/index.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IMG_DIR = path.join(ROOT, 'assets', 'imgs', 'Mặt bằng căn hộ');
const OUT_DIR = path.join(ROOT, 'assets', 'apartments');
const OUT_FILE = path.join(OUT_DIR, 'index.json');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function viCompare(a,b){ return String(a).localeCompare(String(b), 'vi', { numeric: true, sensitivity: 'base' }); }

function scan(){
  if (!fs.existsSync(IMG_DIR)){
    console.error('[apartments] folder not found:', IMG_DIR);
    process.exit(0);
  }
  const groups = [];
  const entries = fs.readdirSync(IMG_DIR, { withFileTypes: true });
  const flatFiles = [];
  for (const ent of entries){
    if (ent.isDirectory()){
      const dir = path.join(IMG_DIR, ent.name);
      const files = scanDirRecursive(dir);
      files.sort(viCompare);
      const relFiles = files.map(f=> toPosix(path.relative(ROOT, f)).replace(/^/, ''))
        .map(p => toPosix(path.join('assets','imgs','Mặt bằng căn hộ', path.relative(IMG_DIR, path.join(IMG_DIR, p)).split(path.sep).join('/'))));
      // Simpler: build relative from IMG_DIR directly
      const relFromImgDir = files.map(f => toPosix(path.join('assets','imgs','Mặt bằng căn hộ', path.relative(IMG_DIR, f))));
      groups.push({ name: ent.name, files: relFromImgDir });
    } else if (ent.isFile() && /\.(png|jpe?g|webp|gif)$/i.test(ent.name)){
      flatFiles.push(toPosix(path.join('assets','imgs','Mặt bằng căn hộ', ent.name)));
    }
  }
  groups.sort((a,b)=> viCompare(a.name, b.name));
  flatFiles.sort(viCompare);
  const out = { updatedAt: new Date().toISOString(), groups, flatFiles };
  ensureDir(OUT_DIR);
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
  console.log('[apartments] wrote', path.relative(ROOT, OUT_FILE));
}

function toPosix(p){ return p.split(path.sep).join('/'); }

function scanDirRecursive(dir){
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries){
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()){
      out.push(...scanDirRecursive(full));
    } else if (ent.isFile() && /\.(png|jpe?g|webp|gif)$/i.test(ent.name)){
      out.push(full);
    }
  }
  return out;
}

scan();
