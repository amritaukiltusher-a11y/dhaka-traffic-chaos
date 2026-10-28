import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Shows a friendly (bilingual) message instead of a blank page if something throws while rendering. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto my-24 max-w-lg rounded-2xl border border-line bg-panel p-8 text-center">
        <h1 className="font-display text-2xl text-sun">কিছু একটা গোলমাল হয়েছে / Something went wrong</h1>
        <p className="mt-3 text-slate-300">পেজটি রিলোড করে আবার চেষ্টা করুন। / Please reload the page and try again.</p>
        <button type="button" className="btn-primary mt-6" onClick={() => window.location.reload()}>
          রিলোড / Reload
        </button>
      </div>
    );
  }
}
