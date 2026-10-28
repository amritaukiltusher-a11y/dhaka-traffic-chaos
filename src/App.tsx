import { useEffect, useRef, useState } from 'react';
import { LangProvider, useLang } from './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowToPlay from './components/HowToPlay';
import Stats from './components/Stats';
import News from './components/News';
import Leaderboard from './components/Leaderboard';
import Newsletter from './components/Newsletter';
import InstallGuide from './components/InstallGuide';
import Footer from './components/Footer';
import { useOnline } from './components/hooks';

function OfflineBanner() {
  const { t } = useLang();
  const online = useOnline();
  const [showReady, setShowReady] = useState(false);
  const was = useRef(online);

  useEffect(() => {
    if (!was.current && online) {
      setShowReady(true);
      const id = window.setTimeout(() => setShowReady(false), 3000);
      return () => window.clearTimeout(id);
    }
    was.current = online;
  }, [online]);

  if (online && !showReady) return null;
  return (
    <div role="status" className={`px-4 py-2 text-center text-sm font-semibold ${online ? 'bg-leaf text-black' : 'bg-sun text-black'}`}>
      {online ? t('offline.ready') : t('offline.banner')}
    </div>
  );
}

function Page() {
  const { t } = useLang();
  return (
    <>
      <a href="#main" className="sr-only z-[100] rounded bg-sun px-4 py-2 font-bold text-black focus:not-sr-only focus:fixed focus:left-2 focus:top-2">
        {t('nav.skip')}
      </a>
      <Navbar />
      <OfflineBanner />
      <main id="main">
        <Hero />
        <HowToPlay />
        <Stats />
        <News />
        <Leaderboard />
        <Newsletter />
        <InstallGuide />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LangProvider>
        <Page />
      </LangProvider>
    </ErrorBoundary>
  );
}
