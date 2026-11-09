export const RULE_ID = 1;
export const DEFAULT_SETTINGS = { mode: 'off', other: 'US', domains: '', proEnabled: false };

export function parseDomains(input) {
  return [...new Set(input.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    try {
      const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(line) ? line : `https://${line}`);
      const domain = url.hostname.toLowerCase().replace(/\.$/, '');
      const validDomain = domain.length <= 253 && domain.split('.').every((label) =>
        /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label));
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
          /\s/.test(line) || !validDomain) {
        throw new Error('Invalid domain');
      }
      return domain;
    } catch {
      throw new Error(`対象URL・ドメインを確認してください：${line}`);
    }
  }))];
}

export function buildRules(settings) {
  const requestHeaders = [];
  const country = settings.mode === 'JP' ? 'JP' : settings.mode === 'other' ? settings.other.trim().toUpperCase() : '';
  if (country) {
    if (!/^[\x20-\x7e]+$/.test(country)) {
      throw new Error('国コードに使用できない文字が含まれています。');
    }
    requestHeaders.push({ header: 'Debug-Viewer-Country', operation: 'set', value: country });
  }
  if (settings.proEnabled) {
    requestHeaders.push({ header: 'Nikkei-Flags', operation: 'set', value: 'enableProRenewalProPage=true' });
  }
  if (!requestHeaders.length) return [];

  const domains = parseDomains(settings.domains);
  if (!domains.length) return [];

  return [{
    id: RULE_ID,
    priority: 1,
    action: { type: 'modifyHeaders', requestHeaders },
    condition: {
      requestDomains: domains,
      resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image', 'media', 'other'],
    },
  }];
}
