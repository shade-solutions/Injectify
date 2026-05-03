/**
 * Injectify - Background Service Worker
 *
 * Handles config persistence (chrome.storage.local) and responds
 * to messages from the popup, options page, and content script.
 */

'use strict';

// ─── Default sample config shown on first install ─────────────────────────────

const DEFAULT_CONFIGS = [
  {
    id: generateId(),
    name: 'Example – Log page title',
    urlPattern: 'example.com',
    enabled: false,
    jsCode: 'console.log("[Injectify] Page title:", document.title);',
    cssCode: '',
    cdnUrls: [],
  },
];

// ─── Install / Update hook ─────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    const { configs } = await chrome.storage.local.get('configs');
    if (!configs) {
      await chrome.storage.local.set({ configs: DEFAULT_CONFIGS });
    }
  }
});

// ─── Message router ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch((err) => {
    console.error('[Injectify BG] Error handling message:', err);
    sendResponse({ error: err.message });
  });
  return true; // keep channel open for async response
});

async function handleMessage(message) {
  switch (message.type) {
    case 'GET_CONFIGS': {
      const { configs } = await chrome.storage.local.get('configs');
      return { configs: configs || [] };
    }

    case 'SAVE_CONFIGS': {
      validateConfigs(message.configs);
      await chrome.storage.local.set({ configs: message.configs });
      return { success: true };
    }

    case 'GET_ACTIVE_CONFIGS': {
      const { configs } = await chrome.storage.local.get('configs');
      const active = (configs || []).filter(
        (c) => c.enabled && matchesUrl(c.urlPattern, message.url)
      );
      return { configs: active };
    }

    default:
      return { error: `Unknown message type: ${message.type}` };
  }
}

// ─── URL Pattern Matching ──────────────────────────────────────────────────────

/**
 * Returns true when `url` matches `pattern`.
 *
 * Supported pattern syntax:
 *  - `*`                 → matches every URL
 *  - `*.example.com`     → matches example.com and every subdomain
 *  - `example.com`       → exact hostname match
 *  - `https://host/path` → prefix / glob with `*` wildcards
 *  - `/regex/flags`      → JavaScript RegExp literal syntax
 *
 * @param {string} pattern
 * @param {string} url
 * @returns {boolean}
 */
function matchesUrl(pattern, url) {
  if (!pattern || !url) return false;

  // Universal wildcard
  if (pattern === '*' || pattern === '<all_urls>') return true;

  // RegExp literal: /pattern/flags
  const reMatch = pattern.match(/^\/(.+)\/([gimsuy]*)$/);
  if (reMatch) {
    try {
      return new RegExp(reMatch[1], reMatch[2]).test(url);
    } catch {
      return false;
    }
  }

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return url.includes(pattern);
  }

  // Subdomain wildcard: *.example.com
  if (pattern.startsWith('*.')) {
    const domain = pattern.slice(2);
    return hostname === domain || hostname.endsWith('.' + domain);
  }

  // Glob / Chrome match-pattern style (contains * or explicit scheme)
  if (pattern.includes('*') || pattern.includes('://')) {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    try {
      return new RegExp('^' + escaped + '$').test(url);
    } catch {
      return false;
    }
  }

  // Plain hostname match (also accepts "example.com" to cover "www.example.com")
  return hostname === pattern || hostname.endsWith('.' + pattern);
}

// ─── Input validation ──────────────────────────────────────────────────────────

function validateConfigs(configs) {
  if (!Array.isArray(configs)) throw new Error('configs must be an array');
  for (const c of configs) {
    if (typeof c.id !== 'string' || !c.id) throw new Error('Each config must have a string id');
    if (typeof c.name !== 'string') throw new Error('Each config must have a string name');
    if (typeof c.urlPattern !== 'string') throw new Error('Each config must have a string urlPattern');
    if (c.cdnUrls && !Array.isArray(c.cdnUrls)) throw new Error('cdnUrls must be an array');
    // Validate each CDN URL is a string starting with https://
    if (c.cdnUrls) {
      for (const u of c.cdnUrls) {
        if (typeof u !== 'string') throw new Error('CDN URLs must be strings');
        if (u && !u.startsWith('https://') && !u.startsWith('http://')) {
          throw new Error(`CDN URL must start with http(s)://: ${u}`);
        }
      }
    }
  }
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function generateId() {
  return 'cfg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
