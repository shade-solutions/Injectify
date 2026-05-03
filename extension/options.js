/**
 * Injectify – Options page script
 *
 * Handles the full rules dashboard:
 *  - List, add, edit, delete rules
 *  - Enable / disable toggle per rule
 *  - Import / Export JSON
 */

'use strict';

// ─── State ─────────────────────────────────────────────────────────────────────

let configs = [];         // Array of Config objects loaded from storage
let editingId = null;     // ID of the config currently being edited (null = new)

// ─── DOM refs ──────────────────────────────────────────────────────────────────

const rulesContainer  = document.getElementById('rules-container');
const addRuleBtn      = document.getElementById('add-rule-btn');
const cancelBtn       = document.getElementById('cancel-btn');
const deleteBtn       = document.getElementById('delete-btn');
const ruleForm        = document.getElementById('rule-form');
const formTitle       = document.getElementById('form-title');
const addCdnBtn       = document.getElementById('add-cdn-btn');
const cdnList         = document.getElementById('cdn-list');
const exportBtn       = document.getElementById('export-btn');
const importInput     = document.getElementById('import-input');
const importStatus    = document.getElementById('import-status');
const toastEl         = document.getElementById('toast');

// Form fields
const fieldId      = document.getElementById('field-id');
const fieldName    = document.getElementById('field-name');
const fieldPattern = document.getElementById('field-pattern');
const fieldEnabled = document.getElementById('field-enabled');
const fieldJs      = document.getElementById('field-js');
const fieldCss     = document.getElementById('field-css');

// ─── Initialisation ────────────────────────────────────────────────────────────

(async function init() {
  await loadConfigs();
  renderRules();
  bindNavigation();
})();

// ─── Navigation ────────────────────────────────────────────────────────────────

function bindNavigation() {
  document.querySelectorAll('.nav-link[data-view]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showView(link.dataset.view);
      // Update active state
      document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const target = document.getElementById('view-' + name);
  if (target) target.classList.add('active');
}

// ─── Storage ───────────────────────────────────────────────────────────────────

async function loadConfigs() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_CONFIGS' });
    configs = res?.configs ?? [];
  } catch {
    configs = [];
  }
}

async function saveConfigs() {
  try {
    await chrome.runtime.sendMessage({ type: 'SAVE_CONFIGS', configs });
  } catch (err) {
    showToast('Error saving: ' + err.message);
  }
}

// ─── Rules list ────────────────────────────────────────────────────────────────

function renderRules() {
  if (configs.length === 0) {
    rulesContainer.innerHTML = `
      <div class="empty-rules">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none"
             stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
        <p>No rules yet. Click <strong>Add rule</strong> to get started.</p>
      </div>`;
    return;
  }

  rulesContainer.innerHTML = '';
  configs.forEach((cfg) => {
    const card = document.createElement('div');
    card.className = 'rule-card' + (cfg.enabled ? '' : ' disabled');
    card.dataset.id = cfg.id;

    const hasTags = cfg.jsCode?.trim() || cfg.cssCode?.trim() || cfg.cdnUrls?.length;

    card.innerHTML = `
      <span class="rule-toggle">
        <label class="toggle-label" title="${cfg.enabled ? 'Enabled' : 'Disabled'}">
          <input type="checkbox" class="toggle-input" ${cfg.enabled ? 'checked' : ''} aria-label="Enable rule" />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </label>
      </span>
      <div class="rule-info">
        <div class="rule-title">${escHtml(cfg.name)}</div>
        <div class="rule-meta">
          <code>${escHtml(cfg.urlPattern)}</code>
          ${hasTags ? renderTags(cfg) : ''}
        </div>
      </div>
      <div class="rule-actions">
        <button class="btn btn-ghost edit-btn">Edit</button>
      </div>
    `;

    // Toggle enable / disable
    card.querySelector('.toggle-input').addEventListener('change', async (e) => {
      cfg.enabled = e.target.checked;
      card.classList.toggle('disabled', !cfg.enabled);
      await saveConfigs();
      showToast(cfg.enabled ? `"${cfg.name}" enabled` : `"${cfg.name}" disabled`);
    });

    // Edit
    card.querySelector('.edit-btn').addEventListener('click', () => openEditForm(cfg.id));

    rulesContainer.appendChild(card);
  });
}

function renderTags(cfg) {
  const tags = [];
  if (cfg.jsCode?.trim())        tags.push('<span class="tag tag-js">JS</span>');
  if (cfg.cssCode?.trim())       tags.push('<span class="tag tag-css">CSS</span>');
  if (cfg.cdnUrls?.length)       tags.push(`<span class="tag tag-cdn">CDN ×${cfg.cdnUrls.length}</span>`);
  return tags.join('');
}

// ─── Add / Edit form ───────────────────────────────────────────────────────────

