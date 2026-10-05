import type { BuiltInOAuthProvider } from '@/services/api';
import type { PluginListEntry } from '@/types';
import { getPluginTitle, resolvePluginAssetURL } from '@/features/plugins/pluginResources';
import iconMeta from '@/assets/icons/meta.svg';
import iconCodex from '@/assets/icons/codex.svg';
import iconClaude from '@/assets/icons/claude.svg';
import iconAntigravity from '@/assets/icons/antigravity.svg';
import iconKimiLight from '@/assets/icons/kimi-light.svg';
import iconKimiDark from '@/assets/icons/kimi-dark.svg';
import iconGrok from '@/assets/icons/grok.svg';
import iconGrokDark from '@/assets/icons/grok-dark.svg';
import iconDevin from '@/assets/icons/devin.svg';
import iconDevinDark from '@/assets/icons/devin-dark.svg';

export type ProviderIcon = string | { light: string; dark: string };

export interface ProviderState {
  url?: string;
  userCode?: string;
  state?: string;
  status?: 'idle' | 'waiting' | 'success' | 'error';
  error?: string;
  polling?: boolean;
  cancelling?: boolean;
  cancelError?: string;
  callbackUrl?: string;
  callbackSubmitting?: boolean;
  callbackStatus?: 'success' | 'error';
  callbackError?: string;
}

export interface BuiltInOAuthProviderCard {
  kind: 'builtin';
  id: BuiltInOAuthProvider;
  titleKey: string;
  icon: ProviderIcon;
}

export interface PluginOAuthProviderCard {
  kind: 'plugin';
  id: string;
  title: string;
  icon: string;
}

export type OAuthProviderCard = BuiltInOAuthProviderCard | PluginOAuthProviderCard;

export const PROVIDERS: BuiltInOAuthProviderCard[] = [
  {
    kind: 'builtin',
    id: 'meta',
    titleKey: 'auth_login.meta_oauth_title',
    icon: iconMeta,
  },
  {
    kind: 'builtin',
    id: 'kimi',
    titleKey: 'auth_login.kimi_oauth_title',
    icon: { light: iconKimiDark, dark: iconKimiLight },
  },
  {
    kind: 'builtin',
    id: 'kimi-ai',
    titleKey: 'auth_login.kimi_ai_oauth_title',
    icon: { light: iconKimiDark, dark: iconKimiLight },
  },
  {
    kind: 'builtin',
    id: 'codex',
    titleKey: 'auth_login.codex_oauth_title',
    icon: iconCodex,
  },
  {
    kind: 'builtin',
    id: 'anthropic',
    titleKey: 'auth_login.anthropic_oauth_title',
    icon: iconClaude,
  },
  {
    kind: 'builtin',
    id: 'antigravity',
    titleKey: 'auth_login.antigravity_oauth_title',
    icon: iconAntigravity,
  },
  {
    kind: 'builtin',
    id: 'xai',
    titleKey: 'auth_login.xai_oauth_title',
    icon: { light: iconGrok, dark: iconGrokDark },
  },
  {
    kind: 'builtin',
    id: 'devin',
    titleKey: 'auth_login.devin_oauth_title',
    icon: { light: iconDevin, dark: iconDevinDark },
  },
];

export const BUILTIN_PROVIDER_IDS = new Set<string>(PROVIDERS.map((provider) => provider.id));
export const CALLBACK_SUPPORTED = new Set<string>([
  'codex',
  'anthropic',
  'antigravity',
  'xai',
  'devin',
]);
export const PRIMARY_ORDER = ['anthropic', 'codex'];
export const KIMI_PROVIDER_IDS = new Set<string>(['kimi', 'kimi-ai']);

const XAI_CALLBACK_URL = 'http://127.0.0.1:56121/callback';

const FILE_TYPE_BY_PROVIDER: Record<string, string> = {
  anthropic: 'claude',
  'kimi-ai': 'kimi',
};

