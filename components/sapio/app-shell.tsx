'use client';

import { useTheme } from 'fumadocs-ui/provider/base';
import {
  Check,
  ChevronsUpDown,
  Ellipsis,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sun,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { LockIcon } from './lock-icon';
import { Sheet } from './sheet';
import { Tip } from './tooltip';
import { useMediaQuery } from './use-media-query';
import { useMenu } from './use-menu';

export interface ShellNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Group heading shown above the item and the ones after it. */
  group?: string;
  /** Pending work for this item. */
  badge?: number;
  /** The plan does not include it: a padlock, and the page explains the upgrade (BR-87). */
  locked?: boolean;
  current: boolean;
}

export interface ShellWorkspace {
  name: string;
  /** Letter on the colored mark. */
  initial: string;
  /** `sp-tenant-may`, `sp-tenant-pawpaw`: scopes `--accent*` to the tenant. */
  accentClass: string;
}

/** The platform administration has no tenant to switch: the switcher shows a fixed name. */
export interface ShellPlatform {
  name: string;
  sub: string;
  initial: string;
}

export interface ShellProps {
  workspace: ShellWorkspace;
  /** Set for the administration area: the switcher is a label, not a menu. */
  platform?: ShellPlatform | undefined;
  /** Branch being viewed. */
  branchName: string;
  branches: { id: string; name: string; address: string; current: boolean; href: string }[];
  otherWorkspaces: (ShellWorkspace & { sub: string; href: string })[];
  newWorkspaceHref: string;
  items: ShellNavItem[];
  /** The three items on the phone tab bar; "Thêm" holds the rest. */
  tabs: ShellNavItem[];
  /** Name of the last tab, which opens the account and the other entries; "Thêm" by default. */
  moreLabel?: string;
  account: { name: string; initials: string; roleLabel: string };
  /** Extra account entries (role switch in the mock); `kind` tells menu rows from sheet rows. */
  accountExtra?: ((kind: 'menu' | 'list') => ReactNode) | undefined;
  /** Notice above the page content (trial, plan about to end). */
  banner?: ReactNode;
  onProfile: () => void;
  onSignOut: () => void;
  children: ReactNode;
}

const STORAGE_KEY = 'sapio.sidebar';
const STORAGE_EVENT = 'sapio-sidebar';

function subscribeSidebar(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function readSidebar(): 'collapsed' | 'expanded' {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'collapsed' ? 'collapsed' : 'expanded';
  } catch {
    return 'expanded';
  }
}

function writeSidebar(value: 'collapsed' | 'expanded') {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage can be blocked; the choice then lasts until reload.
  }
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

/** The choice is kept per browser in `localStorage`. */
function useSidebarSetting() {
  return useSyncExternalStore(subscribeSidebar, readSidebar, () => 'expanded' as const);
}

const useWide = () => useMediaQuery('(min-width: 1200px)');

const PhoneSlot = createContext<HTMLElement | null>(null);

/** Puts a page action in the phone header, next to the workspace switcher. */
export function PhoneHeaderAction({ children }: { children: ReactNode }) {
  const slot = useContext(PhoneSlot);
  return slot ? createPortal(children, slot) : null;
}

function Mark({ workspace, small = false }: { workspace: ShellWorkspace; small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn('sp-switcher__mark', workspace.accentClass)}
      style={{
        background: 'var(--accent-soft)',
        color: 'var(--accent)',
        ...(small ? { width: 28, height: 28, fontSize: 12 } : {}),
      }}
    >
      {workspace.initial}
    </span>
  );
}

