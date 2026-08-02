/**
 * Utility functions for actualizing Export, Save, and Print capabilities across the system.
 */

/**
 * Trigger file download in browser
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data array to CSV file and trigger instant download
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const sanitizeCell = (cell: string | number | boolean | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    let str = String(cell);
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`;
    }
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(sanitizeCell).join(',');
  const rowLines = rows.map(row => row.map(sanitizeCell).join(','));
  const csvContent = [headerLine, ...rowLines].join('\r\n');

  downloadFile(
    filename.endsWith('.csv') ? filename : `${filename}.csv`,
    csvContent,
    'text/csv;charset=utf-8;'
  );
}

/**
 * Export structured object or array to formatted JSON file
 */
export function exportToJson(filename: string, data: any): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(
    filename.endsWith('.json') ? filename : `${filename}.json`,
    jsonContent,
    'application/json;charset=utf-8;'
  );
}

/**
 * Export raw text content (e.g. log files, certificates, transcripts)
 */
export function exportToText(filename: string, textContent: string): void {
  downloadFile(
    filename.endsWith('.txt') ? filename : `${filename}.txt`,
    textContent,
    'text/plain;charset=utf-8;'
  );
}

/**
 * Actualize print action with page formatting
 */
export function triggerPrint(): void {
  window.print();
}
