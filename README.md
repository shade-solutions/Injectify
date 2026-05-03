# Injectify

<div align="center">

**Inject custom JavaScript, CSS, and CDN resources into any website — with rule-based control.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest Version](https://img.shields.io/badge/Manifest-v3-green.svg)](extension/manifest.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![GitHub Stars](https://img.shields.io/github/stars/shade-solutions/Injectify?style=social)](https://github.com/shade-solutions/Injectify)

[🌐 Landing Page](https://shade-solutions.github.io/Injectify/) &nbsp;·&nbsp;
[🐛 Report a Bug](https://github.com/shade-solutions/Injectify/issues/new?template=bug_report.md) &nbsp;·&nbsp;
[💡 Request a Feature](https://github.com/shade-solutions/Injectify/issues/new?template=feature_request.md)

</div>

---

## 📖 What is Injectify?

**Injectify** is a free, open-source Chrome Extension (Manifest V3) that lets you run your own
JavaScript, apply custom CSS, and load CDN libraries on any website you visit — all driven by a
clean, rule-based configuration dashboard.

Whether you're a developer automating repetitive tasks, a designer tweaking third-party sites, or a
power user who wants full control of their browsing experience, Injectify has you covered.

---

## ✨ Features

| Feature | Description |
|---|---|
| ⚡ **JS Injection** | Execute custom scripts on matching pages |
| 🎨 **CSS Injection** | Apply stylesheets per domain or globally |
| 📦 **CDN Loading** | Load external libraries (jQuery, lodash, …) before your code runs |
| 🎯 **Flexible URL Patterns** | Exact host · wildcard (`*.example.com`) · glob · RegExp |
| 🔀 **Multiple Rules** | Unlimited rules, toggle each independently |
| 💾 **Import / Export** | Backup & share rules as JSON |
| 🔒 **Secure by Design** | No `eval()`, no remote code execution |
| 🛠️ **Manifest V3** | Built on Chrome's latest, most secure extension platform |

---

## 🚀 Quick Start

### 1. Clone or download

```bash
git clone https://github.com/shade-solutions/Injectify.git
# — or —
# Download ZIP from GitHub and extract it.
```

### 2. Load the extension in Chrome

1. Open **Chrome** and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the **`/extension`** folder inside the cloned repo

Injectify will appear in your extensions list. Pin it to the toolbar for easy access.

---

## 🗂️ Repository Structure

```
Injectify/
├── extension/               # Chrome extension source (load this folder)
│   ├── manifest.json        # Manifest V3 config
│   ├── background.js        # Service worker — storage & message routing
│   ├── content.js           # Content script — injects JS/CSS/CDN
│   ├── popup.html/js/css    # Toolbar popup (active rules at a glance)
│   ├── options.html/js/css  # Full options dashboard
│   └── icons/               # Extension icons (16, 48, 128 px)
├── docs/                    # Static landing page → GitHub Pages
├── assets/                  # Source assets (SVG icon, …)
├── scripts/                 # Dev utilities (icon generator, …)
├── .github/workflows/       # GitHub Actions (Pages deployment)
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── README.md
```

---

## �� URL Pattern Reference

| Pattern | Matches |
|---|---|
| `*` | Every URL |
| `example.com` | Exact hostname (and sub-paths) |
| `*.example.com` | All subdomains of example.com |
| `https://example.com/*` | Glob / Chrome match-pattern style |
| `/github\.com\/user/i` | Full JavaScript RegExp with optional flags |

---

## 🧩 Configuration Fields

Each rule has the following fields:

| Field | Required | Description |
|---|---|---|
| **Name** | ✓ | Human-readable label |
| **URL Pattern** | ✓ | Pattern to match the page URL |
| **Enabled** | — | Toggle to enable / disable without deleting |
| **JavaScript** | — | Custom JS code to inject |
| **CSS** | — | Custom CSS to inject |
| **CDN URLs** | — | Array of external script URLs to load first |

---

## 🗺️ Roadmap

- [ ] Chrome Web Store listing
- [ ] Firefox / Edge support
- [ ] Per-rule keyboard shortcut toggle
- [ ] Rule groups / folders
- [ ] Sync via `chrome.storage.sync`
- [ ] Dark mode for options page
- [ ] Regex pattern tester in the form

Have an idea? [Open a feature request →](https://github.com/shade-solutions/Injectify/issues/new)

---

## 🤝 Contributing

Contributions are very welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for setup
instructions, PR guidelines, and code style notes.

```bash
# After cloning, install dev dependencies and generate icons
npm install
node scripts/generate-icons.js
```

---

## 🔐 Security

> **⚠️ Warning:** Injectify executes arbitrary JavaScript and CSS in the context of every page
> that matches a rule. Only install rules from sources you trust completely.

- Injectify does **not** use `eval()` — scripts are injected via `<script>` elements
- Injectify does **not** send your code anywhere — everything is stored locally in `chrome.storage.local`
- CDN URLs must begin with `http(s)://`
- User input is validated before saving

Please report security vulnerabilities privately via
[GitHub Security Advisories](https://github.com/shade-solutions/Injectify/security/advisories/new).

---

## 📜 License

[MIT](LICENSE) © 2026 [Shade Solutions](https://github.com/shade-solutions)
