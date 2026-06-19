if (!customElements.get('localization-form')) {
  const DOMAIN_BY_LOCALE = {
    cs: 'https://carvionauto.cz',
    de: 'https://carvionauto.de',
    en: 'https://carvionauto.com',
    fr: 'https://carvionauto.com/fr',
    it: 'https://carvionauto.com/it',
    es: 'https://carvionauto.com/es',
    sk: 'https://carvionauto.com/sk',
  };

  const PATH_LOCALE_PREFIXES = ['fr', 'it', 'es', 'sk'];

  class LocalizationForm extends HTMLElement {
    constructor() {
      super();
      this.elements = {
        input: this.querySelector('input[name="locale_code"], input[name="language_code"], input[name="country_code"]'),
        button: this.querySelector('button'),
        panel: this.querySelector('.disclosure__list-wrapper'),
      };
      this.addEventListener('keyup', this.onContainerKeyUp.bind(this));
      this.addEventListener('focusout', this.closeSelector.bind(this));

      if (this.elements.button) {
        this.elements.button.addEventListener('click', this.openSelector.bind(this));
      }

      this.querySelectorAll('a[data-value]').forEach((item) => {
        item.addEventListener('mousedown', (event) => {
          event.preventDefault();
          this.onItemClick(event);
        });
      });
    }

    hidePanel() {
      if (!this.elements.button || !this.elements.panel) return;
      this.elements.button.setAttribute('aria-expanded', 'false');
      this.elements.panel.setAttribute('hidden', true);
    }

    onContainerKeyUp(event) {
      if (event.code.toUpperCase() !== 'ESCAPE') return;

      this.hidePanel();
      this.elements.button?.focus();
    }

    getCurrentPath() {
      const url = new URL(window.location.href);
      ['country', 'locale'].forEach((key) => url.searchParams.delete(key));
      const search = url.searchParams.toString();
      return url.pathname + (search ? `?${search}` : '');
    }

    getPathForTargetDomain(currentPath, targetDomain) {
      const targetUrl = new URL(targetDomain);
      const targetHost = targetUrl.hostname;
      const currentHost = window.location.hostname;

      if (targetHost === currentHost) {
        return currentPath;
      }

      const pathParts = currentPath.split('?');
      const pathname = pathParts[0] || '/';
      const search = pathParts[1] ? `?${pathParts[1]}` : '';
      const segments = pathname.split('/').filter(Boolean);
      const firstSegment = segments[0];

      if (PATH_LOCALE_PREFIXES.includes(firstSegment)) {
        const stripped = '/' + segments.slice(1).join('/');
        return (stripped === '/' ? '' : stripped) + search;
      }

      return currentPath;
    }

    onItemClick(event) {
      event.preventDefault();
      const selectedLocale = event.currentTarget.dataset.value;
      const targetDomain = DOMAIN_BY_LOCALE[selectedLocale];
      const currentPath = this.getCurrentPath();

      if (targetDomain) {
        const targetHost = new URL(targetDomain).hostname;

        if (window.location.hostname !== targetHost) {
          const cleanDomain = targetDomain.replace(/\/$/, '');
          const cleanedPath = this.getPathForTargetDomain(currentPath, targetDomain);
          const nextPath = cleanedPath.startsWith('/') ? cleanedPath : `/${cleanedPath}`;
          window.location.href = `${cleanDomain}${nextPath}`;
          return;
        }
      }

      const form = this.querySelector('form');
      if (!form || !this.elements.input) return;

      this.elements.input.value = selectedLocale;
      this.updateReturnTo(form);
      form.submit();
    }

    updateReturnTo(form) {
      const returnToInput = form.querySelector('input[name="return_to"]');
      if (!returnToInput) return;
      returnToInput.value = this.getCurrentPath();
    }

    openSelector() {
      if (!this.elements.button || !this.elements.panel) return;
      this.elements.button.focus();
      this.elements.panel.toggleAttribute('hidden');
      this.elements.button.setAttribute(
        'aria-expanded',
        (this.elements.button.getAttribute('aria-expanded') === 'false').toString()
      );
    }

    closeSelector(event) {
      if (!this.contains(event.target) || (event.relatedTarget && !this.contains(event.relatedTarget))) {
        this.hidePanel();
      }
    }
  }

  customElements.define('localization-form', LocalizationForm);
}
