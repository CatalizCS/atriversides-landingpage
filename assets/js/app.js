(function(){
  const state = {
    config: null,
    sectionsOrder: ["home","key-metrics","project-info","location","projects","apartments","amenities","gallery","news","contact"],
    observers: { sections: null },
    swiperInstances: [],
    countups: [],
    lightboxEnabled: false,
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init(){
    try {
  const cfg = await fetchConfig('assets/config/config.json');
      state.config = cfg;
      await ensureLibraries(cfg.libraries);
      if (window.gsap && window.ScrollTrigger && gsap.registerPlugin) {
        try { gsap.registerPlugin(ScrollTrigger); } catch(e){}
      }
      applyDesignTokens(cfg.designTokens);
      applyHeadMeta(cfg);
  // Preload hero image for LCP
  try { const p=document.createElement('link'); p.rel='preload'; p.as='image'; p.href = (function(){ const u = asset(chooseHeroImage(cfg)); try { return new URL(u, location.href).href; } catch { return u; } })(); document.head.appendChild(p); } catch(e){}
      buildHeader(cfg);
      await renderSections(cfg);
      buildFooter(cfg);
      initSmoothScrollAndAnimations();
      initNavActiveObserver();
      initProgressBar();
      injectAnalytics(cfg.site?.analytics);
      // Refresh after images/swipers load
      setTimeout(() => { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, 800);
    } catch (err){
      console.error('Init failed:', err);
    }
  }

  async function fetchConfig(url){
    const res = await fetch(url, { cache: 'no-cache' });
    if(!res.ok) throw new Error('Failed to load config.json');
    return await res.json();
  }

  // Normalize asset URLs so "/assets/..." becomes "assets/..." when not hosted at domain root
  function asset(u){
    if(!u) return u;
    if (/^https?:/i.test(u)) return u;
    return u.replace(/^\//, '');
  }
  function abs(u){
    const a = asset(u);
    try { return new URL(a, location.href).href; } catch { return a; }
  }

  function applyDesignTokens(tokens){
    if(!tokens) return;
    const root = document.documentElement;
    Object.entries(tokens).forEach(([k,v])=>{ root.style.setProperty(k, v); });
  }

  function applyHeadMeta(cfg){
    document.title = cfg.site?.title || 'Dự án';
    const setMeta = (name, content) => {
      if(!content) return;
      let el = document.querySelector(`meta[name="${name}"]`);
      if(!el){ el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', cfg.site?.meta?.description);
    setMeta('keywords', cfg.site?.meta?.keywords);
    setMeta('author', cfg.site?.meta?.author);
    const linkCanon = document.querySelector('link[rel="canonical"]');
    if (cfg.site?.meta?.canonical) linkCanon?.setAttribute('href', cfg.site.meta.canonical);

    // OG/Twitter
    const og = [
      ['property','og:title', cfg.site?.title],
      ['property','og:description', cfg.site?.meta?.description],
      ['property','og:type', 'website'],
      ['property','og:url', cfg.site?.meta?.canonical],
      ['name','twitter:card', 'summary_large_image'],
      ['name','twitter:title', cfg.site?.title],
      ['name','twitter:description', cfg.site?.meta?.description],
    ];
    og.forEach(([attr, name, content])=>{
      if(!content) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if(!el){ el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    });

    const preview = chooseHeroImage(cfg);
    if (preview){
      const addMeta = (attr, name, content)=>{ let m=document.querySelector(`meta[${attr}="${name}"]`); if(!m){ m=document.createElement('meta'); m.setAttribute(attr,name); document.head.appendChild(m);} m.setAttribute('content', content); };
      addMeta('property','og:image', abs(preview));
      addMeta('name','twitter:image', abs(preview));
    }

    // JSON-LD Organization
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': cfg.site?.title,
      'url': cfg.site?.meta?.canonical,
    };
    const script = document.createElement('script'); script.type='application/ld+json'; script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);

    // JSON-LD RealEstateProject (basic)
    const rep = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateProject',
      'name': cfg.site?.title,
      'url': cfg.site?.meta?.canonical,
      'description': cfg.site?.meta?.description
    };
    const script2 = document.createElement('script'); script2.type='application/ld+json'; script2.textContent = JSON.stringify(rep);
    document.head.appendChild(script2);
  }

  async function ensureLibraries(libs){
    if(!libs) return;
    // Fonts first
    if (libs.googleFonts) {
      const link = document.createElement('link');
      link.href = libs.googleFonts; link.rel = 'stylesheet'; document.head.appendChild(link);
    }
    // CSS
    (libs.css || []).forEach(href=>{ const l=document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l); });
    // JS sequential to preserve deps
    for (const src of (libs.js || [])) {
      await loadScript(src);
    }
  }
  function loadScript(src){
    return new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src=src; s.defer=true; s.onload=resolve; s.onerror=()=>reject(new Error('Failed '+src)); document.head.appendChild(s); });
  }

  function buildHeader(cfg){
    const headerInner = document.getElementById('header-inner');
    headerInner.innerHTML = '';
    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = cfg.navigation?.header?.logoHref || '#home';
    const logo = document.createElement('img'); logo.alt = 'Logo'; logo.loading='eager'; logo.decoding='async'; logo.src = asset(cfg.navigation?.header?.logo || 'assets/imgs/logo.png');
    brand.append(logo);
    // Mobile toggle
    const toggle = document.createElement('button'); toggle.className='nav-toggle'; toggle.setAttribute('aria-label','Mở menu'); toggle.setAttribute('aria-expanded','false'); toggle.innerHTML = '<span></span><span></span><span></span>';
    const nav = document.createElement('nav'); nav.className='primary-nav'; const ul=document.createElement('ul'); nav.id='primary-nav'; toggle.setAttribute('aria-controls','primary-nav');
    const links = dedupeLinks([
      ...(cfg.navigation?.header?.current || []),
      ...(cfg.navigation?.header?.next || []),
      ...(cfg.navigation?.footerLinks || []),
    ]);
    links.forEach(l=>{
      const li=document.createElement('li'); const a=document.createElement('a'); a.href=l.href; a.textContent=l.label; a.setAttribute('data-target', l.href);
      li.appendChild(a); ul.appendChild(li);
      a.addEventListener('click', (e)=>{
        const href = a.getAttribute('href')||'';
        if(href.startsWith('#')){
          e.preventDefault();
          const target = document.querySelector(href);
          if (!target) return;
          if (window.__lenis && typeof window.__lenis.scrollTo === 'function') {
            window.__lenis.scrollTo(target, { offset: -10 });
          } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });
    nav.appendChild(ul);
    headerInner.append(brand, toggle, nav);

    // Toggle behavior
    const backdrop = document.getElementById('nav-backdrop');
    const items = ul.querySelectorAll('li');
    toggle.addEventListener('click', ()=>{
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
      document.body.classList.toggle('nav-open', !open);
      if (backdrop) backdrop.hidden = open; // show when opening
      if (window.__lenis && typeof window.__lenis[(open?'start':'stop')] === 'function') window.__lenis[open?'start':'stop']();
      // Slide-in items when opening (mobile)
      if (!open && window.gsap && !prefersReducedMotion()){
        gsap.fromTo(items, { y: -8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3, ease: 'power2.out', stagger: 0.06 });
      }
    });
    // Close on link click or ESC
    function closeNav(){ toggle.setAttribute('aria-expanded','false'); nav.classList.remove('open'); document.body.classList.remove('nav-open'); if (backdrop) backdrop.hidden = true; if (window.__lenis && typeof window.__lenis.start==='function') window.__lenis.start(); }
    nav.addEventListener('click', (e)=>{ const a=e.target.closest('a'); if(a){ closeNav(); } });
    if (backdrop) backdrop.addEventListener('click', closeNav);
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ closeNav(); } });
  }
  function dedupeLinks(arr){
    const map = new Map();
    arr.forEach(l=>{ if(!l?.href) return; if(!map.has(l.href)) map.set(l.href, l); });
    return Array.from(map.values());
  }

  async function renderSections(cfg){
    const main = document.getElementById('main');
    main.innerHTML = '';
    const order = state.sectionsOrder;
    // Track alternating index for split sections
    let splitIndex = 0;

    for (const key of order){
      const secCfg = (cfg.sections || []).find(s=>s.id===key) || { id: key, label: key };
      const section = document.createElement('section'); section.className='section'; section.id = key;
      const head = document.createElement('div'); head.className='section-head container'; const h = document.createElement('h2'); h.textContent = secCfg.label || key; head.appendChild(h);
      const body = document.createElement('div'); body.className='container';
      section.append(head, body);

  if (key === 'home') renderHero(body, cfg);
  else if (key === 'key-metrics') renderMetrics(body, cfg);
  else if (key === 'projects') renderProjectsSlider(body, cfg);
  else if (key === 'gallery') renderGallery(body, cfg);
  else if (key === 'news') renderNews(body, cfg);
  else if (key === 'contact') renderContact(body, cfg);
  else { renderTwoCol(body, cfg, key, splitIndex); splitIndex++; }

      main.appendChild(section);
    }
  }

  function shorten(text, max=160){ if(!text) return ''; const t = text.trim(); return (t.length>max? t.slice(0,max-1)+'…': t); }

  function chooseHeroImage(cfg){
    const rootFiles = cfg.images?.summary?.rootFiles || [];
    if (rootFiles.length) return rootFiles[0];
    const pc = cfg.images?.folders?.['Phối cảnh dự án'] || (cfg.images?.summary?.folders||[]).find(f=>/phối cảnh/i.test(f.name))?.files || [];
    if (pc && pc.length) return pc[0];
  return 'assets/imgs/logo.png';
  }

  function renderHero(body, cfg){
    body.parentElement.classList.add('hero');
  const img = asset(chooseHeroImage(cfg));
  const bg = document.createElement('div'); bg.className='bg'; bg.style.backgroundImage = `url('${img}')`;
    const overlay = document.createElement('div'); overlay.className='overlay';
    const content = document.createElement('div'); content.className='content';
    const h1 = document.createElement('h1'); h1.textContent = cfg.site?.title || 'Dự án';
  const p = document.createElement('p'); p.className='subhead'; p.textContent = shorten(cfg.site?.meta?.description, 160);
    const cta = document.createElement('div'); cta.className='cta';
    const btn1 = document.createElement('a'); btn1.className='btn btn-primary'; btn1.href= cfg.cta?.primary?.href || '#contact'; btn1.textContent = cfg.cta?.primary?.label || 'Đăng ký tư vấn';
    const btn2 = document.createElement('a'); btn2.className='btn btn-secondary'; btn2.href= cfg.cta?.secondary?.href || '#project-info'; btn2.textContent = cfg.cta?.secondary?.label || 'Thông tin dự án';
    cta.append(btn1, btn2);
    content.append(h1,p,cta);
    body.append(content);
    body.parentElement.prepend(bg, overlay);

    // GSAP hero in + parallax bg
    if (window.gsap){
  const tl = gsap.timeline();
  tl.from(content.children, { opacity: 0, y: 18, duration: 0.7, ease: 'power2.out', stagger: 0.07, delay: 0.05 });
      if (window.ScrollTrigger && !prefersReducedMotion()){
        gsap.fromTo(bg, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: body.parentElement, start: 'top top', end: 'bottom top', scrub: 0.6 } });
      }
    }
  }

  function renderMetrics(body, cfg){
    const wrap = document.createElement('div'); wrap.className='metrics';
    const items = cfg.counters?.legacy || [];
    items.slice(0,4).forEach((it, idx)=>{
      const card = document.createElement('div'); card.className='item card'; card.setAttribute('data-count', it.value || 0);
      const num = document.createElement('div'); num.className='num'; num.textContent = '0';
      const label = document.createElement('div'); label.className='label'; label.textContent = it.label || `Chỉ số ${idx+1}`;
      card.append(num, label); wrap.append(card);
    });
    body.append(wrap);

    // CountUp on enter
    const Ctor = window.CountUp || (window.countUp && window.countUp.CountUp);
    if (Ctor){
      const opts = { duration: 2, useEasing: true, separator: '.', decimal: ',', suffix: '' };
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          if(e.isIntersecting){
            const n = e.target.querySelector('.num');
            const v = parseFloat(e.target.getAttribute('data-count')) || 0;
            if(!n._counted){ const cu = new Ctor(n, v, opts); cu.start(); n._counted = true; }
          }
        })
      }, { threshold: 0.4 });
      wrap.querySelectorAll('.item').forEach(el=>io.observe(el));
    }
  }

  function renderTwoCol(body, cfg, key, idx){
    const wrap = document.createElement('div'); wrap.className='split';
    const text = document.createElement('div'); text.className='text';
    const h3 = document.createElement('h3'); h3.textContent = (cfg.sections?.find(s=>s.id===key)?.label) || '';
    const p = document.createElement('p'); p.textContent = 'Thông tin đang được cập nhật. Đây là đoạn giới thiệu ngắn về mục này.';
    text.append(h3,p);
    const media = document.createElement('div'); media.className='media'; const img = document.createElement('img'); img.loading='lazy'; img.decoding='async'; img.alt = h3.textContent; img.src = asset(pickSectionImage(cfg, key)); img.classList.add('zoomable'); img.addEventListener('click', ()=> openLightbox(img.src, img.alt)); media.append(img);
    wrap.append(text, media); body.append(wrap);

    // Mark for GSAP slide-in animations (alternate left/right by index)
    const leftFirst = (idx % 2) === 0; // even index: text from left, image from right; odd: reversed
    text.setAttribute('data-anim', leftFirst ? 'slide-left' : 'slide-right');
    media.setAttribute('data-anim', leftFirst ? 'slide-right' : 'slide-left');

    // Parallax background for the section wrapper
    if (window.gsap && window.ScrollTrigger && !prefersReducedMotion()){
      const sec = body.parentElement; sec.style.overflow='hidden';
      const bg = document.createElement('div'); bg.className='parallax-bg'; bg.style.position='absolute'; bg.style.inset='-10% -5%'; bg.style.background='radial-gradient(1200px 600px at 20% 0%, rgba(242,194,101,0.08), rgba(0,0,0,0))'; bg.style.pointerEvents='none';
      sec.prepend(bg);
      gsap.fromTo(bg, { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.5 } });
    }
  }
  function pickSectionImage(cfg, key){
    const m = {
      'project-info': 'Phối cảnh dự án',
      'location': 'Vị trí và kết nối vùng',
      'apartments': 'Mặt bằng căn hộ',
      'amenities': 'Tiện ích nội và Ngoại khu',
    };
    const folder = m[key];
    const folderObj = cfg.images?.folders?.[folder];
  if (Array.isArray(folderObj) && folderObj.length) return folderObj[0];
    // if object with files prop
    if (folderObj?.files?.length) return folderObj.files[0];
    // summary fallback
    const sumFolder = (cfg.images?.summary?.folders||[]).find(f=>f.name===folder);
    if (sumFolder?.files?.length) return sumFolder.files[0];
    return chooseHeroImage(cfg);
  }

  function renderProjectsSlider(body, cfg){
    const container = document.createElement('div'); container.className='projects-swiper swiper';
    const wrapper = document.createElement('div'); wrapper.className='swiper-wrapper';
    const sliderCfg = (cfg.sliders||[])[0] || {};
    (sliderCfg.slides||[]).forEach(sl=>{
      const slide = document.createElement('div'); slide.className='swiper-slide';
      const card = document.createElement('div'); card.className='card';
       const img = document.createElement('img'); img.src = asset(sl.image); img.alt = sl.title || 'Dự án'; img.loading='lazy'; img.decoding='async'; img.classList.add('zoomable'); img.addEventListener('click', ()=> openLightbox(img.src, img.alt));
      const cap = document.createElement('div'); cap.style.padding='12px'; const t=document.createElement('div'); t.style.fontWeight='700'; t.textContent=sl.title||''; const d=document.createElement('div'); d.style.opacity='0.8'; d.textContent=sl.desc||''; cap.append(t,d);
      card.append(img, cap); slide.append(card); wrapper.append(slide);
    });
    container.append(wrapper);
    // nav/pagination
    const pag=document.createElement('div'); pag.className='swiper-pagination'; const prev=document.createElement('div'); prev.className='swiper-button-prev'; const next=document.createElement('div'); next.className='swiper-button-next'; container.append(pag, prev, next);
    body.append(container);

    // init after next tick
    setTimeout(()=>{
      if (window.Swiper){ const inst = new Swiper(container, sliderCfg.config||{}); state.swiperInstances.push(inst); if(window.ScrollTrigger) ScrollTrigger.refresh(); }
    }, 0);
  }

  function renderGallery(body, cfg){
    const wrap = document.createElement('div'); wrap.className='gallery';
  const tabs = document.createElement('div'); tabs.className='tabs'; tabs.setAttribute('role','tablist');
    const grid = document.createElement('div'); grid.className='grid';
    wrap.append(tabs, grid); body.append(wrap);

    const tabDefs = cfg.gallery?.tabs || [
      { key: 'all', label: 'Tất cả' },
      { key: 'exterior', label: 'Phối cảnh' },
      { key: 'amenities', label: 'Tiện ích' },
      { key: 'location', label: 'Vị trí' },
      { key: 'apartments', label: 'Căn hộ' },
    ];
    const items = flattenImagesToGallery(cfg);
    let active = 'all';

    tabDefs.forEach((t, i)=>{
      const b=document.createElement('button'); b.type='button'; b.textContent=t.label; b.setAttribute('data-key', t.key); b.setAttribute('aria-pressed', String(i===0)); b.setAttribute('role','tab'); b.setAttribute('tabindex', i===0? '0':'-1');
      b.addEventListener('click', ()=>{ active=t.key; tabs.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); renderGrid(); });
      b.addEventListener('keydown', (e)=>{ if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ const btns=[...tabs.querySelectorAll('button')]; const idx=btns.indexOf(b); const next = e.key==='ArrowRight'? (idx+1)%btns.length : (idx-1+btns.length)%btns.length; btns[next].focus(); } });
      tabs.append(b);
    });

    function renderGrid(){
      grid.innerHTML='';
      const list = items.filter(it=> active==='all' || it.category===active);
      list.forEach(it=>{
  const a=document.createElement('a'); a.href=asset(it.src); a.className='item'; a.setAttribute('data-category', it.category);
  const img=document.createElement('img'); img.src=asset(it.src); img.alt=it.alt||it.category; img.loading='lazy'; img.decoding='async';
        a.append(img); grid.append(a);
        if (cfg.gallery?.itemsUseLightbox) a.addEventListener('click', (e)=>{ e.preventDefault(); openLightbox(it.src, img.alt); });
      })
    }

    renderGrid();
  }
  function flattenImagesToGallery(cfg){
    const out = [];
    const map = [
      { name: 'Phối cảnh dự án', cat: 'exterior' },
      { name: 'Tiện ích nội và Ngoại khu', cat: 'amenities' },
      { name: 'Vị trí và kết nối vùng', cat: 'location' },
      { name: 'Mặt bằng căn hộ', cat: 'apartments' },
    ];
    const foldersSummary = cfg.images?.summary?.folders || [];
    foldersSummary.forEach(f=>{
      const m = map.find(x=>x.name===f.name);
      const cat = m?.cat || 'exterior';
  (f.files||[]).forEach(src=> out.push({ src, category: cat, alt: `${f.name}` }));
    });
    return out;
  }

  function openLightbox(src, alt){
    const lb = document.getElementById('lightbox');
    lb.innerHTML = '';
     const img = document.createElement('img'); img.src=src; img.alt=alt||''; img.style.cursor='zoom-out';
    const btn = document.createElement('button'); btn.className='close'; btn.textContent='Đóng (Esc)'; btn.addEventListener('click', closeLightbox);
    lb.append(img, btn); lb.hidden=false;
     // Try fullscreen for better viewing on supported browsers
     if (lb.requestFullscreen) { try { lb.requestFullscreen(); } catch(e){} }
    const onKey = (e)=>{ if(e.key==='Escape') { closeLightbox(); } };
    document.addEventListener('keydown', onKey, { once: true });
    lb.addEventListener('click', (e)=>{ if(e.target===lb) closeLightbox(); });
     function closeLightbox(){
       lb.hidden=true; lb.innerHTML=''; document.removeEventListener('keydown', onKey);
       if (document.fullscreenElement && document.exitFullscreen) { try { document.exitFullscreen(); } catch(e){} }
     }
  }

  function renderNews(body, cfg){
    const grid = document.createElement('div'); grid.className='news-grid';
    for (let i=0; i<3; i++){
      const card = document.createElement('div'); card.className='news-card card';
      card.setAttribute('data-aos','fade-up');
      const img = document.createElement('img'); img.src = asset(chooseHeroImage(cfg)); img.alt='Tin tức'; img.loading='lazy'; img.decoding='async'; img.classList.add('zoomable'); img.addEventListener('click', ()=> openLightbox(img.src, img.alt));
      const title = document.createElement('h3'); title.textContent = `Tin tức ${i+1}`;
      const meta = document.createElement('div'); meta.className='meta'; meta.textContent = new Date().toLocaleDateString('vi-VN');
      const p = document.createElement('p'); p.textContent='Nội dung sẽ được cập nhật sau. Đây là mô tả ngắn của bài viết.';
      const a = document.createElement('a'); a.href='#'; a.className='btn'; a.textContent='Xem chi tiết';
      card.append(img, title, meta, p, a); grid.append(card);
    }
    body.append(grid);
  }

  function renderContact(body, cfg){
    const wrap = document.createElement('div'); wrap.className='forms';
    wrap.append(buildForm(cfg.forms?.leadForm, true), buildForm(cfg.forms?.contactForm, false));
    body.append(wrap);
  }

  function buildForm(formCfg, isLead){
    const form = document.createElement('form'); form.className='form'; form.noValidate=true; form.method='POST'; form.target = formCfg?.targetIframe || '_self'; form.action = formCfg?.googleFormAction || '#';
    const h2=document.createElement('h3'); h2.textContent=formCfg?.title || (isLead?'Đăng ký tư vấn':'Liên hệ'); form.append(h2);
    const row=document.createElement('div'); row.className='row'; form.append(row);
    const fields = formCfg?.fields || [];
    const entryMap = formCfg?.entryMap || {};

    // hidden iframe target
    if (form.target && form.target !== '_self') ensureIframe(form.target);

    fields.forEach(f=>{
      const field=document.createElement('div'); field.className='field';
      const id = `${(formCfg?.id||'form')}-${f.name}`;
      const label=document.createElement('label'); label.setAttribute('for', id); label.textContent=f.label||f.name;
      let input;
      if (f.type==='select'){
        input=document.createElement('select');
        (f.options||[]).forEach(o=>{ const opt=document.createElement('option'); opt.value=o; opt.textContent=o; input.append(opt); });
      } else if (f.type==='textarea'){
        input=document.createElement('textarea');
      } else {
        input=document.createElement('input'); input.type=f.type||'text';
      }
      input.id=id; input.name=f.name; input.placeholder=f.placeholder||''; if(f.required) input.required=true; input.autocomplete=f.autocomplete||'on';
      if (f.name==='hp'){ field.style.display='none'; input.tabIndex=-1; }
      field.append(label, input); row.append(field);
    });

    const actions=document.createElement('div'); actions.className='actions'; const submit=document.createElement('button'); submit.type='submit'; submit.className='btn btn-primary'; submit.textContent=formCfg?.submitLabel||'Gửi'; actions.append(submit); form.append(actions);

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      // honeypot
      const hp = form.querySelector('[name="hp"]'); if(hp && hp.value){ showToast('Không thể gửi vì nghi ngờ bot.', true); return; }
      // validations
      const name = form.querySelector('[name="name"]'); const phone=form.querySelector('[name="phone"]'); const email=form.querySelector('[name="email"]');
  const emailOk = !email || /.+@.+\..+/.test(email.value);
  const phoneDigits = phone ? (phone.value.match(/\d/g)||[]).length : 0;
  const phoneOk = !phone || (phoneDigits >= 9 && phoneDigits <= 12);
      if (name && !name.value.trim()) { showToast('Vui lòng nhập họ tên.', true); name.focus(); return; }
      if (phone && !phoneOk) { showToast('Số điện thoại không hợp lệ.', true); phone.focus(); return; }
      if (email && !emailOk) { showToast('Email không hợp lệ.', true); email.focus(); return; }

      // Map to Google Form format (entry.<id>=value)
      const formData = new FormData();
      ;(formCfg.fields||[]).forEach(f=>{
        if(f.name==='hp') return;
        const val = form.querySelector(`[name="${f.name}"]`)?.value || '';
        const entryId = entryMap[f.name];
        if (entryId) formData.append(`entry.${entryId}`, val);
      });
      // Use hidden iframe to avoid navigation
      const iframeName = formCfg.targetIframe || '_self';
      if (iframeName !== '_self'){
        const iframe = ensureIframe(iframeName);
        submit.disabled=true;
        postToGoogle(form.action, formData, iframeName)
          .then(()=> showToast('Gửi thông tin thành công!'))
          .catch(()=> showToast('Gửi thông tin thất bại.', true))
          .finally(()=> submit.disabled=false);
      } else {
        // fallback submit
        form.submit();
      }
    });

    return form;
  }

  function ensureIframe(name){
    const root = document.getElementById('iframes-root');
    let iframe = root.querySelector(`iframe[name="${name}"]`);
    if(!iframe){ iframe = document.createElement('iframe'); iframe.name=name; iframe.hidden=true; root.append(iframe); }
    return iframe;
  }
  function postToGoogle(action, formData, target){
    return new Promise((resolve, reject)=>{
      const form=document.createElement('form'); form.method='POST'; form.action=action; form.target=target; form.style.display='none';
      for (const [k,v] of formData.entries()){
        const input=document.createElement('input'); input.type='hidden'; input.name=k; input.value=v; form.append(input);
      }
      document.body.append(form);
      const iframe = document.querySelector(`iframe[name="${target}"]`);
      const onLoad = ()=>{ cleanup(); resolve(); };
      const onError = ()=>{ cleanup(); reject(new Error('submit failed')); };
      const cleanup=()=>{ iframe?.removeEventListener('load', onLoad); iframe?.removeEventListener('error', onError); form.remove(); };
      iframe?.addEventListener('load', onLoad, { once: true });
      iframe?.addEventListener('error', onError, { once: true });
      form.submit();
    });
  }

  function showToast(msg, error){
    const root = document.getElementById('toast');
    const el = document.createElement('div'); el.className='toast'+(error?' error':' success'); el.textContent=msg; root.append(el);
    setTimeout(()=>{ el.remove(); }, 4000);
  }

  function initNavActiveObserver(){
    const sections = state.sectionsOrder.map(id=> document.getElementById(id)).filter(Boolean);
    const links = Array.from(document.querySelectorAll('nav.primary-nav a'));
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const id = '#'+e.target.id;
          links.forEach(a=> a.setAttribute('aria-current', a.getAttribute('href')===id ? 'page' : 'false'));
        }
      })
    }, { threshold: 0.6 });
    sections.forEach(s=> io.observe(s));
  }

  function initProgressBar(){
    const bar = document.getElementById('progress-bar');
    const onScroll = ()=>{
      const h = document.documentElement; const sc = h.scrollTop; const max = h.scrollHeight - h.clientHeight; const p = max>0 ? (sc/max) : 0; bar.style.transform = `scaleX(${p})`;
    };
    document.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  function initSmoothScrollAndAnimations(){
    // Header blur threshold
    const header = document.getElementById('site-header');
    const onScrollHdr = ()=>{ if(window.scrollY>60) header.classList.add('scrolled'); else header.classList.remove('scrolled'); };
    document.addEventListener('scroll', onScrollHdr, { passive: true }); onScrollHdr();

    // Lenis
    if (window.Lenis){
      const lenis = new Lenis({ smoothWheel: true, smoothTouch: true });
      window.__lenis = lenis;
      // Keep ScrollTrigger in sync with Lenis
      if (window.ScrollTrigger && typeof lenis.on === 'function') {
        try { lenis.on('scroll', () => ScrollTrigger.update()); } catch(e){}
      }
      function raf(time){ lenis.raf(time); if (window.ScrollTrigger) ScrollTrigger.update(); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }

  // AOS
  if (window.AOS){ AOS.init({ once: true, duration: 700, easing: 'ease-out' }); }

    // Section header reveals
    if (window.gsap && window.ScrollTrigger && !prefersReducedMotion()){
      if (gsap.registerPlugin && window.ScrollTrigger) { try { gsap.registerPlugin(ScrollTrigger); } catch(e){} }
      const heads = Array.from(document.querySelectorAll('.section .section-head'));
      heads.forEach((el, idx)=>{
        const dir = (idx % 2 === 0) ? -24 : 24;
        const children = el.querySelectorAll('h2, .sub');
        children.forEach(ch => { ch.style.willChange = 'transform, opacity'; });
        gsap.fromTo(children,
          { x: dir, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.7,
            ease: 'power2.out',
            stagger: 0.08,
            clearProps: 'transform,opacity',
            scrollTrigger: { trigger: el, start: 'top 85%', once: true },
            onComplete(){ children.forEach(ch => { ch.style.willChange = 'auto'; }); }
          }
        );
      });

      // Slide-in for marked elements
      document.querySelectorAll('[data-anim]')
        .forEach(el => {
          const dir = el.getAttribute('data-anim');
          const fromX = dir === 'slide-right' ? 32 : -32;
          el.style.willChange = 'transform, opacity';
          gsap.fromTo(el,
            { x: fromX, autoAlpha: 0 },
            {
              x: 0,
              autoAlpha: 1,
              duration: 0.7,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
              scrollTrigger: { trigger: el, start: 'top 85%', once: true },
              onComplete(){ el.style.willChange = 'auto'; }
            }
          );
        });
    } else if (!prefersReducedMotion()) {
      // Fallback: IntersectionObserver-based simple slide-ins (no GSAP/ScrollTrigger)
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          if (!e.isIntersecting) return;
          const el = e.target;
          io.unobserve(el);
          const isHead = el.classList.contains('section-head');
          if (isHead){
            const idx = Array.from(document.querySelectorAll('.section .section-head')).indexOf(el);
            const dir = (idx % 2 === 0) ? -24 : 24;
            const kids = el.querySelectorAll('h2, .sub');
            kids.forEach((ch, i)=>{
              ch.style.willChange = 'transform, opacity';
              ch.style.transform = `translateX(${dir}px)`; ch.style.opacity = '0';
              ch.style.transition = 'transform .6s ease, opacity .6s ease';
              setTimeout(()=>{
                ch.style.transform = 'translateX(0)'; ch.style.opacity = '1';
                setTimeout(()=>{ ch.style.willChange='auto'; ch.style.transition=''; }, 700);
              }, i*80);
            });
          } else {
            const d = el.getAttribute('data-anim') === 'slide-right' ? 32 : -32;
            el.style.willChange = 'transform, opacity';
            el.style.transform = `translateX(${d}px)`; el.style.opacity = '0';
            el.style.transition = 'transform .7s ease, opacity .7s ease';
            requestAnimationFrame(()=>{
              el.style.transform = 'translateX(0)'; el.style.opacity = '1';
              setTimeout(()=>{ el.style.willChange='auto'; el.style.transition=''; }, 800);
            });
          }
        });
      }, { threshold: 0.2 });
      document.querySelectorAll('.section .section-head, [data-anim]').forEach(el=> io.observe(el));
    }

    // Refresh triggers after full load
    window.addEventListener('load', ()=>{ if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, { once: true });

    // Floating CTA
    const fcta = document.getElementById('floating-cta');
    if (fcta){
      const showAfter = document.getElementById('home');
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{ fcta.hidden = e.isIntersecting; });
      }, { threshold: 0.2 });
      if (showAfter) io.observe(showAfter);
      fcta.addEventListener('click', ()=>{
        const target = document.querySelector('#contact');
        if (!target) return;
        if (window.__lenis && typeof window.__lenis.scrollTo==='function') window.__lenis.scrollTo(target, { offset: -10 }); else target.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Back-to-top
    const btt = document.getElementById('back-to-top');
    if (btt){
      const onVis = ()=>{ btt.hidden = window.scrollY < 400; };
      document.addEventListener('scroll', onVis, { passive: true }); onVis();
      btt.addEventListener('click', ()=>{
        if (window.__lenis && typeof window.__lenis.scrollTo==='function') window.__lenis.scrollTo(0, { offset: 0 }); else window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function prefersReducedMotion(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function buildFooter(cfg){
    const inner = document.getElementById('footer-inner'); inner.innerHTML='';
    const cols = document.createElement('div'); cols.className='cols container';
    const about = document.createElement('div'); const h=document.createElement('h4'); h.textContent=cfg.site?.title||''; const p=document.createElement('p'); p.textContent= cfg.site?.meta?.description || ''; about.append(h,p);
    const links1 = document.createElement('div'); const h1=document.createElement('h4'); h1.textContent='Liên kết'; const ul1=document.createElement('ul'); ul1.style.listStyle='none'; ul1.style.padding='0';
    const links = dedupeLinks([...(cfg.navigation?.header?.current||[]), ...(cfg.navigation?.header?.next||[]), ...(cfg.navigation?.footerLinks||[])]);
    links.forEach(l=>{ const li=document.createElement('li'); const a=document.createElement('a'); a.href=l.href; a.textContent=l.label; li.append(a); ul1.append(li); });
    links1.append(h1, ul1);
    const contact = document.createElement('div'); const h2=document.createElement('h4'); h2.textContent='Liên hệ'; const ul2=document.createElement('ul'); ul2.style.listStyle='none'; ul2.style.padding='0';
    ;(cfg.site?.contacts||[]).forEach(c=>{ const li=document.createElement('li'); li.textContent = c; ul2.append(li); });
    contact.append(h2, ul2);
    cols.append(about, links1, contact);
    inner.append(cols);
  }

  function injectAnalytics(a){
    if(!a) return;
    // GTM
    if (a.gtmContainerId){
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',a.gtmContainerId);
      const nos = document.createElement('noscript'); nos.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${a.gtmContainerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`; document.body.prepend(nos);
    }
    // GA4
    if (a.ga4MeasurementId){
      const s=document.createElement('script'); s.async=true; s.src=`https://www.googletagmanager.com/gtag/js?id=${a.ga4MeasurementId}`; document.head.appendChild(s);
      window.dataLayer=window.dataLayer||[]; function gtag(){dataLayer.push(arguments);} window.gtag=gtag; gtag('js', new Date()); gtag('config', a.ga4MeasurementId);
    }
    // Facebook Pixel
    if (a.facebookPixelId){
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod? n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n; n.loaded=!0;n.version='2.0';n.queue=[]; t=b.createElement(e);t.async=!0;t.src=v; s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', a.facebookPixelId); fbq('track', 'PageView');
    }
    // Hotjar
    if (a.hotjarId){ (function(h,o,t,j,a,r){ h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)}; h._hjSettings={hjid:a,hjsv:6}; a=o.getElementsByTagName('head')[0]; r=o.createElement('script'); r.async=1; r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv; a.appendChild(r); })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=', a.hotjarId); }
    // Clarity
    if (a.clarityId){ (function(c,l,a,r,i,t,y){ c[a]=c[a]||function(){ (c[a].q=c[a].q||[]).push(arguments) }; t=l.createElement(r); t.async=1; t.src="https://www.clarity.ms/tag/"+i; y=l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t,y); })(window, document, "clarity", "script", a.clarityId); }
  }

})();