addRuleBtn.addEventListener('click', () => openEditForm(null));
cancelBtn.addEventListener('click', () => showView('rules'));

deleteBtn.addEventListener('click', async () => {
  if (!editingId) return;
  if (!confirm('Delete this rule? This cannot be undone.')) return;
  configs = configs.filter((c) => c.id !== editingId);
  await saveConfigs();
  renderRules();
  showView('rules');
  showToast('Rule deleted');
});

ruleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const cdnUrls = collectCdnUrls();
  const newCfg = {
    id:         fieldId.value || generateId(),
    name:       fieldName.value.trim(),
    urlPattern: fieldPattern.value.trim(),
    enabled:    fieldEnabled.checked,
    jsCode:     fieldJs.value,
    cssCode:    fieldCss.value,
    cdnUrls,
  };

  if (editingId) {
    const idx = configs.findIndex((c) => c.id === editingId);
    if (idx !== -1) configs[idx] = newCfg;
  } else {
    configs.push(newCfg);
  }

  await saveConfigs();
  renderRules();
  showView('rules');
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach((l) => {
    l.classList.toggle('active', l.dataset.view === 'rules');
  });
  showToast(editingId ? 'Rule updated' : 'Rule added');
});

function openEditForm(id) {
  editingId = id;

  if (id) {
    const cfg = configs.find((c) => c.id === id);
    if (!cfg) return;
    formTitle.textContent = 'Edit rule';
    fieldId.value      = cfg.id;
    fieldName.value    = cfg.name;
    fieldPattern.value = cfg.urlPattern;
    fieldEnabled.checked = cfg.enabled;
    fieldJs.value      = cfg.jsCode ?? '';
    fieldCss.value     = cfg.cssCode ?? '';
    populateCdnList(cfg.cdnUrls ?? []);
    deleteBtn.hidden = false;
  } else {
    formTitle.textContent = 'Add rule';
    ruleForm.reset();
    fieldId.value = '';
    fieldEnabled.checked = true;
    populateCdnList([]);
    deleteBtn.hidden = true;
  }

  // Clear validation state
  [fieldName, fieldPattern].forEach((el) => el.classList.remove('invalid'));

  showView('edit');
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
}

function validateForm() {
  let valid = true;
  if (!fieldName.value.trim()) {
    fieldName.classList.add('invalid');
    valid = false;
  } else {
    fieldName.classList.remove('invalid');
  }
  if (!fieldPattern.value.trim()) {
    fieldPattern.classList.add('invalid');
    valid = false;
  } else {
    fieldPattern.classList.remove('invalid');
  }
  return valid;
}

// ─── CDN URL rows ──────────────────────────────────────────────────────────────

addCdnBtn.addEventListener('click', () => addCdnRow(''));

function populateCdnList(urls) {
  cdnList.innerHTML = '';
  urls.forEach((url) => addCdnRow(url));
}

function addCdnRow(value = '') {
  const row = document.createElement('div');
  row.className = 'cdn-row';
  row.innerHTML = `
    <input type="url" placeholder="https://cdn.example.com/lib.min.js" value="${escHtml(value)}" />
    <button type="button" class="cdn-remove" title="Remove">×</button>
  `;
  row.querySelector('.cdn-remove').addEventListener('click', () => row.remove());
  cdnList.appendChild(row);
  row.querySelector('input').focus();
}

function collectCdnUrls() {
  return Array.from(cdnList.querySelectorAll('input'))
    .map((el) => el.value.trim())
    .filter(Boolean);
}

// ─── Import / Export ───────────────────────────────────────────────────────────

exportBtn.addEventListener('click', () => {
  const json = JSON.stringify(configs, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'injectify-rules.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Rules exported');
});

importInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  importStatus.textContent = '';
  importStatus.className = 'import-status';

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) throw new Error('File must contain a JSON array of rules.');

    // Basic validation of each item
    for (const item of parsed) {
      if (typeof item.id !== 'string')          throw new Error('Each rule must have a string "id".');
      if (typeof item.name !== 'string')         throw new Error('Each rule must have a string "name".');
      if (typeof item.urlPattern !== 'string')   throw new Error('Each rule must have a string "urlPattern".');
    }

    if (!confirm(`Import ${parsed.length} rule(s)? This will replace all existing rules.`)) {
      importInput.value = '';
      return;
    }

    configs = parsed;
    await saveConfigs();
    renderRules();

    importStatus.textContent = `✓ Imported ${parsed.length} rule(s) successfully.`;
    importStatus.className = 'import-status success';
    showToast('Rules imported');
  } catch (err) {
    importStatus.textContent = '✗ ' + err.message;
    importStatus.className = 'import-status error';
  }

  importInput.value = ''; // Reset so the same file can be re-imported
});

// ─── Toast ─────────────────────────────────────────────────────────────────────

let toastTimer;

function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function generateId() {
  return 'cfg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
