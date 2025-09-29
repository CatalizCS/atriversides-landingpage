// Optimized scroll handler with throttling
let scrollTimer = null;
let lastScrollY = window.pageYOffset;

function handleScroll() {
  const header = document.getElementById("header");
  const scrollTop = window.pageYOffset;
  
  // Only update if scroll position changed significantly
  if (Math.abs(scrollTop - lastScrollY) > 5) {
    if (scrollTop > 100) {
      header?.classList.add("scrolled");
    } else {
      header?.classList.remove("scrolled");
    }
    lastScrollY = scrollTop;
  }
}

window.addEventListener("scroll", function () {
  if (scrollTimer) return; // Already scheduled
  scrollTimer = requestAnimationFrame(() => {
    handleScroll();
    scrollTimer = null;
  });
}, { passive: true });

function unlockScroll() {
  try {
    document.body.classList.remove("no-scroll");
    document.documentElement.classList.remove("no-scroll");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  } catch (e) {
    /* no-op */
  }
}
document.addEventListener("DOMContentLoaded", unlockScroll);
window.addEventListener("load", unlockScroll);

let lenis;
function initLenis() {
  if (window.Lenis && !window.__lenisManaged) {
    
    lenis = new Lenis({
      duration: 1.0,
      smoothWheel: true,
      smoothTouch: false,
      easing: (t) => 1 - Math.pow(1 - t, 1.5), // Smoother easing
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });
    
    let rafId;
    function raf(time) {
      if (lenis && typeof lenis.raf === "function") {
        lenis.raf(time);
      }
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);
    
    // Store cleanup function
    window.__lenisCleanup = () => {
      if (rafId) cancelAnimationFrame(rafId);
      lenis = null;
    };
    // Enhanced anchor links with dynamic offset
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (href === "#" || href.length < 2) return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          
          // Offset for floating bar at bottom – keep a small padding
          const offset = -60;
          
          // Smooth scroll with easing
          lenis.scrollTo(target, { 
            offset: offset,
            duration: 1.2,
            easing: (t) => 1 - Math.pow(1 - t, 3) // Ease out cubic
          });
          
          // Update active state immediately for better UX
          setTimeout(() => {
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => link.classList.remove('active'));
            if (a.classList.contains('nav-link')) {
              a.classList.add('active');
            }
          }, 100);
        }
      });
    });
  }
}
initLenis();
setTimeout(unlockScroll, 500);

// Lead capture modal logic
(function leadModalInit() {
  const modal = document.getElementById("leadModal");
  if (!modal) return;
  const closeBtn = modal.querySelector("[data-close-lead]");
  const form = document.getElementById("leadForm");

  function openModal(force = false) {
    if (!force && sessionStorage.getItem("lead_shown") === "1") return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    sessionStorage.setItem("lead_shown", "1");
    // focus first input
    const first = modal.querySelector("input, select, button");
    first && first.focus && first.focus();
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }
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
    setTimeout(() => {
      if (!sessionStorage.getItem("lead_shown")) openModal();
    }, 1);
  });
  // interactions
  closeBtn && closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });
  window.openLeadModal = () => openModal(true);
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(
      '[data-open-lead], .open-lead, a[href="#lead"]'
    );
    if (!trigger) return;
    e.preventDefault();
    openModal(true);
  });

  if (form) {
    const GOOGLE_FORM_ACTION =
      "https://docs.google.com/forms/u/0/d/e/1FAIpQLScmIpZcewi8w0oeyWUOKPprybM9pLMoq5IZbHt1hiSAu56_ow/formResponse";
    const ENTRY_MAP = {
      name: "entry.223043346",
      phone: "entry.1607246013",
      email: "entry.1947902975",
      apartment: "entry.707847209",
      message: "entry.641513450",
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = document.getElementById("lead_name").value.trim();
      const phone = document.getElementById("lead_phone").value.trim();
      const email = document.getElementById("lead_email").value.trim();
      const apartment = document.getElementById("lead_apartment").value;
      const hp = (
        document.getElementById("lead_hp") || { value: "" }
      ).value.trim();
      if (hp) return;
      if (!name || !phone) {
        alert("Vui lòng nhập họ tên và số điện thoại!");
        return;
      }
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(phone)) {
        alert("Số điện thoại không hợp lệ (10-11 số)!");
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
      btn.disabled = true;

      const tempForm = document.createElement("form");
      tempForm.method = "POST";
      tempForm.action = GOOGLE_FORM_ACTION;
      tempForm.target = "hidden_gf_iframe";
      tempForm.style.display = "none";
      const appendField = (n, v) => {
        if (!v) return;
        const i = document.createElement("input");
        i.type = "hidden";
        i.name = n;
        i.value = v;
        tempForm.appendChild(i);
      };
      appendField(ENTRY_MAP.name, name);
      appendField(ENTRY_MAP.phone, phone);
      appendField(ENTRY_MAP.email, email);
      appendField(ENTRY_MAP.apartment, apartment);
      appendField(ENTRY_MAP.message, "Popup lead");
      document.body.appendChild(tempForm);
      tempForm.submit();
      setTimeout(() => {
        alert("Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.");
        btn.innerHTML = original;
        btn.disabled = false;
        closeModal();
        if (document.body.contains(tempForm))
          document.body.removeChild(tempForm);
      }, 1000);
    });
  }
})();

