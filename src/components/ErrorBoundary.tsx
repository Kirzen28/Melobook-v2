import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State = { hasError: false, error: null };

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0A0A0B] text-slate-900 dark:text-[#E0E0E0] flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-bold mb-3">Une erreur est survenue</h1>
          <p className="text-slate-600 dark:text-gray-400 mb-1 max-w-md text-sm">
            L'application a rencontré un problème lors du chargement. Cela peut être dû à un cache navigateur obsolète ou à une ancienne version stockée hors-ligne.
          </p>
          {this.state.error && (
            <p className="text-slate-500 dark:text-gray-600 mb-4 max-w-md text-xs font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if ('caches' in window) {
                caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
              }
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
              }
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="mt-4 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Effacer le cache et recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
