// Generate sitemap.xml from config and news index
// Usage: node scripts/generate-sitemap.js
const fs = require('fs');
const path = require('path');

function loadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function ensureTrailingSlash(u) {
  return /\/$/.test(u) ? u : u + '/';
}

function iso(dateStr) {
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

(function main() {
  const root = path.resolve(__dirname, '..');
  const cfg = loadJSON(path.join(root, 'assets', 'config', 'config.json')) || {};
  const newsIdx = loadJSON(path.join(root, 'assets', 'news', 'index.json')) || { items: [] };
  const base = process.env.SITE_URL || cfg?.site?.meta?.canonical || '';
  if (!base) {
    console.warn('[sitemap] Missing site canonical URL in config.site.meta.canonical');
  }
  const baseUrl = base ? base.replace(/\/?$/, '/') : '';

  // Core URLs (single page + hash anchors)
  const core = [
    '',
    '#home',
    '#project-info',
    '#location',
    '#projects',
    '#apartments',
    '#gallery',
    '#news',
    '#contact',
  ];

  // News item URLs (# fragments are generally ignored by bots but included for completeness)
  const items = (newsIdx.items || []).map((it) => ({
    loc: baseUrl ? baseUrl + '#news/' + encodeURIComponent(it.slug) : '#news/' + it.slug,
    lastmod: iso(it.date || newsIdx.updatedAt || new Date()),
  }));

  const urls = core.map((frag) => ({
    loc: baseUrl ? baseUrl + frag.replace(/^#?/, '#') : frag,
    lastmod: iso(newsIdx.updatedAt || new Date()),
  })).concat(items);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`).join('\n') +
`\n</urlset>\n`;

  const outPath = path.join(root, 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log('[sitemap] wrote', path.relative(root, outPath));
})();