const contactForm = document.getElementById("contactForm");
if (contactForm) {
  const GOOGLE_FORM_ACTION =
    "https://docs.google.com/forms/u/0/d/e/1FAIpQLScmIpZcewi8w0oeyWUOKPprybM9pLMoq5IZbHt1hiSAu56_ow/formResponse";
  const ENTRY_MAP = {
    name: "entry.223043346", // Họ và tên
    phone: "entry.1607246013", // Số điện thoại
    email: "entry.1947902975", // Email (optional)
    apartment: "entry.707847209", // Loại căn hộ quan tâm
    message: "entry.641513450", // Ghi chú
  };

  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const apartment = document.getElementById("apartment").value;
    const message = document.getElementById("message").value.trim();

    // Honeypot anti-bot
    const hp = (document.getElementById("hp") || { value: "" }).value.trim();
    if (hp) {
      return;
    }

    if (!name || !phone) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(phone)) {
      alert("Vui lòng nhập số điện thoại hợp lệ (10-11 số)!");
      return;
    }

    const button = this.querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
    button.disabled = true;

    // Guard configuration
    if (!/\/formResponse$/.test(GOOGLE_FORM_ACTION)) {
      console.error(
        "GOOGLE_FORM_ACTION must point to the public formResponse endpoint."
      );
      alert("Form chưa được cấu hình đúng. Vui lòng liên hệ quản trị viên.");
      button.innerHTML = originalText;
      button.disabled = false;
      return;
    }

    const tempForm = document.createElement("form");
    tempForm.method = "POST";
    tempForm.action = GOOGLE_FORM_ACTION;
    tempForm.target = "hidden_gf_iframe";
    tempForm.style.display = "none";

    const appendField = (name, value) => {
      if (!value) return;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      tempForm.appendChild(input);
    };
    appendField(ENTRY_MAP.name, name);
    appendField(ENTRY_MAP.phone, phone);
    appendField(ENTRY_MAP.email, email);
    appendField(ENTRY_MAP.apartment, apartment);
    appendField(ENTRY_MAP.message, message);

    document.body.appendChild(tempForm);
    tempForm.submit();

    setTimeout(() => {
      alert(
        "Cảm ơn bạn đã quan tâm đến dự án A&T Saigon Riverside!\nChúng tôi sẽ liên hệ lại trong thời gian sớm nhất."
      );
      contactForm.reset();
      button.innerHTML = originalText;
      button.disabled = false;
      if (document.body.contains(tempForm)) document.body.removeChild(tempForm);
    }, 1200);
  });
}

