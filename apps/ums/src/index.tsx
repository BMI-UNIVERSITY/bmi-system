/* eslint-disable */
/* eslint-disable */
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import './i18n';
import { BrowserRouter } from 'react-router-dom';
import { AccessibilityProvider } from './components/AccessibilityProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * BMI UNIVERSITY MANAGEMENT SYSTEM
 * Institutional ERP Entry Point
 *
 * Centralizing Global Layout Protocols and Print Handlers to ensure
 * consistency across Analytics, Transcripts, and Financial modules.
 */

const initializeInstitutionalStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    /* Institutional Print Protocol: Enforces strict vertical flow and prevents overlaps */
    @media print {
      .no-print { display: none !important; }

      @page {
        size: auto;
        margin: 10mm;
      }

      html, body {
        height: auto !important;
        overflow: visible !important;
        background-color: white !important;
        color: #1a1a1a !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* Reset complex layouts to standard block flow for PDF generation */
      .grid, .flex-row, .pdf-stack, .pdf-section {
        display: block !important;
        width: 100% !important;
        position: static !important;
        clear: both !important;
      }

      /* Ensure grid items take full width and spacing */
      .grid > div, .pdf-section > div {
        width: 100% !important;
        margin-bottom: 30px !important;
        page-break-inside: avoid !important;
      }

      /* Container isolation */
      div[class*="bg-white"], .pdf-section, .pdf-ai-panel {
        position: relative !important;
        border: 1px solid #e5e7eb !important;
        box-shadow: none !important;
        background: white !important;
      }

      /* Chart Handling: PREVENT CLIPPING while containing width */
      .pdf-chart-fixed {
        height: 400px !important;
        min-height: 400px !important;
        width: 100% !important;
        overflow: visible !important;
        padding-right: 20px !important;
      }

      /* Constrain inner chart width to prevent right-side bleed */
      .recharts-responsive-container {
        width: 98% !important;
        margin: 0 auto !important;
      }

      /* Enforce clean page transitions */
      .pdf-page-break {
        page-break-before: always !important;
        break-before: page !important;
        margin-top: 50pt !important;
      }

      /* Strip interactive overlays */
      .absolute, .fixed, .opacity-0, .hover\\:opacity-100 {
        position: static !important;
        opacity: 1 !important;
        visibility: visible !important;
      }

      /* Hide modal overlays during print */
      .fixed.inset-0 { display: none !important; }
    }
  `;
  document.head.appendChild(style);
};

// Initialize system-wide styling protocols
initializeInstitutionalStyles();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes — no refetch within that window
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Refetch on window focus so returning users get fresh data
      refetchOnWindowFocus: true,
      // Retry once on failure before showing error
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("CRITICAL ERROR: Institutional mounting node 'root' not found in DOM registry.");
  throw new Error("BMI System initialization failed.");
}

const root = createRoot(rootElement);

// Remove preloader once React is ready
const removePreloader = () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.style.opacity = '0';
    preloader.style.transition = 'opacity 0.3s ease';
    setTimeout(() => preloader.remove(), 300);
  }
};

// Institutional Metadata Console Log
console.log(
  "%c BMI UNIVERSITY ERP %c v3.0.0 %c Router + Zustand + Accessibility ",
  "background:#4B0082; color:#FFD700; font-weight:bold; padding:4px 8px; border-radius:4px 0 0 4px;",
  "background:#1a0033; color:white; font-weight:bold; padding:4px 8px;",
  "background:#FFD700; color:#4B0082; font-weight:bold; padding:4px 8px; border-radius:0 4px 4px 0;"
);

root.render(
  <QueryClientProvider client={queryClient}>
    <React.StrictMode>
      <AccessibilityProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </AccessibilityProvider>
    </React.StrictMode>
  </QueryClientProvider>
);

// Remove preloader after initial render
setTimeout(removePreloader, 100);









