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

    // Hero entrance timeline
    if (document.querySelector(".hero")) {
      const tl = gsap.timeline({ delay: 0.15 });
      const setWC = (sel) => {
        try {
          gsap.set(sel, { willChange: "transform, opacity" });
        } catch (e) {}
      };
      const resetWC = (sel) => {
        try {
          gsap.set(sel, { willChange: "auto" });
        } catch (e) {}
      };
      setWC([".hero-textual .pill", ".hero-title", ".hero-subtitle"]);
      tl.from(".hero-textual .pill", {
        y: 24,
        autoAlpha: 0,
        duration: 0.5,
        ease: "power3.out",
        force3D: true,
        autoRound: false,
        clearProps: "all",
      })
        .from(
          ".hero-title",
          {
            y: 44,
            autoAlpha: 0,
            duration: 0.7,
            ease: "power3.out",
            force3D: true,
            autoRound: false,
            clearProps: "all",
          },
          "-=0.2"
        )
        .from(
          ".hero-subtitle",
          {
            y: 32,
            autoAlpha: 0,
            duration: 0.55,
            ease: "power3.out",
            force3D: true,
            autoRound: false,
            clearProps: "all",
          },
          "-=0.25"
        )
        .add(() =>
          resetWC([".hero-textual .pill", ".hero-title", ".hero-subtitle"])
        );
    }

    if (window.ScrollTrigger && !prefersReduced) {
      const hero = document.querySelector(".hero");
      if (hero) {
        gsap.to(hero, {
          backgroundPosition: "50% 30%",
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: true,
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
        try {
          gsap.set(header.children, { willChange: "transform, opacity" });
        } catch (e) {}
        gsap.from(header.children, {
          autoAlpha: 0,
          y: 36,
          duration: 0.65,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: header, start: "top 80%" },
          force3D: true,
          autoRound: false,
          onComplete: () => {
            try {
              gsap.set(header.children, { willChange: "auto" });
            } catch (e) {}
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

    const totalWidth = rows[0].scrollWidth;
    rows.forEach((row) => {
      row.style.willChange = "transform";
    });
    const tween = gsap.to(rows, {
      xPercent: -50,
      ease: "none",
      duration: 20,
      repeat: -1,
    });
    // Pause on hover
    track.addEventListener("mouseenter", () => tween.pause());
    track.addEventListener("mouseleave", () => tween.play());
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