// Intersection Observer animations (unified via [data-animate]) - optimized
const observerOptions = { 
  threshold: [0, 0.05, 0.1], 
  rootMargin: "0px 0px -30px 0px" 
};

const io = new IntersectionObserver((entries) => {
  const toAnimate = [];
  
  entries.forEach((entry) => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.05) {
      toAnimate.push(entry.target);
      io.unobserve(entry.target);
    }
  });
  
  // Batch DOM updates
  if (toAnimate.length > 0) {
    requestAnimationFrame(() => {
      toAnimate.forEach(target => {
        target.style.willChange = "transform, opacity";
        target.classList.add("is-visible");
        
        // Clean up will-change after animation
        setTimeout(() => {
          target.style.willChange = "auto";
        }, 800);
      });
    });
  }
}, observerOptions);

// Observe all animatable elements
setTimeout(() => {
  document.querySelectorAll("[data-animate]").forEach((el) => io.observe(el));
  
  // Force animation for above-the-fold content
  const heroElements = document.querySelectorAll('.hero [data-animate]');
  heroElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setTimeout(() => {
        el.classList.add('is-visible');
      }, 50);
    }
  });
}, 50);

// Smart navigation with current/next section detection
const sections = [...document.querySelectorAll("section[id]")];
const currentNavLink = document.getElementById('currentNav');
const nextNavLink = document.getElementById('nextNav');

// Build section mapping dynamically from DOM to avoid mismatches
function getSectionDisplayName(sectionEl) {
  // Prefer explicit data attributes
  const dataLabel = sectionEl.dataset.nav || sectionEl.dataset.title || sectionEl.getAttribute('data-section-title');
  if (dataLabel && dataLabel.trim()) return dataLabel.trim();
  // Try common heading selectors
  const heading = sectionEl.querySelector('.section-title, [data-title], h2, h1');
  if (heading && heading.textContent) return heading.textContent.trim();
  // Fallback: prettify the id
  return sectionEl.id
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildSectionNavigation() {
  return sections.map((sec) => ({ id: sec.id, name: getSectionDisplayName(sec), href: `#${sec.id}` }));
}

let sectionNavigation = buildSectionNavigation();

// Legacy active-link code removed (was unused and referenced undefined variables)

// Smart current/next navigation system
function initSmartNavigation() {
  if (!sections.length || !currentNavLink || !nextNavLink) return;

  const navObserverOptions = {
    root: null,
    rootMargin: '-30% 0px -55% 0px',
    // Include 0 to guarantee an initial callback, then progressive thresholds for stability
    threshold: [0, 0.1, 0.25, 0.5, 0.75],
  };

  let currentSectionIndex = -1;
  let updateTimer = null;

  const computeMostVisibleSectionIndex = () => {
    let bestIdx = -1;
    let maxVisible = 0;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    for (let i = 0; i < sections.length; i++) {
      const rect = sections[i].getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
      if (visible > maxVisible) {
        maxVisible = visible;
        bestIdx = sectionNavigation.findIndex((n) => n.id === sections[i].id);
      }
    }
    return bestIdx;
  };

  const applyUpdate = (idx) => {
    if (idx === currentSectionIndex) return;
    currentSectionIndex = idx;
    const currentSection = sectionNavigation[idx];
    const nextSection = sectionNavigation[idx + 1] || sectionNavigation[0];

    if (!currentNavLink || !nextNavLink) return;

    currentNavLink.textContent = currentSection.name;
    currentNavLink.href = currentSection.href;
    currentNavLink.classList.add('active');

    nextNavLink.textContent = nextSection.name;
    nextNavLink.href = nextSection.href;
    nextNavLink.classList.remove('active');

    currentNavLink.style.transition = 'filter 0.25s ease';
    currentNavLink.style.filter = 'brightness(1.05)';
    setTimeout(() => {
      currentNavLink.style.filter = '';
    }, 250);
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
    } else {
      // Fallback when thresholds didn't yield a candidate
      const idx = computeMostVisibleSectionIndex();
      if (idx !== -1) {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => applyUpdate(idx), 50);
      }
    }
  }, navObserverOptions);

  sections.forEach((section) => navObserver.observe(section));

  // Initialize based on current viewport visibility
  const initialIdx = computeMostVisibleSectionIndex();
  applyUpdate(Math.max(0, initialIdx));
}

