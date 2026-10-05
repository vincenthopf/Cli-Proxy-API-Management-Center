import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import { OAuthProviderFlow } from '@/features/authFiles/addAccount/OAuthProviderFlow';
import { useOAuthFlows } from '@/features/authFiles/addAccount/useOAuthFlows';
import { PROVIDERS } from '@/features/authFiles/addAccount/oauthProviders';
import { validateDevinCallback } from '@/pages/devinOAuth';
import en from '@/i18n/locales/en.json';

const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en } } });

describe('Devin OAuth login UI', () => {
  test('renders the Devin start step with English labels', () => {
    const devin = PROVIDERS.find((provider) => provider.id === 'devin');
    if (!devin) throw new Error('Devin provider missing');
    function Harness() {
      const flows = useOAuthFlows({ loadPlugins: false });
      return createElement(OAuthProviderFlow, {
        provider: devin!,
        state: {},
        actions: flows,
        accountName: null,
        onDone: () => {},
      });
    }
    const markup = renderToStaticMarkup(
      createElement(I18nextProvider, { i18n }, createElement(Harness))
    );
    expect(markup).toContain('Start Devin Login');
    expect(markup).not.toContain('auth_login.devin_');
    expect(en.auth_login.devin_oauth_title).toContain('Devin OAuth');
    expect(en.auth_login.devin_oauth_hint).toContain('five minutes');
  });

  test('supplies every Devin label and hint in English', () => {
    const keys = Object.keys(en.auth_login).filter((key) => key.startsWith('devin_'));
    expect(keys.length).toBeGreaterThanOrEqual(14);
    for (const key of keys) {
      expect((en.auth_login as Record<string, string>)[key]?.trim()).toBeTruthy();
    }
    expect(en.auth_login.devin_oauth_hint).toContain('v7.3.1');
    expect(en.auth_login.devin_callback_hint).toContain('/devin/callback');
  });
});

describe('Devin remote callback attempt identity', () => {
  test('accepts complete callbacks for the current attempt with arbitrary server port and TLS', () => {
    for (const base of [
      'http://127.0.0.1:8317',
      'https://127.0.0.1:9443',
      'http://localhost:1234',
    ]) {
      expect(
        validateDevinCallback(` ${base}/devin/callback?code=fixture-code&state=current `, 'current')
      ).toBeUndefined();
    }
  });

  test('allows denial callbacks to reach the backend and terminate polling', () => {
    for (const field of ['error', 'error_description']) {
      expect(
        validateDevinCallback(
          `http://127.0.0.1:8317/devin/callback?${field}=denied&state=current`,
          'current'
        )
      ).toBeUndefined();
    }
  });

  test('rejects callbacks from another or expired login attempt without inferring a state', () => {
    const callback = 'http://127.0.0.1:8317/devin/callback?code=fixture-code&state=old';
    expect(validateDevinCallback(callback, 'current')).toBe('state_mismatch');
    expect(validateDevinCallback(callback)).toBe('state_mismatch');
  });

  test('rejects incomplete URLs, non-web schemes, missing parameters and duplicate state', () => {
    for (const callback of [
      '',
      'fixture-code',
      '?code=fixture-code&state=current',
      '/devin/callback?code=fixture-code&state=current',
      'file:///devin/callback?code=fixture-code&state=current',
      'javascript:alert(1)?code=fixture-code&state=current',
      'http://127.0.0.1:8317/devin/callback?code=fixture-code',
      'http://127.0.0.1:8317/devin/callback?state=current',
      'http://127.0.0.1:8317/devin/callback?state=current&code=%20',
      'http://127.0.0.1:8317/devin/callback?state=current&state=old&code=fixture-code',
    ]) {
      expect(validateDevinCallback(callback, 'current')).toBe('invalid');
    }
  });
});
