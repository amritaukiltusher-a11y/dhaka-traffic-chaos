import { useEffect, useState } from 'react';
import { useLang } from '../i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallGuide() {
  const { t } = useLang();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <section id="install" className="scroll-mt-16 border-b border-line bg-panel/40 py-14" aria-labelledby="inst-title">
      <div className="mx-auto max-w-7xl px-4">
        <h2 id="inst-title" className="section-title">
          {t('inst.title')}
        </h2>
        <p className="mt-2 max-w-2xl text-slate-300">{t('inst.desc')}</p>

        <div className="mt-5">
          {installed ? (
            <p className="font-semibold text-leaf">{t('inst.installed')}</p>
          ) : deferred ? (
            <button type="button" className="btn-primary" onClick={install}>
              {t('inst.button')}
            </button>
          ) : null}
        </div>

        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {(['inst.android', 'inst.ios', 'inst.desktop'] as const).map((k) => (
            <li key={k} className="rounded-2xl border border-line bg-panel p-5 text-slate-200">
              {t(k)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
