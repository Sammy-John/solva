const header = document.querySelector('[data-header]');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelectorAll('.site-nav a');
const backToTop = document.querySelector('.back-to-top');

if (navToggle && header) {
  navToggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      header.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const updateBackToTop = () => {
  if (!backToTop) return;
  backToTop.classList.toggle('is-visible', window.scrollY > 500);
};

updateBackToTop();
window.addEventListener('scroll', updateBackToTop, { passive: true });
