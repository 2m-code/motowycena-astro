(function () {
  const CONTENT_URLS = ['/api/admin/public-content', '/admin/data/content.json'];

  function getValue(data, key) {
    const item = data && data.fields && data.fields[key];
    if (!item || typeof item.value !== 'string' || item.value.length === 0) return null;
    return item.value;
  }

  function applyContent(data) {
    document.querySelectorAll('[data-admin-text]').forEach((el) => {
      const value = getValue(data, el.getAttribute('data-admin-text'));
      if (value !== null) el.textContent = value;
    });

    document.querySelectorAll('[data-admin-html]').forEach((el) => {
      const value = getValue(data, el.getAttribute('data-admin-html'));
      if (value !== null) el.innerHTML = value;
    });

    document.querySelectorAll('[data-admin-src]').forEach((el) => {
      const value = getValue(data, el.getAttribute('data-admin-src'));
      if (value !== null && 'src' in el) el.src = value;
    });

    document.querySelectorAll('[data-admin-href]').forEach((el) => {
      const value = getValue(data, el.getAttribute('data-admin-href'));
      if (value === null) return;
      const prefix = el.getAttribute('data-admin-href-prefix') || '';
      el.setAttribute('href', prefix + value);
    });

    document.querySelectorAll('[data-admin-alt]').forEach((el) => {
      const value = getValue(data, el.getAttribute('data-admin-alt'));
      if (value !== null) el.setAttribute('alt', value);
    });
  }

  async function loadContent() {
    for (const url of CONTENT_URLS) {
      try {
        const response = await fetch(url + '?v=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) continue;
        const data = await response.json();
        if (data) {
          applyContent(data);
          return;
        }
      } catch {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadContent);
  } else {
    loadContent();
  }

  document.addEventListener('astro:page-load', loadContent);
})();
