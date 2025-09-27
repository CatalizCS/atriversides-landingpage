window.addEventListener("scroll", function () {
  const header = document.getElementById("header");
  const scrollTop = window.pageYOffset;
  if (scrollTop > 100) header.classList.add("scrolled");
  else header.classList.remove("scrolled");
});

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
    const headerEl = document.querySelector(".header");
    if (headerEl && getComputedStyle(headerEl).display === "none") return;
    lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      smoothTouch: false,
      easing: (t) => 1 - Math.pow(1 - t, 1.6),
    });
    function raf(time) {
      if (lenis && typeof lenis.raf === "function") {
        lenis.raf(time);
      }
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    // Anchor links offset
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (href === "#" || href.length < 2) return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -100 });
        }
      });
    });
  }
}
initLenis();
setTimeout(unlockScroll, 500);

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
      return; // silently drop bots
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

    // Always submit via hidden iframe to avoid CORS/403
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

// Intersection Observer animations (unified via [data-animate])
const observerOptions = { threshold: 0.15, rootMargin: "0px 0px -80px 0px" };
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    }
  });
}, observerOptions);
document.querySelectorAll("[data-animate]").forEach((el) => io.observe(el));

// Active navigation link highlight based on scroll
const sections = [...document.querySelectorAll("section[id]")];
const navLinks = [...document.querySelectorAll('.nav-menu a[href^="#"]')];
function setActiveLink() {
  const scrollPos = window.scrollY + 140; // offset for fixed header
  let currentId = null;
  for (const sec of sections) {
    if (
      scrollPos >= sec.offsetTop &&
      scrollPos < sec.offsetTop + sec.offsetHeight
    ) {
      currentId = sec.id;
      break;
    }
  }
  navLinks.forEach((l) => {
    if (!currentId) return l.classList.remove("active");
    const href = l.getAttribute("href").replace("#", "");
    l.classList.toggle("active", href === currentId);
  });
}
let __setActiveLinkTimer;
window.addEventListener(
  "scroll",
  function () {
    clearTimeout(__setActiveLinkTimer);
    __setActiveLinkTimer = setTimeout(setActiveLink, 50);
  },
  { passive: true }
);
setActiveLink();

// Inject skip link for a11y
if (!document.querySelector(".skip-link")) {
  const skip = document.createElement("a");
  skip.href = "#main-content";
  skip.className = "skip-link";
  skip.textContent = "Bỏ qua đến nội dung chính";
  document.body.prepend(skip);
}

