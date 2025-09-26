// Extracted script from index.html
// Header scroll effect
window.addEventListener('scroll', function () {
  const header = document.getElementById('header');
  const scrollTop = window.pageYOffset;
  if (scrollTop > 100) header.classList.add('scrolled'); else header.classList.remove('scrolled');
});

// Lenis smooth scrolling + anchor handling
let lenis;
function initLenis(){
  if(window.Lenis){
    lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      smoothTouch: false,
      easing: t => 1 - Math.pow(1 - t, 1.6)
    });
    function raf(time){ lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    // Anchor links offset
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href');
        if (href === '#' || href.length < 2) return;
        const target = document.querySelector(href);
        if(target){
          e.preventDefault();
          lenis.scrollTo(target, { offset: -100 });
        }
      });
    });
  }
}
initLenis();

// Contact form submission
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    if (!name || !phone) { alert('Vui lòng điền đầy đủ thông tin bắt buộc!'); return; }
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(phone)) { alert('Vui lòng nhập số điện thoại hợp lệ (10-11 số)!'); return; }
    const button = this.querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
    button.disabled = true;
    setTimeout(() => {
      alert('Cảm ơn bạn đã quan tâm đến dự án A&T Saigon Riverside!\nChúng tôi sẽ liên hệ lại trong thời gian sớm nhất.');
      this.reset();
      button.innerHTML = originalText;
      button.disabled = false;
    }, 2000);
  });
}

// Intersection Observer animations (unified via [data-animate])
const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -80px 0px' };
const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  });
}, observerOptions);
document.querySelectorAll('[data-animate]').forEach(el => io.observe(el));

// Active navigation link highlight based on scroll
const sections = [...document.querySelectorAll('section[id]')];
const navLinks = [...document.querySelectorAll('.nav-menu a[href^="#"]')];
function setActiveLink() {
  const scrollPos = window.scrollY + 140; // offset for fixed header
  let currentId = null;
  for (const sec of sections) {
    if (scrollPos >= sec.offsetTop && scrollPos < sec.offsetTop + sec.offsetHeight) {
      currentId = sec.id; break;
    }
  }
  navLinks.forEach(l => {
    if (!currentId) return l.classList.remove('active');
    const href = l.getAttribute('href').replace('#','');
    l.classList.toggle('active', href === currentId);
  });
}
window.addEventListener('scroll', setActiveLink, { passive: true });
setActiveLink();

// Inject skip link for a11y
if (!document.querySelector('.skip-link')) {
  const skip = document.createElement('a');
  skip.href = '#main-content';
  skip.className = 'skip-link';
  skip.textContent = 'Bỏ qua đến nội dung chính';
  document.body.prepend(skip);
}

// Gallery lightbox
function initGalleryLightbox() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', function () {
      const img = this.querySelector('img');
      const lightbox = document.createElement('div');
      lightbox.className = 'lightbox-overlay';
      lightbox.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;z-index:10000;cursor:pointer;opacity:0;transition:opacity .3s ease;';
      const lightboxImg = document.createElement('img');
      lightboxImg.src = img.src; lightboxImg.alt = img.alt; lightboxImg.style.cssText = 'max-width:90%;max-height:90%;border-radius:15px;box-shadow:0 25px 50px rgba(218,165,32,.3);transform:scale(.8);transition:transform .3s ease;';
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '<i class="fas fa-times"></i>';
      closeBtn.style.cssText = 'position:absolute;top:30px;right:30px;background:var(--gradient);border:none;color:#fff;width:50px;height:50px;border-radius:50%;font-size:1.2rem;cursor:pointer;transition:all .3s ease;';
      lightbox.appendChild(lightboxImg); lightbox.appendChild(closeBtn); document.body.appendChild(lightbox);
      requestAnimationFrame(() => { lightbox.style.opacity = '1'; lightboxImg.style.transform = 'scale(1)'; });
      function closeLightbox() {
        lightbox.style.opacity = '0'; lightboxImg.style.transform = 'scale(.8)';
        setTimeout(() => { if (document.body.contains(lightbox)) document.body.removeChild(lightbox); }, 300);
      }
      lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
      closeBtn.addEventListener('click', closeLightbox);
      const handleEsc = e => { if (e.key === 'Escape') { closeLightbox(); document.removeEventListener('keydown', handleEsc); } };
      document.addEventListener('keydown', handleEsc);
    });
  });
}
initGalleryLightbox();

