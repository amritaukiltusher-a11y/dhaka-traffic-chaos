import { useState } from 'react';
import { useLang, type Key } from '../i18n';

const LINKS: { href: string; key: Key }[] = [
  { href: '#play', key: 'nav.play' },
  { href: '#how', key: 'nav.how' },
  { href: '#stats', key: 'nav.stats' },
  { href: '#news', key: 'nav.news' },
  { href: '#leaderboard', key: 'nav.board' },
  { href: '#install', key: 'nav.install' }
];

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0b0d12" />
      <rect x="6" y="46" width="52" height="4" rx="2" fill="#ffc21a" opacity=".9" />
      <path d="M14 40h30l6-12H26l-6-8H12z" fill="#1fa35a" />
      <path d="M20 20h22l4 6H24z" fill="#ffc21a" />
      <circle cx="20" cy="43" r="5" fill="#15161a" stroke="#fff" strokeWidth="1.5" />
      <circle cx="46" cy="43" r="5" fill="#15161a" stroke="#fff" strokeWidth="1.5" />
      <path d="M33 29l-4 7h4l-2 6 7-9h-4l3-4z" fill="#ffc21a" />
    </svg>
  );
}

export default function Navbar() {
  const { t, lang, setLang, gameName } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/90 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <a href="#play" className="flex items-center gap-2 font-display text-lg font-bold text-white" onClick={() => setOpen(false)}>
          <LogoMark />
          <span className="leading-tight">{gameName}</span>
        </a>

        <ul className="ml-6 hidden gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-panel hover:text-sun">
                {t(l.key)}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            aria-label={t('nav.langLabel')}
            lang={lang === 'bn' ? 'en' : 'bn'}
            className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-white hover:border-sun"
          >
            {t('nav.lang')}
          </button>
          <button
            type="button"
            className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-white hover:border-sun lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '✕' : '☰'} <span className="sr-only">{t('nav.menu')}</span>
          </button>
        </div>
      </nav>

      {open && (
        <ul id="mobile-menu" className="border-t border-line bg-ink px-4 pb-3 lg:hidden">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 font-semibold text-slate-100 hover:bg-panel hover:text-sun">
                {t(l.key)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