// Initialize smart navigation
initSmartNavigation();

// Inject skip link for a11y
if (!document.querySelector(".skip-link")) {
  const skip = document.createElement("a");
  skip.href = "#main-content";
  skip.className = "skip-link";
  skip.textContent = "Bỏ qua đến nội dung chính";
  document.body.prepend(skip);
}

// Gallery lightbox - optimized
function initGalleryLightbox() {
  document.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("click", function () {
      const img = this.querySelector("img");
      const lightbox = document.createElement("div");
      lightbox.className = "lightbox-overlay";
      lightbox.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;z-index:10000;cursor:pointer;opacity:0;will-change:opacity;";
        
      const lightboxImg = document.createElement("img");
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxImg.style.cssText =
        "max-width:90%;max-height:90%;border-radius:15px;box-shadow:0 25px 50px rgba(218,165,32,.3);transform:translate3d(0,0,0) scale(.85);will-change:transform;";
        
      const closeBtn = document.createElement("button");
      closeBtn.innerHTML = '<i class="fas fa-times"></i>';
      closeBtn.style.cssText =
        "position:absolute;top:30px;right:30px;background:var(--gradient);border:none;color:#fff;width:50px;height:50px;border-radius:50%;font-size:1.2rem;cursor:pointer;will-change:transform;transform:translate3d(0,0,0);";
        
      lightbox.appendChild(lightboxImg);
      lightbox.appendChild(closeBtn);
      document.body.appendChild(lightbox);
      
      requestAnimationFrame(() => {
        lightbox.style.transition = "opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        lightboxImg.style.transition = "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        lightbox.style.opacity = "1";
        lightboxImg.style.transform = "translate3d(0,0,0) scale(1)";
      });
      
      function closeLightbox() {
        lightbox.style.opacity = "0";
        lightboxImg.style.transform = "translate3d(0,0,0) scale(.85)";
        setTimeout(() => {
          if (document.body.contains(lightbox)) {
            document.body.removeChild(lightbox);
          }
        }, 250);
      }
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) closeLightbox();
      });
      closeBtn.addEventListener("click", closeLightbox);
      const handleEsc = (e) => {
        if (e.key === "Escape") {
          closeLightbox();
          document.removeEventListener("keydown", handleEsc);
        }
      };
      document.addEventListener("keydown", handleEsc);
    });
  });
}
initGalleryLightbox();

// Simplified navigation - no mobile menu needed
function initMobileMenu() {
  // Mobile menu disabled - using simplified navigation
  return;
}

// Initialize mobile menu
initMobileMenu();

// No resize re-init required for simplified nav

// Parallax hero is handled by GSAP ScrollTrigger in app.js