// Mobile menu
function createMobileMenu() {
  if (window.innerWidth <= 768) {
    const navContainer = document.querySelector('.nav-container');
    const navMenu = document.querySelector('.nav-menu');
    if (!navContainer || !navMenu) return;
    let menuToggle = document.querySelector('.menu-toggle');
    if (!menuToggle) {
      menuToggle = document.createElement('button');
      menuToggle.className = 'menu-toggle';
      menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
      menuToggle.style.cssText = 'display:block;background:none;border:none;color:var(--gold);font-size:1.5rem;cursor:pointer;padding:10px;border-radius:5px;transition:all .3s ease;';
      navContainer.appendChild(menuToggle);
      menuToggle.addEventListener('click', () => {
        const isOpen = navMenu.style.display === 'flex';
        navMenu.style.display = isOpen ? 'none' : 'flex';
        if (!isOpen) {
          navMenu.style.position = 'absolute';
          navMenu.style.top = '100%';
          navMenu.style.left = '0';
          navMenu.style.right = '0';
          navMenu.style.background = 'rgba(255,255,255,0.98)';
          navMenu.style.flexDirection = 'column';
          navMenu.style.padding = '2rem';
          navMenu.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
          navMenu.style.backdropFilter = 'blur(20px)';
        }
        menuToggle.innerHTML = isOpen ? '<i class="fas fa-bars"></i>' : '<i class="fas fa-times"></i>';
      });
    }
  }
}
createMobileMenu();
window.addEventListener('resize', createMobileMenu);

// Parallax hero
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const parallax = document.querySelector('.hero');
  const speed = scrolled * 0.3;
  if (parallax && scrolled < window.innerHeight) parallax.style.backgroundPositionY = speed + 'px';
});

// GSAP scroll animations (progressive enhancement)
if(window.gsap){
  // Ensure ScrollTrigger registered (already on page via CDN)
  if(window.ScrollTrigger){
    // If Lenis exists, sync with ScrollTrigger
    if(lenis){
      lenis.on('scroll', () => { ScrollTrigger.update(); });
      ScrollTrigger.scrollerProxy(document.documentElement, {
        scrollTop(value){ return arguments.length ? window.scrollTo(0, value) : window.pageYOffset; },
        getBoundingClientRect(){ return { top:0, left:0, width: window.innerWidth, height: window.innerHeight }; }
      });
    }
  }
  // Generic reveal for section headers
  gsap.utils.toArray('.section-header').forEach(header => {
    gsap.from(header.children, {
      opacity:0, y:40, duration:0.8, ease:'power3.out', stagger:0.12,
      scrollTrigger: { trigger: header, start:'top 78%' }
    });
  });
  // Advantages cards
  gsap.from('.advantages-grid .advantage-card', {
    opacity:0, y:50, duration:0.7, ease:'power2.out', stagger:0.08,
    scrollTrigger: { trigger: '.advantages-grid', start:'top 80%' }
  });
  // Horizontal cards (apartments & amenities)
  gsap.utils.toArray('.horizontal-section .horizontal-card').forEach(card => {
    gsap.from(card, { opacity:0, y:60, duration:0.6, ease:'power2.out',
      scrollTrigger: { trigger: card, start:'top 85%' } });
  });
  // Gallery items
  gsap.from('.gallery-grid .gallery-item', {
    opacity:0, scale:.85, duration:.7, ease:'power2.out', stagger:.06,
    scrollTrigger: { trigger: '.gallery-grid', start:'top 80%' }
  });
  // Pricing cards
  gsap.from('.pricing-cards .pricing-card', {
    opacity:0, y:55, duration:.65, ease:'power3.out', stagger:.1,
    scrollTrigger: { trigger: '.pricing-cards', start:'top 78%' }
  });
  ScrollTrigger && ScrollTrigger.addEventListener('refresh', () => lenis && lenis.resize && lenis.resize());
  ScrollTrigger && ScrollTrigger.refresh();
}

function initDecorativeInteractions() {
  const floatingDecorative = document.querySelector('.floating-decoratives');
  if (floatingDecorative) {
    document.addEventListener('mousemove', (e) => {
      const mouseX = e.clientX / window.innerWidth;
      const mouseY = e.clientY / window.innerHeight;
      
      const moveX = (mouseX - 0.5) * 20;
      const moveY = (mouseY - 0.5) * 20;
      
      floatingDecorative.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
  }

  const sectionDecoratives = document.querySelectorAll('.section-decorative');
  const decorativeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform += ' scale(1)';
      }
    });
  }, { threshold: 0.3 });

  sectionDecoratives.forEach(decorative => {
    decorative.style.opacity = '0';
    decorative.style.transform += ' scale(0.8)';
    decorative.style.transition = 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
    decorativeObserver.observe(decorative);
  });

  const accentLines = document.querySelectorAll('.accent-line');
  window.addEventListener('scroll', () => {
    const scrollProgress = window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight);
    const brightness = 0.2 + (scrollProgress * 0.4);
    
    accentLines.forEach(line => {
      line.style.opacity = Math.min(brightness, 0.6);
    });
  });
}

// Initialize enhanced interactions
initDecorativeInteractions();

// Console branding
console.log('%cA&T Saigon Riverside - Premium Website', 'color: #DAA520; font-size: 20px; font-weight: bold;');
console.log('%cWebsite được thiết kế với công nghệ hiện đại nhất', 'color: #1e293b; font-size: 14px;');
