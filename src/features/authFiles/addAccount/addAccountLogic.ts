import { normalizeOAuthProviderKey } from '@/utils/providerKeys';
import type { AuthFileItem } from '@/types';
import { deriveAuthFileIdentity } from '@/features/authFiles/identity';

export const ADD_ACCOUNT_PARAM = 'add';
export const CHOOSER_TARGET = 'other';
export const VERTEX_TARGET = 'vertex';

export type AddAccountMenuAction = 'anthropic' | 'codex' | 'other' | 'upload';

const TARGET_ALIASES: Record<string, string> = {
  claude: 'anthropic',
  '': CHOOSER_TARGET,
};

export const parseAddAccountTarget = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  const key = normalizeOAuthProviderKey(value);
  return TARGET_ALIASES[key] ?? key;
};

export const addAccountParamValue = (target: string): string =>
  target === 'anthropic' ? 'claude' : target;

export const newestAccountName = (files: AuthFileItem[], fileType: string): string | null => {
  const matching = files.filter(
    (file) => normalizeOAuthProviderKey(String(file.type ?? file.provider ?? '')) === fileType
  );
  const newest = matching.reduce<AuthFileItem | null>((best, file) => {
    const modified = typeof file.modified === 'number' ? file.modified : 0;
    const bestModified = best && typeof best.modified === 'number' ? best.modified : -1;
    return modified > bestModified ? file : best;
  }, null);
  return newest ? deriveAuthFileIdentity(newest).primary || null : null;
};
