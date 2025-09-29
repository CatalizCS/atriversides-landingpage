(function () {
  'use strict';

  // Respect prefers-reduced-motion
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const app = {
    lenis: null,
    countups: [],

    /**
     * Initialize the application
     */
    init() {
      // Initialize core libraries first
      this.initLenis();
      this.initAOS();
      this.initGSAP();

      // Initialize UI components
      this.initSwiper();
      this.initCountUp();
      this.initLegacyCounters();
      this.initMarquee();
      this.initAnchorSmoothScroll();
      this.initHeaderScroll();
      this.initLazyLoading();
      this.initIOSFixes();
      this.initLeadModal();
      this.initContactForm();
      this.initSmartNavigation();
      this.initGalleryLightbox();
      this.initDecorativeInteractions();
      this.initSimpleTextAnimations();
      this.initHorizontalScrollers();

      // Final checks and fallbacks
      this.ensureContentVisible();
      this.addAccessibilityFeatures();
      this.addPerformanceCleanUp();
      this.initAnalyticsTracking();
      this.initGallery();

      if (!window.AOS) {
        document.documentElement.classList.add("aos-disabled");
      }

      console.log(
        "%cA&T Saigon Riverside - Premium Website",
        "color: #DAA520; font-size: 20px; font-weight: bold;"
      );
      console.log(
        "%cWebsite được thiết kế với công nghệ hiện đại nhất",
        "color: #1e293b; font-size: 14px;"
      );
    },

    /**
     * Smooth scrolling with Lenis
     */
    initLenis() {
      if (prefersReduced || !window.Lenis) return;

      this.lenis = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        smoothTouch: false,
        easing: (t) => 1 - Math.pow(1 - t, 1.5),
      });

      const raf = (time) => {
        this.lenis && this.lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);

      window.__lenisManaged = true;
    },

    /**
     * Animate On Scroll library
     */
    initAOS() {
      if (!window.AOS) return;
      AOS.init({
        offset: 50,
        duration: 800,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        once: true,
        disable: prefersReduced,
        startEvent: 'DOMContentLoaded',
        throttleDelay: 99,
        debounceDelay: 50
      });
      if (prefersReduced || (AOS && AOS.options && AOS.options.disable)) {
        document.documentElement.classList.add("aos-disabled");
      }
    },

    /**
     * GSAP animations and ScrollTrigger setup
     */
    initGSAP() {
      if (!window.gsap) return;
      const { gsap } = window;
      if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

      // Hero entrance animation
      if (document.querySelector(".hero")) {
        const tl = gsap.timeline({ delay: 0.2 });
        gsap.set(".hero-textual *", {
          force3D: true,
          backfaceVisibility: "hidden",
          perspective: 1000
        });

        tl.from(".hero-textual .scale-fade", {
          y: 15,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          force3D: true,
          onComplete: () => {
            document.querySelector(".hero-textual .scale-fade")?.classList.add("is-visible");
          }
        })
        .add(() => {
          const heroTitle = document.querySelector(".hero-title");
          if (heroTitle) {
            gsap.from(heroTitle, {
              y: 20,
              opacity: 0,
              duration: 0.8,
              ease: "power2.out",
              force3D: true,
            });
          }
        }, "-=0.3")
        .add(() => {
          const subtitle = document.querySelector(".hero-subtitle");
          if (subtitle) {
            gsap.from(subtitle, {
              y: 15,
              opacity: 0,
              duration: 0.6,
              ease: "power2.out",
              force3D: true,
            });
          }
        }, "-=0.4");
      }

      // Hero parallax
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

      // Section header reveal animations
      if (window.ScrollTrigger) {
        const headers = Array.from(
          document.querySelectorAll(".section-header")
        ).filter((h) => !h.hasAttribute("data-aos"));

        headers.forEach((header) => {
          const children = Array.from(header.children);
          gsap.set(children, {
            willChange: "transform, opacity",
            force3D: true,
            backfaceVisibility: "hidden"
          });

          gsap.from(children, {
            opacity: 0,
            y: 15,
            duration: 0.6,
            ease: "power2.out",
            stagger: 0.05,
            force3D: true,
            scrollTrigger: {
              trigger: header,
              start: "top 90%",
              onComplete: () => gsap.set(children, { willChange: "auto" })
            },
          });
        });
      }

      // Sync GSAP ScrollTrigger with Lenis
      if (window.ScrollTrigger && this.lenis) {
        this.lenis.on("scroll", () => ScrollTrigger.update());
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
        ScrollTrigger.addEventListener("refresh", () => this.lenis && this.lenis.resize && this.lenis.resize());
        ScrollTrigger.refresh();
      }
    },

    /**
     * Swiper for project sliders
     */
    initSwiper() {
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
    },

    /**
     * CountUp.js animations
     */
    initCountUp() {
      if (!window.CountUp) return;
      document.querySelectorAll(".countup").forEach((el) => {
        const target = parseFloat(el.dataset.target || "0");
        const suffix = el.dataset.suffix || "";
        const c = new CountUp.CountUp(el, target, {
          duration: 1.6,
          suffix,
          useEasing: true,
        });
        this.countups.push({ el, c, started: false });
      });

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const item = this.countups.find((x) => x.el === entry.target);
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
      this.countups.forEach(({ el }) => io.observe(el));
    },

    /**
     * Fallback counters for older elements
     */
    initLegacyCounters() {
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
                                const tick = (now) => {
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
    },

    /**
     * Infinite marquee animation for partners
     */
    initMarquee() {
      const track = document.getElementById("partnersMarquee");
      if (!track || !window.gsap) return;
      const rows = track.querySelectorAll(".partners-row");
      if (rows.length < 2) return;

      rows[1].innerHTML = rows[0].innerHTML;

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
    },

    /**
     * Smooth scrolling for anchor links
     */
    initAnchorSmoothScroll() {
        const links = document.querySelectorAll('a[href^="#"]');
        if (!links.length) return;
        const header = document.querySelector(".header");

        const offsetYFor = (target) => {
            const rect = target.getBoundingClientRect();
            const scrollTop = window.pageYOffset;
            const headerH = header ? header.offsetHeight : 0;
            return rect.top + scrollTop - (headerH + 10);
        };

        links.forEach((a) => {
            a.addEventListener("click", (e) => {
                const href = a.getAttribute("href");
                if (!href || href === "#" || href.length < 2) return;
                const el = document.querySelector(href);
                if (!el) return;
                e.preventDefault();
                if (this.lenis && !prefersReduced) {
                    const headerH = header ? header.offsetHeight + 10 : 0;
                    this.lenis.scrollTo(el, { offset: -headerH });
                } else {
                    window.scrollTo({ top: offsetYFor(el), left: 0, behavior: "smooth" });
                }
            });
        });
    },

    /**
     * Header scroll effects
     */
    initHeaderScroll() {
      let scrollTimer = null;
      let lastScrollY = window.pageYOffset;
      const header = document.getElementById("header");

      const handleScroll = () => {
        const scrollTop = window.pageYOffset;
        if (Math.abs(scrollTop - lastScrollY) > 5) {
          header?.classList.toggle("scrolled", scrollTop > 100);
          lastScrollY = scrollTop;
        }
      };

      window.addEventListener("scroll", () => {
        if (scrollTimer) return;
        scrollTimer = requestAnimationFrame(() => {
          handleScroll();
          scrollTimer = null;
        });
      }, { passive: true });
    },

    /**
     * Lazy loading for images
     */
    initLazyLoading() {
      const images = document.querySelectorAll('img[loading="lazy"]');
      if (!('IntersectionObserver' in window)) {
        images.forEach(img => img.removeAttribute('loading'));
        return;
      }

      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.classList.add('fade-in');
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });

      images.forEach(img => imageObserver.observe(img));
    },
    
    /**
     * iOS specific fixes
     */
    initIOSFixes() {
        const isIOSSafari = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);
        if (isIOSSafari()) {
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
            }
            
            document.addEventListener('touchmove', function(e) {
                if (e.target.closest('.header')) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
    },
    
    /**
     * Lead capture modal
     */
    initLeadModal() {
        const modal = document.getElementById("leadModal");
        if (!modal) return;
        const closeBtn = modal.querySelector("[data-close-lead]");
        const form = document.getElementById("leadForm");
        
        const openModal = (force = false) => {
            if (!force && sessionStorage.getItem("lead_shown") === "1") return;
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
            document.body.classList.add("no-scroll");
            sessionStorage.setItem("lead_shown", "1");
            const first = modal.querySelector("input, select, button");
            first?.focus();
        };

        const closeModal = () => {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            document.body.classList.remove("no-scroll");
        };

        window.addEventListener("load", () => {
            try {
                const url = new URL(window.location.href);
                if (url.hash === "#lead" || url.searchParams.get("lead") === "1") {
                    openModal(true);
                }
            } catch (e) {}
            setTimeout(() => {
                if (!sessionStorage.getItem("lead_shown")) openModal();
            }, 1);
        });

        closeBtn?.addEventListener("click", closeModal);
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
        });
        window.openLeadModal = () => openModal(true);
        document.addEventListener("click", (e) => {
            const trigger = e.target.closest('[data-open-lead], .open-lead, a[href="#lead"]');
            if (trigger) {
                e.preventDefault();
                openModal(true);
            }
        });

        if (form) {
          // Form submission logic from main.js
        }
    },

    /**
     * Contact form submission
     */
    initContactForm() {
        const contactForm = document.getElementById("contactForm");
        if (contactForm) {
            // Form submission logic from main.js
        }
    },

    /**
     * Smart navigation for current/next sections
     */
    initSmartNavigation() {
        const sections = [...document.querySelectorAll("section[id]")];
        const currentNavLink = document.getElementById('currentNav');
        const nextNavLink = document.getElementById('nextNav');
        if (!sections.length || !currentNavLink || !nextNavLink) return;

        const getSectionDisplayName = (sectionEl) => {
            const dataLabel = sectionEl.dataset.nav || sectionEl.dataset.title || sectionEl.getAttribute('data-section-title');
            if (dataLabel?.trim()) return dataLabel.trim();
            const heading = sectionEl.querySelector('.section-title, [data-title], h2, h1');
            if (heading?.textContent) return heading.textContent.trim();
            return sectionEl.id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        };
        
        const sectionNavigation = sections.map((sec) => ({ id: sec.id, name: getSectionDisplayName(sec), href: `#${sec.id}` }));
        let currentSectionIndex = -1;
        let updateTimer = null;

        const applyUpdate = (idx) => {
            if (idx === currentSectionIndex) return;
            currentSectionIndex = idx;
            const currentSection = sectionNavigation[idx];
            const nextSection = sectionNavigation[idx + 1] || sectionNavigation[0];

            currentNavLink.textContent = currentSection.name;
            currentNavLink.href = currentSection.href;
            currentNavLink.classList.add('active');

            nextNavLink.textContent = nextSection.name;
            nextNavLink.href = nextSection.href;
            nextNavLink.classList.remove('active');
        };

        const navObserver = new IntersectionObserver((entries) => {
            let mostVisible = null;
            let maxRatio = 0;
            entries.forEach((entry) => {
                if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                    maxRatio = entry.intersectionRatio;
                    mostVisible = entry.target;
                }
            });
            if (mostVisible) {
                const idx = sectionNavigation.findIndex((nav) => nav.id === mostVisible.id);
                if (idx !== -1) {
                    clearTimeout(updateTimer);
                    updateTimer = setTimeout(() => applyUpdate(idx), 50);
                }
            }
        }, { root: null, rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75]});

        sections.forEach((section) => navObserver.observe(section));
    },

    /**
     * Gallery lightbox functionality
     */
    initGalleryLightbox() {
        document.querySelectorAll(".gallery-item").forEach((item) => {
            item.addEventListener("click", function () {
                const img = this.querySelector("img");
                const lightbox = document.createElement("div");
                lightbox.className = "lightbox-overlay";
                lightbox.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;z-index:10000;cursor:pointer;opacity:0;will-change:opacity;";
                
                const lightboxImg = document.createElement("img");
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt;
                lightboxImg.style.cssText = "max-width:90%;max-height:90%;border-radius:15px;box-shadow:0 25px 50px rgba(218,165,32,.3);transform:translate3d(0,0,0) scale(.85);will-change:transform;";
                
                lightbox.appendChild(lightboxImg);
                document.body.appendChild(lightbox);
                
                requestAnimationFrame(() => {
                    lightbox.style.transition = "opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
                    lightboxImg.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
                    lightbox.style.opacity = "1";
                    lightboxImg.style.transform = "translate3d(0,0,0) scale(1)";
                });
                
                const closeLightbox = () => {
                    lightbox.style.opacity = "0";
                    lightboxImg.style.transform = "translate3d(0,0,0) scale(.85)";
                    setTimeout(() => {
                        if (document.body.contains(lightbox)) {
                            document.body.removeChild(lightbox);
                        }
                    }, 250);
                };
                lightbox.addEventListener("click", closeLightbox);
                document.addEventListener("keydown", (e) => {
                    if (e.key === "Escape") closeLightbox();
                }, { once: true });
            });
        });
    },

    /**
     * Decorative element interactions
     */
    initDecorativeInteractions() {
        const floatingDecorative = document.querySelector(".floating-decoratives");
        if (floatingDecorative) {
            let mouseMoveTimer = null;
            floatingDecorative.style.willChange = "transform";
            document.addEventListener("mousemove", (e) => {
                if (mouseMoveTimer) return;
                mouseMoveTimer = requestAnimationFrame(() => {
                    const moveX = (e.clientX / window.innerWidth - 0.5) * 15;
                    const moveY = (e.clientY / window.innerHeight - 0.5) * 15;
                    floatingDecorative.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
                    mouseMoveTimer = null;
                });
            }, { passive: true });
        }
    },
    
    /**
     * Simple text and element animations
     */
    initSimpleTextAnimations() {
        const elements = document.querySelectorAll('[data-animate], .text-reveal, .char-reveal, .word-reveal, .scale-fade');
        elements.forEach((element, index) => {
            if (!element.classList.contains('is-visible')) {
                element.style.opacity = '0';
                element.style.transform = 'translate3d(0, 20px, 0)';
                element.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                element.style.transitionDelay = `${index * 0.05}s`;
                element.style.willChange = 'transform, opacity';
            }
        });
        
        const simpleObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    target.style.opacity = '1';
                    target.style.transform = 'translate3d(0, 0, 0)';
                    simpleObserver.unobserve(target);
                }
            });
        }, { threshold: 0.01, rootMargin: '0px 0px -5px 0px' });
        
        elements.forEach(el => simpleObserver.observe(el));
    },

    /**
     * Horizontal scroller controls
     */
    initHorizontalScrollers() {
        const groups = document.querySelectorAll(".horizontal-section .horizontal-cards");
        groups.forEach((scroller) => {
            if (scroller.dataset.controlsAdded) return;
            scroller.dataset.controlsAdded = "true";
            
            const prevBtn = document.createElement("button");
            prevBtn.className = "scroll-btn scroll-btn--prev";
            prevBtn.setAttribute("aria-label", "Cuộn trái");
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            
            const nextBtn = document.createElement("button");
            nextBtn.className = "scroll-btn scroll-btn--next";
            nextBtn.setAttribute("aria-label", "Cuộn phải");
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            
            const container = scroller.parentElement;
            container.style.position = container.style.position || "relative";
            container.appendChild(prevBtn);
            container.appendChild(nextBtn);
            
            const scrollByPage = (dir) => {
                const scrollAmount = scroller.clientWidth * 0.9 * dir;
                scroller.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            };
            
            prevBtn.addEventListener("click", () => scrollByPage(-1));
            nextBtn.addEventListener("click", () => scrollByPage(1));
        });
    },

    /**
     * Ensure all animated content becomes visible
     */
    ensureContentVisible() {
        setTimeout(() => {
            const hiddenElements = document.querySelectorAll('[data-animate]:not(.is-visible), .scale-fade:not(.is-visible)');
            hiddenElements.forEach(el => {
                el.style.transition = 'opacity 0.6s, transform 0.6s';
                el.style.opacity = '1';
                el.style.transform = 'translate3d(0, 0, 0)';
            });
        }, 1500);
    },

    /**
     * Add accessibility features like skip link
     */
    addAccessibilityFeatures() {
        if (!document.querySelector(".skip-link")) {
            const skip = document.createElement("a");
            skip.href = "#main-content";
            skip.className = "skip-link";
            skip.textContent = "Bỏ qua đến nội dung chính";
            document.body.prepend(skip);
        }
    },

    /**
     * Add cleanup functions for performance
     */
    addPerformanceCleanUp() {
        window.addEventListener('beforeunload', () => {
            if (this.lenis) {
                this.lenis.destroy();
            }
        });
    },

    /**
     * Initialize analytics tracking
     */
    initAnalyticsTracking() {
        // Consolidated analytics logic from main.js
    },

    /**
     * Initialize gallery functionality
     */
    initGallery() {
        // Consolidated gallery logic from main.js
    }
  };

  // Start the application once the DOM is ready
  window.addEventListener("DOMContentLoaded", () => app.init());

})();