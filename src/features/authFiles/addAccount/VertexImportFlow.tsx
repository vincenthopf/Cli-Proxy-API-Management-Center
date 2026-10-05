import { useTranslation } from 'react-i18next';
import { Button, Input, Text } from '@cloudflare/kumo';
import { CheckCircleIcon, FileArrowUpIcon, WarningCircleIcon } from '@phosphor-icons/react';
import type { VertexImport } from './useVertexImport';

export interface VertexImportFlowProps {
  vertex: VertexImport;
  onDone: () => void;
}

export function VertexImportFlow({ vertex, onDone }: VertexImportFlowProps) {
  const { t } = useTranslation();
  const { state, fileInputRef, pickFile, handleFileChange, setLocation, importCredential, reset } =
    vertex;

  if (state.result) {
    const rows = (
      [
        ['vertex_import.result_project', state.result.projectId],
        ['vertex_import.result_email', state.result.email],
        ['vertex_import.result_location', state.result.location],
        ['vertex_import.result_file', state.result.authFile],
      ] as const
    ).filter(([, value]) => Boolean(value));
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <div className="flex items-start gap-3">
          <CheckCircleIcon weight="fill" size={28} className="shrink-0 text-kumo-success" />
          <div className="flex min-w-0 flex-col gap-1">
            <Text variant="heading" as="h3">
              {t('add_account.success_title')}
            </Text>
            <p className="m-0 text-sm text-kumo-subtle">{t('vertex_import.result_title')}</p>
          </div>
        </div>
        <dl className="m-0 grid w-full grid-cols-[minmax(0,8rem)_1fr] gap-x-4 gap-y-2 text-sm">
          {rows.map(([labelKey, value]) => (
            <div key={labelKey} className="contents">
              <dt className="text-kumo-subtle">{t(labelKey)}</dt>
              <dd className="m-0 min-w-0 font-mono break-all text-kumo-default">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={onDone}>
            {t('add_account.done')}
          </Button>
          <Button variant="secondary" onClick={reset}>
            {t('add_account.add_another')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm text-kumo-subtle">{t('vertex_import.description')}</p>
      <div className="flex flex-col gap-1.5">
        <span id="vertex-file-label" className="text-sm font-medium text-kumo-default">
          {t('vertex_import.file_label')}
        </span>
        <div className="flex min-h-9 items-center gap-3">
          <Button
            variant="secondary"
            icon={FileArrowUpIcon}
            onClick={pickFile}
            aria-describedby="vertex-file-label vertex-file-name"
          >
            {t('vertex_import.choose_file')}
          </Button>
          <span
            id="vertex-file-name"
            className={[
              'min-w-0 truncate text-sm',
              state.fileName ? 'font-mono text-kumo-default' : 'text-kumo-subtle',
            ].join(' ')}
          >
            {state.fileName || t('vertex_import.file_placeholder')}
          </span>
        </div>
        <span className="text-xs text-kumo-subtle">{t('vertex_import.file_hint')}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <Input
        label={t('vertex_import.location_label')}
        description={t('vertex_import.location_hint')}
        value={state.location}
        onChange={(event) => setLocation(event.target.value)}
        placeholder={t('vertex_import.location_placeholder')}
      />
      {state.error ? (
        <p role="alert" className="m-0 flex items-start gap-2 text-sm text-kumo-danger">
          <WarningCircleIcon weight="fill" size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{state.error}</span>
        </p>
      ) : null}
      <div>
        <Button variant="primary" loading={state.loading} onClick={() => void importCredential()}>
          {t('vertex_import.import_button')}
        </Button>
      </div>
    </div>
  );
}
