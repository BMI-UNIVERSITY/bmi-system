/* eslint-disable */
/* eslint-disable */
/* eslint-disable */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL: string
  // add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Declare CDN modules
declare module 'https://esm.sh/html2pdf.js@0.10.1?bundle' {
  const html2pdf: any;
  export default html2pdf;
}










