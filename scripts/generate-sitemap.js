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

  // Derive section anchors from config.sections to stay in sync with site
  const sectionIds = Array.isArray(cfg.sections) ? cfg.sections.map(s => s.id).filter(Boolean) : [];
  const uniqueIds = Array.from(new Set(['home', ...sectionIds]));
  const sectionAnchors = uniqueIds.map(id => `#${id}`);

  // News item URLs (# fragments are generally ignored by bots but included for completeness)
  const items = (newsIdx.items || []).map((it) => ({
    loc: baseUrl ? baseUrl + '#news/' + encodeURIComponent(it.slug) : '#news/' + it.slug,
    lastmod: iso(it.date || newsIdx.updatedAt || new Date()),
    priority: 0.5,
  }));

  const nowIso = iso(new Date());
  // Root URL without hash
  const rootUrl = baseUrl ? baseUrl.replace(/\/$/, '/') : '';
  const coreUrls = [];
  if (rootUrl) {
    coreUrls.push({ loc: rootUrl, lastmod: nowIso, priority: 1.0 });
  }
  // Hash anchors for sections
  coreUrls.push(
    ...sectionAnchors.map((frag) => {
      const id = frag.replace(/^#/, '');
      const priorityMap = {
        'home': 0.9,
        'key-metrics': 0.8,
        'project-info': 0.8,
        'location': 0.8,
        'projects': 0.7,
        'apartments': 0.7,
        'floor-areas': 0.7,
        'materials': 0.6,
        'gallery': 0.6,
        'news': 0.6,
        'contact': 0.6,
        'legal': 0.6,
      };
      const pri = priorityMap[id] ?? 0.5;
      return {
        loc: baseUrl ? baseUrl + frag.replace(/^#?/, '#') : frag,
        lastmod: iso(newsIdx.updatedAt || new Date()),
        priority: pri,
      };
    })
  );

  const urls = coreUrls.concat(items);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <priority>${(typeof u.priority === 'number' ? u.priority : 0.5).toFixed(1)}</priority>\n  </url>`).join('\n') +
`\n</urlset>\n`;

  const outPath = path.join(root, 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log('[sitemap] wrote', path.relative(root, outPath));
})();
