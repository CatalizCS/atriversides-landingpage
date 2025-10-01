// Generate RSS feed (feed.xml) from assets/news
// Usage: node scripts/generate-rss.js
const fs = require('fs');
const path = require('path');

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function safe(s) { return String(s || ''); }
function cdata(s) { return `<![CDATA[${safe(s)}]]>`; }
function iso(d) { try { return new Date(d).toUTCString(); } catch { return new Date().toUTCString(); } }

function parseFrontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/m.exec(text);
  if (!m) return { frontMatter: {}, content: text };
  const yaml = m[1];
  const out = {};
  yaml.split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    out[k] = v.replace(/^"|"$/g, '');
  });
  return { frontMatter: out, content: m[2] };
}

(function main(){
  const root = path.resolve(__dirname, '..');
  const cfg = loadJSON(path.join(root, 'assets', 'config', 'config.json')) || {};
  const newsDir = path.join(root, 'assets', 'news');
  const index = loadJSON(path.join(newsDir, 'index.json')) || { items: [] };
  const base = process.env.SITE_URL || cfg?.site?.meta?.canonical || '';
  const siteTitle = safe(cfg?.site?.title || 'Site');
  const siteDesc = safe(cfg?.site?.meta?.description || '');
  const siteLink = base || 'http://localhost/';

  const items = [];
  for (const it of (index.items || [])) {
    const mdPath = path.join(newsDir, `${it.slug}.md`);
    if (!fs.existsSync(mdPath)) continue;
    const raw = fs.readFileSync(mdPath, 'utf8');
    const { frontMatter, content } = parseFrontMatter(raw);
    items.push({
      title: frontMatter.title || it.title || it.slug,
      link: base ? base.replace(/\/?$/, '/') + '#news/' + encodeURIComponent(it.slug) : '#news/' + it.slug,
      guid: it.source || (base + '|' + it.slug),
      pubDate: iso(frontMatter.date || it.date || index.updatedAt || new Date()),
      description: frontMatter.excerpt || it.excerpt || content.slice(0, 180)
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
`<rss version="2.0">\n` +
`  <channel>\n` +
`    <title>${cdata(siteTitle)}</title>\n` +
`    <link>${siteLink}</link>\n` +
`    <description>${cdata(siteDesc)}</description>\n` +
items.map(x => `    <item>\n      <title>${cdata(x.title)}</title>\n      <link>${x.link}</link>\n      <guid>${cdata(x.guid)}</guid>\n      <pubDate>${x.pubDate}</pubDate>\n      <description>${cdata(x.description)}</description>\n    </item>`).join('\n') +
`\n  </channel>\n` +
`</rss>\n`;

  const outPath = path.join(root, 'feed.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log('[rss] wrote', path.relative(root, outPath));
})();