export const authFileTypeForProvider = (provider: string): string =>
  FILE_TYPE_BY_PROVIDER[provider] ?? provider;

export const getProviderI18nPrefix = (provider: string) => provider.replace('-', '_');

export const getAuthKey = (provider: string, suffix: string) =>
  `auth_login.${getProviderI18nPrefix(provider)}_${suffix}`;

export const getIcon = (icon: ProviderIcon, theme: 'light' | 'dark') =>
  typeof icon === 'string' ? icon : icon[theme];

export const supportsCallback = (provider: OAuthProviderCard): boolean =>
  provider.kind === 'plugin' || CALLBACK_SUPPORTED.has(provider.id);

export const orderProviders = (providers: OAuthProviderCard[]): OAuthProviderCard[] =>
  [...providers].sort((left, right) => {
    const l = PRIMARY_ORDER.indexOf(left.id);
    const r = PRIMARY_ORDER.indexOf(right.id);
    return (l === -1 ? 99 : l) - (r === -1 ? 99 : r);
  });

export const buildPluginOAuthProviderCards = (
  plugins: PluginListEntry[],
  apiBase: string
): PluginOAuthProviderCard[] => {
  const seenProviders = new Set(BUILTIN_PROVIDER_IDS);
  return plugins.flatMap((plugin) => {
    const provider = plugin.oauthProvider;
    if (
      !plugin.supportsOAuth ||
      !plugin.effectiveEnabled ||
      !provider ||
      seenProviders.has(provider)
    ) {
      return [];
    }
    seenProviders.add(provider);
    return [
      {
        kind: 'plugin' as const,
        id: provider,
        title: getPluginTitle(plugin),
        icon: resolvePluginAssetURL(plugin.logo || plugin.metadata?.logo || '', apiBase),
      },
    ];
  });
};

const isAbsoluteUrl = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const readQueryLikeCallbackInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const queryStart = trimmed.indexOf('?');
  const hashStart = trimmed.indexOf('#');
  const rawParams =
    queryStart >= 0
      ? trimmed.slice(queryStart + 1)
      : hashStart >= 0
        ? trimmed.slice(hashStart + 1)
        : trimmed;

  if (!/(^|[&#?])(code|state|error)=/i.test(rawParams)) return null;
  return new URLSearchParams(rawParams.replace(/^[?#]/, ''));
};

const extractDisplayedXaiCode = (value: string): string => {
  const trimmed = value.trim();
  const codeMatch = trimmed.match(/\bcode\s*[:=]\s*([^\s&]+)/i);
  return (codeMatch?.[1] ?? trimmed).trim();
};

const buildXaiCallbackUrl = (input: string, state?: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) return trimmed;

  const params = readQueryLikeCallbackInput(trimmed);
  if (params) {
    const code = params.get('code')?.trim();
    const error = params.get('error')?.trim();
    const errorDescription = params.get('error_description')?.trim();
    const callbackState = params.get('state')?.trim() || state?.trim();
    if (!callbackState) return null;

    const callbackUrl = new URL(XAI_CALLBACK_URL);
    callbackUrl.searchParams.set('state', callbackState);
    if (code) callbackUrl.searchParams.set('code', code);
    if (error) callbackUrl.searchParams.set('error', error);
    if (errorDescription) callbackUrl.searchParams.set('error_description', errorDescription);
    return callbackUrl.toString();
  }

  const code = extractDisplayedXaiCode(trimmed);
  const callbackState = state?.trim();
  if (!code || !callbackState) return null;

  const callbackUrl = new URL(XAI_CALLBACK_URL);
  callbackUrl.searchParams.set('code', code);
  callbackUrl.searchParams.set('state', callbackState);
  return callbackUrl.toString();
};

export const resolveCallbackUrl = (
  provider: string,
  input: string,
  state?: string
): string | null => {
  if (provider !== 'xai') return input.trim();
  return buildXaiCallbackUrl(input, state);
};
