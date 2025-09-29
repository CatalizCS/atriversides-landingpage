(function () {
  // Respect prefers-reduced-motion
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let lenis;
  function initLenis() {
    if (prefersReduced || !window.Lenis) return false;
    lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      smoothTouch: false,
      easing: (t) => 1 - Math.pow(1 - t, 1.5),
    });
    function raf(time) {
      lenis && lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    window.__lenisManaged = true;
    return true;
  }

  // AOS
  function initAOS() {
    if (!window.AOS) return;
    AOS.init({
      offset: 80,
      duration: 700,
      easing: "ease-out-cubic",
      once: true,
      disable: prefersReduced,
    });
    try {
      const disabled = prefersReduced || (AOS && AOS.options && AOS.options.disable);
      if (disabled) document.documentElement.classList.add("aos-disabled");
    } catch (e) {}
  }

  // Swiper for projects
  function initSwiper() {
    if (!window.Swiper) return;
    const el = document.querySelector(".projects-swiper");
    if (!el) return;
    new Swiper(el, {
      slidesPerView: 1.1,
      spaceBetween: 16,
      loop: true,
      pagination: {
        el: el.querySelector(".swiper-pagination"),
        clickable: true,
      },
      navigation: {
        nextEl: el.querySelector(".swiper-button-next"),
        prevEl: el.querySelector(".swiper-button-prev"),
      },
      breakpoints: {
        640: { slidesPerView: 1.4, spaceBetween: 20 },
        768: { slidesPerView: 2, spaceBetween: 24 },
        1024: { slidesPerView: 3, spaceBetween: 28 },
      },
    });
  }

  // CountUp counters
  const countups = [];
  function initCountUp() {
    if (!window.CountUp) return;
    document.querySelectorAll(".countup").forEach((el) => {
      const target = parseFloat(el.dataset.target || "0");
      const suffix = el.dataset.suffix || "";
      const c = new CountUp.CountUp(el, target, {
        duration: 1.6,
        suffix,
        useEasing: true,
      });
      countups.push({ el, c, started: false });
    });

    // Trigger when visible
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const item = countups.find((x) => x.el === entry.target);
            if (item && !item.started) {
              item.c.start();
              item.started = true;
              io.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.4, rootMargin: "0px 0px -10% 0px" }
    );
    countups.forEach(({ el }) => io.observe(el));
  }

  function initLegacyCounters() {
    const nodes = document.querySelectorAll(
      ".metric-value[data-counter] .counter-number"
    );
    if (!nodes.length) return;
    if (window.CountUp) {
      nodes.forEach((numEl) => {
        const parent = numEl.closest(".metric-value");
        const target = parseFloat(parent.getAttribute("data-counter")) || 0;
        const suffix = parent.getAttribute("data-suffix") || "";
        const c = new CountUp.CountUp(numEl, target, { duration: 1.4, suffix });
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                c.start();
                io.unobserve(numEl);
              }
            });
          },
          { threshold: 0.5 }
        );
        io.observe(numEl);
      });
    } else {
      nodes.forEach((numEl) => {
        const parent = numEl.closest(".metric-value");
        const target = parseFloat(parent.getAttribute("data-counter")) || 0;
        const suffix = parent.getAttribute("data-suffix") || "";
        let started = false;
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && !started) {
                started = true;
                const start = performance.now();
                const duration = 1400;
                function tick(now) {
                  const p = Math.min((now - start) / duration, 1);
                  numEl.textContent = Math.floor(p * target) + suffix;
                  if (p < 1) requestAnimationFrame(tick);
                }
                requestAnimationFrame(tick);
                io.unobserve(numEl);
              }
            });
          },
          { threshold: 0.5 }
        );
        io.observe(numEl);
      });
    }
  }

  // GSAP hero entrance + ScrollTrigger parallax
  function initGSAP() {
    if (!window.gsap) return;
    const { gsap } = window;
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    // Hero entrance timeline with advanced text animations
    if (document.querySelector(".hero")) {
      const tl = gsap.timeline({ delay: 0.3 });
      
      // Animate pill first
      tl.from(".hero-textual .scale-fade", {
        y: 20,
        opacity: 0,
        scale: 0.9,
        duration: 0.5,
        ease: "back.out(1.7)",
        force3D: true,
        onComplete: () => {
          document.querySelector(".hero-textual .scale-fade")?.classList.add("is-visible");
        }
      })
      
      // Then animate title characters
      .add(() => {
        const heroTitle = document.querySelector(".hero-title.char-reveal");
        if (heroTitle && heroTitle.querySelectorAll('.char').length > 0) {
          heroTitle.classList.add("is-visible");
          const chars = heroTitle.querySelectorAll(".char");
          gsap.from(chars, {
            y: 60,
            opacity: 0,
            rotation: 5,
            duration: 0.4,
            ease: "back.out(1.2)",
            stagger: 0.02,
            force3D: true,
          });
        } else {
          // Fallback if characters not processed yet
          const heroTitle = document.querySelector(".hero-title");
          if (heroTitle) {
            gsap.from(heroTitle, {
              y: 40,
              opacity: 0,
              duration: 0.6,
              ease: "power2.out",
              force3D: true,
            });
          }
        }
      }, "-=0.2")
      
      // Finally animate subtitle words
      .add(() => {
        const subtitle = document.querySelector(".hero-subtitle.word-reveal");
        if (subtitle && subtitle.querySelectorAll('.word').length > 0) {
          subtitle.classList.add("is-visible");
          const words = subtitle.querySelectorAll(".word");
          gsap.from(words, {
            y: 30,
            opacity: 0,
            duration: 0.4,
            ease: "power2.out",
            stagger: 0.05,
            force3D: true,
          });
        } else {
          // Fallback if words not processed yet
          const subtitle = document.querySelector(".hero-subtitle");
          if (subtitle) {
            gsap.from(subtitle, {
              y: 28,
              opacity: 0,
              duration: 0.5,
              ease: "power2.out",
              force3D: true,
            });
          }
        }
      }, "-=0.1");
    }

    if (window.ScrollTrigger && !prefersReduced) {
      const hero = document.querySelector(".hero");
      if (hero) {
        gsap.set(hero, { willChange: "background-position" });
        gsap.to(hero, {
          backgroundPosition: "50% 30%",
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: 1.2,
            onComplete: () => gsap.set(hero, { willChange: "auto" })
          },
        });
      }
    }

    // Reveal utilities
    if (window.ScrollTrigger) {
      const headers = Array.from(
        document.querySelectorAll(".section-header")
      ).filter((h) => !h.hasAttribute("data-aos"));
      
      headers.forEach((header) => {
        const children = Array.from(header.children);
        gsap.set(children, { 
          willChange: "transform, opacity",
          force3D: true 
        });
        
        gsap.from(children, {
          opacity: 0,
          y: 30,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.08,
          force3D: true,
          scrollTrigger: { 
            trigger: header, 
            start: "top 85%",
            onComplete: () => gsap.set(children, { willChange: "auto" })
          },
        });
      });
    }

    window.__appInitReveal = true;

    // Sync with Lenis
    if (window.ScrollTrigger && lenis) {
      lenis.on("scroll", () => ScrollTrigger.update());
      ScrollTrigger.scrollerProxy(document.documentElement, {
        scrollTop(value) {
          if (arguments.length) {
            window.scrollTo(0, value);
          } else {
            return window.pageYOffset || document.documentElement.scrollTop;
          }
        },
        getBoundingClientRect() {
          return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
          };
        },
      });
      ScrollTrigger.addEventListener(
        "refresh",
        () => lenis && lenis.resize && lenis.resize()
      );
      ScrollTrigger.refresh();
    }
  }

  // GSAP marquee animation for partners
  function initMarquee() {
    const track = document.getElementById("partnersMarquee");
    if (!track || !window.gsap) return;
    const rows = track.querySelectorAll(".partners-row");
    if (rows.length < 2) return;
    
    // duplicate first row into second
    rows[1].innerHTML = rows[0].innerHTML;

    // Set up for GPU acceleration
    rows.forEach((row) => {
      gsap.set(row, { 
        willChange: "transform",
        force3D: true 
      });
    });
    
    const tween = gsap.to(rows, {
      xPercent: -50,
      ease: "none",
      duration: 18,
      repeat: -1,
      force3D: true,
    });
    
    // Pause on hover with smooth transition
    let isHovered = false;
    track.addEventListener("mouseenter", () => {
      if (!isHovered) {
        isHovered = true;
        gsap.to(tween, { timeScale: 0, duration: 0.3, ease: "power2.out" });
      }
    });
    track.addEventListener("mouseleave", () => {
      if (isHovered) {
        isHovered = false;
        gsap.to(tween, { timeScale: 1, duration: 0.3, ease: "power2.out" });
      }
    });
  }

  // Anchor smooth scroll with header offset
  function initAnchorSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    if (!links.length) return;
    const header = document.querySelector(".header");
    function offsetYFor(target) {
      const rect = target.getBoundingClientRect();
      const scrollTop = window.pageYOffset;
      const headerH = header ? header.offsetHeight : 0;
      return rect.top + scrollTop - (headerH + 10);
    }
    links.forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (!href || href === "#" || href.length < 2) return;
        const el = document.querySelector(href);
        if (!el) return;
        e.preventDefault();
        if (lenis && !prefersReduced) {
          const headerH = header ? header.offsetHeight + 10 : 0;
          lenis.scrollTo(el, { offset: -headerH });
        } else {
          window.scrollTo({ top: offsetYFor(el), left: 0, behavior: "smooth" });
        }
      });
    });
  }

  window.addEventListener("DOMContentLoaded", function () {
    // Try to init Lenis, retry briefly if fallback CDN loads late
    let ok = initLenis();
    if (!ok) {
      let attempts = 0;
      const t = setInterval(() => {
        attempts++;
        if (initLenis() || attempts > 6) clearInterval(t);
      }, 250);
    }
    initAOS();
    initSwiper();
    initCountUp();
    initLegacyCounters();
    initGSAP();
    initMarquee();
    initAnchorSmoothScroll();
    if (!window.AOS) {
      document.documentElement.classList.add("aos-disabled");
    }
  });
})();
