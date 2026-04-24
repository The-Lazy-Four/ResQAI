// ============================================
// ResQAI Crisis Portal - Navigation
// ============================================

const PAGES = {
  'command-center': 'Command Center',
  'live-intel': 'Live Intel',
  'deployment': 'Deployment',
  'signal-hub': 'Signal Hub',
  'archive': 'Archive',
};

/**
 * Initialize sidebar navigation
 */
export function initNavigation() {
  const navLinks = document.querySelectorAll('nav a[data-page]');

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = link.getAttribute('data-page');
      navigateTo(pageId);
    });
  });

  // Show default page
  const defaultPage = 'command-center';
  navigateTo(defaultPage);
}

/**
 * Switch to a given page section
 */
export function navigateTo(pageId) {
  // Hide all pages
  document.querySelectorAll('[data-section]').forEach((section) => {
    section.classList.add('hidden');
  });

  // Show the target page
  const target = document.querySelector(`[data-section="${pageId}"]`);
  if (target) {
    target.classList.remove('hidden');
  }

  // Update nav active state
  document.querySelectorAll('nav a[data-page]').forEach((link) => {
    const isActive = link.getAttribute('data-page') === pageId;
    if (isActive) {
      link.classList.add('bg-gradient-to-r', 'from-rose-500/20', 'to-transparent', 'text-rose-400', 'border-l-4', 'border-rose-500');
      link.classList.remove('text-slate-500');
    } else {
      link.classList.remove('bg-gradient-to-r', 'from-rose-500/20', 'to-transparent', 'text-rose-400', 'border-l-4', 'border-rose-500');
      link.classList.add('text-slate-500');
    }
  });
}
