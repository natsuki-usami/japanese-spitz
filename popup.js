import { buildRules, DEFAULT_SETTINGS, getProMode, parseDomains, RULE_ID } from './header-rules.mjs';

const $ = (id) => document.getElementById(id);
let saveQueue = Promise.resolve();
let revision = 0;

function setStatus(message, error = false) {
  $('status').textContent = message;
  $('status').dataset.error = String(error);
}

function showError(error) {
  setStatus(`設定を適用できませんでした。\n${error.message}\n最後に適用できた設定が有効です。`, true);
}

function readSettings() {
  return {
    mode: document.querySelector('input[name="mode"]:checked')?.value ?? 'off',
    other: $('other').value.trim().toUpperCase(),
    domains: $('domains').value,
    proMode: document.querySelector('input[name="pro-mode"]:checked')?.value ?? 'off',
  };
}

function saveSettings() {
  const settings = readSettings();
  const currentRevision = ++revision;
  setStatus('設定を保存中…');
  // Apply changes in input order so a slower save cannot overwrite newer settings.
  const operation = saveQueue.then(async () => {
    const addRules = buildRules(settings);
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [RULE_ID], addRules });
    await chrome.storage.local.set(settings);
    if (currentRevision === revision) {
      const rule = addRules[0];
      if (rule) {
        setStatus(`適用中：\n${rule.action.requestHeaders.map(({ header, value }) => `${header}: ${value}`).join('\n')}\n対象：${rule.condition.requestDomains.join(', ')}\nページを再読み込みすると反映されます。`);
      } else if (settings.proMode !== 'off' || settings.mode !== 'off') {
        setStatus(settings.domains.trim() ? '有効なヘッダーの値を入力してください。' : '対象サイトを設定してください。まだヘッダーは付与されません。');
      } else {
        setStatus('すべてOFF：ヘッダーは付与しません。');
      }
    }
    return addRules;
  });
  saveQueue = operation.catch(() => {});
  return operation;
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:\/\//i.test(tab.url)) {
    throw new Error('対象のWebページを開いてから操作してください。');
  }
  return tab;
}

async function useCurrentPage() {
  const tab = await getCurrentTab();
  const domain = parseDomains(tab.url)[0];
  const domains = parseDomains($('domains').value);
  if (!domains.includes(domain)) {
    $('domains').value = [...domains, domain].join('\n');
  }
  await saveSettings();
}

async function reloadCurrentPage() {
  const tab = await getCurrentTab();
  const rules = await saveSettings();
  if (!rules.length && (readSettings().proMode !== 'off' || readSettings().mode !== 'off')) {
    throw new Error('対象サイトとヘッダーの値を設定してください。');
  }
  const domain = parseDomains(tab.url)[0];
  if (rules.length && !rules[0].condition.requestDomains.some((target) => domain === target || domain.endsWith(`.${target}`))) {
    throw new Error('今のページが対象サイトに含まれていません。「今開いているページを対象にする」を押してください。');
  }
  await chrome.tabs.reload(tab.id, { bypassCache: true });
  window.close();
}

async function initialize() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const mode = ['off', 'JP', 'other'].includes(settings.mode) ? settings.mode : 'off';
  document.querySelector(`input[name="mode"][value="${mode}"]`).checked = true;
  $('other').value = settings.other;
  $('domains').value = settings.domains;
  document.querySelector(`input[name="pro-mode"][value="${getProMode(settings)}"]`).checked = true;
  document.querySelectorAll('input, textarea').forEach((el) => {
    el.addEventListener('input', () => { saveSettings().catch(showError); });
  });
  $('use-current-page').addEventListener('click', () => { useCurrentPage().catch(showError); });
  $('reload').addEventListener('click', () => { reloadCurrentPage().catch(showError); });
  document.querySelectorAll('input, textarea, button').forEach((el) => { el.disabled = false; });
  // Keep the original country settings and rule ID when upgrading from 1.0.0.
  await saveSettings();
}

initialize().catch(showError);
