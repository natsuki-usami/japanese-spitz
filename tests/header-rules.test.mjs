import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRules, DEFAULT_SETTINGS, parseDomains, RULE_ID } from '../header-rules.mjs';

const settings = (overrides) => ({ ...DEFAULT_SETTINGS, domains: 'example.com', ...overrides });

test('Pro alone adds the exact request header to page navigations and API requests', () => {
  const [rule] = buildRules(settings({ proEnabled: true }));
  assert.equal(rule.id, RULE_ID);
  assert.equal(rule.action.type, 'modifyHeaders');
  assert.deepEqual(rule.action.requestHeaders, [
    { header: 'Nikkei-Flags', operation: 'set', value: 'enableProRenewalProPage=true' },
  ]);
  assert.deepEqual(rule.condition.requestDomains, ['example.com']);
  assert.ok(rule.condition.resourceTypes.includes('main_frame'));
  assert.ok(rule.condition.resourceTypes.includes('xmlhttprequest'));
});

test('existing JP and custom country settings still work without Pro', () => {
  for (const [mode, other, country] of [['JP', 'US', 'JP'], ['other', ' kr ', 'KR']]) {
    const [rule] = buildRules(settings({ mode, other }));
    assert.deepEqual(rule.action.requestHeaders, [
      { header: 'Debug-Viewer-Country', operation: 'set', value: country },
    ]);
  }
});

test('country and Pro can be enabled together, or disabled independently', () => {
  const enabled = settings({ mode: 'JP', proEnabled: true });
  assert.equal(buildRules(enabled)[0].action.requestHeaders.length, 2);
  assert.deepEqual(buildRules({ ...enabled, proEnabled: false })[0].action.requestHeaders.map((h) => h.header), ['Debug-Viewer-Country']);
  assert.deepEqual(buildRules({ ...enabled, mode: 'off' })[0].action.requestHeaders.map((h) => h.header), ['Nikkei-Flags']);
  assert.deepEqual(buildRules({ ...enabled, mode: 'off', proEnabled: false }), []);
});

test('no target domain never produces a rule, even with both headers enabled', () => {
  assert.deepEqual(buildRules(settings({ mode: 'JP', proEnabled: true, domains: ' \n ' })), []);
});

test('pasted URLs become unique hostnames without paths, query strings, or ports', () => {
  assert.deepEqual(parseDomains(' HTTPS://Example.COM/pro/?test=1#top\nexample.com\nlocalhost:8080/pro\nsub.example.com.\n'),
    ['example.com', 'localhost', 'sub.example.com']);
  assert.deepEqual(parseDomains('https://日本語.jp/pro'), ['xn--wgv71a119e.jp']);
});

test('invalid domains, unsupported schemes, and credentials are rejected', () => {
  for (const domain of ['not a domain', '*.example.com', 'https://bad_host.com', 'chrome://extensions', 'ftp://example.com', 'https://user:password@example.com', 'https://']) {
    assert.throws(() => buildRules(settings({ proEnabled: true, domains: domain })), /対象URL・ドメイン/);
  }
});

test('both headers can be switched off even if the target input is invalid', () => {
  assert.deepEqual(buildRules(settings({ domains: 'invalid domain' })), []);
});

test('empty country does not prevent the independent Pro flag from working', () => {
  const [rule] = buildRules(settings({ mode: 'other', other: '', proEnabled: true }));
  assert.deepEqual(rule.action.requestHeaders.map((h) => h.header), ['Nikkei-Flags']);
});

test('country input cannot inject additional headers', () => {
  assert.throws(() => buildRules(settings({ mode: 'other', other: 'US\r\nInjected: true' })), /国コード/);
});