if (window.gsap && !window.__appInitReveal) {
  const { gsap } = window;
  
  if (window.ScrollTrigger) {
    // If Lenis exists, sync with ScrollTrigger
    if (lenis) {
      lenis.on("scroll", () => {
        ScrollTrigger.update();
      });
      ScrollTrigger.scrollerProxy(document.documentElement, {
        scrollTop(value) {
          return arguments.length
            ? window.scrollTo(0, value)
            : window.pageYOffset;
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
    }
  }
  
  // Generic reveal for section headers - optimized
  gsap.utils.toArray(".section-header").forEach((header) => {
    const children = Array.from(header.children);
    gsap.set(children, { 
      willChange: "transform, opacity",
      force3D: true 
    });
    
    gsap.from(children, {
      opacity: 0,
      y: 32,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.08,
      force3D: true,
      scrollTrigger: { 
        trigger: header, 
        start: "top 82%",
        onComplete: () => gsap.set(children, { willChange: "auto" })
      },
    });
  });
  
  // Advantages cards - optimized
  const advantageCards = gsap.utils.toArray(".advantages-grid .advantage-card");
  if (advantageCards.length > 0) {
    gsap.set(advantageCards, { willChange: "transform, opacity", force3D: true });
    gsap.from(advantageCards, {
      opacity: 0,
      y: 40,
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.06,
      force3D: true,
      scrollTrigger: { 
        trigger: ".advantages-grid", 
        start: "top 85%",
        onComplete: () => gsap.set(advantageCards, { willChange: "auto" })
      },
    });
  }
  // Horizontal cards - optimized
  const horizontalCards = gsap.utils.toArray(".horizontal-section .horizontal-card");
  horizontalCards.forEach((card) => {
    gsap.set(card, { willChange: "transform, opacity", force3D: true });
    gsap.from(card, {
      opacity: 0,
      y: 45,
      duration: 0.5,
      ease: "power2.out",
      force3D: true,
      scrollTrigger: { 
        trigger: card, 
        start: "top 90%",
        onComplete: () => gsap.set(card, { willChange: "auto" })
      },
    });
  });
  
  // Gallery items - optimized
  const galleryItems = gsap.utils.toArray(".gallery-grid .gallery-item");
  if (galleryItems.length > 0) {
    gsap.set(galleryItems, { 
      willChange: "transform, opacity", 
      force3D: true,
      transformOrigin: "center center"
    });
    
    gsap.from(galleryItems, {
      opacity: 0,
      scale: 0.9,
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.04,
      force3D: true,
      scrollTrigger: { 
        trigger: ".gallery-grid", 
        start: "top 85%",
        onComplete: () => gsap.set(galleryItems, { willChange: "auto" })
      },
    });
  }
  ScrollTrigger &&
    ScrollTrigger.addEventListener(
      "refresh",
      () => lenis && lenis.resize && lenis.resize()
    );
  ScrollTrigger && ScrollTrigger.refresh();
}

function initDecorativeInteractions() {
  const floatingDecorative = document.querySelector(".floating-decoratives");
  if (floatingDecorative) {
    let mouseMoveTimer = null;
    
    // Set up for GPU acceleration
    floatingDecorative.style.willChange = "transform";
    floatingDecorative.style.transform = "translate3d(0, 0, 0)";
    
    document.addEventListener("mousemove", (e) => {
      if (mouseMoveTimer) return;
      
      mouseMoveTimer = requestAnimationFrame(() => {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;

        const moveX = (mouseX - 0.5) * 15; // Reduced intensity for smoother feel
        const moveY = (mouseY - 0.5) * 15;

        floatingDecorative.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
        mouseMoveTimer = null;
      });
    }, { passive: true });
  }

  const sectionDecoratives = document.querySelectorAll(".section-decorative");
  if (sectionDecoratives.length > 0) {
    const decorativeObserver = new IntersectionObserver(
      (entries) => {
        const toAnimate = [];
        
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            toAnimate.push(entry.target);
            decorativeObserver.unobserve(entry.target);
          }
        });
        
        if (toAnimate.length > 0) {
          requestAnimationFrame(() => {
            toAnimate.forEach(decorative => {
              decorative.style.willChange = "transform, opacity";
              decorative.style.opacity = "1";
              decorative.style.transform = decorative.style.transform.replace("scale(0.8)", "scale(1)");
              
              setTimeout(() => {
                decorative.style.willChange = "auto";
              }, 1200);
            });
          });
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    );

    sectionDecoratives.forEach((decorative) => {
      decorative.style.opacity = "0";
      decorative.style.transform = "translate3d(0, 0, 0) scale(0.8)";
      decorative.style.transition = "all 1.0s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      decorativeObserver.observe(decorative);
    });
  }

  const accentLines = document.querySelectorAll(".accent-line");
  if (accentLines.length > 0) {
    let accentScrollTimer = null;
    
    // Set up for GPU acceleration
    accentLines.forEach(line => {
      line.style.willChange = "opacity";
    });
    
    window.addEventListener("scroll", () => {
      if (accentScrollTimer) return;
      
      accentScrollTimer = requestAnimationFrame(() => {
        const scrollProgress =
          window.pageYOffset /
          (document.documentElement.scrollHeight - window.innerHeight);
        const brightness = Math.min(0.2 + scrollProgress * 0.3, 0.5);

        accentLines.forEach((line) => {
          line.style.opacity = brightness;
        });
        
        accentScrollTimer = null;
      });
    }, { passive: true });
  }
}

// Initialize enhanced interactions
initDecorativeInteractions();

// Simple text animations - no innerHTML manipulation
function initSimpleTextAnimations() {
  // Enhanced initialization with smooth animations - no DOM manipulation
  const elements = document.querySelectorAll('[data-animate], .text-reveal, .char-reveal, .word-reveal, .scale-fade');
  
  elements.forEach((element, index) => {
    // Set initial state for smooth animations
    if (!element.classList.contains('is-visible')) {
      element.style.opacity = '0';
      element.style.transform = 'translateY(30px) scale(0.95)';
      element.style.transition = 'opacity 0.8s cubic-bezier(0.23, 1, 0.32, 1), transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
      element.style.transitionDelay = `${index * 0.1}s`;
      element.style.willChange = 'transform, opacity';
    }
    
    // Mark as ready for animations
    element.dataset.ready = 'true';
  });
}

  // Simple observer - no complex processing
  const simpleObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target;
          requestAnimationFrame(() => {
            target.classList.add('is-visible');
          });
          simpleObserver.unobserve(target);
        }
      });
    },
    {
      threshold: 0.05,
      rootMargin: '0px 0px -30px 0px'
    }
  );

  // Initialize simple animations
  initSimpleTextAnimations();
  
  // Observe elements with simple CSS animations only
  const simpleElements = document.querySelectorAll('[data-animate], .fade-in-blur, .scale-fade');
  simpleElements.forEach(el => {
    simpleObserver.observe(el);
  });

