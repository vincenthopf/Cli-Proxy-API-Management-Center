import { describe, expect, test } from 'bun:test';
import en from '../src/i18n/locales/en.json';

const keys = [
  'preview_too_large',
  'read_status_live',
  'read_status_paused',
  'read_status_catching_up',
  'last_updated',
  'buffer_scope',
  'buffer_evicted',
  'cursor_reset_notice',
  'history_evicted',
  'resume_following',
  'level_filter',
  'all_levels',
  'view_request',
  'copy_line',
  'request_log_missing',
  'download_cached',
  'clear_application_confirm',
  'clear_search',
  'reading_enabled',
  'filter_load_more',
] as const;

describe('log interaction translations', () => {
  test('en includes all new actions and status labels', () => {
    for (const key of keys) {
      expect(en.logs[key].trim().length).toBeGreaterThan(0);
    }
  });
});
