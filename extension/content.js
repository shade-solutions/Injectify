/**
 * Injectify - Content Script
 *
 * Runs on every page (document_idle). Fetches matching enabled configs
 * from the background service worker and injects CSS, CDN scripts, and
 * custom JS into the current page.
 *
 * SECURITY NOTE:
 *   JavaScript injection is inherently powerful. Injectify only injects
 *   code that the *user* has explicitly configured. Never import configs
 *   from untrusted sources.
 */

'use strict';

(async function injectify() {
  const currentUrl = window.location.href;

  // Fetch active (enabled + URL-matching) configs from background
  let configs = [];
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_ACTIVE_CONFIGS',
      url: currentUrl,
    });
    configs = response?.configs ?? [];
  } catch {
    // Extension context invalidated (e.g. after reload) — bail silently
    return;
  }

  if (configs.length === 0) return;

  for (const config of configs) {
    try {
      await applyConfig(config);
    } catch (err) {
      console.error(`[Injectify] Error applying config "${config.name}":`, err);
    }
  }

  // ─── Per-config injection ────────────────────────────────────────────────────

  async function applyConfig(config) {
    // 1. Inject CSS first so it's available before JS runs
    if (config.cssCode?.trim()) {
      injectCSS(config.cssCode, config.id);
    }

    // 2. Load CDN scripts sequentially so later CDN entries can depend on earlier ones
    if (Array.isArray(config.cdnUrls)) {
      for (const url of config.cdnUrls) {
        if (url?.trim()) {
          await loadExternalScript(url.trim(), config.id);
        }
      }
    }

    // 3. Inject user JS after CDN scripts have loaded
    if (config.jsCode?.trim()) {
      injectJS(config.jsCode, config.id);
    }
  }

  // ─── Injection helpers ───────────────────────────────────────────────────────

  /**
   * Injects a <style> element containing `css` into the document head.
   * Uses textContent (not innerHTML) to avoid HTML-injection risk.
   */
  function injectCSS(css, configId) {
    const style = document.createElement('style');
    style.setAttribute('data-injectify', configId);
    style.textContent = css;
    (document.head ?? document.documentElement).appendChild(style);
  }

  /**
   * Injects a <script> element containing `js` into the document head
   * and removes it immediately after parsing so the DOM stays clean.
   *
   * NOTE: The script executes synchronously in the page context before
   * `remove()` is called, which is intentional.
   */
  function injectJS(js, configId) {
    const script = document.createElement('script');
    script.setAttribute('data-injectify', configId);
    script.textContent = js;
    (document.head ?? document.documentElement).appendChild(script);
    script.remove();
  }

  /**
   * Creates a <script src="url"> and waits for it to load (or fail).
   * If the script is already present, resolves immediately.
   */
  function loadExternalScript(url, configId) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${CSS.escape ? url : url}"]`)) {
        return resolve();
      }
      const script = document.createElement('script');
      script.src = url;
      script.setAttribute('data-injectify', configId);
      script.onload = resolve;
      script.onerror = () => {
        console.warn(`[Injectify] Failed to load CDN script: ${url}`);
        resolve(); // Non-fatal: continue with remaining injections
      };
      (document.head ?? document.documentElement).appendChild(script);
    });
  }
})();
