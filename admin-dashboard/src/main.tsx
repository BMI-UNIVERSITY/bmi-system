import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ReactQueryDevtools} from '@tanstack/react-query-devtools';
import App from './App.tsx';
import {ErrorBoundary} from './components/common/ErrorBoundary.tsx';
import './index.css';

// Prevent Vite HMR WebSocket closing errors from triggering uncaught promise rejection overlays
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = event.reason?.message || String(event.reason || '');
    if (
      reasonMsg.includes('WebSocket') ||
      reasonMsg.includes('failed to connect') ||
      reasonMsg === 'WebSocket closed without opened.'
    ) {
      event.preventDefault();
    }
  });
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