function Switcher({
  workspace,
  branchName,
  branches,
  otherWorkspaces,
  newWorkspaceHref,
  platform,
  rail,
  compact,
}: Pick<
  ShellProps,
  'workspace' | 'branchName' | 'branches' | 'otherWorkspaces' | 'newWorkspaceHref' | 'platform'
> & { rail: boolean; compact: boolean }) {
  const menu = useMenu();
  if (platform) {
    return (
      <div
        className="sp-switcher"
        style={{ cursor: 'default', ...(compact ? { width: 'auto' } : {}) }}
      >
        <span
          aria-hidden="true"
          className="sp-switcher__mark"
          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
        >
          {platform.initial}
        </span>
        <span className="sp-switcher__text">
          <span className="sp-switcher__name">{platform.name}</span>{' '}
          <span className="sp-switcher__sub">{platform.sub}</span>
        </span>
        {rail && (
          <span className="sp-sr-only">
            {platform.name} {platform.sub}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className={cn('relative', compact && 'min-w-0')}>
      <button
        ref={menu.triggerRef}
        type="button"
        className="sp-switcher"
        style={compact ? { width: 'auto' } : undefined}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        onClick={() => menu.setOpen((v) => !v)}
        onKeyDown={menu.onTriggerKeyDown}
      >
        <Mark workspace={workspace} />
        <span className="sp-sr-only">Đổi cơ sở hoặc chi nhánh:</span>
        <span className="sp-switcher__text">
          <span className="sp-switcher__name">{workspace.name}</span>{' '}
          <span className="sp-switcher__sub">{branchName}</span>
        </span>
        <ChevronsUpDown className="sp-switcher__chevron" aria-hidden="true" />
        {/* The name comes from the text on screen; in the rail the text is hidden, so it is repeated. */}
        {rail && (
          <span className="sp-sr-only">
            {workspace.name} {branchName}
          </span>
        )}
      </button>
      {menu.open &&
        createPortal(
          <div
            ref={menu.menuRef}
            className="sp-menu fixed z-60 w-70"
            style={menu.fixedStyle('below', rail)}
            role="menu"
            aria-label="Đổi cơ sở hoặc chi nhánh"
            onKeyDown={menu.onKeyDown}
          >
            <div className="sp-menu__label">Chi nhánh của {workspace.name}</div>
            {branches.map((b) => (
              <Link
                key={b.id}
                href={b.href}
                scroll={false}
                role="menuitemradio"
                aria-checked={b.current}
                className="sp-menu__item"
                onClick={() => menu.close(false)}
              >
                <span className="sp-menu__text">
                  {b.name}
                  <span className="sp-menu__sub">{b.address}</span>
                </span>
              </Link>
            ))}
            {otherWorkspaces.length > 0 && (
              <>
                <div className="sp-menu__sep" />
                <div className="sp-menu__label">Cơ sở khác của bạn</div>
                {otherWorkspaces.map((w) => (
                  <Link
                    key={w.name}
                    href={w.href}
                    role="menuitem"
                    className="sp-menu__item"
                    onClick={() => menu.close(false)}
                  >
                    <Mark workspace={w} small />
                    <span className="sp-menu__text">
                      {w.name}
                      <span className="sp-menu__sub">{w.sub}</span>
                    </span>
                  </Link>
                ))}
              </>
            )}
            <div className="sp-menu__sep" />
            <Link
              href={newWorkspaceHref}
              role="menuitem"
              className="sp-menu__item"
              onClick={() => menu.close(false)}
            >
              <Plus size={16} aria-hidden="true" />
              Đăng ký cơ sở mới
            </Link>
          </div>,
          document.body,
        )}
    </div>
  );
}

function ThemeButton({ rail }: { rail: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';
  const label = dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
  return (
    <Tip label={label} side={rail ? 'right' : 'top-end'}>
      <button
        type="button"
        className="sp-icon-btn"
        aria-label={label}
        onClick={() => setTheme(dark ? 'light' : 'dark')}
      >
        {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </button>
    </Tip>
  );
}

function Account({
  account,
  accountExtra,
  onProfile,
  onSignOut,
  rail,
}: Pick<ShellProps, 'account' | 'accountExtra' | 'onProfile' | 'onSignOut'> & { rail: boolean }) {
  const menu = useMenu();
  return (
    <div className="sp-account relative">
      <button
        ref={menu.triggerRef}
        type="button"
        className="flex min-w-0 grow items-center gap-(--space-2) rounded-(--radius-sm) border-0 bg-transparent p-0 text-left text-(--ink)"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        onClick={() => menu.setOpen((v) => !v)}
        onKeyDown={menu.onTriggerKeyDown}
      >
        <span className="sp-avatar sp-avatar--sm" aria-hidden="true">
          {account.initials}
        </span>
        <span className="sp-account__text">
          <span className="sp-switcher__name" style={{ fontSize: 13, lineHeight: '18px' }}>
            {account.name}
          </span>{' '}
          <span className="sp-switcher__sub">{account.roleLabel}</span>
        </span>
        {rail && (
          <span className="sr-only">
            {account.name} {account.roleLabel}
          </span>
        )}
        <span className="sr-only">, menu tài khoản</span>
      </button>
      <ThemeButton rail={rail} />
      {menu.open &&
        createPortal(
          <div
            ref={menu.menuRef}
            className="sp-menu fixed z-60 w-65"
            style={menu.fixedStyle('above', rail)}
            role="menu"
            aria-label="Tài khoản"
            onKeyDown={menu.onKeyDown}
          >
            <button
              type="button"
              role="menuitem"
              className="sp-menu__item"
              onClick={() => {
                menu.close();
                onProfile();
              }}
            >
              Hồ sơ
            </button>
            <button
              type="button"
              role="menuitem"
              className="sp-menu__item"
              onClick={() => {
                menu.close();
                onSignOut();
              }}
            >
              Đăng xuất
            </button>
            {accountExtra && (
              <>
                <div className="sp-menu__sep" />
                {accountExtra('menu')}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

function NavItems({ items, rail }: { items: ShellNavItem[]; rail: boolean }) {
  let lastGroup: string | undefined;
  return (
    <div className="sp-nav">
      {items.map((item) => {
        const heading = item.group && item.group !== lastGroup ? item.group : null;
        lastGroup = item.group ?? lastGroup;
        const Icon = item.icon;
        return (
          <div key={item.id} className="contents">
            {heading && <div className="sp-nav__group">{heading}</div>}
            <Tip label={item.label} side="right" enabled={rail}>
              <Link
                href={item.href}
                className="sp-nav__item relative w-full"
                aria-current={item.current ? 'page' : undefined}
                aria-label={
                  rail
                    ? [
                        item.label,
                        item.badge ? `${item.badge} việc chờ` : null,
                        item.locked ? 'cần nâng gói' : null,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    : undefined
                }
              >
                <Icon aria-hidden="true" />
                <span className="sp-nav__label">{item.label}</span>
                {item.locked && !rail && (
                  <>
                    <span className="sp-sr-only"> (cần nâng gói)</span>
                    <LockIcon />
                  </>
                )}
                {item.badge ? (
                  <>
                    <span className="sp-nav__badge">
                      {item.badge}
                      <span className="sr-only"> việc chờ</span>
                    </span>
                    {rail && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1.5 right-2 size-2 rounded-full bg-(--brand)"
                      />
                    )}
                  </>
                ) : null}
              </Link>
            </Tip>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Frame of every page in `/app/[tenant]`: sidebar (240px, 68px rail, or off with a tab bar below
 * 768px) around the page. Pages bring their own `.sp-shell__content`.
 */
export function AppShell(props: ShellProps) {
  const { workspace, branchName, items, tabs, account, children } = props;
  const wide = useWide();
  const saved = useSidebarSetting();
  const collapsed = saved === 'collapsed';
  const [overlay, setOverlay] = useState(false);
  const [more, setMore] = useState(false);
  const [phoneSlot, setPhoneSlot] = useState<HTMLElement | null>(null);
  const sideRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Icons only: the saved choice on wide screens, or the default on tablets until opened.
  const rail = wide ? collapsed : !overlay;

  // A tablet's open sidebar closes on Escape or a click outside it.
  useEffect(() => {
    if (wide || !overlay) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOverlay(false);
      toggleRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!sideRef.current?.contains(e.target as Node)) setOverlay(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [wide, overlay]);

  const toggleLabel = rail ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên';
  const onToggle = () => {
    if (wide) writeSidebar(collapsed ? 'expanded' : 'collapsed');
    else setOverlay((v) => !v);
  };
  const tabIds = new Set(tabs.map((t) => t.id));
  const rest = items.filter((i) => !tabIds.has(i.id));
  const moreLabel = props.moreLabel ?? 'Thêm';
  const MoreIcon = props.moreLabel ? UserRound : Ellipsis;
  const moreCurrent = rest.some((i) => i.current);

  return (
    <div
      className={cn(
        'sp-shell',
        wide && collapsed && 'sp-shell--collapsed',
        !wide && overlay && 'sp-shell--expanded',
      )}
    >
      <nav ref={sideRef} className="sp-shell__side" id="app-sidebar" aria-label="Điều hướng chính">
        <div className="sp-brand">
          <span className="sp-brand__name">Sapio</span>
          <Tip label={toggleLabel} side={rail ? 'right' : 'bottom-end'}>
            <button
              ref={toggleRef}
              type="button"
              className="sp-icon-btn"
              aria-label={toggleLabel}
              aria-expanded={!rail}
              aria-controls="app-sidebar"
              onClick={onToggle}
            >
              {rail ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
            </button>
          </Tip>
        </div>
        <Switcher
          workspace={workspace}
          branchName={branchName}
          branches={props.branches}
          otherWorkspaces={props.otherWorkspaces}
          newWorkspaceHref={props.newWorkspaceHref}
          platform={props.platform}
          rail={rail}
          compact={false}
        />
        <NavItems items={items} rail={rail} />
        <Account
          account={account}
          accountExtra={props.accountExtra}
          onProfile={props.onProfile}
          onSignOut={props.onSignOut}
          rail={rail}
        />
      </nav>

      <div className="sp-shell__main">
        {/* Phone: no sidebar, so the workspace switcher moves to a header. */}
        <header className="flex items-center justify-between gap-(--space-2) bg-(--surface-raised) px-(--space-3) py-(--space-2) shadow-[0_1px_0_var(--line)] md:hidden">
          <Switcher
            workspace={workspace}
            branchName={branchName}
            branches={props.branches}
            otherWorkspaces={props.otherWorkspaces}
            newWorkspaceHref={props.newWorkspaceHref}
            platform={props.platform}
            rail={false}
            compact
          />
          <div ref={setPhoneSlot} className="flex flex-none items-center gap-(--space-2)" />
        </header>
        <PhoneSlot.Provider value={phoneSlot}>
          {props.banner}
          {children}
        </PhoneSlot.Provider>
      </div>

      <nav
        className="sp-tabbar"
        aria-label="Điều hướng chính"
        data-phone-nav
        style={{ ['--tabs' as string]: tabs.length + 1 }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className="sp-tabbar__item"
              aria-current={tab.current ? 'page' : undefined}
            >
              <Icon aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          className="sp-tabbar__item border-0 bg-transparent"
          aria-haspopup="dialog"
          aria-expanded={more}
          aria-current={moreCurrent ? 'page' : undefined}
          onClick={() => setMore(true)}
        >
          <MoreIcon aria-hidden="true" />
          {moreLabel}
        </button>
      </nav>

      <Sheet open={more} title={moreLabel} onClose={() => setMore(false)}>
        <div className="flex flex-col gap-(--space-5)">
          {rest.length > 0 && (
            <nav aria-label="Các mục khác" className="flex flex-col">
              {rest.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="sp-menu__item min-h-11"
                    aria-current={item.current ? 'page' : undefined}
                    onClick={() => setMore(false)}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span className="sp-menu__text">
                      {item.label}
                      {item.locked && <span className="sp-sr-only"> (cần nâng gói)</span>}
                    </span>
                    {item.locked && <LockIcon />}
                    {item.badge ? <span className="sp-nav__badge">{item.badge}</span> : null}
                    {item.current && <Check size={16} aria-hidden="true" />}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="flex flex-col">
            <div className="sp-menu__label">
              {account.name} · {account.roleLabel}
            </div>
            <button
              type="button"
              className="sp-menu__item min-h-11"
              onClick={() => {
                setMore(false);
                props.onProfile();
              }}
            >
              Hồ sơ
            </button>
            {props.accountExtra?.('list')}
            <ThemeRow />
            <button
              type="button"
              className="sp-menu__item min-h-11"
              onClick={() => {
                setMore(false);
                props.onSignOut();
              }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function ThemeRow() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';
  return (
    <button
      type="button"
      className="sp-menu__item min-h-11"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    </button>
  );
}