// Initialize simple text animations - disabled complex version to prevent text loss
// initAdvancedTextAnimations();

// Enhanced backup animation fallback
function ensureContentVisible() {
  setTimeout(() => {
    // Make sure all text is visible after 1.5 seconds
    const hiddenElements = document.querySelectorAll('[data-animate]:not(.is-visible), .char-reveal:not(.is-visible), .word-reveal:not(.is-visible), .scale-fade:not(.is-visible), .fade-in-blur:not(.is-visible)');
    hiddenElements.forEach(el => {
      el.classList.add('is-visible');
      // Force visibility with inline styles as backup
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.filter = 'none';
    });
  }, 1500);
  
  // Emergency fallback after 3 seconds
  setTimeout(() => {
    const stillHidden = document.querySelectorAll('[data-animate], .char-reveal, .word-reveal, .scale-fade, .fade-in-blur');
    stillHidden.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.filter = 'none';
      el.style.visibility = 'visible';
    });
  }, 3000);
}

// Run backup after everything loads
window.addEventListener('load', ensureContentVisible);
// Also run on DOMContentLoaded as additional backup
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(ensureContentVisible, 500);
});

// Console branding
console.log(
  "%cA&T Saigon Riverside - Premium Website",
  "color: #DAA520; font-size: 20px; font-weight: bold;"
);
console.log(
  "%cWebsite được thiết kế với công nghệ hiện đại nhất",
  "color: #1e293b; font-size: 14px;"
);

