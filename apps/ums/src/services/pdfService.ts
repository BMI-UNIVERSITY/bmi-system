/* eslint-disable */
/* eslint-disable */
/* eslint-disable */
let html2pdfLoader: Promise<any> | null = null;

/**
 * Load html2pdf once and reuse the same module promise.
 * This avoids repeated dynamic-import wrappers across components.
 */
export async function getHtml2Pdf() {
  if (!html2pdfLoader) {
    html2pdfLoader = import('html2pdf.js').then((module) => module.default || module);
  }
  return html2pdfLoader;
}










