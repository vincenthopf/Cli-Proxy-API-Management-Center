import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowClockwiseIcon,
  ArrowsSplitIcon,
  ChartBarIcon,
  CircleHalfIcon,
  GaugeIcon,
  GearIcon,
  InfoIcon,
  KeyIcon,
  ListBulletsIcon,
  ListIcon,
  MoonIcon,
  PlugsConnectedIcon,
  PuzzlePieceIcon,
  SignOutIcon,
  SquaresFourIcon,
  SunIcon,
  TerminalIcon,
  UserPlusIcon,
  UsersIcon,
  type Icon,
} from '@phosphor-icons/react';
import {
  Breadcrumbs,
  Button,
  DropdownMenu,
  LinkProvider,
  Sidebar,
  Tooltip,
  TooltipProvider,
  useSidebar,
  type LinkComponentProps,
} from '@cloudflare/kumo';
import { PageTransition } from '@/components/common/PageTransition';
import { MainRoutes } from '@/router/MainRoutes';
import { authFilesApi, pluginsApi } from '@/services/api';
import { useAuthStore, useConfigStore, useNotificationStore, useThemeStore } from '@/stores';
import { AUTH_FILES_CHANGED_EVENT } from '@/features/authFiles/authFilesEvents';
import {
  collectPluginResourceEntries,
  PLUGIN_RESOURCES_REFRESH_EVENT,
  resolvePluginAssetURL,
  type PluginResourceEntry,
} from '@/features/plugins/pluginResources';
import { triggerHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { getSidebarShortcutLabel, isSidebarToggleShortcut } from '@/utils/sidebarShortcut';
import type { Theme } from '@/types';

const EXTERNAL_HREF = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

const RouterLink = forwardRef<HTMLAnchorElement, LinkComponentProps>(function RouterLink(
  { href, to, ...rest },
  ref
) {
  const target = href ?? to ?? '';
  if (EXTERNAL_HREF.test(target)) return <a ref={ref} href={target} {...rest} />;
  return <Link ref={ref} to={target} {...rest} />;
});

export function BrandMark({ size = 'base' }: { size?: 'base' | 'lg' }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-md bg-kumo-brand text-white ${
        size === 'lg' ? 'size-9' : 'size-7'
      }`}
    >
      <TerminalIcon size={size === 'lg' ? 20 : 16} weight="bold" />
    </span>
  );
}

interface NavLinkItem {
  kind?: 'link';
  path: string;
  label: string;
  icon?: Icon | ReactNode;
  badge?: number;
  badgeLabel?: string;
  aliases?: string[];
}

interface NavDrawerItem {
  kind: 'drawer';
  id: string;
  label: string;
  icon: Icon | ReactNode;
  children: NavLinkItem[];
}

type NavItem = NavLinkItem | NavDrawerItem;

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const flattenNavItems = (items: NavItem[]): NavLinkItem[] =>
  items.flatMap((item) => (item.kind === 'drawer' ? item.children : [item]));

const normalizePath = (pathname: string) => {
  const trimmed = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return trimmed === '/dashboard' ? '/' : trimmed;
};

const matchesPath = (pathname: string, path: string) =>
  pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));

const isItemActive = (pathname: string, item: NavLinkItem) =>
  [item.path, ...(item.aliases ?? [])].some((path) => matchesPath(pathname, path));

function PluginNavIcon({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <PuzzlePieceIcon className="size-4 shrink-0 opacity-40" />;
  return (
    <img
      src={src}
      alt=""
      className="size-4 shrink-0 rounded-sm object-contain"
      onError={() => setFailed(true)}
    />
  );
}

function SidebarBehaviour() {
  const location = useLocation();
  const { isMobile, setOpenMobile, toggleSidebar } = useSidebar();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSidebarToggleShortcut(event)) return;
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  return null;
}

function NavLinkButton({ item, active }: { item: NavLinkItem; active: boolean }) {
  const hasBadge = typeof item.badge === 'number' && item.badge > 0;
  return (
    <Sidebar.MenuButton icon={item.icon} href={item.path} active={active} tooltip={item.label}>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {hasBadge ? <Sidebar.MenuBadge aria-hidden="true">{item.badge}</Sidebar.MenuBadge> : null}
      {item.badgeLabel ? <span className="sr-only">{item.badgeLabel}</span> : null}
    </Sidebar.MenuButton>
  );
}

function NavDrawer({
  item,
  pathname,
  open,
  onOpenChange,
}: {
  item: NavDrawerItem;
  pathname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, setOpen } = useSidebar();
  return (
    <Sidebar.MenuItem>
      <Sidebar.Collapsible open={open} onOpenChange={onOpenChange}>
        <Sidebar.CollapsibleTrigger
          render={
            <Sidebar.MenuButton
              icon={item.icon}
              tooltip={item.label}
              active={item.children.some((child) => isItemActive(pathname, child))}
              onClick={() => {
                if (state === 'collapsed') setOpen(true);
              }}
            >
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <Sidebar.MenuChevron />
            </Sidebar.MenuButton>
          }
        />
        <Sidebar.CollapsibleContent>
          <Sidebar.MenuSub>
            {item.children.map((child) => (
              <Sidebar.MenuSubButton
                key={child.path}
                href={child.path}
                active={isItemActive(pathname, child)}
              >
                {child.label}
              </Sidebar.MenuSubButton>
            ))}
          </Sidebar.MenuSub>
        </Sidebar.CollapsibleContent>
      </Sidebar.Collapsible>
    </Sidebar.MenuItem>
  );
}

function ShellSidebar({
  groups,
  pathname,
  expandedDrawers,
  onDrawerChange,
  shortcutText,
}: {
  groups: NavGroup[];
  pathname: string;
  expandedDrawers: Set<string>;
  onDrawerChange: (id: string, open: boolean) => void;
  shortcutText: string;
}) {
  const { t } = useTranslation();
  const { open } = useSidebar();
  return (
    <Sidebar aria-label={t('header.navigation')}>
      <Sidebar.Header>
        <div className="flex min-w-0 items-center gap-2.5 px-0.5">
          <BrandMark />
          <span className="truncate text-base font-semibold text-kumo-default">
            {t('nav.brand')}
          </span>
        </div>
      </Sidebar.Header>
      <Sidebar.Content>
        {groups.map((group) => (
          <Sidebar.Group key={group.id}>
            <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
            <Sidebar.Menu>
              {group.items.map((item) =>
                item.kind === 'drawer' ? (
                  <NavDrawer
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    open={
                      expandedDrawers.has(item.id) ||
                      item.children.some((child) => isItemActive(pathname, child))
                    }
                    onOpenChange={(next) => onDrawerChange(item.id, next)}
                  />
                ) : (
                  <NavLinkButton
                    key={item.path}
                    item={item}
                    active={isItemActive(pathname, item)}
                  />
                )
              )}
            </Sidebar.Menu>
          </Sidebar.Group>
        ))}
      </Sidebar.Content>
      <Sidebar.Footer>
        <div className="flex items-center gap-2 px-1 py-1">
          <Sidebar.Trigger
            aria-label={`${open ? t('header.collapse_sidebar') : t('header.expand_sidebar')} (${shortcutText})`}
          />
          <span className="truncate text-xs text-kumo-subtle group-data-[state=collapsed]/sidebar:hidden">
            {t('header.toggle_hint', { shortcut: shortcutText })}
          </span>
        </div>
      </Sidebar.Footer>
    </Sidebar>
  );
}

const THEME_OPTIONS: Array<{ value: Theme; icon: Icon; labelKey: string }> = [
  { value: 'auto', icon: CircleHalfIcon, labelKey: 'header.theme_auto' },
  { value: 'white', icon: SunIcon, labelKey: 'header.theme_light' },
  { value: 'dark', icon: MoonIcon, labelKey: 'header.theme_dark' },
];

function ThemeMenu() {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const selected: Theme = theme === 'light' ? 'white' : theme;
  const current = THEME_OPTIONS.find((option) => option.value === selected) ?? THEME_OPTIONS[0];
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={
          <Button
            variant="ghost"
            shape="square"
            icon={current.icon}
            aria-label={t('header.theme')}
            title={t('header.theme')}
          />
        }
      />
      <DropdownMenu.Content>
        <DropdownMenu.Group>
          <DropdownMenu.Label>{t('header.theme')}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={selected}
            onValueChange={(value: unknown) => {
              const next = THEME_OPTIONS.find((option) => option.value === value);
              if (next) setTheme(next.value);
            }}
          >
            {THEME_OPTIONS.map((option) => (
              <DropdownMenu.RadioItem key={option.value} value={option.value} icon={option.icon}>
                {t(option.labelKey)}
                <DropdownMenu.RadioItemIndicator />
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

function ShellHeader({
  crumbs,
  onRefresh,
  onLogout,
}: {
  crumbs: Array<{ label: string; path?: string }>;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const { isMobile, toggleSidebar } = useSidebar();
  const [refreshing, setRefreshing] = useState(false);
  const last = crumbs.length - 1;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="flex h-[58px] shrink-0 items-center gap-2 border-b border-kumo-line bg-kumo-base px-4">
      {isMobile ? (
        <Button
          variant="ghost"
          shape="square"
          icon={ListIcon}
          aria-label={t('header.open_navigation')}
          onClick={toggleSidebar}
        />
      ) : null}
      <Breadcrumbs size="sm" className="mr-0">
        {crumbs.flatMap((crumb, index) => {
          const node =
            index === last || !crumb.path ? (
              <Breadcrumbs.Current key={`c-${index}`}>{crumb.label}</Breadcrumbs.Current>
            ) : (
              <Breadcrumbs.Link key={`l-${index}`} href={crumb.path}>
                {crumb.label}
              </Breadcrumbs.Link>
            );
          return index === 0 ? [node] : [<Breadcrumbs.Separator key={`s-${index}`} />, node];
        })}
      </Breadcrumbs>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Tooltip
          content={t('header.refresh_all')}
          render={
            <Button
              variant="ghost"
              shape="square"
              icon={ArrowClockwiseIcon}
              loading={refreshing}
              aria-label={t('header.refresh_all')}
              onClick={() => void refresh()}
            />
          }
        />
        <ThemeMenu />
        <Tooltip
          content={t('header.logout')}
          render={
            <Button
              variant="ghost"
              shape="square"
              icon={SignOutIcon}
              aria-label={t('header.logout')}
              onClick={onLogout}
            />
          }
        />
      </div>
    </header>
  );
}

export function MainLayout() {
  const { t } = useTranslation();
  const { showNotification } = useNotificationStore();
  const location = useLocation();

  const logout = useAuthStore((state) => state.logout);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const apiBase = useAuthStore((state) => state.apiBase);
  const supportsPlugin = useAuthStore((state) => state.supportsPlugin);

  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const clearCache = useConfigStore((state) => state.clearCache);

  const [authFilesCount, setAuthFilesCount] = useState<number | null>(null);
  const [pluginResources, setPluginResources] = useState<PluginResourceEntry[]>([]);
  const [expandedDrawers, setExpandedDrawers] = useState<Set<string>>(() => new Set());
  const contentRef = useRef<HTMLDivElement | null>(null);
  const authFilesCountRequestRef = useRef(0);

  const pathname = normalizePath(location.pathname);
  const isLogsPage = pathname.startsWith('/logs');
  const isPluginResourcePage = pathname.startsWith('/plugin-pages');

  useLayoutEffect(() => {
    const updateContentCenter = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      document.documentElement.style.setProperty(
        '--content-center-x',
        `${rect.left + rect.width / 2}px`
      );
    };

    updateContentCenter();
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && contentRef.current
        ? new ResizeObserver(updateContentCenter)
        : null;
    if (resizeObserver && contentRef.current) resizeObserver.observe(contentRef.current);
    window.addEventListener('resize', updateContentCenter);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateContentCenter);
      document.documentElement.style.removeProperty('--content-center-x');
    };
  }, []);

  useEffect(() => {
    fetchConfig().catch(() => undefined);
  }, [fetchConfig]);

  const loadPluginResources = useCallback(async () => {
    if (connectionStatus !== 'connected' || !supportsPlugin) {
      setPluginResources([]);
      return;
    }
    try {
      const plugins = await pluginsApi.list();
      setPluginResources(collectPluginResourceEntries(plugins.plugins));
    } catch {
      setPluginResources([]);
    }
  }, [connectionStatus, supportsPlugin]);

  const loadAuthFilesCount = useCallback(async () => {
    const requestID = ++authFilesCountRequestRef.current;
    if (connectionStatus !== 'connected') {
      setAuthFilesCount(null);
      return;
    }
    try {
      const response = await authFilesApi.list();
      if (requestID !== authFilesCountRequestRef.current) return;
      setAuthFilesCount(Array.isArray(response?.files) ? response.files.length : null);
    } catch {
      if (requestID !== authFilesCountRequestRef.current) return;
      setAuthFilesCount(null);
    }
  }, [connectionStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPluginResources();
      void loadAuthFilesCount();
    }, 0);

    window.addEventListener(PLUGIN_RESOURCES_REFRESH_EVENT, loadPluginResources);
    window.addEventListener(AUTH_FILES_CHANGED_EVENT, loadAuthFilesCount);

    return () => {
      authFilesCountRequestRef.current += 1;
      window.clearTimeout(timer);
      window.removeEventListener(PLUGIN_RESOURCES_REFRESH_EVENT, loadPluginResources);
      window.removeEventListener(AUTH_FILES_CHANGED_EVENT, loadAuthFilesCount);
    };
  }, [apiBase, loadPluginResources, loadAuthFilesCount]);

  const navGroups = useMemo<NavGroup[]>(() => {
    const pluginGroups = pluginResources.reduce<
      Array<{ pluginID: string; pluginTitle: string; entries: PluginResourceEntry[] }>
    >((acc, resource) => {
      const group = acc.find((item) => item.pluginID === resource.pluginID);
      if (group) {
        group.entries.push(resource);
      } else {
        acc.push({
          pluginID: resource.pluginID,
          pluginTitle: resource.pluginTitle,
          entries: [resource],
        });
      }
      return acc;
    }, []);

    const pluginPageItems: NavItem[] = supportsPlugin
      ? pluginGroups.map((group): NavItem => {
          const logo = resolvePluginAssetURL(group.entries[0]?.pluginLogo ?? '', apiBase);
          if (group.entries.length === 1) {
            const resource = group.entries[0];
            return {
              path: resource.route,
              label: resource.label,
              icon: <PluginNavIcon src={logo} />,
            };
          }
          return {
            kind: 'drawer',
            id: `plugin-pages-${group.pluginID}`,
            label: group.pluginTitle,
            icon: <PluginNavIcon src={logo} />,
            children: group.entries.map((resource) => ({
              path: resource.route,
              label: resource.label,
            })),
          };
        })
      : [];

    return [
      {
        id: 'monitor',
        label: t('nav_groups.monitor'),
        items: [
          { path: '/', label: t('nav.overview'), icon: SquaresFourIcon },
          { path: '/usage', label: t('nav.usage'), icon: ChartBarIcon },
        ],
      },
      {
        id: 'accounts',
        label: t('nav_groups.accounts'),
        items: [
          {
            path: '/auth-files',
            label: t('nav.accounts'),
            icon: UsersIcon,
            badge: authFilesCount ?? undefined,
            badgeLabel:
              typeof authFilesCount === 'number'
                ? t('nav.accounts_count', { count: authFilesCount })
                : undefined,
          },
          { path: '/oauth', label: t('nav.add_account'), icon: UserPlusIcon },
          { path: '/routing', label: t('nav.routing'), icon: ArrowsSplitIcon },
          { path: '/quota', label: t('nav.quota_detail'), icon: GaugeIcon },
        ],
      },
      {
        id: 'setup',
        label: t('nav_groups.setup'),
        items: [
          { path: '/connect', label: t('nav.connect'), icon: PlugsConnectedIcon },
          {
            path: '/settings',
            label: t('nav.settings'),
            icon: GearIcon,
            aliases: ['/config'],
          },
          { path: '/ai-providers', label: t('nav.api_key_providers'), icon: KeyIcon },
          { path: '/logs', label: t('nav.logs'), icon: ListBulletsIcon },
          ...(supportsPlugin
            ? [
                {
                  path: '/plugins',
                  label: t('nav.extensions'),
                  icon: PuzzlePieceIcon,
                  aliases: ['/plugin-store'],
                },
              ]
            : []),
          { path: '/system', label: t('nav.about'), icon: InfoIcon },
        ],
      },
      ...(pluginPageItems.length > 0
        ? [{ id: 'plugin-pages', label: t('nav_groups.plugin_pages'), items: pluginPageItems }]
        : []),
    ];
  }, [apiBase, authFilesCount, pluginResources, supportsPlugin, t]);

  const navItems = useMemo(
    () => navGroups.flatMap((group) => flattenNavItems(group.items)),
    [navGroups]
  );

  const crumbs = useMemo(() => {
    for (const group of navGroups) {
      const groupLinks = flattenNavItems(group.items);
      const match = groupLinks.find((item) => isItemActive(pathname, item));
      if (!match) continue;
      const trail: Array<{ label: string; path?: string }> = [
        { label: group.label, path: groupLinks[0]?.path },
      ];
      const drawer = group.items.find(
        (item): item is NavDrawerItem => item.kind === 'drawer' && item.children.includes(match)
      );
      if (drawer) trail.push({ label: drawer.label });
      const exact = [match.path, ...(match.aliases ?? [])].includes(pathname);
      trail.push({ label: match.label, path: match.path });
      if (!exact) trail.push({ label: t('header.details') });
      return trail;
    }
    return [{ label: t('nav.brand') }];
  }, [navGroups, pathname, t]);

  const getRouteOrder = useCallback(
    (rawPathname: string) => {
      const target = normalizePath(rawPathname);
      const exactIndex = navItems.findIndex((item) =>
        [item.path, ...(item.aliases ?? [])].includes(target)
      );
      if (exactIndex !== -1) return exactIndex;
      const nestedIndex = navItems.findIndex((item) => isItemActive(target, item));
      if (nestedIndex === -1) return null;
      const suffix = target.slice(navItems[nestedIndex].path.length);
      if (suffix.startsWith('/oauth-excluded')) return nestedIndex + 0.1;
      if (suffix.startsWith('/oauth-model-alias')) return nestedIndex + 0.2;
      return nestedIndex + 0.05;
    },
    [navItems]
  );

  const getTransitionVariant = useCallback((fromPathname: string, toPathname: string) => {
    const isAuthFiles = (value: string) => matchesPath(normalizePath(value), '/auth-files');
    return isAuthFiles(fromPathname) && isAuthFiles(toPathname) ? 'ios' : 'vertical';
  }, []);

  const handleRefreshAll = async () => {
    clearCache();
    const results = await Promise.allSettled([
      fetchConfig(true),
      loadPluginResources(),
      loadAuthFilesCount(),
      triggerHeaderRefresh(),
    ]);
    const rejected = results.find((result) => result.status === 'rejected');
    if (rejected && rejected.status === 'rejected') {
      const reason = rejected.reason;
      const message =
        typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : '';
      showNotification(
        `${t('notification.refresh_failed')}${message ? `: ${message}` : ''}`,
        'error'
      );
      return;
    }
    showNotification(t('notification.data_refreshed'), 'success');
  };

  const handleDrawerChange = useCallback((id: string, open: boolean) => {
    setExpandedDrawers((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const shortcutText = useMemo(() => {
    if (typeof navigator === 'undefined') return getSidebarShortcutLabel(false);
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ||
      navigator.platform ||
      navigator.userAgent ||
      '';
    return getSidebarShortcutLabel(/(Mac|iPhone|iPod|iPad)/i.test(platform));
  }, []);

  return (
    <LinkProvider component={RouterLink}>
      <TooltipProvider>
        <Sidebar.Provider
          defaultOpen
          className={`app-shell h-dvh overflow-hidden${
            isPluginResourcePage ? ' plugin-resource-shell' : ''
          }`}
        >
          <SidebarBehaviour />
          <ShellSidebar
            groups={navGroups}
            pathname={pathname}
            expandedDrawers={expandedDrawers}
            onDrawerChange={handleDrawerChange}
            shortcutText={shortcutText}
          />
          <div className="flex h-dvh min-w-0 flex-1 flex-col bg-kumo-base">
            <ShellHeader crumbs={crumbs} onRefresh={handleRefreshAll} onLogout={logout} />
            <div
              ref={contentRef}
              className={`content${isLogsPage ? ' content-logs' : ''}${
                isPluginResourcePage ? ' content-plugin-resource' : ''
              }`}
            >
              <main
                className={`main-content${isLogsPage ? ' main-content-logs' : ''}${
                  isPluginResourcePage ? ' main-content-plugin-resource' : ''
                }`}
              >
                <PageTransition
                  render={(routeLocation) => <MainRoutes location={routeLocation} />}
                  getRouteOrder={getRouteOrder}
                  getTransitionVariant={getTransitionVariant}
                  scrollContainerRef={contentRef}
                />
              </main>
            </div>
          </div>
        </Sidebar.Provider>
      </TooltipProvider>
    </LinkProvider>
  );
}