// Gallery lightbox
function initGalleryLightbox() {
  document.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("click", function () {
      const img = this.querySelector("img");
      const lightbox = document.createElement("div");
      lightbox.className = "lightbox-overlay";
      lightbox.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;z-index:10000;cursor:pointer;opacity:0;transition:opacity .3s ease;";
      const lightboxImg = document.createElement("img");
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxImg.style.cssText =
        "max-width:90%;max-height:90%;border-radius:15px;box-shadow:0 25px 50px rgba(218,165,32,.3);transform:scale(.8);transition:transform .3s ease;";
      const closeBtn = document.createElement("button");
      closeBtn.innerHTML = '<i class="fas fa-times"></i>';
      closeBtn.style.cssText =
        "position:absolute;top:30px;right:30px;background:var(--gradient);border:none;color:#fff;width:50px;height:50px;border-radius:50%;font-size:1.2rem;cursor:pointer;transition:all .3s ease;";
      lightbox.appendChild(lightboxImg);
      lightbox.appendChild(closeBtn);
      document.body.appendChild(lightbox);
      requestAnimationFrame(() => {
        lightbox.style.opacity = "1";
        lightboxImg.style.transform = "scale(1)";
      });
      function closeLightbox() {
        lightbox.style.opacity = "0";
        lightboxImg.style.transform = "scale(.8)";
        setTimeout(() => {
          if (document.body.contains(lightbox))
            document.body.removeChild(lightbox);
        }, 300);
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

// Mobile menu
let teardownMobileMenu = null;
function createMobileMenu() {
  const navContainer = document.querySelector(".nav-container");
  const navMenu = document.querySelector(".nav-menu");
  const headerEl = document.querySelector(".header");
  if (!navContainer || !navMenu) return;

  if (headerEl && getComputedStyle(headerEl).display === "none") {
    const menuToggle = document.querySelector(".menu-toggle");
    if (menuToggle && menuToggle.parentElement)
      menuToggle.parentElement.removeChild(menuToggle);
    document.body.classList.remove("no-scroll");
    return;
  }

  // Teardown previous bindings when switching breakpoints
  if (teardownMobileMenu) {
    teardownMobileMenu();
    teardownMobileMenu = null;
  }

  if (window.innerWidth <= 768) {
    let menuToggle = document.querySelector(".menu-toggle");
    if (!menuToggle) {
      menuToggle = document.createElement("button");
      menuToggle.className = "menu-toggle";
      menuToggle.setAttribute("aria-label", "Mở menu");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
      navContainer.appendChild(menuToggle);
    }

    const handleToggle = () => {
      const isOpen = navMenu.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.innerHTML = isOpen
        ? '<i class="fas fa-times"></i>'
        : '<i class="fas fa-bars"></i>';
      document.body.classList.toggle("no-scroll", isOpen);
    };
    menuToggle.addEventListener("click", handleToggle);

    // Close menu when a link is clicked
    const handleLink = (e) => {
      if (e.target.matches(".nav-menu .nav-link")) {
        navMenu.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.classList.remove("no-scroll");
      }
    };
    navMenu.addEventListener("click", handleLink);

    teardownMobileMenu = () => {
      menuToggle.removeEventListener("click", handleToggle);
      navMenu.removeEventListener("click", handleLink);
      navMenu.classList.remove("open");
      document.body.classList.remove("no-scroll");
      // Keep the button for next mobile render; remove on desktop
    };
  } else {
    // Desktop: ensure menu visible and remove toggle if exists
    navMenu.classList.remove("open");
    const menuToggle = document.querySelector(".menu-toggle");
    if (menuToggle && menuToggle.parentElement)
      menuToggle.parentElement.removeChild(menuToggle);
  }
}
createMobileMenu();
window.addEventListener("resize", createMobileMenu);

// Parallax hero is handled by GSAP ScrollTrigger in app.js

if (window.gsap && !window.__appInitReveal) {
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
  // Generic reveal for section headers
  gsap.utils.toArray(".section-header").forEach((header) => {
    gsap.from(header.children, {
      opacity: 0,
      y: 40,
      duration: 0.8,
      ease: "power3.out",
      stagger: 0.12,
      scrollTrigger: { trigger: header, start: "top 78%" },
    });
  });
  // Advantages cards
  gsap.from(".advantages-grid .advantage-card", {
    opacity: 0,
    y: 50,
    duration: 0.7,
    ease: "power2.out",
    stagger: 0.08,
    scrollTrigger: { trigger: ".advantages-grid", start: "top 80%" },
  });
  gsap.utils.toArray(".horizontal-section .horizontal-card").forEach((card) => {
    gsap.from(card, {
      opacity: 0,
      y: 60,
      duration: 0.6,
      ease: "power2.out",
      scrollTrigger: { trigger: card, start: "top 85%" },
    });
  });
  // Gallery items
  gsap.from(".gallery-grid .gallery-item", {
    opacity: 0,
    scale: 0.85,
    duration: 0.7,
    ease: "power2.out",
    stagger: 0.06,
    scrollTrigger: { trigger: ".gallery-grid", start: "top 80%" },
  });
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
    document.addEventListener("mousemove", (e) => {
      const mouseX = e.clientX / window.innerWidth;
      const mouseY = e.clientY / window.innerHeight;

      const moveX = (mouseX - 0.5) * 20;
      const moveY = (mouseY - 0.5) * 20;

      floatingDecorative.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
  }

  const sectionDecoratives = document.querySelectorAll(".section-decorative");
  const decorativeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform += " scale(1)";
        }
      });
    },
    { threshold: 0.3 }
  );

  sectionDecoratives.forEach((decorative) => {
    decorative.style.opacity = "0";
    decorative.style.transform += " scale(0.8)";
    decorative.style.transition = "all 1.2s cubic-bezier(0.4, 0, 0.2, 1)";
    decorativeObserver.observe(decorative);
  });

  const accentLines = document.querySelectorAll(".accent-line");
  window.addEventListener("scroll", () => {
    const scrollProgress =
      window.pageYOffset /
      (document.documentElement.scrollHeight - window.innerHeight);
    const brightness = 0.2 + scrollProgress * 0.4;

    accentLines.forEach((line) => {
      line.style.opacity = Math.min(brightness, 0.6);
    });
  });
}

// Initialize enhanced interactions
initDecorativeInteractions();

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

    const nextBtn = document.createElement("button");
    nextBtn.className = "scroll-btn scroll-btn--next";
    nextBtn.setAttribute("aria-label", "Cuộn phải");
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

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

    function updateDisabled() {
      prevBtn.disabled = scroller.scrollLeft <= 0;
      const maxScroll = scroller.scrollWidth - scroller.clientWidth - 1; // tolerance
      nextBtn.disabled = scroller.scrollLeft >= maxScroll;
    }
    updateDisabled();

    const smoothOptions = { behavior: "smooth", left: 0, top: 0 };
    function scrollByPage(dir) {
      const delta = pageWidth() * dir;
      const target = Math.max(
        0,
        Math.min(
          scroller.scrollLeft + delta,
          scroller.scrollWidth - scroller.clientWidth
        )
      );
      scroller.scrollTo({ left: target, behavior: "smooth" });
    }

    prevBtn.addEventListener("click", () => scrollByPage(-1));
    nextBtn.addEventListener("click", () => scrollByPage(1));
    scroller.addEventListener("scroll", updateDisabled, { passive: true });
    window.addEventListener("resize", updateDisabled);
  });
})();

// Ensure ScrollTrigger recalculates on resize
if (window.ScrollTrigger) {
  window.addEventListener("resize", function () {
    try {
      ScrollTrigger.refresh();
    } catch (e) {}
  });
}
