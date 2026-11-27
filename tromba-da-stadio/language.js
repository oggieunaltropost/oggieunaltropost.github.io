(() => {
  const query = new URLSearchParams(window.location.search);
  const requested = query.get('lang');
  const browser = (navigator.language || '').toLowerCase().split(/[-_]/)[0];
  const language = requested === 'it' || requested === 'en'
    ? requested
    : browser === 'it' ? 'it' : 'en';

  document.documentElement.lang = language;
  document.addEventListener('DOMContentLoaded', () => {
    document.title = document.documentElement.dataset[language + 'Title'];
    for (const link of document.querySelectorAll('[data-language]')) {
      if (link.dataset.language === language) link.setAttribute('aria-current', 'true');
    }
  });
})();
