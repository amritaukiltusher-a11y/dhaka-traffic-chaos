import { useEffect, useRef, useState } from 'react';
import { CONTACT_EMAIL, SOCIAL_LINKS } from '../config';
import { useLang, type Key } from '../i18n';
import { LogoMark } from './Navbar';

type Doc = 'privacy' | 'disclaimer' | 'about';

function LegalDialog({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const titleKey = `legal.${doc}.title` as Key;
  const bodyKey = `legal.${doc}.body` as Key;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, a[href]');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="legal-title" className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-line bg-panel p-6 outline-none">
        <h2 id="legal-title" className="font-display text-2xl text-sun">
          {t(titleKey)}
        </h2>
        <div className="mt-4 space-y-3 whitespace-pre-line leading-relaxed text-slate-200">{t(bodyKey)}</div>
        <button type="button" className="btn-primary mt-6" onClick={onClose}>
          {t('legal.close')}
        </button>
      </div>
    </div>
  );
}

export default function Footer() {
  const { t, gameName } = useLang();
  const [doc, setDoc] = useState<Doc | null>(null);

  return (
    <footer className="bg-black/40 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="font-display text-lg font-bold text-white">{gameName}</p>
              <p className="text-sm text-slate-400">{t('foot.rights')}</p>
            </div>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            {(['privacy', 'disclaimer', 'about'] as const).map((d) => (
              <li key={d}>
                <button type="button" onClick={() => setDoc(d)} className="text-slate-200 underline-offset-4 hover:text-sun hover:underline">
                  {t(`foot.${d}` as Key)}
                </button>
              </li>
            ))}
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-slate-200 underline-offset-4 hover:text-sun hover:underline">
                {t('foot.contact')}
              </a>
            </li>
          </ul>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-sm text-slate-400">
          <ul className="flex flex-wrap gap-4">
            {SOCIAL_LINKS.map((s) => (
              <li key={s.id}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-sun">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#play" className="hover:text-sun">
            ↑ {t('foot.top')}
          </a>
        </div>
      </div>
      {doc && <LegalDialog doc={doc} onClose={() => setDoc(null)} />}
    </footer>
  );
}
