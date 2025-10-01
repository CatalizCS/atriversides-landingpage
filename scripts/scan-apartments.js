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
      const files = (fs.readdirSync(dir) || []).filter(f=>/\.(png|jpe?g|webp|gif)$/i.test(f));
      files.sort(viCompare);
      const relFiles = files.map(f=> toPosix(path.join('assets','imgs','Mặt bằng căn hộ', ent.name, f)));
      groups.push({ name: ent.name, files: relFiles });
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

scan();