(function initHorizontalScrollers() {
  const groups = document.querySelectorAll(
    ".horizontal-section .horizontal-cards"
  );
  
  groups.forEach((scroller) => {
    if (!scroller.closest(".apartments")) return;
    if (scroller.dataset.controlsAdded) return;
    scroller.dataset.controlsAdded = "true";

    // Create buttons
    const prevBtn = document.createElement("button");
    prevBtn.className = "scroll-btn scroll-btn--prev";
    prevBtn.setAttribute("aria-label", "Cuộn trái");
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.style.willChange = "transform";

    const nextBtn = document.createElement("button");
    nextBtn.className = "scroll-btn scroll-btn--next";
    nextBtn.setAttribute("aria-label", "Cuộn phải");
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.style.willChange = "transform";

    const container = scroller.parentElement;
    container.style.position = container.style.position || "relative";
    container.appendChild(prevBtn);
    container.appendChild(nextBtn);

    const card = scroller.querySelector(".horizontal-card");
    const gap = parseFloat(getComputedStyle(scroller).gap || "0");

    function pageWidth() {
      if (!card) return scroller.clientWidth;
      if (window.innerWidth >= 1024) {
        const cardWidth = card.getBoundingClientRect().width;
        return cardWidth * 3 + gap * 2; // 3 cards + 2 gaps
      }
      return scroller.clientWidth * 0.9;
    }

    let updateTimer = null;
    function updateDisabled() {
      if (updateTimer) return;
      updateTimer = requestAnimationFrame(() => {
        prevBtn.disabled = scroller.scrollLeft <= 1;
        const maxScroll = scroller.scrollWidth - scroller.clientWidth - 1;
        nextBtn.disabled = scroller.scrollLeft >= maxScroll;
        updateTimer = null;
      });
    }
    updateDisabled();

    function scrollByPage(dir) {
      const delta = pageWidth() * dir;
      const target = Math.max(
        0,
        Math.min(
          scroller.scrollLeft + delta,
          scroller.scrollWidth - scroller.clientWidth
        )
      );
      scroller.scrollTo({ 
        left: target, 
        behavior: "smooth", 
        block: "nearest"
      });
    }

    prevBtn.addEventListener("click", () => scrollByPage(-1));
    nextBtn.addEventListener("click", () => scrollByPage(1));
    scroller.addEventListener("scroll", updateDisabled, { passive: true });
    
    // Cleanup on resize
    const resizeHandler = () => {
      updateDisabled();
    };
    window.addEventListener("resize", resizeHandler, { passive: true });
    
    // Store cleanup function
    scroller.__cleanup = () => {
      window.removeEventListener("resize", resizeHandler);
      if (updateTimer) {
        cancelAnimationFrame(updateTimer);
        updateTimer = null;
      }
    };
  });
})();;

// Performance monitoring and cleanup
window.__performanceCleanup = [];

// Ensure ScrollTrigger recalculates on resize - optimized
if (window.ScrollTrigger) {
  let resizeTimer = null;
  const resizeHandler = function () {
    if (resizeTimer) return;
    resizeTimer = requestAnimationFrame(() => {
      try {
        ScrollTrigger.refresh();
      } catch (e) {
        console.warn('ScrollTrigger refresh failed:', e);
      }
      resizeTimer = null;
    });
  };
  
  window.addEventListener("resize", resizeHandler, { passive: true });
  window.__performanceCleanup.push(() => {
    window.removeEventListener("resize", resizeHandler);
    if (resizeTimer) {
      cancelAnimationFrame(resizeTimer);
      resizeTimer = null;
    }
  });
}

// Cleanup function for performance
window.addEventListener('beforeunload', () => {
  // Clean up all registered performance handlers
  window.__performanceCleanup.forEach(cleanup => {
    try {
      cleanup();
    } catch (e) {
      console.warn('Cleanup failed:', e);
    }
  });
  
  // Clean up Lenis
  if (window.__lenisCleanup) {
    window.__lenisCleanup();
  }
  
  // Clean up horizontal scrollers
  document.querySelectorAll('.horizontal-cards').forEach(scroller => {
    if (scroller.__cleanup) {
      scroller.__cleanup();
    }
  });
});
