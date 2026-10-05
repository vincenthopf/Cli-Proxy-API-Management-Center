export const KEY_PLACEHOLDER = '<client key>';

export const maskKey = (value: string) =>
  value.length <= 10 ? '••••••' : `${value.slice(0, 6)}••••••${value.slice(-4)}`;

export const buildEnvSnippet = (baseUrl: string, key: string) =>
  [
    `export ANTHROPIC_BASE_URL="${baseUrl}"`,
    `export ANTHROPIC_AUTH_TOKEN="${key}"`,
    'export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1',
    'export API_TIMEOUT_MS=600000',
  ].join('\n');

export const buildSettingsSnippet = (baseUrl: string, key: string) =>
  JSON.stringify(
    {
      env: {
        ANTHROPIC_BASE_URL: baseUrl,
        ANTHROPIC_AUTH_TOKEN: key,
        CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: '1',
        API_TIMEOUT_MS: '600000',
      },
    },
    null,
    2
  );
