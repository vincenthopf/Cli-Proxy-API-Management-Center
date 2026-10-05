import { FIELD_VALUE_KEYS, type ConfigEditorMode } from '@/features/config/constants';
import type {
  RoutingStrategy,
  VisualConfigFieldPath,
  VisualConfigValidationErrors,
  VisualConfigValues,
} from '@/types/visualConfig';

export const SETTINGS_SECTION_IDS = [
  'overview',
  'access',
  'routing',
  'network',
  'providers',
  'advanced',
  'yaml',
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'overview';

export const SETTINGS_BASE_PATH = '/settings';

export const LOGS_PAGE_HOME = 'logs' as const;

export type SettingsFieldHome = SettingsSectionId | typeof LOGS_PAGE_HOME;

export const LOGS_SETTINGS_PATH = '/logs';

export const LOGS_SETTINGS_TAB = 'settings';

const LEGACY_LOGGING_SECTION = 'logging';

export const ROUTING_STRATEGIES: readonly RoutingStrategy[] = [
  'round-robin',
  'weighted-round-robin',
  'fill-first',
];

export const SETTINGS_FIELD_SECTIONS: Readonly<Record<string, SettingsFieldHome>> = {
  apiKeys: 'access',
  rmAllowRemote: 'access',
  rmSecretKey: 'access',
  rmDisableControlPanel: 'access',
  rmDisableAutoUpdatePanel: 'access',
  rmPanelRepo: 'access',

  routingStrategy: 'routing',
  routingSessionAffinity: 'routing',
  routingSessionAffinityTTL: 'routing',
  routingSessionAffinitySubagents: 'routing',
  requestRetry: 'routing',
  maxRetryInterval: 'routing',
  maxRetryCredentials: 'routing',
  disableCooling: 'routing',
  transientErrorCooldownSeconds: 'routing',
  saveCooldownStatus: 'routing',
  claudeModelLevelCooling: 'routing',
  codexModelLevelCooling: 'routing',

  debug: LOGS_PAGE_HOME,
  loggingToFile: LOGS_PAGE_HOME,
  logsMaxTotalSizeMb: LOGS_PAGE_HOME,
  errorLogsMaxFiles: LOGS_PAGE_HOME,
  usageStatisticsEnabled: LOGS_PAGE_HOME,
  redisUsageQueueRetentionSeconds: LOGS_PAGE_HOME,

  host: 'network',
  port: 'network',
  tlsEnable: 'network',
  tlsCert: 'network',
  tlsKey: 'network',
  trustedProxies: 'network',
  proxyUrl: 'network',
  passthroughHeaders: 'network',
  streamingKeepaliveSeconds: 'network',
  streamingBootstrapRetries: 'network',
  streamingNonstreamKeepalive: 'network',
  discoveryEnabled: 'network',
  discoveryServiceName: 'network',
  discoveryServiceType: 'network',
  discoverySubtypes: 'network',
  discoveryInterfacesInclude: 'network',
  discoveryInterfacesExclude: 'network',
  discoveryAuthRequired: 'network',
  discoveryAdvertiseManagement: 'network',

  forceModelPrefix: 'providers',
  disableImageGeneration: 'providers',
  gptImage2BaseModel: 'providers',
  videoResultAuthCacheTTL: 'providers',
  claudeDisableCloakMode: 'providers',
  claudeCodeDisableCloakingModelList: 'providers',
  claudeHeaderTimezone: 'providers',
  claudeHeaderUserAgent: 'providers',
  claudeHeaderPackageVersion: 'providers',
  claudeHeaderRuntimeVersion: 'providers',
  claudeHeaderOs: 'providers',
  claudeHeaderArch: 'providers',
  claudeHeaderTimeout: 'providers',
  claudeHeaderStabilizeDeviceProfile: 'providers',
  codexDisableCloaking: 'providers',
  codexStreamBootstrapBuffering: 'providers',
  codexStreamBootstrapTimeout: 'providers',
  codexOptimizeMultiAgentV2: 'providers',
  codexOrphanDelegationCompatibility: 'providers',
  codexResponseSteering: 'providers',
  codexHeaderUserAgent: 'providers',
  codexHeaderBetaFeatures: 'providers',
  codexLiveMediaRelayEnabled: 'providers',
  codexLiveMediaRelayMaxSessions: 'providers',
  codexLiveMediaRelayDisablePrivateRemoteIPs: 'providers',
  codexLiveMediaRelayPublicIP: 'providers',
  codexLiveMediaRelayUDPPortMin: 'providers',
  codexLiveMediaRelayUDPPortMax: 'providers',
  codexLiveMediaRelayICEServers: 'providers',
  payloadDefaultRules: 'providers',
  payloadDefaultRawRules: 'providers',
  payloadOverrideRules: 'providers',
  payloadOverrideRawRules: 'providers',
  payloadFilterRules: 'providers',
  quotaSwitchProject: 'providers',
  quotaSwitchPreviewModel: 'providers',
  quotaAntigravityCredits: 'providers',
  antigravityConnectionPoolEnabled: 'providers',
  antigravityConnectionPoolIdleTimeout: 'providers',
  antigravityConnectionPoolMaxIdleConnsPerHost: 'providers',
  antigravitySensitiveWords: 'providers',
  antigravitySignatureCacheEnabled: 'providers',
  antigravitySignatureBypassStrict: 'providers',
  devinSensitiveWords: 'providers',
  xaiInjectXSearch: 'providers',
  wsAuth: 'providers',

  commercialMode: 'advanced',
  authDir: 'advanced',
  authAutoRefreshWorkers: 'advanced',
  pluginsEnabled: 'advanced',
  pluginStoreSources: 'advanced',
  pluginStoreAuth: 'advanced',
};

const VALUE_KEY_TO_FIELD_ID: ReadonlyMap<string, string> = new Map(
  Object.entries(FIELD_VALUE_KEYS).flatMap(([fieldId, valueKeys]) =>
    valueKeys.map((valueKey) => [valueKey, fieldId] as const)
  )
);

export function isSettingsSectionId(value: string): value is SettingsSectionId {
  return (SETTINGS_SECTION_IDS as readonly string[]).includes(value);
}

export function sectionFromPathname(pathname: string): SettingsSectionId {
  const segment = pathname.replace(/^\/+/, '').split('/').filter(Boolean)[1];
  return segment && isSettingsSectionId(segment) ? segment : DEFAULT_SETTINGS_SECTION;
}

export function settingsPath(section: SettingsSectionId, fieldId?: string): string {
  const base =
    section === DEFAULT_SETTINGS_SECTION ? SETTINGS_BASE_PATH : `${SETTINGS_BASE_PATH}/${section}`;
  return fieldId ? `${base}?field=${encodeURIComponent(fieldId)}` : base;
}

export function homeForField(fieldId: string | null | undefined): SettingsFieldHome | undefined {
  return fieldId ? SETTINGS_FIELD_SECTIONS[fieldId] : undefined;
}

export function sectionForField(fieldId: string | null | undefined): SettingsSectionId | undefined {
  const home = homeForField(fieldId);
  return home === LOGS_PAGE_HOME ? undefined : home;
}

export function logSettingsPath(fieldId?: string): string {
  const params = new URLSearchParams({ tab: LOGS_SETTINGS_TAB });
  if (fieldId) params.set('field', fieldId);
  return `${LOGS_SETTINGS_PATH}?${params.toString()}`;
}

export function fieldPath(fieldId: string): string | undefined {
  const home = homeForField(fieldId);
  if (!home) return undefined;
  return home === LOGS_PAGE_HOME ? logSettingsPath(fieldId) : settingsPath(home, fieldId);
}

export function legacyConfigTarget(search: string): string {
  const fieldId = new URLSearchParams(search).get('field');
  return (fieldId && fieldPath(fieldId)) || SETTINGS_BASE_PATH;
}

export function settingsRedirectTarget(pathname: string, search: string): string | null {
  const fieldId = new URLSearchParams(search).get('field');
  if (homeForField(fieldId) === LOGS_PAGE_HOME) return logSettingsPath(fieldId ?? undefined);
  const segment = pathname.replace(/^\/+/, '').split('/').filter(Boolean)[1];
  return segment === LEGACY_LOGGING_SECTION ? logSettingsPath() : null;
}

export function editorModeForSection(section: SettingsSectionId): ConfigEditorMode {
  return section === 'yaml' ? 'source' : 'visual';
}

export function fieldIdForValueKey(valueKey: string): string | undefined {
  return VALUE_KEY_TO_FIELD_ID.get(valueKey);
}

export function primaryValueKey(fieldId: string): string {
  return FIELD_VALUE_KEYS[fieldId]?.[0] ?? fieldId;
}

export function changedFieldIds(dirtyValueKeys: Iterable<string>): string[] {
  const ids = new Set<string>();
  for (const valueKey of dirtyValueKeys) {
    const fieldId = fieldIdForValueKey(valueKey);
    if (fieldId) ids.add(fieldId);
  }
  return [...ids];
}

export type SectionCounts = Partial<Record<SettingsFieldHome, number>>;

export function countFieldsBySection(fieldIds: Iterable<string>): SectionCounts {
  const counts: SectionCounts = {};
  for (const fieldId of fieldIds) {
    const home = homeForField(fieldId);
    if (home) counts[home] = (counts[home] ?? 0) + 1;
  }
  return counts;
}

export function invalidFieldIds(errors: VisualConfigValidationErrors | undefined): string[] {
  const ids: string[] = [];
  for (const [valueKey, code] of Object.entries(errors ?? {})) {
    if (!code) continue;
    const fieldId = fieldIdForValueKey(valueKey);
    if (fieldId) ids.push(fieldId);
  }
  return ids;
}

export function countErrorsBySection(
  errors: VisualConfigValidationErrors | undefined,
  hasPayloadErrors: boolean
): SectionCounts {
  const counts = countFieldsBySection(invalidFieldIds(errors));
  if (hasPayloadErrors) counts.providers = (counts.providers ?? 0) + 1;
  return counts;
}

export function readFieldValue(values: VisualConfigValues, valueKey: string): unknown {
  if (valueKey.startsWith('streaming.')) {
    const leaf = valueKey.slice('streaming.'.length) as keyof VisualConfigValues['streaming'];
    return values.streaming[leaf];
  }
  return values[valueKey as keyof VisualConfigValues];
}

export function patchForValueKey(
  values: VisualConfigValues,
  valueKey: string,
  next: unknown
): Partial<VisualConfigValues> {
  if (valueKey.startsWith('streaming.')) {
    const leaf = valueKey.slice('streaming.'.length) as keyof VisualConfigValues['streaming'];
    return { streaming: { ...values.streaming, [leaf]: String(next ?? '') } };
  }
  return { [valueKey]: next } as Partial<VisualConfigValues>;
}

export function validationCodeFor(
  errors: VisualConfigValidationErrors | undefined,
  fieldId: string
) {
  return errors?.[primaryValueKey(fieldId) as VisualConfigFieldPath];
}

export function parseClientApiKeys(text: string): string[] {
  return text
    .split('\n')
    .map((key) => key.trim())
    .filter(Boolean);
}

export type SettingsSummary = {
  host: string;
  port: string;
  clientKeyCount: number;
  routingStrategy: RoutingStrategy;
  sessionAffinity: boolean;
  sessionAffinityTTL: string;
  requestLog: boolean | null;
};

export function buildSettingsSummary(
  values: VisualConfigValues,
  requestLog: boolean | null | undefined
): SettingsSummary {
  return {
    host: values.host.trim(),
    port: values.port.trim(),
    clientKeyCount: parseClientApiKeys(values.apiKeysText).length,
    routingStrategy: values.routingStrategy,
    sessionAffinity: values.routingSessionAffinity,
    sessionAffinityTTL: values.routingSessionAffinityTTL.trim(),
    requestLog: typeof requestLog === 'boolean' ? requestLog : null,
  };
}

export type SectionTransition =
  | { kind: 'allow'; syncSourceFromVisual: boolean; reloadVisualFromSource: boolean }
  | { kind: 'block_source_dirty' };

export function planSectionTransition(input: {
  from: SettingsSectionId;
  to: SettingsSectionId;
  sourceDirty: boolean;
  visualDirty: boolean;
  visualParseError: string | null;
}): SectionTransition {
  const fromMode = editorModeForSection(input.from);
  const toMode = editorModeForSection(input.to);
  if (fromMode === toMode) {
    return { kind: 'allow', syncSourceFromVisual: false, reloadVisualFromSource: false };
  }
  if (toMode === 'source') {
    return {
      kind: 'allow',
      syncSourceFromVisual: input.visualDirty,
      reloadVisualFromSource: false,
    };
  }
  if (input.sourceDirty) return { kind: 'block_source_dirty' };
  return {
    kind: 'allow',
    syncSourceFromVisual: false,
    reloadVisualFromSource: input.visualParseError !== null,
  };
}

export function isDisabledBySentinel(value: string, invalid: boolean): boolean {
  return !invalid && Number(value.trim()) <= 0;
}
