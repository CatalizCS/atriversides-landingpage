(function () {
  const state = {
    config: null,
    sectionsOrder: [
      "home",
      "key-metrics",
      "project-info",
      "location",
      "projects",
      "apartments",
      "amenities",
      "gallery",
      "news",
      "contact",
    ],
    observers: { sections: null },
    swiperInstances: [],
    countups: [],
    lightboxEnabled: false,
  };

  document.addEventListener("DOMContentLoaded", init);

  // Preloader helpers
  let __preloaderEl = null;
  let __preloaderHidden = false;
  let __preloaderStart = 0;
  function showPreloader(defaultLogo) {
    if (__preloaderEl) return;
    __preloaderStart = performance.now();
    try {
      document.body.classList.add("preload-active");
    } catch (_) {}
    const d = document.createElement("div");
    d.id = "preloader";
    d.setAttribute("aria-busy", "true");
    d.setAttribute("aria-live", "polite");
    const inner = document.createElement("div");
    inner.className = "inner";
    const img = document.createElement("img");
    img.className = "logo";
    img.alt = "Logo";
    img.loading = "eager";
    img.decoding = "async";
    img.src = defaultLogo || "assets/imgs/logo.png";
    const bar = document.createElement("div");
    bar.className = "bar";
    inner.append(img, bar);
    d.append(inner);
    document.body.append(d);
    __preloaderEl = d;
  }
  function updatePreloaderLogo(u) {
    if (!__preloaderEl || !u) return;
    const img = __preloaderEl.querySelector("img.logo");
    if (img) {
      try {
        img.src = asset(u);
      } catch (_) {}
    }
  }
  function hidePreloaderAfterMin(minMs = 2000, maxMs = 3000) {
    const hide = () => {
      if (__preloaderHidden) return;
      __preloaderHidden = true;
      const el = __preloaderEl;
      if (!el) return;
      // Start overlay fade-out
      el.classList.add("hide");
      // Trigger page fade-in on next frame to ensure transition applies
      try {
        requestAnimationFrame(() => {
          document.body.classList.remove("preload-active");
        });
      } catch (_) {
        try {
          document.body.classList.remove("preload-active");
        } catch (__) {}
      }
      // Remove preloader after transition end (with fallback)
      const cleanup = () => {
        try {
          el.remove();
        } catch (_) {}
        __preloaderEl = null;
      };
      el.addEventListener("transitionend", cleanup, { once: true });
      setTimeout(cleanup, 900);
    };
    const elapsed = performance.now() - __preloaderStart;
    const remain = Math.max(0, minMs - elapsed);
    setTimeout(hide, remain);
    setTimeout(hide, maxMs);
  }

  async function init() {
    try {
      // Apply animation override via URL/localStorage (bypass prefers-reduced-motion)
      try {
        const p = new URLSearchParams(location.search);
        const forceOn =
          p.get("anim") === "on" || localStorage.getItem("anim") === "on";
        if (forceOn) {
          document.documentElement.classList.add("anim-override");
        }
      } catch (_) {}
      try {
        const usp = new URLSearchParams(location.search);
        if (usp.has("redirect")) {
          const cleaned =
            location.pathname.replace(/index\.html$/i, "") +
            (location.hash || "#home");
          history.replaceState(null, "", cleaned);
        }
      } catch (_) {}
      // Show preloader immediately and schedule hide window
      showPreloader("assets/imgs/logo.png");
      hidePreloaderAfterMin(2000, 3000);
      const cfg = await fetchConfig("assets/config/config.json");
      state.config = cfg;
      if (Array.isArray(cfg.sections) && cfg.sections.length) {
        state.sectionsOrder = cfg.sections.map((s) => s.id).filter(Boolean);
      }
      if (isDebug()) {
        console.info("[Init] Debug on");
      }
      updatePreloaderLogo(cfg.navigation?.header?.logo);
      await ensureLibraries(cfg.libraries);
      if (window.gsap && window.ScrollTrigger && gsap.registerPlugin) {
        try {
          gsap.registerPlugin(ScrollTrigger);
        } catch (e) {}
      }
      applyDesignTokens(cfg.designTokens);
      applyHeadMeta(cfg);
      try {
        const p = document.createElement("link");
        p.rel = "preload";
        p.as = "image";
        p.href = (function () {
          const u = asset(chooseHeroImage(cfg));
          try {
            return new URL(u, location.href).href;
          } catch {
            return u;
          }
        })();
        document.head.appendChild(p);
      } catch (e) {}
      buildHeader(cfg);
      await renderSections(cfg);
      buildFooter(cfg);

      initSmoothScrollAndAnimations();
      initDoubleClickZoom();
      initNavActiveObserver();
      initProgressBar();
      injectAnalytics(cfg.site?.analytics);
      setTimeout(() => {
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      }, 800);
      setTimeout(() => {
        try {
          document.body.classList.remove("preload-active");
        } catch (_) {}
      }, 1200);
      if (isDebug()) {
        console.info("[Libs]", {
          hasLenis: !!window.Lenis,
          hasGSAP: !!window.gsap,
          hasScrollTrigger: !!window.ScrollTrigger,
          hasAOS: !!window.AOS,
          motionEnabled: motionEnabled(),
          prefersReduced: prefersReducedMotion(),
        });
      }
    } catch (err) {
      console.error("Init failed:", err);
      // Preloader will auto-hide after the scheduled max timeout (3s)
    }
  }

  async function fetchConfig(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load config.json");
    return await res.json();
  }

  // Normalize asset URLs so "/assets/..." becomes "assets/..." when not hosted at domain root
  function asset(u) {
    if (!u) return u;
    if (/^https?:/i.test(u)) return u;
    return u.replace(/^\//, "");
  }
  function abs(u) {
    const a = asset(u);
    try {
      return new URL(a, location.href).href;
    } catch {
      return a;
    }
  }

  function decodeEntities(str) {
    try {
      const d = document.createElement("div");
      d.innerHTML = String(str || "");
      return d.textContent || String(str || "");
    } catch {
      return String(str || "");
    }
  }

  function applyDesignTokens(tokens) {
    if (!tokens) return;
    const root = document.documentElement;
    Object.entries(tokens).forEach(([k, v]) => {
      root.style.setProperty(k, v);
    });
  }

  function applyHeadMeta(cfg) {
    document.title = cfg.site?.title || "Dự án";
    const setMeta = (name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("description", cfg.site?.meta?.description);
    setMeta("keywords", cfg.site?.meta?.keywords);
    setMeta("author", cfg.site?.meta?.author);
    const linkCanon = document.querySelector('link[rel="canonical"]');
    if (cfg.site?.meta?.canonical)
      linkCanon?.setAttribute("href", cfg.site.meta.canonical);

    // OG/Twitter
    const og = [
      ["property", "og:title", cfg.site?.title],
      ["property", "og:description", cfg.site?.meta?.description],
      ["property", "og:type", "website"],
      ["property", "og:url", cfg.site?.meta?.canonical],
      ["name", "twitter:card", "summary_large_image"],
      ["name", "twitter:title", cfg.site?.title],
      ["name", "twitter:description", cfg.site?.meta?.description],
    ];
    og.forEach(([attr, name, content]) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    });

    const preview = chooseHeroImage(cfg);
    if (preview) {
      const addMeta = (attr, name, content) => {
        let m = document.querySelector(`meta[${attr}="${name}"]`);
        if (!m) {
          m = document.createElement("meta");
          m.setAttribute(attr, name);
          document.head.appendChild(m);
        }
        m.setAttribute("content", content);
      };
      addMeta("property", "og:image", abs(preview));
      addMeta("name", "twitter:image", abs(preview));
    }

    // JSON-LD Organization
    const ld = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: cfg.site?.title,
      url: cfg.site?.meta?.canonical,
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);

    // JSON-LD RealEstateProject (basic)
    const rep = {
      "@context": "https://schema.org",
      "@type": "RealEstateProject",
      name: cfg.site?.title,
      url: cfg.site?.meta?.canonical,
      description: cfg.site?.meta?.description,
    };
    const script2 = document.createElement("script");
    script2.type = "application/ld+json";
    script2.textContent = JSON.stringify(rep);
    document.head.appendChild(script2);
  }

  async function ensureLibraries(libs) {
    if (!libs) return;
    // Fonts first
    if (libs.googleFonts) {
      const link = document.createElement("link");
      link.href = libs.googleFonts;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    // CSS
    (libs.css || []).forEach((href) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      document.head.appendChild(l);
    });
    // JS sequential to preserve deps
    for (const src of libs.js || []) {
      await loadScript(src);
    }
  }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed " + src));
      document.head.appendChild(s);
    });
  }

  function buildHeader(cfg) {
    const headerInner = document.getElementById("header-inner");
    headerInner.innerHTML = "";
    const brand = document.createElement("a");
    brand.className = "brand";
    brand.href = cfg.navigation?.header?.logoHref || "#home";
    const logo = document.createElement("img");
    logo.alt = "Logo";
    logo.loading = "eager";
    logo.decoding = "async";
    logo.src = asset(cfg.navigation?.header?.logo || "assets/imgs/logo.png");
    brand.append(logo);
    // Mobile toggle
    const toggle = document.createElement("button");
    toggle.className = "nav-toggle";
    toggle.setAttribute("aria-label", "Mở menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "<span></span><span></span><span></span>";
    const nav = document.createElement("nav");
    nav.className = "primary-nav";
    const ul = document.createElement("ul");
    nav.id = "primary-nav";
    toggle.setAttribute("aria-controls", "primary-nav");
    const links = dedupeLinks([
      ...(cfg.navigation?.header?.current || []),
      ...(cfg.navigation?.header?.next || []),
      ...(cfg.navigation?.footerLinks || []),
    ]);
    // Desktop: keep first N links and collapse the rest into a "More" menu
    const MAX_DESKTOP_PRIMARY = 4;
    const primary = links.slice(0, MAX_DESKTOP_PRIMARY);
    const overflow = links.slice(MAX_DESKTOP_PRIMARY);

    function attachLink(liEl, link) {
      const a = document.createElement("a");
      a.href = link.href;
      a.textContent = link.label;
      a.setAttribute("data-target", link.href);
      liEl.appendChild(a);
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href") || "";
        if (href.startsWith("#")) {
          if (href.includes("/")) return;
          const id = href.slice(1);
          const target = document.getElementById(id);
          if (!target) return;
          if (href !== (location.hash || "")) {
            try {
              const navEl = document.querySelector("nav.primary-nav");
              if (navEl && navEl.classList.contains("open")) {
                closeNav();
              }
            } catch (_) {}
            return;
          }
          e.preventDefault();
          try {
            const navEl = document.querySelector("nav.primary-nav");
            if (navEl && navEl.classList.contains("open")) {
              closeNav();
            }
          } catch (_) {}
          const headerH =
            (document.getElementById("site-header")?.offsetHeight || 0) + 6;
          if (window.__lenis && typeof window.__lenis.scrollTo === "function") {
            window.__lenis.scrollTo(target, { offset: -headerH });
          } else {
            const top =
              target.getBoundingClientRect().top +
              (window.scrollY || window.pageYOffset) -
              headerH;
            try {
              window.scrollTo({ top, behavior: "smooth" });
            } catch (_) {
              window.scrollTo(0, top);
            }
          }
        }
      });
    }

    primary.forEach((l) => {
      const li = document.createElement("li");
      attachLink(li, l);
      ul.appendChild(li);
    });
    if (overflow.length) {
      const moreLi = document.createElement("li");
      moreLi.className = "more";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "more-toggle";
      btn.setAttribute("aria-haspopup", "true");
      btn.setAttribute("aria-expanded", "false");
      btn.textContent = "Thêm";
      const menu = document.createElement("ul");
      menu.className = "more-menu";
      overflow.forEach((l) => {
        const li = document.createElement("li");
        attachLink(li, l);
        menu.appendChild(li);
      });
      moreLi.append(btn, menu);
      ul.appendChild(moreLi);
      const closeMore = () => {
        moreLi.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      };
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = moreLi.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(open));
      });
      document.addEventListener("click", (e) => {
        if (!moreLi.contains(e.target)) closeMore();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMore();
      });
    }
    nav.appendChild(ul);
    headerInner.append(brand, toggle, nav);

    // Toggle behavior
    const backdrop = document.getElementById("nav-backdrop");
    const items = ul.querySelectorAll("li");

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("open", !open);
      document.body.classList.toggle("nav-open", !open);
      if (backdrop) backdrop.hidden = open; // show when opening
      if (
        window.__lenis &&
        typeof window.__lenis[open ? "start" : "stop"] === "function"
      )
        window.__lenis[open ? "start" : "stop"]();
      if (!open && window.gsap && !prefersReducedMotion()) {
        gsap.fromTo(
          items,
          { y: -8, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.3,
            ease: "power2.out",
            stagger: 0.06,
          }
        );
      }
    });

    function closeNav() {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
      document.body.classList.remove("nav-open");
      if (backdrop) backdrop.hidden = true;
      if (window.__lenis && typeof window.__lenis.start === "function")
        window.__lenis.start();
      const m = nav.querySelector(".more.open");
      if (m) {
        m.classList.remove("open");
        const b = m.querySelector(".more-toggle");
        b && b.setAttribute("aria-expanded", "false");
      }
    }

    nav.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a");
      if (a) {
        closeNav();
      }
    });
    if (backdrop) backdrop.addEventListener("click", closeNav);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeNav();
      }
    });
  }

  function dedupeLinks(arr) {
    const map = new Map();
    (arr || []).forEach((l) => {
      if (!l || !l.href) return;
      if (!map.has(l.href)) map.set(l.href, l);
    });
    return Array.from(map.values());
  }

  async function renderSections(cfg) {
    const main = document.getElementById("main");
    main.innerHTML = "";
    const order = state.sectionsOrder;
    // Track alternating index for split sections
    let splitIndex = 0;

    for (const key of order) {
      const secCfg = (cfg.sections || []).find((s) => s.id === key) || {
        id: key,
        label: key,
      };
      const section = document.createElement("section");
      section.className = "section";
      section.id = key;
      const body = document.createElement("div");
      body.className = "container";
      if (key !== "home") {
        const head = document.createElement("div");
        head.className = "section-head container";
        const h = document.createElement("h2");
        h.textContent = secCfg.label || key;
        head.appendChild(h);
        section.append(head, body);
      } else {
        section.append(body);
      }

      if (key === "home") renderHero(body, cfg);
      else if (key === "key-metrics") renderMetrics(body, cfg);
      else if (key === "projects") renderProjectsSlider(body, cfg);
      else if (key === "apartments") renderApartments(body, cfg);
      else if (key === "gallery") renderGallery(body, cfg);
      else if (key === "news") renderNews(body, cfg);
      else if (key === "contact") renderContact(body, cfg);
      else if (key === "legal") renderLegal(body, cfg);
      else if (key === "materials") renderMaterials(body, cfg);
      else {
        renderTwoCol(body, cfg, key, splitIndex);
        splitIndex++;
      }

      main.appendChild(section);
    }
  }

  function shorten(text, max = 160) {
    if (!text) return "";
    const t = text.trim();
    return t.length > max ? t.slice(0, max - 1) + "…" : t;
  }

  function chooseHeroImage(cfg) {
    const rootFiles = cfg.images?.summary?.rootFiles || [];
    if (rootFiles.length) return rootFiles[0];
    const pc =
      cfg.images?.folders?.["Phối cảnh dự án"] ||
      (cfg.images?.summary?.folders || []).find((f) =>
        /phối cảnh/i.test(f.name)
      )?.files ||
      [];
    if (pc && pc.length) return pc[0];
    return "assets/imgs/logo.png";
  }

  function renderHero(body, cfg) {
    body.parentElement.classList.add("hero");
    const img = asset(chooseHeroImage(cfg));
    const bg = document.createElement("div");
    bg.className = "bg";
    bg.style.backgroundImage = `url('${img}')`;
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    const content = document.createElement("div");
    content.className = "content";
    const h1 = document.createElement("h1");
    h1.textContent = cfg.site?.title || "Dự án";
    const p = document.createElement("p");
    p.className = "subhead";
    p.textContent = shorten(cfg.site?.meta?.description, 160);
    const cta = document.createElement("div");
    cta.className = "cta";
    const btn1 = document.createElement("a");
    btn1.className = "btn btn-primary";
    btn1.href = cfg.cta?.primary?.href || "#contact";
    btn1.textContent = cfg.cta?.primary?.label || "Đăng ký tư vấn";
    const btn2 = document.createElement("a");
    btn2.className = "btn btn-secondary";
    btn2.href = cfg.cta?.secondary?.href || "#project-info";
    btn2.textContent = cfg.cta?.secondary?.label || "Thông tin dự án";
    cta.append(btn1, btn2);
    content.append(h1, p, cta);
    body.append(content);
    body.parentElement.prepend(bg, overlay);

    // GSAP hero in + parallax bg
    if (window.gsap) {
      const tl = gsap.timeline();
      tl.from(content.children, {
        opacity: 0,
        y: 18,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.07,
        delay: 0.05,
      });
      if (window.ScrollTrigger && motionEnabled()){
        gsap.fromTo(bg, { yPercent: 0 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: body.parentElement, start: 'top top', end: 'bottom top', scrub: 0.6 } });
      }
    }
  }

  function renderMetrics(body, cfg) {
    const wrap = document.createElement("div");
    wrap.className = "metrics";
    const items = cfg.counters?.legacy || [];
    items.forEach((it, idx) => {
      const card = document.createElement("div");
      card.className = "item card";
      const top = document.createElement("div");
      top.className = "num";
      const label = document.createElement("div");
      label.className = "label";
      label.textContent = it.label || `Chỉ số ${idx + 1}`;

      if (typeof it.value === "number") {
        card.setAttribute("data-count", String(it.value));
        if (it.prefix) card.setAttribute("data-prefix", String(it.prefix));
        top.textContent = "0";
      } else {
        top.textContent = it.text || "";
        card.classList.add("is-text");
        if (it.note) {
          const note = document.createElement("div");
          note.className = "note";
          note.textContent = it.note;
          card.append(top, label, note);
          wrap.append(card);
          return;
        }
      }

      card.append(top, label);
      wrap.append(card);
    });
    body.append(wrap);

    // Reveal animation for metric cards
    if (window.gsap && window.ScrollTrigger && motionEnabled()) {
      const cards = wrap.querySelectorAll(".item");
      cards.forEach((c) => {
        c.style.willChange = "transform, opacity";
      });
      gsap.fromTo(
        cards,
        { y: 16, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.08,
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: wrap, start: "top 85%", once: true },
          onComplete() {
            cards.forEach((c) => {
              c.style.willChange = "auto";
            });
          },
        }
      );
    }

    // CountUp on enter
    const Ctor = window.CountUp || (window.countUp && window.countUp.CountUp);
    if (Ctor) {
      const opts = {
        duration: 2,
        useEasing: true,
        separator: ".",
        decimal: ",",
        suffix: "",
      };
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              const el = e.target;
              // Only animate items that are numeric
              if (!el.hasAttribute("data-count")) {
                io.unobserve(el);
                return;
              }
              const n = el.querySelector(".num");
              const v = parseFloat(el.getAttribute("data-count")) || 0;
              if (!n._counted) {
                const options = Object.assign({}, opts, {
                  suffix: el.getAttribute("data-suffix") || opts.suffix,
                  prefix: el.getAttribute("data-prefix") || "",
                });
                const cu = new Ctor(n, v, options);
                cu.start();
                n._counted = true;
              }
            }
          });
        },
        { threshold: 0.4 }
      );
      wrap.querySelectorAll(".item").forEach((el) => io.observe(el));
    }
  }

  function renderTwoCol(body, cfg, key, idx) {
    const wrap = document.createElement("div");
    wrap.className = "split";
    const text = document.createElement("div");
    text.className = "text";
    const h3 = document.createElement("h3");
    h3.textContent = cfg.sections?.find((s) => s.id === key)?.label || "";
    const p = document.createElement("p");
    const fallback =
      "Thông tin đang được cập nhật. Đây là đoạn giới thiệu ngắn về mục này.";
    const txt = cfg.content?.[key]?.text || fallback;
    p.textContent = txt;
    text.append(h3, p);
    const media = document.createElement("div");
    media.className = "media";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = h3.textContent;
    img.src = asset(pickSectionImage(cfg, key));
    img.classList.add("zoomable");
    img.addEventListener("click", () => openLightbox(img.src, img.alt));
    media.append(img);
    if (idx % 2 === 1) wrap.classList.add("reverse-on-mobile");
    wrap.append(text, media);
    body.append(wrap);

    // Mark for GSAP slide-in animations (alternate left/right by index)
    const leftFirst = idx % 2 === 0; // even index: text from left, image from right; odd: reversed
    text.setAttribute("data-anim", leftFirst ? "slide-left" : "slide-right");
    media.setAttribute("data-anim", leftFirst ? "slide-right" : "slide-left");

    // Parallax background for the section wrapper
    if (window.gsap && window.ScrollTrigger && motionEnabled()) {
      const sec = body.parentElement;
      sec.style.overflow = "hidden";
      const bg = document.createElement("div");
      bg.className = "parallax-bg";
      bg.style.position = "absolute";
      bg.style.inset = "-10% -5%";
      bg.style.background =
        "radial-gradient(1200px 600px at 20% 0%, rgba(242,194,101,0.08), rgba(0,0,0,0))";
      bg.style.pointerEvents = "none";
      sec.prepend(bg);
      gsap.fromTo(
        bg,
        { yPercent: -10 },
        {
          yPercent: 10,
          ease: "none",
          scrollTrigger: {
            trigger: sec,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.5,
          },
        }
      );
    }
  }
  function pickSectionImage(cfg, key) {
    const m = {
      "project-info": "Phối cảnh dự án",
      location: "Vị trí và kết nối vùng",
      apartments: "Mặt bằng căn hộ",
      amenities: "Tiện ích nội và Ngoại khu",
    };
    const folder = m[key];
    const folderObj = cfg.images?.folders?.[folder];
    if (Array.isArray(folderObj) && folderObj.length) return folderObj[0];
    // if object with files prop
    if (folderObj?.files?.length) return folderObj.files[0];
    // summary fallback
    const sumFolder = (cfg.images?.summary?.folders || []).find(
      (f) => f.name === folder
    );
    if (sumFolder?.files?.length) return sumFolder.files[0];
    return chooseHeroImage(cfg);
  }

  function renderProjectsSlider(body, cfg) {
    const container = document.createElement("div");
    container.className = "projects-swiper swiper";
    const wrapper = document.createElement("div");
    wrapper.className = "swiper-wrapper";
    const sliderCfg = (cfg.sliders || [])[0] || {};
    (sliderCfg.slides || []).forEach((sl) => {
      const slide = document.createElement("div");
      slide.className = "swiper-slide";
      const card = document.createElement("div");
      card.className = "card";
      const img = document.createElement("img");
      img.src = asset(sl.image);
      img.alt = sl.title || "Dự án";
      img.loading = "lazy";
      img.decoding = "async";
      img.classList.add("zoomable");
      img.addEventListener("click", () => openLightbox(img.src, img.alt));
      const cap = document.createElement("div");
      cap.style.padding = "12px";
      const t = document.createElement("div");
      t.style.fontWeight = "700";
      t.textContent = sl.title || "";
      const d = document.createElement("div");
      d.style.opacity = "0.8";
      d.textContent = sl.desc || "";
      cap.append(t, d);
      card.append(img, cap);
      slide.append(card);
      wrapper.append(slide);
    });
    container.append(wrapper);
    // nav/pagination
    const pag = document.createElement("div");
    pag.className = "swiper-pagination";
    const prev = document.createElement("div");
    prev.className = "swiper-button-prev";
    const next = document.createElement("div");
    next.className = "swiper-button-next";
    container.append(pag, prev, next);
    body.append(container);

    // init after next tick
    setTimeout(() => {
      if (window.Swiper) {
        const slidesCount = (sliderCfg.slides || []).length;
        const baseCfg = Object.assign(
          {
            speed: 600,
            effect: "slide",
            grabCursor: true,
            watchOverflow: true,
          },
          sliderCfg.config || {}
        );
        let spv = 1;
        if (baseCfg.breakpoints) {
          const w = window.innerWidth || 1024;
          const keys = Object.keys(baseCfg.breakpoints)
            .map((k) => parseInt(k, 10))
            .filter((n) => !isNaN(n))
            .sort((a, b) => a - b);
          keys.forEach((k) => {
            if (w >= k && baseCfg.breakpoints[k]?.slidesPerView) {
              spv = baseCfg.breakpoints[k].slidesPerView;
            }
          });
          const maxKey = Math.max(...keys, 0);
          if (slidesCount <= spv && baseCfg.breakpoints[maxKey]) {
            baseCfg.breakpoints[maxKey].slidesPerView = Math.min(
              2,
              slidesCount
            );
          }
        }
        if (slidesCount <= spv) {
          baseCfg.loop = false;
        }
        const merged = baseCfg;
        const inst = new Swiper(container, merged);
        state.swiperInstances.push(inst);
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      }
    }, 0);
  }

  function renderGallery(body, cfg) {
    const wrap = document.createElement("div");
    wrap.className = "gallery";
    const tabs = document.createElement("div");
    tabs.className = "tabs";
    tabs.setAttribute("role", "tablist");
    const grid = document.createElement("div");
    grid.className = "grid";
    wrap.append(tabs, grid);
    body.append(wrap);

    const tabDefs = cfg.gallery?.tabs || [
      { key: "all", label: "Tất cả" },
      { key: "exterior", label: "Phối cảnh" },
      { key: "amenities", label: "Tiện ích" },
      { key: "location", label: "Vị trí" },
      { key: "apartments", label: "Căn hộ" },
    ];
    const items = flattenImagesToGallery(cfg);
    let active = "all";

    tabDefs.forEach((t, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = t.label;
      b.setAttribute("data-key", t.key);
      b.setAttribute("aria-pressed", String(i === 0));
      b.setAttribute("role", "tab");
      b.setAttribute("tabindex", i === 0 ? "0" : "-1");
      b.addEventListener("click", () => {
        active = t.key;
        tabs
          .querySelectorAll("button")
          .forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        renderGrid();
      });
      b.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          const btns = [...tabs.querySelectorAll("button")];
          const idx = btns.indexOf(b);
          const next =
            e.key === "ArrowRight"
              ? (idx + 1) % btns.length
              : (idx - 1 + btns.length) % btns.length;
          btns[next].focus();
        }
      });
      tabs.append(b);
    });

    function renderGrid() {
      const list = items.filter(
        (it) => active === "all" || it.category === active
      );
      const firstTime = !grid.dataset.ready;
      const swapIn = () => {
        grid.innerHTML = "";
        list.forEach((it, idx) => {
          const a = document.createElement("a");
          a.href = asset(it.src);
          a.className = "item";
          a.setAttribute("data-category", it.category);
          const img = document.createElement("img");
          img.src = asset(it.src);
          img.alt = it.alt || it.category;
          img.loading = "lazy";
          img.decoding = "async";
          a.append(img);
          grid.append(a);
          if (cfg.gallery?.itemsUseLightbox)
            a.addEventListener("click", (e) => {
              e.preventDefault();
              openLightbox(it.src, img.alt);
            });
          // Intro animation
          a.style.opacity = "0";
          a.style.transform = "translateY(10px)";
          a.style.transition = "opacity .35s ease, transform .35s ease";
          requestAnimationFrame(() => {
            setTimeout(() => {
              a.style.opacity = "1";
              a.style.transform = "translateY(0)";
            }, idx * 25);
          });
        });
        grid.dataset.ready = "1";
        if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 50);
      };
      if (firstTime) {
        swapIn();
        return;
      }
      // Fade out current items, then swap
      const olds = Array.from(grid.children);
      olds.forEach((el, i) => {
        el.style.transition = "opacity .25s ease, transform .25s ease";
        setTimeout(() => {
          el.style.opacity = "0";
          el.style.transform = "translateY(8px)";
        }, i * 15);
      });
      setTimeout(swapIn, Math.min(300, 150 + olds.length * 20));
    }

    renderGrid();
  }

  async function renderApartments(body, cfg) {
    const wrap = document.createElement("div");
    wrap.className = "apartments";
    const filters = document.createElement("div");
    filters.className = "apt-filters";
    const blockBar = document.createElement("div");
    blockBar.className = "blocks";
    const typeBar = document.createElement("div");
    typeBar.className = "types";
    const grid = document.createElement("div");
    grid.className = "apartments-grid";
    filters.append(blockBar, typeBar);
    wrap.append(filters, grid);
    body.append(wrap);

    const manifest = await loadApartmentsManifest();
    const items = buildApartmentItems(cfg, manifest);
    const blockTabs = [
      { key: "all", label: "Tất cả" },
      { key: "A", label: "Block A" },
      { key: "B", label: "Block B" },
    ];
    const typeTabs = [
      { key: "all", label: "Tất cả" },
      { key: "studio", label: "Studio" },
      { key: "1pn", label: "1PN" },
      { key: "3pn+", label: "3PN+" },
    ];
    let activeBlock = "all";
    let activeType = "all";

    function renderTabs() {
      blockBar.innerHTML = "";
      typeBar.innerHTML = "";
      blockTabs.forEach((t, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = t.label;
        b.setAttribute("data-key", t.key);
        b.setAttribute("aria-pressed", String(t.key === activeBlock));
        b.addEventListener("click", () => {
          activeBlock = t.key;
          renderTabs();
          renderGrid();
        });
        blockBar.append(b);
      });
      typeTabs.forEach((t, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = t.label;
        b.setAttribute("data-key", t.key);
        b.setAttribute("aria-pressed", String(t.key === activeType));
        b.addEventListener("click", () => {
          activeType = t.key;
          renderTabs();
          renderGrid();
        });
        typeBar.append(b);
      });
    }

    function matchesType(itemType, filter) {
      if (filter === "all") return true;
      if (filter === "3pn+")
        return (
          itemType === "3pn" ||
          itemType === "4pn" ||
          itemType === "5pn" ||
          itemType === "3pn+"
        );
      return itemType === filter;
    }

    function renderGrid() {
      const filtered = items.filter(
        (it) =>
          (activeBlock === "all" || it.block === activeBlock) &&
          matchesType(it.type, activeType)
      );
      grid.innerHTML = "";
      filtered.forEach((it) => {
        const a = document.createElement("a");
        a.href = asset(it.src);
        a.className = "apt-item";
        a.setAttribute("data-block", it.block || "");
        a.setAttribute("data-type", it.type || "");
        const img = document.createElement("img");
        img.src = asset(it.src);
        img.alt = it.alt || "Mặt bằng căn hộ";
        img.loading = "lazy";
        img.decoding = "async";
        a.append(img);
        grid.append(a);
        a.addEventListener("click", (e) => {
          e.preventDefault();
          openLightbox(img.src, img.alt);
        });
      });
      if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 50);
    }

    renderTabs();
    renderGrid();
  }

  function viSort(arr) {
    return (arr || [])
      .slice()
      .sort((a, b) =>
        String(a).localeCompare(String(b), "vi", {
          numeric: true,
          sensitivity: "base",
        })
      );
  }
  async function loadApartmentsManifest() {
    try {
      const res = await fetch(asset("assets/apartments/index.json"), {
        cache: "no-cache",
      });
      if (!res.ok) throw new Error("not found");
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  function buildApartmentItems(cfg, manifest) {
    const out = [];
    let list = [];
    if (manifest && (manifest.groups?.length || manifest.flatFiles?.length)) {
      // Use scanned/sorted manifest
      const grouped = (manifest.groups || [])
        .slice()
        .sort((a, b) =>
          String(a.name).localeCompare(String(b.name), "vi", {
            numeric: true,
            sensitivity: "base",
          })
        );
      grouped.forEach((g) => viSort(g.files).forEach((f) => list.push(f)));
      viSort(manifest.flatFiles || []).forEach((f) => list.push(f));
    } else {
      // Fallback to config; sort by Vietnamese collation
      const configList =
        cfg.images?.folders?.["Mặt bằng căn hộ"] ||
        (cfg.images?.summary?.folders || []).find(
          (f) => f.name === "Mặt bằng căn hộ"
        )?.files ||
        [];
      list = viSort(configList);
    }
    list.forEach((src) => {
      const meta = {
        src,
        block: guessBlock(src),
        type: normalizeAptType(guessType(src)),
        alt: "Mặt bằng căn hộ",
      };
      out.push(meta);
    });
    return out;
  }

  function normalizeVN(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
  function guessBlock(path) {
    const name =
      String(path || "")
        .split("/")
        .pop() || "";
    const base = name.replace(/\.[^.]+$/, "");
    const first = base.trim().charAt(0).toUpperCase();
    if (first === "A" || /(^|\/)a\d/i.test(path)) return "A";
    if (first === "B" || /(^|\/)b\d/i.test(path)) return "B";
    return "";
  }
  function guessType(path) {
    const s = normalizeVN(path);
    if (/studio/.test(s)) return "studio";
    if (/(^|\b|\/)1\s*pn\b/.test(s)) return "1pn";
    if (/(^|\b|\/)2\s*pn\b/.test(s)) return "2pn";
    if (/(^|\b|\/)3\s*pn\b/.test(s)) return "3pn";
    if (/(^|\b|\/)4\s*pn\b/.test(s)) return "4pn";
    return "";
  }
  function normalizeAptType(t) {
    if (!t) return "";
    if (t === "4pn") return "3pn+";
    return t;
  }

  function renderLegal(body, cfg) {
    const imgUrl = cfg.legal?.image;
    if (imgUrl) {
      const box = document.createElement("div");
      box.className = "legal-banner";
      const img = document.createElement("img");
      img.src = asset(imgUrl);
      img.alt = "Pháp lý";
      img.loading = "lazy";
      img.decoding = "async";
      box.append(img);
      body.append(box);
      return;
    }
    // Fallback: items list (if provided)
    const list = cfg.legal?.items || [];
    if (list.length) {
      const grid = document.createElement("div");
      grid.className = "legal-grid";
      list.forEach((it, i) => {
        const card = document.createElement("div");
        card.className = "legal-card card";
        card.setAttribute(
          "data-anim",
          i % 2 === 0 ? "slide-left" : "slide-right"
        );
        const t = document.createElement("h3");
        t.textContent = it.title || "Hồ sơ";
        const p = document.createElement("p");
        p.textContent = it.desc || "";
        card.append(t, p);
        grid.append(card);
      });
      body.append(grid);
    }
  }

  function renderMaterials(body, cfg) {
    const wrap = document.createElement("div");
    wrap.className = "materials";
    const grid = document.createElement("div");
    grid.className = "materials-logos";
    const logos = cfg.materials?.logos || [];
    const singleBanner = logos.length === 1;
    if (singleBanner) grid.classList.add("single");
    logos.forEach((lg, i) => {
      const a = document.createElement("a");
      a.href = lg.href || "#";
      a.className = "logo";
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("aria-label", lg.name || "Đối tác");
      if (lg.noInvert) a.classList.add("no-invert");
      const img = document.createElement("img");
      img.src = asset(lg.logo);
      img.alt = lg.name || "Đối tác";
      img.loading = "lazy";
      img.decoding = "async";
      a.append(img);
      grid.append(a);
    });
    wrap.append(grid);
    body.append(wrap);
  }
  function flattenImagesToGallery(cfg) {
    const out = [];
    const map = [
      { name: "Phối cảnh dự án", cat: "exterior" },
      { name: "Tiện ích nội và Ngoại khu", cat: "amenities" },
      { name: "Vị trí và kết nối vùng", cat: "location" },
      { name: "Mặt bằng căn hộ", cat: "apartments" },
    ];
    const foldersSummary = cfg.images?.summary?.folders || [];
    foldersSummary.forEach((f) => {
      const m = map.find((x) => x.name === f.name);
      const cat = m?.cat || "exterior";
      (f.files || []).forEach((src) =>
        out.push({ src, category: cat, alt: `${f.name}` })
      );
    });
    return out;
  }

  function openLightbox(src, alt) {
    const lb = document.getElementById("lightbox");
    lb.innerHTML = "";
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt || "";
    img.style.cursor = "zoom-out";
    const btn = document.createElement("button");
    btn.className = "close";
    btn.textContent = "Đóng (Esc)";
    btn.addEventListener("click", closeLightbox);
    lb.append(img, btn);
    lb.hidden = false;
    // Try fullscreen for better viewing on supported browsers
    if (lb.requestFullscreen) {
      try {
        lb.requestFullscreen();
      } catch (e) {}
    }
    const onKey = (e) => {
      if (e.key === "Escape") {
        closeLightbox();
      }
    };
    document.addEventListener("keydown", onKey, { once: true });
    lb.addEventListener("click", (e) => {
      if (e.target === lb) closeLightbox();
    });
    function closeLightbox() {
      lb.hidden = true;
      lb.innerHTML = "";
      document.removeEventListener("keydown", onKey);
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          document.exitFullscreen();
        } catch (e) {}
      }
    }
  }

  function renderNews(body, cfg) {
    const wrap = document.createElement("div");
    wrap.className = "news-wrap";
    body.append(wrap);

    // Router: support #news and #news/<slug>
    const render = async () => {
      const hash = location.hash || "#news";
      const parts = hash.replace(/^#/, "").split("/");
      const isDetail = parts[0] === "news" && parts[1];
      wrap.innerHTML = "";
      try {
        const sec = document.getElementById("news");
        if (sec) {
          const headerH =
            (document.getElementById("site-header")?.offsetHeight || 0) + 6;
          if (window.__lenis && typeof window.__lenis.scrollTo === "function")
            window.__lenis.scrollTo(sec, { offset: -headerH });
          else {
            const top =
              sec.getBoundingClientRect().top + (window.scrollY || 0) - headerH;
            window.scrollTo({ top, behavior: "smooth" });
          }
        }
      } catch (_) {}
      if (isDetail) {
        const slug = decodeURIComponent(parts[1]);
        await renderNewsDetail(wrap, slug);
      } else {
        await renderNewsList(wrap);
      }
    };
    window.addEventListener("hashchange", render);
    render();
  }

  async function renderNewsList(container) {
    const grid = document.createElement("div");
    grid.className = "news-grid";
    container.append(grid);
    let index;
    try {
      const res = await fetch(asset("assets/news/index.json"), {
        cache: "no-cache",
      });
      index = await res.json();
    } catch (_) {
      index = { items: [] };
    }
    const items = index.items || [];
    if (!items.length) {
      const p = document.createElement("p");
      p.textContent = "Hiện chưa có tin tức.";
      container.append(p);
      return;
    }
    const cards = [];
    items.slice(0, 9).forEach((it, i) => {
      const card = document.createElement("article");
      card.className = "news-card card";
      card.setAttribute(
        "data-anim",
        i % 2 === 0 ? "slide-right" : "slide-left"
      );
      const contentWrap = document.createElement("div");
      contentWrap.className = "news-content";
      const headWrap = document.createElement("div");
      headWrap.className = "news-head";
      const bodyWrap = document.createElement("div");
      bodyWrap.className = "news-body";
      const img = document.createElement("img");
      const coverSrc = decodeEntities(
        it.cover || chooseHeroImage(state.config)
      );
      img.src = asset(coverSrc);
      img.alt = decodeEntities(it.title || "Tin tức");
      img.loading = "lazy";
      img.decoding = "async";
      const h3 = document.createElement("h3");
      h3.textContent = decodeEntities(it.title || "");
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = it.date
        ? new Date(it.date).toLocaleDateString("vi-VN")
        : "";
      const p = document.createElement("p");
      p.textContent = decodeEntities(it.excerpt || "");
      const a = document.createElement("a");
      a.href = `#news/${encodeURIComponent(it.slug)}`;
      a.className = "btn btn-primary";
      a.textContent = "Xem chi tiết";
      headWrap.append(img, h3);
      bodyWrap.append(meta, p);
      contentWrap.append(headWrap, bodyWrap);
      card.append(contentWrap, a);
      grid.append(card);
      cards.push(card);
    });

    // Cap content to 80% height of card and keep button visible
    const capHeights = () => {
      cards.forEach((card) => {
        const content = card.querySelector(".news-content");
        if (!content) return;
        const head = card.querySelector(".news-head");
        const body = card.querySelector(".news-body");
        if (!body) return;
        // Reset, measure card and head, then cap only the body so title always fully shows
        body.style.maxHeight = "";
        const rect = card.getBoundingClientRect();
        const max = Math.max(60, Math.floor(rect.height * 0.8));
        const headH = head ? Math.ceil(head.getBoundingClientRect().height) : 0;
        const bodyMax = Math.max(0, max - headH);
        body.style.maxHeight = bodyMax + "px";
        body.style.overflow = "hidden";
      });
    };
    const debounce = (fn, wait) => {
      let t;
      return () => {
        clearTimeout(t);
        t = setTimeout(fn, wait);
      };
    };
    setTimeout(capHeights, 0);
    // Recalc after images load as they affect card height
    grid.querySelectorAll("img").forEach((img) => {
      img.addEventListener(
        "load",
        () => {
          setTimeout(capHeights, 10);
        },
        { once: true }
      );
    });
    window.addEventListener("resize", debounce(capHeights, 150));
    window.addEventListener("load", capHeights, { once: true });
  }

  async function renderNewsDetail(container, slug) {
    // Fetch markdown file
    const url = asset(`assets/news/${slug}.md`);
    let md = "";
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("not found");
      md = await res.text();
    } catch (e) {
      const p = document.createElement("p");
      p.textContent = "Không tìm thấy bài viết.";
      container.append(p);
      return;
    }
  const { frontMatter, content } = parseFrontMatter(md);
    const art = document.createElement("article");
    art.className = "article";
    const back = document.createElement("a");
    back.href = "#news";
    back.className = "back-link";
    back.textContent = "← Quay lại Tin tức";
    const h1 = document.createElement("h1");
    h1.textContent = decodeEntities(frontMatter.title || slug);
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = frontMatter.date
      ? new Date(frontMatter.date).toLocaleDateString("vi-VN")
      : "";
    if (frontMatter.cover) {
      const img = document.createElement("img");
      const coverSrc = decodeEntities(frontMatter.cover);
      img.src = asset(coverSrc);
      img.alt = decodeEntities(frontMatter.title || "");
      img.loading = "eager";
      img.decoding = "async";
      img.className = "cover";
      art.append(img);
    }
    const articleBody = document.createElement("div");
    articleBody.className = "article-body";
    articleBody.innerHTML = markdownToHtml(content);
    // Share bar
    const share = document.createElement("div");
    share.className = "article-share";
    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "btn btn-secondary";
    shareBtn.textContent = "Chia sẻ";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn";
    copyBtn.textContent = "Sao chép link";
    const linkHref = (function(){
      const canon = state.config?.site?.meta?.canonical || location.origin + location.pathname;
      try {
        const url = new URL(canon);
        url.hash = '#news/' + encodeURIComponent(slug);
        return url.toString();
      } catch {
        return (canon.replace(/\/?$/, '/') + '#news/' + encodeURIComponent(slug));
      }
    })();
    shareBtn.addEventListener('click', async () => {
      try {
        if (navigator.share) {
          await navigator.share({ title: frontMatter.title || document.title, url: linkHref });
        } else {
          await navigator.clipboard.writeText(linkHref);
          showToast('Đã sao chép link');
        }
      } catch(_) {}
    });
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(linkHref);
        showToast('Đã sao chép link');
      } catch(_) {}
    });
    share.append(shareBtn, copyBtn);
    const src = frontMatter.source || "";
    const sourceEl = document.createElement("div");
    sourceEl.className = "source";
    if (src) {
      const a = document.createElement("a");
      a.href = src;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "Nguồn";
      sourceEl.append(a);
    }
    art.prepend(back, h1, meta);
    art.append(share, articleBody, sourceEl);
    container.append(art);
    // Refresh triggers after injecting
    if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 50);

    // Inject JSON-LD Article
    try {
      const prev = document.getElementById('ld-article');
      if (prev) prev.remove();
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: frontMatter.title || slug,
        datePublished: frontMatter.date || undefined,
        image: frontMatter.cover ? abs(frontMatter.cover) : undefined,
        mainEntityOfPage: state.config?.site?.meta?.canonical || location.href,
        author: { '@type': 'Organization', name: state.config?.site?.title || 'A&T Saigon Riverside' },
        publisher: { '@type': 'Organization', name: state.config?.site?.title || 'A&T Saigon Riverside' }
      };
      const s = document.createElement('script');
      s.id = 'ld-article';
      s.type = 'application/ld+json';
      s.textContent = JSON.stringify(ld);
      document.head.appendChild(s);
    } catch(_) {}
  }

  function parseFrontMatter(text) {
    const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/m.exec(text);
    if (!m) return { frontMatter: {}, content: text };
    const yaml = m[1];
    const out = {};
    yaml.split(/\r?\n/).forEach((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      out[k] = v.replace(/^"|"$/g, "");
    });
    return { frontMatter: out, content: m[2] };
  }

  function markdownToHtml(md) {
    let s = decodeEntities(String(md || ""));
    s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    s = s.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      '<img alt="$1" src="$2" loading="lazy" decoding="async">'
    );
    s = s.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    s = s.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
    // headings
    s = s.replace(/^######\s*(.*)$/gm, "<h6>$1</h6>");
    s = s.replace(/^#####\s*(.*)$/gm, "<h5>$1</h5>");
    s = s.replace(/^####\s*(.*)$/gm, "<h4>$1</h4>");
    s = s.replace(/^###\s*(.*)$/gm, "<h3>$1</h3>");
    s = s.replace(/^##\s*(.*)$/gm, "<h2>$1</h2>");
    s = s.replace(/^#\s*(.*)$/gm, "<h1>$1</h1>");
    // blockquote
    s = s.replace(/^>\s*(.*)$/gm, "<blockquote>$1</blockquote>");
    // lists
    s = s.replace(/^(?:\s*[-*]\s+.*(?:\n|$))+?/gm, (m) => {
      const items = m
        .trim()
        .split(/\n/)
        .map((l) => l.replace(/^\s*[-*]\s+/, ""));
      return "<ul>" + items.map((i) => `<li>${i}<\/li>`).join("") + "</ul>";
    });
    // bold/italic
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    // paragraphs
    s = s
      .split(/\n{2,}/)
      .map((p) =>
        /<h\d|<ul|<pre|<blockquote|<img/.test(p)
          ? p
          : `<p>${p.replace(/\n/g, "<br>")}<\/p>`
      )
      .join("");
    return s;
  }

  function renderContact(body, cfg) {
    const wrap = document.createElement("div");
    wrap.className = "forms";
    // Only keep one registration form to avoid duplication
    const lead = buildForm(cfg.forms?.leadForm, true);
    body.append(wrap);
    wrap.append(lead);
  }

  function buildForm(formCfg, isLead) {
    const form = document.createElement("form");
    form.className = "form";
    form.noValidate = true;
    form.method = "POST";
    form.target = formCfg?.targetIframe || "_self";
    form.action = formCfg?.googleFormAction || "#";
    const h2 = document.createElement("h3");
    h2.textContent = formCfg?.title || (isLead ? "Đăng ký tư vấn" : "Liên hệ");
    form.append(h2);
    const row = document.createElement("div");
    row.className = "row";
    form.append(row);
    const fields = formCfg?.fields || [];
    const entryMap = formCfg?.entryMap || {};

    // hidden iframe target
    if (form.target && form.target !== "_self") ensureIframe(form.target);

    fields.forEach((f) => {
      const field = document.createElement("div");
      field.className = "field";
      const id = `${formCfg?.id || "form"}-${f.name}`;
      const label = document.createElement("label");
      label.setAttribute("for", id);
      label.textContent = f.label || f.name;
      let input;
      if (f.type === "select") {
        input = document.createElement("select");
        (f.options || []).forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o;
          opt.textContent = o;
          input.append(opt);
        });
      } else if (f.type === "textarea") {
        input = document.createElement("textarea");
      } else {
        input = document.createElement("input");
        input.type = f.type || "text";
      }
      input.id = id;
      input.name = f.name;
      input.placeholder = f.placeholder || "";
      if (f.required) input.required = true;
      input.autocomplete = f.autocomplete || "on";
      if (f.name === "hp") {
        field.style.display = "none";
        input.tabIndex = -1;
      }
      field.append(label, input);
      row.append(field);
    });

    const actions = document.createElement("div");
    actions.className = "actions";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn btn-primary";
    submit.textContent = formCfg?.submitLabel || "Gửi";
    actions.append(submit);
    form.append(actions);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // honeypot
      const hp = form.querySelector('[name="hp"]');
      if (hp && hp.value) {
        showToast("Không thể gửi vì nghi ngờ bot.", true);
        return;
      }
      // validations
      const name = form.querySelector('[name="name"]');
      const phone = form.querySelector('[name="phone"]');
      const email = form.querySelector('[name="email"]');
      const emailOk = !email || /.+@.+\..+/.test(email.value);
      const phoneDigits = phone ? (phone.value.match(/\d/g) || []).length : 0;
      const phoneOk = !phone || (phoneDigits >= 9 && phoneDigits <= 12);
      if (name && !name.value.trim()) {
        showToast("Vui lòng nhập họ tên.", true);
        name.focus();
        return;
      }
      if (phone && !phoneOk) {
        showToast("Số điện thoại không hợp lệ.", true);
        phone.focus();
        return;
      }
      if (email && !emailOk) {
        showToast("Email không hợp lệ.", true);
        email.focus();
        return;
      }

      // Map to Google Form format (entry.<id>=value)
      const formData = new FormData();
      (formCfg.fields || []).forEach((f) => {
        if (f.name === "hp") return;
        const val = form.querySelector(`[name="${f.name}"]`)?.value || "";
        const entryId = entryMap[f.name];
        if (entryId) formData.append(`entry.${entryId}`, val);
      });
      // Use hidden iframe to avoid navigation
      const iframeName = formCfg.targetIframe || "_self";
      if (iframeName !== "_self") {
        const iframe = ensureIframe(iframeName);
        submit.disabled = true;
        postToGoogle(form.action, formData, iframeName)
          .then(() => showToast("Gửi thông tin thành công!"))
          .catch(() => showToast("Gửi thông tin thất bại.", true))
          .finally(() => (submit.disabled = false));
      } else {
        // fallback submit
        form.submit();
      }
    });

    return form;
  }

  function ensureIframe(name) {
    const root = document.getElementById("iframes-root");
    let iframe = root.querySelector(`iframe[name="${name}"]`);
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.name = name;
      iframe.hidden = true;
      root.append(iframe);
    }
    return iframe;
  }
  function postToGoogle(action, formData, target) {
    return new Promise((resolve, reject) => {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = action;
      form.target = target;
      form.style.display = "none";
      for (const [k, v] of formData.entries()) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form.append(input);
      }
      document.body.append(form);
      const iframe = document.querySelector(`iframe[name="${target}"]`);
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("submit failed"));
      };
      const cleanup = () => {
        iframe?.removeEventListener("load", onLoad);
        iframe?.removeEventListener("error", onError);
        form.remove();
      };
      iframe?.addEventListener("load", onLoad, { once: true });
      iframe?.addEventListener("error", onError, { once: true });
      form.submit();
    });
  }

  function showToast(msg, error) {
    const root = document.getElementById("toast");
    const el = document.createElement("div");
    el.className = "toast" + (error ? " error" : " success");
    el.textContent = msg;
    root.append(el);
    setTimeout(() => {
      el.remove();
    }, 4000);
  }

  function initNavActiveObserver() {
    const sections = state.sectionsOrder
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const links = Array.from(document.querySelectorAll("nav.primary-nav a"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = "#" + e.target.id;
            links.forEach((a) =>
              a.setAttribute(
                "aria-current",
                a.getAttribute("href") === id ? "page" : "false"
              )
            );
          }
        });
      },
      { threshold: 0.6 }
    );
    sections.forEach((s) => io.observe(s));
  }

  function initProgressBar() {
    const bar = document.getElementById("progress-bar");
    const computeProgress = () => {
      const h = document.documentElement;
      const sc = h.scrollTop || window.scrollY || 0;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? sc / max : 0;
      bar.style.transform = `scaleX(${p})`;
    };
    document.addEventListener("scroll", computeProgress, { passive: true });
    // If Lenis is active, also update on its internal scroll events
    if (window.__lenis && typeof window.__lenis.on === "function") {
      try {
        window.__lenis.on("scroll", computeProgress);
      } catch (_) {}
    }
    computeProgress();
  }

  function initSmoothScrollAndAnimations() {
    // Header blur threshold
    const header = document.getElementById("site-header");
    const onScrollHdr = () => {
      if (window.scrollY > 60) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    document.addEventListener("scroll", onScrollHdr, { passive: true });
    onScrollHdr();

    // Lenis
    if (window.Lenis) {
      const lenis = new Lenis({ smoothWheel: true, smoothTouch: true });
      window.__lenis = lenis;
      // Keep ScrollTrigger in sync with Lenis
      if (window.ScrollTrigger && typeof lenis.on === "function") {
        try {
          lenis.on("scroll", () => {
            ScrollTrigger.update();
            if (window.AOS && motionEnabled()) {
              try {
                AOS.refresh();
              } catch (_) {}
            }
          });
        } catch (e) {}
      }
      function raf(time) {
        lenis.raf(time);
        if (window.ScrollTrigger) ScrollTrigger.update();
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      // Safety: if smooth scroll locks the page (no wheel), auto-disable Lenis and fall back to native scroll
      setTimeout(() => {
        try {
          const before =
            window.scrollY || document.documentElement.scrollTop || 0;
          window.scrollTo(0, before + 1);
          setTimeout(() => {
            const now =
              window.scrollY || document.documentElement.scrollTop || 0;
            // Restore position
            window.scrollTo(0, before);
            if (now === before) {
              // Scrolling didn't move -> disable Lenis
              try {
                lenis.destroy?.();
              } catch (_) {}
              window.__lenis = null;
              // Remove Lenis classes/styles if set
              const html = document.documentElement;
              html.classList.remove("lenis", "lenis-smooth", "lenis-stopped");
              html.style.removeProperty("height");
              html.style.removeProperty("overflow");
              // Ensure progress continues to update on native scroll only
              if (typeof initProgressBar === "function") initProgressBar();
            }
          }, 80);
        } catch (_) {}
      }, 300);
    }

    // AOS: enable if available; if motion disabled, mark body with aos-disabled to keep items visible
    const bodyEl = document.body;
    if (window.AOS && motionEnabled()) {
      AOS.init({ once: true, duration: 700, easing: "ease-out" });
      setTimeout(() => {
        try {
          AOS.refreshHard();
        } catch (_) {
          try {
            AOS.refresh();
          } catch (__) {}
        }
      }, 100);
    } else if (window.AOS) {
      bodyEl.classList.add("aos-disabled");
    }

    // Section header reveals
    if (window.gsap && window.ScrollTrigger && motionEnabled()) {
      if (gsap.registerPlugin && window.ScrollTrigger) {
        try {
          gsap.registerPlugin(ScrollTrigger);
        } catch (e) {}
      }
      const heads = Array.from(
        document.querySelectorAll(".section .section-head")
      );
      heads.forEach((el, idx) => {
        const dir = idx % 2 === 0 ? -24 : 24;
        const children = el.querySelectorAll("h2, .sub");
        children.forEach((ch) => {
          ch.style.willChange = "transform, opacity";
        });
        gsap.fromTo(
          children,
          { x: dir, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.7,
            ease: "power2.out",
            stagger: 0.08,
            clearProps: "transform,opacity",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
            onComplete() {
              children.forEach((ch) => {
                ch.style.willChange = "auto";
              });
            },
          }
        );
      });

      // Slide-in for marked elements
      document.querySelectorAll("[data-anim]").forEach((el) => {
        const dir = el.getAttribute("data-anim");
        const fromX = dir === "slide-right" ? 32 : -32;
        el.style.willChange = "transform, opacity";
        gsap.fromTo(
          el,
          { x: fromX, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.7,
            ease: "power2.out",
            clearProps: "transform,opacity",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
            onComplete() {
              el.style.willChange = "auto";
            },
          }
        );
      });
    } else if (motionEnabled()) {
      // Fallback: IntersectionObserver-based simple slide-ins (no GSAP/ScrollTrigger)
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target;
            io.unobserve(el);
            const isHead = el.classList.contains("section-head");
            if (isHead) {
              const idx = Array.from(
                document.querySelectorAll(".section .section-head")
              ).indexOf(el);
              const dir = idx % 2 === 0 ? -24 : 24;
              const kids = el.querySelectorAll("h2, .sub");
              kids.forEach((ch, i) => {
                ch.style.willChange = "transform, opacity";
                ch.style.transform = `translateX(${dir}px)`;
                ch.style.opacity = "0";
                ch.style.transition = "transform .6s ease, opacity .6s ease";
                setTimeout(() => {
                  ch.style.transform = "translateX(0)";
                  ch.style.opacity = "1";
                  setTimeout(() => {
                    ch.style.willChange = "auto";
                    ch.style.transition = "";
                  }, 700);
                }, i * 80);
              });
            } else {
              const d =
                el.getAttribute("data-anim") === "slide-right" ? 32 : -32;
              el.style.willChange = "transform, opacity";
              el.style.transform = `translateX(${d}px)`;
              el.style.opacity = "0";
              el.style.transition = "transform .7s ease, opacity .7s ease";
              requestAnimationFrame(() => {
                el.style.transform = "translateX(0)";
                el.style.opacity = "1";
                setTimeout(() => {
                  el.style.willChange = "auto";
                  el.style.transition = "";
                }, 800);
              });
            }
          });
        },
        { threshold: 0.2 }
      );
      document
        .querySelectorAll(".section .section-head, [data-anim]")
        .forEach((el) => io.observe(el));
    }

    // Refresh triggers after full load
    window.addEventListener(
      "load",
      () => {
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        if (window.AOS && motionEnabled()) {
          try {
            AOS.refreshHard();
          } catch (_) {
            try {
              AOS.refresh();
            } catch (__) {}
          }
        }
      },
      { once: true }
    );

    // Floating CTA
    const fcta = document.getElementById("floating-cta");
    if (fcta) {
      const showAfter = document.getElementById("home");
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            fcta.hidden = e.isIntersecting;
          });
        },
        { threshold: 0.2 }
      );
      if (showAfter) io.observe(showAfter);
      fcta.addEventListener("click", () => {
        const target = document.querySelector("#contact");
        if (!target) return;
        if (window.__lenis && typeof window.__lenis.scrollTo === "function")
          window.__lenis.scrollTo(target, { offset: -10 });
        else target.scrollIntoView({ behavior: "smooth" });
      });
    }

    // Back-to-top
    const btt = document.getElementById("back-to-top");
    if (btt) {
      const onVis = () => {
        btt.hidden = window.scrollY < 400;
      };
      document.addEventListener("scroll", onVis, { passive: true });
      onVis();
      btt.addEventListener("click", () => {
        if (window.__lenis && typeof window.__lenis.scrollTo === "function")
          window.__lenis.scrollTo(0, { offset: 0 });
        else window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Global in-page anchor handler (covers brand/footer/any dynamic links)
    document.addEventListener("click", (e) => {
      const a =
        e.target && e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href || href === "#" || href.length < 2) return;
      // If this is a route-like hash (contains "/"), let the router handle hashchange
      if (href.includes("/")) return;
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      // If changing to a different hash, allow default navigation so hashchange fires
      if (href !== (location.hash || "")) return;
      e.preventDefault();
      const headerH =
        (document.getElementById("site-header")?.offsetHeight || 0) + 6;
      // If mobile nav open, close it before scroll
      try {
        const navEl = document.querySelector("nav.primary-nav");
        if (navEl && navEl.classList.contains("open")) {
          const toggleBtn = document.querySelector(".nav-toggle");
          if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
          navEl.classList.remove("open");
          document.body.classList.remove("nav-open");
          const backdrop = document.getElementById("nav-backdrop");
          if (backdrop) backdrop.hidden = true;
          if (window.__lenis && typeof window.__lenis.start === "function")
            window.__lenis.start();
        }
      } catch (_) {}
      if (window.__lenis && typeof window.__lenis.scrollTo === "function") {
        window.__lenis.scrollTo(target, { offset: -headerH });
      } else {
        const top =
          target.getBoundingClientRect().top +
          (window.scrollY || window.pageYOffset) -
          headerH;
        try {
          window.scrollTo({ top, behavior: "smooth" });
        } catch (_) {
          window.scrollTo(0, top);
        }
      }
    });
  }

  // Double-click zoom for all images with smooth animation
  function initDoubleClickZoom() {
    let active = null; // { img, clone, overlay }
    // Create overlay once
    const overlay = document.createElement("div");
    overlay.id = "dblzoom";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.hidden = true;
    document.body.appendChild(overlay);

    function openZoom(img) {
      if (active) {
        closeZoom();
      }
      const rect = img.getBoundingClientRect();
      overlay.innerHTML = "";
      overlay.hidden = false;
      document.body.classList.add("zoom-open");
      const clone = img.cloneNode(true);
      clone.removeAttribute("id");
      clone.style.position = "fixed";
      clone.style.top = rect.top + "px";
      clone.style.left = rect.left + "px";
      clone.style.width = rect.width + "px";
      clone.style.height = rect.height + "px";
      clone.style.margin = "0";
      clone.style.zIndex = "1";
      clone.style.willChange = "transform, top, left, width, height";
      overlay.appendChild(clone);

      // target size to fit viewport
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;
      const maxW = Math.min(vpW * 0.95, 1600);
      const maxH = Math.min(vpH * 0.9, 1200);
      const scale = Math.min(maxW / rect.width, maxH / rect.height, 4);
      const targetW = Math.max(
        rect.width * scale,
        Math.min(rect.width * scale, maxW)
      );
      const targetH = rect.height * (targetW / rect.width);
      const targetLeft = (vpW - targetW) / 2;
      const targetTop = (vpH - targetH) / 2;

      // animate
      if (window.gsap) {
        gsap.fromTo(
          overlay,
          { backgroundColor: "rgba(0,0,0,0)" },
          {
            backgroundColor: "rgba(0,0,0,0.9)",
            duration: 0.3,
            ease: "power2.out",
          }
        );
        gsap.fromTo(
          clone,
          {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
          {
            top: targetTop,
            left: targetLeft,
            width: targetW,
            height: targetH,
            duration: 0.6,
            ease: "power2.out",
          }
        );
      } else {
        overlay.style.background = "rgba(0,0,0,0.9)";
        clone.style.transition =
          "top .6s ease, left .6s ease, width .6s ease, height .6s ease";
        requestAnimationFrame(() => {
          clone.style.top = targetTop + "px";
          clone.style.left = targetLeft + "px";
          clone.style.width = targetW + "px";
          clone.style.height = targetH + "px";
        });
      }
      active = { img, clone, overlay };
    }

    function closeZoom() {
      if (!active) return;
      const { img, clone } = active;
      // re-measure in case of scroll changes
      const rect = img.getBoundingClientRect();
      const end = () => {
        overlay.hidden = true;
        overlay.innerHTML = "";
        document.body.classList.remove("zoom-open");
        active = null;
      };
      if (window.gsap) {
        gsap.to(overlay, {
          backgroundColor: "rgba(0,0,0,0)",
          duration: 0.3,
          ease: "power2.out",
        });
        gsap.to(clone, {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          duration: 0.5,
          ease: "power2.out",
          onComplete: end,
        });
      } else {
        clone.style.transition =
          "top .5s ease, left .5s ease, width .5s ease, height .5s ease";
        clone.style.top = rect.top + "px";
        clone.style.left = rect.left + "px";
        clone.style.width = rect.width + "px";
        clone.style.height = rect.height + "px";
        setTimeout(end, 520);
      }
    }

    document.addEventListener(
      "dblclick",
      (e) => {
        const img = e.target && e.target.closest && e.target.closest("img");
        if (!img) return;
        e.preventDefault();
        // If overlay open -> close; else open
        if (!overlay.hidden) {
          closeZoom();
        } else {
          openZoom(img);
        }
      },
      { passive: false }
    );

    overlay.addEventListener(
      "dblclick",
      (e) => {
        e.preventDefault();
        closeZoom();
      },
      { passive: false }
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeZoom();
    });
  }

  function prefersReducedMotion() {
    // Allow override via URL param ?anim=on or a persisted localStorage flag
    try {
      const p = new URLSearchParams(location.search);
      if (p.get("anim") === "on") return false;
    } catch (e) {}
    const ls = (() => {
      try {
        return localStorage.getItem("anim");
      } catch (_) {
        return null;
      }
    })();
    if (ls === "on") return false;
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
  function motionEnabled() {
    // Allow override via URL param ?anim=on
    try {
      const p = new URLSearchParams(location.search);
      if (p.get("anim") === "on") return true;
    } catch (e) {}
    try {
      if (localStorage.getItem("anim") === "on") return true;
    } catch (_) {}
    return !prefersReducedMotion();
  }
  function isDebug() {
    try {
      const p = new URLSearchParams(location.search);
      return p.get("debug") === "1";
    } catch (e) {
      return false;
    }
  }

  function buildFooter(cfg) {
    const inner = document.getElementById("footer-inner");
    inner.innerHTML = "";
    const container = document.createElement("div");
    container.className = "container";

    // Top area
    const top = document.createElement("div");
    top.className = "footer-top";

    // Brand / about column
    const brandCol = document.createElement("div");
    brandCol.className = "brand-col";
    const brand = document.createElement("a");
    brand.className = "brand";
    brand.href = cfg.navigation?.header?.logoHref || "#home";
    const logo = document.createElement("img");
    logo.alt = "Logo";
    logo.loading = "lazy";
    logo.decoding = "async";
    logo.src = asset(cfg.navigation?.header?.logo || "assets/imgs/logo.png");
    // const title = document.createElement('span'); title.className='title'; title.textContent = cfg.site?.title || '';
    brand.append(logo);
    const tagline = document.createElement("p");
    tagline.className = "tagline";
    tagline.textContent = cfg.site?.meta?.description || "";
    // hotline chip if present
    const hotlineStr = (cfg.site?.contacts || []).find((s) =>
      /hotline|\b0\d{8,}/i.test(s || "")
    );
    let hotlineBtn = null;
    if (hotlineStr) {
      const num = (hotlineStr.match(/\d[\d\s\.\-]{7,}/) || [])[0];
      const tel = num ? `tel:${num.replace(/[^\d+]/g, "")}` : "#contact";
      hotlineBtn = document.createElement("a");
      hotlineBtn.href = tel;
      hotlineBtn.className = "chip hotline";
      hotlineBtn.setAttribute("aria-label", "Gọi hotline");
      hotlineBtn.textContent = num
        ? `Hotline ${num.replace(/\s+/g, "")}`
        : "Hotline";
    }
    brandCol.append(brand, tagline);
    if (hotlineBtn) brandCol.append(hotlineBtn);

    // Links column (site sections only)
    const linksCol = document.createElement("nav");
    linksCol.className = "links-col";
    linksCol.setAttribute("aria-label", "Liên kết nhanh");
    const hLinks = document.createElement("h4");
    hLinks.textContent = "Liên kết";
    const ulLinks = document.createElement("ul");
    ulLinks.className = "link-list";
    const sectionLinks = dedupeLinks([
      ...(cfg.navigation?.header?.current || []),
      ...(cfg.navigation?.header?.next || []),
    ]);
    sectionLinks.forEach((l) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = l.href;
      a.textContent = l.label;
      li.append(a);
      ulLinks.append(li);
    });
    linksCol.append(hLinks, ulLinks);

    // Contact column (make phone/email clickable when possible)
    const contactCol = document.createElement("div");
    contactCol.className = "contact-col";
    const hContact = document.createElement("h4");
    hContact.textContent = "Liên hệ";
    const ulContact = document.createElement("ul");
    ulContact.className = "contact-list";
    (cfg.site?.contacts || []).forEach((c) => {
      const li = document.createElement("li");
      const txt = String(c || "");
      if (/email|@/i.test(txt)) {
        const mail = (txt.match(/[\w.\-+]+@[\w\-]+\.[\w.\-]+/i) || [])[0];
        if (mail) {
          const a = document.createElement("a");
          a.href = `mailto:${mail}`;
          a.textContent = txt;
          li.append(a);
        } else {
          li.textContent = txt;
        }
      } else if (/hotline|\d{8,}/i.test(txt)) {
        const num = (txt.match(/\d[\d\s\.\-]{7,}/) || [])[0];
        if (num) {
          const a = document.createElement("a");
          a.href = `tel:${num.replace(/[^\d+]/g, "")}`;
          a.textContent = txt;
          li.append(a);
        } else {
          li.textContent = txt;
        }
      } else {
        li.textContent = txt;
      }
      ulContact.append(li);
    });
    contactCol.append(hContact, ulContact);

    top.append(brandCol, linksCol, contactCol);

    // Divider
    const divider = document.createElement("hr");
    divider.className = "divider";
    divider.setAttribute("aria-hidden", "true");

    // Bottom area
    const bottom = document.createElement("div");
    bottom.className = "footer-bottom";
    const copy = document.createElement("div");
    copy.className = "copyright";
    const year = new Date().getFullYear();
    copy.textContent = `© ${year} ${cfg.site?.title || ""}`.trim();
    const policyNav = document.createElement("nav");
    policyNav.className = "policy";
    policyNav.setAttribute("aria-label", "Điều khoản");
    const ulPolicy = document.createElement("ul");
    (cfg.navigation?.footerLinks || []).forEach((l) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = l.href;
      a.textContent = l.label;
      li.append(a);
      ulPolicy.append(li);
    });
    policyNav.append(ulPolicy);
    bottom.append(copy, policyNav);

    container.append(top, divider, bottom);
    inner.append(container);
  }

  function injectAnalytics(a) {
    if (!a) return;
    // GTM
    if (a.gtmContainerId) {
      (function (w, d, s, l, i) {
        w[l] = w[l] || [];
        w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
        var f = d.getElementsByTagName(s)[0],
          j = d.createElement(s),
          dl = l != "dataLayer" ? "&l=" + l : "";
        j.async = true;
        j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
        f.parentNode.insertBefore(j, f);
      })(window, document, "script", "dataLayer", a.gtmContainerId);
      const nos = document.createElement("noscript");
      nos.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${a.gtmContainerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
      document.body.prepend(nos);
    }
    // GA4
    if (a.ga4MeasurementId) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${a.ga4MeasurementId}`;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      window.gtag = gtag;
      gtag("js", new Date());
      gtag("config", a.ga4MeasurementId);
    }
    // Facebook Pixel
    if (a.facebookPixelId) {
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod
            ? n.callMethod.apply(n, arguments)
            : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(
        window,
        document,
        "script",
        "https://connect.facebook.net/en_US/fbevents.js"
      );
      fbq("init", a.facebookPixelId);
      fbq("track", "PageView");
    }
    // Hotjar
    if (a.hotjarId) {
      (function (h, o, t, j, a, r) {
        h.hj =
          h.hj ||
          function () {
            (h.hj.q = h.hj.q || []).push(arguments);
          };
        h._hjSettings = { hjid: a, hjsv: 6 };
        a = o.getElementsByTagName("head")[0];
        r = o.createElement("script");
        r.async = 1;
        r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
        a.appendChild(r);
      })(
        window,
        document,
        "https://static.hotjar.com/c/hotjar-",
        ".js?sv=",
        a.hotjarId
      );
    }
    // Clarity
    if (a.clarityId) {
      (function (c, l, a, r, i, t, y) {
        c[a] =
          c[a] ||
          function () {
            (c[a].q = c[a].q || []).push(arguments);
          };
        t = l.createElement(r);
        t.async = 1;
        t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t, y);
      })(window, document, "clarity", "script", a.clarityId);
    }
  }
})();
