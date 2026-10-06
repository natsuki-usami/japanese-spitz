const HEADER = 'Debug-Viewer-Country';
const RULE_ID = 1;
const $ = (id) => document.getElementById(id);

const parseDomains = () =>
  $('domains').value.split('\n').map((s) => s.trim()).filter(Boolean);

async function apply() {
  const mode = document.querySelector('input[name="mode"]:checked')?.value ?? 'off';
  const other = $('other').value.trim().toUpperCase();
  const domains = parseDomains();
  await chrome.storage.local.set({ mode, other, domains: $('domains').value });

  const value = mode === 'JP' ? 'JP' : other;
  const enabled = mode !== 'off' && Boolean(value);
  const addRules = [];
  if (enabled && domains.length > 0) {
    addRules.push({
      id: RULE_ID,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{ header: HEADER, operation: 'set', value }],
      },
      condition: {
        requestDomains: domains,
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image', 'media', 'other'],
      },
    });
  }
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [RULE_ID], addRules });
  $('status').textContent = addRules.length
    ? `${HEADER}: ${value} → ${domains.join(', ')}`
    : mode !== 'off' ? '対象ドメインを入力してください' : 'OFF';
}

(async () => {
  const s = await chrome.storage.local.get({ mode: 'off', other: 'US', domains: '' });
  document.querySelector(`input[name="mode"][value="${s.mode}"]`).checked = true;
  $('other').value = s.other;
  $('domains').value = s.domains;
  await apply();
  document.querySelectorAll('input, textarea').forEach((el) => el.addEventListener('input', apply));
})();
