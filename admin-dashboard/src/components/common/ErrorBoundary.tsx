import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by UMS ErrorBoundary:', error, errorInfo);
    (this as any).setState({ errorInfo });
    try {
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'React UI Error Exception',
          details: `Error: ${error.message} | Stack: ${errorInfo.componentStack ? errorInfo.componentStack.slice(0, 300) : ''}`,
          severity: 'Warning',
        }),
      }).catch(() => {});
    } catch (_) {}
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-slate-900 border border-red-500/40 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldAlert className="w-48 h-48 text-red-500" />
            </div>
            
            <div className="flex items-center space-x-3 text-red-400 mb-4">
              <AlertTriangle className="w-8 h-8 flex-shrink-0" />
              <h1 className="text-xl font-bold">University Application System Recovered</h1>
            </div>

            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              An unexpected component exception occurred. The system's Error Boundary safely intercepted the exception to prevent unexpected data state loss.
            </p>

            {this.state.error && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-red-300 overflow-x-auto mb-6">
                <strong>Error:</strong> {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center space-x-4">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center space-x-2 text-sm shadow-lg shadow-indigo-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              <button
                onClick={() => (this as any).setState({ hasError: false, error: null, errorInfo: null })}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition"
              >
                Attempt Recovery
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
