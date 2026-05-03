/**
 * Injectify – Popup script
 *
 * Queries the active tab URL, fetches matching enabled configs from
 * the background service worker, and renders them in the popup.
 */

'use strict';

(async function () {
  const urlEl = document.getElementById('current-url');
  const countEl = document.getElementById('active-count');
  const listEl = document.getElementById('rules-list');
  const openOptionsBtn = document.getElementById('open-options');
  const manageBtn = document.getElementById('manage-btn');

  // ── Open options page ────────────────────────────────────────────────────────

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  openOptionsBtn.addEventListener('click', openOptions);
  manageBtn.addEventListener('click', openOptions);

  // ── Get current tab URL ──────────────────────────────────────────────────────

  let currentUrl = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab?.url ?? '';
  } catch {
    currentUrl = '';
  }

  if (currentUrl) {
    urlEl.textContent = currentUrl;
    urlEl.title = currentUrl;
  } else {
    urlEl.textContent = 'N/A (restricted page)';
  }

  // ── Fetch active configs from background ─────────────────────────────────────

  let configs = [];
  if (currentUrl) {
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'GET_ACTIVE_CONFIGS',
        url: currentUrl,
      });
      configs = res?.configs ?? [];
    } catch {
      configs = [];
    }
  }

  // ── Render rule list ─────────────────────────────────────────────────────────

  countEl.textContent = configs.length;

  if (configs.length === 0) {
    listEl.innerHTML = '<li class="empty-state">No rules match this page</li>';
    return;
  }

  listEl.innerHTML = '';
  for (const cfg of configs) {
    const li = document.createElement('li');
    li.className = 'rule-item';
    li.innerHTML = `
      <span class="rule-dot" title="Active"></span>
      <span class="rule-name" title="${escHtml(cfg.name)}">${escHtml(cfg.name)}</span>
      <span class="rule-pattern" title="${escHtml(cfg.urlPattern)}">${escHtml(cfg.urlPattern)}</span>
    `;
    listEl.appendChild(li);
  }
})();

/** Minimal HTML escaping to prevent XSS when rendering user config names. */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
