import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n/useTranslation';

interface NavItem {
  translationKey: string;
  path: string;
  icon: string;
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    labelKey: 'nav.group.overview',
    items: [
      {
        translationKey: 'nav.dashboard',
        path: '/dashboard',
        icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zm10-1a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z',
      },
    ],
  },
  {
    labelKey: 'nav.group.finance',
    items: [
      {
        translationKey: 'nav.statements',
        path: '/statements',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      },
      {
        translationKey: 'nav.accounts',
        path: '/chart-of-accounts',
        icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      },
      {
        translationKey: 'nav.budget',
        path: '/budget',
        icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      },
      {
        translationKey: 'nav.targets',
        path: '/targets',
        icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      },
      {
        translationKey: 'nav.upload',
        path: '/upload',
        icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
      },
    ],
  },
  {
    labelKey: 'nav.group.people',
    items: [
      {
        translationKey: 'nav.hr',
        path: '/hr',
        icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H9m6 0a5.97 5.97 0 00-.786-3.07M9 19.128v-.003c0-1.113.285-2.16.786-3.07M9 19.128H2.254a4.125 4.125 0 017.533-2.493M9 19.128a5.97 5.97 0 01.786-3.07m4.428 0a5.97 5.97 0 011.786-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
      },
    ],
  },
  {
    labelKey: 'nav.group.operations',
    items: [
      {
        translationKey: 'nav.intercompany',
        path: '/intercompany',
        icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
      },
      {
        translationKey: 'nav.assets',
        path: '/assets',
        icon: 'M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25',
      },
    ],
  },
  {
    labelKey: 'nav.group.compliance',
    items: [
      {
        translationKey: 'nav.tax',
        path: '/tax',
        icon: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
      },
      {
        translationKey: 'nav.treasury',
        path: '/treasury',
        icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
      },
      {
        translationKey: 'nav.legal',
        path: '/legal',
        icon: 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z',
      },
    ],
  },
  {
    labelKey: 'nav.group.system',
    items: [
      {
        translationKey: 'nav.settings',
        path: '/settings',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      },
    ],
  },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  const { t } = useTranslation();

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
          isActive
            ? 'bg-brand-500/15 text-white'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
        )
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200',
              isActive
                ? 'bg-brand-500 shadow-glow-brand'
                : 'bg-white/[0.05] group-hover:bg-white/[0.08]'
            )}
          >
            <NavIcon d={item.icon} />
          </div>
          <span className="truncate">{t(item.translationKey)}</span>
          {isActive && (
            <div className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(26,111,181,0.7)]" />
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((g) => [g.labelKey, true]))
  );

  const toggleGroup = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="flex w-[220px] flex-shrink-0 flex-col h-screen sticky top-0 bg-surface-dark text-white">
      {/* Logo */}
      <div className="flex items-center justify-center px-4 pt-6 pb-5">
        <img
          src="/logo.png"
          alt="ConsolidaSuite"
          className="h-8 w-auto brightness-0 invert"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-2">
        {navGroups.map((group, idx) => (
          <div key={group.labelKey}>
            {idx > 0 && <div className="mx-2 my-2 border-t border-white/[0.06]" />}

            {/* Group header with collapse toggle */}
            <button
              onClick={() => toggleGroup(group.labelKey)}
              className="flex w-full items-center justify-between px-3 py-1.5 mb-0.5"
            >
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-semibold">
                {t(group.labelKey)}
              </span>
              <svg
                className={cn(
                  'h-3 w-3 text-slate-600 transition-transform duration-200',
                  expanded[group.labelKey] ? 'rotate-0' : '-rotate-90'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Collapsible items */}
            {expanded[group.labelKey] && (
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItemLink key={item.path} item={item} />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.04]">
        <div className="text-[10px] text-slate-600">
          ConsolidaSuite {t('common.version')} 1.0
        </div>
        <div className="text-[10px] text-slate-700 mt-0.5">
          {t('common.gdprCompliant')}
        </div>
      </div>
    </aside>
  );
}
