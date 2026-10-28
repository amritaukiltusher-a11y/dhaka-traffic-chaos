import { useState, type FormEvent } from 'react';
import { NEWSLETTER_ENDPOINT, SOCIAL_LINKS } from '../config';
import { useLang } from '../i18n';
import { isValidEmail } from '../lib/format';
import { saveNewsletterLocally } from '../lib/storage';
import { useOnline } from './hooks';

type Status = { kind: 'idle' } | { kind: 'ok' | 'local' | 'invalid' | 'error' | 'offline' };

const STATUS_KEY = { ok: 'nl.sent', local: 'nl.savedLocal', invalid: 'nl.invalid', error: 'nl.error', offline: 'nl.offline' } as const;

function SocialIcon({ id }: { id: string }) {
  const common = { className: 'h-5 w-5', viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const;
  switch (id) {
    case 'facebook':
      return (
        <svg {...common}>
          <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.7c0-.9.3-1.5 1.6-1.5h1.6V4.5c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.1H8v3h2.5V21z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common}>
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common}>
          <path d="M12 7.5A4.5 4.5 0 1 0 12 16.5 4.5 4.5 0 0 0 12 7.5zm0 7.4A2.9 2.9 0 1 1 12 9.1a2.9 2.9 0 0 1 0 5.8zM17.3 6.1a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM12 3.2c-2.4 0-2.7 0-3.6.1-2.3.1-3.5 1.2-3.6 3.6-.1.9-.1 1.2-.1 3.6s0 2.7.1 3.6c.1 2.3 1.2 3.5 3.6 3.6.9.1 1.2.1 3.6.1s2.7 0 3.6-.1c2.3-.1 3.5-1.2 3.6-3.6.1-.9.1-1.2.1-3.6s0-2.7-.1-3.6c-.1-2.3-1.2-3.5-3.6-3.6-.9-.1-1.2-.1-3.6-.1z" fillRule="evenodd" clipRule="evenodd" opacity=".0" />
          <path d="M16 3H8a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V8a5 5 0 0 0-5-5zm3.3 13A3.3 3.3 0 0 1 16 19.3H8A3.3 3.3 0 0 1 4.7 16V8A3.3 3.3 0 0 1 8 4.7h8A3.3 3.3 0 0 1 19.3 8z" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path d="M17.8 3H20l-4.8 5.5L20.8 21h-4.4l-3.4-4.5L9 21H6.8l5.2-5.9L6.6 3h4.5l3.1 4.1zm-.8 16.7h1.2L10.5 4.2H9.2z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 2.9.8.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.300.1-2.700 0 0 .8-.3 2.800 1a9.600 9.600 0 0 1 5 0c1.900-1.300 2.800-1 2.800-1 .5 1.400.2 2.400.1 2.700.6.7 1 1.600 1 2.700 0 3.900-2.400 4.700-4.600 5 .4.3.7.9.7 1.900v2.800c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
        </svg>
      );
  }
}

export default function Newsletter() {
  const { t } = useLang();
  const online = useOnline();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!isValidEmail(value)) return setStatus({ kind: 'invalid' });

    if (!NEWSLETTER_ENDPOINT) {
      // no backend configured: keep it on this device only, and say so honestly
      saveNewsletterLocally(value);
      setEmail('');
      return setStatus({ kind: 'local' });
    }
    if (!online) return setStatus({ kind: 'offline' });

    setBusy(true);
    try {
      const res = await fetch(NEWSLETTER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value })
      });
      if (!res.ok) throw new Error(String(res.status));
      setEmail('');
      setStatus({ kind: 'ok' });
    } catch {
      setStatus({ kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="community" className="scroll-mt-16 border-b border-line py-14" aria-labelledby="nl-title">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-2">
        <form onSubmit={submit} noValidate className="rounded-2xl border border-line bg-panel p-5">
          <h2 id="nl-title" className="font-display text-2xl text-sun">
            {t('nl.title')}
          </h2>
          <p className="mt-2 text-slate-300">{t('nl.desc')}</p>
          <label htmlFor="nl-email" className="mt-4 block text-sm font-semibold text-slate-200">
            {t('nl.email')}
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              id="nl-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              maxLength={120}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={status.kind === 'invalid'}
              aria-describedby="nl-status"
              className="min-w-0 flex-1 rounded-lg border border-line bg-black/50 px-3 py-2 text-white placeholder:text-slate-400"
              placeholder="name@example.com"
            />
            <button type="submit" className="btn-primary" disabled={busy}>
              {t('nl.submit')}
            </button>
          </div>
          <p id="nl-status" role="status" className={`mt-2 min-h-5 text-sm ${status.kind === 'invalid' || status.kind === 'error' || status.kind === 'offline' ? 'text-brick' : 'text-leaf'}`}>
            {status.kind !== 'idle' ? t(STATUS_KEY[status.kind]) : ''}
          </p>
        </form>

        <div className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-display text-2xl text-sun">{t('social.title')}</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {SOCIAL_LINKS.map((s) => (
              <li key={s.id}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-line bg-black/40 px-4 py-3 font-semibold text-white hover:border-sun hover:text-sun"
                >
                  <SocialIcon id={s.id} />
                  {s.label}
                  <span className="sr-only"> (new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
