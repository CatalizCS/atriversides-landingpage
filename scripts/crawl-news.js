#!/usr/bin/env node
/**
 * Simple RSS crawler to fetch posts and convert to Markdown with front matter.
 * - Reads sources from assets/news/sources.json
 * - Generates assets/news/<slug>.md and updates assets/news/index.json
 *
 * No external deps to keep repo light. Uses fetch and tiny HTML parsing.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const newsDir = path.join(ROOT, 'assets', 'news');
const indexPath = path.join(newsDir, 'index.json');
const sourcesPath = path.join(newsDir, 'sources.json');

// --- Minimal RSS parsing helpers (no external deps) ---
function parseRss(xml){
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gmi) || [];
  for (const raw of itemBlocks){
    const get = (tag)=>{
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const m = raw.match(re); return m ? getCData(m[1]).trim() : '';
    };
    const title = unescapeXml(get('title'));
    const link = (get('link') || '').trim();
    const pubDate = get('pubDate') || get('dc:date') || '';
    const description = get('description') || '';
    const contentEncoded = get('content:encoded') || '';
    const enclosure = (()=>{
      const m1 = raw.match(/<enclosure\b[^>]*url=["']([^"']+)/i);
      const m2 = raw.match(/<media:content\b[^>]*url=["']([^"']+)/i);
      const url = (m1 && m1[1]) || (m2 && m2[1]) || '';
      return url ? { url } : undefined;
    })();
    items.push({
      title,
      link,
      pubDate,
      description,
      content: contentEncoded || description,
      enclosure
    });
  }
  return items;
}
function getCData(s){
  const c = String(s||'');
  const m = c.match(/<!\[CDATA\[([\s\S]*?)]]>/i);
  return m ? m[1] : c;
}
function unescapeXml(s){
  let t = String(s||'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  // Numeric entities: &#038; &#x26;
  t = t.replace(/&#(\d+);/g, (_,n)=> String.fromCharCode(parseInt(n,10)));
  t = t.replace(/&#x([0-9a-fA-F]+);/g, (_,h)=> String.fromCharCode(parseInt(h,16)));
  return t;
}

async function main(){
  ensureDir(newsDir);
  const sources = readJSON(sourcesPath, { feeds: [] });
  const items = [];

  for (const feed of sources.feeds){
    try {
        let text = await fetchText(feed.url);
        // If not RSS, try WordPress category feed fallback: append /feed/
        if (!looksLikeRss(text)){
          const fallback = wordpressFeedUrl(feed.url);
          if (fallback && fallback !== feed.url){
            try { text = await fetchText(fallback); } catch(_){}
          }
        }
        if (!looksLikeRss(text)) throw new Error('not rss');
        const parsed = parseRss(text);
      for (const it of parsed.slice(0, feed.limit || 5)){
        // Normalize fields
        const title = it.title || 'Bài viết';
        const date = (it.pubDate && new Date(it.pubDate).toISOString().slice(0,10)) || new Date().toISOString().slice(0,10);
        const slug = toSlug(title);
        const cover = it.enclosure?.url || firstImage(it.content) || firstImage(it.description) || '';
        const excerpt = sanitizeText((it.description || '').replace(/<[^>]+>/g,'')).trim().slice(0,180);
        const mdPath = path.join(newsDir, `${slug}.md`);
        // Build markdown with front matter
        const fm = [
          '---',
          `slug: ${slug}`,
          `title: ${escapeYaml(title)}`,
          `date: ${date}`,
          cover ? `cover: ${cover}` : null,
          excerpt ? `excerpt: ${escapeYaml(excerpt)}` : null,
          it.link ? `source: ${it.link}` : null,
          '---',
          ''
        ].filter(Boolean).join('\n');
        const body = htmlToMarkdown(it.content || it.description || '');
        const content = fm + body + '\n';
        // Write file if not exists, else update if changed
        writeIfChanged(mdPath, content);
        items.push({ slug, title, date, excerpt, cover, source: it.link, lang: 'vi' });
      }
    } catch (e){
      log('Feed error', feed.url, e.message);
    }
  }

  if (items.length){
    // sort desc by date
    items.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
    const index = { updatedAt: new Date().toISOString(), items };
    writeIfChanged(indexPath, JSON.stringify(index, null, 2));
  }
}

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function readJSON(p, def){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return def; } }
async function fetchText(u){ const res = await fetch(u); if(!res.ok) throw new Error(`HTTP ${res.status}`); return await res.text(); }
function toSlug(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)+/g,'').slice(0,80) || 'post'; }
function escapeYaml(s){ return String(s).replace(/"/g,'\"'); }
function sanitizeText(s){ return String(s||'').replace(/\s+/g,' ').trim(); }
function looksLikeRss(t){ const s=String(t||''); return /<rss\b|<feed\b|<rdf:RDF\b/i.test(s); }
function wordpressFeedUrl(u){ try { const url = String(u||'').replace(/\/?$/,'/'); return url + 'feed/'; } catch { return null; } }
function firstImage(html){ const m = String(html||'').match(/<img[^>]+src=["']([^"']+)/i); return m? m[1] : ''; }
function htmlToMarkdown(html){
  // Very tiny converter: remove scripts/styles, convert <h1-6>, <p>, <ul><li>, <img>, <a>
  let s = String(html||'');
  s = s.replace(/<\/(script|style)>[\s\S]*?<\/(script|style)>/gi, '');
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_,t)=>`\n# ${stripTags(t)}\n\n`);
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_,t)=>`\n## ${stripTags(t)}\n\n`);
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_,t)=>`\n### ${stripTags(t)}\n\n`);
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_,t)=>`\n${stripTags(t)}\n\n`);
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_,t)=>`- ${stripTags(t)}\n`);
  s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_,t)=>`\n${t}\n`);
  s = s.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_,src)=>`\n![image](${src})\n\n`);
  s = s.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_,href,text)=>`[${stripTags(text)}](${href})`);
  s = s.replace(/<[^>]+>/g,'');
  return s.trim() ? s.trim() + '\n' : '';
}
function stripTags(s){ return String(s||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(); }
function writeIfChanged(p, content){ try { const prev = fs.readFileSync(p,'utf8'); if (prev === content) return; } catch(_){} fs.writeFileSync(p, content, 'utf8'); log('write', path.relative(ROOT,p)); }
function log(...a){ console.log('[news]', ...a); }

main().catch(err=>{ console.error(err); process.exit(1); });
