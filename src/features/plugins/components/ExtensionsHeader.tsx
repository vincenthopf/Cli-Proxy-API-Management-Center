import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Tabs } from '@cloudflare/kumo';

type ExtensionsTab = 'plugins' | 'store';

const TAB_PATHS: Record<ExtensionsTab, string> = {
  plugins: '/plugins',
  store: '/plugin-store',
};

export function ExtensionsHeader({
  active,
  description,
}: {
  active: ExtensionsTab;
  description: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-xl font-semibold text-kumo-default">{t('nav.extensions')}</h1>
        <p className="m-0 text-base text-kumo-subtle">{description}</p>
      </div>
      <Tabs
        variant="underline"
        value={active}
        onValueChange={(value) => {
          if (value === 'plugins' || value === 'store') {
            if (value !== active) navigate(TAB_PATHS[value]);
          }
        }}
        tabs={[
          { value: 'plugins', label: t('nav.plugins_installed') },
          { value: 'store', label: t('nav.plugins_store') },
        ]}
      />
    </header>
  );
}
